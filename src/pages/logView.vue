<script setup lang="ts">
import type { Column } from 'element-plus'
import type { EncounterCandidate } from '@/types/mitigation'
import { ElMessage } from 'element-plus'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useLogParser } from '@/composables/useLogParser'
import logDefinitions from '../../cactbot/resources/netlog_defs'

// ─── Type-code → name mapping ───────────────────────────────────────────────
const typeCodeNameMap = new Map<string, string>()
for (const def of Object.values(logDefinitions)) {
  typeCodeNameMap.set(def.type, def.name)
}
function resolveTypeName(code: string): string {
  return typeCodeNameMap.get(code) ?? 'Unknown'
}

// ─── Data Models ────────────────────────────────────────────────────────────
interface ParsedLineRow {
  key: string
  globalIndex: number
  raw: string
  parts: string[]
  typeCode: string
  typeName: string
  timestampText: string
  timestampMs: number | null
  deltaSec: number | null
}

interface LogFilterState {
  enabledTypeCodes: Record<string, boolean>
  includeRegexText: string
  excludeRegexText: string
  searchText: string
  diffHighlightEnabled: boolean
  visibleColumns: Record<string, boolean>
}

// ─── IndexedDB ──────────────────────────────────────────────────────────────
const DB_NAME = 'FF14LogViewDB'
const STORE_NAME = 'logs'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveLogToDB(name: string, text: string) {
  try {
    const db = await openDB()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put({ name, text }, 'lastFile')
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }
  catch (e) {
    console.error('Failed to save DB', e)
  }
}

async function loadLogFromDB(): Promise<{ name: string, text: string } | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get('lastFile')
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  }
  catch (_e) {
    return null
  }
}

// ─── State ──────────────────────────────────────────────────────────────────
const { parseFile } = useLogParser()

const fileName = ref('')
const loading = ref(false)
const encounters = ref<EncounterCandidate[]>([])
const selectedEncounterId = ref<string | null>(null)

// Only one column visible
const filter = ref<LogFilterState>({
  enabledTypeCodes: {},
  includeRegexText: '',
  excludeRegexText: '',
  searchText: '',
  diffHighlightEnabled: true,
  visibleColumns: { raw: true },
})

const isDragging = ref(false)

onMounted(async () => {
  try {
    loading.value = true
    const saved = await loadLogFromDB()
    if (saved) {
      const file = new File([saved.text], saved.name, { type: 'text/plain' })
      await handleFileImport(file, false)
    }
  }
  catch (_e) {
    // ignore
  }
  finally {
    loading.value = false
  }
})

// ─── Helpers ────────────────────────────────────────────────────────────────
function parseLineRow(raw: string, globalIndex: number, encounterId: string, combatStartMs: number | null): ParsedLineRow {
  const parts = raw.split('|')

  // Remove the checksum part (usually the last column) to avoid it
  // causing visual noise or matching in search/filter.
  if (parts.length > 0) {
    parts.pop()
  }
  const cleanRaw = `${parts.join('|')}|`

  const typeCode = parts[0] ?? ''
  const timestampText = parts[1] ?? ''
  const parsed = Date.parse(timestampText)
  const timestampMs = Number.isNaN(parsed) ? null : parsed
  const deltaSec = timestampMs !== null && combatStartMs !== null
    ? Number(((timestampMs - combatStartMs) / 1000).toFixed(1))
    : null

  return {
    key: `${encounterId}_${globalIndex}`,
    globalIndex,
    raw: cleanRaw,
    parts,
    typeCode,
    typeName: resolveTypeName(typeCode),
    timestampText,
    timestampMs,
    deltaSec,
  }
}

// ─── File Import ────────────────────────────────────────────────────────────
async function handleFileImport(file: File, saveDb = true) {
  loading.value = true
  fileName.value = file.name
  try {
    const text = await file.text()
    if (saveDb) {
      saveLogToDB(file.name, text)
    }
    const freshFile = new File([text], file.name)
    // Step 1 – split encounters
    const parsed = await parseFile(freshFile)
    encounters.value = parsed

    if (parsed.length === 0) {
      ElMessage.warning('未发现战斗记录')
    }
    else {
      selectedEncounterId.value = parsed[0]!.id
    }
  }
  catch (e) {
    console.error('File parse error', e)
    ElMessage.error('文件解析出错')
  }
  finally {
    loading.value = false
  }
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file)
    handleFileImport(file)
  input.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file)
    handleFileImport(file)
}

