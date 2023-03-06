import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import node from '@astrojs/node'
import { bling } from '@tanstack/bling/vite'
import type { AstroIntegration } from 'astro'

// https://astro.build/config

function astroBling() {
  return {
    name: '',

    hooks: {
      'astro:config:setup': (config) => {
        config.updateConfig({
          vite: {
            plugins: [bling()],
          },
        })
      },
      'astro:build:ssr': (config) => {
        config.manifest['hello'] = 'world'
        console.log(config)
      },
      'astro:build:done': (config) => {
        console.log(config.dir)
      },
      'astro:build:setup': (config) => {
        config.vite.build?.rollupOptions?.input.push('src/app/entry-client.tsx')
        config.vite.build.ssrManifest = true
        config.vite.build.manifest = true
      },
    },
  } satisfies AstroIntegration
}

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),

  integrations: [astroBling(), react()],
})
