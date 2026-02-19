import { compareSame, normalizeUpgradeActionId } from '@/utils/compareSaveAction'

export function toHexId(id: string | number): string {
  return String(id).toUpperCase()
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizeInt(value: number, fallback: number, min = 0): number {
  if (!Number.isFinite(value))
    return fallback
  return Math.max(min, Math.trunc(value))
}

export function normalizeTrackedActionId(actionId: number): number {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return 0
  const upgradedActionId = normalizeUpgradeActionId(Math.trunc(actionId))
  return compareSame(upgradedActionId)
}

export function deepCloneWatchMap(input: Record<number, number[]>): Record<number, number[]> {
  const result: Record<number, number[]> = {}
  Object.entries(input).forEach(([key, value]) => {
    result[Number(key)] = [...value]
  })
  return result
}

export function encodeBase64Payload(text: string): string {
  try {
    const bytes = new TextEncoder().encode(text)
    let binary = ''
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    return window.btoa(binary)
  }
  catch {
    return window.btoa(unescape(encodeURIComponent(text)))
  }
}

export function decodeBase64Payload(base64: string): string {
  // 容错处理：去掉换行/空白，并支持 URL-safe Base64。
  const normalized = base64
    .trim()
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padding = normalized.length % 4
  const padded = padding > 0 ? normalized.padEnd(normalized.length + (4 - padding), '=') : normalized
  const binary = window.atob(padded)
  try {
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  }
  catch {
    try {
      return decodeURIComponent(escape(binary))
    }
    catch {
      return binary
    }
  }
}

export function buildSimulatedAbilityLine(
  timestampMs: number,
  sourceId: string,
  sourceName: string,
  actionId: number,
  actionName: string,
): string[] {
  const line: string[] = []
  line[0] = '21'
  line[1] = new Date(timestampMs).toISOString()
  line[2] = toHexId(sourceId)
  line[3] = sourceName
  line[4] = actionId.toString(16).toUpperCase()
  line[5] = actionName
  line[6] = toHexId(sourceId)
  line[7] = sourceName
  return line
}

export function collectWatchActionIds(watchMap: Record<number, number[]>): Set<number> {
  const actionIds = new Set<number>()
  Object.values(watchMap).forEach((actions) => {
    actions.forEach((actionId) => {
      const normalizedId = Number(actionId)
      if (Number.isFinite(normalizedId) && normalizedId > 0)
        actionIds.add(normalizedId)
    })
  })
  return actionIds
}

export function buildKnownJobs(
  watchMap: Record<number, number[]>,
  defaultJobSort: number[],
): number[] {
  return Array.from(new Set([
    ...defaultJobSort,
    ...Object.keys(watchMap).map(v => Number(v)),
  ]))
}

export function buildDefaultWatchMap(
  knownJobs: number[],
  defaults: Record<number, number[]>,
  emptyActions: readonly number[],
): Record<number, number[]> {
  const result: Record<number, number[]> = {}
  knownJobs.forEach((job) => {
    result[job] = [...(defaults[job] ?? emptyActions)]
  })
  return result
}
