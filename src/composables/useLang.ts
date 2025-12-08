import type { CLang, Lang } from '@/types/lang'
import { useI18n } from 'vue-i18n'

const params = useUrlSearchParams('hash')
const urlLang = params.lang?.toString() as Lang
const localeRef = ref(urlLang || 'en')

function useLang() {
  const i18n = useI18n()
  i18n.locale.value = urlLang || i18n.locale.value || 'en'
  watch(i18n.locale, (locale) => {
    localeRef.value = locale as Lang
  })
  function setLang(lang: Lang) {
    i18n.locale.value = lang
    localeRef.value = lang
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
  const l = localeToCactbotLang(localeRef.value)
  return text[l as keyof typeof text] ?? text.zhCn
}
function getCactbotLocaleMessage(text: Partial<Record<CLang, string>>): string {
  if (!text) return 'Unknown'
  return (
    text[localeRef.value as keyof typeof text] ??
    text.cn ??
    `${text.en} / ${text.ja}`
  )
}

export {
  useLang,
  localeToCactbotLang,
  getLocaleMessage,
  getCactbotLocaleMessage,
}
