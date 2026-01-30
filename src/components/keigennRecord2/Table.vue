<script setup lang="ts">
import type { Column, MessageHandler, RowEventHandlers, TableV2Instance } from 'element-plus'
import type { RowVO } from '@/types/keigennRecord2'
import { onClickOutside } from '@vueuse/core'
import { ElMessage, ElOption, ElSelect } from 'element-plus'
import { computed } from 'vue'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'
import { copyToClipboard } from '@/utils/clipboard'
import Util from '@/utils/util'
import { handleImgError } from '@/utils/xivapi'
import { useLang } from '@/composables/useLang'

const { t } = useLang()

const props = defineProps<{
  rows: RowVO[]
  actionKey: keyof RowVO
}>()

const store = useKeigennRecord2Store()
const userOptions = store.userOptions
const contextMenu = useTemplateRef<HTMLElement>('contextMenu')

const actionFilter = ref('') // 技能筛选
const targetFilter = ref('') // 目标筛选
const recapStatus = ref<{
  startTime: number
  endTime: number
  windowBase: number
} | null>(null)

watch(
  () => props.rows,
  (rows) => {
    if (rows.length === 0) {
      actionFilter.value = ''
      targetFilter.value = ''
      recapStatus.value = null
    }
  },
  { immediate: true }
)

const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuRow = ref<RowVO | null>(null)

// 全局浮层控制
const hoveredRow = ref<RowVO | null>(null)
const virtualRef = ref({
  getBoundingClientRect: () => ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 } as DOMRect),
})
const tooltipMode = ref<'amount' | 'skills' | null>(null)
const popoverVisible = ref(false)
const popoverPlacement = ref('top')

function handleHover(row: RowVO, mode: 'amount' | 'skills', e: MouseEvent) {
  tooltipMode.value = mode
  if (mode === 'skills') {
    popoverPlacement.value = 'left'
  } else {
    popoverPlacement.value = 'right'
  }
  hoveredRow.value = row
  const target = e.currentTarget as HTMLElement
  virtualRef.value = {
    getBoundingClientRect: () => target.getBoundingClientRect(),
  }
  popoverVisible.value = true
}

function clearHover() {
  popoverVisible.value = false
}

onClickOutside(contextMenu, () => {
  contextMenuVisible.value = false
})

const ALL_STR = t('keigennRecord.cancelFilter')

const actionOptions = computed(() => {
  const actions = Array.from(
    new Set(props.rows.map((r) => r[props.actionKey] as string))
  ).filter((v) => v !== undefined && v !== null)
  return [
    { label: t('keigennRecord.action'), value: '' },
    ...actions.map((action) => ({ label: action, value: action })),
  ]
})

const targetOptions = computed(() => {
  const players = Array.from(
    new Map(
      props.rows
        .filter((r) => r.targetId)
        .map((row) => [row.targetId, row])
    ).values()
  )
  return [
    { label: t('keigennRecord.target'), value: '', job: -1 },
    ...players.map((row) => ({
      label: `${row.job}(${row.target})`,
      value: row.targetId,
      job: row.jobEnum,
    })),
  ].sort((a, b) => {
    return Util.enumSortMethod(a.job, b.job)
  })
})

function filterByAction() {
  if (contextMenuRow.value) {
    const val = contextMenuRow.value[props.actionKey] as string
    if (actionFilter.value === val) {
      actionFilter.value = '' // 取消筛选
    } else {
      actionFilter.value = val // 设置筛选
    }
    contextMenuVisible.value = false
  }
}

function filterByTarget() {
  if (contextMenuRow.value) {
    const val = contextMenuRow.value.targetId
    if (targetFilter.value === val) {
      targetFilter.value = '' // 取消筛选
    } else {
      targetFilter.value = val // 设置筛选
    }
    contextMenuVisible.value = false
  }
}

