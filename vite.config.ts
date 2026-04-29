import path from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import Unocss from "unocss/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import viteCompression from "vite-plugin-compression";
import Markdown from "vite-plugin-md";
import Pages from "vite-plugin-pages";
import sassDts from "vite-plugin-sass-dts";
import { defineConfig } from "vite-plus";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function injectBuildTime() {
  return {
    name: "inject-build-time",
    transformIndexHtml(html: string) {
      const buildTime = new Date().toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      return html.replace(
        "</head>",
        `  <meta name="build-time" content="${buildTime}" />\n  </head>`,
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  staged: {
    "*.{js,ts,tsx,vue,svelte}": "vp check --fix",
  },
  lint: {
    ignorePatterns: ["dist/**", "node_modules/**", "cactbot/**"],
    rules: {
      "unicorn/prefer-array-to-sorted": "off",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: ["dist/**", "node_modules/**", "cactbot/**"],
  },
  base: "/ff14-overlay-vue/",
  build: {
    outDir: "./dist",
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("element-plus")) {
              return "vendor-element-plus";
            }
            if (id.includes("echarts") || id.includes("vue-echarts")) {
              return "vendor-echarts";
            }
            if (id.includes("vue") || id.includes("pinia") || id.includes("vue-router")) {
              return "vendor-vue";
            }
            return "vendor-other";
          }

          if (id.includes("/src/components/common/")) {
            return "shared-common";
          }

          if (id.includes("cactbot/") && !id.includes("user_config.ts")) {
            return "cactbot";
          }
        },
      },
      onwarn(warning, warn) {
        if (warning.code === "EVAL" && warning.id?.includes("cactbot/resources/user_config.ts")) {
          return;
        }
        warn(warning);
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
    Components({
      resolvers: [ElementPlusResolver({ importStyle: false })],
      deep: true,
      dts: "./src/types/components.d.ts",
      directoryAsNamespace: true,
    }),
    viteCompression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
      deleteOriginFile: false,
    }),
    Unocss(),
    Pages({
      importMode: "async",
    }),
    sassDts(),
    injectBuildTime(),
  ],
  define: {
    __VUE_OPTIONS_API__: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
    include: ["vue", "vue-router", "pinia", "element-plus", "@vueuse/core"],
  },
});
