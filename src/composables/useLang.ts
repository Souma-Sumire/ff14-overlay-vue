import type { CLang, Lang } from '@/types/lang'
import { useI18n } from 'vue-i18n'

const params = useUrlSearchParams('hash')
const urlLang = params.lang?.toString() as Lang

// 创建一个全局的 locale ref 用于跟踪当前语言
const globalLocale = ref<Lang>(urlLang || 'zhCn')

function useLang() {
  const i18n = useI18n()

  // 如果有 URL 参数,使用 URL 参数
  if (urlLang) {
    i18n.locale.value = urlLang
    globalLocale.value = urlLang
  }
  else {
    // 否则使用 i18n 的当前值
    globalLocale.value = i18n.locale.value as Lang
  }

  // 监听 i18n locale 变化,同步到 globalLocale
  watch(
    () => i18n.locale.value,
    (newLocale) => {
      globalLocale.value = newLocale as Lang
    },
  )

  function setLang(lang: Lang) {
    i18n.locale.value = lang
    globalLocale.value = lang
  }

  return {
    ...i18n,
    setLang,
  }
}

const l: Record<Lang, CLang> = {
  en: 'en',
  ja: 'ja',
  zhCn: 'cn',
  zhTw: 'cn',
}

function localeToCactbotLang(locale: Lang): CLang {
  return l[locale] || 'en'
}

function getLocaleMessage(text: Record<Lang, string>): string {
  const cLang = localeToCactbotLang(globalLocale.value)
  return text[cLang as keyof typeof text] ?? text.zhCn
}

function getCactbotLocaleMessage(text: Partial<Record<CLang, string>>): string {
  if (!text)
    return 'Unknown'
  const lang = localeToCactbotLang(globalLocale.value)
  return (
    text[lang]
    ?? text.cn
    ?? `${text.en} / ${text.ja}`
  )
}

export {
  getCactbotLocaleMessage,
  getLocaleMessage,
  localeToCactbotLang,
  useLang,
}