function showDeathRecap(row?: RowVO | unknown) {
  const targetRow =
    row && typeof row === 'object' && 'key' in row
      ? (row as RowVO)
      : contextMenuRow.value
  if (targetRow && targetRow.type === 'death') {
    targetFilter.value = targetRow.targetId
    const deathTime = targetRow.timestamp
    recapStatus.value = {
      endTime: deathTime,
      windowBase: deathTime - 15000,
      startTime: deathTime - 30000,
    }
    actionFilter.value = ''
    contextMenuVisible.value = false
  }
}

function cancelDeathRecap() {
  const wasRecap = recapStatus.value !== null
  recapStatus.value = null
  targetFilter.value = ''
  if (wasRecap && store.userOptions.order === 'push') {
    nextTick(() => scrollToBottom())
  }
}

const renderHeader = (title: string, customClass = '') => h('div', { class: ['header-static', customClass] }, title)
const renderEmpty = () => h('div')

const FilterHeader = (props: {
  modelValue: string,
  options: { label: string, value: string }[],
  placeholder: string,
  width: string,
  onUpdate: (v: string) => void
}) => {
  return h(
    'div',
    { class: 'header-filter' },
    [
      h(
        ElSelect,
        {
          size: 'small',
          modelValue: props.modelValue,
          placeholder: props.placeholder,
          clearable: false,
          style: `width:${props.width}`,
          teleported: false,
          onChange: props.onUpdate,
        },
        () => props.options.map((a) => h(ElOption, { key: a.value, label: a.label, value: a.value }))
      ),
    ]
  )
}

const tableData = computed(() => {
  if (recapStatus.value) {
    const targetId = targetFilter.value
    const { startTime, endTime, windowBase } = recapStatus.value

    // 获取该玩家死亡前的所有记录
    const targetRows = props.rows.filter(
      (r) => r.targetId === targetId && r.timestamp <= endTime
    )

    // 基础窗口：15秒
    const rows15 = targetRows.filter((r) => r.timestamp >= windowBase)
    const nonDeath15Count = rows15.filter((r) => r.type !== 'death').length

    if (nonDeath15Count >= 5) {
      return rows15
    }

    // 扩展窗口：直到满足5条或达到设定的起点 (startTime)
    const rowsMax = targetRows.filter((r) => r.timestamp >= startTime)
    const nonDeathMax = rowsMax.filter((r) => r.type !== 'death')

    if (nonDeathMax.length >= 5) {
      // 找到第5条非死亡记录的时间戳，以其作为起始点
      const fifthRowTime = nonDeathMax[4]!.timestamp
      return rowsMax.filter((r) => r.timestamp >= fifthRowTime)
    }

    return rowsMax
  }

  const hasFilter =
    (actionFilter.value && actionFilter.value !== ALL_STR) ||
    (targetFilter.value && targetFilter.value !== ALL_STR)

  if (!hasFilter) {
    return props.rows // 没有筛选时直接返回原引用，保持虚拟列表稳定
  }

  return props.rows.filter((row) => {
    const actionMatch =
      !actionFilter.value ||
      actionFilter.value === ALL_STR ||
      row[props.actionKey] === actionFilter.value
    const targetMatch =
      !targetFilter.value ||
      targetFilter.value === ALL_STR ||
      row.targetId === targetFilter.value
    return actionMatch && targetMatch
  })
})

const rowClass = ({ rowData }: { rowData: RowVO }) => {
  return rowData.type === 'death' ? 'row-death' : ''
}

