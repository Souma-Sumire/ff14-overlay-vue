<script setup lang="ts">
import { ElOption, ElSelect } from 'element-plus'

const props = defineProps<{
  modelValue: string
  options: { label: string, value: string, fullLabel?: string }[]
  placeholder: string
  width: string
}>()

const emit = defineEmits<{
  update: [value: string]
}>()

function handleChange(value: string) {
  emit('update', value)
}
</script>

<template>
  <div class="header-filter">
    <ElSelect
      :model-value="modelValue"
      :placeholder="placeholder"
      size="small"
      :clearable="false"
      :style="`width:${width}`"
      :teleported="true"
      popper-class="keigenn-header-select-popper"
      @change="handleChange"
    >
      <ElOption
        v-for="option in options"
        :key="option.value"
        :label="option.fullLabel || option.label"
        :value="option.value"
      />
    </ElSelect>
  </div>
</template>
