export const style_pattern = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)$/

import * as path from 'path'

const module_style_pattern =
  /\.module\.(css|less|sass|scss|styl|stylus|pcss|postcss)$/

export async function collectStyles(
  match: string[],
  viteServer: import('vite').ViteDevServer,
  env: { cssModules: { [key: string]: string } },
) {
  const styles: { [key: string]: string } = {}
  const deps = new Set<import('vite').ModuleNode>()

  try {
    for (const file of match) {
      const normalizedPath = path.resolve(file).replace(/\\/g, '/')
      let node = viteServer.moduleGraph.getModuleById(normalizedPath)
      if (!node) {
        const absolutePath = path.resolve(file)
        await viteServer.ssrLoadModule(absolutePath)
        node = await viteServer.moduleGraph.getModuleByUrl(absolutePath)

        if (!node) {
          console.log('not found')
          return
        }
      }

      await find_deps(viteServer, node, deps)
    }
  } catch (e) {}

  for (const dep of deps) {
    const parsed = new URL(dep.url, 'http://localhost/')
    const query = parsed.searchParams

    if (dep.file && style_pattern.test(dep.file)) {
      try {
        const mod = await viteServer.ssrLoadModule(dep.url)
        if (module_style_pattern.test(dep.file)) {
          styles[dep.url] = env.cssModules?.[dep.file]
        } else {
          styles[dep.url] = mod.default
        }
      } catch {
        // this can happen with dynamically imported modules, I think
        // because the Vite module graph doesn't distinguish between
        // static and dynamic imports? TODO investigate, submit fix
      }
    }
  }
  return styles
}

async function find_deps(
  vite: import('vite').ViteDevServer,
  node: import('vite').ModuleNode,
  deps: Set<import('vite').ModuleNode>,
) {
  // since `ssrTransformResult.deps` contains URLs instead of `ModuleNode`s, this process is asynchronous.
  // instead of using `await`, we resolve all branches in parallel.
  const branches: Promise<void>[] = []

  async function add(node: import('vite').ModuleNode) {
    if (!deps.has(node)) {
      deps.add(node)
      await find_deps(vite, node, deps)
    }
  }

  /** @param {string} url */
  async function add_by_url(url: string) {
    const node = await vite.moduleGraph.getModuleByUrl(url)

    if (node) {
      await add(node)
    }
  }

  if (node.ssrTransformResult) {
    if (node.ssrTransformResult.deps) {
      node.ssrTransformResult.deps.forEach((url) =>
        branches.push(add_by_url(url)),
      )
    }

    // if (node.ssrTransformResult.dynamicDeps) {
    //   node.ssrTransformResult.dynamicDeps.forEach(url => branches.push(add_by_url(url)));
    // }
  } else {
    node.importedModules.forEach((node) => branches.push(add(node)))
  }

  await Promise.all(branches)
}
