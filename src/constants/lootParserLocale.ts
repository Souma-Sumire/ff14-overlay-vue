import type { Lang } from '@/types/lang'

export const LOOT_PARSER_LOCALES = ['zh-CN'] as const

export type LootParserLocale = (typeof LOOT_PARSER_LOCALES)[number]

export const DEFAULT_LOOT_PARSER_LOCALE: LootParserLocale = 'zh-CN'

const APP_TO_LOOT_PARSER_LOCALE: Record<Lang, LootParserLocale> = {
  zhCn: 'zh-CN',
  zhTw: 'zh-CN',
  en: 'zh-CN',
  ja: 'zh-CN',
}

export function resolveLootParserLocale(appLocale?: string | null): LootParserLocale {
  if (!appLocale)
    return DEFAULT_LOOT_PARSER_LOCALE
  return APP_TO_LOOT_PARSER_LOCALE[appLocale as Lang] || DEFAULT_LOOT_PARSER_LOCALE
}
