import * as LZString from 'lz-string'

export interface ImportedColumnPayload {
  i: string
  j: number
  h?: number[]
  k?: string
}

export interface MechanicsImportRowPayload {
  t: number
  i: string
  n: number | string
  v: number
  tc?: number
  ty: number
  f: number
  ct?: number
  tg?: string[]
  ti?: string[]
}

export interface MitigationMechanicsImportData {
  type: 'mitigation-mechanics'
  rows: MechanicsImportRowPayload[]
  actions?: string[]
  aliases?: Record<string, string>
  mechanicAliases?: Record<string, string>
}

export interface MitigationPlayerActionsV4Data {
  type: 'mitigation-player-actions'
  src: string[]
  data: Record<string, Record<string, number[]>>
  cols?: ImportedColumnPayload[]
}

export type MitigationPlayerActionsImportData
  = MitigationPlayerActionsV4Data

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => typeof item === 'number' && Number.isFinite(item))
}

function isImportedColumnPayload(value: unknown): value is ImportedColumnPayload {
  if (!isObject(value))
    return false
  if (typeof value.i !== 'string' || typeof value.j !== 'number')
    return false
  if (value.h !== undefined && !isNumberArray(value.h))
    return false
  if (value.k !== undefined && typeof value.k !== 'string')
    return false
  return true
}

function isMechanicsImportRowPayload(value: unknown): value is MechanicsImportRowPayload {
  if (!isObject(value))
    return false
  if (typeof value.t !== 'number' || typeof value.i !== 'string')
    return false
  if (!(typeof value.n === 'number' || typeof value.n === 'string'))
    return false
  if (typeof value.v !== 'number' || typeof value.ty !== 'number' || typeof value.f !== 'number')
    return false
  if (value.tc !== undefined && typeof value.tc !== 'number')
    return false
  if (value.ct !== undefined && typeof value.ct !== 'number')
    return false
  if (value.tg !== undefined && !isStringArray(value.tg))
    return false
  if (value.ti !== undefined && !isStringArray(value.ti))
    return false
  return true
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isObject(value) && Object.values(value).every(item => typeof item === 'string')
}

function isPlayerActionsDataMap(value: unknown): value is Record<string, Record<string, number[]>> {
  if (!isObject(value))
    return false
  return Object.values(value).every((skillMap) => {
    if (!isObject(skillMap))
      return false
    return Object.values(skillMap).every(times => isNumberArray(times))
  })
}

export function parseMitigationImportText(value: string) {
  if (!value)
    throw new Error('Empty import text')

  let json = value
  if (!value.startsWith('{') && !value.startsWith('[')) {
    const decompressed = LZString.decompressFromBase64(value)
    if (decompressed)
      json = decompressed
  }
  return JSON.parse(json) as unknown
}

export function isMitigationMechanicsImportData(data: unknown): data is MitigationMechanicsImportData {
  if (!isObject(data))
    return false
  if (data.type !== 'mitigation-mechanics')
    return false
  if (!Array.isArray(data.rows) || !data.rows.every(row => isMechanicsImportRowPayload(row)))
    return false
  if (data.actions !== undefined && !isStringArray(data.actions))
    return false
  if (data.aliases !== undefined && !isStringMap(data.aliases))
    return false
  if (data.mechanicAliases !== undefined && !isStringMap(data.mechanicAliases))
    return false
  return true
}

export function isMitigationPlayerActionsImportData(data: unknown): data is MitigationPlayerActionsImportData {
  if (!isObject(data))
    return false
  if (data.type !== 'mitigation-player-actions')
    return false
  if (!isStringArray(data.src))
    return false
  if (!isPlayerActionsDataMap(data.data))
    return false
  if (data.cols !== undefined && !(Array.isArray(data.cols) && data.cols.every(col => isImportedColumnPayload(col))))
    return false
  return true
}
