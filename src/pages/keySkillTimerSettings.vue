<script setup lang="ts">
import type { MessageBoxInputData } from 'element-plus'
import type { ActionPickerGridItem } from '@/components/common/ActionPickerDialog.vue'
import type { DynamicValue } from '@/types/dynamicValue'
import { Download, Plus, RefreshLeft, Upload } from '@element-plus/icons-vue'
import { useWindowSize } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as LZString from 'lz-string'
import { computed, reactive, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import ActionPickerDialog from '@/components/common/ActionPickerDialog.vue'
import SkillEditorDialog from '@/components/common/SkillEditorDialog.vue'
import { useLang } from '@/composables/useLang'
import { getGlobalSkillMetaByActionId, GLOBAL_SKILL_MAX_LEVEL } from '@/resources/globalSkills'
import { DEFAULT_JOB_SORT_ORDER } from '@/resources/jobSortOrder'
import { keySkillDefinitions } from '@/resources/keySkillResource'
import { resolveActionMinLevel } from '@/resources/logic/actionMinLevel'
import { getActionNameLite } from '@/resources/logic/actionNameLite'
import { resolveTeamWatchDynamicValue } from '@/resources/teamWatchResource'
import { useKeySkillStore } from '@/store/keySkills'
import { copyToClipboard } from '@/utils/clipboard'
import { idToSrc } from '@/utils/dynamicValue'
import { tts } from '@/utils/tts'
import Util from '@/utils/util'
import { getIconSrcByPath, handleImgError, searchActionsByClassJobs } from '@/utils/xivapi'

interface KeySkillRow {
  key: string
  id: number
  tts: string
  line: number
  job?: number[]
  recast1000ms?: DynamicValue
  duration?: DynamicValue
  minLevel?: number
}

const { t } = useLang()
const storeKeySkill = useKeySkillStore()
const { width: viewportWidth } = useWindowSize()

const rows = computed<KeySkillRow[]>(() => storeKeySkill.keySkillsData.chinese as unknown as KeySkillRow[])
const lineBuckets = reactive<Record<number, KeySkillRow[]>>({})
let syncLocked = false

const pickerVisible = ref(false)
const pickerSearch = ref('')
const pickerPool = ref<ActionPickerGridItem[]>([])
const pickerPoolCache = reactive<Record<number, ActionPickerGridItem[]>>({})
const pickerLoading = ref(false)
const pickerSelectedJob = ref<number | null>(null)
const pickerTargetLine = ref(1)
const pickerReplaceSkillKey = ref<string | null>(null)

const editorVisible = ref(false)
const editorOpening = ref(false)
const editorSkillKey = ref<string | null>(null)
const jobEditorVisible = ref(false)
const editorTts = ref('')

const lineOrder = computed(() => {
  const lines = Object.keys(lineBuckets)
    .map(v => Number(v))
    .filter(v => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b)
  return lines.length > 0 ? lines : [1]
})

const nextLine = computed(() => (lineOrder.value[lineOrder.value.length - 1] ?? 1) + 1)

const currentEditorSkill = computed(() => {
  if (!editorSkillKey.value)
    return null
  return rows.value.find(v => v.key === editorSkillKey.value) ?? null
})
const currentEditorMeta = computed(() => {
  if (!currentEditorSkill.value)
    return null
  return resolveSkillMeta(currentEditorSkill.value.id)
})
const dynamicValueTipText = 'DynamicValue支持输入数字或动态表达式，例如 `(lv) => lv>=94 ? 40 : 60`。'

const pickerDialogWidth = computed(() => {
  const available = Math.trunc(viewportWidth.value) - 20
  const safeWidth = Math.max(320, available)
  return `${Math.min(980, safeWidth)}px`
})

const pickerJobOptions = computed(() => {
  const sortMap = new Map(DEFAULT_JOB_SORT_ORDER.map((jobEnum, index) => [jobEnum, index]))
  return Util.getBattleJobs3()
    .map(job => ({
      jobEnum: Util.jobToJobEnum(job),
      label: Util.jobToFullName(job).cn || Util.jobToFullName(job).en || job,
      iconSrc: getJobIconSrcByEnum(Util.jobToJobEnum(job)),
    }))
    .filter(v => Number.isFinite(v.jobEnum) && v.jobEnum > 0)
    .sort((a, b) => {
      const aIndex = sortMap.get(a.jobEnum) ?? Number.MAX_SAFE_INTEGER
      const bIndex = sortMap.get(b.jobEnum) ?? Number.MAX_SAFE_INTEGER
      if (aIndex !== bIndex)
        return aIndex - bIndex
      return a.jobEnum - b.jobEnum
    })
})

const interactionLocked = computed(() => editorOpening.value || storeKeySkill.isAutoMetaLoading)
const pickerInteractionLocked = computed(() => pickerLoading.value || interactionLocked.value)
const defaultTtsByActionId = (() => {
  const map = new Map<number, string>()
  keySkillDefinitions.forEach((definition) => {
    const resolvedId = resolveTeamWatchDynamicValue(definition.id, GLOBAL_SKILL_MAX_LEVEL, 0)
    if (!Number.isFinite(resolvedId) || resolvedId <= 0)
      return
    const actionId = Math.trunc(resolvedId)
    if (!map.has(actionId))
      map.set(actionId, definition.tts ?? '')
  })
  return map
})()

const pickerCurrentActionId = computed(() => {
  const replaceKey = pickerReplaceSkillKey.value
  if (!replaceKey)
    return null
  const row = rows.value.find(v => v.key === replaceKey)
  if (!row || row.id <= 0)
    return null
  return row.id
})

function normalizeJobEnums(jobs: number[] | undefined): number[] {
  if (!Array.isArray(jobs))
    return []
  return [...new Set(
    jobs
      .map(v => Number(v))
      .filter(v => Number.isFinite(v) && v > 0)
      .map(v => Math.trunc(v)),
  )]
}

function resolveRowJobsForPicker(row: KeySkillRow): number[] {
  const cached = storeKeySkill.autoMetaById[row.id]
  if (cached?.classJobTargetId && cached.classJobTargetId > 0)
    return [Math.trunc(cached.classJobTargetId)]
  const customJobs = normalizeJobEnums(row.job)
  if (customJobs.length > 0)
    return customJobs
  if (cached)
    return normalizeJobEnums(cached.jobs)
  return normalizeJobEnums(resolveSkillMeta(row.id).jobs)
}

const pickerDisabledActionSet = computed(() => {
  const currentActionId = pickerCurrentActionId.value ?? 0
  const selectedJob = Number.isFinite(pickerSelectedJob.value) ? Math.trunc(Number(pickerSelectedJob.value)) : 0
  const disabled = new Set<number>()
  rows.value.forEach((row) => {
    const actionId = Number(row.id)
    if (!Number.isFinite(actionId) || actionId <= 0)
      return
    if (selectedJob > 0) {
      const rowJobs = resolveRowJobsForPicker(row)
      if (!rowJobs.includes(selectedJob))
        return
    }
    const normalized = Math.trunc(actionId)
    if (normalized !== currentActionId)
      disabled.add(normalized)
  })
  return disabled
})

const pickerDisabledIds = computed(() => pickerDisabledActionSet.value)

const pickerTargetLabel = computed(() => {
  const replaceKey = pickerReplaceSkillKey.value
  if (replaceKey) {
    const row = rows.value.find(v => v.key === replaceKey)
    if (row)
      return `正在替换：${resolveSkillMeta(row.id).name}`
  }
  return `正在编辑：第 ${pickerTargetLine.value} 行`
})

function resolveSkillMeta(actionId: number) {
  const cached = storeKeySkill.autoMetaById[actionId]
  if (cached)
    return cached

  const globalMeta = getGlobalSkillMetaByActionId(actionId)
  const resolvedIdRaw = resolveTeamWatchDynamicValue(globalMeta?.id ?? actionId, GLOBAL_SKILL_MAX_LEVEL, actionId)
  const resolvedDurationRaw = resolveTeamWatchDynamicValue(globalMeta?.duration ?? 0, GLOBAL_SKILL_MAX_LEVEL, 0)
  const resolvedRecastRaw = resolveTeamWatchDynamicValue(globalMeta?.recast1000ms ?? 0, GLOBAL_SKILL_MAX_LEVEL, 0)
  const resolvedId = Number.isFinite(resolvedIdRaw) ? Math.trunc(resolvedIdRaw) : actionId
  const resolvedDuration = Number.isFinite(resolvedDurationRaw) ? Math.max(0, Math.trunc(resolvedDurationRaw)) : 0
  const resolvedRecast1000ms = Number.isFinite(resolvedRecastRaw) ? Math.max(0, Math.trunc(resolvedRecastRaw)) : 0
  const minLevel = Number(globalMeta?.minLevel ?? 1)
  const resolvedMinLevel = Number.isFinite(minLevel) ? Math.max(1, Math.trunc(minLevel)) : 1

  return {
    id: resolvedId,
    name: getActionNameLite(resolvedId) || getActionNameLite(actionId) || `#${resolvedId}`,
    src: idToSrc(resolvedId),
    duration: resolvedDuration,
    recast1000ms: resolvedRecast1000ms,
    minLevel: resolvedMinLevel,
    isRoleAction: false,
    jobs: Array.isArray(globalMeta?.job) ? [...globalMeta.job] : [],
  }
}

let hasCheckedExistingRowJobs = false
function assertKnownExistingRowJobs() {
  const invalid = new Set<number>()
  rows.value.forEach((row) => {
    if (!Array.isArray(row.job))
      return
    row.job.forEach((jobId) => {
      const numeric = Number(jobId)
      if (!Number.isFinite(numeric) || numeric <= 0)
        return
      const normalized = Math.trunc(numeric)
      const job = Util.jobEnumToJob(normalized)
      if (job === 'NONE')
        invalid.add(normalized)
    })
  })

  if (invalid.size > 0) {
    const ids = [...invalid].sort((a, b) => a - b).join(', ')
    throw new Error(`[UnknownJob] keySkillTimerSettings existing data contains unknown jobs: ${ids}`)
  }
}

function syncBucketsFromStore() {
  if (syncLocked)
    return
  syncLocked = true
  const next: Record<number, KeySkillRow[]> = {}
  rows.value.forEach((row) => {
    const line = Number.isFinite(row.line) && row.line > 0 ? Math.trunc(row.line) : 1
    if (!next[line])
      next[line] = []
    next[line]!.push(row)
  })
  if (!next[1])
    next[1] = []

  Object.keys(lineBuckets).forEach((key) => {
    if (!(Number(key) in next))
      Reflect.deleteProperty(lineBuckets, Number(key))
  })
  Object.entries(next).forEach(([line, list]) => {
    lineBuckets[Number(line)] = [...list]
  })
  syncLocked = false
}

function syncStoreFromBuckets() {
  syncLocked = true
  const sortedLines = Object.keys(lineBuckets)
    .map(v => Number(v))
    .filter(v => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b)
  const nextRows: KeySkillRow[] = []
  sortedLines.forEach((line) => {
    const list = lineBuckets[line] ?? []
    list.forEach((row) => {
      row.line = line
      nextRows.push(row)
    })
  })
  storeKeySkill.keySkillsData.chinese = nextRows as any
  syncLocked = false
}

function getLineBucket(line: number) {
  return lineBuckets[line] ?? []
}

function updateLineBucket(line: number, list: unknown[]) {
  lineBuckets[line] = Array.isArray(list) ? (list as KeySkillRow[]) : []
}

watch(rows, () => {
  if (!hasCheckedExistingRowJobs) {
    assertKnownExistingRowJobs()
    hasCheckedExistingRowJobs = true
  }
  syncBucketsFromStore()
  rows.value.forEach((row) => {
    void storeKeySkill.ensureActionAutoMeta(row.id)
  })
}, { immediate: true, deep: true })

function resetToDefault() {
  if (interactionLocked.value)
    return
  ElMessageBox.confirm(
    t('keySkillTimerSettings.resetConfirmMsg'),
    t('keySkillTimerSettings.confirmTitle'),
    {
      confirmButtonText: t('keySkillTimerSettings.confirmBtn'),
      cancelButtonText: t('keySkillTimerSettings.cancelBtn'),
      type: 'warning',
    },
  )
    .then(() => {
      storeKeySkill.resetSkillsToDefault()
      editorVisible.value = false
      pickerVisible.value = false
      syncBucketsFromStore()
      ElMessage.success(t('keySkillTimerSettings.resetSuccessMsg'))
    })
    .catch(() => {})
}

function addSkillById(id: number, line: number, name: string | undefined) {
  if (interactionLocked.value)
    return null
  const nextLine = Number.isFinite(line) && line > 0 ? Math.trunc(line) : 1
  const row: KeySkillRow = {
    key: crypto.randomUUID(),
    id,
    tts: '',
    line: nextLine,
  }
  storeKeySkill.keySkillsData.chinese.push(row as any)
  void storeKeySkill.ensureActionAutoMeta(id)
  ElMessage.success(`${t('keySkillTimerSettings.addSkill')}: ${name || id}`)
  return row.key
}

function replaceSkillById(row: KeySkillRow, id: number) {
  row.id = id
  // Keep slot position/key, but reset all skill-specific overrides to match "new add" behavior.
  row.tts = ''
  row.job = undefined
  row.recast1000ms = undefined
  row.duration = undefined
  row.minLevel = undefined
}

function deleteSkill(key: string) {
  if (interactionLocked.value)
    return
  const skills = storeKeySkill.keySkillsData.chinese as unknown as KeySkillRow[]
  const index = skills.findIndex(skill => skill.key === key)
  if (index !== -1)
    skills.splice(index, 1)
}

function exportData() {
  const text = JSON.stringify(storeKeySkill.keySkillsData)
  const zipped = LZString.compressToBase64(text)
  copyToClipboard(zipped)
    .then(() => ElMessage.success(t('keySkillTimerSettings.copySuccess')))
    .catch(() => ElMessage.error(t('keySkillTimerSettings.copyFailed')))
}

function importData(): void {
  ElMessageBox.prompt(
    t('keySkillTimerSettings.importPromptMsg'),
    t('keySkillTimerSettings.importTitle'),
    {
      confirmButtonText: t('keySkillTimerSettings.confirmBtn'),
      cancelButtonText: t('keySkillTimerSettings.cancelBtn'),
      inputType: 'textarea',
      inputValidator: (value: string) => {
        try {
          const data = LZString.decompressFromBase64(value)
          const json = JSON.parse(data)
          if (typeof json === 'object' && json !== null)
            return true
          return t('keySkillTimerSettings.dataFormatError')
        }
        catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          return `${t('keySkillTimerSettings.dataFormatError')}: ${message}`
        }
      },
    },
  )
    .then((res) => {
      const { value } = res as MessageBoxInputData
      if (!value)
        return
      const text = LZString.decompressFromBase64(value)
      const data = JSON.parse(text)
      if (typeof data !== 'object' || data === null) {
        ElMessage.error(t('keySkillTimerSettings.importFormatError'))
        return
      }
      const payload = data as { chinese?: unknown[] }
      storeKeySkill.setSkills(payload.chinese ?? [])
      ElMessage.success(t('keySkillTimerSettings.importSuccess'))
    })
    .catch(() => {})
}

