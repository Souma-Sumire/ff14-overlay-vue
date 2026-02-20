<script setup lang="ts">
import type { ActionPickerGridItem } from '@/components/common/ActionPickerDialog.vue'
import { Delete, Download, Plus, Rank, RefreshLeft, Search, Upload } from '@element-plus/icons-vue'
import { useWindowSize } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import ActionPickerDialog from '@/components/common/ActionPickerDialog.vue'
import { getGlobalSkillMetaByActionId, GLOBAL_SKILL_MAX_LEVEL } from '@/resources/globalSkills'
import { DEFAULT_JOB_SORT_ORDER } from '@/resources/jobSortOrder'
import { getActionNameLite } from '@/resources/logic/actionNameLite'
import {
  buildInheritedBaseJobActions,
  TEAM_WATCH_EMPTY_ACTIONS,
  TEAM_WATCH_WATCH_ACTIONS_DEFAULT,
} from '@/resources/teamWatchResource'
import { useTeamWatchStore } from '@/store/teamWatchStore'
import { copyToClipboard } from '@/utils/clipboard'
import { idToSrc, parseDynamicValue } from '@/utils/dynamicValue'
import Util from '@/utils/util'
import { getIconSrcByPath, handleImgError, searchActionsByClassJobs } from '@/utils/xivapi'

interface JobRow {
  job: number
  actions: number[]
}

interface PickerTarget {
  job: number
  index: number
}

type SortGroup = 'tank' | 'healer' | 'dps' | 'other'

const store = useTeamWatchStore()
const { sortRuleUser, watchJobsActionsIDUser } = storeToRefs(store)

const pickerLoading = ref(false)
const pickerTarget = ref<PickerTarget | null>(null)
const { width: viewportWidth } = useWindowSize()

const filterText = ref('')
const showBaseJobs = ref(false)

const rows = computed(() => {
  const allJobs = Array.from(new Set([
    ...DEFAULT_JOB_SORT_ORDER,
    ...Object.keys(watchJobsActionsIDUser.value).map(Number),
  ]))
  return allJobs.map(job => ({
    job,
    actions: watchJobsActionsIDUser.value[job] || [0, 0, 0, 0, 0],
  }))
})

const rowsByJob = computed(() => {
  const map = new Map<number, JobRow>()
  rows.value.forEach((row) => {
    map.set(row.job, row)
  })
  return map
})

const sortIndexMap = computed(() => {
  const map = new Map<number, number>()
  sortRuleUser.value.forEach((job, index) => {
    map.set(job, index)
  })
  return map
})

const sortedRows = computed(() => {
  const sortMap = sortIndexMap.value
  return [...rows.value].sort((a, b) => {
    const aJob = Util.baseJobEnumConverted(a.job)
    const bJob = Util.baseJobEnumConverted(b.job)
    const aIndex = sortMap.get(aJob) ?? -1
    const bIndex = sortMap.get(bJob) ?? -1
    const aSort = aIndex >= 0 ? aIndex : 999
    const bSort = bIndex >= 0 ? bIndex : 999
    if (aSort === bSort)
      return a.job - b.job
    return aSort - bSort
  })
})

const visibleRows = computed(() => {
  const keyword = filterText.value.trim().toLowerCase()
  return sortedRows.value.filter((row) => {
    const job = Util.jobEnumToJob(row.job)
    if (!Util.isCombatJob(job) || job === 'NONE')
      return false

    // Base jobs are always merged into advanced jobs in settings view.
    if (Util.baseJobEnumConverted(row.job) !== row.job)
      return false
    if (!keyword)
      return true

    if (getJobName(row.job).toLowerCase().includes(keyword))
      return true
    if (String(row.job).includes(keyword))
      return true

    return row.actions.some((actionId) => {
      if (String(actionId).includes(keyword))
        return true
      if (actionId <= 0)
        return false
      return (getActionNameLite(actionId) ?? '').toLowerCase().includes(keyword)
    })
  })
})

const isDragSortDisabled = computed(() => !!filterText.value.trim())

const draggableVisibleRows = computed<JobRow[]>({
  get: () => visibleRows.value,
  set: (nextRows) => {
    if (!nextRows.length)
      return
    const nextSortRule = normalizeSortRuleByGroup(
      Array.from(new Set(nextRows.map(row => Util.baseJobEnumConverted(row.job)))),
      sortRuleUser.value,
    )
    if (nextSortRule.length > 0)
      sortRuleUser.value = nextSortRule
  },
})