// ─── Selected encounter ─────────────────────────────────────────────────────
const selectedEncounter = computed(() => {
  if (!selectedEncounterId.value)
    return null
  return encounters.value.find(e => e.id === selectedEncounterId.value) ?? null
})

// ─── Base rows (boundary-aware) ─────────────────────────────────────────────
const baseRows = computed<ParsedLineRow[]>(() => {
  const enc = selectedEncounter.value
  if (!enc)
    return []

  return enc.lines.map((line, idx) =>
    parseLineRow(line, idx, enc.id, enc.startTime),
  )
})

// ─── Dynamic type sidebar ───────────────────────────────────────────────────
const availableTypeCodes = computed(() => {
  const map = new Map<string, { code: string, name: string, count: number }>()
  for (const row of baseRows.value) {
    const existing = map.get(row.typeCode)
    if (existing) {
      existing.count++
    }
    else {
      map.set(row.typeCode, { code: row.typeCode, name: row.typeName, count: 1 })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
})

// Sync enabledTypeCodes whenever available types change (includes encounter switch)
watch(availableTypeCodes, (codes) => {
  const next: Record<string, boolean> = {}
  for (const item of codes)
    next[item.code] = filter.value.enabledTypeCodes[item.code] ?? true
  filter.value.enabledTypeCodes = next
})

// Helper: create a regex computed + error ref from a reactive text source
function useRegex(textGetter: () => string) {
  const error = ref('')
  const regex = computed<RegExp | null>(() => {
    const text = textGetter().trim()
    if (!text)
      return null
    try {
      return new RegExp(text, 'i')
    }
    catch {
      return null
    }
  })
  watch(textGetter, (raw) => {
    const text = raw.trim()
    if (!text) {
      error.value = ''
      return
    }
    try {
      // eslint-disable-next-line no-new
      new RegExp(text, 'i')
      error.value = ''
    }
    catch (e: any) {
      error.value = e.message ?? 'Invalid regex'
    }
  })
  return { regex, error }
}

const { regex: searchRegex, error: searchTextError } = useRegex(() => filter.value.searchText)
const { regex: includeRegex, error: includeRegexError } = useRegex(() => filter.value.includeRegexText)
const { regex: excludeRegex, error: excludeRegexError } = useRegex(() => filter.value.excludeRegexText)

// ─── Filter chain ───────────────────────────────────────────────────────────
const filteredRows = computed<ParsedLineRow[]>(() => {
  let rows = baseRows.value

  // 1. Type filter
  const enabled = filter.value.enabledTypeCodes
  rows = rows.filter(r => enabled[r.typeCode] === true)

  // 2. Include regex
  const incRe = includeRegex.value
  if (incRe && !includeRegexError.value) {
    rows = rows.filter(r => incRe.test(r.raw))
  }

  // 3. Exclude regex
  const excRe = excludeRegex.value
  if (excRe && !excludeRegexError.value) {
    rows = rows.filter(r => !excRe.test(r.raw))
  }

  return rows
})

// ─── Search Navigation ──────────────────────────────────────────────────────
const matchIndices = computed(() => {
  const re = searchRegex.value
  if (!re)
    return []

  const indices: number[] = []
  const rows = filteredRows.value
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!
    if (re.test(r.raw)) {
      indices.push(i)
    }
  }
  return indices
})

const tableRef = ref<any>(null)
const currentMatchIdx = ref(-1)

watch(matchIndices, (indices) => {
  if (indices.length > 0) {
    currentMatchIdx.value = 0
    scrollToIndex(indices[0] as number)
  }
  else {
    currentMatchIdx.value = -1
  }
})

function scrollToIndex(index: number) {
  if (tableRef.value) {
    tableRef.value.scrollToRow(index, 'center')
  }
}

function scrollToNextMatch() {
  if (matchIndices.value.length === 0)
    return
  currentMatchIdx.value = (currentMatchIdx.value + 1) % matchIndices.value.length
  scrollToIndex(matchIndices.value[currentMatchIdx.value] as number)
}

function scrollToPrevMatch() {
  if (matchIndices.value.length === 0)
    return
  currentMatchIdx.value = (currentMatchIdx.value - 1 + matchIndices.value.length) % matchIndices.value.length
  scrollToIndex(matchIndices.value[currentMatchIdx.value] as number)
}

const currentMatchLabel = computed(() => {
  if (matchIndices.value.length === 0)
    return '0 / 0'
  return `${currentMatchIdx.value + 1} / ${matchIndices.value.length}`
})

function rowClass({ rowIndex }: { rowIndex: number }) {
  if (matchIndices.value.length > 0) {
    if (rowIndex === matchIndices.value[currentMatchIdx.value]) {
      return 'active-match-row'
    }
  }
  return ''
}

// ─── Diff highlight ─────────────────────────────────────────────────────────
interface DiffInfo {
  changedFieldCount: number
  changedIndices: Set<number>
}

const diffMap = computed<Map<string, DiffInfo>>(() => {
  const map = new Map<string, DiffInfo>()
  if (!filter.value.diffHighlightEnabled)
    return map

  const rows = filteredRows.value
  // Track last seen row for each typeCode
  const lastByType = new Map<string, ParsedLineRow>()

  for (const row of rows) {
    const prev = lastByType.get(row.typeCode)
    if (prev) {
      const changedIndices = new Set<number>()
      const maxLen = Math.max(row.parts.length, prev.parts.length)
      for (let i = 0; i < maxLen; i++) {
        if (i === 1)
          continue // skip timestamp field
        if ((row.parts[i] ?? '') !== (prev.parts[i] ?? ''))
          changedIndices.add(i)
      }
      map.set(row.key, { changedFieldCount: changedIndices.size, changedIndices })
    }
    lastByType.set(row.typeCode, row)
  }
  return map
})

// ─── Type sidebar actions ───────────────────────────────────────────────────
function setAllTypes(enabled: boolean) {
  const next = { ...filter.value.enabledTypeCodes }
  for (const key of Object.keys(next))
    next[key] = enabled
  filter.value.enabledTypeCodes = next
}

// ─── Horizontal scroll sync ─────────────────────────────────────────────────
const hScrollRef = ref<HTMLDivElement | null>(null)
const hScrollLeft = ref(0)
const contentWidth = ref(0)

let _measureCtx: CanvasRenderingContext2D | null = null
function measureTextWidth(text: string): number {
  if (!_measureCtx) {
    const canvas = document.createElement('canvas')
    _measureCtx = canvas.getContext('2d')
    if (_measureCtx) {
      _measureCtx.font = '11.5px \'JetBrains Mono\', \'Fira Code\', \'Consolas\', \'Menlo\', monospace'
    }
  }
  return _measureCtx ? _measureCtx.measureText(text).width : text.length * 7.5
}

watch(filteredRows, (rows) => {
  let maxPx = 0
  for (let i = 0; i < rows.length; i++) {
    const w = measureTextWidth(rows[i]?.raw || '')
    if (w > maxPx)
      maxPx = w
  }
  contentWidth.value = Math.ceil(maxPx + 60)

  // Reset horizontal scroll when data changes
  hScrollLeft.value = 0
  if (hScrollRef.value) {
    hScrollRef.value.scrollLeft = 0
  }
}, { immediate: true })

function onHScroll() {
  if (hScrollRef.value) {
    hScrollLeft.value = hScrollRef.value.scrollLeft
  }
}

// ─── Table columns (el-table-v2) ────────────────────────────────────────────
const tableColumns = computed<Column<any>[]>(() => {
  const allCols: Column<any>[] = [
    {
      key: 'raw',
      title: 'Raw',
      dataKey: 'raw',
      width: 200,
      flexGrow: 1,
      cellRenderer: ({ rowData }: { rowData: ParsedLineRow }) => {
        const diff = diffMap.value.get(rowData.key)
        const enableDiff = diff && diff.changedFieldCount > 0 && filter.value.diffHighlightEnabled
        const sRe = searchRegex.value

        const displayParts = rowData.parts

        const children = displayParts.map((part, idx) => {
          const isChanged = enableDiff && diff.changedIndices.has(idx)

          let content: any = part
          // Apply search highlight if configured and not empty part
          if (sRe && !searchTextError.value && part && sRe.test(part)) {
            // we split the text and highlight all matches
            let lastIndex = 0
            const fragments = []

            // Re-instantiate regex with global flag to find *all* matches in this part
            // (Assumes you don't use g flag in main incRe computed)
            const globalRegex = new RegExp(sRe.source, sRe.ignoreCase ? 'gi' : 'g')
            let match
            while (true) {
              match = globalRegex.exec(part)
              if (!match)
                break
              if (match.index > lastIndex) {
                fragments.push(part.substring(lastIndex, match.index))
              }
              fragments.push(h('span', { class: 'search-highlight' }, match[0]))
              lastIndex = match.index + match[0].length
            }
            if (lastIndex < part.length) {
              fragments.push(part.substring(lastIndex))
            }
            content = fragments
          }

          return [
            h('span', { class: isChanged ? 'diff-changed' : 'diff-unchanged' }, content),
            h('span', { class: 'diff-separator' }, '|'),
          ]
        }).flat()

        return h(
          'span',
          {
            class: 'cell-raw',
            title: rowData.raw,
          },
          children,
        )
      },
    },
  ]

  return allCols
})

// ─── Encounter option label ─────────────────────────────────────────────────
function encounterLabel(enc: EncounterCandidate) {
  const start = new Date(enc.startTime).toLocaleTimeString()
  return `${enc.zoneName} | ${start} | ${enc.durationStr} | ${enc.lines.length} 行`
}
</script>

<template>
  <div class="log-view-root">
    <div v-if="encounters.length === 0 && !loading" class="empty-hint">
      <p>拖入 <code>.log</code> 或 <code>.txt</code> 文件以开始分析</p>
    </div>

    <div v-else class="main-layout">
      <!-- ── Left Sidebar ── -->
      <aside class="sidebar">
        <!-- 拖放区域 (移入侧边栏上方) -->
        <section class="sidebar-section">
          <div
            class="drop-zone"
            :class="{ dragging: isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="onDrop"
          >
            <label class="file-label">
              <input type="file" accept=".log,.txt" hidden @change="onFileInput">
              <span class="file-btn">📂 选择/拖入</span>
            </label>
          </div>

          <div v-if="loading" class="loading-indicator">
            <el-icon class="is-loading">
              <i class="el-icon-loading" />
            </el-icon>
            解析中…
          </div>
        </section>

        <!-- 选择战斗 -->
        <section v-if="encounters.length > 0" class="sidebar-section">
          <el-select
            v-model="selectedEncounterId"
            placeholder="选择战斗"
            class="encounter-select-sidebar"
          >
            <el-option
              v-for="enc in encounters"
              :key="enc.id"
              :label="encounterLabel(enc)"
              :value="enc.id"
            />
          </el-select>
        </section>

        <!-- Type code checkboxes (占据剩余空间) -->
        <section class="sidebar-section type-section">
          <h3 class="section-title">
            类型过滤
            <span class="type-actions">
              <button class="link-btn" @click="setAllTypes(true)">全选</button>
              <button class="link-btn" @click="setAllTypes(false)">全不选</button>
            </span>
          </h3>
          <div class="type-list">
            <div
              v-for="item in availableTypeCodes"
              :key="item.code"
              class="type-item"
            >
              <input
                v-model="filter.enabledTypeCodes[item.code]"
                type="checkbox"
                class="type-checkbox"
              >
              <span class="type-code">{{ item.code }}</span>
              <span class="type-name">{{ item.name }}</span>
              <span class="type-count">({{ item.count }})</span>
            </div>
          </div>
        </section>

        <!-- Diff toggle -->
        <section class="sidebar-section diff-section">
          <el-checkbox v-model="filter.diffHighlightEnabled" size="small">
            差异高亮
          </el-checkbox>
        </section>
      </aside>

      <!-- ── Main Area ── -->
      <div class="content-area">
        <!-- Filter & Search layouts -->
        <div class="controls-bar">
          <div class="filter-group">
            <span class="control-label">包含</span>
            <el-input
              v-model="filter.includeRegexText"
              placeholder="过滤包含 (支持正则)"
              clearable
              :class="{ 'regex-error': includeRegexError }"
              class="search-input"
            />

            <span class="control-label exclude-label">排除</span>
            <el-input
              v-model="filter.excludeRegexText"
              placeholder="过滤排除 (支持正则)"
              clearable
              :class="{ 'regex-error': excludeRegexError }"
              class="search-input exclude"
            />
          </div>

          <div class="search-group">
            <span class="control-label search-label">定位</span>
            <el-input
              v-model="filter.searchText"
              placeholder="定位搜索 (支持正则)"
              clearable
              :class="{ 'regex-error': searchTextError }"
              class="search-input highlight-input"
            />

            <div v-if="filter.searchText" class="search-nav">
              <button class="nav-btn" :disabled="matchIndices.length === 0" @click="scrollToPrevMatch">
                上一个
              </button>
              <span class="match-count">{{ currentMatchLabel }}</span>
              <button class="nav-btn" :disabled="matchIndices.length === 0" @click="scrollToNextMatch">
                下一个
              </button>
            </div>
          </div>
        </div>

        <div class="table-area">
          <el-auto-resizer style="height: 100%; width: 100%">
            <template #default="{ height, width }">
              <div style="display: flex; flex-direction: column; height: 100%">
                <el-table-v2
                  ref="tableRef"
                  class="log-table"
                  :columns="tableColumns"
                  :data="filteredRows"
                  :width="width"
                  :height="contentWidth > width ? height - 14 : height"
                  :row-height="28"
                  :header-height="32"
                  row-key="key"
                  :overscan-row-count="5"
                  :row-class-name="rowClass"
                  :expand-column-key="currentMatchIdx.toString()"
                  scrollbar-always-on
                  :style="{ '--h-scroll-offset': `-${hScrollLeft}px`, '--h-content-width': `${contentWidth}px` }"
                >
                  <template #empty>
                    <div class="table-empty">
                      暂无匹配的日志行
                    </div>
                  </template>
                </el-table-v2>
                <div
                  v-if="contentWidth > width"
                  ref="hScrollRef"
                  class="h-scroll-track"
                  @scroll="onHScroll"
                >
                  <div :style="{ width: `${contentWidth}px`, height: '1px' }" />
                </div>
              </div>
            </template>
          </el-auto-resizer>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* ── Global/Variables ── */
.log-view-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0d1117;
  color: #c9d1d9;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Menlo', monospace;
  overflow: hidden;

  /* Force Element Plus Dark Variables */
  --el-bg-color: #0d1117;
  --el-bg-color-page: #0d1117;
  --el-bg-color-overlay: #161b22;
  --el-text-color-primary: #c9d1d9;
  --el-text-color-regular: #8b949e;
  --el-border-color: #30363d;
  --el-border-color-light: #21262d;
  --el-border-color-lighter: #21262d;
  --el-fill-color-blank: #0d1117;
  --el-mask-color: rgba(0, 0, 0, 0.8);

  /* Custom Scrollbar for the whole app */
  * {
    scrollbar-width: thin;
    scrollbar-color: #30363d transparent;
  }
  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background-color: #30363d;
    border-radius: 10px;
  }
}

