<template>
  <div class="bis-allocator">
    <div class="bis-toolbar">
      <el-button
        size="small"
        type="primary"
        plain
        @click="showConfigDialog = true"
        class="setup-trigger-btn"
      >
        <el-icon style="margin-right: 4px"><Setting /></el-icon>
        <span>设定 BIS</span>
        <span v-if="!isConfigComplete" class="dot-warn"></span>
      </el-button>

      <div v-if="!isConfigComplete" class="incomplete-warning">
        <el-icon><Warning /></el-icon>
        <span>配置未准备就绪</span>
      </div>

      <div style="flex: 1"></div>

      <el-button v-if="isConfigComplete" size="small" @click="copyTextTable">
        复制文本表格
      </el-button>
    </div>

    <!-- Main View: Recommendation Table -->
    <div v-if="isConfigComplete" class="bis-view-panel">
      <div class="table-container">
        <table class="bis-table">
          <thead>
            <tr>
              <th class="sticky-col col-layer" style="z-index: 30">层级</th>
              <th class="sticky-col col-item" style="z-index: 30">
                装备 \ 玩家
              </th>
              <th v-for="p in eligiblePlayers" :key="p">
                <PlayerDisplay
                  :name="p"
                  :role="getPlayerRole?.(p)"
                  :show-only-role="showOnlyRole"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="layer in layeredViewRows" :key="layer.name">
              <tr
                v-for="(row, rIdx) in layer.rows"
                :key="row.id"
                :class="{ 'is-layer-end': rIdx === layer.rows.length - 1 }"
              >
                <td
                  v-if="rIdx === 0"
                  :rowspan="layer.rows.length"
                  class="sticky-col col-layer layer-cell"
                >
                  {{ layer.name }}
                </td>
                <td class="sticky-col col-item row-header">{{ row.name }}</td>
                <td
                  v-for="p in eligiblePlayers"
                  :key="p"
                  :class="getCellClass(p, row)"
                >
                  <div class="cell-status-container">
                    <span class="status-main">{{
                      getStatusBaseText(p, row)
                    }}</span>
                    <span
                      v-if="
                        row.type === 'count' && getNeededCount(p, row.id) > 1
                      "
                      class="status-meta"
                    >
                      ({{ getObtainedCount(p, row) }}/{{
                        getNeededCount(p, row.id)
                      }})
                    </span>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Big Placeholder when incomplete -->
    <div v-else class="bis-onboarding">
      <div class="onboarding-card">
        <div class="icon-circle">
          <el-icon><List /></el-icon>
        </div>
        <h3>开启 BIS 分配</h3>
        <p>你还没有为团队成员设定 BIS，无法生成分配推荐。</p>
        <el-button type="primary" size="large" @click="showConfigDialog = true">
          立即开始配置
        </el-button>
      </div>
    </div>

    <el-dialog
      v-model="showConfigDialog"
      width="auto"
      append-to-body
      class="bis-config-dialog"
      destroy-on-close
      align-center
    >
      <div class="bis-config-panel-container">
        <div class="table-scroll-wrapper">
          <table class="bis-table config-table">
            <thead>
              <tr>
                <th class="sticky-col">装备 \ 玩家</th>
                <th
                  v-for="p in eligiblePlayers"
                  :key="p"
                  :class="[
                    { 'header-incomplete': !isPlayerComplete(p) },
                    getRoleGroupClass(getPlayerRole?.(p)),
                  ]"
                >
                  <div class="vert-header">
                    <PlayerDisplay
                      :name="p"
                      :role="getPlayerRole?.(p)"
                      :show-only-role="showOnlyRole"
                    />
                    <span v-if="!isPlayerComplete(p)" class="incomplete-label"
                      >（未填写）</span
                    >
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in configRows" :key="row.id">
                <td class="sticky-col row-header">{{ row.name }}</td>
                <td
                  v-for="p in eligiblePlayers"
                  :key="p"
                  class="split-cell-container"
                >
                  <div v-if="row.type === 'toggle'" class="split-cell">
                    <div
                      class="half-cell left-raid"
                      :class="{ active: isRaidBis(p, row.id) }"
                      @click="setBis(p, row.id, 'raid')"
                    >
                      零式
                    </div>
                    <div
                      class="half-cell right-tome"
                      :class="{ active: isTomeBis(p, row.id) }"
                      @click="setBis(p, row.id, 'tome')"
                    >
                      点数
                    </div>
                  </div>

                  <div v-else class="count-cell">
                    <div class="count-wrapper">
                      <el-input-number
                        :model-value="getNeededCount(p, row.id)"
                        :min="0"
                        :max="8"
                        size="small"
                        controls-position="right"
                        @update:model-value="
                          (v) => setNeededCount(p, row.id, v || 0)
                        "
                        class="mini-stepper"
                      />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <div class="footer-left">
            <el-button-group>
              <el-button size="default" @click="exportBisData"
                >导出 BIS 字符串</el-button
              >
              <el-button size="default" @click="importBisData"
                >导入 BIS 字符串</el-button
              >
            </el-button-group>
          </div>
          <div class="footer-right">
            <span v-if="!isConfigComplete" class="config-status-msg">
              还剩 {{ incompletePlayerCount }} 位成员未配置完成
            </span>
            <el-button
              type="primary"
              size="large"
              @click="showConfigDialog = false"
            >
              完成并关闭
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- Import Diff Confirmation Dialog -->
    <el-dialog
      v-model="showImportConfirmDialog"
      title="确认导入 BIS 配置"
      width="600px"
      append-to-body
      destroy-on-close
      align-center
    >
      <div v-if="importDiffs.length === 0" class="import-empty-msg">
        没有检测到有效的变更数据。
      </div>
      <div v-else class="import-diff-container">
        <p class="import-summary">
          检测到 {{ importDiffs.length }} 位玩家的配置变更。
        </p>
        <div v-for="diff in importDiffs" :key="diff.name" class="diff-card">
          <div class="diff-header">
            <PlayerDisplay
              :name="diff.name"
              :role="diff.role"
              :show-only-role="false"
            />
            <span class="diff-tag" v-if="diff.isNew">新配置</span>
            <span class="diff-tag update" v-else>更新</span>
          </div>
          <div class="diff-items">
            <div v-for="(change, idx) in diff.changes" :key="idx" class="diff-row">
              <span class="diff-label">{{ change.label }}</span>
              <div class="diff-values">
                <span class="val old">{{ change.oldVal }}</span>
                <el-icon><Right /></el-icon>
                <span class="val new">{{ change.newVal }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer" style="justify-content: flex-end; gap: 12px">
          <el-button @click="showImportConfirmDialog = false">取消</el-button>
          <el-button
            type="primary"
            @click="confirmImportBis"
            :disabled="importDiffs.length === 0"
          >
            确认应用
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { PartOrder } from '@/utils/lootParser'

export interface BisRow {
  id: string
  name: string
  keywords: string
  type: 'toggle' | 'count'
}

export type BisValue = 'raid' | 'tome' | number

export interface BisConfig {
  playerBis: Record<string, Record<string, BisValue>>
}

export interface LegacyBisConfig {
  playerBis: Record<string, string[]>
}

// prettier-ignore
export const DEFAULT_ROWS: BisRow[] = [
  { id: 'earring', name: '耳部', keywords: PartOrder.EarringBox, type: 'toggle' },
  { id: 'necklace', name: '颈部', keywords: PartOrder.NecklaceBox, type: 'toggle' },
  { id: 'bracelet', name: '腕部', keywords: PartOrder.BraceletBox, type: 'toggle' },
  { id: 'ring', name: '指环', keywords: PartOrder.RingBox, type: 'toggle' },
  { id: 'head', name: '头部', keywords: PartOrder.HeadBox, type: 'toggle' },
  { id: 'hands', name: '手臂', keywords: PartOrder.HandsBox, type: 'toggle' },
  { id: 'feet', name: '脚部', keywords: PartOrder.FeetBox, type: 'toggle' },
  { id: 'body', name: '身体', keywords: PartOrder.BodyBox, type: 'toggle' },
  { id: 'legs', name: '腿部', keywords: PartOrder.LegsBox, type: 'toggle' },
  { id: 'weapon', name: '武器箱', keywords: PartOrder.WeaponBox, type: 'toggle' },
  { id: 'twine', name: '强化纤维', keywords: PartOrder.Coating, type: 'count' },
  { id: 'coating', name: '硬化药', keywords: PartOrder.Twine, type: 'count' },
  { id: 'tome', name: '神典石', keywords: PartOrder.Tome, type: 'count' },
  { id: 'solvent', name: '强化药', keywords: PartOrder.Solvent, type: 'count' },
]

const LAYER_CONFIG = [
  { name: '一层', items: ['earring', 'necklace', 'bracelet', 'ring'] },
  { name: '二层', items: ['head', 'hands', 'feet', 'tome', 'coating'] },
  { name: '三层', items: ['body', 'legs', 'solvent', 'twine'] },
  { name: '四层', items: ['weapon'] },
]
</script>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { LootRecord } from '@/utils/lootParser'

import PlayerDisplay from './PlayerDisplay.vue'
import { Setting, Warning, List, Right } from '@element-plus/icons-vue'
import { PART_ORDER, DROP_ORDER } from '@/utils/lootParser'

const props = defineProps<{
  players: string[]
  records: LootRecord[]
  modelValue: BisConfig | LegacyBisConfig | undefined
  getPlayerRole?: (name: string) => string | null | undefined
  showOnlyRole?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: BisConfig): void
}>()

