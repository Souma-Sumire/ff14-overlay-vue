<script lang="ts" setup>
import type { ITimelineLine, ShowStyle, TimelineConfigValues } from "@/types/timeline";
import { Refresh, RefreshLeft } from "@element-plus/icons-vue";
import { ElButton, ElDialog, ElForm, ElIcon, ElSlider } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, onUnmounted, ref, watch } from "vue";
import { useTimelineStore } from "@/store/timeline";
import { ShowStyleConfigEnum, TimelineConfigEnum } from "@/types/timeline";
import TimelineTimelineShow from "@/components/timeline/TimelineShow.vue";

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", value: ReturnType<typeof useTimelineStore>): void;
}>();

const timelineStore = useTimelineStore();

// 默认值定义 (用于重置)
const defaultValues: {
  config: TimelineConfigValues;
  style: ShowStyle;
} = {
  config: {
    [TimelineConfigEnum.显示范围]: 120,
    [TimelineConfigEnum.变色时间]: 2.75,
    [TimelineConfigEnum.零后持续]: 0.5,
    [TimelineConfigEnum.战前准备]: 30,
    [TimelineConfigEnum.TTS提前量]: 1,
  },
  style: {
    [ShowStyleConfigEnum.总缩放]: 1,
    [ShowStyleConfigEnum.总宽度]: 200,
    [ShowStyleConfigEnum.字体尺寸]: 16,
    [ShowStyleConfigEnum.未到来不透明度]: 0.5,
    [ShowStyleConfigEnum.未到来缩放]: 0.66,
    [ShowStyleConfigEnum.即将到来缩放]: 1,
    [ShowStyleConfigEnum.动画时间]: 1,
  },
};

// 滑块范围定义
const sliderConfigs: Partial<
  Record<TimelineConfigEnum | ShowStyleConfigEnum, { min: number; max: number; step: number }>
> = {
  [TimelineConfigEnum.显示范围]: { min: 10, max: 200, step: 1 },
  [TimelineConfigEnum.变色时间]: { min: 0, max: 5, step: 0.25 },
  [TimelineConfigEnum.零后持续]: { min: 0, max: 5, step: 0.1 },
  [TimelineConfigEnum.战前准备]: { min: 0, max: 40, step: 1 },
  [TimelineConfigEnum.TTS提前量]: { min: 0, max: 5, step: 0.5 },
  [ShowStyleConfigEnum.总缩放]: { min: 0.1, max: 4, step: 0.01 },
  [ShowStyleConfigEnum.总宽度]: { min: 100, max: 1200, step: 5 },
  [ShowStyleConfigEnum.字体尺寸]: { min: 8, max: 96, step: 1 },
  [ShowStyleConfigEnum.未到来不透明度]: { min: 0, max: 1, step: 0.05 },
  [ShowStyleConfigEnum.未到来缩放]: { min: 0.1, max: 2, step: 0.01 },
  [ShowStyleConfigEnum.即将到来缩放]: { min: 0.1, max: 2, step: 0.01 },
  [ShowStyleConfigEnum.动画时间]: { min: 0, max: 3, step: 0.1 },
};

let snapshot: { config: TimelineConfigValues; style: ShowStyle } | null = null;
let committed = false;

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      committed = false;
      snapshot = {
        config: { ...timelineStore.configValues },
        style: { ...timelineStore.showStyle },
      };
    } else if (!committed && snapshot) {
      Object.assign(timelineStore.configValues, snapshot.config);
      Object.assign(timelineStore.showStyle, snapshot.style);
      snapshot = null;
    }
  },
);

function isConfigModified(key: TimelineConfigEnum) {
  return timelineStore.configValues[key] !== defaultValues.config[key];
}

function isStyleModified(key: ShowStyleConfigEnum) {
  return timelineStore.showStyle[key] !== defaultValues.style[key];
}

function resetConfigField(key: TimelineConfigEnum) {
  timelineStore.configValues[key] = defaultValues.config[key];
}

function resetStyleField(key: ShowStyleConfigEnum) {
  timelineStore.showStyle[key] = defaultValues.style[key];
}

function resetAll() {
  ElMessageBox.confirm("此操作将恢复所有参数至默认值，确定继续吗？", "恢复默认参数", {
    confirmButtonText: "确定重置",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      (Object.keys(defaultValues.config) as TimelineConfigEnum[]).forEach((key) => {
        timelineStore.configValues[key] = defaultValues.config[key];
      });
      (Object.keys(defaultValues.style) as ShowStyleConfigEnum[]).forEach((key) => {
        timelineStore.showStyle[key] = defaultValues.style[key];
      });
      ElMessage.success("已恢复默认参数");
    })
    .catch(() => {});
}

function handleCancel() {
  if (snapshot) {
    Object.assign(timelineStore.configValues, snapshot.config);
    Object.assign(timelineStore.showStyle, snapshot.style);
    snapshot = null;
  }
  committed = false;
  dialogVisible.value = false;
}

