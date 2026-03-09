import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { csvPaths } from './paths'
import { buildEnemyLine, defaultDdPath, parseEnemyLine, type EnemyRecord, vulnerabilityKeys } from './ddFormat'

type MapKey = 'EO' | 'HoH' | 'PotD' | 'PT'
type VulnerabilityKey = (typeof vulnerabilityKeys)[number]
type VulnerabilityValue = boolean | 'unknown'
type CompendiumVulnerabilities = Partial<Record<VulnerabilityKey, VulnerabilityValue>>

interface CliOptions {
  bnpcPath: string
  compendiumRoot: string
  ddPath: string
  onlyUndefinedToBool: boolean
  reportPath: string
}

interface MatchRecord {
  basename: string
  filePath: string
  vulnerabilities: CompendiumVulnerabilities
}

interface ConflictRecord {
  alias: string
  existingFilePath: string
  incomingFilePath: string
}

interface CompendiumIndex {
  ambiguous: Set<string>
  conflicts: ConflictRecord[]
  records: Map<string, MatchRecord>
}

interface VulnerabilityChange {
  after: boolean
  before: boolean | undefined
  compendiumFilePath: string
  enemyId: number
  enemyName: string
  key: VulnerabilityKey
  mapKey: MapKey
}

const mapDirectoryPrefixes: Record<MapKey, string> = {
  EO: 'eo',
  HoH: 'hoh',
  PotD: 'potd',
  PT: 'pt',
}

const removablePrefixes = [
  'undead orthos',
  'great orthos',
  'orthos',
  'heavenly',
  'deep palace',
  'palace',
  'traverse',
  'forgiven',
  'invoked',
  'summoned',
] as const

const treasureMonsterAliases = new Set([
  'mimic',
  'quivering coffer',
])

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    bnpcPath: path.join(csvPaths.en, 'BNpcName.csv'),
    compendiumRoot: 'E:/Github/compendium/collections',
    ddPath: defaultDdPath(),
    onlyUndefinedToBool: false,
    reportPath: path.resolve('reports/dd-vulnerabilities-report.md'),
  }

  for (const arg of argv) {
    if (arg.startsWith('--bnpc-path='))
      options.bnpcPath = path.resolve(arg.slice('--bnpc-path='.length))
    else if (arg.startsWith('--compendium-root='))
      options.compendiumRoot = path.resolve(arg.slice('--compendium-root='.length))
    else if (arg.startsWith('--dd-path='))
      options.ddPath = path.resolve(arg.slice('--dd-path='.length))
    else if (arg === '--only-undefined-to-bool')
      options.onlyUndefinedToBool = true
    else if (arg.startsWith('--report-path='))
      options.reportPath = path.resolve(arg.slice('--report-path='.length))
  }

  return options
}

function canonicalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function stripQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
    || (trimmed.startsWith('"') && trimmed.endsWith('"'))
  )
    return trimmed.slice(1, -1)

  return trimmed
}

function extractFrontmatterValue(lines: string[], key: string): string | undefined {
  const prefix = `${key}:`
  const line = lines.find(candidate => candidate.startsWith(prefix))
  if (!line)
    return undefined
  return stripQuotes(line.slice(prefix.length))
}

function buildNameCandidates(name: string): string[] {
  const canonical = canonicalizeName(name)
  const candidates = new Set<string>([canonical])

  for (const prefix of removablePrefixes) {
    if (canonical.startsWith(`${prefix} `))
      candidates.add(canonical.slice(prefix.length + 1).trim())
  }

  if (canonical.startsWith('orthos') && !canonical.startsWith('orthos '))
    candidates.add(canonical.slice('ortho'.length).trim())
  if (canonical.startsWith('ortho') && !canonical.startsWith('orthos'))
    candidates.add(canonical.slice('ortho'.length).trim())

  return [...candidates].filter(Boolean)
}

function parseCsvField(line: string): { id: number, singular: string } | null {
  const match = /^(\d+),(?:"((?:[^"]|"")*)"|([^,]*)),/.exec(line)
  if (!match)
    return null

  const id = Number(match[1])
  if (!Number.isFinite(id))
    return null

  const singular = (match[2] ?? match[3] ?? '').replace(/""/g, '"')
  return { id, singular }
}

async function loadBnpcNames(bnpcPath: string): Promise<Map<number, string>> {
  const content = await readFile(bnpcPath, 'utf8')
  const rows = content.split(/\r?\n/)
  const names = new Map<number, string>()

  for (const row of rows) {
    const parsed = parseCsvField(row)
    if (!parsed || !parsed.singular)
      continue
    names.set(parsed.id, parsed.singular)
  }

  return names
}

