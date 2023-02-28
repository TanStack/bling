import type { Plugin } from 'vite'
import viteReact, { Options } from '@vitejs/plugin-react'
import { fileURLToPath, pathToFileURL } from 'url'
import babel from './babel'

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

      const url = pathToFileURL(id)
      url.searchParams.delete('v')
      id = fileURLToPath(url).replace(/\\/g, '/')

      const babelOptions =
        (fn: any) =>
        (...args: any[]) => {
          const b: any =
            typeof options.babel === 'function'
              ? // @ts-ignore
                options.babel(...args)
              : options.babel ?? { plugins: [] }
          const d = fn(...args)
          return {
            plugins: [...b.plugins, ...d.plugins],
          }
        }

      let compiler = (code: string, id: string, fn: any) => {
        let plugin = viteReact({
          ...(options ?? {}),
          fastRefresh: false,
          babel: babelOptions(fn),
        })

        // @ts-ignore
        return plugin[0].transform(code, id, transformOptions)
      }

      let ssr = process.env.TEST_ENV === 'client' ? false : isSsr

      if (code.includes('serverFn$(')) {
        return compiler(
          code,
          id.replace(/\.ts$/, '.tsx').replace(/\.js$/, '.jsx'),
          (source: any, id: any) => ({
            plugins: [
              [
                babel,
                {
                  ssr,
                  root: process.cwd(),
                  minify: process.env.NODE_ENV === 'production',
                },
              ],
            ].filter(Boolean),
          })
        )
      }
    },
  }
}

export default bling
