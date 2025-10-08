<script setup lang="ts">
import type { Column, MessageHandler, RowEventHandlers } from 'element-plus'
import type { RowVO } from '@/types/keigennRecord2'
import { onClickOutside } from '@vueuse/core'
import { ElMessage, ElOption, ElSelect } from 'element-plus'
import { computed } from 'vue'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'
import { copyToClipboard } from '@/utils/clipboard'
import { translationDamageType, translationFlags } from '@/utils/flags'
import Util from '@/utils/util'
import Amount from './Amount.vue'
import StatusShow from './StatusShow.vue'
import Target from './Target.vue'

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

const ALL_STR = '[取消筛选]'

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

function getReductionColor(reduction: number) {
  const CURVE_CAP_PERCENTAGE = 0.5 // 封顶百分比 （也就是减伤达到50%时，颜色变为最亮）
  const CURVE_POWER = 0.8 // 曲率，值越小，颜色变化越大
  const GRAY_START = 88 // 起始的灰度值
  const START_COLOR = [GRAY_START, GRAY_START, GRAY_START]
  const TARGET_COLOR = [50, 250, 200] // 最高点RGB值
  const cappedReduction = Math.min(1, reduction / CURVE_CAP_PERCENTAGE)
  const colorIndex = Math.min(9, Math.floor(cappedReduction * 10))
  const linearProgress = colorIndex / 9
  const curvedProgress = Math.pow(linearProgress, CURVE_POWER)
  const r =
    START_COLOR[0]! + (TARGET_COLOR[0]! - START_COLOR[0]!) * curvedProgress
  const g =
    START_COLOR[1]! + (TARGET_COLOR[1]! - START_COLOR[1]!) * curvedProgress
  const b =
    START_COLOR[2]! + (TARGET_COLOR[2]! - START_COLOR[2]!) * curvedProgress

  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 1)`
}

const columns = computed<Column[]>(() => [
  {
    key: 'time',
    title: '时间',
    dataKey: 'time',
    width: 40,
    align: 'center' as const,
    class: 'col-time',
  },
  {
    key: 'action',
    title: '技能',
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
            placeholder: '技能',
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
    title: '职业',
    dataKey: 'target',
    width: 32,
    align: 'center' as const,
    class: 'col-target',
    headerCellRenderer: () =>
      h('div', { class: 'header-filter' }, [
        h(
          ElSelect,
          {
            size: 'small',
            modelValue: targetFilter.value,
            placeholder: '职业',
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
    title: '伤害',
    dataKey: 'amount',
    width: 45,
    align: 'right' as const,
    class: 'col-amount',
    cellRenderer: ({ rowData }: { rowData: RowVO }) =>
      h(Amount, { row: rowData }),
  },
  {
    key: 'reduction',
    title: '减伤',
    dataKey: 'reduction',
    width: 35,
    align: 'right' as const,
    class: 'col-amount',
    headerCellRenderer: () => h('div', { class: 'header-reduction' }, '减伤'),
    cellRenderer: ({ rowData }: { rowData: RowVO }) =>
      h(
        'span',
        {
          class: 'col-reduction',
          style: {
            color: getReductionColor(rowData.reduction),
          },
        },
        `${(rowData.reduction * 100).toFixed(0)}`
      ),
  },
  {
    key: 'keigenns',
    title: '状态',
    dataKey: 'keigenns',
    width: 100,
    align: 'left' as const,
    flexGrow: 1,
    class: 'col-keigenns',
    cellRenderer: ({ rowData }: { rowData: RowVO }) =>
      h(StatusShow, { row: rowData }),
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
    const sp = effect === 'damage done' ? '' : `,${translationFlags(effect)}`
    const result = `${time} ${job} ${actionCN} ${amount.toLocaleString()}(${translationDamageType(
      type
    )}) 减伤(${(reduction * 100).toFixed(0)}%):${
      keigenns.length === 0 && sp === ''
        ? '无'
        : keigenns
            .map((k) => (userOptions.statusCN ? k.name : k.effect))
            .join(',') + sp
    } HP:${currentHp}/${maxHp}(${Math.round(
      (currentHp / maxHp) * 100
    )}%)+盾:${Math.round((maxHp * +shield) / 100)}(${shield}%)`
    copyToClipboard(result)
      .then(() => {
        msgHdl?.close()
        msgHdl = ElMessage.success({ message: '复制成功', duration: 800 })
      })
      .catch(() => ElMessage.error('复制失败'))
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
      />
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
                ? `取消筛选 [${contextMenuRow?.[actionKey] ?? '此技能'}]`
                : `只看 [${contextMenuRow?.[actionKey] ?? '此技能'}]`
            }}
          </li>
          <li @click="filterByTarget">
            {{
              targetFilter === contextMenuRow?.target
                ? `取消筛选 [${contextMenuRow?.job ?? '此职业'}]`
                : `只看 [${contextMenuRow?.job ?? '此职业'}]`
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
  transition: background-color 0.2s ease;
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

:deep(.col-reduction) {
  &::after {
    content: '%';
    font-size: 0.66em;
  }
}

:deep(.header-reduction){
  white-space: nowrap;
  margin-right: -0.6em;
}
</style>