/* ── Toolbar / Drop Zone inside sidebar ── */
.drop-zone {
  border: 2px dashed #484f58;
  border-radius: 8px;
  padding: 6px 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  background: rgba(22, 27, 34, 0.5);

  &.dragging {
    border-color: #58a6ff;
    background: rgba(88, 166, 255, 0.1);
    transform: scale(1.02);
  }

  &:hover {
    border-color: #79c0ff;
    background: rgba(22, 27, 34, 0.8);
  }
}

.file-label {
  cursor: pointer;
  display: flex;
  align-items: center;
  height: 100%;
}

.file-btn {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  color: #58a6ff;
  letter-spacing: 0.5px;
}

.stats {
  display: flex;
  gap: 12px;
  font-size: 12px;

  .stat-item {
    padding: 4px 12px;
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 12px;
    color: #8b949e;
    display: inline-flex;
    align-items: center;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition: color 0.2s;

    &:hover {
      color: #c9d1d9;
    }
  }
}

.loading-indicator {
  font-size: 13px;
  color: #58a6ff;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.empty-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #8b949e;
  animation: pulse 3s infinite;

  code {
    background: #21262d;
    color: #e6edf3;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 16px;
    margin: 0 6px;
    border: 1px solid #30363d;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ── Main Layout ── */
.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #0d1117;
}

/* ── Sidebar ── */
.sidebar {
  width: 280px;
  min-width: 240px;
  background: #161b22;
  border-right: 1px solid #30363d;
  padding: 16px 0;
  flex-shrink: 0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%; /* Ensure sidebar takes full height and bounds its children */
  overflow: hidden; /* Prevent default vertical scroll here; let inner type-list scroll */
}

.sidebar-section {
  padding: 0 20px 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #21262d;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #6e7681;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.encounter-select {
  width: 100%;

  :deep(.el-input__wrapper) {
    background-color: #0d1117;
    box-shadow: 0 0 0 1px #30363d inset;
  }
}

/* ── Type checkbox list ── */
.type-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Important to keep flex child from overflowing */
}

