<script setup lang="ts">
import { Download, Plus, RefreshLeft, Search, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as LZString from 'lz-string'
import { onMounted, ref, shallowRef, watch } from 'vue'
import ActionIcon from '@/components/keySkillTimer/ActionIcon.vue'
import { useLang } from '@/composables/useLang'
import { getActionChinese, initActionChinese, searchActions } from '@/resources/actionChinese'
import { raidbuffs } from '@/resources/raidbuffs'
import { useKeySkillStore } from '@/store/keySkills'
import { copyToClipboard } from '@/utils/clipboard'

const { t } = useLang()
const storeKeySkill = useKeySkillStore()
const isResourcesLoaded = ref(false)

onMounted(async () => {
  try {
    await initActionChinese()
  }
  catch (e) {
    console.error('Failed to load resources', e)
  }
  finally {
    isResourcesLoaded.value = true
  }
})

function resetToDefault() {
  ElMessageBox.confirm(
    t('keySkillTimerSettings.resetConfirmMsg'),
    t('keySkillTimerSettings.confirmTitle'),
    {
      confirmButtonText: t('keySkillTimerSettings.confirmBtn'),
      cancelButtonText: t('keySkillTimerSettings.cancelBtn'),
      type: 'warning',
    },
  )
    .then(() => {
      storeKeySkill.keySkillsData.chinese = [...raidbuffs]
      ElMessage.success(t('keySkillTimerSettings.resetSuccessMsg'))
    })
    .catch(() => {})
}

function addSkillById(id: number, name: string | undefined) {
  storeKeySkill.keySkillsData.chinese.unshift({
    key: crypto.randomUUID(),
    id,
    tts: name || '',
    duration: 0,
    recast1000ms: 0,
    job: [],
    line: 1,
    minLevel: 1,
  })
  ElMessage.success(`${t('keySkillTimerSettings.addSkill')}: ${name || id}`)
}

function deleteSkill(key: string) {
  const skills = storeKeySkill.keySkillsData.chinese
  const index = skills.findIndex(skill => skill.key === key)
  if (index !== -1)
    skills.splice(index, 1)
}

function moveSkill(from: number, to: number) {
  const skills = storeKeySkill.keySkillsData.chinese
  if (to < 0 || to >= skills.length || from === to)
    return
  const item = skills[from]
  if (!item)
    return
  skills.splice(from, 1)
  skills.splice(to, 0, item)
}

function exportData() {
  const text = JSON.stringify(storeKeySkill.keySkillsData)
  const zipped = LZString.compressToBase64(text)
  copyToClipboard(zipped)
    .then(() => ElMessage.success(t('keySkillTimerSettings.copySuccess')))
    .catch(() => ElMessage.error(t('keySkillTimerSettings.copyFailed')))
}

function importData(): void {
  ElMessageBox.prompt(
    t('keySkillTimerSettings.importPromptMsg'),
    t('keySkillTimerSettings.importTitle'),
    {
      confirmButtonText: t('keySkillTimerSettings.confirmBtn'),
      cancelButtonText: t('keySkillTimerSettings.cancelBtn'),
      inputType: 'textarea',
      inputValidator: (value: string) => {
        try {
          const data = LZString.decompressFromBase64(value)
          const json = JSON.parse(data)
          if (typeof json === 'object' && json !== null) {
            return true
          }
          return t('keySkillTimerSettings.dataFormatError')
        }
        catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          return `${t('keySkillTimerSettings.dataFormatError')}: ${message}`
        }
      },
    },
  )
    .then(({ value }) => {
      if (value) {
        const text = LZString.decompressFromBase64(value)
        const data = JSON.parse(text)
        if (typeof data === 'object' && data !== null) {
          storeKeySkill.keySkillsData.chinese = data.chinese
          ElMessage.success(t('keySkillTimerSettings.importSuccess'))
        }
        else {
          ElMessage.error(t('keySkillTimerSettings.importFormatError'))
        }
      }
    })
    .catch(() => {})
}

const searchText = ref('')
const searchResult = shallowRef<Array<{ id: number, name: string }>>([])
let searchTimeout: number | undefined

watch(searchText, (value) => {
  if (searchTimeout)
    clearTimeout(searchTimeout)
  searchTimeout = window.setTimeout(() => {
    searchResult.value = searchActions(value)
  }, 300)
})
</script>

