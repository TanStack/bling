import { bling, collectStyles } from './vite'
import { fileURLToPath } from 'url'
import type { AstroIntegration, AstroConfig } from 'astro'
import * as path from 'path'

let cssModules: Record<string, string> = {}
/**
 * @returns {import('vite').Plugin}
 * @param {any} options
 */
function collectCssModules() {
  /** @type {import('./plugin').ViteConfig}  */
  let config

  const module_style_pattern =
    /\.module\.(css|less|sass|scss|styl|stylus|pcss|postcss)$/

  return {
    name: 'solid-start-server',
    config(c) {
      config = c
    },
    transform(code, id) {
      if (module_style_pattern.test(id)) {
        cssModules[id] = code
      }
    },
  } satisfies import('vite').Plugin
}

// https://astro.build/config
export function astroBling(): AstroIntegration {
  let astroConfig: AstroConfig
  return {
    name: '',

    hooks: {
      'astro:server:setup': async (config) => {
        let { _privateSetManifestDontUseThis } =
          await config.server.ssrLoadModule('astro:ssr-manifest')
        _privateSetManifestDontUseThis({
          DEV: {
            vite: config.server,
            collectStyles: (match: string[]) =>
              collectStyles(match, config.server, { cssModules }),
          },
        })
      },
      'astro:config:setup': (config) => {
        config.updateConfig({
          vite: {
            plugins: [collectCssModules(), bling()],
            resolve: {
              alias: {
                '~': path.join(process.cwd(), `src/app`),
              },
            },
          },
        })
      },
      'astro:config:done': (config) => {
        astroConfig = config.config
      },
      'astro:build:ssr': (config) => {
        console.log(astroConfig)
        let entryClient = fileURLToPath(
          new URL('./src/app/entry-client.tsx', astroConfig.root),
        )

        ;(config.manifest as any)['entry-client'] =
          config.manifest.entryModules[entryClient]
      },
      'astro:build:done': (config) => {},
      'astro:build:setup': (config) => {
        if (config.target === 'client') {
          if (Array.isArray(config.vite.build?.rollupOptions?.input)) {
            config.vite.build?.rollupOptions?.input.push(
              'src/app/entry-client.tsx',
            )
          }

          if (config.vite.build) {
            config.vite.build.ssrManifest = true
            config.vite.build.manifest = true
          }
        }
      },
    },
  } satisfies AstroIntegration
}