.diff-section {
  margin-top: auto; /* Push down if needed */
  border-top: 1px solid #21262d;
  border-bottom: none;
  padding-top: 12px;
}

.type-actions {
  display: flex;
  gap: 6px;
}

.link-btn {
  background: rgba(88, 166, 255, 0.1);
  border: 1px solid transparent;
  border-radius: 4px;
  color: #58a6ff;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
  transition: all 0.2s;

  &:hover {
    background: rgba(88, 166, 255, 0.2);
    border-color: rgba(88, 166, 255, 0.3);
  }
}

.type-list {
  overflow-y: auto;
  flex: 1;
  padding-right: 4px;
  margin-top: 4px;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  margin-bottom: 2px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
  transition: background 0.2s, transform 0.1s;
  border: 1px solid transparent;

  &:hover {
    background: rgba(88, 166, 255, 0.08);
    border-color: rgba(88, 166, 255, 0.15);
  }
}

.type-checkbox {
  accent-color: #58a6ff;
  width: 14px;
  height: 14px;
  cursor: pointer;
  margin: 0;
}

.type-code {
  font-weight: 700;
  color: #d2a8ff;
  min-width: 24px;
  text-align: center;
  background: rgba(210, 168, 255, 0.1);
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 11px;
}

.type-name {
  color: #c9d1d9;
  flex: 1;
  word-break: break-all;
}

