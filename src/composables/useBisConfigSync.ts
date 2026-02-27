import type { BisConfig, BisRow, LegacyBisConfig } from '@/utils/bisUtils'

function clonePlayerBis(playerBis: BisConfig['playerBis'] | undefined): BisConfig['playerBis'] {
  return JSON.parse(JSON.stringify(playerBis || {}))
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

export function normalizeBisConfigFromModel(
  rawModelValue: BisConfig | LegacyBisConfig,
  eligiblePlayers: string[],
  countRows: BisRow[],
  getStorageKey: (player: string) => string,
): BisConfig {
  let nextConfig: BisConfig

  if (isLegacyBisConfig(rawModelValue)) {
    const migrated: BisConfig = { playerBis: {}, plannedWeeks: 8 }
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
      plannedWeeks: rawModelValue.plannedWeeks ?? 8,
    }
  }

  ensureBisCountDefaults(nextConfig, eligiblePlayers, countRows, getStorageKey)
  return nextConfig
}
