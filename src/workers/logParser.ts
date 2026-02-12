import type { LootParserLocale } from '@/constants/lootParserLocale'
import type { LootRecord, RollInfo } from '@/utils/lootParser'
import { DEFAULT_LOOT_PARSER_LOCALE } from '@/constants/lootParserLocale'
import { sanitizeItemName, sanitizePlayerName } from '@/utils/lootParser'

interface ParserLocaleConfig {
  obtainPattern: RegExp
  assignPattern: RegExp
  rollPattern: RegExp
  rollNeedLabel: string
}

const PARSER_LOCALE_CONFIGS: Record<LootParserLocale, ParserLocaleConfig> = {
  'zh-CN': {
    obtainPattern: /^([^|，。]+?)获得了“(.*?)”(?:[×x*](\d+))?/,
    assignPattern: /^(.+?)分配给了(.+?)[。.]?$/,
    rollPattern: /^([^|，。]+?)在(需求|贪婪)条件下对“?(.*?)”掷出了(\d+)点/,
    rollNeedLabel: '需求',
  },
}

// '083E': 平时单人拿到东西，副本里拿到东西（需求、贪婪、直接获得都有）（深宫、4人本、8人极神、零式都有） 可能跟小队是否跨服有关系
// '103E'                 ，副本里拿到东西（需求、贪婪、直接获得都有）（深宫、4人本、8人极神、零式都有） 可能跟小队是否跨服有关系
// '203E'                 ，副本里拿到东西（需求、贪婪、直接获得都有）（深宫、4人本、零式、24人本）      可能跟小队是否跨服有关系
// '0A3E': 直接获得（开装备箱） / FATE材料直接进包
// '08BE': 单人拿的晶簇、魔晶石、商店兑换、鉴定这种
// '0839': 奇谈书
// '0BBE': 商店兑换、鉴定
function isObtainCode(code: string): boolean {
  return code === '083E' || code === '103E' || code === '203E'
}

// roll点的频道，我们不关心？
function isRollCode(code: string): boolean {
  return code === '1041'
    || code === '2041'
    || code === '0841'
    || code === '0041'
    || code === '0840'
    || code === '0044'
}

function extractCoreFields(line: string): { timestampStr: string, code: string, message: string } | null {
  // 00|timestamp|code|actor|message|hash
  const delimiters: [number, number, number, number] = [-1, -1, -1, -1]
  let cursor = -1
  for (let i = 0; i < delimiters.length; i++) {
    cursor = line.indexOf('|', cursor + 1)
    if (cursor === -1)
      return null
    delimiters[i] = cursor
  }

  const [p1, p2, p3, p4] = delimiters
  const p5 = line.indexOf('|', p4 + 1)
  const timestampStr = line.slice(p1 + 1, p2)
  const code = line.slice(p2 + 1, p3)
  const message = p5 === -1 ? line.slice(p4 + 1) : line.slice(p4 + 1, p5)

  if (!timestampStr || !code || !message)
    return null

  return { timestampStr, code, message }
}

function parseLineAndAppend(
  line: string,
  tempRolls: Map<string, RollInfo[]>,
  seenItems: Set<string>,
  seenPlayers: Set<string>,
  outRecords: LootRecord[],
  localeConfig: ParserLocaleConfig,
): void {
  const fields = extractCoreFields(line)
  if (!fields)
    return
  const { timestampStr, code, message } = fields

  if (isObtainCode(code)) {
    let player = ''
    let item = ''
    let quantity = 1
    let isAssign = false

    const obtainMatch = message.match(localeConfig.obtainPattern)
    if (obtainMatch) {
      player = sanitizePlayerName(obtainMatch[1]!)
      item = sanitizeItemName(obtainMatch[2]!)
      quantity = obtainMatch[3] ? Number.parseInt(obtainMatch[3], 10) : 1
    }
    else {
      const assignMatch = message.match(localeConfig.assignPattern)
      if (!assignMatch)
        return
      item = sanitizeItemName(assignMatch[1]!)
      player = sanitizePlayerName(assignMatch[2]!)
      isAssign = true
    }

    seenItems.add(item)
    seenPlayers.add(player)

    const pendingRolls = tempRolls.get(item)
    if (pendingRolls)
      tempRolls.delete(item)
    const firstRolls = pendingRolls ? [...pendingRolls] : []
    const timestamp = new Date(timestampStr)

    if (quantity > 1) {
      for (let i = 0; i < quantity; i++) {
        outRecords.push({
          key: `${timestampStr}-${player}-${item}-${i}`,
          timestamp: new Date(timestamp),
          player,
          item,
          rolls: i === 0 ? firstRolls : [],
          isAssign,
        })
      }
      return
    }

    outRecords.push({
      key: `${timestampStr}-${player}-${item}`,
      timestamp,
      player,
      item,
      rolls: firstRolls,
      isAssign,
    })
    return
  }

  if (isRollCode(code)) {
    // 1041: Need/Greed/Pass
    const rollMatch = message.match(localeConfig.rollPattern)

    if (rollMatch) {
      const player = sanitizePlayerName(rollMatch[1]!)
      const item = sanitizeItemName(rollMatch[3]!)
      const value = Number.parseInt(rollMatch[4]!, 10)
      const type = rollMatch[2] === localeConfig.rollNeedLabel ? 'need' : 'greed'

      if (!tempRolls.has(item))
        tempRolls.set(item, [])
      const rolls = tempRolls.get(item)!
      if (!rolls.some(r => r.player === player)) {
        seenPlayers.add(player)
        rolls.push({ player, type, value })
      }
    }
  }
}

interface WorkerInput {
  text: string
  locale?: LootParserLocale
}

globalThis.onmessage = (e: MessageEvent<string | WorkerInput>) => {
  const payload = e.data
  const text = typeof payload === 'string' ? payload : payload.text
  const locale = typeof payload === 'string' ? DEFAULT_LOOT_PARSER_LOCALE : payload.locale || DEFAULT_LOOT_PARSER_LOCALE
  const localeConfig = PARSER_LOCALE_CONFIGS[locale]

  const tempRolls = new Map<string, RollInfo[]>()
  const newRecords: LootRecord[] = []
  const players = new Set<string>()
  const items = new Set<string>()

  // Scan line by line without building a large temporary lines array.
  for (let start = 0; start < text.length;) {
    let end = text.indexOf('\n', start)
    if (end === -1)
      end = text.length

    let line = text.slice(start, end)
    if (line.endsWith('\r'))
      line = line.slice(0, -1)

    start = end + 1
    if (!line)
      continue

    parseLineAndAppend(line, tempRolls, items, players, newRecords, localeConfig)
  }

  globalThis.postMessage({
    records: newRecords,
    players: Array.from(players),
    items: Array.from(items),
  })
}
