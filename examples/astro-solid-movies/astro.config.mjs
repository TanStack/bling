import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import { astroBling } from '@tanstack/bling/astro'
import solidJs from '@astrojs/solid-js'
import icons from 'unplugin-icons/vite'

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  vite: {
    plugins: [
      icons({
        compiler: 'solid',
      }),
    ],
  },
  integrations: [astroBling(), solidJs()],
})