const pickerDisabledIds = computed(() => {
  const target = pickerTarget.value
  if (!target)
    return new Set<number>()
  const currentRow = rowsByJob.value.get(target.job)
  if (!currentRow)
    return new Set<number>()
  const currentActionId = currentRow.actions[target.index] ?? 0
  return new Set(currentRow.actions.filter(id => id > 0 && id !== currentActionId))
})

const pickerDialogWidth = computed(() => {
  const available = Math.trunc(viewportWidth.value) - 20
  const safeWidth = Math.max(320, available)
  return `${Math.min(980, safeWidth)}px`
})

const baseJobsByAdvanced = computed<Record<number, number>>(() => {
  const map: Record<number, number> = {}
  DEFAULT_JOB_SORT_ORDER.forEach((job) => {
    const advanced = Util.baseJobEnumConverted(job)
    if (advanced !== job)
      map[advanced] = job
  })
  return map
})

function getRelatedJobIds(job: number) {
  const related = new Set<number>([job])
  const advanced = Util.baseJobEnumConverted(job)
  if (advanced !== job)
    related.add(advanced)
  const base = baseJobsByAdvanced.value[job]
  if (base)
    related.add(base)
  return [...related]
}

function isBaseJob(job: number) {
  const n = Math.trunc(Number(job))
  return n > 0 && Util.baseJobEnumConverted(n) !== n
}

function getInheritedBaseActions(advancedJob: number) {
  const baseJob = baseJobsByAdvanced.value[advancedJob]
  if (!baseJob)
    return [0]
  const source = rowsByJob.value.get(advancedJob)?.actions ?? TEAM_WATCH_EMPTY_ACTIONS
  return buildInheritedBaseJobActions(baseJob, source)
}

const pickerPool = ref<ActionPickerGridItem[]>([])
const pickerPoolCache = reactive<Record<number, ActionPickerGridItem[]>>({})
const pickerSearch = ref('')
const pickerVisible = ref(false)

const pickerCurrentActionId = computed(() => {
  const target = pickerTarget.value
  if (!target)
    return null
  const current = rowsByJob.value.get(target.job)?.actions[target.index] ?? 0
  return current > 0 ? Math.trunc(current) : null
})

async function loadPickerPool(job: number) {
  const hasCached = Object.prototype.hasOwnProperty.call(pickerPoolCache, job)
  if (hasCached) {
    pickerPool.value = [...(pickerPoolCache[job] ?? [])]
    return
  }
  pickerLoading.value = true
  try {
    const apiRows = await searchActionsByClassJobs(getRelatedJobIds(job), 500)
    const mapped = apiRows.map(row => ({
      id: row.ID,
      name: getActionNameLite(row.ID) || row.Name || `#${row.ID}`,
      iconSrc: idToSrc(row.ID) || (row.Icon ? getIconSrcByPath(row.Icon) : undefined),
      classJobLevel: row.ClassJobLevel,
      recast1000ms: (() => {
        const meta = getGlobalSkillMetaByActionId(row.ID)
        return parseDynamicValue(
          meta?.recast1000ms ?? Number(row.Recast1000ms ?? 0),
          GLOBAL_SKILL_MAX_LEVEL,
        ) ?? Number(row.Recast1000ms ?? 0)
      })(),
      isRoleAction: Number(row.IsRoleAction ?? 0) > 0,
    }))
    pickerPoolCache[job] = mapped
    pickerPool.value = [...mapped]
  }
  catch (error) {
    console.warn('[teamWatchSettings] load job action list failed:', job, error)
    pickerPool.value = []
    ElMessage.warning('职业技能列表加载失败，可手动搜索')
  }
  finally {
    pickerLoading.value = false
  }
}

watch(pickerVisible, (visible) => {
  if (!visible) {
    pickerTarget.value = null
    pickerSearch.value = ''
    pickerLoading.value = false
  }
})

function getJobName(job: number) {
  const full = Util.jobToFullName(Util.jobEnumToJob(job))
  return full.cn || full.en || `Job-${job}`
}

