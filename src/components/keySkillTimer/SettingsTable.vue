<script setup lang="ts">
import { CaretBottom, CaretTop, Delete } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { searchActions } from '@/resources/actionChinese'
import { useKeySkillStore } from '@/store/keySkills'
import ActionIcon from './ActionIcon.vue'
import JobSelector from './JobSelector.vue'

const emit = defineEmits<{
  (e: 'delete', key: string): void
  (e: 'move', fromIndex: number, toIndex: number): void
}>()

const storeKeySKill = useKeySkillStore()
const data = computed(() => storeKeySKill.keySkillsData.chinese)

function querySearch(queryString: string, cb: (results: any[]) => void) {
  if (queryString) {
    const results = searchActions(queryString, 50).map(item => ({
      value: item.id.toString(),
      label: item.name,
      id: item.id,
    }))
    cb(results)
  }
  else {
    cb([])
  }
}
</script>

<template>
  <div class="settings-table-wrapper">
    <el-table
      :data="data"
      border
      size="small"
      :row-key="(row) => row.key"
      height="100%"
      class="custom-table"
      header-row-class-name="table-header"
    >
      <el-table-column
        :label="$t('keySkillTimerSettings.col.action')"
        width="90"
        fixed="left"
        align="center"
      >
        <template #default="{ row, $index }">
          <div class="action-buttons">
            <el-button
              link
              size="small"
              :disabled="$index === 0"
              @click="emit('move', $index, $index - 1)"
            >
              <el-icon><CaretTop /></el-icon>
            </el-button>
            <el-button
              link
              size="small"
              :disabled="$index === data.length - 1"
              @click="emit('move', $index, $index + 1)"
            >
              <el-icon><CaretBottom /></el-icon>
            </el-button>
            <el-popconfirm
              :title="$t('keySkillTimerSettings.deleteConfirmTitle')"
              @confirm="emit('delete', row.key)"
            >
              <template #reference>
                <el-button link size="small" type="danger">
                  <el-icon><Delete /></el-icon>
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
          <ActionIcon :id="row.id" :key="row.id" />
        </template>
      </el-table-column>

      <el-table-column
        :label="$t('keySkillTimerSettings.col.id')"
        min-width="200"
      >
        <template #default="{ row }">
          <el-autocomplete
            v-model="row.id"
            :fetch-suggestions="querySearch"
            placeholder="..."
            size="small"
            style="width: 100%"
            clearable
            :trigger-on-focus="false"
          >
            <template #default="{ item }">
              <div style="display: flex; align-items: center; gap: 8px">
                <ActionIcon :id="item.id" :key="item.id" :size="20" />
                <span>{{ item.label }}</span>
                <span
                  style="color: var(--el-text-color-secondary); font-size: 12px"
                >({{ item.value }})</span>
              </div>
            </template>
          </el-autocomplete>
        </template>
      </el-table-column>

      <el-table-column width="130">
        <template #header>
          <div class="tts-header">
            <span>TTS</span>
            <el-switch v-model="storeKeySKill.enableTts.chinese" size="small" />
          </div>
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
        min-width="180"
        align="left"
      >
        <template #default="{ row }">
          <el-input v-model="row.duration" size="small" />
        </template>
      </el-table-column>

      <el-table-column
        :label="$t('keySkillTimerSettings.col.recast')"
        min-width="220"
        align="left"
      >
        <template #default="{ row }">
          <el-input v-model="row.recast1000ms" size="small" />
        </template>
      </el-table-column>

      <el-table-column
        :label="$t('keySkillTimerSettings.col.job')"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          <JobSelector v-model="row.job" />
        </template>
      </el-table-column>

      <el-table-column
        :label="$t('keySkillTimerSettings.col.minLevel')"
        width="110"
        align="center"
      >
        <template #default="{ row }">
          <el-input-number
            v-model="row.minLevel"
            :min="1"
            :max="100"
            size="small"
            :controls="false"
            class="level-input"
          />
        </template>
      </el-table-column>

      <el-table-column
        :label="$t('keySkillTimerSettings.col.line')"
        width="110"
        align="center"
      >
        <template #default="{ row }">
          <el-input-number
            v-model="row.line"
            :min="1"
            :max="10"
            size="small"
            :controls="false"
            class="line-input"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style lang="scss" scoped>
.settings-table-wrapper {
  border-radius: 4px;
  overflow: hidden;
  height: 100%;
  width: 100%;
}

.custom-table {
  --el-table-border-color: var(--el-border-color-lighter);
  --el-table-header-bg-color: var(--el-fill-color-light);
  background: transparent;
  width: 100%;
}

:deep(.table-header) th {
  background-color: var(--el-fill-color-light) !important;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap !important;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 0;
}

.action-buttons .el-button {
  padding: 4px;
  margin: 0;
}

.tts-header {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
}

.job-select {
  width: 100%;
}

.level-input, .line-input {
  width: 70px !important;
  margin: 0 auto;
}

:deep(.el-table__body-wrapper) {
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
}

:deep(.el-table__row) {
  transition: background-color 0.2s;
}

:deep(.el-input__wrapper), :deep(.el-select__wrapper) {
  background-color: var(--el-fill-color-blank) !important;
  box-shadow: 0 0 0 1px var(--el-border-color) inset !important;
  border: none;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
  }
}

html.dark {
  :deep(.el-input__wrapper), :deep(.el-select__wrapper) {
    background-color: rgba(0, 0, 0, 0.2) !important;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset !important;
  }
}
</style>