const columns: Column[] = [
  {
    key: 'time',
    title: t('keigennRecord.time'),
    dataKey: 'time',
    width: 40,
    align: 'center' as const,
    class: 'col-time',
    headerCellRenderer: () => renderHeader(t('keigennRecord.time'), 'header-time'),
  },
  {
    key: 'action',
    title: t('keigennRecord.action'),
    dataKey: props.actionKey as string,
    width: 64,
    align: 'center' as const,
    class: 'col-action',
    headerCellRenderer: () => h(FilterHeader, {
      modelValue: actionFilter.value,
      options: actionOptions.value,
      placeholder: t('keigennRecord.action'),
      width: '4.5em',
      onUpdate: (v: string) => (actionFilter.value = v === ALL_STR ? '' : v)
    }),
    cellRenderer: ({ rowData }) => {
      if (rowData.type === 'death') {
        const isTerrain = rowData.source === '地形杀'
        const isRecapMode = recapStatus.value !== null
        return h('div', { class: 'death-message-left' }, [
          h('span', '💀 '),
          h('span', { class: 'death-target-name' }, rowData.target || '玩家'),
          isTerrain
            ? h('span', [
              h('span', ' 因 '),
              h('span', { class: 'death-terrain' }, '地形杀'),
              h('span', ' 倒下了！'),
            ])
            : h('span', [
              h('span', ' 被 '),
              h('span', { class: 'death-source-name' }, rowData.source || '环境'),
              h('span', ' 做掉了！'),
            ]),
          h(
            'span',
            {
              class: 'death-recap-inline',
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                if (isRecapMode && recapStatus.value?.endTime === rowData.timestamp && targetFilter.value === rowData.targetId) {
                  cancelDeathRecap()
                } else {
                  showDeathRecap(rowData)
                }
              },
            },
            isRecapMode && recapStatus.value?.endTime === rowData.timestamp && targetFilter.value === rowData.targetId ? ' [退出回放]' : ' [查看死亡回放]'
          ),
        ])
      }
      return h('span', rowData[props.actionKey] ?? '')
    },
  },
  {
    key: 'target',
    title: t('keigennRecord.target'),
    dataKey: 'target',
    width: 34,
    align: 'center' as const,
    class: 'col-target',
    headerCellRenderer: () => h(FilterHeader, {
      modelValue: targetFilter.value,
      options: targetOptions.value,
      placeholder: t('keigennRecord.target'),
      width: '4.7em',
      onUpdate: (v: string) => (targetFilter.value = v === ALL_STR ? '' : v)
    }),
    cellRenderer: ({ rowData }: { rowData: RowVO }) => {
      if (rowData.type === 'death') return renderEmpty()
      return h('div', { class: 'target' }, [
        rowData.preCalculated.jobIconSrc ? h('img', {
          class: [store.isBrowser ? 'browser' : 'act', 'jobIcon', `cj${store.userOptions.iconType}`],
          src: rowData.preCalculated.jobIconSrc,
          alt: rowData.jobIcon,
          onError: (e: Event) => {
            const img = e.target as HTMLImageElement
            img.style.display = 'none'
          }
        }) : h('span', { class: 'alt-text' }, rowData.job),
        rowData.hasDuplicate ? h('span', { class: 'has-duplicate' }, store.formatterName(rowData.target)) : undefined
      ])
    },
  },
  {
    key: 'amount',
    title: t('keigennRecord.amount'),
    dataKey: 'amount',
    width: 52,
    align: 'right' as const,
    class: 'col-amount',
    headerCellRenderer: () => renderHeader(t('keigennRecord.amount')),
    cellRenderer: ({ rowData }: { rowData: RowVO }) => {
      if (rowData.type === 'death') return renderEmpty()
      return h(
        'span',
        {
          class: 'amount',
          onMouseenter: (e: MouseEvent) => handleHover(rowData, 'amount', e),
          onMouseleave: clearHover,
        },
        [
          h('span', { class: rowData.preCalculated.damageTypeClass }, rowData.preCalculated.amountDisplay),
        ]
      )
    },
  },
  {
    key: 'reduction',
    title: t('keigennRecord.reduction'),
    dataKey: 'reduction',
    width: 35,
    align: 'right' as const,
    class: 'col-reduction',
    headerCellRenderer: () => renderHeader(t('keigennRecord.reduction'), 'header-reduction'),
    cellRenderer: ({ rowData }: { rowData: RowVO }) =>
      rowData.type === 'death'
        ? renderEmpty()
        : h(
          'span',
          {
            class: 'col-reduction-number',
            style: {
              color: rowData.preCalculated.reductionColor,
            },
          },
          `${(rowData.reduction * 100).toFixed(0)}`
        ),
  },
  {
    key: 'keigenns',
    title: t('keigennRecord.keigenns'),
    dataKey: 'keigenns',
    flexGrow: 1,
    width: 100,
    align: 'left' as const,
    class: 'col-keigenns',
    headerCellRenderer: () => renderHeader(t('keigennRecord.keigenns')),
    cellRenderer: ({ rowData }: { rowData: RowVO }) => {
      if (rowData.type === 'death') return renderEmpty()
      return h('div', { class: 'status-container' }, [
        ...rowData.preCalculated.keigenns.map((k) =>
          h('span', { class: 'status-wrapper' }, [
            h('span', {
              class: 'status',
              title: k.title,
              'data-duration': k.duration,
              'data-sourcePov': k.isPov
            }, [
              h('img', {
                class: ['statusIcon', k.usefulClass],
                src: k.src,
                alt: k.effect,
                onError: handleImgError
              })
            ])
          ])
        ),
        h('span', { class: 'flags' },
          rowData.effect === 'damage done' ? '' : t(`keigennRecord.${rowData.effect}`)
        )
      ])
    },
  },
  {
    key: 'skills',
    title: '',
    dataKey: 'skills',
    width: 0,
    align: 'center' as const,
    class: 'col-skills',
    cellRenderer: ({ rowData }: { rowData: RowVO }) =>
      h(
        'div',
        {
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 10,
          },
        },
        rowData.type === 'death'
          ? undefined
          : h(
              'div',
              {
                class: 'view-icon',
                onMouseenter: (e: MouseEvent) => handleHover(rowData, 'skills', e),
                onMouseleave: clearHover,
              },
              [
                h('div', { class: 'dots' }, [h('i'), h('i'), h('i')]),
              ]
            )
      ),
  },
]