async function loadPickerPool(jobEnum: number) {
  const hasCached = Object.prototype.hasOwnProperty.call(pickerPoolCache, jobEnum)
  if (hasCached) {
    pickerPool.value = [...(pickerPoolCache[jobEnum] ?? [])]
    return
  }

  pickerLoading.value = true
  try {
    const apiRows = await searchActionsByClassJobs([jobEnum], 500)
    const mapped = apiRows.map(row => ({
      id: row.ID,
      name: getActionNameLite(row.ID) || row.Name || `#${row.ID}`,
      iconSrc: (() => {
        return idToSrc(row.ID) || (row.Icon ? getIconSrcByPath(row.Icon) : undefined)
      })(),
      recast1000ms: (() => {
        const meta = getGlobalSkillMetaByActionId(row.ID)
        return resolveTeamWatchDynamicValue(
          meta?.recast1000ms ?? Number(row.Recast1000ms ?? 0),
          100,
          Number(row.Recast1000ms ?? 0),
        )
      })(),
      duration: (() => {
        const meta = getGlobalSkillMetaByActionId(row.ID)
        return resolveTeamWatchDynamicValue(meta?.duration ?? 0, GLOBAL_SKILL_MAX_LEVEL, 0)
      })(),
      minLevel: resolveActionMinLevel(row.ClassJobLevel, {
        actionId: row.ID,
        isRoleAction: row.IsRoleAction,
        fallback: 1,
      }),
      isRoleAction: Number(row.IsRoleAction ?? 0) > 0,
    }))
    pickerPoolCache[jobEnum] = mapped
    pickerPool.value = [...mapped]
  }
  catch (error) {
    console.warn('[keySkillTimerSettings] load action list failed:', error)
    pickerPool.value = []
    ElMessage.warning('技能列表加载失败，可手动搜索')
  }
  finally {
    pickerLoading.value = false
  }
}

