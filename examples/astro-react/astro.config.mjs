import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import node from '@astrojs/node'
import { astroBling } from '@tanstack/bling/astro'

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),

  integrations: [astroBling(), react()],
})
