import type { Plugin } from 'vite'
import viteReact, { Options } from '@vitejs/plugin-react'
import { fileURLToPath, pathToFileURL } from 'url'
import { compileServerFile, compileFile } from './compilers'

export const virtualModuleSplitPrefix = 'virtual:bling-split$-'
export const virtualPrefix = '\0'

export function bling(opts?: { babel?: Options['babel'] }): Plugin {
  const options = opts ?? {}

  let virtualModules: Record<string, string> = {}

  return {
    name: 'vite-plugin-bling',
    enforce: 'pre',
    transform: async (code, id, transformOptions) => {
      const isSsr =
        transformOptions === null || transformOptions === void 0
          ? void 0
          : transformOptions.ssr

      let ssr = process.env.TEST_ENV === 'client' ? false : !!isSsr

      const url = pathToFileURL(id)
      url.searchParams.delete('v')
      id = fileURLToPath(url).replace(/\\/g, '/')

      const babelOptions =
        (fn?: (source: any, id: any) => { plugins: any[] }) =>
        (source: any, id: any) => {
          const b: any =
            typeof options.babel === 'function'
              ? // @ts-ignore
                options.babel(...args)
              : options.babel ?? { plugins: [] }
          const d = fn?.(source, id)
          return {
            plugins: [...b.plugins, ...(d?.plugins ?? [])],
          }
        }

      let viteCompile = (
        code: string,
        id: string,
        fn?: (source: any, id: any) => { plugins: any[] }
      ) => {
        let plugin = viteReact({
          ...(options ?? {}),
          fastRefresh: false,
          babel: babelOptions(fn),
        })

        // @ts-ignore
        return plugin[0].transform(code, id, transformOptions)
      }

      if (url.pathname.includes('.server$.') && !ssr) {
        const compiled = compileServerFile({
          code,
        })

        return compiled.code
      }

      if (code.includes('serverFn$(' || code.includes('split$('))) {
        const compiled = await compileFile({
          code,
          viteCompile,
          ssr,
          id: id.replace(/\.ts$/, '.tsx').replace(/\.js$/, '.jsx'),
        })

        virtualModules = compiled.virtualModules

        return compiled.code
      }
    },
    resolveId(id) {
      if (id.startsWith(virtualModuleSplitPrefix)) {
        return virtualPrefix + id
      }
    },
    load(_id) {
      if (_id.startsWith(virtualPrefix)) {
        const id = _id
          .replace(virtualPrefix, '')
          .replace(virtualModuleSplitPrefix, '')
        return virtualModules[id]
      }
    },
  }
}

export default bling