watch(pickerSelectedJob, async (jobEnum) => {
  pickerSearch.value = ''
  if (!pickerVisible.value || !jobEnum)
    return
  await loadPickerPool(jobEnum)
})

watch(pickerVisible, (visible) => {
  if (!visible) {
    pickerSearch.value = ''
    pickerLoading.value = false
    pickerSelectedJob.value = null
    pickerReplaceSkillKey.value = null
  }
})

async function openSkillPicker(line = 1, replaceSkillKey: string | null = null) {
  if (interactionLocked.value)
    return
  pickerTargetLine.value = line > 0 ? line : 1
  pickerReplaceSkillKey.value = replaceSkillKey
  pickerVisible.value = true
  pickerSelectedJob.value = resolvePickerInitialJob(replaceSkillKey)
}

function getJobIconSrcByEnum(jobEnum: number) {
  const full = Util.jobToFullName(Util.jobEnumToJob(jobEnum))
  return `https://souma.diemoe.net/resources/img/cj2/${full.en}.png`
}

function resolvePickerInitialJob(replaceSkillKey: string | null) {
  if (!replaceSkillKey)
    return null
  const row = rows.value.find(v => v.key === replaceSkillKey)
  if (!row)
    return null

  const jobSet = new Set(pickerJobOptions.value.map(v => v.jobEnum))
  const globalJobs = getGlobalSkillMetaByActionId(row.id)?.job ?? []
  const fallbackJobs = resolveSkillMeta(row.id).jobs
  const mergedJobs = [
    ...(Array.isArray(row.job) ? row.job : []),
    ...globalJobs,
    ...fallbackJobs,
  ]

  for (const candidate of mergedJobs) {
    const jobEnum = Number(candidate)
    if (!Number.isFinite(jobEnum))
      continue
    const normalized = Math.trunc(jobEnum)
    if (normalized > 0 && jobSet.has(normalized))
      return normalized
  }
  return null
}