<template>
  <div v-loading.fullscreen.lock="!isResourcesLoaded" class="page-container">
    <div class="header-toolbar">
      <div class="left-tools">
        <el-popover
          placement="bottom-start"
          :width="550"
          trigger="click"
          popper-class="skill-library-popover"
        >
          <template #reference>
            <el-button type="primary" :icon="Search" :loading="!isResourcesLoaded">
              {{ $t('keySkillTimerSettings.searchSkill') }}
            </el-button>
          </template>

          <el-tabs type="border-card" class="search-tabs">
            <el-tab-pane :label="$t('keySkillTimerSettings.presets')">
              <div class="preset-list" style="height: 400px; overflow-y: auto;">
                <div v-for="skill in raidbuffs" :key="skill.key" class="preset-item">
                  <div class="preset-info">
                    <ActionIcon :id="skill.id" :size="24" />
                    <span class="name">{{ getActionChinese(Number(skill.id)) || skill.tts || $t('keySkillTimerSettings.unknownSkill') }}</span>
                  </div>
                  <el-button
                    link
                    type="primary"
                    @click="addSkillById(Number(skill.id), getActionChinese(Number(skill.id)) || skill.tts)"
                  >
                    <el-icon><Plus /></el-icon>
                  </el-button>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane :label="$t('keySkillTimerSettings.searchTab')">
              <div class="search-drawer-content" style="height: 450px; padding: 12px;">
                <el-input
                  v-model="searchText"
                  clearable
                  :placeholder="$t('keySkillTimerSettings.skillName')"
                  :prefix-icon="Search"
                  style="margin-bottom: 12px;"
                  size="default"
                />
                <el-table :data="searchResult" style="width: 100%" height="390px" size="default">
                  <el-table-column width="40" align="center">
                    <template #default="{ row }">
                      <ActionIcon :id="row.id" :size="20" />
                    </template>
                  </el-table-column>
                  <el-table-column prop="id" :label="$t('keySkillTimerSettings.col.shortId')" width="80" />
                  <el-table-column prop="name" :label="$t('keySkillTimerSettings.skillName')" />
                  <el-table-column width="50" align="center">
                    <template #default="{ row }">
                      <el-button link type="primary" @click="addSkillById(row.id, row.name)">
                        <el-icon><Plus /></el-icon>
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-popover>
      </div>
      <div class="center-tools">
        <el-button-group>
          <el-button :icon="Download" @click="exportData">
            {{ $t('keySkillTimerSettings.export') }}
          </el-button>
          <el-button :icon="Upload" @click="importData">
            {{ $t('keySkillTimerSettings.import') }}
          </el-button>
        </el-button-group>
        <el-button type="danger" :icon="RefreshLeft" @click="resetToDefault">
          {{ $t('keySkillTimerSettings.restoreDefault') }}
        </el-button>
      </div>
      <div class="right-tools">
        <CommonThemeToggle storage-key="key-skill-timer-2" />
        <CommonLanguageSwitcher :teleported="false" />
      </div>
    </div>

    <main class="page-content">
      <KeySkillTimerSettingsTable
        @delete="(key) => deleteSkill(key)"
        @move="(from, to) => moveSkill(from, to)"
      />
    </main>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  padding: 8px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  overflow: hidden;
  box-sizing: border-box;
}

.header-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  height: 40px;
  box-sizing: border-box;
}

.left-tools, .center-tools, .right-tools {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-content {
  flex: 1;
  width: 100%;
  overflow: hidden;
  margin-top: 8px;
  min-height: 0;
}

:global(.skill-library-popover) {
  padding: 12px !important;
  border-radius: 8px !important;
  box-shadow: var(--el-box-shadow-light) !important;
}

.preset-list {
  display: flex;
  flex-direction: column;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  transition: all 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: var(--el-fill-color-light);
    border-radius: 4px;
  }

  .preset-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .name {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }
}

.search-tabs {
  height: 100%;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: hidden;

  :deep(.el-tabs__header) {
    margin: 0 !important;
    background-color: transparent;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  :deep(.el-tabs__nav-wrap) {
    padding: 0 !important;
    &::after {
      display: none;
    }
  }

  :deep(.el-tabs__item) {
    height: 42px !important;
    line-height: 42px !important;
    font-size: 14px;
    padding: 0 20px !important;
    border-right: 1px solid var(--el-border-color-lighter) !important;

    &:first-child {
      border-top-left-radius: 4px;
    }

    &.is-active {
      font-weight: bold;
      color: var(--el-color-primary);
      background-color: var(--el-bg-color-overlay);
      border-bottom-color: transparent !important;
    }
  }

  :deep(.el-tabs__content) {
    padding: 0;
    flex: 1;
    overflow: hidden;
    background-color: var(--el-bg-color-overlay);
  }

  :deep(.el-tab-pane) {
    height: 100%;
  }
}
</style>
