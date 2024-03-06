import vue from "@vitejs/plugin-vue";
import jsx from "@vitejs/plugin-vue-jsx";
import { presetAttributify, presetIcons, presetUno } from "unocss";
import Unocss from "unocss/vite";
import AutoImport from "unplugin-auto-import/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import viteCompression from "vite-plugin-compression";
import Markdown from "vite-plugin-md";
import Pages from "vite-plugin-pages";
import { createStyleImportPlugin, VxeTableResolve } from "vite-plugin-style-import";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/ff14-overlay-vue/",
  build: {
    outDir: "./dist",
    emptyOutDir: true, // 构建时清空outDir目录
    rollupOptions: {
      output: {
        //   chunkFileNames: "assets/js/[name].js",
        //   entryFileNames: "assets/js/[name].js",
        //   assetFileNames: "assets/[ext]/[name].[ext]",
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 2000,
    // sourcemap: true,
    // minify: "terser",
    // terserOptions: {
    // compress: {
    // drop_console: true,
    // drop_debugger: true,
    // },
    // },
  },
  plugins: [
    vue({
      include: [/\.vue$/, /\.md$/], // <--
    }),
    jsx(),
    Markdown(),
    AutoImport({
      imports: ["vue", "@vueuse/core"],
      dts: "src/types/auto-imports.d.ts",
      resolvers: [ElementPlusResolver()],
      eslintrc: {
        enabled: true, // Default `false`
        filepath: "./.eslintrc-auto-import.json", // Default `./.eslintrc-auto-import.json`
        globalsPropValue: true, // Default `true`, (true | false | 'readonly' | 'readable' | 'writable' | 'writeable')
      },
    }),
    Components({
      extensions: ["vue", "md"],
      directoryAsNamespace: true,
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      dts: "src/types/components.d.ts",
      resolvers: [ElementPlusResolver()],
    }),
    viteCompression({
      verbose: false,
      filter: /\.(js|mjs|json|css)$/,
      disable: false,
      threshold: 1025,
      algorithm: "gzip",
      ext: ".gz",
      // deleteOriginFile: true,
    }),
    Unocss({
      presets: [presetUno(), presetAttributify(), presetIcons()],
    }),
    Pages(),
    createStyleImportPlugin({
      resolves: [VxeTableResolve()],
    }),
  ],
  define: {
    __VUE_OPTIONS_API__: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