function assertKnownStoredJobs(snapshot: ReturnType<typeof store.getSnapshot>) {
  const allJobs = new Set<number>([
    ...snapshot.sortRuleUser,
    ...Object.keys(snapshot.watchJobsActionsIDUser).map(v => Number(v)),
  ])

  const invalid = [...allJobs].filter((jobId) => {
    return Number.isFinite(jobId) && jobId > 0 && Util.jobEnumToJob(Math.trunc(jobId)) === 'NONE'
  })

  if (invalid.length > 0) {
    const ids = invalid.sort((a, b) => a - b).join(', ')
    throw new Error(`[UnknownJob] teamWatchSettings existing data contains unknown jobs: ${ids}`)
  }
}

function getJobIconSrc(job: number) {
  const full = Util.jobToFullName(Util.jobEnumToJob(job))
  return `https://souma.diemoe.net/resources/img/cj2/${full.en}.png`
}

function getActionMeta(actionId: number) {
  return store.getActionMetaRaw(actionId > 0 ? actionId : 0, false)
}

function reloadFromStore() {
  store.loadFromStorage()
  assertKnownStoredJobs(store.getSnapshot())
}

const SORT_GROUP_ORDER: SortGroup[] = ['tank', 'healer', 'dps', 'other']

function getSortGroup(jobEnum: number): SortGroup {
  const job = Util.jobEnumToJob(jobEnum)
  if (Util.isTankJob(job))
    return 'tank'
  if (Util.isHealerJob(job))
    return 'healer'
  if (Util.isDpsJob(job))
    return 'dps'
  return 'other'
}

function normalizeSortRuleByGroup(nextOrder: number[], previousOrder: number[]) {
  const nextUnique = Array.from(new Set(nextOrder))
  const previousUnique = Array.from(new Set(previousOrder))
  const all = Array.from(new Set([...nextUnique, ...previousUnique]))

  const grouped: Record<SortGroup, number[]> = {
    tank: [],
    healer: [],
    dps: [],
    other: [],
  }

  SORT_GROUP_ORDER.forEach((group) => {
    const nextInGroup = nextUnique.filter(job => getSortGroup(job) === group)
    const prevInGroup = previousUnique.filter(job => getSortGroup(job) === group && !nextInGroup.includes(job))
    const unknownInGroup = all.filter(job => getSortGroup(job) === group && !nextInGroup.includes(job) && !prevInGroup.includes(job))
    grouped[group] = [...nextInGroup, ...prevInGroup, ...unknownInGroup]
  })

  return SORT_GROUP_ORDER.flatMap(group => grouped[group])
}

function onSortMove(event: { dragged?: HTMLElement, related?: HTMLElement }) {
  const draggedGroup = event.dragged?.dataset?.sortGroup
  const relatedGroup = event.related?.dataset?.sortGroup

  // Disallow dropping to blank area or any target without a known group.
  if (!draggedGroup || !relatedGroup)
    return false

  return draggedGroup === relatedGroup
}

function getSkillDragGroup(job: number) {
  return `team-watch-skill-${job}`
}

async function appendActionAndOpen(job: number) {
  if (isBaseJob(job))
    return
  const row = rowsByJob.value.get(job)
  if (!row)
    return
  const nextActions = [...row.actions, 0]
  store.watchJobsActionsIDUser[job] = nextActions
  const index = nextActions.length - 1
  await openPicker(job, index)
}

async function onSlotCardClick(job: number, index: number) {
  if (isBaseJob(job))
    return
  await openPicker(job, index)
}

function resetJobActions(job: number) {
  if (isBaseJob(job))
    return
  store.watchJobsActionsIDUser[job] = [...(TEAM_WATCH_WATCH_ACTIONS_DEFAULT[job] ?? TEAM_WATCH_EMPTY_ACTIONS)]
}

function clearJobActions(job: number) {
  if (isBaseJob(job))
    return
  store.watchJobsActionsIDUser[job] = [0, 0, 0, 0, 0]
}

async function openPicker(job: number, index: number) {
  pickerTarget.value = { job, index }
  pickerVisible.value = true
  pickerSearch.value = ''
  pickerPool.value = []
  await loadPickerPool(job)
}

