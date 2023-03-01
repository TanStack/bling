// All credit for this work goes to the amazing Next.js team.
// https://github.com/vercel/next.js/blob/canary/packages/next/build/babel/plugins/next-ssg-transform.ts
// This is adapted to work with any fetch$() calls and transpile it into multiple api function for a file.

// @ts-ignore
import crypto from 'crypto'
// @ts-ignore
import nodePath from 'path'
import * as esbuild from 'esbuild'
import * as t from '@babel/types'
import * as babel from '@babel/core'
import * as traverse from '@babel/traverse'
import * as template from '@babel/template'
import { CodeGenerator, default as generate } from '@babel/generator'
import { virtualModuleSplitPrefix } from './vite'

type SplitModulesById = Record<
  string,
  { id: string; node: t.FunctionExpression }
>

interface State {
  filename: string
  opts: {
    ssr: boolean
    minify: boolean
    root: string
  }
  refs: Set<any>
  serverIndex: number
  splitIndex: number
  splitModulesById: SplitModulesById
}

const INLINE_SERVER_ROUTE_PREFIX = '/_m'

export function compileServerFile({ code }: { code: string }) {
  let compiled = esbuild.buildSync({
    stdin: {
      contents: code,
    },
    write: false,
    metafile: true,
    platform: 'neutral',
    format: 'esm',
    // loader: {
    //   '.js': 'jsx',
    // },
    logLevel: 'silent',
  })

  let exps

  for (let key in compiled.metafile?.outputs) {
    if (compiled.metafile?.outputs[key].entryPoint) {
      exps = compiled.metafile?.outputs[key].exports
    }
  }

  if (!exps) {
    throw new Error('Could not find entry point to detect exports')
  }

  compiled = esbuild.buildSync({
    stdin: {
      contents: `${exps
        .map((key) => `export const ${key} = undefined`)
        .join('\n')}`,
    },
    write: false,
    platform: 'neutral',
    format: 'esm',
  })

  return {
    code: compiled.outputFiles[0].text,
  }
}

