<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'

export interface ActionPickerGridItem {
  id: number
  name: string
  iconSrc?: string
  recast1000ms?: number
  disabled?: boolean
  disabledReason?: string
  attrs?: Record<string, string | number>
}

const props = withDefaults(defineProps<{
  title?: string
  width?: string
  teleported?: boolean
  destroyOnClose?: boolean
  lockScroll?: boolean
  loading: boolean
  jobItems: ActionPickerGridItem[]
  roleItems: ActionPickerGridItem[]
  currentActionId?: number | null
  emptyText?: string
  promptText?: string
  promptVisible?: boolean
  globalDisabled?: boolean
  searchPlaceholder?: string
  searchDisabled?: boolean
  targetLabel?: string
}>(), {
  title: '选择技能',
  width: '860px',
  teleported: false,
  destroyOnClose: true,
  lockScroll: false,
  currentActionId: null,
  emptyText: '当前没有匹配技能',
  promptText: '',
  promptVisible: false,
  globalDisabled: false,
  searchPlaceholder: '输入技能名或ID',
  searchDisabled: false,
  targetLabel: '',
})

const emit = defineEmits<{
  pick: [item: ActionPickerGridItem]
}>()

const visible = defineModel<boolean>('visible', { default: false })
const search = defineModel<string>('search', { default: '' })

function formatRecast1000ms(recastValue: number | undefined) {
  const recast1000ms = Number(recastValue ?? 0)
  if (!Number.isFinite(recast1000ms) || recast1000ms <= 0)
    return 'CD -'
  const seconds = recast1000ms
  const text = Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1).replace(/\.0$/, '')
  return `CD ${text}s`
}

function isDisabled(item: ActionPickerGridItem) {
  return !!item.disabled || !!props.globalDisabled
}

function isCurrent(item: ActionPickerGridItem) {
  return props.currentActionId !== null && props.currentActionId === item.id
}

