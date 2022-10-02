import Vue from "@vitejs/plugin-vue";
import { presetAttributify, presetIcons, presetUno } from "unocss";
import Unocss from "unocss/vite";
import viteCompression from "vite-plugin-compression";
import AutoImport from "unplugin-auto-import/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite";
import Pages from "vite-plugin-pages";
import Markdown from "vite-plugin-vue-markdown";
const path = require("path");
// https://vitejs.dev/config/
export default defineConfig({
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
    Vue({ include: [/\.vue$/, /\.md$/] }),
    viteCompression({
      verbose: false,
      filter: /\.(js|mjs|json|css)$/i,
      disable: false,
      threshold: 1025,
      algorithm: "gzip",
      ext: ".gz",
      // deleteOriginFile: true,
    }),
    AutoImport({
      imports: ["vue", "vue-router", "@vueuse/core", "vue/macros"],
      dts: "./src/types/auto-imports.d.ts",
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      dirs: ["src/components"],
      //组件名称包含目录，防止同名组件冲突
      directoryAsNamespace: true,
      dts: "./src/types/components.d.ts",
      resolvers: [ElementPlusResolver()],
    }),
    Unocss({
      presets: [presetUno(), presetAttributify(), presetIcons()],
    }),
    Pages(),
    Markdown(),
  ],
  css: {
    postcss: {
      plugins: [
        // 移除打包element时的@charset警告
        {
          postcssPlugin: "internal:charset-removal",
          AtRule: {
            charset: (atRule) => {
              if (atRule.name === "charset") {
                atRule.remove();
              }
            },
          },
        },
      ],
    },
  },
  define: {
    __SITE_IMG__: JSON.stringify(`https://cafemaker.wakingsands.com/i`),
    __SITE_IMG__BAK: JSON.stringify(`https://xivapi.com/i`),
    __VUE_OPTIONS_API__: false,
  },
  resolve: {
    // 配置路径别名
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
