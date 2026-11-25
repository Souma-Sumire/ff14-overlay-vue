<script setup lang="ts">
import { ElOption, ElSelect } from "element-plus";
import { onBeforeUnmount, onMounted, ref } from "vue";

defineProps<{
  modelValue: string;
  options: { label: string; value: string; fullLabel?: string }[];
  placeholder: string;
  width: string;
}>();

const emit = defineEmits<{
  update: [value: string];
}>();

const selectRef = ref<InstanceType<typeof ElSelect> | null>(null);

function handleChange(value: string) {
  emit("update", value);
}

function closeDropdown() {
  selectRef.value?.blur();
}

onMounted(() => {
  window.addEventListener("blur", closeDropdown);
  document.documentElement.addEventListener("mouseleave", closeDropdown);
});

onBeforeUnmount(() => {
  window.removeEventListener("blur", closeDropdown);
  document.documentElement.removeEventListener("mouseleave", closeDropdown);
});
</script>

<template>
  <div class="header-filter" :class="{ 'is-active': Boolean(modelValue) }">
    <ElSelect
      ref="selectRef"
      :model-value="modelValue"
      :placeholder="placeholder"
      size="small"
      :clearable="false"
      :offset="2"
      :style="`width:${width}`"
      :teleported="true"
      popper-class="keigenn-header-select-popper"
      @change="handleChange"
    >
      <ElOption
        v-for="option in options"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      >
        <span>{{ option.fullLabel || option.label }}</span>
      </ElOption>
    </ElSelect>
  </div>
</template>

<style scoped lang="scss">
.header-filter {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;

  :deep(.el-select) {
    width: max-content !important;
  }

  :deep(.el-select--small .el-select__wrapper) {
    padding: 0 2px;
    gap: 1px;
    min-height: 22px;
    justify-content: center;
  }

  :deep(.el-select__selection) {
    flex: 0 0 auto;
  }

  :deep(.el-select__input-wrapper) {
    display: none;
  }

  :deep(.el-select__suffix) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    flex-shrink: 0;
    margin-left: 0;
  }

  :deep(.el-select__placeholder) {
    position: static;
    transform: none;
    width: auto;
    overflow: visible;
    text-overflow: clip;
    color: var(--el-color-primary);
  }

  :deep(.el-select__selected-item) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &.is-active {
    &::after {
      content: "";
      position: absolute;
      left: 18%;
      right: 18%;
      bottom: 1px;
      height: 2px;
      border-radius: 1px;
      background-color: var(--el-color-primary);
      pointer-events: none;
    }

    :deep(.el-select__placeholder) {
      font-weight: 600;
    }
  }
}
</style>

<style lang="scss">
.keigenn-header-select-popper {
  .el-select-dropdown {
    zoom: var(--keigenn-record2-scale, 1) !important;
  }
}
</style>