function resolveItemAttrs(item: ActionPickerGridItem) {
  if (!item.attrs)
    return undefined
  return Object.fromEntries(
    Object.entries(item.attrs).map(([key, value]) => [key, String(value)]),
  )
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="props.title"
    :width="props.width"
    class="action-picker-dialog"
    :teleported="props.teleported"
    :destroy-on-close="props.destroyOnClose"
    :lock-scroll="props.lockScroll"
  >
    <div v-if="props.targetLabel" class="action-picker-target">
      {{ props.targetLabel }}
    </div>

    <slot name="toolbar" />

    <el-input
      v-model="search"
      :prefix-icon="Search"
      :disabled="props.searchDisabled"
      :placeholder="props.searchPlaceholder"
      clearable
    />

    <div v-loading="props.loading" class="picker-grid-wrap">
      <div v-if="props.promptVisible && props.promptText" class="picker-empty">
        {{ props.promptText }}
      </div>

      <section v-if="props.jobItems.length" class="picker-group">
        <div class="picker-group-title">
          职业技能
        </div>
        <div class="picker-grid">
          <button
            v-for="item in props.jobItems"
            :key="`job-${item.id}`"
            type="button"
            class="picker-cell"
            :class="{ disabled: isDisabled(item), current: isCurrent(item) }"
            :disabled="isDisabled(item)"
            v-bind="resolveItemAttrs(item)"
            @click="emit('pick', item)"
          >
            <div class="picker-cell-name">
              {{ item.name }} #{{ item.id }}
            </div>
            <img
              v-if="item.iconSrc"
              :src="item.iconSrc"
              :alt="item.name"
              class="picker-icon"
            >
            <div v-else class="picker-icon picker-icon-empty">
              无
            </div>
            <div class="picker-cell-meta">
              {{ formatRecast1000ms(item.recast1000ms) }}
            </div>
            <div v-if="item.disabledReason" class="picker-cell-flag">
              {{ item.disabledReason }}
            </div>
            <div v-if="isCurrent(item)" class="picker-cell-current" :class="{ 'has-flag': !!item.disabledReason }">
              当前
            </div>
          </button>
        </div>
      </section>

      <section v-if="props.roleItems.length" class="picker-group">
        <div class="picker-group-title">
          职能技能
        </div>
        <div class="picker-grid">
          <button
            v-for="item in props.roleItems"
            :key="`role-${item.id}`"
            type="button"
            class="picker-cell"
            :class="{ disabled: isDisabled(item), current: isCurrent(item) }"
            :disabled="isDisabled(item)"
            v-bind="resolveItemAttrs(item)"
            @click="emit('pick', item)"
          >
            <div class="picker-cell-name">
              {{ item.name }} #{{ item.id }}
            </div>
            <img
              v-if="item.iconSrc"
              :src="item.iconSrc"
              :alt="item.name"
              class="picker-icon"
            >
            <div v-else class="picker-icon picker-icon-empty">
              无
            </div>
            <div class="picker-cell-meta">
              {{ formatRecast1000ms(item.recast1000ms) }}
            </div>
            <div v-if="item.disabledReason" class="picker-cell-flag">
              {{ item.disabledReason }}
            </div>
            <div v-if="isCurrent(item)" class="picker-cell-current" :class="{ 'has-flag': !!item.disabledReason }">
              当前
            </div>
          </button>
        </div>
      </section>

      <div v-if="!props.loading && props.jobItems.length === 0 && props.roleItems.length === 0" class="picker-empty">
        {{ props.emptyText }}
      </div>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.action-picker-target {
  margin-bottom: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.action-picker-dialog :deep(.el-dialog__body) {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

.action-picker-dialog :deep(.el-dialog) {
  max-width: min(980px, calc(100vw - 20px));
  max-height: min(90vh, calc(100vh - 16px));
  margin: 8px auto 0;
  display: flex;
  flex-direction: column;
}

.action-picker-dialog :deep(.picker-grid-wrap) {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.picker-grid-wrap {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 180px;
}

.picker-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.picker-group-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  line-height: 1.2;
  padding: 0 2px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.picker-group-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--el-border-color-lighter);
  opacity: 0.9;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 4px;
}

.picker-cell {
  position: relative;
  border: 1px solid var(--el-border-color);
  border-radius: 2px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  min-height: 68px;
  padding: 2px 2px 1px;
  display: grid;
  grid-template-rows: auto auto auto;
  justify-items: center;
  align-content: center;
  row-gap: 1px;
  cursor: pointer;
}

.picker-cell:hover {
  border-color: var(--el-color-primary);
}

.picker-cell.current {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-5) inset;
}

.picker-cell.disabled {
  cursor: not-allowed;
}

.picker-cell.disabled .picker-cell-name,
.picker-cell.disabled .picker-cell-meta,
.picker-cell.disabled .picker-icon,
.picker-cell.disabled .picker-icon-empty {
  opacity: 0.35;
  filter: saturate(0.15);
}

.picker-cell.disabled:hover {
  border-color: var(--el-border-color);
}

.picker-cell-name {
  width: 100%;
  font-size: 9px;
  line-height: 1.2;
  min-height: 12px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picker-icon {
  width: 28px;
  height: 28px;
  border-radius: 3px;
}

.picker-icon-empty {
  border: 1px dashed var(--el-border-color);
  color: var(--el-text-color-secondary);
  font-size: 9px;
  display: grid;
  place-items: center;
}

.picker-cell-meta {
  font-size: 9px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  line-height: 1.1;
  padding: 0;
  margin: 4px 0 0;
}

.picker-cell-flag {
  position: absolute;
  left: 2px;
  top: 2px;
  padding: 0 2px;
  border-radius: 2px;
  font-size: 8px;
  line-height: 1.3;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.picker-cell-current {
  position: absolute;
  left: 2px;
  top: 2px;
  padding: 0 2px;
  border-radius: 2px;
  font-size: 8px;
  line-height: 1.3;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.picker-cell-current.has-flag {
  top: 14px;
}

.picker-empty {
  min-height: 70px;
  display: grid;
  place-items: center;
  color: var(--el-text-color-secondary);
  font-size: 10px;
}
</style>