let msgHdl: MessageHandler | null = null

const rowEventHandlers: RowEventHandlers = {
  onClick: ({ rowData }: { rowData: RowVO }) => {
    const isRecapMode = recapStatus.value !== null
    if (rowData.type === 'death') {
      if (isRecapMode && recapStatus.value?.endTime === rowData.timestamp && targetFilter.value === rowData.targetId) {
        cancelDeathRecap()
      } else {
        showDeathRecap(rowData)
      }
      return
    }
    const {
      actionCN,
      amount,
      job,
      keigenns,
      time,
      type,
      effect,
      currentHp,
      maxHp,
      shield,
      reduction,
    } = rowData
    const sp =
      effect === 'damage done' ? '' : `,${t(`keigennRecord.${effect}`)}`
    const result = `${time} ${job} ${actionCN} ${amount.toLocaleString()}(${t(`keigennRecord.${type}`)}) ${t(
      'keigennRecord.reduction'
    )}(${(reduction * 100).toFixed(0)}%):${keigenns.length === 0 && sp === ''
      ? t('keigennRecord.none')
      : keigenns
        .map((k) => (userOptions.statusCN ? k.name : k.effect))
        .join(',') + sp
      } ${t('keigennRecord.hp')}}:${currentHp}(${Math.round(
        (currentHp / maxHp) * 100
      )}%)+${t('keigennRecord.shield')}:${Math.round(
        (maxHp * +shield) / 100
      )}(${shield}%)`
    copyToClipboard(result)
      .then(() => {
        msgHdl?.close()
        msgHdl = ElMessage.success({
          message: t('keigennRecord.copySuccess'),
          duration: 800,
        })
      })
      .catch(() => ElMessage.error(t('keigennRecord.copyFailed')))
  },
  onContextmenu: ({ rowData, event }: { rowData: RowVO; event: Event }) => {
    if (rowData.type === 'death') return
    const mouseEvent = event as MouseEvent
    contextMenuRow.value = rowData
    contextMenuX.value = mouseEvent.clientX
    contextMenuY.value = mouseEvent.clientY
    contextMenuVisible.value = true
  },
}
const tableV2Ref = ref<TableV2Instance | null>(null)