function pickJob(jobEnum: number) {
  if (pickerInteractionLocked.value)
    return
  pickerSelectedJob.value = pickerSelectedJob.value === jobEnum ? null : jobEnum
}

async function pickAction(actionId: number, name?: string) {
  if (pickerInteractionLocked.value)
    return
  const replaceKey = pickerReplaceSkillKey.value
  let targetSkillKey: string | null = null
  if (replaceKey) {
    const row = rows.value.find(v => v.key === replaceKey)
    if (row) {
      replaceSkillById(row, actionId)
      targetSkillKey = replaceKey
    }
  }
  else {
    targetSkillKey = addSkillById(actionId, pickerTargetLine.value, name || getActionNameLite(actionId))
  }
  await storeKeySkill.ensureActionAutoMeta(actionId)
  pickerVisible.value = false
  if (targetSkillKey)
    await openEditor(targetSkillKey)
}

async function returnToEditorFromPicker() {
  const replaceKey = pickerReplaceSkillKey.value
  if (!replaceKey)
    return
  await openEditor(replaceKey)
}

function handlePickerBack() {
  if (pickerReplaceSkillKey.value)
    void returnToEditorFromPicker()
}

async function openEditor(skillKey: string) {
  if (interactionLocked.value)
    return
  const row = rows.value.find(v => v.key === skillKey)
  if (!row)
    return
  editorOpening.value = true
  try {
    await storeKeySkill.ensureActionAutoMeta(row.id)
    editorSkillKey.value = skillKey
    editorTts.value = row.tts
    jobEditorVisible.value = false
    editorVisible.value = true
  }
  finally {
    editorOpening.value = false
  }
}

