import type { BisConfig, BisRow, LegacyBisConfig } from '@/utils/bisUtils'

function clonePlayerBis(playerBis: BisConfig['playerBis'] | undefined): BisConfig['playerBis'] {
  return JSON.parse(JSON.stringify(playerBis || {}))
}

function cloneNeedCountOffsets(
  needCountOffsets: BisConfig['needCountOffsets'] | undefined,
): BisConfig['needCountOffsets'] {
  return JSON.parse(JSON.stringify(needCountOffsets || {}))
}

export function isLegacyBisConfig(val: unknown): val is LegacyBisConfig {
  if (!val || typeof val !== 'object' || !(val as LegacyBisConfig).playerBis)
    return false
  const firstKey = Object.keys((val as LegacyBisConfig).playerBis)[0]
  if (!firstKey)
    return false
  return Array.isArray((val as LegacyBisConfig).playerBis[firstKey])
}

export function ensureBisCountDefaults(
  targetConfig: BisConfig,
  players: string[],
  countRows: BisRow[],
  getStorageKey: (player: string) => string,
) {
  players.forEach((player) => {
    const key = getStorageKey(player)
    if (!targetConfig.playerBis[key])
      targetConfig.playerBis[key] = {}

    const pConfig = targetConfig.playerBis[key]!
    countRows.forEach((row) => {
      if (typeof pConfig[row.id] !== 'number')
        pConfig[row.id] = 1
    })
  })
}

export function ensureBisOffsetDefaults(
  targetConfig: BisConfig,
  players: string[],
  offsetRows: BisRow[],
  getStorageKey: (player: string) => string,
) {
  players.forEach((player) => {
    const key = getStorageKey(player)
    if (!targetConfig.needCountOffsets[key])
      targetConfig.needCountOffsets[key] = {}

    const pOffsets = targetConfig.needCountOffsets[key]!
    offsetRows.forEach((row) => {
      if (typeof pOffsets[row.id] !== 'number')
        pOffsets[row.id] = 0
    })
  })
}

export function normalizeBisConfigFromModel(
  rawModelValue: BisConfig | LegacyBisConfig,
  eligiblePlayers: string[],
  countRows: BisRow[],
  offsetRows: BisRow[],
  getStorageKey: (player: string) => string,
): BisConfig {
  let nextConfig: BisConfig

  if (isLegacyBisConfig(rawModelValue)) {
    const migrated: BisConfig = { playerBis: {}, needCountOffsets: {} }
    Object.keys(rawModelValue.playerBis).forEach((player) => {
      migrated.playerBis[player] = {}
      const list = rawModelValue.playerBis[player]
      if (list) {
        list.forEach((id) => {
          if (migrated.playerBis[player])
            migrated.playerBis[player]![id] = 'raid'
        })
      }
    })
    nextConfig = migrated
  }
  else {
    nextConfig = {
      playerBis: clonePlayerBis(rawModelValue.playerBis),
      needCountOffsets: cloneNeedCountOffsets(rawModelValue.needCountOffsets),
    }
  }

  ensureBisCountDefaults(nextConfig, eligiblePlayers, countRows, getStorageKey)
  ensureBisOffsetDefaults(nextConfig, eligiblePlayers, offsetRows, getStorageKey)
  return nextConfig
}
