import Vue from "@vitejs/plugin-vue";
import Markdown from "vite-plugin-md";
import { presetAttributify, presetIcons, presetUno } from "unocss";
import Unocss from "unocss/vite";
import viteCompression from "vite-plugin-compression";
import Pages from "vite-plugin-pages";
import { defineConfig } from "vite";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { resolve } from "path";
// const path = require("path");

// https://vitejs.dev/config/
export default defineConfig({
  base: "/ff14-overlay-vite/",
  build: {
    outDir: "./dist",
    emptyOutDir: true, //构建时清空outDir目录
    rollupOptions: {
      output: {
        chunkFileNames: "assets/js/[name].js",
        entryFileNames: "assets/js/[name].js",
        assetFileNames: "assets/[ext]/[name].[ext]",
      },
    },
    chunkSizeWarningLimit: 2000,
    // minify: "terser",
    // terserOptions: {
    // compress: {
    // drop_console: true,
    // drop_debugger: true,
    // },
    // },
  },
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/], // <--
    }),
    Markdown(),
    AutoImport({
      imports: ["vue", "@vueuse/core"],
      dts: "src/types/auto-imports.d.ts",
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      extensions: ["vue", "md"],
      directoryAsNamespace: true,
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      resolvers: [ElementPlusResolver()],
      dts: "src/types/components.d.ts",
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
  ],
  define: {
    __VUE_OPTIONS_API__: false,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
