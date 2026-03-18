<script setup lang="ts">
interface PrimaryActionConfig {
  show?: boolean;
  disabled?: boolean;
  text?: string;
}

interface FooterActionConfig {
  show?: boolean;
  disabled?: boolean;
  text?: string;
  confirmTitle?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

interface CloseActionConfig {
  show?: boolean;
  disabled?: boolean;
  text?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    width?: string;
    teleported?: boolean;
    destroyOnClose?: boolean;
    lockScroll?: boolean;
    loading?: boolean;
    loadingText?: string;
    tip?: string;
    name?: string;
    subtitle?: string;
    iconSrc?: string;
    iconAlt?: string;
    primaryAction?: PrimaryActionConfig;
    deleteAction?: FooterActionConfig;
    resetAction?: FooterActionConfig;
    closeAction?: CloseActionConfig;
  }>(),
  {
    width: "520px",
    teleported: false,
    destroyOnClose: true,
    lockScroll: true,
    loading: false,
    loadingText: "",
    tip: "",
    name: "",
    subtitle: "",
    iconSrc: "",
    iconAlt: "",
    primaryAction: () => ({}),
    deleteAction: () => ({}),
    resetAction: () => ({}),
    closeAction: () => ({}),
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "primaryAction"): void;
  (e: "deleteAction"): void;
  (e: "resetAction"): void;
  (e: "closeAction"): void;
  (e: "iconError", event: Event): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const primaryActionState = computed(() => {
  return {
    show: props.primaryAction?.show ?? false,
    disabled: props.primaryAction?.disabled ?? false,
    text: props.primaryAction?.text?.trim() || "更换技能",
  };
});

const deleteActionState = computed(() => {
  return {
    show: props.deleteAction?.show ?? false,
    disabled: props.deleteAction?.disabled ?? false,
    text: props.deleteAction?.text?.trim() || "删除技能",
    confirmTitle: props.deleteAction?.confirmTitle?.trim() || "",
    confirmButtonText: props.deleteAction?.confirmButtonText?.trim() || "确认",
    cancelButtonText: props.deleteAction?.cancelButtonText?.trim() || "取消",
  };
});

const resetActionState = computed(() => {
  return {
    show: props.resetAction?.show ?? false,
    disabled: props.resetAction?.disabled ?? false,
    text: props.resetAction?.text?.trim() || "恢复默认",
    confirmTitle: props.resetAction?.confirmTitle?.trim() || "",
    confirmButtonText: props.resetAction?.confirmButtonText?.trim() || "确认",
    cancelButtonText: props.resetAction?.cancelButtonText?.trim() || "取消",
  };
});

const closeActionState = computed(() => {
  return {
    show: props.closeAction?.show ?? true,
    disabled: props.closeAction?.disabled ?? false,
    text: props.closeAction?.text?.trim() || "确认",
  };
});

function triggerPrimaryAction() {
  emit("primaryAction");
}

function triggerDeleteAction() {
  emit("deleteAction");
}

function triggerResetAction() {
  emit("resetAction");
}

function triggerCloseAction() {
  emit("closeAction");
  visible.value = false;
}

function handleIconError(event: Event) {
  emit("iconError", event);
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
    :show-close="true"
  >
    <div v-if="$slots.tip || tip" class="editor-tip">
      <slot name="tip">
        {{ tip }}
      </slot>
    </div>

    <div class="editor-body">
      <section class="editor-head">
        <slot name="summary">
          <img
            v-if="iconSrc"
            :src="iconSrc"
            :alt="iconAlt || name"
            class="editor-icon"
            @error="handleIconError"
          />
          <div v-else class="editor-icon editor-icon-empty">无图标</div>

          <div class="editor-summary">
            <div class="editor-name">
              {{ name }}
            </div>
            <div v-if="subtitle" class="editor-sub">
              {{ subtitle }}
            </div>
          </div>
        </slot>

        <el-button
          v-if="primaryActionState.show"
          class="editor-action-btn"
          type="primary"
          plain
          :disabled="primaryActionState.disabled"
          @click="triggerPrimaryAction"
        >
          {{ primaryActionState.text }}
        </el-button>
      </section>

      <div v-loading="loading" class="editor-grid" :element-loading-text="loadingText || undefined">
        <slot name="fields">
          <slot />
        </slot>
      </div>

      <slot name="after-grid" />
    </div>

    <slot name="after-body" />

    <template #footer>
      <div class="editor-footer">
        <div class="editor-footer-left">
          <slot name="footer-left">
            <el-popconfirm
              v-if="deleteActionState.show && deleteActionState.confirmTitle"
              :title="deleteActionState.confirmTitle"
              :confirm-button-text="deleteActionState.confirmButtonText"
              :cancel-button-text="deleteActionState.cancelButtonText"
              @confirm="triggerDeleteAction"
            >
              <template #reference>
                <el-button
                  class="editor-delete-btn"
                  type="danger"
                  plain
                  :disabled="deleteActionState.disabled"
                >
                  {{ deleteActionState.text }}
                </el-button>
              </template>
            </el-popconfirm>
            <el-button
              v-else-if="deleteActionState.show"
              class="editor-delete-btn"
              type="danger"
              plain
              :disabled="deleteActionState.disabled"
              @click="triggerDeleteAction"
            >
              {{ deleteActionState.text }}
            </el-button>
            <el-popconfirm
              v-if="resetActionState.show && resetActionState.confirmTitle"
              :title="resetActionState.confirmTitle"
              :confirm-button-text="resetActionState.confirmButtonText"
              :cancel-button-text="resetActionState.cancelButtonText"
              @confirm="triggerResetAction"
            >
              <template #reference>
                <el-button class="editor-reset-btn" :disabled="resetActionState.disabled">
                  {{ resetActionState.text }}
                </el-button>
              </template>
            </el-popconfirm>
            <el-button
              v-else-if="resetActionState.show"
              class="editor-reset-btn"
              :disabled="resetActionState.disabled"
              @click="triggerResetAction"
            >
              {{ resetActionState.text }}
            </el-button>
            <slot name="extra-footer-left" />
          </slot>
        </div>
        <div class="editor-footer-right">
          <slot name="footer-right">
            <el-button
              v-if="closeActionState.show"
              :disabled="closeActionState.disabled"
              @click="triggerCloseAction"
            >
              {{ closeActionState.text }}
            </el-button>
          </slot>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.skill-editor-dialog {
  max-width: min(560px, calc(100vw - 20px));
  margin: 6px auto 0;
  --editor-font-family: "Bahnschrift", "PingFang SC", "Microsoft YaHei", sans-serif;
  --el-font-family: var(--editor-font-family);
  --el-font-size-base: 14px;
  font-family: var(--editor-font-family);
  font-size: var(--el-font-size-base);
}

.skill-editor-dialog,
.skill-editor-dialog :deep(*),
.skill-editor-dialog :deep(.el-dialog__title),
.skill-editor-dialog :deep(.el-input__inner),
.skill-editor-dialog :deep(.el-textarea__inner),
.skill-editor-dialog :deep(.el-select__selected-item),
.skill-editor-dialog :deep(.el-button) {
  font-family: var(--editor-font-family);
}

.skill-editor-dialog :deep(.el-dialog__body) {
  padding: 10px;
}

.editor-tip {
  margin-bottom: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
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

.editor-head :deep(.editor-icon) {
  width: 42px;
  height: 42px;
  border-radius: 8px;
}

.editor-head :deep(.editor-icon-empty) {
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
}

.editor-head :deep(.editor-summary) {
  min-width: 0;
  flex: 1;
}

.editor-head :deep(.editor-name) {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-head :deep(.editor-sub) {
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

.editor-grid :deep(.number-input-full .el-input__wrapper) {
  padding-left: 11px;
  padding-right: 11px;
}

.editor-grid :deep(.number-input-full .el-input__inner) {
  text-align: left;
}

.editor-grid :deep(.input-error-tip) {
  font-size: 12px;
  line-height: 1.2;
  color: var(--el-color-danger);
}

.editor-footer {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.editor-footer-left,
.editor-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-footer-left {
  justify-content: flex-start;
}

.editor-footer-right {
  justify-content: flex-end;
}

.skill-editor-dialog :deep(.editor-action-btn),
.skill-editor-dialog :deep(.editor-footer .el-button),
.skill-editor-dialog :deep(.editor-head .el-button),
.skill-editor-dialog :deep(.editor-body .el-button) {
  height: 32px;
  padding-left: 12px;
  padding-right: 12px;
  border-radius: 6px;
}

.editor-reset-btn {
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning-dark-2);
  border-color: var(--el-color-warning-light-5);
}

.editor-reset-btn:hover {
  background: var(--el-color-warning-light-8);
  color: var(--el-color-warning-dark-2);
  border-color: var(--el-color-warning-light-3);
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
