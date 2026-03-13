<script setup lang="ts">
import { ArrowLeft, Search } from "@element-plus/icons-vue";

import {
  compareSame,
  isCompareSameSourceId,
  isLowerTierActionId,
  normalizeUpgradeActionId,
} from "@/utils/compareSaveAction";

export interface ActionPickerGridItem {
  id: number;
  name: string;
  iconSrc?: string;
  recast1000ms?: number;
  classJobLevel?: number;
  isRoleAction?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  attrs?: Record<string, string | number>;
}

const props = withDefaults(
  defineProps<{
    title?: string;
    width?: string;
    teleported?: boolean;
    destroyOnClose?: boolean;
    lockScroll?: boolean;
    loading: boolean;
    pool: ActionPickerGridItem[];
    disabledIds?: Set<number>;
    currentActionId?: number | null;
    emptyText?: string;
    promptText?: string;
    promptVisible?: boolean;
    globalDisabled?: boolean;
    searchPlaceholder?: string;
    searchDisabled?: boolean;
    targetLabel?: string;
    showBack?: boolean;
    backDisabled?: boolean;
    backText?: string;
  }>(),
  {
    title: "选择技能",
    width: "860px",
    teleported: false,
    destroyOnClose: true,
    lockScroll: false,
    currentActionId: null,
    emptyText: "当前没有匹配技能",
    promptText: "",
    promptVisible: false,
    globalDisabled: false,
    searchPlaceholder: "输入技能名或ID",
    searchDisabled: false,
    targetLabel: "",
    showBack: true,
    backDisabled: false,
    backText: "返回",
  },
);

const emit = defineEmits<{
  pick: [item: ActionPickerGridItem];
  back: [];
}>();

const visible = defineModel<boolean>("visible", { default: false });
const search = defineModel<string>("search", { default: "" });
const hideShortCD = ref(true);

const internalResult = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return props.pool;
  return props.pool.filter(
    (item) => item.name.toLowerCase().includes(keyword) || String(item.id).includes(keyword),
  );
});

const orderedResult = computed(() => {
  interface FamilySortState {
    state: number;
    recast: number;
    representativeId: number;
  }

  const getFamilyId = (actionId: number) => {
    const upgraded = normalizeUpgradeActionId(actionId);
    const same = compareSame(upgraded);
    return normalizeUpgradeActionId(same);
  };

  const getMemberState = (actionId: number) => {
    if (isLowerTierActionId(actionId)) return 0;
    if (isCompareSameSourceId(actionId)) return 1;
    return 2;
  };

  const familyState = new Map<number, FamilySortState>();
  for (const item of internalResult.value) {
    const familyId = getFamilyId(item.id);
    const state = getMemberState(item.id);
    const recastRaw = Number(item.recast1000ms ?? 0);
    const recast = Number.isFinite(recastRaw) ? recastRaw : -1;
    const prev = familyState.get(familyId);
    if (
      !prev ||
      state > prev.state ||
      (state === prev.state &&
        (recast > prev.recast || (recast === prev.recast && item.id < prev.representativeId)))
    ) {
      familyState.set(familyId, { state, recast, representativeId: item.id });
    }
  }

  return internalResult.value.toSorted((a, b) => {
    const aFamilyId = getFamilyId(a.id);
    const bFamilyId = getFamilyId(b.id);
    if (aFamilyId !== bFamilyId) {
      const aFamily = familyState.get(aFamilyId);
      const bFamily = familyState.get(bFamilyId);
      const aRecast = aFamily?.recast ?? -1;
      const bRecast = bFamily?.recast ?? -1;
      if (aRecast !== bRecast) return bRecast - aRecast;
      return (aFamily?.representativeId ?? aFamilyId) - (bFamily?.representativeId ?? bFamilyId);
    }
    const aState = getMemberState(a.id);
    const bState = getMemberState(b.id);
    if (aState !== bState) return aState - bState;
    const aLevel = Number(a.classJobLevel ?? Number.MAX_SAFE_INTEGER);
    const bLevel = Number(b.classJobLevel ?? Number.MAX_SAFE_INTEGER);
    if (aLevel !== bLevel) return aLevel - bLevel;
    return a.id - b.id;
  });
});

const filteredResult = computed(() => {
  if (!hideShortCD.value) return orderedResult.value;
  return orderedResult.value.filter((item) => (item.recast1000ms ?? 0) > 5);
});