export async function compileFile(opts: {
  code: string
  viteCompile: (code: string, id: string, cb: any) => Promise<string>
  id: string
  ssr: boolean
}) {
  let splitModulesById: SplitModulesById = {}

  const compiledCode = await opts.viteCompile(
    opts.code,
    opts.id,
    (source: any, id: any) => ({
      plugins: [
        [
          {
            visitor: {
              Program: {
                enter(path: traverse.NodePath, state: State) {
                  state.splitModulesById = {}
                  state.serverIndex = 0
                  state.splitIndex = 0

                  trackProgram(path, state)

                  path.traverse(
                    {
                      CallExpression: (path) => {
                        if (path.node.callee.type === 'Identifier') {
                          if (path.node.callee.name === 'fetch$') {
                            // ServerFn RPCs
                            transformServerFn$(path, state)
                          } else if (path.node.callee.name === 'split$') {
                            // Code splitting
                            transformSplit$(path, state)
                          }
                        }
                      },
                      ImportDeclaration: function (path, state) {
                        // Rewrite imports to `@tanstack/bling` to `@tanstack/bling/server` during SSR
                        if (
                          state.opts.ssr &&
                          path.node.source.value === '@tanstack/bling'
                        ) {
                          path.node.source = t.stringLiteral(
                            '@tanstack/bling/server',
                          )
                        }
                      },
                    },
                    state,
                  )

                  splitModulesById = { ...state.splitModulesById }

                  treeShake(path, state)
                },
              },
            },
          },
          {
            ssr: opts.ssr,
            root: process.cwd(),
            minify: process.env.NODE_ENV === 'production',
          },
        ],
      ].filter(Boolean),
    }),
  )

  let virtualModules: Record<string, string> = {}

  await Promise.all(
    Object.values(splitModulesById).map(async (splitModule) => {
      const plugin = (): babel.PluginObj => ({
        visitor: {
          Program: {
            enter(path, _state) {
              const state = _state as unknown as State

              trackProgram(path, state)

              // Remove default exports and do not export named exports
              // (but keep the variable declarations)
              path.traverse(
                {
                  ExportDefaultDeclaration: (path) => {
                    path.remove()
                  },
                  ExportNamedDeclaration: (path) => {
                    path.replaceWith(path.node.declaration!)
                  },
                },
                state as State,
              )

              const fnCode = new CodeGenerator(splitModule.node).generate().code

              path.node.body.push(
                template.smart(`
                  export default ${fnCode}
                `)() as t.Statement,
              )

              treeShake(path, state)
            },
          },
        },
      })

      virtualModules[splitModule.id] = await opts.viteCompile(
        opts.code,
        opts.id,
        (source: any, id: any) => ({
          plugins: [
            [
              plugin,
              {
                ssr: opts.ssr,
                root: process.cwd(),
                minify: process.env.NODE_ENV === 'production',
              },
            ],
          ].filter(Boolean),
        }),
      )
    }),
  )

  return {
    code: compiledCode,
    virtualModules,
  }
}
function transformServerFn$(
  path: babel.NodePath<t.CallExpression>,
  state: State,
) {
  const serverFn = path.get('arguments')[0]
  const serverFnOpts = path.get('arguments')[1]
  let program = path.findParent((p) => t.isProgram(p))
  let statement = path.findParent((p) => {
    const body = program!.get('body') as babel.NodePath<babel.types.Node>[]

    return body.includes(p)
  })!

  let decl = path.findParent(
    (p) =>
      p.isVariableDeclarator() ||
      p.isFunctionDeclaration() ||
      p.isObjectProperty(),
  ) as babel.NodePath<any>
  let serverIndex = state.serverIndex++
  let hasher = state.opts.minify ? hashFn : (str: string) => str
  const fName = state.filename.replace(state.opts.root, '').slice(1)

  const hash = hasher(nodePath.join(fName, String(serverIndex)))

  serverFn.traverse({
    MemberExpression(path) {
      let obj = path.get('object')
      if (obj.node.type === 'Identifier' && obj.node.name === 'fetch$') {
        obj.replaceWith(t.identifier('$$ctx'))
        return
      }
    },
  })

  if (serverFn.node.type === 'ArrowFunctionExpression') {
    const body = serverFn.get('body') as babel.NodePath<babel.types.Node>

    if (body.node.type !== 'BlockStatement') {
      const block = t.blockStatement([t.returnStatement(body.node as any)])
      body.replaceWith(block)
    }

    serverFn.replaceWith(
      t.functionExpression(
        t.identifier('$$serverHandler' + serverIndex),
        serverFn.node.params,
        serverFn.node.body as t.BlockStatement,
        false,
        true,
      ),
    )
  }

  if (serverFn.node.type === 'FunctionExpression') {
    ;(serverFn.get('body') as any).unshiftContainer(
      'body',
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier('$$ctx'), t.thisExpression()),
      ]),
    )
  }

  const pathname = nodePath
    .join(
      INLINE_SERVER_ROUTE_PREFIX,
      hash,
      decl?.node.id?.elements?.[0]?.name ??
        decl?.node.id?.name ??
        decl?.node.key?.name ??
        'fn',
    )
    .replaceAll('\\', '/')

  if (state.opts.ssr) {
    statement.insertBefore(
      template.smart(`
    const $$server_module${serverIndex} = fetch$.createHandler(%%source%%, "${pathname}", %%options%%);
    fetch$.registerHandler("${pathname}", $$server_module${serverIndex});
    `)({
        source: serverFn.node,
        options: serverFnOpts?.node || t.identifier('undefined'),
      }),
    )
  } else {
    statement.insertBefore(
      template.smart(
        `
      ${
        process.env.TEST_ENV === 'client'
          ? `fetch$.registerHandler("${pathname}", fetch$.createHandler(%%source%%, "${pathname}", %%options%%));`
          : ``
      }
      const $$server_module${serverIndex} = fetch$.createFetcher("${pathname}", %%options%%);`,
        {
          syntacticPlaceholders: true,
        },
      )(
        process.env.TEST_ENV === 'client'
          ? {
              source: serverFn.node,
              options: serverFnOpts?.node || t.identifier('undefined'),
            }
          : {
              options: serverFnOpts?.node || t.identifier('undefined'),
            },
      ),
    )
  }
  path.replaceWith(t.identifier(`$$server_module${serverIndex}`))
}

