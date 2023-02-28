import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import { bling } from "@tanstack/bling/vite";

// https://astro.build/config

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  vite: {
    plugins: [bling()],
  },
  integrations: [react()],
});
