import { createHead } from '@vueuse/head'
import { createPinia } from 'pinia'
import VXETable from 'vxe-table'
import 'vxe-table/lib/style.css'
import VxeUI from 'vxe-pc-ui'
import 'vxe-pc-ui/lib/style.css'
import VueLazyload from 'vue-lazyload'
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zhCn from './locales/zhCn.json'
import ja from './locales/ja.json'
import App from './App.vue'
import router from './router'
// import ElementPlus from "element-plus";
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'virtual:uno.css'

const app = createApp(App)
const head = createHead()
const pinia = createPinia()
const i18n = createI18n({
  legacy: false, // Composition API
  locale: 'zhCn', // 默认语言
  fallbackLocale: 'en', // 备用语言
  messages: {
    en,
    zhCn,
    ja,
  },
})

// app.use(ElementPlus);
app.use(router)
app.use(head)
app.use(pinia)
app.use(VxeUI)
app.use(VXETable)
app.use(VueLazyload)
app.use(i18n)
app.mount('#app')

// app.config.errorHandler = (err, vm, info) => {
//   console.error(err, vm, info);
// };