async function pickAction(actionId: number) {
  const target = pickerTarget.value
  if (!target)
    return
  const row = rowsByJob.value.get(target.job)
  if (!row || target.index < 0 || target.index >= row.actions.length)
    return

  const nextActions = [...row.actions]
  nextActions[target.index] = Math.trunc(Number(actionId) || 0)
  store.watchJobsActionsIDUser[target.job] = nextActions
  pickerVisible.value = false
}

function removeActionSlot(job: number, index: number) {
  const row = rowsByJob.value.get(job)
  if (!row || index < 0 || index >= row.actions.length)
    return

  const nextActions = [...row.actions]
  const removedActionId = nextActions[index] ?? 0
  nextActions.splice(index, 1)
  if (nextActions.length === 0)
    nextActions.push(0)

  store.watchJobsActionsIDUser[job] = nextActions
  ElMessage.success(removedActionId > 0 ? '已删除技能槽位' : '已删除空白槽位')
}

async function exportSettings() {
  try {
    await copyToClipboard(store.exportSettings())
    ElMessage.success('导出文本已复制')
  }
  catch {
    ElMessage.error('复制失败')
  }
}

async function importSettings() {
  try {
    const promptResult = await ElMessageBox.prompt(
      '粘贴导入字符串（支持旧版 TeamWatch4 导出格式）',
      '导入 TeamWatch 设置',
      {
        inputType: 'textarea',
        confirmButtonText: '导入',
        cancelButtonText: '取消',
      },
    )
    const value = typeof promptResult === 'string'
      ? promptResult
      : (promptResult as { value?: string }).value
    if (!value)
      return
    store.importSettings(value)
    reloadFromStore()
    ElMessage.success('导入成功')
  }
  catch (error) {
    if (error !== 'cancel' && error !== 'close')
      ElMessage.error('导入失败，请检查文本格式')
  }
}

async function resetSettings() {
  store.resetSettings()
  reloadFromStore()
  ElMessage.success('已恢复默认设置')
}

onMounted(() => {
  reloadFromStore()
})
</script>