function handleSave() {
  committed = true;
  snapshot = null;
  timelineStore.saveTimelineSettings();
  emit("save", timelineStore);
  dialogVisible.value = false;
  ElMessage.success("参数设置已保存");
}

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const testCombatTime = ref(-2.0);
const isPreviewPlaying = ref(false);
let previewRafId: number | null = null;
let previewLastTs = 0;

function stopPreviewPlay() {
  isPreviewPlaying.value = false;
  if (previewRafId !== null) {
    cancelAnimationFrame(previewRafId);
    previewRafId = null;
  }
}

function togglePreviewPlay() {
  if (isPreviewPlaying.value) {
    stopPreviewPlay();
    return;
  }
  if (testCombatTime.value >= 10) {
    testCombatTime.value = -15;
  }
  isPreviewPlaying.value = true;
  previewLastTs = performance.now();
  const step = (now: number) => {
    if (!isPreviewPlaying.value) return;
    const dt = (now - previewLastTs) / 1000;
    previewLastTs = now;
    const next = Math.min(10, Number((testCombatTime.value + dt).toFixed(2)));
    testCombatTime.value = next;
    if (next >= 10) {
      stopPreviewPlay();
      return;
    }
    previewRafId = requestAnimationFrame(step);
  };
  previewRafId = requestAnimationFrame(step);
}

function resetPreviewTime() {
  stopPreviewPlay();
  testCombatTime.value = -15;
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) stopPreviewPlay();
  },
);