const showConfigDialog = ref(false)

const config = ref<BisConfig>({
  playerBis: {},
})

function exportBisData() {
  const parts = eligiblePlayers.value.map((p) => {
    const role = props.getPlayerRole?.(p) || 'Unknown'
    const data = DEFAULT_ROWS.map((row) => {
      const val = config.value.playerBis[p]?.[row.id]
      if (row.type === 'toggle') {
        if (val === 'raid') return '1'
        if (val === 'tome') return '2'
        return '0'
      } else {
        return (typeof val === 'number' ? val : 1).toString()
      }
    }).join('')
    return `${p}:${role}:${data}`
  })
  const str = parts.join(';')
  navigator.clipboard.writeText(str).then(() => {
    ElMessage.success('配置字符串已复制到剪贴板')
  })
}

function importBisData() {
  ElMessageBox.prompt('请粘贴 BIS 配置字符串', '导入配置', {
    confirmButtonText: '下一步',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '在此粘贴...',
    customClass: 'bis-import-message-box',
    inputValidator: (value) => {
      if (!value) return '内容不能为空'
      const parts = value.trim().split(';').filter((p) => p.trim())
      if (parts.length === 0) return '格式错误：无法识别有效的分隔符'

      let validCount = 0
      
      for (const part of parts) {
        const segs = part.split(':')
        
        if (segs.length !== 3) {
          return `数据格式错误："${part.slice(0, 10)}..."`
        }

        const [name, , data] = segs
        
        // 检查数据部分长度和内容
        if (!data || data.length !== DEFAULT_ROWS.length || !/^[0-9]+$/.test(data)) {
           return `数据校验失败：玩家 "${name || '未知'}" 的配置已损坏`
        }

        // 仅统计在这个队里的有效数据
        if (name && eligiblePlayers.value.includes(name)) {
           validCount++
        }
      }

      if (validCount === 0) return '未找到匹配当前团队的有效配置数据'
      return true
    },
  }).then(({ value }) => {
    if (!value) return
    parseAndPreviewBisData(value)
  }).catch(() => {
    // 用户取消
  })  
}

