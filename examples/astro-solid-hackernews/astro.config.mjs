import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import { astroBling } from '@tanstack/bling/astro'
import solidJs from '@astrojs/solid-js'
import { dirname, join } from 'path'
import inspect from 'vite-plugin-inspect'
function islands() {
  return {
    name: 'solid-start-islands',
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
    /**
     * @param {any} id
     * @param {string} code
     */
    transform(code, id, ssr) {
      if (code.includes('interactive$(')) {
        let replaced = code.replaceAll(
          /const ([A-Za-z_]+) = interactive\$\(\(\) => import\((("([^"]+)")|('([^']+)'))\)\)/g,
          (a, b, c) => {
            c = c.slice(1, -1)
            return ssr.ssr
              ? `import ${b}_island from "${c}";
                  const ${b} = interactive$.register(${b}_island, "${
                  join(dirname(id), c)
                    .slice(process.cwd().length + 1)
                    .replaceAll('\\', '/') +
                  '.tsx' +
                  '?island'
                }");`
              : `const ${b} = interactive$.load(() => import("${c}?island"), "${
                  join(dirname(id), c).replaceAll('\\', '/') +
                  '.tsx' +
                  '?island'
                }")`
          },
        )

        console.log(ssr, replaced)

        if (ssr.ssr) {
          replaced = replaced
            .replaceAll("'@tanstack/bling'", "'@tanstack/bling/server'")
            .replaceAll('"@tanstack/bling"', '"@tanstack/bling/server"')
        }

        return replaced
      }
    },
  }
}
// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    {
      name: '@astrojs/renderer-solidadad',
      hooks: {
        'astro:config:setup': ({ updateConfig }) => {
          updateConfig({
            vite: {
              plugins: [inspect(), islands()],
            },
          })
        },
      },
    },
    astroBling(),
    solidJs(),
  ],
})
