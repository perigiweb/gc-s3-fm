import build from '@hono/vite-cloudflare-pages'
import devServer, { defaultOptions } from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3180
  },
  plugins: [
    //build({
    //  entry: 'src/server/index.ts'
    //}),
    devServer({
      adapter,
      entry: 'src/server/index.ts',
      injectClientScript: false,
      exclude: [...defaultOptions.exclude,
        /.*\.vue?($|\?)/,
        /^\/(public|assets|static)\/.+/,
        /.*\.(s?css|less)($|\?)/,
        /.*\.(svg|png)($|\?)/,
      ]
    }),
    vue(),
    UnoCSS()
  ],
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    commonjsOptions: { transformMixedEsModules: true },
    rollupOptions: {
      input: 'src/client/index.ts'
    }
  }
})