onUnmounted(() => {
  stopPreviewPlay();
});
const testTimeline = ref<ITimelineLine[]>([
  {
    time: -15,
    action: "<圣光幕帘>~",
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
  { time: -2, action: "<圣灵>~", show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  {
    time: 0,
    action: "战斗开始！",
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
  { time: 3, action: "<挑衅>~", show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  {
    time: 5,
    action: "<神圣领域>~",
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
  {
    time: 10,
    action: "<圣盾阵>~",
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
  {
    time: 20,
    action: "<圣盾阵>~",
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
  { time: 25, action: "<雪仇>~", show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 30, action: "<铁壁>~", show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  {
    time: 40,
    action: "<极限防御>~",
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
  { time: 50, action: "<雪仇>~", show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 60, action: "<圣灵>~", show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  {
    time: 120,
    action: "<圣盾阵>~",
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
  {
    time: 180,
    action: "<圣光幕帘>~",
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
  {
    time: 200,
    action: "战斗结束！",
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
]);
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :modal="true"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    class="timeline-settings-dialog"
    width="min(920px, 94vw)"
    :append-to-body="true"
    :draggable="true"
    destroy-on-close
    align-center
  >
    <template #header>
      <div class="dialog-header">
        <span class="title">时间轴参数设置</span>
        <el-button :icon="Refresh" size="small" @click="resetAll">恢复全部默认</el-button>
      </div>
    </template>

    <div class="layout-container">
      <div class="form-side">
        <el-form label-position="top" size="small">
          <section class="section-container">
            <h3 class="section-header">核心参数</h3>
            <div v-for="(_value, key) in timelineStore.configValues" :key="key" class="slider-item">
              <div class="slider-label">
                <span class="label-name">{{ timelineStore.configTranslate[key] }}</span>
                <div class="label-actions">
                  <span class="default-hint">默认 {{ defaultValues.config[key] }}</span>
                  <el-button
                    size="small"
                    :icon="RefreshLeft"
                    :disabled="!isConfigModified(key)"
                    :title="`恢复默认值 ${defaultValues.config[key]}`"
                    :aria-label="`重置${timelineStore.configTranslate[key]}`"
                    class="reset-field-btn"
                    @click="resetConfigField(key)"
                  />
                </div>
              </div>
              <el-slider
                v-model="timelineStore.configValues[key]"
                :min="sliderConfigs[key]?.min"
                :max="sliderConfigs[key]?.max"
                :step="sliderConfigs[key]?.step"
                show-input
                :show-input-controls="false"
                input-size="small"
              />
            </div>
          </section>

          <section class="section-container">
            <h3 class="section-header">视觉样式</h3>
            <div v-for="(_value, key) in timelineStore.showStyle" :key="key" class="slider-item">
              <div class="slider-label">
                <span class="label-name">{{ timelineStore.showStyleTranslate[key] }}</span>
                <div class="label-actions">
                  <span class="default-hint">默认 {{ defaultValues.style[key] }}</span>
                  <el-button
                    size="small"
                    :icon="RefreshLeft"
                    :disabled="!isStyleModified(key)"
                    :title="`恢复默认值 ${defaultValues.style[key]}`"
                    :aria-label="`重置${timelineStore.showStyleTranslate[key]}`"
                    class="reset-field-btn"
                    @click="resetStyleField(key)"
                  />
                </div>
              </div>
              <el-slider
                v-model="timelineStore.showStyle[key]"
                :min="sliderConfigs[key]?.min"
                :max="sliderConfigs[key]?.max"
                :step="sliderConfigs[key]?.step"
                show-input
                :show-input-controls="false"
                input-size="small"
              />
            </div>
          </section>
        </el-form>
      </div>

      <div class="preview-side">
        <div class="preview-top">
          <h3 class="section-header">实时预览</h3>
          <div class="preview-controls">
            <span class="preview-time">{{ testCombatTime.toFixed(1) }}s</span>
            <button
              type="button"
              class="transport-btn"
              :class="isPreviewPlaying ? 'transport-pause' : 'transport-play'"
              :title="isPreviewPlaying ? '暂停预览' : '播放预览'"
              :aria-label="isPreviewPlaying ? '暂停预览' : '播放预览'"
              @click="togglePreviewPlay"
            >
              <svg v-if="!isPreviewPlaying" viewBox="0 0 24 24" class="transport-svg">
                <polygon points="6,4 20,12 6,20" fill="currentColor" />
              </svg>
              <svg v-else viewBox="0 0 24 24" class="transport-svg">
                <rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor" />
                <rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              class="transport-btn transport-reset"
              title="复位到起点"
              aria-label="复位到起点"
              @click="resetPreviewTime"
            >
              <el-icon :size="19"><RefreshLeft /></el-icon>
            </button>
          </div>
        </div>
        <div class="slider-container">
          <el-slider
            v-model="testCombatTime"
            :min="-15"
            :max="10"
            :step="0.1"
            size="small"
            @input="stopPreviewPlay"
          />
        </div>
        <div class="preview-box">
          <div class="inner-preview">
            <timeline-timeline-show
              :config="timelineStore.configValues"
              :lines="testTimeline"
              :runtime="testCombatTime"
              :show-style="timelineStore.showStyle"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button size="default" @click="handleCancel">取消</el-button>
        <el-button size="default" type="primary" @click="handleSave">保存设置</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.timeline-settings-dialog {
  :deep(.el-dialog__header) {
    margin-right: 0;
    padding: 14px 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    cursor: move;
  }
  :deep(.el-dialog__body) {
    padding: 16px 20px;
  }
  :deep(.el-dialog__footer) {
    border-top: 1px solid var(--el-border-color-lighter);
    padding: 12px 20px;
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 28px;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.layout-container {
  display: flex;
  gap: 24px;
  align-items: stretch;
  max-height: 74vh;
}

.section-container {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.form-side {
  width: 380px;
  flex-shrink: 0;
  overflow-y: auto;
  padding-right: 12px;
  border-right: 1px solid var(--el-border-color-lighter);

  .slider-item {
    margin-bottom: 8px;

    .slider-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--el-text-color-regular);
      margin-bottom: 2px;

      .label-name {
        font-weight: 500;
      }

      .label-actions {
        display: flex;
        align-items: center;
        gap: 6px;

        .default-hint {
          font-size: 11px;
          font-variant-numeric: tabular-nums;
          color: var(--el-text-color-secondary);
        }

        .reset-field-btn {
          padding: 2px 5px;
          height: 20px;
          min-height: 20px;
        }
      }
    }
  }

  :deep(.el-slider__runway) {
    margin-right: 10px;
  }

  :deep(.el-slider__input) {
    width: 68px;
  }
}

.preview-side {
  flex: 1;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .preview-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--el-border-color-lighter);
    padding-bottom: 6px;
    margin-bottom: 8px;

    .section-header {
      margin: 0;
      padding: 0;
      border-bottom: none;
    }

    .preview-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .transport-btn {
      width: 30px;
      height: 30px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition:
        background-color 0.16s ease,
        transform 0.12s ease;

      &:hover {
        background-color: var(--el-fill-color-light);
      }

      &:active {
        transform: scale(0.94);
      }

      &:focus-visible {
        outline: 2px solid var(--el-color-primary);
        outline-offset: 1px;
      }
    }

    .transport-svg {
      width: 19px;
      height: 19px;
    }

    .transport-play {
      color: #409eff;
    }

    .transport-pause {
      color: #e6a23c;
    }

    .transport-reset {
      color: #0ea5e9;
    }

    .preview-time {
      min-width: 46px;
      text-align: right;
      font-size: 13px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--el-color-primary);
    }
  }

  .slider-container {
    margin-bottom: 10px;
    padding: 0 4px;
  }

  .preview-box {
    flex: 1;
    min-height: 280px;
    background-color: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    padding: 16px;
    overflow: auto;

    .inner-preview {
      width: fit-content;
      height: fit-content;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 780px) {
  .layout-container {
    flex-direction: column;
    max-height: 78vh;
    overflow-y: auto;
  }

  .form-side {
    width: 100%;
    border-right: none;
    padding-right: 0;
    overflow-y: visible;
  }

  .preview-side {
    min-width: 0;
    overflow: visible;
  }
}
</style>