function parseFrontmatterVulnerabilities(lines: string[]): CompendiumVulnerabilities | null {
  const startIndex = lines.findIndex(line => line.trim() === 'vulnerabilities:')
  if (startIndex === -1)
    return null

  const vulnerabilities: CompendiumVulnerabilities = {}
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === undefined || !line.startsWith('  '))
      break

    const match = /^\s{2}(bind|heavy|sleep|slow|stun):\s*(true|false|unknown)\s*$/.exec(line)
    if (!match)
      continue

    const key = match[1] as VulnerabilityKey
    vulnerabilities[key] = match[2] === 'unknown' ? 'unknown' : match[2] === 'true'
  }

  return Object.keys(vulnerabilities).length > 0 ? vulnerabilities : null
}

function parseCompendiumFile(fileName: string, content: string): { aliases: string[], vulnerabilities: CompendiumVulnerabilities } | null {
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)
  const frontmatter = frontmatterMatch?.[1]
  if (!frontmatter)
    return null

  const lines = frontmatter.split(/\r?\n/)
  const vulnerabilities = parseFrontmatterVulnerabilities(lines)
  if (!vulnerabilities)
    return null

  const aliases = new Set<string>([canonicalizeName(path.basename(fileName, '.md'))])
  const frontmatterName = extractFrontmatterValue(lines, 'name')
  const nickname = extractFrontmatterValue(lines, 'nickname')

  if (frontmatterName)
    aliases.add(canonicalizeName(frontmatterName))
  if (nickname)
    aliases.add(canonicalizeName(nickname))

  return {
    aliases: [...aliases],
    vulnerabilities,
  }
}

function areVulnerabilitiesEqual(a: CompendiumVulnerabilities, b: CompendiumVulnerabilities): boolean {
  return vulnerabilityKeys.every(key => a[key] === b[key])
}

function areEffectiveVulnerabilitiesEqual(a: CompendiumVulnerabilities, b: CompendiumVulnerabilities): boolean {
  const normalizedA = toDdVulnerabilities(a)
  const normalizedB = toDdVulnerabilities(b)
  return vulnerabilityKeys.every(key => normalizedA[key] === normalizedB[key])
}

async function buildCompendiumIndex(compendiumRoot: string, mapKey: MapKey): Promise<CompendiumIndex> {
  const directoryPrefix = `_${mapDirectoryPrefixes[mapKey]}_`
  const rootEntries = await readdir(compendiumRoot, { withFileTypes: true })
  const targetDirectories = rootEntries
    .filter(entry => entry.isDirectory() && entry.name.startsWith(directoryPrefix) && entry.name.endsWith('_enemies'))
    .map(entry => path.join(compendiumRoot, entry.name))

  const records = new Map<string, MatchRecord>()
  const ambiguous = new Set<string>()
  const conflicts: ConflictRecord[] = []

  for (const directoryPath of targetDirectories) {
    const fileEntries = await readdir(directoryPath, { withFileTypes: true })
    for (const fileEntry of fileEntries) {
      if (!fileEntry.isFile() || path.extname(fileEntry.name) !== '.md')
        continue

      const filePath = path.join(directoryPath, fileEntry.name)
      const markdown = await readFile(filePath, 'utf8')
      const parsed = parseCompendiumFile(fileEntry.name, markdown)
      if (!parsed)
        continue

      const matchRecord: MatchRecord = {
        basename: canonicalizeName(path.basename(fileEntry.name, '.md')),
        filePath,
        vulnerabilities: parsed.vulnerabilities,
      }

      for (const alias of parsed.aliases) {
        if (ambiguous.has(alias))
          continue

        const existing = records.get(alias)
        if (!existing) {
          records.set(alias, matchRecord)
          continue
        }

        if (
          areVulnerabilitiesEqual(existing.vulnerabilities, matchRecord.vulnerabilities)
          || areEffectiveVulnerabilitiesEqual(existing.vulnerabilities, matchRecord.vulnerabilities)
        )
          continue

        ambiguous.add(alias)
        records.delete(alias)
        conflicts.push({
          alias,
          existingFilePath: existing.filePath,
          incomingFilePath: filePath,
        })
      }
    }
  }

  return { ambiguous, conflicts, records }
}

