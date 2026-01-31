<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import * as LZString from 'lz-string'
import { ref, watch } from 'vue'
import { actionId2ClassJobLevel } from '@/resources/action2ClassJobLevel'
import { actionChinese } from '@/resources/actionChinese'
import { raidbuffs } from '@/resources/raidbuffs'
import { useKeySkillStore } from '@/store/keySkills'
import { copyToClipboard } from '@/utils/clipboard'
import { useLang } from '@/composables/useLang'
import ActionIcon from '@/components/keySkillTimer/ActionIcon.vue'
import { Plus, Search, Download, Upload, RefreshLeft, Close, CopyDocument } from '@element-plus/icons-vue'

const { t } = useLang()
const storeKeySkill = useKeySkillStore()

function resetToDefault() {
  ElMessageBox.confirm(
    t('keySkillTimerSettings.resetConfirmMsg'),
    t('keySkillTimerSettings.confirmTitle'),
    {
      confirmButtonText: t('keySkillTimerSettings.confirmBtn'),
      cancelButtonText: t('keySkillTimerSettings.cancelBtn'),
      type: 'warning',
    }
  )
    .then(() => {
      storeKeySkill.keySkillsData.chinese = [...raidbuffs]
      ElMessage.success(t('keySkillTimerSettings.resetSuccessMsg'))
    })
    .catch(() => {})
}

function addSkill() {
  storeKeySkill.keySkillsData.chinese.unshift({
    key: crypto.randomUUID(),
    id: 0,
    tts: '',
    duration: 0,
    recast1000ms: 0,
    job: [],
    line: 1,
    minLevel: 1,
  })
}

function deleteSkill(key: string) {
  const skills = storeKeySkill.keySkillsData.chinese
  const index = skills.findIndex((skill) => skill.key === key)
  if (index !== -1) skills.splice(index, 1)
}

function moveSkill(from: number, to: number) {
  const skills = storeKeySkill.keySkillsData.chinese
  if (to < 0 || to >= skills.length || from === to) return
  const item = skills[from]
  if (!item) return
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
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          return `${t('keySkillTimerSettings.dataFormatError')}: ${message}`
        }
      },
    }
  )
    .then(({ value }) => {
      if (value) {
        const text = LZString.decompressFromBase64(value)
        const data = JSON.parse(text)
        if (typeof data === 'object' && data !== null) {
          storeKeySkill.keySkillsData.chinese = data.chinese
          ElMessage.success(t('keySkillTimerSettings.importSuccess'))
        } else {
          ElMessage.error(t('keySkillTimerSettings.importFormatError'))
        }
      }
    })
    .catch(() => {})
}

const showDialog = ref(false)
const searchText = ref('')
const searchResult = ref<Array<{ id: number; name: string }>>([])
let searchTimeout: number | undefined

watch(searchText, (value) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = window.setTimeout(() => {
    if (value) {
      const result = []
      for (const [id, name] of Object.entries(actionChinese)) {
        if (name.includes(value)) {
          const idNumber = Number(id)
          const useful = actionId2ClassJobLevel(idNumber)
          if (useful) {
            result.push({ id: idNumber, name })
          }
        }
      }
      searchResult.value = result.slice(0, 50) // Limit results for better performance
    } else {
      searchResult.value = []
    }
  }, 300)
})

const dialogStyle = ref<Record<string, string>>({
  position: 'fixed',
  top: '100px',
  left: '100px',
  width: '450px',
  zIndex: '2000',
})

let dragging = false
let startX = 0
let startY = 0
let originX = 0
let originY = 0

function onMouseDown(e: MouseEvent) {
  const dialog = document.querySelector('.search-dialog') as HTMLElement
  if (!dialog) return
  const rect = dialog.getBoundingClientRect()
  startX = e.clientX
  startY = e.clientY
  originX = rect.left
  originY = rect.top
  dragging = true
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp, { once: true })
}

function onMouseMove(e: MouseEvent) {
  if (!dragging) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  dialogStyle.value.left = `${Math.max(0, originX + dx)}px`
  dialogStyle.value.top = `${Math.max(0, originY + dy)}px`
}

function onMouseUp() {
  dragging = false
  window.removeEventListener('mousemove', onMouseMove)
}
</script>

<template>
  <div class="page-container">
    <transition name="fade">
      <el-card
        v-if="showDialog"
        class="search-dialog"
        :style="dialogStyle"
        body-style="padding: 1em"
      >
        <template #header>
          <div class="search-dialog-header" @mousedown="onMouseDown">
            <span>{{ $t('keySkillTimerSettings.searchSkill') }}</span>
            <el-button link @click="showDialog = false">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </template>
        <el-input
          v-model="searchText"
          clearable
          :placeholder="$t('keySkillTimerSettings.skillName')"
          :prefix-icon="Search"
          class="search-input"
        />
        <div class="search-results">
          <el-table :data="searchResult" style="width: 100%" height="350px">
            <el-table-column
              :label="$t('keySkillTimerSettings.preview')"
              width="70"
              align="center"
            >
              <template #default="{ row }">
                <ActionIcon :id="row.id" />
              </template>
            </el-table-column>
            <el-table-column
              prop="id"
              :label="$t('keySkillTimerSettings.skillID')"
              width="100"
            />
            <el-table-column
              prop="name"
              :label="$t('keySkillTimerSettings.skillName')"
            />
            <el-table-column width="60" align="center">
              <template #default="{ row }">
                <el-button link type="primary" @click="copyToClipboard(String(row.id))">
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>
    </transition>

    <div class="header-toolbar">
      <div class="left-tools">
        <el-button type="success" :icon="Plus" @click="addSkill()">
          {{ $t('keySkillTimerSettings.addSkill') }}
        </el-button>
        <el-button type="primary" :icon="Search" @click="showDialog = true">
          {{ $t('keySkillTimerSettings.searchSkill') }}
        </el-button>
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
  min-height: 0; /* 关键：允许 flex 子项缩小 */
}

.search-dialog {
  user-select: none;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: var(--el-bg-color-overlay);
}

.search-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  padding: 4px 0;
  font-weight: bold;
}

.search-input {
  margin-bottom: 15px;
}

.search-results {
  border-radius: 4px;
  overflow: hidden;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

:deep(.el-card__header) {
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.02);
}
</style>
