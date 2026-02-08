<script lang="ts" setup>
import type {
  ITimelineLine,
  ShowStyle,
  TimelineConfigValues,
} from '@/types/timeline'
import { Refresh, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, ref, watchEffect } from 'vue'
import { useTimelineStore } from '@/store/timeline'
import {
  ShowStyleConfigEnum,
  TimelineConfigEnum,
} from '@/types/timeline'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const timelineStore = useTimelineStore()

// 默认值定义 (用于重置)
const defaultValues: {
  config: TimelineConfigValues
  style: ShowStyle
} = {
  config: {
    [TimelineConfigEnum.显示范围]: 120,
    [TimelineConfigEnum.变色时间]: 2.75,
    [TimelineConfigEnum.零后持续]: 0.5,
    [TimelineConfigEnum.战前准备]: 30,
    [TimelineConfigEnum.TTS提前量]: 1,
  },
  style: {
    [ShowStyleConfigEnum.总宽度]: 200,
    [ShowStyleConfigEnum.字体尺寸]: 16,
    [ShowStyleConfigEnum.未到来不透明度]: 0.5,
    [ShowStyleConfigEnum.未到来缩放]: 0.66,
    [ShowStyleConfigEnum.即将到来缩放]: 1,
    [ShowStyleConfigEnum.变色动画时间]: 1,
  },
}

// 滑块范围定义
const sliderConfigs: Partial<Record<TimelineConfigEnum | ShowStyleConfigEnum, { min: number, max: number, step: number }>> = {
  [TimelineConfigEnum.显示范围]: { min: 10, max: 200, step: 1 },
  [TimelineConfigEnum.变色时间]: { min: 0, max: 5, step: 0.25 },
  [TimelineConfigEnum.零后持续]: { min: 0, max: 5, step: 0.1 },
  [TimelineConfigEnum.战前准备]: { min: 0, max: 40, step: 1 },
  [TimelineConfigEnum.TTS提前量]: { min: 0, max: 5, step: 0.5 },
  [ShowStyleConfigEnum.总宽度]: { min: 120, max: 300, step: 5 },
  [ShowStyleConfigEnum.字体尺寸]: { min: 8, max: 48, step: 1 },
  [ShowStyleConfigEnum.未到来不透明度]: { min: 0, max: 1, step: 0.05 },
  [ShowStyleConfigEnum.未到来缩放]: { min: 0.1, max: 2, step: 0.01 },
  [ShowStyleConfigEnum.即将到来缩放]: { min: 0.1, max: 2, step: 0.01 },
  [ShowStyleConfigEnum.变色动画时间]: { min: 0, max: 3, step: 0.1 },
}

function resetConfigField(key: TimelineConfigEnum) {
  timelineStore.configValues[key] = defaultValues.config[key]
}

function resetStyleField(key: ShowStyleConfigEnum) {
  timelineStore.showStyle[key] = defaultValues.style[key]
}

function resetAll() {
  ElMessageBox.confirm(
    '此操作将恢复所有参数至默认值，确定继续吗？',
    '提示',
    {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      type: 'warning',
    },
  ).then(() => {
    (Object.keys(defaultValues.config) as TimelineConfigEnum[]).forEach((key) => {
      timelineStore.configValues[key] = defaultValues.config[key]
    });
    (Object.keys(defaultValues.style) as ShowStyleConfigEnum[]).forEach((key) => {
      timelineStore.showStyle[key] = defaultValues.style[key]
    })
    ElMessage.success('已恢复默认设置')
  }).catch(() => {})
}

watchEffect(() => {
  timelineStore.saveTimelineSettings()
})

