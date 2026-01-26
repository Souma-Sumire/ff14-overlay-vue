<template>
  <div class="filter-segmented">
    <div
      class="segment-item"
      :class="{ 'is-active': modelValue === 'obtained' }"
      @click="updateValue('obtained')"
    >
      已获得
    </div>
    <div
      class="segment-item"
      :class="{ 'is-active': modelValue === 'needed' }"
      @click="updateValue('needed')"
    >
      尚未获得
    </div>
    <div
      class="segment-item"
      :class="{ 'is-active': modelValue === 'all' }"
      @click="updateValue('all')"
    >
      全部显示
    </div>
  </div>
</template>

<script setup lang="ts">
export type DisplayFilterMode = 'obtained' | 'needed' | 'all'

defineProps<{
  modelValue: DisplayFilterMode
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: DisplayFilterMode): void
}>()

function updateValue(val: DisplayFilterMode) {
  emit('update:modelValue', val)
}
</script>

<style lang="scss" scoped>
.filter-segmented {
  display: flex;
  padding: 4px 8px;
  border-radius: 4px 4px 0 0;
  gap: 4px;
}

.segment-item {
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  background: transparent;
  border: none;

  &:hover {
    color: #3b82f6;
    background: #f0f9ff;
  }

  &.is-active {
    background: #eff6ff;
    color: #3b82f6;
    font-weight: 700;
  }
}
</style>

<style lang="scss">
html.dark .filter-segmented .segment-item {
  color: #94a3b8;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  &.is-active {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }
}
</style>
