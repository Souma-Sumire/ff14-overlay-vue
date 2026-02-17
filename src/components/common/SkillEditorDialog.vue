<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  width?: string
  teleported?: boolean
  destroyOnClose?: boolean
  lockScroll?: boolean
  loading?: boolean
  loadingText?: string
  tip?: string
  name?: string
  subtitle?: string
  iconSrc?: string
  iconAlt?: string
  primaryActionText?: string
  showPrimaryAction?: boolean
  primaryActionDisabled?: boolean
  cancelText?: string
  confirmText?: string
  cancelDisabled?: boolean
  confirmDisabled?: boolean
}>(), {
  width: '460px',
  teleported: false,
  destroyOnClose: true,
  lockScroll: true,
  loading: false,
  loadingText: '',
  tip: '',
  name: '',
  subtitle: '',
  iconSrc: '',
  iconAlt: '',
  primaryActionText: '',
  showPrimaryAction: undefined,
  primaryActionDisabled: false,
  cancelText: '取消',
  confirmText: '保存',
  cancelDisabled: false,
  confirmDisabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'cancel'): void
  (e: 'confirm'): void
  (e: 'primaryAction'): void
  (e: 'iconError', event: Event): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const shouldShowPrimaryAction = computed(() => {
  if (props.showPrimaryAction !== undefined)
    return props.showPrimaryAction
  return !!props.primaryActionText
})

function closeDialog() {
  emit('cancel')
  visible.value = false
}

function confirmDialog() {
  emit('confirm')
}

function triggerPrimaryAction() {
  emit('primaryAction')
}

function handleIconError(event: Event) {
  emit('iconError', event)
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    class="skill-editor-dialog"
    :teleported="teleported"
    :destroy-on-close="destroyOnClose"
    :lock-scroll="lockScroll"
  >
    <div v-if="$slots.tip || tip" class="editor-tip">
      <slot name="tip">
        {{ tip }}
      </slot>
    </div>

    <div class="editor-body">
      <section class="editor-head">
        <img
          v-if="iconSrc"
          :src="iconSrc"
          :alt="iconAlt || name"
          class="editor-icon"
          @error="handleIconError"
        >
        <div v-else class="editor-icon editor-icon-empty">
          无图标
        </div>

        <div class="editor-summary">
          <div class="editor-name">
            {{ name }}
          </div>
          <div v-if="subtitle" class="editor-sub">
            {{ subtitle }}
          </div>
        </div>

        <el-button
          v-if="shouldShowPrimaryAction"
          type="primary"
          plain
          size="small"
          :disabled="primaryActionDisabled"
          @click="triggerPrimaryAction"
        >
          {{ primaryActionText }}
        </el-button>
      </section>

      <div v-loading="loading" class="editor-grid" :element-loading-text="loadingText || undefined">
        <slot />
      </div>

      <slot name="after-grid" />
    </div>

    <slot name="after-body" />

    <template #footer>
      <div class="editor-footer">
        <slot name="footer-left" />
        <div class="editor-footer-right">
          <slot name="footer-right">
            <el-button :disabled="cancelDisabled" @click="closeDialog">
              {{ cancelText }}
            </el-button>
            <el-button type="primary" :disabled="confirmDisabled" @click="confirmDialog">
              {{ confirmText }}
            </el-button>
          </slot>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.skill-editor-dialog :deep(.el-dialog) {
  max-width: min(560px, calc(100vw - 20px));
  margin: 6px auto 0;
}

.skill-editor-dialog :deep(.el-dialog__body) {
  padding: 10px;
}

.editor-tip {
  margin-bottom: 8px;
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.editor-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.editor-icon {
  width: 42px;
  height: 42px;
  border-radius: 8px;
}

.editor-icon-empty {
  display: grid;
  place-items: center;
  font-size: 10px;
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
}

.editor-summary {
  min-width: 0;
  flex: 1;
}

.editor-name {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.editor-grid :deep(.editor-field) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.editor-grid :deep(.editor-field label) {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.editor-grid :deep(.editor-field.span-2) {
  grid-column: span 2;
}

.editor-grid :deep(.number-input-full) {
  width: 100%;
}

.editor-grid :deep(.number-input-full .el-input__inner) {
  text-align: left;
}

.editor-footer {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 680px) {
  .editor-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .editor-grid :deep(.editor-field.span-2) {
    grid-column: span 1;
  }
}
</style>