const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const testCombatTime = ref(-2.0)
const testTimeline = ref<ITimelineLine[]>([
  { time: -15, action: '<圣光幕帘>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: -2, action: '<圣灵>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 0, action: '战斗开始！', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 3, action: '<挑衅>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 5, action: '<神圣领域>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 10, action: '<圣盾阵>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 20, action: '<圣盾阵>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 25, action: '<雪仇>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 30, action: '<铁壁>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 40, action: '<极限防御>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 50, action: '<雪仇>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 60, action: '<圣灵>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 120, action: '<圣盾阵>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 180, action: '<圣光幕帘>~', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
  { time: 200, action: '战斗结束！', show: true, windowBefore: 0, windowAfter: 0, alertAlready: false },
])
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :modal="true"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="timeline-settings-dialog"
    width="fit-content"
    :append-to-body="true"
    :draggable="true"
    destroy-on-close
    center
    align-center
  >
    <template #header>
      <div class="dialog-header">
        <span class="title">时间轴配置</span>
        <el-button link type="primary" :icon="Refresh" size="small" @click="resetAll">
          重置全部
        </el-button>
      </div>
    </template>

    <div class="layout-container">
      <!-- Left Side: Form Controls -->
      <div class="form-side">
        <el-form label-position="top" size="small">
          <div class="section-container">
            <h3 class="section-header">
              核心参数
            </h3>
            <div v-for="(_value, key) in timelineStore.configValues" :key="key" class="slider-item">
              <div class="slider-label">
                <span>{{ timelineStore.configTranslate[key] }}</span>
                <div class="label-actions">
                  <span class="default-hint">默认: {{ defaultValues.config[key] }}</span>
                  <el-button link :icon="RefreshLeft" @click="resetConfigField(key)" />
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
          </div>

          <div class="section-container">
            <h3 class="section-header">
              视觉样式
            </h3>
            <div v-for="(_value, key) in timelineStore.showStyle" :key="key" class="slider-item">
              <div class="slider-label">
                <span>{{ timelineStore.showStyleTranslate[key] }}</span>
                <div class="label-actions">
                  <span class="default-hint">默认: {{ defaultValues.style[key] }}</span>
                  <el-button link :icon="RefreshLeft" @click="resetStyleField(key)" />
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
          </div>
        </el-form>
      </div>

      <!-- Right Side: Live Preview -->
      <div class="preview-side" :style="{ width: `${timelineStore.showStyle['--timeline-width'] + 50}px` }">
        <h3 class="section-header">
          效果预览
        </h3>
        <div class="preview-content">
          <div class="slider-container">
            <div class="slider-info">
              <span class="label">模拟时间轴进度</span>
              <span class="time">{{ testCombatTime.toFixed(1) }}s</span>
            </div>
            <el-slider v-model="testCombatTime" :min="-15" :max="10" :step="0.1" size="small" />
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
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button size="small" @click="dialogVisible = false">
          取消
        </el-button>
        <el-button size="small" type="primary" @click="dialogVisible = false">
          保存设置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.timeline-settings-dialog {
  :deep(.el-dialog__header) {
    margin-right: 0;
    padding: 8px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background-color: var(--el-fill-color-light);
    cursor: move;
  }
  :deep(.el-dialog__body) {
    padding: 4px 16px;
  }
  :deep(.el-dialog__footer) {
    border-top: 1px solid var(--el-border-color-lighter);
    padding: 6px 16px;
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 24px;
  .title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.layout-container {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.section-container {
  margin-bottom: 4px;
}

.section-header {
  font-size: 13px;
  font-weight: bold;
  color: var(--el-color-primary);
  margin: 6px 0 4px;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: "";
    width: 3px;
    height: 12px;
    background-color: var(--el-color-primary);
    border-radius: 2px;
  }
}

.form-side {
  width: 380px; // 增加宽度以容纳滑块和输入框
  border-right: 1px solid var(--el-border-color-lighter);
  padding-right: 16px;
  flex-shrink: 0;

  .slider-item {
    margin-bottom: 4px;
    .slider-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--el-text-color-regular);
      margin-bottom: -2px;

      .label-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        .default-hint {
          font-size: 10px;
          color: var(--el-text-color-secondary);
          opacity: 0.8;
        }
        .el-button {
          padding: 0;
          height: auto;
        }
      }
    }
  }

  :deep(.el-slider__runway) {
    margin-right: 8px;
  } // 留出8px空隙
  :deep(.el-slider__input) {
    width: 60px;
  }
}

.preview-side {
  display: flex;
  flex-direction: column;
  position: relative; // 关键：建立相对定位参考，子元素绝对定位后不占用空间高度
  flex-shrink: 0; // 防止宽度被压缩

  .preview-content {
    position: absolute; // 关键：绝对定位使其脱离高度计算
    top: 36px; // 避开 section-header 的高度
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    background-color: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    padding: 10px;
  }

  .preview-box {
    flex: 1;
    background-color: var(--el-fill-color-darker);
    border-radius: 4px;
    padding: 12px;
    margin-top: 8px;
    border: 1px solid var(--el-border-color-darker);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    overflow: hidden;
    .inner-preview {
      width: fit-content;
    }
  }

  .slider-container {
    margin-bottom: 4px;
    .slider-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
      .label {
        font-size: 11px;
        color: var(--el-text-color-secondary);
      }
      .time {
        font-size: 11px;
        font-family: monospace;
        color: var(--el-color-primary);
        font-weight: bold;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