function applyEditorDraftToRow() {
  const row = currentEditorSkill.value
  if (!row)
    return
  if (editorOpening.value)
    return
  row.tts = editorTts.value
}

async function previewEditorTts() {
  if (interactionLocked.value)
    return
  const text = editorTts.value.trim()
  if (!text) {
    ElMessage.warning('请先输入 TTS 内容')
    return
  }
  try {
    await tts(text)
  }
  catch (error) {
    console.warn('[keySkillTimerSettings] tts preview failed:', error)
    ElMessage.error('TTS 试听失败')
  }
}

watch(editorTts, applyEditorDraftToRow)

function removeCurrentSkill() {
  if (!editorSkillKey.value)
    return
  deleteSkill(editorSkillKey.value)
  editorVisible.value = false
}

function replaceCurrentSkill() {
  if (!editorSkillKey.value)
    return
  const row = rows.value.find(v => v.key === editorSkillKey.value)
  editorVisible.value = false
  void openSkillPicker(row?.line ?? 1, editorSkillKey.value)
}

function resetCurrentSkillToDefaults() {
  const row = currentEditorSkill.value
  if (!row)
    return
  editorTts.value = getDefaultTtsByActionId(row.id)

  ElMessage.success('已恢复默认参数')
}

const skillEditorPrimaryAction = computed(() => ({
  show: !!currentEditorSkill.value,
  disabled: interactionLocked.value,
}))