interface BisChange {
  label: string
  oldVal: string
  newVal: string
}

interface PlayerDiff {
  name: string
  role: string
  isNew: boolean
  changes: BisChange[]
  newConfig: Record<string, BisValue>
}

const showImportConfirmDialog = ref(false)
const importDiffs = ref<PlayerDiff[]>([])

function getValDisplay(row: BisRow, val: BisValue | undefined): string {
  if (row.type === 'toggle') {
    if (val === 'raid') return '零式'
    if (val === 'tome') return '点数'
    return '未设置'
  }
  return (val || 1).toString()
}

function parseAndPreviewBisData(rawInput: string) {
  try {
    const trimmedVal = rawInput.trim()
    if (!trimmedVal) throw new Error('输入内容为空')

    const parts = trimmedVal.split(';').filter((p) => p.trim())
    if (parts.length === 0) throw new Error('无效的格式')

    const diffs: PlayerDiff[] = []

    parts.forEach((part) => {
      const segs = part.split(':')
      if (segs.length < 3) return
      const [name, roleStr, data] = segs
      
      // 1. 校验名字是否存在于 eligiblePlayers
      if (!name || !eligiblePlayers.value.includes(name)) return // 名字不匹配直接忽略

      // 2. 校验职业是否匹配 (可选，严格模式)
      const currentRole = props.getPlayerRole?.(name)
      // 如果字符串里有职业信息且当前能获取到职业，则进行简单比对
      // 注意：roleStr 可能是 "D1", "Warrior" 等，这里做宽松匹配或直接跳过，既然要求匹配，我们假设必须一致
      // 但考虑到字符串生成时可能是 'Unknown'，这里主要校验 ID
      // 用户要求“职位和ID匹配”，我们检查 roleStr 是否与 getPlayerRole 返回的一致
      if (currentRole && roleStr && roleStr !== 'Unknown' && currentRole !== roleStr) {
         // 职业不匹配，跳过
         return 
      }

      if (!data || data.length !== DEFAULT_ROWS.length) return

      const newConfig: Record<string, BisValue> = {}
      let isValidRow = true

      DEFAULT_ROWS.forEach((row, idx) => {
        const char = data[idx]
        if (!char || !/[0-9]/.test(char)) {
            isValidRow = false
            return
        }

        if (row.type === 'toggle') {
          if (char === '1') newConfig[row.id] = 'raid'
          else if (char === '2') newConfig[row.id] = 'tome'
        } else {
          const num = parseInt(char)
          newConfig[row.id] = isNaN(num) ? 1 : num
        }
      })

      if (!isValidRow) return

      // 计算差异
      const currentConfig = (name && config.value.playerBis[name]) || {}
      const changes: BisChange[] = []
      let hasChanges = false

      DEFAULT_ROWS.forEach(row => {
        const oldV = currentConfig[row.id]
        const newV = newConfig[row.id]
        
        // 比较逻辑：如果不一致，添加差异
        // 注意 undefined 和 1 (count default) 的比较
        // 还有 toggle 的 undefined 和 'raid'/'tome'
        
        // 简化比较：转成 display string 比较
        const sOld = getValDisplay(row, oldV)
        const sNew = getValDisplay(row, newV)

        if (sOld !== sNew) {
          hasChanges = true
          changes.push({
            label: row.name,
            oldVal: sOld,
            newVal: sNew
          })
        }
      })

      if (hasChanges) {
        diffs.push({
          name: name!,
          role: currentRole || roleStr || 'Unknown',
          isNew: Object.keys(currentConfig).length === 0,
          changes,
          newConfig
        })
      }
    })

    if (diffs.length === 0) {
      ElMessage.info('未检测到有效的配置变更，或玩家信息不匹配。')
      return
    }

    importDiffs.value = diffs
    showImportConfirmDialog.value = true

  } catch (e: any) {
    console.error(e)
    ElMessage.error(e.message || '解析失败')
  }
}

