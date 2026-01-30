<script setup lang="ts">
import type { Column, MessageHandler, RowEventHandlers } from 'element-plus'
import type { RowVO } from '@/types/keigennRecord2'
import { onClickOutside } from '@vueuse/core'
import { ElMessage, ElOption, ElSelect } from 'element-plus'
import { computed } from 'vue'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'
import { copyToClipboard } from '@/utils/clipboard'
import Util from '@/utils/util'
import Amount from './Amount.vue'
import KeySkillsCell from './KeySkillsCell.vue'
import StatusShow from './StatusShow.vue'
import Target from './Target.vue'
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

onClickOutside(contextMenu, () => {
  contextMenuVisible.value = false
})

const ALL_STR = t('keigennRecord.cancelFilter')

const actionOptions = computed(() => {
  const actions = Array.from(
    new Set(props.rows.map((r) => r[props.actionKey] as string))
  )
  return [
    { label: ALL_STR, value: '' },
    ...actions.map((action) => ({ label: action, value: action })),
  ]
})

const targetOptions = computed(() => {
  const players = Array.from(
    new Map(props.rows.map((row) => [row.target, row])).values()
  )
  return [
    { label: ALL_STR, value: '', job: -1 },
    ...players.map((row) => ({
      label: `${row.job}(${row.target})`,
      value: row.target,
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
    const val = contextMenuRow.value.target
    if (targetFilter.value === val) {
      targetFilter.value = '' // 取消筛选
    } else {
      targetFilter.value = val // 设置筛选
    }
    contextMenuVisible.value = false
  }
}

const tableData = computed(() =>
  props.rows.filter((row) => {
    const actionMatch =
      !actionFilter.value ||
      actionFilter.value === ALL_STR ||
      row[props.actionKey] === actionFilter.value
    const targetMatch =
      !targetFilter.value ||
      targetFilter.value === ALL_STR ||
      row.target === targetFilter.value
    return actionMatch && targetMatch
  })
)

const colorCache = new Map<number, string>()
function getReductionColor(reduction: number) {
  const roundedReduction = Math.round(reduction * 100) / 100
  if (colorCache.has(roundedReduction)) return colorCache.get(roundedReduction)!

  const CURVE_CAP_PERCENTAGE = 0.5 // 封顶百分比 （也就是减伤达到50%时，颜色变为最亮）
  const CURVE_POWER = 0.8 // 曲率，值越小，颜色变化越大
  const GRAY_START = 88 // 起始的灰度值
  const START_COLOR = [GRAY_START, GRAY_START, GRAY_START]
  const TARGET_COLOR = [50, 250, 200] // 最高点RGB值
  const cappedReduction = Math.min(1, roundedReduction / CURVE_CAP_PERCENTAGE)
  const colorIndex = Math.min(9, Math.floor(cappedReduction * 10))
  const linearProgress = colorIndex / 9
  const curvedProgress = Math.pow(linearProgress, CURVE_POWER)
  const r =
    START_COLOR[0]! + (TARGET_COLOR[0]! - START_COLOR[0]!) * curvedProgress
  const g =
    START_COLOR[1]! + (TARGET_COLOR[1]! - START_COLOR[1]!) * curvedProgress
  const b =
    START_COLOR[2]! + (TARGET_COLOR[2]! - START_COLOR[2]!) * curvedProgress

  const color = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 1)`
  colorCache.set(roundedReduction, color)
  return color
}

const columns = shallowRef<Column[]>([
  {
    key: 'time',
    title: t('keigennRecord.time'),
    dataKey: 'time',
    width: 40,
    align: 'center' as const,
    class: 'col-time',
    headerCellRenderer: () =>
      h('div', { class: 'header-time' }, t('keigennRecord.time')),
  },
  {
    key: 'action',
    title: t('keigennRecord.action'),
    dataKey: props.actionKey as string,
    width: 64,
    align: 'center' as const,
    class: 'col-action',
    headerCellRenderer: () =>
      h('div', { class: 'header-filter' }, [
        h(
          ElSelect,
          {
            size: 'small',
            modelValue: actionFilter.value,
            placeholder: t('keigennRecord.action'),
            clearable: false,
            style: `width:4.5em`,
            teleported: false,
            onChange: (v: string) =>
              (actionFilter.value = v === ALL_STR ? '' : v),
          },
          () =>
            actionOptions.value.map((a) =>
              h(ElOption, { key: a.value, label: a.label, value: a.value })
            )
        ),
      ]),
    cellRenderer: ({ rowData }) => h('span', rowData[props.actionKey] ?? ''),
  },
  {
    key: 'target',
    title: t('keigennRecord.target'),
    dataKey: 'target',
    width: 34,
    align: 'center' as const,
    class: 'col-target',
    headerCellRenderer: () =>
      h('div', { class: 'header-filter' }, [
        h(
          ElSelect,
          {
            size: 'small',
            modelValue: targetFilter.value,
            placeholder: t('keigennRecord.target'),
            clearable: false,
            style: `width:4.7em;text-overflow:clip;white-space:nowrap`,
            class: 'col-target-select',
            teleported: false,
            onChange: (v: string) => {
              targetFilter.value = v === ALL_STR ? '' : v
            },
          },
          () =>
            targetOptions.value.map((t) =>
              h(ElOption, {
                key: t.value,
                label: t.label,
                value: t.value,
              })
            )
        ),
      ]),
    cellRenderer: ({ rowData }: { rowData: RowVO }) =>
      h(Target, { row: rowData }),
  },
  {
    key: 'amount',
    title: t('keigennRecord.amount'),
    dataKey: 'amount',
    width: 52,
    align: 'right' as const,
    class: 'col-amount',
    cellRenderer: ({ rowData }: { rowData: RowVO }) =>
      h(Amount, { row: rowData }),
  },
  {
    key: 'reduction',
    title: t('keigennRecord.reduction'),
    dataKey: 'reduction',
    width: 35,
    align: 'right' as const,
    class: 'col-reduction',
    headerCellRenderer: () =>
      h('div', { class: 'header-reduction' }, t('keigennRecord.reduction')),
    cellRenderer: ({ rowData }: { rowData: RowVO }) =>
      h(
        'span',
        {
          class: 'col-reduction-number',
          style: {
            color: getReductionColor(rowData.reduction),
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
    cellRenderer: ({ rowData }: { rowData: RowVO }) =>
      h(StatusShow, { row: rowData }),
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
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'visible',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          },
        },
        h(
          'div',
          {
            style: {
              position: 'absolute',
              right: '0px',
              zIndex: 5,
            },
          },
          h(KeySkillsCell, { row: rowData })
        )
      ),
  },
])

let msgHdl: MessageHandler | null = null

const rowEventHandlers = computed<RowEventHandlers>(() => ({
  onClick: ({ rowData }: { rowData: RowVO }) => {
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
    )}(${(reduction * 100).toFixed(0)}%):${
      keigenns.length === 0 && sp === ''
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
    const mouseEvent = event as MouseEvent
    contextMenuRow.value = rowData
    contextMenuX.value = mouseEvent.clientX
    contextMenuY.value = mouseEvent.clientY
    contextMenuVisible.value = true
  },
}))
</script>

<template>
  <el-auto-resizer style="height: 100%; width: 100%">
    <template #default="{ height, width }">
      <el-table-v2
        header-class="keigenn-table-header"
        class="keigenn-table"
        :columns="columns"
        :data="tableData"
        :width="width"
        :height="height"
        :row-height="28"
        :header-height="24"
        row-key="key"
        scrollbar-always-on
        :row-event-handlers="rowEventHandlers"
      >
        <template #empty>
          <el-empty
            :description="
              store.isBrowser ? $t('keigennRecord.actTip') : undefined
            "
          />
        </template>
      </el-table-v2>
      <div
        v-if="contextMenuVisible"
        ref="contextMenu"
        class="context-menu"
        :style="{ top: `${contextMenuY}px`, left: `${contextMenuX}px` }"
      >
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
              targetFilter === contextMenuRow?.target
                ? t('keigennRecord.filter.target_cancel', {
                    jobName: contextMenuRow?.job ?? t('keigennRecord.this_job'),
                  })
                : t('keigennRecord.filter.target_only', {
                    jobName: contextMenuRow?.job ?? t('keigennRecord.this_job'),
                  })
            }}
          </li>
        </ul>
      </div>
    </template>
  </el-auto-resizer>
</template>

<style scoped lang="scss">
.keigenn-table {
  font-size: 12px;
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

:deep(.col-skills) {
  overflow: visible !important;
  .el-table-v2__row-cell {
    overflow: visible !important;
  }
}
</style>