function toDdVulnerabilities(compendium: CompendiumVulnerabilities): Record<VulnerabilityKey, boolean | undefined> {
  return {
    stun: compendium.stun === 'unknown' ? undefined : compendium.stun,
    slow: compendium.slow === 'unknown' ? undefined : compendium.slow,
    sleep: compendium.sleep === 'unknown' ? undefined : compendium.sleep,
    heavy: compendium.heavy === 'unknown' ? undefined : compendium.heavy,
    bind: compendium.bind === 'unknown' ? undefined : compendium.bind,
  }
}

function buildNextVulnerabilities(
  before: Record<VulnerabilityKey, boolean | undefined>,
  incoming: Record<VulnerabilityKey, boolean | undefined>,
  onlyUndefinedToBool: boolean,
): Record<VulnerabilityKey, boolean | undefined> {
  if (!onlyUndefinedToBool)
    return incoming

  return {
    stun: before.stun === undefined && incoming.stun !== undefined ? incoming.stun : before.stun,
    slow: before.slow === undefined && incoming.slow !== undefined ? incoming.slow : before.slow,
    sleep: before.sleep === undefined && incoming.sleep !== undefined ? incoming.sleep : before.sleep,
    heavy: before.heavy === undefined && incoming.heavy !== undefined ? incoming.heavy : before.heavy,
    bind: before.bind === undefined && incoming.bind !== undefined ? incoming.bind : before.bind,
  }
}

function shouldSkipBoss(record: EnemyRecord): boolean {
  return record.detect === 'boss'
}

function shouldSkipTreasureMonster(comment: string, enemyName: string): boolean {
  if (comment.includes('拟态怪') || comment.includes('宝箱怪'))
    return true

  return buildNameCandidates(enemyName).some(candidate => treasureMonsterAliases.has(candidate))
}

function extractDdVulnerabilities(record: EnemyRecord): Record<VulnerabilityKey, boolean | undefined> {
  const raw = record.vulnerabilities
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      stun: undefined,
      slow: undefined,
      sleep: undefined,
      heavy: undefined,
      bind: undefined,
    }
  }

  const source = raw as Partial<Record<VulnerabilityKey, boolean | undefined>>
  return {
    stun: source.stun,
    slow: source.slow,
    sleep: source.sleep,
    heavy: source.heavy,
    bind: source.bind,
  }
}

function collectVulnerabilityChanges(
  before: Record<VulnerabilityKey, boolean | undefined>,
  after: Record<VulnerabilityKey, boolean | undefined>,
  context: Omit<VulnerabilityChange, 'after' | 'before' | 'key'>,
): { boolToBool: VulnerabilityChange[], undefinedToBool: VulnerabilityChange[] } {
  const boolToBool: VulnerabilityChange[] = []
  const undefinedToBool: VulnerabilityChange[] = []

  for (const key of vulnerabilityKeys) {
    const previousValue = before[key]
    const nextValue = after[key]
    if (nextValue === undefined || previousValue === nextValue)
      continue

    const change: VulnerabilityChange = {
      ...context,
      after: nextValue,
      before: previousValue,
      key,
    }

    if (previousValue === undefined)
      undefinedToBool.push(change)
    else
      boolToBool.push(change)
  }

  return { boolToBool, undefinedToBool }
}

function formatVulnerabilityValue(value: boolean | undefined): string {
  if (value === undefined)
    return 'undefined'
  return String(value)
}

function summarizeChanges(items: VulnerabilityChange[]): string[] {
  return items.map((item) => {
    return `- ${item.mapKey}:${item.enemyId} (${item.enemyName}) \`${item.key}\`: \`${formatVulnerabilityValue(item.before)}\` -> \`${formatVulnerabilityValue(item.after)}\` | 来源: ${item.compendiumFilePath}`
  })
}

