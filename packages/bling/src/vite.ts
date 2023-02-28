import type { Plugin } from 'vite'
import viteReact, { Options } from '@vitejs/plugin-react'
import { fileURLToPath, pathToFileURL } from 'url'
import { compileServerFile$, compileServerFn$ } from './babel'

export function bling(opts?: { babel?: Options['babel'] }): Plugin {
  const options = opts ?? {}

  return {
    name: 'vite-plugin-bling',
    enforce: 'pre',

    transform(code, id, transformOptions) {
      const isSsr =
        transformOptions === null || transformOptions === void 0
          ? void 0
          : transformOptions.ssr

      let ssr = process.env.TEST_ENV === 'client' ? false : isSsr

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

      let compiler = (
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
        const compiled = compileServerFile$({
          code,
        })

        return compiled.code
      }

      if (code.includes('serverFn$(')) {
        const compiled = compileServerFn$({
          code,
          compiler,
          ssr,
          id: id.replace(/\.ts$/, '.tsx').replace(/\.js$/, '.jsx'),
        })

        return compiled.code
      }
    },
  }
}

export default bling
