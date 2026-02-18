import type { TeamWatchActionMetaRaw, TeamWatchStorageData } from '@/types/teamWatchTypes'

// TeamWatch 旧版本本地存储键名（用于无感迁移）。
export const TEAM_WATCH_STORAGE_NAMESPACE_LEGACY = 'TeamWatch4'

export interface TeamWatchStorageCompatOptions {
  namespace: string
  legacyNamespace?: string
  parseCurrent: (raw: string) => TeamWatchStorageData | null
  parseLegacy: (raw: string) => TeamWatchStorageData | null
  buildEmpty: () => TeamWatchStorageData
}

export interface TeamWatchLegacyParseOptions {
  storageVersion: number
  normalizeWatchJobsActionsIDUser: (value: unknown) => Record<number, number[]>
  normalizeSortRuleUser: (value: unknown) => number[]
  normalizeActionMetaUser: (value: unknown) => Record<number, TeamWatchActionMetaRaw>
}

// 解析 TeamWatch4 旧存档（shape: { [jobId]: number[] }），只迁移槽位数据。
export function parseTeamWatchLegacyStorageData(
  raw: string,
  options: TeamWatchLegacyParseOptions,
): TeamWatchStorageData | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object')
      return null
    return {
      storageVersion: options.storageVersion,
      watchJobsActionsIDUser: options.normalizeWatchJobsActionsIDUser(parsed),
      sortRuleUser: options.normalizeSortRuleUser(undefined),
      actionMetaUser: options.normalizeActionMetaUser(undefined),
    }
  }
  catch {
    return null
  }
}

// 兼容读取入口：优先当前版本，失败时尝试旧版本迁移。
export function loadTeamWatchStorageDataWithCompat(options: TeamWatchStorageCompatOptions): TeamWatchStorageData {
  const currentRaw = localStorage.getItem(options.namespace)
  if (currentRaw) {
    const parsed = options.parseCurrent(currentRaw)
    return parsed ?? options.buildEmpty()
  }

  const legacyNamespace = options.legacyNamespace ?? TEAM_WATCH_STORAGE_NAMESPACE_LEGACY
  const legacyRaw = localStorage.getItem(legacyNamespace)
  if (legacyRaw) {
    const migrated = options.parseLegacy(legacyRaw)
    if (migrated) {
      localStorage.setItem(options.namespace, JSON.stringify(migrated))
      return migrated
    }
  }

  return options.buildEmpty()
}