function scrollToBottom() {
  if (tableV2Ref.value) {
    tableV2Ref.value.scrollToRow(tableData.value.length - 1)
  }
}

defineExpose({
  scrollToBottom,
})
</script>

<template>
  <div class="table-container">
    <div class="table-wrapper">
      <el-auto-resizer style="height: 100%; width: 100%">
        <template #default="{ height, width }">
          <el-table-v2 ref="tableV2Ref" header-class="keigenn-table-header" class="keigenn-table performance-table"
            :columns="columns" :data="tableData" :width="width" :height="height" :row-height="28" :header-height="24"
            row-key="key" scrollbar-always-on :row-event-handlers="rowEventHandlers" :row-class="rowClass"
            :overscan-row-count="2">
            <template #empty>
              <el-empty :description="store.isBrowser ? $t('keigennRecord.actTip') : undefined
                " />
            </template>
          </el-table-v2>
          <div v-if="contextMenuVisible" ref="contextMenu" class="context-menu"
            :style="{ top: `${contextMenuY}px`, left: `${contextMenuX}px` }">
            <ul>
              <li @click="filterByAction">
                {{
                  actionFilter === (contextMenuRow?.[actionKey] ?? '')
                    ? t('keigennRecord.filter.action_cancel', {
                      actionName:
                        contextMenuRow?.[actionKey] ??
                        t('keigennRecord.this_skill'),
                    })
                    : t('keigennRecord.filter.action_only', {
                      actionName:
                        contextMenuRow?.[actionKey] ??
                        t('keigennRecord.this_skill'),
                    })
                }}
              </li>

              <li @click="filterByTarget">
                {{
                  targetFilter === contextMenuRow?.targetId
                    ? t('keigennRecord.filter.target_cancel', {
                      jobName:
                        contextMenuRow?.job ?? t('keigennRecord.this_job'),
                    })
                    : t('keigennRecord.filter.target_only', {
                      jobName:
                        contextMenuRow?.job ?? t('keigennRecord.this_job'),
                    })
                }}
              </li>
            </ul>
          </div>

          <el-popover v-model:visible="popoverVisible" :virtual-ref="virtualRef" virtual-triggering trigger="hover"
            :placement="popoverPlacement" width="auto" popper-class="keigenn-global-popover" transition="none"
            :show-after="0" :hide-after="0" :offset="6" :enterable="false">
            <template v-if="hoveredRow && tooltipMode === 'amount'">
              <div class="row-info">
                <div class="info-line">{{ t('keigennRecord.source') }}: {{ hoveredRow.source }}</div>
                <div class="info-line">{{ t('keigennRecord.playerShield') }}: {{ hoveredRow.shield }}%</div>
                <div class="info-line">{{ t('keigennRecord.playerHp') }}: {{ hoveredRow.currentHp.toLocaleString() }}({{ hoveredRow.preCalculated.hpPercent }}%)</div>
                <template v-if="hoveredRow.reduction < 1 && hoveredRow.type !== 'dot'">
                  <div class="info-divider"></div>
                  <div class="info-line">{{ t('keigennRecord.reductionRate') }}: {{ (hoveredRow.reduction * 100).toFixed(2) }}%</div>
                  <div class="info-line">
                    {{ t('keigennRecord.originalDamage') }}:
                    <span :class="hoveredRow.preCalculated.damageTypeClass">{{ hoveredRow.preCalculated.originalDamageDisplay }}</span>
                  </div>
                </template>
              </div>
            </template>

            <template v-else-if="hoveredRow && tooltipMode === 'skills'">
              <div class="skill-popover-content">
                <template v-if="hoveredRow.preCalculated.coolingDownSkills.length > 0">
                  <div class="subtitle">{{ t('keigennRecord.coolingDown') }}</div>
                  <div class="skill-grid">
                    <div v-for="skill in hoveredRow.preCalculated.coolingDownSkills" :key="`${skill.id}-${skill.ownerId}`" class="skill-wrapper">
                      <div class="skill-icon-container" :title="`${skill.ownerName} (${skill.ownerJobName})`">
                        <img :src="skill.icon" class="skill-icon" />
                        <div class="skill-overlay" />
                        <span class="skill-text">{{ skill.recastLeft }}</span>
                      </div>
                    </div>
                  </div>
                </template>

                <template v-if="hoveredRow.preCalculated.readySkills.length > 0">
                  <el-divider v-if="hoveredRow.preCalculated.coolingDownSkills.length > 0" />
                  <div class="subtitle">{{ t('keigennRecord.ready') || '可用' }}</div>
                  <div class="skill-grid">
                    <div v-for="skill in hoveredRow.preCalculated.readySkills" :key="`${skill.id}-${skill.ownerId}`" class="skill-wrapper">
                      <div class="skill-icon-container" :title="`${skill.ownerName} (${skill.ownerJobName})`">
                        <img :src="skill.icon" class="skill-icon" />
                      </div>
                    </div>
                  </div>
                </template>

                <div v-if="hoveredRow.preCalculated.coolingDownSkills.length === 0 && hoveredRow.preCalculated.readySkills.length === 0" class="no-data">
                  {{ t('keigennRecord.noData') }}
                </div>
              </div>
            </template>
          </el-popover>
        </template>
      </el-auto-resizer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.table-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.table-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.keigenn-table {
  font-size: 12px;
}