const jobItems = computed(() => filteredResult.value.filter((item) => !item.isRoleAction));
const roleItems = computed(() => filteredResult.value.filter((item) => item.isRoleAction));

function getInternalDisableReason(item: ActionPickerGridItem) {
  if (isLowerTierActionId(item.id)) return "下位技能";
  if (isCompareSameSourceId(item.id)) return "共享CD";
  if (props.disabledIds?.has(item.id) || item.disabled) return item.disabledReason || "已存在";
  return "";
}

watch(visible, (val) => {
  if (!val) hideShortCD.value = true;
});

function formatRecast1000ms(recastValue: number | undefined) {
  const recast1000ms = Number(recastValue ?? 0);
  if (!Number.isFinite(recast1000ms) || recast1000ms <= 0) return "CD -";
  const seconds = recast1000ms;
  const text = Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1).replace(/\.0$/, "");
  return `CD ${text}s`;
}

function isDisabled(item: ActionPickerGridItem) {
  return !!getInternalDisableReason(item) || !!props.globalDisabled;
}

function isCurrent(item: ActionPickerGridItem) {
  return props.currentActionId !== null && props.currentActionId === item.id;
}

function getStatusText(item: ActionPickerGridItem) {
  const parts: string[] = [];
  if (isCurrent(item)) parts.push("当前");
  const internalReason = getInternalDisableReason(item);
  if (internalReason) parts.push(internalReason);
  return parts.join(" / ");
}

function resolveItemAttrs(item: ActionPickerGridItem) {
  if (!item.attrs) return undefined;
  return Object.fromEntries(Object.entries(item.attrs).map(([key, value]) => [key, String(value)]));
}