function transformSplit$(path: babel.NodePath<t.CallExpression>, state: State) {
  const fn = path.node.arguments[0]
  let program = path.findParent((p) => t.isProgram(p))
  let statement = path.findParent((p) => {
    const body = program!.get('body') as babel.NodePath<babel.types.Node>[]

    return body.includes(p)
  })!

  const splitIndex = state.splitIndex++
  let hasher = state.opts.minify ? hashFn : (str: string) => str
  const fName = state.filename.replace(state.opts.root, '').slice(1)
  const hash = hasher(nodePath.join(fName, String(splitIndex)))

  let decl = path.findParent(
    (p) =>
      p.isVariableDeclarator() ||
      p.isFunctionDeclaration() ||
      p.isObjectProperty(),
  ) as babel.NodePath<any>

  const id = nodePath
    .join(
      INLINE_SERVER_ROUTE_PREFIX,
      hash,
      decl?.node.id?.elements?.[0]?.name ??
        decl?.node.id?.name ??
        decl?.node.key?.name ??
        'fn',
    )
    .replaceAll('\\', '/')

  statement.insertBefore(
    template.smart(`
    const $$split${splitIndex} = (...args) => import('$PATHNAME').then((m) => m.default(...args));
    `)({
      $PATHNAME: `${virtualModuleSplitPrefix}${id}`,
    }),
  )

  state.splitModulesById[id] = {
    id,
    node: fn as t.FunctionExpression,
  }

  path.replaceWith(t.identifier(`$$split${splitIndex}`))
}

function trackProgram(path: babel.NodePath, state: State) {
  state.refs = new Set()

  path.traverse(
    {
      VariableDeclarator(variablePath, variableState) {
        if (variablePath.node.id.type === 'Identifier') {
          const local = variablePath.get('id')
          if (isIdentifierReferenced(local)) {
            variableState.refs.add(local)
          }
        } else if (variablePath.node.id.type === 'ObjectPattern') {
          const pattern = variablePath.get('id')
          const properties = pattern.get(
            'properties',
          ) as babel.NodePath<babel.types.Node>[]
          properties.forEach((p) => {
            const local = p.get(
              p.node.type === 'ObjectProperty'
                ? 'value'
                : p.node.type === 'RestElement'
                ? 'argument'
                : (function () {
                    throw new Error('invariant')
                  })(),
            ) as babel.NodePath<babel.types.Node>

            if (isIdentifierReferenced(local)) {
              variableState.refs.add(local)
            }
          })
        } else if (variablePath.node.id.type === 'ArrayPattern') {
          const pattern = variablePath.get('id')
          const elements = pattern.get(
            'elements',
          ) as babel.NodePath<babel.types.Node>[]
          elements.forEach((e) => {
            let local: babel.NodePath

            if (e.node && e.node.type === 'Identifier') {
              local = e
            } else if (e.node && e.node.type === 'RestElement') {
              local = e.get('argument') as babel.NodePath
            } else {
              return
            }

            if (isIdentifierReferenced(local)) {
              variableState.refs.add(local)
            }
          })
        }
      },
      FunctionDeclaration: markFunction,
      FunctionExpression: markFunction,
      ArrowFunctionExpression: markFunction,
      ImportSpecifier: markImport,
      ImportDefaultSpecifier: markImport,
      ImportNamespaceSpecifier: markImport,
    },
    state,
  )
}