.type-count {
  color: #8b949e;
  font-size: 11px;
  font-weight: 600;
  background: #21262d;
  padding: 1px 6px;
  border-radius: 10px;
}

/* ── Filter visual states ── */
.regex-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #f85149 inset !important;
  background-color: rgba(248, 81, 73, 0.05);
}

.error-hint {
  color: #f85149;
  font-size: 11px;
  margin-top: 4px;
  font-weight: 500;
}

.mt-1 {
  margin-top: 8px;
}

// Global overrides for Element Plus Inputs in dark mode
:deep(.el-input__wrapper) {
  background-color: #0d1117;
  box-shadow: 0 0 0 1px #30363d inset;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 0 0 1px #8b949e inset;
  }

  &.is-focus {
    box-shadow: 0 0 0 1px #58a6ff inset;
  }
}

:deep(.el-input__inner) {
  color: #c9d1d9;
  &::placeholder {
    color: #6e7681;
  }
}

/* ── Content Area & Search Bar ── */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.controls-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  background: #0d1117;
  border-bottom: 1px solid #21262d;
}

.filter-group, .search-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-label {
  font-size: 13px;
  font-weight: 600;
  color: #c9d1d9;
  white-space: nowrap;

  &.exclude-label {
    color: #f85149;
    margin-left: 12px;
  }

  &.search-label {
    color: #58a6ff;
  }
}