.recap-banner {
  flex: none;
  width: 100%;
  height: 32px;
  background-color: rgba(168, 26, 26, 0.9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.exit-btn {
  margin-left: 15px;
  cursor: pointer;
  text-decoration: underline;
  color: #ffd700;
}

.context-menu {
  position: fixed;
  background-color: rgba(20, 20, 20, 1);
  border: 1px solid var(--el-border-color);
  box-shadow: 0 2px 12px 0 var(--el-box-shadow-dark);
  border-radius: var(--el-border-radius-base);
  min-width: 140px;
  padding: 0px 0;
  font-size: var(--el-font-size-base);
  color: var(--el-text-color-primary);
  z-index: 3000;
  user-select: none;
}

.context-menu ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.context-menu ul li {
  padding: 4px 20px;
  line-height: 1.5;
  cursor: pointer;
  white-space: nowrap;
  color: var(--el-text-color-primary);
}

.context-menu ul li:hover {
  background-color: var(--el-menu-hover-bg-color);
  color: var(--el-color-primary);
}

.context-menu ul li:active {
  background-color: var(--el-color-primary-dark-2);
}

:deep(.col-reduction-number) {
  &::after {
    content: '%';
    font-size: 0.66em;
  }
}

:deep(.header-reduction) {
  white-space: nowrap;
  margin-right: -0.6em;
}

:deep(.header-time) {
  white-space: nowrap;
}



:deep(.row-death) {
  background-color: rgba(60, 0, 0, 0.4) !important;

  .el-table-v2__row-cell {
    background-color: transparent !important;
  }
}

:deep(.col-action) {
  overflow: visible !important;

  .el-table-v2__row-cell {
    overflow: visible !important;
  }
}

:deep(.death-message-left) {
  color: #c4c4c4;
  white-space: nowrap;
  padding-left: 0;
  font-size: 11px;

  .death-target-name {
    color: #88c6ff;
    font-weight: bold;
  }

  .death-source-name {
    color: #ffa39e;
    font-weight: bold;
  }

  .death-terrain {
    color: #ffe58f;
    font-weight: bold;
  }

  .death-recap-inline {
    font-weight: bold;
    margin-left: 8px;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
    opacity: 0.8;
    color: inherit;

    &:hover {
      opacity: 1;
    }
  }
}

/* 内联 Target 组件样式 */
:deep(.target) {
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;

  .has-duplicate {
    zoom: 0.8;
    position: absolute;
    width: auto;
    text-align: center;
    font-weight: normal;
    right: 5px;
    bottom: 0;
    text-shadow: -0.8px 0 0 black, 0 0.8px 0 black, 0.8px 0 0 black, 0 -0.8px 0 black;
    white-space: nowrap;
  }

  .jobIcon {
    width: 24px;
    object-fit: cover;
    vertical-align: middle;
    position: relative;

    &.cj1 {
      top: 1px;
      left: -2px;
    }

    &.cj2 {
      right: 4px;
    }

    &.cj3 {
      width: 32px;
      top: 1px;
    }

    &.cj4 {
      right: 2px;
    }
  }
}

/* 内联 StatusShow 组件样式 */
:deep(.status-container) {
  display: flex;
  flex-wrap: nowrap;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;

  .status {
    position: relative;
    top: -2px;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: flex-end;

    &::before {
      content: attr(data-duration);
      z-index: 1;
      position: absolute;
      bottom: -8px;
      font-family: emoji;
      transform: scale(0.6);
    }

    &[data-sourcePov='true']::before {
      color: aquamarine;
    }
  }

  .statusIcon {
    width: 18px;
    object-fit: cover;
    vertical-align: middle;

    &.unuseful {
      opacity: 0.3;
    }

    &.half-useful {
      opacity: 0.6;
    }

    &.useful {
      opacity: 1;
    }
  }
}


:deep() {
  // 核心伤害颜色映射
  .physics { color: rgb(255, 100, 100); }
  .magic { color: rgb(100, 200, 255); }
  .darkness { color: rgb(255, 100, 255); }


}


</style>

<style lang="scss">
body .el-popover.keigenn-global-popover {
  padding: 8px 10px;
  background: rgb(29, 30, 31);
  border: 1px solid #444;
  color: rgb(207, 211, 220);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  font-size: 12px;
  line-height: 1.2;
  pointer-events: none;

  .row-info {
    padding: 0;
    margin: 0;
    line-height: 1.2;
    font-size: 12px;
    color: rgb(207, 211, 220);
    text-align: left;

    .info-line {
      margin-bottom: 2px;
      white-space: nowrap;
      font-size: 12px;
    }

    .info-divider {
      height: 1px;
      background: #555;
      margin: 4px 0;
      width: 100%;
    }
  }

  .skill-popover-content {
    .el-divider {
      margin: 4px 0;
    }

    .subtitle {
      font-weight: bold;
      margin-bottom: 2px;
      font-size: 10px;
      line-height: 1;
      color: #bbb;
    }

    .skill-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      max-width: 178px;

      .skill-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 22px;

        .skill-icon-container {
          position: relative;
          width: 22px;
          height: 22px;
          border-radius: 3px;
          overflow: hidden;
          background: #222;

          .skill-icon {
            width: 100%;
            height: 100%;
          }

          .skill-overlay {
            position: absolute;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.35);
            z-index: 1;
          }

          .skill-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            color: #fff;
            font-weight: bold;
            font-size: 12px;
            z-index: 2;
            text-shadow: -1px 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, 0 -1px 2px #000;
          }
        }
      }
    }

    .no-data {
      text-align: center;
      color: #666;
      font-size: 12px;
      padding: 5px 0;
    }
  }
}

.col-skills {
  overflow: visible;

  .el-table-v2__row-cell {
    overflow: visible;
  }
}

.view-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;

  .dots {
    display: flex;
    gap: 2px;

    i {
      width: 2.5px;
      height: 2.5px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.8);
      display: inline-block;
    }
  }
}
</style>
