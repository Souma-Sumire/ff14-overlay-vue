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

function normalizeActorId(id: string): string {
  return id.trim().toUpperCase()
}

function extractFieldByIndex(line: string, fieldIndex: number): string {
  // Field index is 0-based (e.g. "03|ts|id|name|..." -> id is 2, name is 3).
  if (fieldIndex < 0)
    return ''

  let cursor = -1
  for (let i = 0; i < fieldIndex; i++) {
    cursor = line.indexOf('|', cursor + 1)
    if (cursor === -1)
      return ''
  }

  const start = cursor + 1
  const end = line.indexOf('|', start)
  if (end === -1)
    return line.slice(start)
  return line.slice(start, end)
}

function parsePartyListLineAndAppend(
  line: string,
  partyIds: Set<string>,
  combatantNameById: Map<string, string>,
  seenPlayers: Set<string>,
) {
  // 11|timestamp|partyCount|id0|id1|...|hash
  const parts = line.split('|')
  if (parts.length < 4 || parts[0] !== '11')
    return

  const partyCount = Number.parseInt(parts[2] || '', 10)
  if (!Number.isFinite(partyCount) || partyCount <= 0)
    return

  const idCount = Math.min(24, partyCount)
  for (let i = 0; i < idCount; i++) {
    const rawId = parts[3 + i]
    if (!rawId)
      continue

    const id = normalizeActorId(rawId)
    if (!id)
      continue

    partyIds.add(id)
    const knownName = combatantNameById.get(id)
    if (knownName)
      seenPlayers.add(knownName)
  }
}

function parseAddCombatantLineAndAppend(
  line: string,
  partyIds: Set<string>,
  combatantNameById: Map<string, string>,
  seenPlayers: Set<string>,
) {
  // 03|timestamp|id|name|...
  const rawId = extractFieldByIndex(line, 2)
  const rawName = extractFieldByIndex(line, 3)
  if (!rawId || !rawName)
    return

  const id = normalizeActorId(rawId)
  const name = sanitizePlayerName(rawName)
  if (!id || !name)
    return

  // Character actors are usually 10xxxxxx; cache them so PartyList can resolve names
  // regardless of whether 03 appears before or after 11.
  if (id.startsWith('10'))
    combatantNameById.set(id, name)

  if (partyIds.has(id))
    seenPlayers.add(name)
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
  partyIds: Set<string>,
  combatantNameById: Map<string, string>,
  outRecords: LootRecord[],
  localeConfig: ParserLocaleConfig,
): void {
  const firstDelimiter = line.indexOf('|')
  if (firstDelimiter === -1)
    return
  const lineType = line.slice(0, firstDelimiter)

  if (lineType === '11') {
    parsePartyListLineAndAppend(line, partyIds, combatantNameById, seenPlayers)
    return
  }

  if (lineType === '03') {
    parseAddCombatantLineAndAppend(line, partyIds, combatantNameById, seenPlayers)
    return
  }

  if (lineType !== '00')
    return

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
  text?: string
  buffer?: ArrayBuffer
  locale?: LootParserLocale
}

interface StreamStartInput {
  type: 'stream-start'
  sessionId: string
  locale?: LootParserLocale
}

interface StreamChunkInput {
  type: 'stream-chunk'
  sessionId: string
  buffer: ArrayBuffer
}

interface StreamEndInput {
  type: 'stream-end'
  sessionId: string
}

interface ParseAccumulator {
  tempRolls: Map<string, RollInfo[]>
  newRecords: LootRecord[]
  players: Set<string>
  items: Set<string>
  partyIds: Set<string>
  combatantNameById: Map<string, string>
  pendingBytes: Uint8Array
  localeConfig: ParserLocaleConfig
}

const utf8Decoder = new TextDecoder('utf-8')
const EMPTY_BYTES = new Uint8Array(0)
const streamSessions = new Map<string, ParseAccumulator>()

function createAccumulator(locale: LootParserLocale): ParseAccumulator {
  return {
    tempRolls: new Map<string, RollInfo[]>(),
    newRecords: [],
    players: new Set<string>(),
    items: new Set<string>(),
    partyIds: new Set<string>(),
    combatantNameById: new Map<string, string>(),
    pendingBytes: EMPTY_BYTES,
    localeConfig: PARSER_LOCALE_CONFIGS[locale],
  }
}