const skillEditorDeleteAction = computed(() => ({
  show: !!currentEditorSkill.value,
  disabled: interactionLocked.value || !currentEditorSkill.value,
}))

const skillEditorResetAction = computed(() => ({
  show: !!currentEditorSkill.value,
  disabled: interactionLocked.value,
  confirmTitle: '将按当前技能ID恢复默认参数，是否继续？',
  confirmButtonText: '恢复',
}))

function hasJobWarning(actionId: number, row: KeySkillRow) {
  if (Array.isArray(row.job))
    return row.job.length === 0
  const loaded = Boolean(storeKeySkill.autoMetaById[actionId])
  return loaded && resolveSkillMeta(actionId).jobs.length === 0
}

function getDefaultTtsByActionId(actionId: number) {
  const normalized = Number.isFinite(actionId) ? Math.trunc(actionId) : 0
  if (normalized <= 0)
    return ''
  return defaultTtsByActionId.get(normalized) ?? ''
}
</script>

<template>
  <div v-loading="interactionLocked" class="page-container" element-loading-text="正在等待接口返回...">
    <header class="toolbar">
      <div class="toolbar-left">
        <el-switch
          v-model="storeKeySkill.enableTts.chinese"
          active-text="TTS 开"
          inactive-text="TTS 关"
          size="small"
          :disabled="interactionLocked"
        />
      </div>
      <div class="toolbar-right">
        <el-button size="small" :icon="Download" :disabled="interactionLocked" @click="exportData">
          {{ $t('keySkillTimerSettings.export') }}
        </el-button>
        <el-button size="small" :icon="Upload" :disabled="interactionLocked" @click="importData">
          {{ $t('keySkillTimerSettings.import') }}
        </el-button>
        <el-button size="small" type="danger" :icon="RefreshLeft" :disabled="interactionLocked" @click="resetToDefault">
          {{ $t('keySkillTimerSettings.restoreDefault') }}
        </el-button>
        <CommonThemeToggle storage-key="key-skill-timer-2" />
        <div class="lang-switch-wrap">
          <CommonLanguageSwitcher />
        </div>
      </div>
    </header>

    <main class="page-content">
      <div class="wysiwyg-wrap">
        <section
          v-for="line in lineOrder"
          :key="`line-${line}`"
          class="line-row"
        >
          <div class="line-label">
            L{{ line }}
          </div>
          <VueDraggable
            :model-value="getLineBucket(line)"
            class="line-skill-list"
            group="key-skill-settings"
            :animation="120"
            :force-fallback="true"
            :fallback-tolerance="16"
            :disabled="interactionLocked"
            @update:model-value="updateLineBucket(line, $event)"
            @change="syncStoreFromBuckets"
          >
            <button
              v-for="row in getLineBucket(line)"
              :key="row.key"
              type="button"
              class="buff-container"
              :class="{ 'has-job-warning': hasJobWarning(row.id, row) }"
              :disabled="interactionLocked"
              @click="openEditor(row.key)"
            >
              <div class="buff-filter">
                <img :src="resolveSkillMeta(row.id).src" :alt="resolveSkillMeta(row.id).name" @error="handleImgError">
              </div>
            </button>
          </VueDraggable>
          <el-button class="line-add-btn" :icon="Plus" :disabled="interactionLocked" circle @click="openSkillPicker(line)" />
        </section>

        <section class="line-row line-row-empty">
          <div class="line-label">
            L{{ nextLine }}
          </div>
          <div class="line-skill-list empty-placeholder">
            点击右侧加号为新行添加技能
          </div>
          <el-button class="line-add-btn" :icon="Plus" :disabled="interactionLocked" circle @click="openSkillPicker(nextLine)" />
        </section>
      </div>
    </main>

    <SkillEditorDialog
      v-model="editorVisible"
      title="技能编辑"
      :tip="dynamicValueTipText"
      :name="currentEditorMeta?.name || '未选择技能'"
      :subtitle="currentEditorSkill ? `#${currentEditorSkill.id}` : ''"
      :icon-src="currentEditorMeta?.src || ''"
      :icon-alt="currentEditorMeta?.name || ''"
      :loading="editorOpening"
      loading-text="正在加载技能数据..."
      :primary-action="skillEditorPrimaryAction"
      :delete-action="skillEditorDeleteAction"
      :reset-action="skillEditorResetAction"
      :teleported="false"
      destroy-on-close
      @primary-action="replaceCurrentSkill"
      @delete-action="removeCurrentSkill"
      @reset-action="resetCurrentSkillToDefaults"
      @icon-error="handleImgError"
    >
      <template v-if="currentEditorSkill">
        <div class="editor-field">
          <label>TTS</label>
          <el-input v-model="editorTts" :disabled="interactionLocked" placeholder="可留空，留空则不播报">
            <template #append>
              <el-button
                :disabled="interactionLocked || !editorTts.trim()"
                @click="previewEditorTts"
              >
                试听
              </el-button>
            </template>
          </el-input>
        </div>
      </template>
    </SkillEditorDialog>

    <ActionPickerDialog
      v-model:visible="pickerVisible"
      v-model:search="pickerSearch"
      title="选择技能"
      :width="pickerDialogWidth"
      :loading="pickerLoading"
      :pool="pickerPool"
      :disabled-ids="pickerDisabledIds"
      :current-action-id="pickerCurrentActionId"
      :target-label="pickerTargetLabel"
      :prompt-visible="!pickerSelectedJob"
      prompt-text="请先选择职业"
      @pick="pickAction($event.id, $event.name)"
      @back="handlePickerBack"
    >
      <template #top>
        <div class="picker-job-strip">
          <div class="picker-job-caption">
            筛选职业技能
          </div>
          <div class="picker-job-space">
            <button
              v-for="option in pickerJobOptions"
              :key="option.jobEnum"
              class="picker-job-btn"
              :class="{ 'is-active': pickerSelectedJob === option.jobEnum }"
              :disabled="pickerInteractionLocked"
              type="button"
              @click="pickJob(option.jobEnum)"
            >
              <div class="picker-job-icon-wrap">
                <img :src="option.iconSrc" class="picker-job-icon" @error="handleImgError">
              </div>
              <span class="picker-job-text">{{ option.label }}</span>
            </button>
          </div>
        </div>
      </template>
    </ActionPickerDialog>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  padding: 4px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font-family: 'Bahnschrift', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  overflow: hidden;
  box-sizing: border-box;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 2px;
  align-items: center;
  padding: 3px 5px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-bg-color-overlay);
  flex-shrink: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
  margin-left: auto;
  justify-content: flex-end;
  white-space: nowrap;
}

