<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import * as LZString from 'lz-string'
import { ref } from 'vue'
import KeySkillTable from '@/components/keySkillTimer/KeySkillTable.vue'
import { skillChinese, skillGlobal } from '@/resources/raidbuffs'
import { useKeySkillStore } from '@/store/keySkills'
import { copyToClipboard } from '@/utils/clipboard'

const storeKeySkill = useKeySkillStore()

const activeTab = ref<'chinese' | 'global'>('chinese')

const tabLabels = {
  chinese: '国服技能数据',
  global: '国际服技能数据',
} as const

function resetToDefault() {
  ElMessageBox.confirm(
    `是否重置「${
      tabLabels[activeTab.value]
    }」为默认技能数据？这将覆盖当前编辑的内容。`,
    '确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(() => {
      if (activeTab.value === 'chinese') {
        storeKeySkill.keySkillsData.chinese = [...skillChinese]
      }
      else {
        storeKeySkill.keySkillsData.global = [...skillGlobal]
      }
      ElMessage.success(`已重置${tabLabels[activeTab.value]}`)
    })
    .catch(() => {})
}

function addSkill(tab: 'chinese' | 'global') {
  storeKeySkill.keySkillsData[tab].unshift({
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

function deleteSkill(tab: 'chinese' | 'global', key: string) {
  const skills = storeKeySkill.keySkillsData[tab]
  const index = skills.findIndex(skill => skill.key === key)
  if (index !== -1)
    skills.splice(index, 1)
}

function moveSkill(tab: 'chinese' | 'global', from: number, to: number) {
  const skills = storeKeySkill.keySkillsData[tab]
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
    .then(() => ElMessage.success('已复制到剪贴板'))
    .catch(() => ElMessage.error('复制失败'))
}

function importData(): void {
  ElMessageBox.prompt(
    '请输入导入的技能数据，导入的数据将覆盖当前内容。',
    '导入',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputValidator: (value: string) => {
        try {
          const data = LZString.decompressFromBase64(value)
          const json = JSON.parse(data)
          if (typeof json === 'object' && json !== null) {
            return true
          }
          return '数据格式错误'
        }
        catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          return `数据格式错误: ${message}`
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
          storeKeySkill.keySkillsData.global = data.global
          ElMessage.success('已导入数据')
        }
        else {
          ElMessage.error('导入数据格式错误')
        }
      }
    })
    .catch(() => {})
}
</script>

<template>
  <div class="page-container">
    <el-header class="header">
      <el-button size="small" type="success" @click="addSkill(activeTab)">
        新增技能
      </el-button>
      <el-button-group>
        <el-button size="small" @click="exportData">
          导出
        </el-button>
        <el-button size="small" @click="importData">
          导入
        </el-button>
      </el-button-group>
      <el-button size="small" type="danger" @click="resetToDefault">
        恢复默认
      </el-button>
      <CommonThemeToggle storage-key="key-skill-timer-2" />
    </el-header>
    <el-tabs
      v-model="activeTab"
      tab-position="top"
      type="border-card"
      class="tabs"
    >
      <el-tab-pane :label="tabLabels.chinese" name="chinese">
        <KeySkillTable
          v-model:data="storeKeySkill.keySkillsData.chinese"
          @delete="key => deleteSkill('chinese', key)"
          @move="(from, to) => moveSkill('chinese', from, to)"
        />
      </el-tab-pane>
      <el-tab-pane :label="tabLabels.global" name="global">
        <KeySkillTable
          v-model:data="storeKeySkill.keySkillsData.global"
          @delete="key => deleteSkill('global', key)"
          @move="(from, to) => moveSkill('global', from, to)"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  padding: 0 1em;
}

.header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 2em;
  height: 40px;
  padding: 0;
}
</style>