async function writeReport(
  reportPath: string,
  changedEntries: string[],
  matchedEntries: string[],
  boolToBoolChanges: VulnerabilityChange[],
  undefinedToBoolChanges: VulnerabilityChange[],
  ambiguousEntries: string[],
  skippedBossEntries: string[],
  skippedTreasureEntries: string[],
  missingNames: string[],
  unmatchedEntries: string[],
  conflicts: ConflictRecord[],
  onlyUndefinedToBool: boolean,
): Promise<void> {
  const reportLines = [
    '# dd vulnerabilities 同步报告',
    '',
    '## 概览',
    '',
    `- 写入模式: ${onlyUndefinedToBool ? '仅写入 undefined -> bool' : '写入所有匹配到的布尔值'}`,
    `- 实际改动的敌人条目数: ${changedEntries.length}`,
    `- 成功匹配的 compendium 条目数: ${matchedEntries.length}`,
    `- bool -> bool 的字段变化数: ${boolToBoolChanges.length}`,
    `- undefined -> bool 的字段变化数: ${undefinedToBoolChanges.length}`,
    `- 跳过的 boss 条目数: ${skippedBossEntries.length}`,
    `- 跳过的宝箱怪条目数: ${skippedTreasureEntries.length}`,
    `- 因冲突跳过的敌人条目数: ${ambiguousEntries.length}`,
    `- 缺少 BNpcName 的敌人 ID 数: ${missingNames.length}`,
    `- 未匹配到 compendium 的敌人条目数: ${unmatchedEntries.length}`,
    `- compendium 冲突别名数: ${conflicts.length}`,
    '',
    '## bool -> bool',
    '',
    ...(boolToBoolChanges.length > 0 ? summarizeChanges(boolToBoolChanges) : ['- 无']),
    '',
    '## undefined -> bool',
    '',
    ...(undefinedToBoolChanges.length > 0 ? summarizeChanges(undefinedToBoolChanges) : ['- 无']),
    '',
    '## 因冲突跳过的敌人条目',
    '',
    ...(ambiguousEntries.length > 0 ? ambiguousEntries.map(item => `- ${item}`) : ['- 无']),
    '',
    '## 未匹配到 compendium 的敌人条目',
    '',
    ...(unmatchedEntries.length > 0 ? unmatchedEntries.map(item => `- ${item}`) : ['- 无']),
    '',
    '## compendium 冲突别名',
    '',
    ...(conflicts.length > 0
      ? conflicts.map(conflict => `- ${conflict.alias}: ${conflict.existingFilePath} <> ${conflict.incomingFilePath}`)
      : ['- 无']),
    '',
  ]

  const reportDir = path.dirname(reportPath)
  if (reportDir !== '.')
    await mkdir(reportDir, { recursive: true })
  await writeFile(reportPath, reportLines.join('\n'), 'utf8')
}

function summarize(items: string[], label: string): void {
  if (items.length === 0)
    return

  console.log(`${label} (${items.length}):`)
  for (const item of items.slice(0, 20))
    console.log(`  - ${item}`)
  if (items.length > 20)
    console.log(`  ... 其余 ${items.length - 20} 条`)
}

const options = parseArgs(process.argv.slice(2))
const [original, bnpcNames, eoIndex, hohIndex, potdIndex, ptIndex] = await Promise.all([
  readFile(options.ddPath, 'utf8'),
  loadBnpcNames(options.bnpcPath),
  buildCompendiumIndex(options.compendiumRoot, 'EO'),
  buildCompendiumIndex(options.compendiumRoot, 'HoH'),
  buildCompendiumIndex(options.compendiumRoot, 'PotD'),
  buildCompendiumIndex(options.compendiumRoot, 'PT'),
])

const indexes: Record<MapKey, CompendiumIndex> = {
  EO: eoIndex,
  HoH: hohIndex,
  PotD: potdIndex,
  PT: ptIndex,
}

