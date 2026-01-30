<script setup lang="ts">
import type { RowVO } from '@/types/keigennRecord2'
import { View } from '@element-plus/icons-vue'
import Util from '@/utils/util'

const props = defineProps<{
  row: RowVO
}>()

const coolingDownSkills = computed(() =>
  props.row.keySkills
    ?.filter((v) => !v.ready)
    .sort((a, b) => a.recastLeft - b.recastLeft) ?? []
)

const readySkills = computed(() =>
  props.row.keySkills
    ?.filter((v) => v.ready)
    .sort((a, b) => Util.enumSortMethod(a.ownerJob, b.ownerJob)) ?? []
)

function getJobClass(jobId: number) {
  const jobObj = Util.jobEnumToJob(jobId)
  const jobName = Util.jobToFullName(jobObj)
  return jobName.en?.toLowerCase().replace(' ', '') || ''
}

function getJobName(jobId: number) {
  const jobObj = Util.jobEnumToJob(jobId)
  const fullName = Util.jobToFullName(jobObj)
  return fullName.simple2 || ''
}
</script>

<template>
  <el-popover
    placement="left"
    :width="'auto'"
    trigger="hover"
    popper-class="skill-popover"
  >
    <template #reference>
      <el-icon class="view-icon"><View /></el-icon>
    </template>

    <template v-if="coolingDownSkills.length > 0">
      <div class="subtitle">{{ $t('keigennRecord.coolingDown') }}</div>
      <div class="skill-grid">
        <div
          v-for="skill in coolingDownSkills"
          :key="`${skill.id}-${skill.ownerId}`"
          class="skill-wrapper"
        >
          <div 
            class="skill-icon-container"
            :title="`${skill.ownerName} (${getJobName(skill.ownerJob)})`"
          >
            <img :src="skill.icon" class="skill-icon" />
            <div class="skill-overlay" />
            <span class="skill-text">{{ skill.recastLeft }}</span>
          </div>
          <span
            class="skill-source job"
            :class="getJobClass(skill.ownerJob)"
          >
            {{ getJobName(skill.ownerJob) }}
          </span>
        </div>
      </div>
    </template>

    <template v-if="readySkills.length > 0">
      <el-divider v-if="coolingDownSkills.length > 0" />
      <div class="subtitle">{{ $t('keigennRecord.ready') || '可用' }}</div>
      <div class="skill-grid">
        <div
          v-for="skill in readySkills"
          :key="`${skill.id}-${skill.ownerId}`"
          class="skill-wrapper"
        >
          <div 
            class="skill-icon-container"
            :title="`${skill.ownerName} (${getJobName(skill.ownerJob)})`"
          >
            <img :src="skill.icon" class="skill-icon" />
          </div>
          <span
            class="skill-source job"
            :class="getJobClass(skill.ownerJob)"
          >
            {{ getJobName(skill.ownerJob) }}
          </span>
        </div>
      </div>
    </template>

    <div v-if="coolingDownSkills.length === 0 && readySkills.length === 0" class="no-data">
      {{ $t('keigennRecord.noData') }}
    </div>
  </el-popover>
</template>

<style scoped lang="scss">
@use '../../styles/job.scss';

.view-icon {
  cursor: pointer;
  font-size: 14px;
  color: #888;

  &:hover {
    color: var(--el-color-primary);
  }
}

.subtitle {
  font-weight: bold;
  margin: 0 0 4px 0;
  font-size: 10px;
  line-height: title;
  color: #ddd;
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px 2px;
}

.skill-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 22px;
  overflow: visible;
  line-height: normal;
}

.skill-icon-container {
  position: relative;
  width: 22px;
  height: 22px;
  border-radius: 3px;
  overflow: hidden;
  background: #222;
  box-shadow: 0 0 2px rgba(0,0,0,0.5);
}

.skill-icon {
  width: 100%;
  height: 100%;
}

.skill-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1;
}

.skill-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-weight: 800;
  font-size: 11px;
  z-index: 2;
  line-height: 1;
  font-family: monospace;
  text-shadow: 1px 1px 2px #000;
}

.skill-source {
  text-align: center;
  font-size: 9px;
  white-space: nowrap;
}

.el-divider {
  margin: 2px 0;
  border-color: #444;
}

.no-data {
  text-align: center;
  color: #666;
  font-size: 12px;
  padding: 5px 0;
}
</style>

<style lang="scss">
.el-popover.skill-popover {
  padding: 6px !important;
  min-width: unset !important;
  width: auto !important;
  background: #1f1f1f !important;
  border: 1px solid #444 !important;
  color: #eee !important;
  
  // 覆盖箭头颜色
  .el-popper__arrow::before {
    background: #1f1f1f !important;
    border: 1px solid #444 !important;
  }
}
</style>
