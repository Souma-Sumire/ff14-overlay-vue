import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type VulnerabilityKey = 'stun' | 'slow' | 'sleep' | 'heavy' | 'bind'
type EnemyRecord = Record<string, unknown>

interface ParsedEnemyLine {
  comment: string
  id: number
  indent: string
  line: string
  record: EnemyRecord
}

interface NormalizeOptions {
  completeVulnerabilities: boolean
}

const enemyPropertyOrder = ['grade', 'detect', 'note', 'vulnerabilities'] as const
const vulnerabilityKeys: VulnerabilityKey[] = ['stun', 'slow', 'sleep', 'heavy', 'bind']

function escapeString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function orderedKeys(record: Record<string, unknown>, preferredOrder: readonly string[]): string[] {
  const preferred = preferredOrder.filter(key => Object.prototype.hasOwnProperty.call(record, key))
  const remaining = Object.keys(record).filter(key => !preferredOrder.includes(key))
  return [...preferred, ...remaining]
}

function normalizeVulnerabilities(value: unknown, completeVulnerabilities: boolean): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) {
    return undefined
  }

  const normalized: Record<string, unknown> = {}
  for (const key of vulnerabilityKeys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      normalized[key] = value[key]
      continue
    }

    if (completeVulnerabilities) {
      normalized[key] = undefined
    }
  }

  for (const key of Object.keys(value)) {
    if (!vulnerabilityKeys.includes(key as VulnerabilityKey)) {
      normalized[key] = value[key]
    }
  }

  return normalized
}

function formatValue(value: unknown): string {
  if (value === undefined) {
    return 'undefined'
  }

  if (typeof value === 'string') {
    return `'${escapeString(value)}'`
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(formatValue).join(', ')}]`
  }

  if (isPlainObject(value)) {
    const objectKeys = orderedKeys(value, vulnerabilityKeys)
    const segments = objectKeys.map(key => `${key}: ${formatValue(value[key])}`)
    return `{ ${segments.join(', ')} }`
  }

  throw new Error(`Unsupported value type in dd.ts formatter: ${String(value)}`)
}

function normalizeEnemyRecord(record: EnemyRecord, options: NormalizeOptions): EnemyRecord {
  const normalized: EnemyRecord = {}

  for (const key of enemyPropertyOrder) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      continue
    }

    if (key === 'vulnerabilities') {
      const vulnerabilities = normalizeVulnerabilities(record[key], options.completeVulnerabilities)
      if (vulnerabilities) {
        normalized[key] = vulnerabilities
      }
      continue
    }

    normalized[key] = record[key]
  }

  for (const key of Object.keys(record)) {
    if ((enemyPropertyOrder as readonly string[]).includes(key)) {
      continue
    }

    normalized[key] = record[key]
  }

  return normalized
}

function formatEnemyRecord(record: EnemyRecord, options: NormalizeOptions): string {
  const normalized = normalizeEnemyRecord(record, options)
  const segments = orderedKeys(normalized, enemyPropertyOrder).map(key => `${key}: ${formatValue(normalized[key])}`)
  return `{ ${segments.join(', ')} }`
}

function parseEnemyLine(line: string): ParsedEnemyLine | undefined {
  const match = /^(\s+)(\d+):\s+(\{.*\}),(\s*\/\/.*)?$/.exec(line)
  if (!match) {
    return undefined
  }

  const indent = match[1] ?? ''
  const idText = match[2]
  const objectLiteral = match[3]
  const comment = match[4] ?? ''
  if (!idText || !objectLiteral) {
    return undefined
  }

  const record = Function(`"use strict"; return (${objectLiteral});`)() as EnemyRecord
  return {
    comment,
    id: Number(idText),
    indent,
    line,
    record,
  }
}

function buildEnemyLine(parsed: ParsedEnemyLine, record: EnemyRecord, options: NormalizeOptions): string {
  return `${parsed.indent}${parsed.id}: ${formatEnemyRecord(record, options)},${parsed.comment}`
}

async function rewriteDdEnemies(
  ddPath: string,
  transform: (parsed: ParsedEnemyLine) => EnemyRecord,
  options: NormalizeOptions,
): Promise<{ changedLines: number, changed: boolean }> {
  const original = await readFile(ddPath, 'utf8')
  const eol = original.includes('\r\n') ? '\r\n' : '\n'
  const trailingNewline = original.endsWith('\r\n') || original.endsWith('\n') ? eol : ''
  const lines = original.split(/\r?\n/)
  let changedLines = 0

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const parsed = parseEnemyLine(line)
    if (!parsed) {
      continue
    }

    const nextRecord = transform(parsed)
    const nextLine = buildEnemyLine(parsed, nextRecord, options)
    if (nextLine !== line) {
      lines[index] = nextLine
      changedLines += 1
    }
  }

  const nextContent = `${lines.join(eol)}${trailingNewline}`
  if (nextContent !== original) {
    await writeFile(ddPath, nextContent, 'utf8')
  }

  return {
    changed: nextContent !== original,
    changedLines,
  }
}

function defaultDdPath(): string {
  return path.resolve('src/resources/dd.ts')
}

export {
  buildEnemyLine,
  defaultDdPath,
  enemyPropertyOrder,
  formatEnemyRecord,
  parseEnemyLine,
  rewriteDdEnemies,
  type EnemyRecord,
  type NormalizeOptions,
  type ParsedEnemyLine,
  vulnerabilityKeys,
}