<template>
  <div class="settings-page">
    <header class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="filterText"
          class="filter-input"
          :prefix-icon="Search"
          clearable
          placeholder="筛选职业名 / 职业ID / 技能名 / 技能ID"
        />
        <el-switch
          v-model="showBaseJobs"
          active-text="显示基础职业"
          inactive-text="隐藏基础职业"
          size="small"
        />
      </div>
      <div class="toolbar-right">
        <el-button size="small" :icon="Download" @click="exportSettings">
          导出
        </el-button>
        <el-button size="small" :icon="Upload" @click="importSettings">
          导入
        </el-button>
        <el-popconfirm
          title="将清除 TeamWatch 当前自定义配置并恢复默认值，是否继续？"
          confirm-button-text="恢复"
          cancel-button-text="取消"
          @confirm="resetSettings"
        >
          <template #reference>
            <el-button size="small" type="danger" :icon="RefreshLeft">
              恢复默认
            </el-button>
          </template>
        </el-popconfirm>
        <CommonThemeToggle storage-key="team-watch-settings" />
        <div class="lang-switch-wrap">
          <CommonLanguageSwitcher />
        </div>
      </div>
    </header>

    <main class="job-list">
      <section v-if="!visibleRows.length" class="empty-panel">
        <p>当前没有匹配结果，尝试修改筛选条件。</p>
      </section>

      <VueDraggable
        v-model="draggableVisibleRows"
        class="job-list-draggable"
        handle=".job-drag-handle"
        :animation="150"
        :force-fallback="true"
        :fallback-tolerance="16"
        ghost-class="job-drag-ghost"
        drag-class="job-drag-active"
        fallback-class="job-drag-fallback"
        :disabled="isDragSortDisabled"
        :on-move="onSortMove"
      >
        <section
          v-for="row in draggableVisibleRows"
          :key="row.job"
          class="job-block"
          :class="{ 'is-base': Util.baseJobEnumConverted(row.job) !== row.job }"
          :data-sort-group="getSortGroup(Util.baseJobEnumConverted(row.job))"
        >
          <header class="job-head">
            <div class="job-title">
              <img
                :src="getJobIconSrc(row.job)"
                :alt="getJobName(row.job)"
                class="job-title-icon"
                @error="handleImgError"
              >
              <strong>{{ getJobName(row.job) }}</strong>
            </div>

            <div class="skills-inline" @click.stop>
              <div class="skills-stack">
                <div class="skills-line">
                  <div class="slot-grid">
                    <VueDraggable
                      :model-value="row.actions"
                      class="slot-grid-draggable"
                      :group="getSkillDragGroup(row.job)"
                      :animation="120"
                      :force-fallback="true"
                      :fallback-tolerance="16"
                      ghost-class="job-drag-ghost"
                      drag-class="job-drag-active"
                      fallback-class="job-drag-fallback"
                      @update:model-value="(val: number[]) => store.watchJobsActionsIDUser[row.job] = val"
                    >
                      <article
                        v-for="(actionId, index) in row.actions"
                        :key="`${row.job}-${index}`"
                        class="slot-cell"
                      >
                        <button
                          type="button"
                          class="slot-card"
                          :class="{ empty: actionId <= 0 }"
                          @click="onSlotCardClick(Number(row.job), Number(index))"
                        >
                          <img
                            v-if="actionId > 0 && getActionMeta(actionId).iconSrc"
                            :src="getActionMeta(actionId).iconSrc"
                            :alt="getActionMeta(actionId).name"
                            class="slot-icon"
                          >
                          <div v-else class="slot-placeholder">
                            无
                          </div>
                          <div class="slot-title">
                            {{ actionId > 0 ? getActionMeta(actionId).name : '未设置' }}
                          </div>
                        </button>
                        <div class="slot-remove-anchor" @click.stop>
                          <el-popconfirm
                            v-if="actionId > 0"
                            title="将删除该技能槽位，是否继续？"
                            confirm-button-text="删除"
                            cancel-button-text="取消"
                            @confirm="removeActionSlot(Number(row.job), Number(index))"
                          >
                            <template #reference>
                              <el-button
                                class="slot-remove-btn"
                                circle
                                plain
                                size="small"
                                :icon="Delete"
                                @click.stop
                              />
                            </template>
                          </el-popconfirm>
                          <el-button
                            v-else
                            class="slot-remove-btn"
                            circle
                            plain
                            size="small"
                            :icon="Delete"
                            @click.stop="removeActionSlot(Number(row.job), Number(index))"
                          />
                        </div>
                      </article>
                    </VueDraggable>

                    <div class="slot-add-wrap">
                      <el-button size="small" type="primary" plain :icon="Plus" @click="appendActionAndOpen(row.job)" />
                    </div>
                  </div>
                </div>

                <div
                  v-if="showBaseJobs && !!rowsByJob.get(baseJobsByAdvanced[row.job] ?? -1)"
                  class="skills-line merged-base-line is-base-readonly"
                >
                  <div class="slot-grid">
                    <div class="slot-grid-draggable">
                      <article
                        v-for="(actionId, index) in getInheritedBaseActions(row.job)"
                        :key="`base-${row.job}-${index}`"
                        class="slot-cell is-base-slot"
                      >
                        <button
                          type="button"
                          class="slot-card slot-card-readonly"
                          :class="{ empty: actionId <= 0 }"
                          title="基础职业技能自动继承自进阶职业，当前不可编辑"
                          disabled
                        >
                          <img
                            v-if="actionId > 0 && getActionMeta(actionId).iconSrc"
                            :src="getActionMeta(actionId).iconSrc"
                            :alt="getActionMeta(actionId).name"
                            class="slot-icon"
                          >
                          <div v-else class="slot-placeholder">
                            无
                          </div>
                          <div class="slot-title">
                            {{ actionId > 0 ? getActionMeta(actionId).name : '未设置' }}
                          </div>
                        </button>
                      </article>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="job-actions"
              :class="{ 'has-base-actions': showBaseJobs && !!rowsByJob.get(baseJobsByAdvanced[row.job] ?? -1) }"
              @click.stop
            >
              <div class="job-actions-line">
                <div class="job-action-cell col-1-2">
                  <button
                    type="button"
                    class="job-drag-handle"
                    :title="isDragSortDisabled ? '筛选时不可拖拽排序' : '拖拽排序'"
                    :disabled="isDragSortDisabled"
                  >
                    <el-icon><Rank /></el-icon>
                    <span>拖拽</span>
                  </button>
                </div>
                <div class="job-action-cell col-3">
                  <el-popconfirm
                    title="将该职业技能槽位恢复为默认，是否继续？"
                    confirm-button-text="恢复"
                    cancel-button-text="取消"
                    @confirm="resetJobActions(row.job)"
                  >
                    <template #reference>
                      <el-button size="small" text class="job-action-text">
                        默认
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
                <div class="job-action-cell col-4">
                  <el-popconfirm
                    title="将清空该职业所有技能槽位，是否继续？"
                    confirm-button-text="清空"
                    cancel-button-text="取消"
                    @confirm="clearJobActions(row.job)"
                  >
                    <template #reference>
                      <el-button size="small" text class="job-action-text">
                        清空
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </div>

              <div v-if="showBaseJobs && !!rowsByJob.get(baseJobsByAdvanced[row.job] ?? -1)" class="job-actions-line is-base-row">
                <div class="job-action-cell">
                  <span class="base-readonly-note">自动继承特职技能</span>
                </div>
              </div>
            </div>
          </header>
        </section>
      </VueDraggable>
    </main>

    <ActionPickerDialog
      v-model:visible="pickerVisible"
      v-model:search="pickerSearch"
      title="选择技能"
      :width="pickerDialogWidth"
      :loading="pickerLoading"
      :pool="pickerPool"
      :disabled-ids="pickerDisabledIds"
      :current-action-id="pickerCurrentActionId"
      :target-label="pickerTarget ? `${getJobName(pickerTarget.job)} · 技能位 ${pickerTarget.index + 1}` : ''"
      @pick="pickAction($event.id)"
    />
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  --bg: var(--el-bg-color-page);
  --panel: var(--el-bg-color-overlay);
  --panel-soft: var(--el-fill-color-light);
  --line: var(--el-border-color);
  --line-soft: var(--el-border-color-lighter);
  --text: var(--el-text-color-primary);
  --muted: var(--el-text-color-secondary);
  height: 100vh;
  min-height: 0;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-sizing: border-box;
  color: var(--text);
  background: var(--bg);
  font-family: 'Bahnschrift', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 3px;
  padding: 3px 5px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel);
  min-height: 34px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 1 1 auto;
  min-width: 0;
}

