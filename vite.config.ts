import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

// Serves docs/schema/product.schema.json at <base>product.schema.json, in dev and in the build, so the page can link to it.
const productSchema = (): Plugin => ({
  name: 'product-schema',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url?.split('?')[0].endsWith('/product.schema.json')) return next()
      res.setHeader('Content-Type', 'application/schema+json')
      res.end(readFileSync('docs/schema/product.schema.json'))
    })
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'product.schema.json', source: readFileSync('docs/schema/product.schema.json') })
  },
})

export default defineConfig({
  plugins: [vue(), productSchema()],
  build: {
    rollupOptions: { input: { main: resolve('index.html'), book: resolve('book/index.html') } },
  },
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
  },
})