function confirmImportBis() {
  const newPlayerBis = { ...config.value.playerBis }
  importDiffs.value.forEach(diff => {
    newPlayerBis[diff.name] = {
      ...newPlayerBis[diff.name],
      ...diff.newConfig
    }
  })
  config.value.playerBis = newPlayerBis
  showImportConfirmDialog.value = false
  ElMessage.success(`成功更新 ${importDiffs.value.length} 位玩家配置`)
}

const layeredViewRows = computed(() => {
  return LAYER_CONFIG.map((layer) => {
    const rows = layer.items
      .map((id) => DEFAULT_ROWS.find((r) => r.id === id))
      .filter((r): r is BisRow => !!r)
    return {
      name: layer.name,
      rows,
    }
  })
})

const viewRows = computed(() => {
  const order = DROP_ORDER as string[]
  return [...DEFAULT_ROWS].sort((a, b) => {
    const ia = order.indexOf(a.keywords)
    const ib = order.indexOf(b.keywords)
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
})

const configRows = computed(() => {
  const order = PART_ORDER as string[]
  return [...DEFAULT_ROWS].sort((a, b) => {
    const ia = order.indexOf(a.keywords)
    const ib = order.indexOf(b.keywords)
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
})

function isLegacyConfig(val: any): val is LegacyBisConfig {
  if (!val || typeof val !== 'object' || !val.playerBis) return false
  const firstKey = Object.keys(val.playerBis)[0]
  if (!firstKey) return false
  return Array.isArray(val.playerBis[firstKey])
}

function isEligible(player: string) {
  if (!props.getPlayerRole) return false
  const role = props.getPlayerRole(player)
  if (!role) return false
  return !role.startsWith('LEFT:') && !role.startsWith('SUB:')
}

const eligiblePlayers = computed(() => {
  return props.players.filter(isEligible)
})

const isConfigComplete = computed(() => {
  if (!eligiblePlayers.value || eligiblePlayers.value.length === 0) return false

  for (const p of eligiblePlayers.value) {
    for (const row of DEFAULT_ROWS) {
      if (row.type === 'toggle' && !config.value.playerBis[p]?.[row.id]) {
        return false
      }
    }
  }
  return true
})

function isPlayerComplete(player: string) {
  for (const row of DEFAULT_ROWS) {
    if (row.type === 'toggle' && !config.value.playerBis[player]?.[row.id]) {
      return false
    }
  }
  return true
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) {
      if (!isConfigComplete.value) showConfigDialog.value = true
      return
    }

    let migrated: BisConfig = { playerBis: {} }
    const raw = JSON.parse(JSON.stringify(newVal))

    if (isLegacyConfig(raw)) {
      Object.keys(raw.playerBis).forEach((player) => {
        migrated.playerBis[player] = {}
        const list = raw.playerBis[player]
        if (list) {
          list.forEach((id) => {
            if (migrated.playerBis[player]) {
              migrated.playerBis[player]![id] = 'raid'
            }
          })
        }
      })
    } else {
      migrated = raw as BisConfig
    }

    if (JSON.stringify(migrated) !== JSON.stringify(config.value)) {
      config.value = migrated
    }

    if (!isConfigComplete.value) {
      showConfigDialog.value = true
    }
  },
  { immediate: true, deep: true },
)

const incompletePlayerCount = computed(() => {
  return eligiblePlayers.value.filter((p) => !isPlayerComplete(p)).length
})

watch(
  config,
  (newVal) => {
    if (JSON.stringify(newVal) !== JSON.stringify(props.modelValue)) {
      emit('update:modelValue', newVal)
    }
  },
  { deep: true },
)

function isRaidBis(player: string, rowId: string) {
  return config.value.playerBis[player]?.[rowId] === 'raid'
}

function isTomeBis(player: string, rowId: string) {
  return config.value.playerBis[player]?.[rowId] === 'tome'
}

function getBisValue(player: string, rowId: string): BisValue | undefined {
  return config.value.playerBis[player]?.[rowId]
}

function getNeededCount(player: string, rowId: string): number {
  const val = config.value.playerBis[player]?.[rowId]
  return typeof val === 'number' ? val : 1
}

function setBis(player: string, rowId: string, type: BisValue) {
  if (!config.value.playerBis[player]) {
    config.value.playerBis[player] = {}
  }

  const current = config.value.playerBis[player]![rowId]

  if (current === type) {
    delete config.value.playerBis[player]![rowId]
  } else {
    config.value.playerBis[player]![rowId] = type
  }
}

function setNeededCount(player: string, rowId: string, count: number) {
  if (!config.value.playerBis[player]) {
    config.value.playerBis[player] = {}
  }
  config.value.playerBis[player]![rowId] = count
}

function getObtainedCount(player: string, row: BisRow): number {
  if (!props.records) return 0
  const keywords = row.keywords
    .replace(/，/g, ',')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (keywords.length === 0) return 0

  return props.records.filter((r) => {
    if (r.player !== player) return false
    return keywords.some((k) => r.item.includes(k))
  }).length
}

function hasObtained(player: string, row: BisRow): boolean {
  return getObtainedCount(player, row) > 0
}

function getLogicStatus(
  player: string,
  row: BisRow,
): 'need' | 'greed' | 'pass' {
  if (row.type === 'count') {
    const needed = getNeededCount(player, row.id)
    const obtained = getObtainedCount(player, row)
    return obtained >= needed ? 'pass' : 'need'
  }

  if (hasObtained(player, row)) return 'pass'

  const val = getBisValue(player, row.id)
  if (val === 'raid') return 'need'

  return 'greed'
}

const STATUS_MAP = {
  pass: { text: '放弃', class: 'status-pass' },
  need: { text: '需求', class: 'status-need' },
  greed: { text: '贪婪', class: 'status-greed-tome' },
} as const

function getStatusBaseText(player: string, row: BisRow): string {
  if (row.type === 'count' && getNeededCount(player, row.id) === 0) return '无需'
  const status = getLogicStatus(player, row)
  return STATUS_MAP[status]?.text || ''
}

function getDisplayText(player: string, row: BisRow): string {
  const baseText = getStatusBaseText(player, row)
  const needed = getNeededCount(player, row.id)
  // 只有当是数量型物品且需求量大于 1 时，才显示进度括号
  if (row.type === 'count' && baseText !== '无需' && needed > 1) {
    return `${baseText} (${getObtainedCount(player, row)}/${needed})`
  }
  return baseText
}

function getCellClass(player: string, row: BisRow): string {
  const status = getLogicStatus(player, row)
  return STATUS_MAP[status]?.class || ''
}

function getRoleGroupClass(role: string | null | undefined) {
  if (!role) return ''
  const r = role.toUpperCase()
  if (r.includes('MT') || r.includes('ST') || r === 'TANK') return 'role-tank'
  if (r.includes('H1') || r.includes('H2') || r === 'HEALER')
    return 'role-healer'
  if (r.match(/D\d/) || r === 'DPS') return 'role-dps'
  return ''
}


function copyTextTable() {
  let text = '\t' + eligiblePlayers.value.join('\t') + '\n'
  viewRows.value.forEach((row) => {
    const line = [row.name]
    eligiblePlayers.value.forEach((p) => {
      line.push(getDisplayText(p, row))
    })
    text += line.join('\t') + '\n'
  })

  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  })
}
</script>

