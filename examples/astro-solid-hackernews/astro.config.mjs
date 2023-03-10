import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import { astroBling } from '@tanstack/bling/astro'
import solidJs from '@astrojs/solid-js'

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [astroBling(), solidJs()],
})
