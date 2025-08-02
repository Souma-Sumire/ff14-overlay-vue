<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import * as LZString from 'lz-string'
import { ref } from 'vue'
import KeySkillTable from '@/components/keySkillTimer/KeySkillTable.vue'
import { actionId2ClassJobLevel } from '@/resources/action2ClassJobLevel'
import { actionChinese } from '@/resources/actionChinese'
import { skillChinese, skillGlobal } from '@/resources/raidbuffs'
import { useKeySkillStore } from '@/store/keySkills'
import { copyToClipboard } from '@/utils/clipboard'
import { idToSrc } from '@/utils/dynamicValue'

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

const showDialog = ref(false)
const searchText = ref('')
const searchResult = ref<Array<{ id: number, name: string }>>([])
watch(searchText, (value) => {
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
    searchResult.value = result
  }
})

const observedImages = new Map<Element, () => void>()

function lazyLoadImage(el: HTMLImageElement) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement
        img.src = img.dataset.src!
        observer.unobserve(img)
      }
    })
  })
  observer.observe(el)
  observedImages.set(el, () => observer.unobserve(el))
}

onBeforeUnmount(() => {
  observedImages.forEach(unobserve => unobserve())
  observedImages.clear()
})

function onImgRef(el: Element | ComponentPublicInstance | null) {
  if (el && el instanceof HTMLImageElement) {
    lazyLoadImage(el)
  }
}

const dialogStyle = ref<Record<string, string>>({
  position: 'fixed',
  top: '50px',
  left: '50px',
  width: '400px',
  height: '400px',
  zIndex: '1000',
})

let startX = 0
let startY = 0
let originX = 0
let originY = 0
let dragging = false

let dragTarget: HTMLElement | null = null

function updateDialogPosition(left: number, top: number) {
  if (dragTarget) {
    dragTarget.style.left = `${left}px`
    dragTarget.style.top = `${top}px`
  }
  dialogStyle.value.left = `${left}px`
  dialogStyle.value.top = `${top}px`
}

function onMouseDown(e: MouseEvent) {
  e.preventDefault()
  const dialog = document.querySelector('.search-dialog') as HTMLElement
  if (!dialog)
    return

  dragTarget = dialog
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
  if (!dragging || !dragTarget)
    return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  const newLeft = Math.max(0, originX + dx)
  const newTop = Math.max(0, originY + dy)
  updateDialogPosition(newLeft, newTop)
}

function onMouseUp() {
  dragging = false
  dragTarget = null
  window.removeEventListener('mousemove', onMouseMove)
}
</script>

<template>
  <div class="page-container">
    <el-card
      v-if="showDialog"
      class="search-dialog"
      :style="dialogStyle"
      body-style="padding: 0.5em 1em"
    >
      <div
        class="search-dialog-header"
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
        "
      >
        <h4 class="dialog-drag-handle" @mousedown="onMouseDown">
          拖动这里可以移动
        </h4>
        <el-button size="small" @click="showDialog = false">
          关闭
        </el-button>
      </div>
      <el-form label-width="5em">
        <el-form-item label="技能名称">
          <el-input
            v-model="searchText"
            clearable
            placeholder="请输入技能名称"
          />
        </el-form-item>
      </el-form>
      <div style="height: 300px; overflow-y: auto">
        <el-table :data="searchResult" style="width: 100%">
          <el-table-column label="预览" width="60" align="center">
            <template #default="{ row }">
              <img
                :ref="onImgRef"
                :data-src="idToSrc(row.id)"
                src="data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwgAAACH5BAEAAAIALAAAAAAQABAAAAM6CLrc/jDKSau9OOvNu/9gKI5kaZ5oqub5bSqVefrb7r3rtf1B7n8fqw7GZ0cL+o8P8fAQA7"
                loading="lazy"
                style="width: 24px; height: 24px"
                alt=""
              >
            </template>
          </el-table-column>
          <el-table-column prop="id" label="技能ID（十进制）" />
          <el-table-column prop="name" label="技能名称" />
        </el-table>
      </div>
    </el-card>
    <el-header class="header">
      <el-button size="small" type="success" @click="addSkill(activeTab)">
        新增技能
      </el-button>
      <el-button size="small" type="info" @click="showDialog = true">
        搜索技能ID
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
          @delete="(key) => deleteSkill('chinese', key)"
          @move="(from, to) => moveSkill('chinese', from, to)"
        />
      </el-tab-pane>
      <el-tab-pane :label="tabLabels.global" name="global">
        <KeySkillTable
          v-model:data="storeKeySkill.keySkillsData.global"
          @delete="(key) => deleteSkill('global', key)"
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
  gap: 0.5em;
  height: 40px;
  padding: 0;
}
.dialog-drag-handle {
  cursor: move;
  user-select: none;
  padding: 6px 12px;
  flex: 1;
  margin: 0.8em 0.4em;
  padding: 0.2em 0;
  text-align: center;
  cursor: move;
  user-select: none;
  font-weight: none;
  border: 1px solid rgba(0, 0, 0, 0.3);
  color: gray;
  font-size: 12px;
}
.search-dialog {
  transition: none;
}
</style>