<style lang="scss" scoped>
.bis-allocator {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.bis-toolbar {
  margin: 12px 12px 0px 12px;
  display: flex;
  align-items: center;
  min-height: 32px;
  gap: 12px;
}

.setup-trigger-btn {
  position: relative;
  font-weight: 600;
}

.dot-warn {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 8px;
  height: 8px;
  background: #f56c6c;
  border-radius: 50%;
  border: 1.5px solid white;
  box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.1);

  html.dark & {
    border-color: #1e1f29;
    box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.1);
  }
}

.incomplete-warning {
  color: #f56c6c;
  font-size: 13px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 4px;
}

.bis-onboarding {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 8px;
  margin: 0 12px 12px;
  border: 2px dashed #e2e8f0;
}

.onboarding-card {
  text-align: center;
  max-width: 400px;
  padding: 40px;

  h3 {
    font-size: 20px;
    color: #1e293b;
    margin: 16px 0 8px;
  }
  p {
    color: #64748b;
    margin-bottom: 24px;
    line-height: 1.6;
  }
}

.icon-circle {
  width: 64px;
  height: 64px;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto;
}

.bis-config-dialog {
  :deep(.el-dialog) {
    width: fit-content !important; 
    min-width: 600px;
    max-width: 95vw !important; 
    margin: 0 auto;
    border-radius: 12px;
    overflow: hidden;
  }

  :deep(.el-dialog__body) {
    padding: 20px;
    padding-top: 10px;
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.config-status-msg {
  color: #f56c6c;
  font-size: 13px;
  font-weight: 600;
}

.bis-view-panel {
  flex: 1;
  overflow: auto;
  border-radius: 6px;
  background: #f8fafc; 
  padding: 12px;
  padding-top: 0;
  box-shadow: none;

  .table-container {
    max-width: 1400px;
    margin: 0 auto;
  }
}

.bis-config-panel-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: fit-content;
  margin: 0 auto;
}

.table-scroll-wrapper {
  margin: 0 auto; 
  width: fit-content;
  max-width: 100%;
  border: 1px solid #475569;
  border-radius: 8px;
  overflow: auto;
  background: #fff;
  max-height: 75vh;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  mask-image: radial-gradient(white, black);

  &.is-editing {
    border-color: #3b82f6;
  }
}

.bis-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
  border: none;

  th,
  td {
    box-sizing: border-box;
    text-align: center;
    width: 72px;  
    padding: 0 !important;
    height: 32px;
    border-right: 1px solid #cbd5e1;
    border-bottom: 1px solid #cbd5e1;
    vertical-align: middle;

    &:last-child {
      border-right: 1px solid #475569; 
    }
  }

  tr:last-child td {
    border-bottom: 1px solid #475569; 
  }

  th {
    background: #f1f5f9;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    color: #475569;
    border-top: 1px solid #475569; 
    border-bottom: 1px solid #94a3b8; 
  }

  tr.is-layer-end td {
    border-bottom: 1px solid #475569;
  }

  .col-layer {
    width: 32px; 
    left: 0;
    border-left: 1px solid #475569; 
    border-right: 1px solid #475569;
  }

  .col-item {
    width: 70px;
    left: 32px; 
    font-weight: 700;
    color: #334155;
    border-right: 1px solid #475569;
  }

  .layer-cell {
    background: #f8fafc;
    color: #1e293b;
    font-weight: 800;
    font-size: 12px;
    writing-mode: vertical-rl;
    letter-spacing: 1px;
    padding: 0;
    line-height: 1;
    text-shadow: none;
    border-bottom-color: #475569;
  }

  td.col-item {
    background: #f8fafc;
  }

  &.config-table {
    width: max-content; 
    
    border: none !important;

    
    tr:first-child th {
      border-top: none !important;
    }

    
    .sticky-col {
      width: 100px;
      border-left: none !important;
      border-right: 1px solid #475569;
    }
    
    
    th:last-child,
    td:last-child {
      border-right: none !important;
    }

    
    tr:last-child td {
      border-bottom: none !important;
    }

    th,
    td {
      width: 120px; 
      border-right: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
    }
  }

  
  tbody tr,
  tbody tr:hover,
  tbody tr:hover > td,
  tbody tr:hover > th {
    background-color: transparent !important;
    background: none !important;
  }
}

