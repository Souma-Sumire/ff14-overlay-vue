import type { LootRecord, RollInfo } from '@/utils/lootParser'
import { sanitizeItemName, sanitizePlayerName } from '@/utils/lootParser'

const MSG_PATTERNS = {
  obtain: /^([^|，。]+?)获得了“(.*?)”(?:[×x*](\d+))?/,
  assign: /^(.+?)分配给了(.+?)[。.]?$/,
  roll: /^([^|，。]+?)在(需求|贪婪)条件下对“?(.*?)”掷出了(\d+)点/,
}

const OBTAIN_CODES = new Set(['083E', '103E', '203E', '0A3E'])
const ROLL_CODES = new Set(['1041', '2041', '0841', '0041', '0840', '0044'])

function parseLine(
  line: string,
  tempRolls: Map<string, RollInfo[]>,
  seenItems: Set<string>,
  seenPlayers: Set<string>,
): LootRecord | LootRecord[] | null {
  const parts = line.split('|')
  if (parts.length < 5)
    return null

  // 00|2026-01-21T...|Code|Actor|Message|Hash
  const code = parts[2]
  const timestampStr = parts[1]
  const message = parts[4]

  if (!code || !timestampStr || !message)
    return null

  if (OBTAIN_CODES.has(code)) {
    let player = ''
    let item = ''
    let quantity = 1
    let isAssign = false

    const obtainMatch = message.match(MSG_PATTERNS.obtain)
    const assignMatch = message.match(MSG_PATTERNS.assign)

    if (obtainMatch) {
      player = sanitizePlayerName(obtainMatch[1]!)
      item = sanitizeItemName(obtainMatch[2]!)
      quantity = obtainMatch[3] ? Number.parseInt(obtainMatch[3], 10) : 1
    }
    else if (assignMatch) {
      item = sanitizeItemName(assignMatch[1]!)
      player = sanitizePlayerName(assignMatch[2]!)
      isAssign = true
    }
    else {
      return null
    }

    seenItems.add(item)
    seenPlayers.add(player)

    const rolls = tempRolls.get(item) || []
    tempRolls.delete(item)

    if (quantity > 1) {
      const records: LootRecord[] = []
      for (let i = 0; i < quantity; i++) {
        records.push({
          key: `${timestampStr}-${player}-${item}-${i}`,
          timestamp: new Date(timestampStr),
          player,
          item,
          rolls: i === 0 ? [...rolls] : [],
          isAssign,
        })
      }
      return records
    }

    return {
      key: `${timestampStr}-${player}-${item}`,
      timestamp: new Date(timestampStr),
      player,
      item,
      rolls: [...rolls],
      isAssign,
    }
  }
  else if (ROLL_CODES.has(code)) {
    // 1041: Need/Greed/Pass
    const rollMatch = message.match(MSG_PATTERNS.roll)

    if (rollMatch) {
      const player = sanitizePlayerName(rollMatch[1]!)
      const item = sanitizeItemName(rollMatch[3]!)
      const value = Number.parseInt(rollMatch[4]!, 10)
      const type = rollMatch[2] === '需求' ? 'need' : 'greed'

      if (!tempRolls.has(item))
        tempRolls.set(item, [])
      const rolls = tempRolls.get(item)!
      if (!rolls.some(r => r.player === player)) {
        seenPlayers.add(player)
        rolls.push({ player, type, value })
      }
      return null
    }
  }

  return null
}

globalThis.onmessage = (e: MessageEvent) => {
  const text = e.data as string
  const lines = text.split('\n')
  const tempRolls = new Map<string, RollInfo[]>()
  const newRecords: LootRecord[] = []
  const players = new Set<string>()
  const items = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line)
      continue
    const result = parseLine(line, tempRolls, items, players)
    if (result) {
      if (Array.isArray(result))
        newRecords.push(...result)
      else newRecords.push(result)
    }
  }

  globalThis.postMessage({
    records: newRecords,
    players: Array.from(players),
    items: Array.from(items),
  })
}