.filter-input {
  width: min(320px, 48vw);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 3px;
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

.job-list {
  margin-top: 0;
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
  padding: 2px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.job-list::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}

.job-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
}

.job-list::-webkit-scrollbar-thumb {
  background: rgba(180, 188, 204, 0.65);
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.job-list::-webkit-scrollbar-thumb:hover {
  background: rgba(210, 218, 232, 0.8);
}

.skills-inline {
  scrollbar-width: thin;
  scrollbar-color: rgba(180, 188, 204, 0.65) rgba(255, 255, 255, 0.06);
}

.skills-inline::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.skills-inline::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
}

.skills-inline::-webkit-scrollbar-thumb {
  background: rgba(180, 188, 204, 0.6);
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.18);
}

.skills-inline::-webkit-scrollbar-thumb:hover {
  background: rgba(210, 218, 232, 0.78);
}

.job-list-draggable {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.empty-panel {
  padding: 16px 12px;
  text-align: center;
  border: 1px dashed var(--line);
  border-radius: 6px;
  color: var(--muted);
  background: var(--panel-soft);
}

.job-block {
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--panel);
  overflow: hidden;
}

.job-drag-ghost {
  opacity: 0 !important;
}

.job-drag-active,
.job-drag-fallback {
  opacity: 1 !important;
}

.job-block.is-base {
  border-color: var(--el-color-warning-light-5);
  background: var(--el-color-warning-light-9);
}

.job-head {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  align-items: center;
  gap: 2px;
  padding: 2px 3px;
}