function treeShake(path: babel.NodePath, state: State) {
  const refs = state.refs

  let count = 0

  function sweepFunction(sweepPath: babel.NodePath<t.Function>) {
    const ident = getIdentifier(sweepPath) as babel.NodePath<t.Identifier>
    if (
      ident &&
      ident.node &&
      refs.has(ident) &&
      !isIdentifierReferenced(ident)
    ) {
      ++count
      if (
        t.isAssignmentExpression(sweepPath.parentPath) ||
        t.isVariableDeclarator(sweepPath.parentPath)
      ) {
        sweepPath.parentPath.remove()
      } else {
        sweepPath.remove()
      }
    }
  }

  function sweepImport(
    sweepPath: babel.NodePath<
      t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier
    >,
  ) {
    const local = sweepPath.get('local')
    if (refs.has(local) && !isIdentifierReferenced(local)) {
      ++count
      sweepPath.remove()
      if (!state.opts.ssr) {
        const parent = sweepPath.parent as any
        if (parent.specifiers.length === 0) {
          sweepPath.parentPath.remove()
        }
      }
    }
  }

  do {
    path.scope.crawl()
    count = 0
    path.traverse({
      VariableDeclarator(variablePath) {
        if (variablePath.node.id.type === 'Identifier') {
          const local = variablePath.get('id')
          if (refs.has(local) && !isIdentifierReferenced(local)) {
            ++count
            variablePath.remove()
          }
        } else if (variablePath.node.id.type === 'ObjectPattern') {
          const pattern = variablePath.get('id')
          const beforeCount = count
          const properties = pattern.get('properties') as babel.NodePath[]
          properties.forEach((p) => {
            const local = p.get(
              p.node.type === 'ObjectProperty'
                ? 'value'
                : p.node.type === 'RestElement'
                ? 'argument'
                : (function () {
                    throw new Error('invariant')
                  })(),
            ) as babel.NodePath

            if (refs.has(local) && !isIdentifierReferenced(local)) {
              ++count
              p.remove()
            }
          })
          if (
            beforeCount !== count &&
            (pattern.get('properties') as babel.NodePath[]).length < 1
          ) {
            variablePath.remove()
          }
        } else if (variablePath.node.id.type === 'ArrayPattern') {
          const pattern = variablePath.get('id')
          const beforeCount = count
          const elements = pattern.get('elements') as babel.NodePath[]
          elements.forEach((e) => {
            let local: babel.NodePath

            if (e.node && e.node.type === 'Identifier') {
              local = e
            } else if (e.node && e.node.type === 'RestElement') {
              local = e.get('argument') as babel.NodePath
            } else {
              return
            }
            if (refs.has(local) && !isIdentifierReferenced(local)) {
              ++count
              e.remove()
            }
          })
          if (
            beforeCount !== count &&
            (pattern.get('elements') as babel.NodePath[]).length < 1
          ) {
            variablePath.remove()
          }
        }
      },
      FunctionDeclaration: sweepFunction,
      FunctionExpression: sweepFunction,
      ArrowFunctionExpression: sweepFunction,
      ImportSpecifier: sweepImport,
      ImportDefaultSpecifier: sweepImport,
      ImportNamespaceSpecifier: sweepImport,
    })
  } while (count)
}

function getIdentifier(path: babel.NodePath) {
  const parentPath = path.parentPath
  if (parentPath?.type === 'VariableDeclarator') {
    const pp = parentPath
    const name = pp.get('id') as babel.NodePath
    return name.node.type === 'Identifier' ? name : null
  }
  if (parentPath?.type === 'AssignmentExpression') {
    const pp = parentPath
    const name = pp.get('left') as babel.NodePath
    return name.node.type === 'Identifier' ? name : null
  }
  if (path.node.type === 'ArrowFunctionExpression') {
    return null
  }

  const node = path.node as any

  return node.id && node.id.type === 'Identifier' ? path.get('id') : null
}

function isIdentifierReferenced(ident: babel.NodePath<any>) {
  const b = ident.scope.getBinding(ident.node.name)
  if (b && b.referenced) {
    if (b.path.type === 'FunctionDeclaration') {
      return !b.constantViolations
        .concat(b.referencePaths)
        .every((ref) => ref.findParent((p) => p === b.path))
    }
    return true
  }
  return false
}

function markFunction(path: babel.NodePath<t.Function>, state: State) {
  const ident = getIdentifier(path) as babel.NodePath<t.Identifier> | null
  if (ident && ident.node && isIdentifierReferenced(ident)) {
    state.refs.add(ident)
  }
}

function markImport(path: babel.NodePath, state: State) {
  const local = path.get('local')
  // if (isIdentifierReferenced(local)) {
  state.refs.add(local)
  // }
}

function hashFn(str: string) {
  return crypto
    .createHash('shake256', { outputLength: 5 /* bytes = 10 hex digits*/ })
    .update(str)
    .digest('hex')
}
