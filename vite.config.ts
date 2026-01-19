import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import viteCompression from 'vite-plugin-compression'
import Markdown from 'vite-plugin-md'
import Pages from 'vite-plugin-pages'
import sassDts from 'vite-plugin-sass-dts'


// https://vitejs.dev/config/
export default defineConfig({
  base: '/ff14-overlay-vue/',
  build: {
    outDir: './dist',
    // emptyOutDir: true, // 构建时清空outDir目录
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      onwarn(warning, warn) {
        if (
          warning.code === 'EVAL' &&
          warning.id?.includes('cactbot/resources/user_config.ts')
        ) {
          return
        }
        warn(warning)
      },
    },
    chunkSizeWarningLimit: 2000,
    reportCompressedSize: false,
    sourcemap: false,
  },
  plugins: [
    vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Markdown(),
    AutoImport({
      imports: ['vue', '@vueuse/core'],
      dts: './src/types/auto-imports.d.ts',
      resolvers: [ElementPlusResolver({ importStyle: false })],
      eslintrc: {
        enabled: true,
        filepath: './.eslintrc-auto-import.json',
        globalsPropValue: true,
      },
    }),
    Components({
      resolvers: [ElementPlusResolver({ importStyle: false })],
      deep: true,
      dts: './src/types/components.d.ts',
      directoryAsNamespace: true,
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false,
    }),
    Unocss(),
    Pages(),
    sassDts(),
  ],
  define: {
    __VUE_OPTIONS_API__: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 3000,
    open: true,
    cors: true,
    strictPort: false,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    port: 5000,
    open: true,
    cors: true,
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'element-plus', '@vueuse/core'],
  },
})
