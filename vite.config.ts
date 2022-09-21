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
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  plugins: [
    Vue({ include: [/\.vue$/, /\.md$/] }),
    viteCompression(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
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
});