.toolbar-left :deep(.el-switch__label) {
  white-space: nowrap;
}

.toolbar-right > * {
  flex: 0 0 auto;
}

.lang-switch-wrap {
  min-width: 128px;
}

.lang-switch-wrap :deep(.language-select) {
  width: 92px;
}

.page-content {
  flex: 1;
  width: 100%;
  overflow: auto;
  margin-top: 4px;
  min-height: 0;
}

.wysiwyg-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 640px;
}

.line-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 4px;
}

.line-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.line-skill-list {
  min-height: 50px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-fill-color-blank);
  padding: 4px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
}

.empty-placeholder {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  justify-content: center;
}

.line-add-btn {
  justify-self: center;
}

.buff-container {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  width: 40px;
  flex: 0 0 40px;
}

.buff-container.has-job-warning .buff-filter {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset, 0 0 1px 1px black;
}

.buff-filter {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 1px 1px black;
  filter: drop-shadow(1px 2px 2px #000);
  width: 40px;
  height: 40px;
}

.buff-filter img {
  width: 40px;
  height: 40px;
  user-select: none;
  -webkit-user-drag: none;
}

.picker-job-strip {
  margin-bottom: 8px;
  padding: 4px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-bg-color-overlay);
}

.picker-job-caption {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-bottom: 3px;
  line-height: 1;
}