function buildResult(accumulator: ParseAccumulator) {
  return {
    records: accumulator.newRecords,
    players: Array.from(accumulator.players),
    items: Array.from(accumulator.items),
  }
}

function parseTextAndAppend(
  text: string,
  accumulator: ParseAccumulator,
) {
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

    parseLineAndAppend(
      line,
      accumulator.tempRolls,
      accumulator.items,
      accumulator.players,
      accumulator.partyIds,
      accumulator.combatantNameById,
      accumulator.newRecords,
      accumulator.localeConfig,
    )
  }
}

function parseChunkBytesAndAppend(
  bytes: Uint8Array,
  accumulator: ParseAccumulator,
  flushTail: boolean,
) {
  let merged = bytes
  if (accumulator.pendingBytes.length > 0) {
    merged = new Uint8Array(accumulator.pendingBytes.length + bytes.length)
    merged.set(accumulator.pendingBytes, 0)
    merged.set(bytes, accumulator.pendingBytes.length)
    accumulator.pendingBytes = EMPTY_BYTES
  }

  let lineStart = 0

  for (let i = 0; i < merged.length; i++) {
    if (merged[i] !== 0x0A)
      continue

    let lineEnd = i
    if (lineEnd > lineStart && merged[lineEnd - 1] === 0x0D)
      lineEnd--

    if (lineEnd > lineStart) {
      const line = utf8Decoder.decode(merged.subarray(lineStart, lineEnd))
      if (line) {
        parseLineAndAppend(
          line,
          accumulator.tempRolls,
          accumulator.items,
          accumulator.players,
          accumulator.partyIds,
          accumulator.combatantNameById,
          accumulator.newRecords,
          accumulator.localeConfig,
        )
      }
    }

    lineStart = i + 1
  }

  if (lineStart >= merged.length)
    return

  if (flushTail) {
    let tailEnd = merged.length
    if (tailEnd > lineStart && merged[tailEnd - 1] === 0x0D)
      tailEnd--
    if (tailEnd > lineStart) {
      const line = utf8Decoder.decode(merged.subarray(lineStart, tailEnd))
      if (line) {
        parseLineAndAppend(
          line,
          accumulator.tempRolls,
          accumulator.items,
          accumulator.players,
          accumulator.partyIds,
          accumulator.combatantNameById,
          accumulator.newRecords,
          accumulator.localeConfig,
        )
      }
    }
    accumulator.pendingBytes = EMPTY_BYTES
    return
  }

  accumulator.pendingBytes = merged.slice(lineStart)
}

globalThis.onmessage = (e: MessageEvent<string | WorkerInput | StreamStartInput | StreamChunkInput | StreamEndInput>) => {
  const payload = e.data
  if (typeof payload === 'object' && payload && 'type' in payload) {
    if (payload.type === 'stream-start') {
      const locale = payload.locale || DEFAULT_LOOT_PARSER_LOCALE
      streamSessions.set(payload.sessionId, createAccumulator(locale))
      globalThis.postMessage({ ok: true })
      return
    }

    if (payload.type === 'stream-chunk') {
      const session = streamSessions.get(payload.sessionId)
      if (!session)
        throw new Error(`Unknown parser stream session: ${payload.sessionId}`)
      parseChunkBytesAndAppend(new Uint8Array(payload.buffer), session, false)
      globalThis.postMessage({ ok: true })
      return
    }

    if (payload.type === 'stream-end') {
      const session = streamSessions.get(payload.sessionId)
      if (!session)
        throw new Error(`Unknown parser stream session: ${payload.sessionId}`)
      parseChunkBytesAndAppend(EMPTY_BYTES, session, true)
      streamSessions.delete(payload.sessionId)
      globalThis.postMessage(buildResult(session))
      return
    }
  }

  const locale = typeof payload === 'string' ? DEFAULT_LOOT_PARSER_LOCALE : payload.locale || DEFAULT_LOOT_PARSER_LOCALE
  const accumulator = createAccumulator(locale)

  if (typeof payload === 'string' || payload.text)
    parseTextAndAppend(typeof payload === 'string' ? payload : payload.text!, accumulator)
  else if (payload.buffer)
    parseChunkBytesAndAppend(new Uint8Array(payload.buffer), accumulator, true)

  globalThis.postMessage(buildResult(accumulator))
}
