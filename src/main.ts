import { createHead } from '@vueuse/head'
import { ElMessage } from 'element-plus'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import VueLazyload from 'vue-lazyload'
import VxeUI from 'vxe-pc-ui'
import VXETable from 'vxe-table'
import App from './App.vue'
import en from './locales/en.json'
import ja from './locales/ja.json'
import zhCn from './locales/zhCn.json'
import router from './router'
import 'vxe-table/lib/style.css'
import 'vxe-pc-ui/lib/style.css'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'virtual:uno.css'

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
    message: error.toString(),
    duration: 0,
    showClose: true,
  })
}

// 全局错误处理
app.config.errorHandler = (err: unknown) => {
  handleError(err instanceof Error ? err : new Error(String(err)))
}

// 未捕获的Promise错误处理
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  handleError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)))
})

app.use(router)
app.use(head)
app.use(pinia)
app.use(VxeUI)
app.use(VXETable)
app.use(VueLazyload)
app.use(i18n)

app.mount('#app')

// eslint-disable-next-line no-console
console.log('请勿在 NGA 论坛发帖询问 Souma 项目相关问题，我已退出该论坛，无法查看或回复您的主题帖。')
