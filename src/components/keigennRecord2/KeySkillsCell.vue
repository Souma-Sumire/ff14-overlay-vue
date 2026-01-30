<script setup lang="ts">
import type { RowVO } from '@/types/keigennRecord2'
import { MoreFilled } from '@element-plus/icons-vue'
import Util from '@/utils/util'

const props = defineProps<{
  row: RowVO
}>()

const coolingDownSkills = computed(() =>
  markRaw(
    props.row.keySkills
      ?.filter((v) => !v.ready)
      .sort((a, b) => a.recastLeft - b.recastLeft) ?? []
  )
)

const readySkills = computed(() =>
  markRaw(
    props.row.keySkills
      ?.filter((v) => v.ready)
      .sort((a, b) => Util.enumSortMethod(a.ownerJob, b.ownerJob)) ?? []
  )
)

function getJobName(jobId: number) {
  const jobObj = Util.jobEnumToJob(jobId)
  const fullName = Util.jobToFullName(jobObj)
  return fullName.simple2 || ''
}

const popperOptions = {
  modifiers: [
    {
      name: 'preventOverflow',
      options: {
        padding: 24,
      },
    },
  ],
}
</script>

<template>
  <el-popover placement="left" :width="'auto'" trigger="hover" popper-class="skill-popover" transition="none"
    :show-after="0" :hide-after="0" :popper-options="popperOptions">
    <template #reference>
      <el-icon class="view-icon">
        <MoreFilled />
      </el-icon>
    </template>


    <template v-if="coolingDownSkills.length > 0">
      <div class="subtitle">{{ $t('keigennRecord.coolingDown') }}</div>
      <div class="skill-grid">
        <div v-for="skill in coolingDownSkills" :key="`${skill.id}-${skill.ownerId}`" class="skill-wrapper">
          <div class="skill-icon-container" :title="`${skill.ownerName} (${getJobName(skill.ownerJob)})`">
            <img :src="skill.icon" class="skill-icon" />
            <div class="skill-overlay" />
            <span class="skill-text">{{ skill.recastLeft }}</span>
          </div>

        </div>
      </div>
    </template>

    <template v-if="readySkills.length > 0">
      <el-divider v-if="coolingDownSkills.length > 0" />
      <div class="subtitle">{{ $t('keigennRecord.ready') || '可用' }}</div>
      <div class="skill-grid">
        <div v-for="skill in readySkills" :key="`${skill.id}-${skill.ownerId}`" class="skill-wrapper">
          <div class="skill-icon-container" :title="`${skill.ownerName} (${getJobName(skill.ownerJob)})`">
            <img :src="skill.icon" class="skill-icon" />
          </div>

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
  font-size: 12px;
  color: #aaa;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.5));
  padding-right: 1px;
  &:hover {
    color: var(--el-color-primary);
  }
}

.subtitle {
  font-weight: bold;
  margin-bottom: 2px;
  font-size: 10px;
  line-height: 1;
  color: #bbb;
}

.skill-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 178px;
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
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
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
  background-color: rgba(0, 0, 0, 0.35);
  z-index: 1;
}

.skill-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  color: #fff;
  font-weight: bold;
  font-size: 12px;
  z-index: 2;
  line-height: 1;
  font-family: sans-serif;
  text-shadow: -1px 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, 0 -1px 2px #000;
  pointer-events: none;
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

}
</style>