.search-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #161b22;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #30363d;
  flex-shrink: 0;

  .nav-btn {
    background: #21262d;
    border: 1px solid #30363d;
    color: #c9d1d9;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: #30363d;
      border-color: #58a6ff;
      color: #79c0ff;
    }

    &:disabled {
      color: #484f58;
      background: #161b22;
      border-color: #21262d;
      cursor: not-allowed;
    }
  }

  .match-count {
    color: #c9d1d9;
    font-size: 14px;
    font-weight: 600;
    min-width: 48px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
}

.search-input {
  flex: 1;

  :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px #30363d inset;
    background: #161b22;
    border-radius: 6px;

    &.is-focus {
      box-shadow: 0 0 0 1px #58a6ff inset;
    }
  }
}

.highlight-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3fb950 inset;
}

.exclude :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #f85149 inset;
}

.encounter-select-sidebar {
  width: 100%;

  :deep(.el-input__wrapper) {
    background-color: transparent;
    box-shadow: none;
    border: 1px solid #484f58;

    &:hover, &.is-focus {
      border-color: #58a6ff;
    }
  }
}

/* ── Table Area ── */
.table-area {
  flex: 1;
  overflow: hidden;
  background: #0d1117;
  position: relative;
}

.log-table {
  font-size: 12px;
  background: #0d1117;
  overflow: hidden !important; /* Clip translated content at the outermost boundary */

  :deep(.el-table-v2__root) {
    background: #0d1117;
  }

  :deep(.el-table-v2__emptyblock) {
    background: #0d1117;
  }

  :deep(.el-table-v2__row) {
    transition: background-color 0.15s;
    background: #0d1117;

    &:hover {
      background: #161b22 !important;
    }
  }

  :deep(.el-table-v2__header-row) {
    background: #161b22 !important;
    color: #8b949e;
    font-weight: 600;
    border-bottom: 1px solid #30363d;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 11px;
  }

  :deep(.el-table-v2__header-cell) {
    background: transparent !important;
    border-right: 1px solid #21262d;
    &:last-child {
      border-right: none;
    }
  }

  :deep(.el-table-v2__row-cell) {
    background: transparent !important;
    border-bottom: 1px solid #21262d;
    border-right: 1px solid #21262d;
    padding-right: 16px; /* 保留一些右侧呼吸空间 */
    &:last-child {
      border-right: none;
    }
  }
}

