<script setup lang="ts">
import { ElOption, ElSelect } from "element-plus";

defineProps<{
  modelValue: string;
  options: { label: string; value: string; fullLabel?: string }[];
  placeholder: string;
  width: string;
}>();

const emit = defineEmits<{
  update: [value: string];
}>();

function handleChange(value: string) {
  emit("update", value);
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

<style lang="scss">
.keigenn-header-select-popper {
  margin-top: 0 !important;
  inset-block-start: calc(24px * var(--keigenn-record2-scale, 1)) !important;

  .el-select-dropdown {
    zoom: var(--keigenn-record2-scale, 1) !important;
  }
}
</style>