.picker-job-space {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.picker-job-btn {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  height: 28px;
  flex: 0 0 auto;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color-overlay);
  color: var(--el-text-color-primary);
  transition: border-color 120ms ease, background-color 120ms ease;
  cursor: pointer;
  font: inherit;
}

.picker-job-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.picker-job-btn:hover:not(:disabled) {
  border-color: var(--el-color-primary-light-3);
}

.picker-job-btn.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.picker-job-icon-wrap {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
}

.picker-job-icon {
  width: 18px;
  height: 18px;
  display: block;
}

.picker-job-text {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.readonly-text {
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-fill-color-light);
  font-size: 12px;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) transparent;
}

.readonly-text::-webkit-scrollbar {
  height: 3px;
}

.readonly-text::-webkit-scrollbar-track {
  background: transparent;
}

.readonly-text::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 999px;
}

.readonly-text::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-secondary);
}

.readonly-text-row {
  display: flex;
  align-items: stretch;
  flex-wrap: nowrap;
  gap: 8px;
}

.readonly-text-row .readonly-text {
  flex: 1;
  min-width: 0;
}

.job-edit-btn { flex: 0 0 auto; }

.job-edit-select {
  margin-top: 8px;
}

.picker-toolbar {
  padding: 2px 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
}
</style>
