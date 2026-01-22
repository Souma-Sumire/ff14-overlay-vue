<template>
  <div class="sort-segmented">
    <div
      class="segment-item"
      :class="{ 'is-active': modelValue === 'part' }"
      @click="updateValue('part')"
    >
      按装备部位顺序
    </div>
    <div
      class="segment-item"
      :class="{ 'is-active': modelValue === 'drop' }"
      @click="updateValue('drop')"
    >
      按零式掉落顺序
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: 'part' | 'drop'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: 'part' | 'drop'): void
}>()

function updateValue(val: 'part' | 'drop') {
  emit('update:modelValue', val)
}
</script>

<style lang="scss" scoped>
.sort-segmented {
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

  :global(.dark) & {
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
}
</style>
