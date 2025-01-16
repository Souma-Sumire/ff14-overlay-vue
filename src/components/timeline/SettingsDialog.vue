<script lang="ts" setup>
import type { ITimelineLine } from '@/types/timeline'
import { useTimelineStore } from '@/store/timeline'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const timelineStore = useTimelineStore()

watchEffect(() => {
  timelineStore.saveTimelineSettings()
})

const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const testCombatTime = ref(-15)
const testTimeline = ref<ITimelineLine[]>([
  {
    time: -15,
    action: '<圣光幕帘>~',
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
  {
    time: -2,
    action: '<圣灵>~',
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
  {
    time: 0,
    action: '战斗开始！',
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
  {
    time: 3,
    action: '<挑衅>~',
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },
  {
    time: 5,
    action: '<神圣领域>~',
    show: true,
    windowBefore: 0,
    windowAfter: 0,
    alertAlready: false,
  },

])
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :modal="true"
    overflow
    :close-on-click-modal="false"
    custom-class="timeline-dialog"
    width="600px"
    :append-to-body="true"
    :draggable="true"
  >
    <template #header>
      <h3 style="margin: 0; padding: 10px; background-color: #f5f7fa; cursor: move;">
        设置
      </h3>
    </template>
    <el-form label-position="right" label-width="120px" class="timeline-form">
      <h3 class="form-section-title">
        参数
      </h3>
      <el-row :gutter="20">
        <el-col v-for="(_value, key, index) in timelineStore.configValues" :key="index" :span="12">
          <el-form-item :label="timelineStore.configTranslate[key]">
            <el-input-number
              v-model="timelineStore.configValues[key]"
              :min="0"
              :step="0.1"
              class="custom-input"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <h3 class="form-section-title">
        样式
      </h3>
      <el-row :gutter="20">
        <el-col v-for="(_value, key, index) in timelineStore.showStyle" :key="index" :span="12">
          <el-form-item :label="timelineStore.showStyleTranslate[key]">
            <el-input-number
              v-model="timelineStore.showStyle[key]"
              :min="0"
              :step="0.01"
              class="custom-input"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <h3 class="form-section-title">
        测试用例
      </h3>
      <el-row :gutter="20">
        <el-slider
          v-model="testCombatTime"
          :min="-15"
          :max="5"
          :step="0.1"
          show-input
        />
        <timeline-timeline-show
          :config="timelineStore.configValues"
          :lines="testTimeline"
          :runtime="testCombatTime"
          :show-style="timelineStore.showStyle"
        />
      </el-row>
    </el-form>
  </el-dialog>
</template>

<style scoped>
.timeline-form {
  padding: 0 10px;
}

.form-section-title {
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: bold;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.custom-input {
  width: 10em;
}

:deep(.el-form-item__label) {
  font-weight: bold;
}

:deep(.el-input-number .el-input__wrapper) {
  width: 100%;
}

:deep(.el-form-item) {
  margin-bottom: 15px;
}
</style>
