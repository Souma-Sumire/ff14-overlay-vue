import { createHead } from '@vueuse/head'
import { ElMessage } from 'element-plus'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import VueLazyload from 'vue-lazyload'
import App from './App.vue'
import en from './locales/en.json'
import ja from './locales/ja.json'
import zhCn from './locales/zhCn.json'
import router from './router'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'virtual:uno.css'
import { checkReferrer } from './utils/checkReferrer'

const app = createApp(App)
const head = createHead()
const pinia = createPinia()
const i18n = createI18n({
  legacy: false,
  locale: 'zhCn',
  fallbackLocale: 'en',
  messages: {
    en,
    zhCn,
    ja,
  },
})

function handleError(error: Error): void {
  console.error(error)
  ElMessage.error({
    dangerouslyUseHTMLString: true,
    message: `<pre style="white-space: pre-wrap;">${
      error.stack || error.message
    }</pre>`,
    duration: 5000,
    showClose: true,
  })
}

// 全局错误处理
app.config.errorHandler = (err: unknown) => {
  handleError(err instanceof Error ? err : new Error(String(err)))
}

// 未捕获的Promise错误处理
window.addEventListener(
  'unhandledrejection',
  (event: PromiseRejectionEvent) => {
    handleError(
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason)),
    )
  },
)

app.use(router)
app.use(head)
app.use(pinia)
app.use(VueLazyload)
app.use(i18n)

checkReferrer()
app.mount('#app')

const { protocol, hostname, href } = window.location
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(hostname)

if (protocol === 'http:' && !isLocal) {
  window.location.href = href.replace('http:', 'https:')
}
