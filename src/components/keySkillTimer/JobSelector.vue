<script setup lang="ts">
import type { Lang } from '@/types/lang'
import { Filter } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { localeToCactbotLang, useLang } from '@/composables/useLang'
import Util from '@/utils/util'

const props = defineProps<{
  modelValue: number[]
}>()

const emit = defineEmits(['update:modelValue'])

const { t, locale } = useLang()

const jobList = Object.freeze(Util.getBattleJobs())

const localizedJobOptions = computed(() => {
  const lang = localeToCactbotLang(locale.value as Lang)
  return jobList.map((job) => {
    const jobInfo = Util.jobToFullName(job)
    return {
      value: Util.jobToJobEnum(job),
      label: (jobInfo as any)[lang] ?? jobInfo.en,
    }
  })
})

const selectedJobsText = computed(() => {
  if (!props.modelValue || props.modelValue.length === 0)
    return t('keySkillTimerSettings.col.allJobs')
  if (props.modelValue.length === jobList.length)
    return t('keySkillTimerSettings.col.allJobs')
  return t('keySkillTimerSettings.col.jobsCount', { count: props.modelValue.length })
})

function handleUpdate(val: number[]) {
  emit('update:modelValue', val)
}
</script>

<template>
  <el-popover placement="bottom" :width="280" trigger="click" popper-class="job-selector-popper">
    <template #reference>
      <el-button size="small" class="job-popover-btn">
        <el-icon><Filter /></el-icon>
        <span class="btn-text">{{ selectedJobsText }}</span>
      </el-button>
    </template>

    <div class="job-selector-content">
      <el-select
        :model-value="modelValue"
        multiple
        filterable
        placeholder="Select Jobs"
        size="default"
        class="full-width"
        collapse-tags
        collapse-tags-tooltip
        @update:model-value="handleUpdate"
      >
        <el-option
          v-for="option in localizedJobOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </div>
  </el-popover>
</template>

<style scoped lang="scss">
.job-popover-btn {
  width: 100%;
  justify-content: flex-start;
  padding: 0 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-blank);

  .btn-text {
    margin-left: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }
}

.job-selector-content {
  padding: 8px;
}

.full-width {
  width: 100%;
}
</style>
