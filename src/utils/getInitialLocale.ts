import { useUrlSearchParams } from '@vueuse/core'
import en from '../locales/en.json'
import ja from '../locales/ja.json'
import zhCn from '../locales/zhCn.json'
import zhTw from '../locales/zhTw.json'
import type { Lang } from '@/types/lang'

const SUPPORTED_LOCALES = ['zhCn', 'en', 'ja', 'zhTw'] as Lang[]

const messages = {
  en,
  ja,
  zhCn,
  zhTw,
}

function getBrowserLocale(): Lang {
  const browserLangs = navigator.languages || [navigator.language]

  for (const browserLang of browserLangs) {
    const lang = browserLang.toLowerCase()

    switch (lang) {
      case 'zh-cn':
      case 'zh':
        if (SUPPORTED_LOCALES.includes('zhCn')) return 'zhCn' as Lang
        break
      case 'zh-tw':
      case 'zh-hk':
        if (SUPPORTED_LOCALES.includes('zhTw')) return 'zhTw' as Lang
        break
      case 'ja':
      case 'ja-jp':
        if (SUPPORTED_LOCALES.includes('ja')) return 'ja' as Lang
        break
      case 'en':
      case 'en-us':
        if (SUPPORTED_LOCALES.includes('en')) return 'en' as Lang
        break
    }
  }

  return 'zhCn' as Lang
}

function getInitialLocale(): Lang {
  const params = useUrlSearchParams('hash')
  const urlLang = params.lang?.toString()

  if (urlLang && SUPPORTED_LOCALES.includes(urlLang as Lang)) {
    return urlLang as Lang
  }

  return getBrowserLocale() ?? 'en' as Lang
}

export { getInitialLocale, messages }
