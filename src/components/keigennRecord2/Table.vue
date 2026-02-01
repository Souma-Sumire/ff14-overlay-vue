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

watch(
  () => props.rows,
  (rows) => {
    if (rows.length === 0) {
      actionFilter.value = ''
      targetFilter.value = ''
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
const virtualRef = ref<HTMLElement | { getBoundingClientRect: () => DOMRect }>({
  getBoundingClientRect: () => ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 } as DOMRect),
})
const tooltipMode = ref<'amount' | 'skills' | 'death-recap' | null>(null)
const popoverVisible = ref(false)
const popoverPlacement = ref('top')

type RecapRow = {
  key: string
  timeStr: string
  amountStr: string
  amountClass: string
  actionCN: string
  isDeath: boolean
  iconSrc: string
  keigenns: {
    src: string
    usefulClass: string
    title: string
    duration: string
    isPov: boolean
    effect: string
  }[]
}

const recapRows = shallowRef<RecapRow[]>([])

function updateRecapData(deathRow: RowVO) {
  const targetId = deathRow.targetId
  const deathTime = deathRow.timestamp
  const startTime = deathTime - 20000

  // 遍历寻找 deathTime 前 20秒内的所有记录，不再强依赖数组排序方向
  const result: RowVO[] = []
  const deathIndex = props.rows.indexOf(deathRow)
  if (deathIndex === -1) return

  // 向前后双向搜索，确保在任何排序模式下都能抓到过去 20s 的记录
  // 1. 向索引小的方向搜
  for (let i = deathIndex; i >= 0; i--) {
    const r = props.rows[i]
    if (!r) continue
    // 只记录发生在死亡前（或同时）且在 20s window 内的
    if (r.timestamp <= deathTime && r.timestamp >= startTime) {
      if (r.targetId === targetId) result.push(r)
    } else if (r.timestamp < startTime && store.userOptions.order === 'push') {
      // 在 push 模式下，索引越小时间越早。如果已经比 startTime 还早了，可以直接 break
      break
    }
  }

  // 2. 向索引大的方向搜
  for (let i = deathIndex + 1; i < props.rows.length; i++) {
    const r = props.rows[i]
    if (!r) continue
    if (r.timestamp <= deathTime && r.timestamp >= startTime) {
      if (r.targetId === targetId) result.push(r)
    } else if (r.timestamp < startTime && store.userOptions.order === 'unshift') {
      // 在 unshift 模式下，索引越大时间越早。如果已经比 startTime 还早了，可以直接 break
      break
    }
  }

  // 对结果进行去重并按时间从新到旧排序（死亡 0.0s 在最上面）
  const finalResult = Array.from(new Set(result)).sort((a, b) => b.timestamp - a.timestamp)

  recapRows.value = finalResult.map((r) => {
    const isHeal = r.effect === 'heal'
    const isDeath = r.type === 'death'
    const isDamage = !isHeal && r.amount > 0 && !isDeath

    let amountPrefix = ''
    let amountClass = ''
    if (isHeal) {
      amountPrefix = '+'
      amountClass = 'is-heal'
    } else if (isDamage) {
      amountPrefix = '-'
      amountClass = 'is-damage'
    }
    const amountStr = (r.amount > 0 || isHeal) ? (amountPrefix + r.preCalculated.amountDisplay) : r.preCalculated.amountDisplay

    return {
      key: r.key,
      timeStr: ((r.timestamp - deathTime) / 1000).toFixed(1).replace('-0.0', '0.0') + 's',
      amountStr,
      amountClass,
      actionCN: r.actionCN,
      isDeath,
      iconSrc: '',
      keigenns: r.preCalculated.keigenns
    }
  })
}

function handleHover(row: RowVO, mode: 'amount' | 'skills' | 'death-recap', e: MouseEvent) {
  if (popoverVisible.value && hoveredRow.value?.key === row.key && tooltipMode.value === mode) return
  
  tooltipMode.value = mode
  if (mode === 'skills') {
    popoverPlacement.value = 'left'
  } else if (mode === 'death-recap') {
    popoverPlacement.value = 'auto'
    updateRecapData(row)
  } else {
    popoverPlacement.value = 'right'
  }
  hoveredRow.value = row
  virtualRef.value = e.currentTarget as HTMLElement
  popoverVisible.value = true
}


const lastMousePos = { x: 0, y: 0 }
const handleMouseMove = (e: MouseEvent) => {
  lastMousePos.x = e.clientX
  lastMousePos.y = e.clientY
}

const updateHoverState = (x: number, y: number) => {
  const el = document.elementFromPoint(x, y)
  const trigger = el?.closest('[data-row-key][data-hover-mode]') as HTMLElement
  if (trigger) {
    const key = trigger.dataset.rowKey
    const mode = trigger.dataset.hoverMode as any
    const row = tableData.value.find(r => r.key === key)
    if (row) {
      handleHover(row, mode, { currentTarget: trigger } as any)
      return
    }
  }
  popoverVisible.value = false
}

let scrollFrame = 0
const handleScroll = (e: WheelEvent) => {
  if (contextMenuVisible.value) {
    contextMenuVisible.value = false
  }
  
  const target = e.target as HTMLElement
  if (target?.closest('.keigenn-global-popover')) return

  // 使用 rAF 延迟探测，确保滚动后的 DOM 已经更新并稳定
  cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(() => {
    updateHoverState(lastMousePos.x, lastMousePos.y)
  })
}

const tableContainer = useTemplateRef<HTMLElement>('tableContainer')

onMounted(() => {
  tableContainer.value?.addEventListener('wheel', handleScroll, { passive: true })
  window.addEventListener('mousemove', handleMouseMove, { passive: true })
})

onBeforeUnmount(() => {
  tableContainer.value?.removeEventListener('wheel', handleScroll)
  window.removeEventListener('mousemove', handleMouseMove)
})

onClickOutside(contextMenu, () => {
  contextMenuVisible.value = false
})

const ALL_STR = t('keigennRecord.cancelFilter')

const actionOptions = computed(() => {
  const filteredRows = props.rows.filter((r) => store.debugShowHeals || (r.effect !== 'heal'))
  const actions = Array.from(
    new Set(filteredRows.map((r) => r[props.actionKey] as string))
  ).filter((v) => v !== undefined && v !== null)
  return [
    { label: ALL_STR, value: '' },
    ...actions.map((action) => ({ label: action, value: action })),
  ]
})

const targetOptions = computed(() => {
  const filteredRows = props.rows.filter((r) => store.debugShowHeals || (r.effect !== 'heal'))
  const players = Array.from(
    new Map(
      filteredRows
        .filter((r) => r.targetId)
        .map((row) => [row.targetId, row])
    ).values()
  )
  return [
    { label: ALL_STR, value: '', job: -1 },
    ...players.map((row) => ({
      label: row.job,
      fullLabel: `${row.job}(${row.target})`,
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



const renderHeader = (title: string, customClass = '') => h('div', { class: ['header-static', customClass] }, title)
const renderEmpty = () => h('div')

const FilterHeader = (props: {
  modelValue: string,
  options: { label: string, value: string, fullLabel?: string }[],
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
          teleported: true,
          popperClass: 'keigenn-header-select-popper',
          onChange: props.onUpdate,
        },
        () => props.options.map((a) => h(ElOption, { key: a.value, label: a.label, value: a.value }, { default: () => a.fullLabel || a.label }))
      ),
    ]
  )
}

const tableData = computed(() => {
  const baseRows = props.rows.filter((r) => store.debugShowHeals || (r.effect !== 'heal'))
  const hasFilter =
    (actionFilter.value && actionFilter.value !== ALL_STR) ||
    (targetFilter.value && targetFilter.value !== ALL_STR)

  if (!hasFilter) {
    return baseRows
  }

  return baseRows.filter((row) => {
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
        return h('div', { class: 'death-message-left' }, [
          h('span', '💀 '),
          h('span', { class: 'death-target-name' }, rowData.target),
          isTerrain
            ? h('span', [
              h('span', ' 因 '),
              h('span', { class: 'death-terrain' }, '地形杀'),
              h('span', ' 倒下了！'),
            ])
            : h('span', [
              h('span', ' 被 '),
              h('span', { class: 'death-source-name' }, rowData.source),
              h('span', ' 做掉了！'),
            ]),
            h(
              'span',
              {
                class: 'death-recap-inline',
                'data-row-key': rowData.key,
                'data-hover-mode': 'death-recap',
                onMouseenter: (e: MouseEvent) => {
                  handleHover(rowData, 'death-recap', e)
                },
              },
              ' [死亡回放]'
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
          'data-row-key': rowData.key,
          'data-hover-mode': 'amount',
          onMouseenter: (e: MouseEvent) => handleHover(rowData, 'amount', e),
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
          (rowData.effect === 'damage done' || rowData.type === 'heal') ? '' : t(`keigennRecord.${rowData.effect}`)
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
                'data-row-key': rowData.key,
                'data-hover-mode': 'skills',
                onMouseenter: (e: MouseEvent) => handleHover(rowData, 'skills', e),
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
    if (rowData.type === 'death') return
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

const isDuplicateSkill = (skills: { id: number }[], currentId: number) => {
  let count = 0
  for (const s of skills) {
    if (s.id === currentId) {
      count++
      if (count > 1) return true
    }
  }
  return false
}

const getSimpleJobName = (jobEnum: number) => {
  return Util.jobToFullName(Util.jobEnumToJob(jobEnum))?.simple1 ?? ''
}

defineExpose({
  scrollToBottom,
})
</script>

<template>
  <div ref="tableContainer" class="table-container">
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

          <el-popover v-model:visible="popoverVisible" :virtual-ref="virtualRef" virtual-triggering
            popper-class="keigenn-global-popover" transition="none"
            :show-after="0" :hide-after="0" :offset="6" :enterable="true" :teleported="true"
            placement="top"
            width="auto"
            :fallback-placements="['top-end', 'top-start', 'bottom', 'bottom-end', 'bottom-start']">
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
                    <template v-for="skill in hoveredRow.preCalculated.coolingDownSkills" :key="`${skill.id}-${skill.ownerId}`">
                      <div class="skill-wrapper">
                        <div class="skill-icon-container" :title="`${skill.ownerName} (${skill.ownerJobName})`">
                          <img :src="skill.icon" class="skill-icon" />
                          <div class="skill-overlay" />
                          <span class="skill-text">{{ skill.recastLeft }}</span>
                          <span v-if="skill.maxCharges && skill.maxCharges > 1" class="skill-charges">{{ skill.chargesReady }}</span>
                          <span v-if="skill.jobResource !== undefined" class="skill-resource" :style="{ fontSize: skill.jobResource.toString().length > 2 ? '9px' : '11px' }">{{ skill.jobResource }}</span>
                          <span v-if="isDuplicateSkill(hoveredRow.preCalculated.coolingDownSkills, skill.id)" class="skill-job-name">{{ getSimpleJobName(skill.ownerJob) }}</span>
                        </div>
                      </div>
                    </template>
                  </div>
                </template>

                <template v-if="hoveredRow.preCalculated.readySkills.length > 0">
                  <el-divider v-if="hoveredRow.preCalculated.coolingDownSkills.length > 0" />
                  <div class="subtitle">{{ t('keigennRecord.ready') || '可用' }}</div>
                  <div class="skill-grid">
                    <template v-for="skill in hoveredRow.preCalculated.readySkills" :key="`${skill.id}-${skill.ownerId}`">
                      <div class="skill-wrapper">
                        <div class="skill-icon-container" :title="`${skill.ownerName} (${skill.ownerJobName})`">
                          <img :src="skill.icon" class="skill-icon" />
                          <span v-if="skill.maxCharges && skill.maxCharges > 1" class="skill-charges">{{ skill.chargesReady }}</span>
                          <span v-if="skill.jobResource !== undefined" class="skill-resource" :style="{ fontSize: skill.jobResource.toString().length > 2 ? '9px' : '11px' }">{{ skill.jobResource }}</span>
                          <span v-if="isDuplicateSkill(hoveredRow.preCalculated.readySkills, skill.id)" class="skill-job-name">{{ getSimpleJobName(skill.ownerJob) }}</span>
                        </div>
                      </div>
                    </template>
                  </div>
                </template>

                <div v-if="hoveredRow.preCalculated.coolingDownSkills.length === 0 && hoveredRow.preCalculated.readySkills.length === 0" class="no-data">
                  {{ t('keigennRecord.noData') }}
                </div>
              </div>
            </template>

            <template v-else-if="hoveredRow && tooltipMode === 'death-recap'">
              <div class="death-recap-popover">
                <div class="recap-header">
                  <span>{{ t('keigennRecord.time') }}</span>
                  <span class="align-right">{{ t('keigennRecord.amount') }}</span>
                  <span>{{ t('keigennRecord.action') }}</span>
                  <span>{{ t('keigennRecord.keigenns') }}</span>
                </div>
                <!-- 列表内容 -->
                <div v-for="row in recapRows" :key="row.key" class="recap-row" :class="{ 'is-death': row.isDeath }">
                  <!-- Time -->
                  <span class="time">{{ row.timeStr }}</span>
                  
                  <!-- Amount -->
                  <span class="amount-cell align-right" :class="row.amountClass">
                    {{ row.amountStr }}
                  </span>

                  <!-- Ability -->
                  <div class="ability-cell">
                    <div class="ability-content">
                      <img v-if="row.iconSrc" :src="row.iconSrc" class="ability-icon" />
                      <span class="ability-name" :title="row.actionCN">{{ row.actionCN }}</span>
                    </div>
                  </div>

                  <!-- Status -->
                  <div class="status-cell">
                    <div class="status-content">
                      <div v-for="(k, idx) in row.keigenns" :key="idx" class="status-wrapper">
                        <div class="status" :title="k.title" :data-duration="k.duration" :class="{ 'is-pov': k.isPov }">
                          <img :src="k.src" class="status-icon" :class="k.usefulClass" />
                        </div>
                      </div>
                    </div>
                  </div>
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
  cursor: default;

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
  }
}

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

  }
}



:deep() {
  // 核心伤害颜色映射
  .physics { color: rgb(255, 100, 100); }
  .magic { color: rgb(100, 200, 255); }
  .darkness { color: rgb(255, 100, 255); }
  .is-heal { color: #4caf50; }
  .unuseful { opacity: 0.3;}
  .half-useful { opacity: 0.6;}
  .useful { opacity: 1;}
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

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 2px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

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

      .skill-divider {
        width: 1px;
        height: 18px;
        background-color: #555;
        margin: 2px 2px;
        align-self: center;
      }

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

          .skill-charges {
            position: absolute;
            bottom: -1px;
            right: 0px;
            transform: scale(0.7);
            transform-origin: right bottom;
            color: #fff;
            font-weight: bold;
            font-size: 11px;
            z-index: 3;
            text-shadow: -1px 0 1.5px #000, 0 1px 1.5px #000, 1px 0 1.5px #000, 0 -1px 1.5px #000;
          }

          .skill-job-name {
            position: absolute;
            bottom: -1px;
            left: 0px;
            transform: scale(0.7);
            transform-origin: left bottom;
            color: #fff;
            font-weight: bold;
            font-size: 11px;
            z-index: 3;
            z-index: 3;
            text-shadow: -1px 0 1.5px #000, 0 1px 1.5px #000, 1px 0 1.5px #000, 0 -1px 1.5px #000;
          }

          .skill-resource {
            position: absolute;
            top: -1px;
            right: 0px;
            transform: scale(0.7);
            transform-origin: right top;
            color: #64b5f6;
            font-weight: bold;
            font-size: 11px;
            z-index: 3;
            text-shadow: -1px 0 1.5px #000, 0 1px 1.5px #000, 1px 0 1.5px #000, 0 -1px 1.5px #000;
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

.col-keigenns,
.col-time,
.col-skills {
  overflow: visible !important;

  .el-table-v2__row-cell {
    overflow: visible !important;
    background-color: transparent !important;
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
      transition: background 0.2s;
    }
  }

  &:hover {
    .dots i {
      background: var(--el-color-primary);
    }
  }
}
</style>


<style lang="scss">
.keigenn-header-select-popper {
  margin-top: 0 !important;
  inset-block-start: 24px !important;
}

.death-recap-popover {
  display: table;
  width: auto; /* Allow table to shrink/grow */
  border-collapse: collapse; /* Essential for borders */
  margin: -4px; /* Counteract default spacing if needed, or adjust popover padding */
  flex-wrap: nowrap;

  .recap-header,
  .recap-row {
    display: table-row;
  }

  /* Header Cells */
  .recap-header > span {
    display: table-cell;
    padding: 4px 6px;
    font-weight: bold;
    text-align: left;
    border-bottom: 2px solid #333;
    white-space: nowrap;
    
    &.align-right { text-align: right; }
    
    /* Target specific headers by order to match content alignment */
    &:nth-child(1) { text-align: right; } /* Time */
    &:nth-child(2) { text-align: right; } /* Amount */
  }

  .recap-row {
    font-size: 12px;
    line-height: normal; /* Let flex/centering handle align */
    background-color: transparent; 

    /* Cells */
    & > * {
      display: table-cell;
      padding: 3px 6px; 
      vertical-align: middle; /* Ensure vertical centering */
      border-bottom: 1px solid #222;
      border-top: 1px solid transparent; 
      white-space: nowrap; 
    }

    /* Left border effect moved to first cell relative positioning or box-shadow */
    &.is-death {
      background: rgba(168, 26, 26, 0.2);
    }
    
    /* Simulate the left border on the first cell */
    &.is-death > *:first-child {
       position: relative;
    }
    &.is-death > *:first-child::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background-color: #ff5252;
    }

    &:hover {
      background-color: #222;
    }

    .align-right { text-align: right; }
    
    .time { 
      color: #888; 
      font-family: monospace; 
      font-size: 11px;
      white-space: nowrap;
      text-align: right; /* Align numbers */
    }
    
    .amount-cell {
      font-weight: bold;
      font-family: monospace;
      font-size: 11px;
      white-space: nowrap;
      text-align: right;
      padding-right: 4px;
      &.is-heal { color: #4caf50; }
      &.is-damage { color: #ff5252; }
    }

    .ability-cell {
      .ability-content {
        display: flex;
        align-items: center;
        
        .ability-icon { 
          width: 14px; 
          height: 14px; 
          object-fit: cover;
          margin-right: 4px;
          flex-shrink: 0;
        }
        .ability-name { 
          white-space: nowrap; 
          color: #64b5f6;
          font-weight: 500;
          font-size: 11px;
        }
      }
    }

    .status-cell {
      padding: 0;

      .status-content {
        display: flex;
        column-gap: 0px; 
        row-gap: 0px; 
        flex-wrap: wrap;
        align-items: center;
      }
      
      .status-wrapper {
        display: flex;
        padding: 0;
      }

      .status {
        height:18px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;

        &::after {
          content: attr(data-duration);
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%) scale(0.7);
          transform-origin: center bottom;
          
          font-family: Arial, sans-serif;
          font-size: 10px;
          font-weight: 700;
          line-height: 1;
          color: #fff;
          white-space: nowrap;
          text-align: center;

          text-shadow: 
            -1px -1px 0 #000,  
             1px -1px 0 #000,
            -1px  1px 0 #000,
             1px  1px 0 #000;
          
          z-index: 10;
          pointer-events: none;
          padding: 0;
        }

        &.is-pov::after {
          color: #69f0ae;
        }
      }

      .status-icon {
        display: block;
        width: 14px; 
        height: 18px;
        object-fit: cover;
      }
    }

  }
}

</style>