function handleBack() {
  if (props.backDisabled) return;
  visible.value = false;
  emit("back");
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :width="props.width"
    class="action-picker-dialog"
    :teleported="props.teleported"
    :destroy-on-close="props.destroyOnClose"
    :lock-scroll="props.lockScroll"
    :show-close="false"
  >
    <template #header>
      <div class="picker-dialog-header">
        <el-button
          v-if="props.showBack"
          class="picker-dialog-back"
          :icon="ArrowLeft"
          :disabled="props.backDisabled"
          text
          @click="handleBack"
        >
          {{ props.backText }}
        </el-button>
      </div>
    </template>

    <div class="picker-header-row">
      <div v-if="props.targetLabel" class="action-picker-target">
        {{ props.targetLabel }}
      </div>

      <el-input
        v-model="search"
        :prefix-icon="Search"
        :disabled="props.searchDisabled"
        :placeholder="props.searchPlaceholder"
        class="picker-search-input"
        clearable
      />

      <div class="picker-header-controls">
        <el-checkbox v-model="hideShortCD" label="隐藏 CD <= 5 秒" size="small" />
        <slot name="header-controls" />
      </div>
    </div>

    <slot name="top" />

    <div v-loading="props.loading" class="picker-grid-wrap">
      <div v-if="props.promptVisible && props.promptText" class="picker-empty">
        {{ props.promptText }}
      </div>

      <section v-if="jobItems.length" class="picker-group">
        <div class="picker-group-title">职业技能</div>
        <div class="picker-grid">
          <button
            v-for="item in jobItems"
            :key="`job-${item.id}`"
            type="button"
            class="picker-cell"
            :class="{ disabled: isDisabled(item), current: isCurrent(item) }"
            :disabled="isDisabled(item)"
            v-bind="resolveItemAttrs(item)"
            @click="emit('pick', item)"
          >
            <div class="picker-cell-name">
              {{ item.name }}
            </div>
            <div class="picker-cell-id">#{{ item.id }}</div>
            <img v-if="item.iconSrc" :src="item.iconSrc" :alt="item.name" class="picker-icon" />
            <div v-else class="picker-icon picker-icon-empty">无</div>
            <div class="picker-cell-meta">
              {{ formatRecast1000ms(item.recast1000ms) }}
            </div>
            <div v-if="getStatusText(item)" class="picker-cell-hover-tip">
              {{ getStatusText(item) }}
            </div>
          </button>
        </div>
      </section>

      <section v-if="roleItems.length" class="picker-group">
        <div class="picker-group-title">职能技能</div>
        <div class="picker-grid">
          <button
            v-for="item in roleItems"
            :key="`role-${item.id}`"
            type="button"
            class="picker-cell"
            :class="{ disabled: isDisabled(item), current: isCurrent(item) }"
            :disabled="isDisabled(item)"
            v-bind="resolveItemAttrs(item)"
            @click="emit('pick', item)"
          >
            <div class="picker-cell-name">
              {{ item.name }}
            </div>
            <div class="picker-cell-id">#{{ item.id }}</div>
            <img v-if="item.iconSrc" :src="item.iconSrc" :alt="item.name" class="picker-icon" />
            <div v-else class="picker-icon picker-icon-empty">无</div>
            <div class="picker-cell-meta">
              {{ formatRecast1000ms(item.recast1000ms) }}
            </div>
            <div v-if="getStatusText(item)" class="picker-cell-hover-tip">
              {{ getStatusText(item) }}
            </div>
          </button>
        </div>
      </section>

      <div
        v-if="
          !props.promptVisible && !props.loading && jobItems.length === 0 && roleItems.length === 0
        "
        class="picker-empty"
      >
        {{ props.emptyText }}
      </div>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.action-picker-dialog ::deep(.el-dialog__header) {
  padding: 8px 10px 0;
}

.picker-dialog-header {
  display: flex;
  align-items: center;
  gap: 2px;
}

.picker-dialog-back {
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: 6px;
}

.action-picker-target {
  flex: 0 0 auto;
  min-width: 120px;
  max-width: 200px;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border: 1px solid var(--el-color-primary-light-8);
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.picker-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap;
  min-width: 0;
  padding: 2px 0;
}

.picker-search-input {
  flex: 1;
  min-width: 0;
}

.picker-search-input ::deep(.el-input__wrapper) {
  height: 32px;
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
  background: var(--el-fill-color-blank);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.picker-search-input ::deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px var(--el-color-primary) inset,
    0 0 0 3px var(--el-color-primary-light-8);
}

.picker-header-controls {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 10px;
  background: var(--el-fill-color-darker);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.picker-header-controls ::deep(.el-checkbox) {
  height: auto;
  margin-right: 0;
}

.picker-header-controls ::deep(.el-checkbox__label) {
  font-size: 11px;
  color: var(--el-text-color-regular);
}

.action-picker-dialog ::deep(.el-dialog__body) {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

.action-picker-dialog ::deep(.el-dialog) {
  max-width: min(980px, calc(100vw - 20px));
  max-height: min(90vh, calc(100vh - 16px));
  margin: 8px auto 0;
  display: flex;
  flex-direction: column;
}

.action-picker-dialog ::deep(.picker-grid-wrap) {
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
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  line-height: 1.2;
  padding: 0 2px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.picker-group-title::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--el-border-color-lighter);
  opacity: 0.9;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 4px;
}

.picker-cell {
  position: relative;
  border: 1px solid var(--el-border-color);
  border-radius: 2px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  min-height: 56px;
  padding: 2px 2px 2px;
  display: grid;
  grid-template-rows: auto auto auto auto;
  justify-items: center;
  align-content: center;
  row-gap: 0;
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
.picker-cell.disabled .picker-cell-id,
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
  font-size: 10px;
  line-height: 1.15;
  min-height: 13px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-secondary);
}

.picker-cell-id {
  width: 100%;
  min-height: 12px;
  font-size: 10px;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
  color: var(--el-text-color-secondary);
}

.picker-icon {
  width: 22px;
  height: 22px;
  border-radius: 3px;
}

.picker-icon-empty {
  border: 1px dashed var(--el-border-color);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  display: grid;
  place-items: center;
}

.picker-cell-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  line-height: 1.1;
  padding: 0;
  margin: 1px 0 0;
}

.picker-cell-hover-tip {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  border-radius: 2px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
  font-size: 12px;
  line-height: 1.2;
  color: #fff;
  background: rgba(0, 0, 0, 0.62);
  text-align: center;
  opacity: 0;
  transition: opacity 120ms ease;
  pointer-events: none;
  white-space: normal;
  overflow-wrap: anywhere;
}

.picker-cell:hover .picker-cell-hover-tip,
.picker-cell:focus-visible .picker-cell-hover-tip {
  opacity: 1;
}

.picker-empty {
  flex: 1;
  min-height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  letter-spacing: 0.5px;
}
</style>
