import type { Plugin } from 'vite'
import viteReact, { Options } from '@vitejs/plugin-react'
import { fileURLToPath, pathToFileURL } from 'url'
import {
  compileSecretFile,
  compileFile,
  splitFile,
  compilers,
} from './compilers'

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

      let [fileId, queryParam] = id.split('?')

      let param = new URLSearchParams(queryParam)

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
        fn?: (source: any, id: any) => { plugins: any[] },
      ) => {
        let plugin = viteReact({
          ...(options ?? {}),
          fastRefresh: false,
          babel: babelOptions(fn),
        })

        // @ts-ignore
        return plugin[0].transform(code, id, transformOptions)
      }

      if (param.has('split')) {
        const compiled = await splitFile({
          code,
          viteCompile,
          ssr,
          id: fileId.replace(/\.ts$/, '.tsx').replace(/\.js$/, '.jsx'),
          splitIndex: Number(param.get('split')),
          ref: param.get('ref') ?? 'fn',
        })

        return compiled.code
      }

      if (url.pathname.includes('.secret$.') && !ssr) {
        const compiled = compileSecretFile({
          code,
        })

        return compiled.code
      }

      if (Object.keys(compilers).find((key) => code.includes(key + '('))) {
        const compiled = await compileFile({
          code,
          viteCompile,
          ssr,
          id: id.replace(/\.ts$/, '.tsx').replace(/\.js$/, '.jsx'),
        })

        return compiled.code
      }
    },
    load(id) {
      if (id.endsWith('?island')) {
        return {
          code: `
            import Component from '${id.replace('?island', '')}';

            window._$HY.island("${id.slice(process.cwd().length)}", Component);

            export default Component;
            `,
        }
      }
    },
  }
}

export default bling