.cell-status-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
  height: 100%;
}

.status-main {
  font-weight: 700;
}

.status-meta {
  font-size: 10px;
  font-weight: 500;
  opacity: 0.8;
  margin-top: 2px;
}

.vert-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
}

.incomplete-label {
  font-size: 10px;
  font-weight: bold;
  color: #ef4444 !important;
  margin-top: 2px;
}

.sticky-col {
  position: sticky;
  left: 0;
  z-index: 10;
}

.bis-table th.sticky-col {
  z-index: 20;
}

.status-need {
  background-color: #dcfce7 !important;
  color: #15803d !important;
}
.status-greed-tome {
  background-color: #f0f9ff !important;
  color: #0369a1 !important;
}
.status-pass {
  background-color: #f8fafc !important;
  color: #94a3b8 !important;
}

.row-header {
  text-align: center !important;
}

.split-cell {
  background: #f1f5f9;
  border-radius: 6px;
  margin: 0 auto;
  padding: 2px;
  display: flex;
  gap: 2px;
  width: 84px;
  height: 24px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  box-sizing: border-box;
}

.half-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.5px;

  &.left-raid.active {
    background: #818cf8;
    color: #fff;
    box-shadow: 0 1px 2px rgba(99, 102, 241, 0.2);
  }

  &.right-tome.active {
    background: #0ea5e9;
    color: #fff;
    box-shadow: 0 1px 2px rgba(14, 165, 233, 0.2);
  }

  &:not(.active):hover {
    background: rgba(255, 255, 255, 0.8);
    color: #475569;
  }
}