.job-title {
  min-width: 88px;
  display: flex;
  align-items: center;
  gap: 3px;
  overflow: hidden;
  white-space: nowrap;

  strong {
    font-size: 12px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.job-title-icon {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  flex: 0 0 auto;
}

.job-actions {
  display: grid;
  grid-template-rows: 46px;
  row-gap: 1px;
  align-content: start;
  justify-items: end;
  min-width: 152px;
}

.job-actions.has-base-actions {
  grid-template-rows: 46px 46px;
}

.job-actions-line {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  height: 46px;
  padding-right: 4px;
}

.job-action-cell {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-1 { grid-column: 1; }
.col-2 { grid-column: 2; }
.col-3 { grid-column: 3; }
.col-4 { grid-column: 4; }
.col-1-2 { grid-column: 1 / span 2; }
.col-3-4 { grid-column: 3 / span 2; }

.job-actions :deep(.el-button) {
  flex: 0 0 auto;
  --el-button-size: 18px;
}

.job-actions :deep(.job-action-text) {
  width: 100%;
  padding-inline: 0;
}

.job-actions-base-label {
  display: inline-block;
  text-align: center;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;
}

.base-readonly-note {
  display: inline-block;
  font-size: 11px;
  line-height: 1.2;
  color: var(--muted);
  white-space: nowrap;
}

.is-base-row {
  justify-content: flex-end;
  padding-right: 8px;
  gap: 8px;
  width: max-content;
  white-space: nowrap;
}

.job-drag-handle {
  width: 100%;
  height: 24px;
  border: 1px dashed var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
  padding-inline: 6px;
  min-width: 40px;
  transform: scale(0.88);
  transform-origin: center;
  cursor: grab;
}

.job-drag-handle:active {
  cursor: grabbing;
}

.job-drag-handle:hover {
  border-color: var(--line-soft);
  color: var(--text);
}

.job-drag-handle:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.skills-inline {
  min-width: 0;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0;
}

.skills-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skills-line {
  display: block;
}

.merged-base-line {
  position: relative;
}

.slot-grid {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  width: max-content;
}

.slot-grid-draggable {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
}

.slot-cell {
  position: relative;
  width: 66px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: var(--panel-soft);
  padding: 0;
  height: 44px;
  min-height: 44px;
  box-sizing: border-box;
  overflow: hidden;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.slot-cell.is-base-slot {
  border-style: dashed;
}

.slot-card {
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 0;
  border-radius: 0;
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
  padding: 3px 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  box-sizing: border-box;
}

.slot-card.slot-card-readonly,
.slot-card:disabled {
  cursor: not-allowed;
  color: var(--muted);
  background: var(--panel-soft);
  opacity: 0.82;
}

.slot-card.slot-card-readonly:hover,
.slot-card:disabled:hover {
  background: var(--panel-soft);
}

.slot-card.slot-card-readonly .slot-icon,
.slot-card:disabled .slot-icon {
  opacity: 0.75;
  filter: saturate(0.68);
}

.slot-cell:hover,
.slot-cell:focus-within {
  border-color: var(--el-color-primary-light-3);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-5);
}

.merged-base-line .slot-cell.is-base-slot:hover,
.merged-base-line .slot-cell.is-base-slot:focus-within {
  border-color: var(--line);
  box-shadow: none;
}

.slot-card:hover {
  background: var(--el-fill-color);
}

.slot-card.empty {
  color: var(--muted);
}

.slot-remove-anchor {
  position: absolute;
  right: 1px;
  top: 1px;
  z-index: 3;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.slot-cell:hover .slot-remove-anchor{
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.slot-remove-btn {
  padding: 0;
  --el-button-size: 14px;
  border-color: var(--line-soft);
  color: var(--muted);
  background: var(--panel);
}

.slot-remove-btn:hover {
  border-color: var(--line);
  color: var(--text);
  background: var(--panel-soft);
}

.slot-title {
  width: 100%;
  font-size: 12px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform: scale(0.8);
  transform-origin: center center;
  z-index: 1;
}

.slot-icon,
.slot-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  display: grid;
  place-items: center;
}

.slot-icon {
  object-fit: cover;
}

.slot-placeholder {
  border: 1px dashed var(--line);
  color: var(--muted);
  font-size: 12px;
  transform: scale(0.8);
  transform-origin: center;
}

.slot-add-wrap {
  width: 66px;
  border: 1px dashed var(--line);
  border-radius: 2px;
  height: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  background: var(--panel-soft);
}

.slot-add-wrap.is-base-slot {
  border-style: dotted;
}

.slot-add-wrap :deep(.el-button) {
  --el-button-size: 18px;
  padding: 0 4px;
}

.picker-toolbar {
  padding: 2px 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--panel-soft);
  border-radius: 4px;
  border: 1px solid var(--line-soft);
}
</style>