.table-empty {
  color: #8b949e;
  font-size: 14px;
  text-align: center;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  &::before {
    content: '📭';
    font-size: 24px;
    opacity: 0.5;
  }
}

/* ── Cell styles ── */
:deep(.cell-index) {
  color: #6e7681;
  font-size: 11px;
  user-select: none;
}

:deep(.cell-time) {
  color: #58a6ff;
  font-size: 11px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  background: rgba(88, 166, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}

:deep(.cell-type) {
  color: #d2a8ff;
  font-size: 11px;
  white-space: nowrap;
  font-weight: 500;
}

:deep(.cell-delta) {
  color: #3fb950;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

:deep(.cell-raw) {
  word-break: normal;
  line-height: 1.6;
  font-size: 11.5px;
  white-space: pre;
  display: inline-block;
  padding: 0 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

:deep(.diff-changed) {
  background-color: rgba(227, 179, 65, 0.2);
  color: #f2cc60;
  border-radius: 2px;
}

:deep(.active-match-row) {
  background-color: rgba(227, 179, 65, 0.25) !important;
}

:deep(.active-match-row:hover) {
  background-color: rgba(227, 179, 65, 0.35) !important;
}

:deep(.search-highlight) {
  background-color: rgba(88, 166, 255, 0.35);
  color: #fff;
  border-radius: 2px;
}

:deep(.diff-unchanged) {
  color: #c9d1d9;
  transition: color 0.15s;
}

:deep(.diff-separator) {
  color: #6e7681;
  transition: color 0.15s;
}

:deep(.cell-diff-empty) {
  color: #484f58;
  font-size: 11px;
}

:deep(.cell-diff-count) {
  background: linear-gradient(135deg, rgba(210, 153, 34, 0.2), rgba(210, 153, 34, 0.1));
  color: #e3b341;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(227, 179, 65, 0.3);
}

/* ── Horizontal scroll track ── */
.h-scroll-track {
  width: 100%;
  height: 14px;
  overflow-x: auto;
  overflow-y: hidden;
  background: #161b22;
  border-top: 1px solid #21262d;
  flex-shrink: 0;

  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #161b22;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #484f58;
    border-radius: 4px;
    &:hover {
      background-color: #6e7681;
    }
  }
}

/* ── Horizontal scroll overrides ── */
:deep(.el-table-v2__header-row),
:deep(.el-table-v2__row) {
  transform: translateX(var(--h-scroll-offset, 0px));
  width: var(--h-content-width, 100%) !important;
  min-width: 100%;
}

:deep(.el-table-v2__main),
:deep(.el-table-v2__body),
:deep(.el-table-v2__header),
:deep(.el-table-v2__header-wrapper),
:deep(.el-table-v2__row),
:deep(.el-table-v2__row-cell),
:deep(.el-table-v2__header-row),
:deep(.el-table-v2__header-cell),
:deep(.el-vl__window),
:deep(.el-vl__wrapper) {
  overflow: visible !important;
  width: var(--h-content-width, 100%) !important;
  min-width: 100%;
}
</style>