.count-value {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  color: #64748b;
  font-size: 12px;
}

.mini-stepper {
  width: 76px !important;
  :deep(.el-input__wrapper) {
    padding-left: 8px;
    padding-right: 30px;
    box-shadow: 0 0 0 1px #e2e8f0 inset;
    background-color: #f8fafc;
    &:hover, &.is-focus {
      box-shadow: 0 0 0 1px #3b82f6 inset;
    }
  }
  :deep(.el-input-number__increase),
  :deep(.el-input-number__decrease) {
    width: 24px;
    background: #f1f5f9;
    border-left: 1px solid #e2e8f0;
    color: #64748b;
    &:hover {
      color: #3b82f6;
      background: #eff6ff;
    }
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

:global(.dark) .bis-allocator {
  .config-header-actions {
    background: #1e1f29;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .bis-view-panel {
    background: #16171f;
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: none;
  }

  .table-scroll-wrapper {
    background: #16171f;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .bis-table {
    th,
    td {
      border-right-color: #334155;
      border-bottom-color: #1e1f29;
    }

    th {
      border-top-color: #1e293b;
      background: #1e1f29;
      color: #94a3b8;
      border-bottom-color: #475569;
    }

    tr.is-layer-end td {
      border-bottom-color: #475569;
    }

    .col-layer {
      background: #1e1f29;
      border-left-color: #475569;
      border-right-color: #475569;
    }

    .col-item {
      background: #1e1f29;
      border-right-color: #475569;
    }

    .layer-cell {
      background: #1e1f29;
      color: #cbd5e1;
      border-bottom-color: #475569;
    }

    td.col-item {
      background: #1e1f29;
    }

    
    .status-need {
      background-color: #064e3b !important;
      color: #6ee7b7 !important;
    }
    .status-greed-tome {
      background-color: #0c4a6e !important;
      color: #7dd3fc !important;
    }
    .status-pass {
      background-color: #1e293b !important;
      color: #64748b !important;
    }
  }

  .split-cell {
    background: #0f1016;
    border-color: rgba(255, 255, 255, 0.1);
  }
  .half-cell:not(.active) {
    color: #475569;
    &:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;
    }
  }

  .mini-stepper {
    :deep(.el-input__wrapper) {
      background-color: #0f1016;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    }
    :deep(.el-input-number__increase),
    :deep(.el-input-number__decrease) {
      background: #1e1f29;
      border-left-color: rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      &:hover {
        background: #2d2e3a;
        color: #fff;
      }
    }
    :deep(.el-input__inner) {
      color: #cbd5e1;
    }
  }

  .row-header {
    color: #94a3b8;
  }
}

.import-diff-container {
  max-height: 500px;
  overflow-y: auto;
  padding: 4px;
}

.import-empty-msg {
  text-align: center;
  padding: 40px;
  color: #64748b;
  font-size: 14px;
}

.import-summary {
  margin-bottom: 16px;
  color: #475569;
  font-weight: 600;
  font-size: 14px;
}

.diff-card {
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 12px;
  overflow: hidden;

  html.dark & {
    background: #1e1f29;
    border-color: #334155;
  }
}

.diff-header {
  padding: 12px 16px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;

  html.dark & {
    background: #2a2b36;
    border-bottom-color: #334155;
  }
}

.diff-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
  background: #dcfce7;
  color: #15803d;

  &.update {
    background: #e0f2fe;
    color: #0369a1;
  }
}

.diff-items {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diff-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  padding-bottom: 4px;
  border-bottom: 1px dashed #e2e8f0;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  
  html.dark & {
    border-bottom-color: #334155;
  }
}

.diff-label {
  color: #64748b;
  min-width: 60px;
}

.diff-values {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .val {
    font-weight: 600;
    
    &.old {
      color: #94a3b8;
      text-decoration: line-through;
    }
    
    &.new {
      color: #3b82f6;
    }
  }
}
</style>

<style lang="scss">
.bis-import-message-box {
  .el-textarea__inner {
    min-height: 84px !important;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
  }
}
</style>
