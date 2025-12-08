<script setup lang="ts">
import { localeToCactbotLang, useLang } from '@/composables/useLang'
import { useKeySkillStore } from '@/store/keySkills'
import type { Lang } from '@/types/lang'
import { idToSrc } from '@/utils/dynamicValue'
import Util from '@/utils/util'

const { locale } = useLang()

const emit = defineEmits<{
  (e: 'delete', key: string): void
  (e: 'move', fromIndex: number, toIndex: number): void
}>()

const storeKeySKill = useKeySkillStore()
const data = computed(() => storeKeySKill.keySkillsData.chinese)

const jobList = Object.freeze(Util.getBattleJobs())

const jobOptions = markRaw(
  jobList.map((job) => {
    const label = Util.jobToFullName(job)
    return {
      value: Util.jobToJobEnum(job),
      label: label,
    }
  })
)

// src 防抖
const debouncedSrcMap = ref(new Map<string, string>())
const timers: Record<string, number | undefined> = {}
watch(
  () => data.value.map((row) => ({ key: row.key, id: row.id })),
  (newList) => {
    newList.forEach(({ key, id }) => {
      // 清除旧定时器
      if (timers[key]) clearTimeout(timers[key])
      // 新定时器，延迟1秒更新
      timers[key] = window.setTimeout(() => {
        debouncedSrcMap.value.set(key, idToSrc(id))
        // 触发响应更新 map
        debouncedSrcMap.value = new Map(debouncedSrcMap.value)
      }, 1000)
    })
  },
  { immediate: true, deep: true }
)

function getLabel(option: {
  value: number
  label: {
    en: string
    ja: string
    cn: string
    simple1: string
    simple2: string
  }
}) {
  return (
    option.label[
      localeToCactbotLang(
        locale.value as Lang
      ) as keyof typeof Util.jobToFullName
    ] ?? option.label.en
  )
}
</script>

<template>
  <el-table
    :data="data"
    border
    size="small"
    :row-key="(row) => row.key"
    :height="620"
  >
    <el-table-column
      :label="$t('keySkillTimerSettings.col.action')"
      width="80"
      align="center"
    >
      <template #default="{ row, $index }">
        <div
          style="display: flex; justify-content: center; gap: 0px"
          class="actions"
        >
          <el-button
            link
            size="small"
            type="primary"
            :disabled="$index === 0"
            class="arrow"
            @click="emit('move', $index, $index - 1)"
          >
            ↑
          </el-button>
          <el-button
            link
            size="small"
            type="primary"
            :disabled="$index === data.length - 1"
            class="arrow"
            @click="emit('move', $index, $index + 1)"
          >
            ↓
          </el-button>
          <el-popconfirm
            :title="$t('keySkillTimerSettings.deleteConfirmTitle')"
            placement="top-start"
            @confirm="emit('delete', row.key)"
          >
            <template #reference>
              <el-button link type="danger" size="small">
                {{ $t('keySkillTimerSettings.deleteBtn') }}
              </el-button>
            </template>
          </el-popconfirm>
        </div>
      </template>
    </el-table-column>

    <el-table-column
      :label="$t('keySkillTimerSettings.col.preview')"
      width="50"
      align="center"
    >
      <template #default="{ row }">
        <img
          :src="debouncedSrcMap.get(row.key) ?? idToSrc(row.id)"
          class="icon"
        />
      </template>
    </el-table-column>

    <el-table-column :label="$t('keySkillTimerSettings.col.id')" width="200">
      <template #default="{ row }">
        <el-input v-model="row.id" size="small" />
      </template>
    </el-table-column>

    <el-table-column :label="$t('keySkillTimerSettings.col.tts')" width="100">
      <template #header>
        <el-form>
          TTS
          <el-switch v-model="storeKeySKill.enableTts.chinese" size="small" />
        </el-form>
      </template>
      <template #default="{ row }">
        <el-input
          v-model="row.tts"
          size="small"
          :disabled="!storeKeySKill.enableTts.chinese"
        />
      </template>
    </el-table-column>

    <el-table-column
      :label="$t('keySkillTimerSettings.col.duration')"
      width="180"
    >
      <template #default="{ row }">
        <el-input v-model="row.duration" size="small" />
      </template>
    </el-table-column>

    <el-table-column
      :label="$t('keySkillTimerSettings.col.recast')"
      width="180"
    >
      <template #default="{ row }">
        <el-input v-model="row.recast1000ms" size="small" />
      </template>
    </el-table-column>

    <el-table-column
      :label="$t('keySkillTimerSettings.col.job')"
      min-width="100"
    >
      <template #default="{ row }">
        <el-select v-model="row.job" size="small" multiple>
          <el-option
            v-for="option in jobOptions"
            :key="option.value"
            :label="getLabel(option)"
            :value="option.value"
          />
        </el-select>
      </template>
    </el-table-column>

    <el-table-column
      :label="$t('keySkillTimerSettings.col.minLevel')"
      width="90"
      align="center"
    >
      <template #default="{ row }">
        <el-input-number
          v-model="row.minLevel"
          :min="1"
          :max="100"
          size="small"
          controls-position="right"
          style="width: 70px"
        />
      </template>
    </el-table-column>

    <el-table-column
      :label="$t('keySkillTimerSettings.col.line')"
      width="100"
      align="center"
    >
      <template #default="{ row }">
        <el-input-number
          v-model="row.line"
          :min="1"
          size="small"
          controls-position="right"
          style="width: 60px"
        />
      </template>
    </el-table-column>
  </el-table>
</template>

<style lang="scss" scoped>
.icon {
  width: 24px;
  height: 24px;
  display: block;
  margin: 0 auto;
}
.actions > button {
  margin: 0;
}
.actions > button.arrow {
  font-size: 16px;
  font-weight: bold;
}
</style>
