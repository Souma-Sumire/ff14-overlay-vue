<script setup lang="ts">
import type { KeySkill } from '@/types/keySkill'
import { idToSrc } from '@/utils/dynamicValue'
import Util from '@/utils/util'

const props = defineProps<{
  data: KeySkill[]
}>()
const emit = defineEmits<{
  (e: 'delete', key: string): void
  (e: 'move', fromIndex: number, toIndex: number): void
}>()
const jobList = Object.freeze(Util.getBattleJobs())

const jobOptions = markRaw(
  jobList.map(job => ({
    value: Util.jobToJobEnum(job),
    label: Util.jobToFullName(job)?.cn ?? job,
  })),
)

// src 防抖
const debouncedSrcMap = ref(new Map<string, string>())
const timers: Record<string, number | undefined> = {}
watch(
  () => props.data.map(row => ({ key: row.key, id: row.id })),
  (newList) => {
    newList.forEach(({ key, id }) => {
      // 清除旧定时器
      if (timers[key])
        clearTimeout(timers[key])
      // 新定时器，延迟1秒更新
      timers[key] = window.setTimeout(() => {
        debouncedSrcMap.value.set(key, idToSrc(id))
        // 触发响应更新 map
        debouncedSrcMap.value = new Map(debouncedSrcMap.value)
      }, 1000)
    })
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <el-table
    :data="props.data"
    border
    size="small"
    :row-key="(row) => row.key"
    :height="620"
  >
    <el-table-column label="操作" width="80" align="center">
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
            :disabled="$index === props.data.length - 1"
            class="arrow"
            @click="emit('move', $index, $index + 1)"
          >
            ↓
          </el-button>
          <el-popconfirm
            title="确定删除吗？此操作无法撤销"
            placement="top-start"
            @confirm="emit('delete', row.key)"
          >
            <template #reference>
              <el-button link type="danger" size="small">
                删除
              </el-button>
            </template>
          </el-popconfirm>
        </div>
      </template>
    </el-table-column>
    <el-table-column label="预览" width="50" align="center">
      <template #default="{ row }">
        <img :src="debouncedSrcMap.get(row.key) ?? idToSrc(row.id)" class="icon">
      </template>
    </el-table-column>

    <el-table-column label="ID(十进制)" width="200">
      <template #default="{ row }">
        <el-input v-model="row.id" size="small" />
      </template>
    </el-table-column>

    <el-table-column label="TTS" width="100">
      <template #default="{ row }">
        <el-input v-model="row.tts" size="small" />
      </template>
    </el-table-column>

    <el-table-column label="持续时间(秒)" width="180">
      <template #default="{ row }">
        <el-input v-model="row.duration" size="small" />
      </template>
    </el-table-column>

    <el-table-column label="冷却时间 (秒)" width="140">
      <template #default="{ row }">
        <el-input v-model="row.recast1000ms" size="small" />
      </template>
    </el-table-column>

    <el-table-column label="适用职业" min-width="100">
      <template #default="{ row }">
        <el-select v-model="row.job" size="small" multiple>
          <el-option
            v-for="option in jobOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </template>
    </el-table-column>

    <el-table-column label="最小习得等级" width="90" align="center">
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
    <el-table-column label="显示到第n行" width="100" align="center">
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