const eol = original.includes('\r\n') ? '\r\n' : '\n'
const trailingNewline = original.endsWith('\r\n') || original.endsWith('\n') ? eol : ''
const lines = original.split(/\r?\n/)
const conflicts = [...eoIndex.conflicts, ...hohIndex.conflicts, ...potdIndex.conflicts, ...ptIndex.conflicts]
const changedEntries: string[] = []
const matchedEntries: string[] = []
const ambiguousEntries: string[] = []
const boolToBoolChanges: VulnerabilityChange[] = []
const missingNames: string[] = []
const skippedBossEntries: string[] = []
const skippedTreasureEntries: string[] = []
const unmatchedEntries: string[] = []
const undefinedToBoolChanges: VulnerabilityChange[] = []
let changedLines = 0
let currentMap: MapKey | null = null
let insideEnemiesData = false

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index] ?? ''
  const mapMatch = /^const (EO|HoH|PotD|PT): Data = \{$/.exec(line)
  if (mapMatch?.[1]) {
    currentMap = mapMatch[1] as MapKey
    continue
  }

  if (line.includes('enemiesData: {')) {
    insideEnemiesData = true
    continue
  }

  if (insideEnemiesData && /^  },$/.test(line)) {
    insideEnemiesData = false
    continue
  }

  if (!currentMap || !insideEnemiesData)
    continue

  const parsed = parseEnemyLine(line)
  if (!parsed)
    continue

  if (shouldSkipBoss(parsed.record)) {
    skippedBossEntries.push(`${currentMap}:${parsed.id}`)
    continue
  }

  const enemyName = bnpcNames.get(parsed.id)
  if (!enemyName) {
    missingNames.push(`${currentMap}:${parsed.id}`)
    continue
  }

  if (shouldSkipTreasureMonster(parsed.comment, enemyName)) {
    skippedTreasureEntries.push(`${currentMap}:${parsed.id} (${enemyName})`)
    continue
  }

  const currentIndex = indexes[currentMap]
  const candidates = buildNameCandidates(enemyName)
  let matchRecord: MatchRecord | undefined
  let matchedAmbiguousAlias: string | undefined

  for (const candidate of candidates) {
    const record = currentIndex.records.get(candidate)
    if (record) {
      matchRecord = record
      break
    }

    if (currentIndex.ambiguous.has(candidate))
      matchedAmbiguousAlias = candidate
  }

  if (!matchRecord) {
    if (matchedAmbiguousAlias)
      ambiguousEntries.push(`${currentMap}:${parsed.id} (${enemyName}) 通过别名 ${matchedAmbiguousAlias} 命中冲突项`)
    else
      unmatchedEntries.push(`${currentMap}:${parsed.id} (${enemyName})`)
    continue
  }

  const nextRecord: EnemyRecord = {
    ...parsed.record,
    vulnerabilities: buildNextVulnerabilities(
      extractDdVulnerabilities(parsed.record),
      toDdVulnerabilities(matchRecord.vulnerabilities),
      options.onlyUndefinedToBool,
    ),
  }
  const { boolToBool, undefinedToBool } = collectVulnerabilityChanges(
    extractDdVulnerabilities(parsed.record),
    extractDdVulnerabilities(nextRecord),
    {
      compendiumFilePath: matchRecord.filePath,
      enemyId: parsed.id,
      enemyName,
      mapKey: currentMap,
    },
  )
  boolToBoolChanges.push(...boolToBool)
  undefinedToBoolChanges.push(...undefinedToBool)
  const nextLine = buildEnemyLine(parsed, nextRecord, { completeVulnerabilities: true })
  const entryLabel = `${currentMap}:${parsed.id} -> ${matchRecord.basename}`
  if (nextLine !== line) {
    lines[index] = nextLine
    changedLines += 1
    changedEntries.push(entryLabel)
  }
  matchedEntries.push(entryLabel)
}

const nextContent = `${lines.join(eol)}${trailingNewline}`
if (nextContent !== original)
  await writeFile(options.ddPath, nextContent, 'utf8')

await writeReport(
  options.reportPath,
  changedEntries,
  matchedEntries,
  boolToBoolChanges,
  undefinedToBoolChanges,
  ambiguousEntries,
  skippedBossEntries,
  skippedTreasureEntries,
  missingNames,
  unmatchedEntries,
  conflicts,
  options.onlyUndefinedToBool,
)

console.log(`已更新 ${changedLines} 行敌人数据：${options.ddPath}`)
console.log(`成功匹配 compendium 条目数：${matchedEntries.length}`)
console.log(`报告文件已写入：${options.reportPath}`)
console.log(`写入模式：${options.onlyUndefinedToBool ? '仅写入 undefined -> bool' : '写入所有匹配到的布尔值'}`)
console.log(`跳过的 boss 条目数：${skippedBossEntries.length}`)
console.log(`跳过的宝箱怪条目数：${skippedTreasureEntries.length}`)
console.log(`缺少 BNpcName 记录数：${missingNames.length}`)
console.log(`命中冲突别名而跳过的条目数：${ambiguousEntries.length}`)
console.log(`未在 compendium 中匹配到的条目数：${unmatchedEntries.length}`)
console.log(`compendium 冲突别名数：${conflicts.length}`)
console.log(`bool -> bool 的字段变化数：${boolToBoolChanges.length}`)
console.log(`undefined -> bool 的字段变化数：${undefinedToBoolChanges.length}`)

summarize(changedEntries, '已变更的敌人条目')
summarize(skippedBossEntries, '跳过的 boss 条目')
summarize(skippedTreasureEntries, '跳过的宝箱怪条目')
summarize(ambiguousEntries, '因冲突跳过的敌人条目')
summarize(missingNames, '缺少 BNpcName 的敌人 ID')
summarize(unmatchedEntries, '未匹配到 compendium 的敌人条目')
summarize(conflicts.map(conflict => `${conflict.alias}: ${conflict.existingFilePath} <> ${conflict.incomingFilePath}`), 'compendium 冲突别名')
