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
        <span>设置 BIS</span>
        <span v-if="!isConfigComplete" class="dot-warn"></span>
      </el-button>

      <el-dropdown
        v-if="isConfigComplete"
        trigger="click"
        @command="handleCopyMacro"
      >
        <el-button size="small">
          复制分配宏<el-icon class="el-icon--right"><arrow-down /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="all"> 全层 </el-dropdown-item>
            <el-dropdown-item
              v-for="layer in layeredViewRows"
              :key="layer.name"
              :command="layer"
              divided
            >
              {{ layer.name }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-popover
        v-if="isConfigComplete"
        placement="top"
        title="分配宏生成规则"
        :width="320"
        trigger="hover"
      >
        <template #reference>
          <el-icon class="macro-help-icon"><QuestionFilled /></el-icon>
        </template>
        <div class="macro-help-content">
          <div class="intro">生成可以直接在游戏内发送的分配宏（/p）。</div>
          <div class="rule-item">
            <strong>1. 优先需求</strong>
            <span>仅显示BIS设为“零式”且尚未获得的玩家。</span>
          </div>
          <div class="rule-item">
            <strong>2. 次选贪婪</strong>
            <span>若无需求者，显示其余尚未获得的玩家。</span>
          </div>
          <div class="rule-item">
            <strong>3. 兜底机制</strong>
            <span>若全员不需要，显示“随便ROLL”。</span>
          </div>
        </div>
      </el-popover>

      <el-dropdown
        trigger="click"
        :hide-on-click="false"
        max-height="400px"
        v-if="isConfigComplete"
      >
        <el-button size="small" type="warning" plain style="margin-left: 12px">
          <el-icon style="margin-right: 4px"><User /></el-icon>
          设置请假
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="p in eligiblePlayers" :key="p">
              <el-checkbox
                :model-value="excludedPlayers.has(p)"
                @change="togglePlayerExclusion(p)"
                size="small"
                style="width: 100%"
              >
                {{ props.getPlayerRole?.(p) || p }}
                <span
                  v-if="excludedPlayers.has(p)"
                  style="font-size: 12px; color: #909399; margin-left: 4px"
                  >(请假)</span
                >
              </el-checkbox>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div v-if="isConfigComplete" class="bis-view-panel">
      <div class="table-container">
        <table class="bis-table">
          <thead>
            <tr>
              <th class="sticky-col col-layer" style="z-index: 30"></th>
              <th class="sticky-col col-item" style="z-index: 30">
                装备 \ 玩家
              </th>
              <th
                v-for="p in eligiblePlayers"
                :key="p"
                :class="{ 'is-excluded': excludedPlayers.has(p) }"
              >
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

    <div v-else class="bis-onboarding">
      <div class="onboarding-card">
        <div class="icon-circle">
          <el-icon><List /></el-icon>
        </div>
        <h3>开启 BIS 分配</h3>
        <p>尚未设置团队成员的 BIS，无法生成分配推荐。</p>
        <el-button type="primary" size="large" @click="showConfigDialog = true">
          立即开始设置
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
        <div class="bis-config-header-row">
          <div class="bis-storage-info">
            <el-icon><InfoFilled /></el-icon>
            <span>提示：此 BIS 设置跟随职位（MT/ST等），不跟随具体玩家。</span>
          </div>
          <div class="planned-weeks-config">
            <span class="label">你们计划清几周CD：</span>
            <el-input-number
              v-model="config.plannedWeeks"
              :min="1"
              :max="16"
              size="small"
              controls-position="right"
              class="weeks-stepper"
            />
          </div>
        </div>
        <div v-if="validationAlerts.length > 0" class="validation-alerts">
          <div
            v-for="alert in validationAlerts"
            :key="alert.id"
            :class="['validation-alert', alert.type]"
          >
            <el-icon class="alert-icon">
              <InfoFilled v-if="alert.type === 'info'" />
              <Warning v-else />
            </el-icon>
            <span class="alert-msg">{{ alert.message }}</span>
          </div>
        </div>
        <div class="table-scroll-wrapper">
          <table class="bis-table config-table">
            <thead>
              <tr>
                <th class="sticky-col">装备 \ 玩家</th>
                <th
                  v-for="p in eligiblePlayers"
                  :key="p"
                  :class="[
                    {
                      'header-incomplete': !checkPlayerComplete(
                        config,
                        getStorageKey(p),
                      ),
                    },
                    { 'is-excluded': excludedPlayers.has(p) },
                    getRoleGroupClass(getPlayerRole?.(p)),
                  ]"
                >
                  <div class="vert-header">
                    <PlayerDisplay
                      :name="p"
                      :role="getPlayerRole?.(p)"
                      :show-only-role="showOnlyRole"
                    />
                    <span
                      v-if="!checkPlayerComplete(config, getStorageKey(p))"
                      class="incomplete-label"
                      >（未填写）</span
                    >
                    <div class="preset-apply-zone">
                      <el-dropdown
                        v-if="getPresetsForRole(getPlayerRole?.(p)).length > 0"
                        trigger="click"
                        @command="(cmd: any) => applyPreset(p, cmd)"
                      >
                        <el-button
                          size="small"
                          plain
                          type="primary"
                          class="preset-btn"
                        >
                          <el-icon class="magic-icon"><MagicStick /></el-icon>
                          <span>一键预设</span>
                        </el-button>
                        <template #dropdown>
                          <el-dropdown-menu class="bis-preset-dropdown">
                            <el-dropdown-item
                              v-for="preset in getPresetsForRole(
                                getPlayerRole?.(p),
                              )"
                              :key="preset.name"
                              :command="preset"
                            >
                              <div class="preset-item-content">
                                <el-icon><MagicStick /></el-icon>
                                <span>{{ preset.name }}</span>
                              </div>
                            </el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                    </div>
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
              <el-button size="small" @click="exportBisData"
                >导出设置字符串</el-button
              >
              <el-button size="small" @click="importBisData"
                >导入设置字符串</el-button
              >
            </el-button-group>
          </div>
          <div class="footer-right">
            <div class="config-status-msg">
              <span v-if="incompletePlayerCount > 0">
                还剩 {{ incompletePlayerCount }} 个职位的 BIS 尚未填完
              </span>
            </div>
            <el-button
              type="primary"
              size="small"
              @click="showConfigDialog = false"
            >
              完成并关闭
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showImportConfirmDialog"
      title="确认导入 BIS 设置"
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
          检测到 {{ importDiffs.length }} 位玩家的设置变更。
        </p>
        <div v-for="diff in importDiffs" :key="diff.name" class="diff-card">
          <div class="diff-header">
            <PlayerDisplay
              :name="diff.name"
              :role="diff.role"
              :show-only-role="false"
            />
            <span class="diff-tag" v-if="diff.isNew">新设置</span>
            <span class="diff-tag update" v-else>更新</span>
          </div>
          <div class="diff-items">
            <div
              v-for="(change, idx) in diff.changes"
              :key="idx"
              class="diff-row"
            >
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

<script setup lang="ts">
import {
  DEFAULT_ROWS,
  LAYER_CONFIG,
  type BisConfig,
  type BisRow,
  type BisValue,
  type LegacyBisConfig,
  isPlayerComplete as checkPlayerComplete,
} from '@/utils/bisUtils'
import type { LootRecord } from '@/utils/lootParser'
import { getRoleType, ROLE_DEFINITIONS } from '@/utils/lootParser'
import {
  ArrowDown,
  List,
  QuestionFilled,
  Right,
  Setting,
  User,
  InfoFilled,
  Warning,
  MagicStick,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, ref, watch } from 'vue'

import { PART_ORDER } from '@/utils/lootParser'
import { getCurrentWeekNumber } from '@/utils/raidWeekUtils'

import PlayerDisplay from './PlayerDisplay.vue'
import { getPresetsForRole, type BisPreset } from '@/utils/bisPresets'

function generateEquipLines(rows: BisRow[]): string[] {
  const lines: string[] = []
  rows.forEach((row) => {
    const needs: string[] = []
    const greeds: string[] = []

    eligiblePlayers.value.forEach((p) => {
      if (excludedPlayers.value.has(p)) return

      let displayName = props.getPlayerRole?.(p) || p
      displayName = displayName.replace(/^LEFT:/, '').trim()

      const status = getLogicStatus(p, row)
      if (status === 'need') {
        needs.push(displayName)
      } else if (status === 'greed') {
        greeds.push(displayName)
      }
    })

    let content = ''
    if (needs.length > 0) {
      content = needs.join('、')
    } else if (greeds.length > 0) {
      content = greeds.join('、')
    } else {
      content = '随便ROLL'
    }

    lines.push(`/p ${row.name}：${content}`)
  })
  return lines
}

function getFF14WeekNumber(): number {
  if (!props.records || props.records.length === 0) return 1
  return getCurrentWeekNumber(props.records.map((r) => r.timestamp))
}

function handleCopyMacro(command: { name: string; rows: BisRow[] } | 'all') {
  const now = new Date()
  const weekNum = getFF14WeekNumber()
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`
  let text = ''
  let message = ''

  if (command === 'all') {
    const lines = [`/p <第${weekNum}周分配优先级> ${dateStr}`]

    layeredViewRows.value.forEach((layer) => {
      lines.push(...generateEquipLines(layer.rows))
    })

    text = lines.join('\n')
    message = '已复制全层宏 (共' + lines.length + '行)'
  } else {
    const lines = [`/p <第${weekNum}周${command.name}分配优先级> ${dateStr}`]
    lines.push(...generateEquipLines(command.rows))
    text = lines.join('\n')
    message = `已复制 ${command.name} 分配宏`
  }

  if (!text) return

  navigator.clipboard
    .writeText(text)
    .then(() => {
      ElMessage.success(message)
    })
    .catch(() => {
      ElMessage.error('复制失败')
    })
}

const props = defineProps<{
  players: string[]
  records: LootRecord[]
  modelValue: BisConfig | LegacyBisConfig | undefined
  getPlayerRole?: (name: string) => string | null | undefined
  getActualPlayer?: (p: string) => string
  showOnlyRole?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: BisConfig): void
}>()

const showConfigDialog = ref(false)
const excludedPlayers = ref<Set<string>>(new Set())

const config = ref<BisConfig>({
  playerBis: {},
  plannedWeeks: 8,
})

function togglePlayerExclusion(player: string) {
  if (excludedPlayers.value.has(player)) {
    excludedPlayers.value.delete(player)
  } else {
    excludedPlayers.value.add(player)
  }
}

function getStorageKey(player: string): string {
  if (!props.getPlayerRole) return player
  const role = props.getPlayerRole(player)
  if (role && !role.startsWith('LEFT:') && !role.startsWith('SUB:')) {
    return role
  }
  return player
}

function exportBisData() {
  const parts = eligiblePlayers.value.map((p) => {
    const role = props.getPlayerRole?.(p) || 'Unknown'
    const storageKey = getStorageKey(p)
    const dataBinary = DEFAULT_ROWS.map((row) => {
      const val = config.value.playerBis[storageKey]?.[row.id]
      if (row.type === 'toggle') {
        // 1=零式, 0=点数 (或未设置)
        return val === 'raid' ? '1' : '0'
      } else {
        // 如果有数量则为 1，否则为 0 (符合 1-count 规则)
        return typeof val === 'number' && val > 0 ? '1' : '0'
      }
    }).join('')
    // 将 14 位二进制字符串转换为 36 进制进行压缩
    const data = parseInt(dataBinary, 2).toString(36)
    return `${p}:${role}:${data}`
  })
  let str = parts.join(';')
  navigator.clipboard.writeText(str).then(() => {
    ElMessage.success('设置字符串已复制到剪贴板')
  })
}

function importBisData() {
  ElMessageBox.prompt('请粘贴 BIS 设置字符串', '导入设置', {
    confirmButtonText: '下一步',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '在此粘贴...',
    customClass: 'bis-import-message-box',
    inputValidator: (value) => {
      if (!value) return '内容不能为空'
      const parts = value
        .trim()
        .split(';')
        .filter((p) => p.trim())
      if (parts.length === 0) return '格式错误：无法识别有效的分隔符'

      let validCount = 0

      for (const part of parts) {
        if (part.startsWith('weeks:')) continue
        const segs = part.split(':')

        if (segs.length !== 3) {
          return `数据格式错误："${part.slice(0, 10)}..."`
        }

        const [name, , data] = segs

        if (!data || !/^[0-9a-z]+$/i.test(data)) {
          return `数据校验失败：玩家 "${name || '未知'}" 的设置已损坏`
        }

        if (name && eligiblePlayers.value.includes(name)) {
          validCount++
        }
      }

      if (validCount === 0) return '未找到匹配当前团队的有效设置数据'
      return true
    },
  })
    .then(({ value }) => {
      if (!value) return
      parseAndPreviewBisData(value)
    })
    .catch(() => {
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

    importWeeks.value = undefined
    parts.forEach((part) => {
      if (part.startsWith('weeks:')) {
        const weeks = parseInt(part.split(':')[1] || '0')
        if (!isNaN(weeks)) {
          importWeeks.value = weeks
        }
        return
      }
      const segs = part.split(':')
      if (segs.length < 3) return
      const name = segs[0]
      const roleStr = segs[1]
      const data = segs[2]

      if (!name || !data || !eligiblePlayers.value.includes(name)) return // 名字不匹配直接忽略

      const currentRole = props.getPlayerRole?.(name as string)
      if (
        currentRole &&
        roleStr &&
        roleStr !== 'Unknown' &&
        currentRole !== roleStr
      ) {
        // 职业不匹配，跳过
        return
      }

      // 判定是否是旧版（14位纯数字）还是新版（压缩后的Base36）
      const dataBinary =
        data.length === DEFAULT_ROWS.length && /^[012]+$/.test(data)
          ? data
          : parseInt(data, 36).toString(2).padStart(DEFAULT_ROWS.length, '0')

      const newConfig: Record<string, BisValue> = {}
      let isValidRow = true

      DEFAULT_ROWS.forEach((row, idx) => {
        const char = dataBinary[idx]
        if (!char) {
          isValidRow = false
          return
        }

        if (row.type === 'toggle') {
          // 在新版二进制中：1=raid, 0=tome
          // 为兼容旧版：1=raid, 2=tome, 0=none
          if (char === '1') newConfig[row.id] = 'raid'
          else newConfig[row.id] = 'tome'
        } else {
          // 在新版二进制中：1=1, 0=0
          newConfig[row.id] = char === '1' ? 1 : 0
        }
      })

      if (!isValidRow) return

      const storageKey = getStorageKey(name as string)
      const currentConfig =
        (storageKey && config.value.playerBis[storageKey]) || {}
      const changes: BisChange[] = []
      let hasChanges = false

      DEFAULT_ROWS.forEach((row) => {
        const oldV = currentConfig[row.id]
        const newV = newConfig[row.id]

        const sOld = getValDisplay(row, oldV)
        const sNew = getValDisplay(row, newV)

        if (sOld !== sNew) {
          hasChanges = true
          changes.push({
            label: row.name,
            oldVal: sOld,
            newVal: sNew,
          })
        }
      })

      if (hasChanges) {
        diffs.push({
          name: name!,
          role: currentRole || roleStr || 'Unknown',
          isNew: Object.keys(currentConfig).length === 0,
          changes,
          newConfig,
        })
      }
    })

    if (diffs.length === 0) {
      ElMessage.info('未检测到有效的设置变更，或玩家信息不匹配。')
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
  confirmImportAction()
}

// 稍微重构一下以支持周数导入
const importWeeks = ref<number | undefined>(undefined)

function confirmImportAction() {
  const newPlayerBis = { ...config.value.playerBis }
  importDiffs.value.forEach((diff) => {
    const storageKey = getStorageKey(diff.name)
    newPlayerBis[storageKey] = {
      ...newPlayerBis[storageKey],
      ...diff.newConfig,
    }
  })
  config.value.playerBis = newPlayerBis
  if (importWeeks.value !== undefined) {
    config.value.plannedWeeks = importWeeks.value
  }
  showImportConfirmDialog.value = false
  ElMessage.success(`成功更新 ${importDiffs.value.length} 位玩家设置`)
}

function setBis(player: string, rowId: string, type: BisValue) {
  const storageKey = getStorageKey(player)
  if (!config.value.playerBis[storageKey])
    config.value.playerBis[storageKey] = {}
  const current = config.value.playerBis[storageKey]![rowId]
  if (current === type) {
    delete config.value.playerBis[storageKey]![rowId]
  } else {
    config.value.playerBis[storageKey]![rowId] = type
  }
}

function setNeededCount(player: string, rowId: string, count: number) {
  const storageKey = getStorageKey(player)
  if (!config.value.playerBis[storageKey])
    config.value.playerBis[storageKey] = {}
  config.value.playerBis[storageKey]![rowId] = count
}

function applyPreset(player: string, preset: BisPreset) {
  const storageKey = getStorageKey(player)
  if (!config.value.playerBis[storageKey]) {
    config.value.playerBis[storageKey] = {}
  }

  // 直接合并预设配置
  Object.assign(config.value.playerBis[storageKey], preset.config)

  ElMessage.success(`已应用预设: ${preset.name} (${player})`)
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
    const actual = props.getActualPlayer
      ? props.getActualPlayer(r.player)
      : r.player
    if (actual !== player) return false
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
    if (needed === 0) return 'greed'
    return getObtainedCount(player, row) >= needed ? 'pass' : 'need'
  }
  if (hasObtained(player, row)) return 'pass'
  return getBisValue(player, row.id) === 'raid' ? 'need' : 'greed'
}

function getStatusBaseText(player: string, row: BisRow): string {
  const status = getLogicStatus(player, row)
  return STATUS_MAP[status]?.text || ''
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
  for (const role of ROLE_DEFINITIONS) {
    if (!checkPlayerComplete(config.value, role)) return false
  }
  return true
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) {
      return
    }

    if (isLegacyConfig(newVal)) {
      const migrated: BisConfig = { playerBis: {} }
      const raw = JSON.parse(JSON.stringify(newVal))
      Object.keys(raw.playerBis).forEach((player) => {
        migrated.playerBis[player] = {}
        const list = raw.playerBis[player]
        if (list) {
          list.forEach((id: string) => {
            if (migrated.playerBis[player]) {
              migrated.playerBis[player]![id] = 'raid'
            }
          })
        }
      })
      config.value = migrated
    } else {
      const standard = newVal as BisConfig
      if (JSON.stringify(standard) !== JSON.stringify(config.value)) {
        config.value = {
          ...standard,
          plannedWeeks: standard.plannedWeeks ?? 8,
        }
      }
    }
  },
  { immediate: true, deep: true },
)

const incompletePlayerCount = computed(() => {
  return ROLE_DEFINITIONS.filter(
    (role) => !checkPlayerComplete(config.value, role),
  ).length
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

const STATUS_MAP = {
  pass: { text: '放弃', class: 'status-pass' },
  need: { text: '需求', class: 'status-need' },
  greed: { text: '贪婪', class: 'status-greed-tome' },
} as const

function getBisValue(player: string, rowId: string): BisValue | undefined {
  return config.value.playerBis[getStorageKey(player)]?.[rowId]
}

function isRaidBis(player: string, rowId: string) {
  return getBisValue(player, rowId) === 'raid'
}

function isTomeBis(player: string, rowId: string) {
  return getBisValue(player, rowId) === 'tome'
}

function getNeededCount(player: string, rowId: string): number {
  const val = getBisValue(player, rowId)
  if (typeof val === 'number') return val
  // 神典石和强化药默认限制为 0，纤维和硬化药默认为 1
  return ['tome', 'solvent'].includes(rowId) ? 0 : 1
}

function getCellClass(player: string, row: BisRow): string {
  const status = getLogicStatus(player, row)
  const base = STATUS_MAP[status]?.class || ''
  return excludedPlayers.value.has(player) ? `${base} is-excluded` : base
}

const getRoleGroupClass = getRoleType

const validationAlerts = computed(() => {
  const alerts: { id: string; type: 'info' | 'warning'; message: string }[] = []
  const weeks = config.value.plannedWeeks || 8

  const itemsToValidate = [
    { id: 'coating', name: '硬化药' },
    { id: 'twine', name: '强化纤维' },
    { id: 'tome', name: '神典石' },
    { id: 'solvent', name: '强化药' },
  ]

  itemsToValidate.forEach((item) => {
    let total = 0
    eligiblePlayers.value.forEach((p) => {
      total += getNeededCount(p, item.id)
    })

    if (total > weeks) {
      alerts.push({
        id: item.id,
        type: 'warning',
        message: `${item.name}: 总需求(${total}) 大于 计划周数(${weeks})，这是不可能的分配。`,
      })
    }
  })

  return alerts
})
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

.macro-help-icon {
  color: #94a3b8;
  cursor: pointer;
  margin-left: 4px;
  font-size: 16px;
  outline: none;

  &:hover {
    color: #475569;
  }
}

.macro-help-content {
  font-size: 13px;
  line-height: 1.5;
  color: #334155;

  html.dark & {
    color: #e2e8f0;
  }

  .intro {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;

    html.dark & {
      color: #94a3b8;
      border-color: #334155;
    }
  }

  .rule-item {
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    strong {
      display: block;
      color: #3b82f6;
      font-weight: 600;
      margin-bottom: 2px;
    }

    span {
      display: block;
      color: #475569;
      html.dark & {
        color: #cbd5e1;
      }
    }
  }
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

.bis-storage-info {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;

  html.dark & {
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
  }
}

.bis-config-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;

  .bis-storage-info {
    margin-bottom: 0;
    flex: 1;
  }
}

.planned-weeks-config {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;

  html.dark & {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    html.dark & {
      color: #94a3b8;
    }
  }

  .weeks-stepper {
    width: 80px !important;
  }
}

.validation-alerts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.validation-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;

  &.info {
    background: #f0f9ff;
    color: #0369a1;
    border: 1px solid #e0f2fe;
    html.dark & {
      background: rgba(14, 165, 233, 0.1);
      border-color: rgba(14, 165, 233, 0.2);
    }
  }

  &.warning {
    background: #fff1f2;
    color: #be123c;
    border: 1px solid #ffe4e6;
    html.dark & {
      background: rgba(244, 63, 94, 0.1);
      border-color: rgba(244, 63, 94, 0.2);
    }
  }

  .alert-icon {
    font-size: 14px;
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
    font-size: 11px;
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0;
    padding: 0;
    line-height: 1.1;
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
  color: #f87171 !important;
  margin-top: 1px;
  margin-bottom: 2px;
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
  border-radius: 8px;
  margin: 0 auto;
  padding: 3px;
  display: flex;
  gap: 4px;
  width: 92px;
  height: 28px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  box-sizing: border-box;
}

.half-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 1px;
  white-space: nowrap;

  &.left-raid.active {
    background: #6366f1;
    color: #fff;
    box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
  }

  &.right-tome.active {
    background: #0ea5e9;
    color: #fff;
    box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);
  }

  &:not(.active):hover {
    background: #fff;
    color: #64748b;
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
    &:hover,
    &.is-focus {
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

.preset-apply-zone {
  margin-top: 6px;
  display: flex;
  justify-content: center;
}

.preset-btn {
  height: 22px !important;
  padding: 0 8px !important;
  font-size: 11px !important;
  border-radius: 4px !important;
  background: rgba(99, 102, 241, 0.05) !important;
  border: 1px solid rgba(99, 102, 241, 0.2) !important;
  transition: all 0.2s ease !important;
  font-weight: 600 !important;

  &:hover {
    background: #6366f1 !important;
    color: #fff !important;
    border-color: #6366f1 !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
  }

  .magic-icon {
    margin-right: 4px;
    font-size: 12px;
  }
}

.preset-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
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

html.dark {
  .bis-allocator {
    .config-header-actions {
      background: #1e1f29;
      border-color: rgba(255, 255, 255, 0.1);
    }

    .bis-view-panel {
      background: #16171f;
      border-color: rgba(255, 255, 255, 0.08);
      box-shadow: none;
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

    .row-header {
      color: #94a3b8;
    }

    .bis-onboarding {
      background: #16171f;
      border-color: rgba(255, 255, 255, 0.08);
    }

    .onboarding-card {
      h3 {
        color: rgba(255, 255, 255, 0.9);
      }
      p {
        color: #94a3b8;
      }
    }

    .icon-circle {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }
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

.is-excluded {
  opacity: 0.4;
  text-decoration: line-through;
  filter: grayscale(1);
  background-color: rgba(0, 0, 0, 0.02) !important;

  html.dark & {
    background-color: rgba(255, 255, 255, 0.05) !important;
  }
}
</style>

<style lang="scss">
html.dark {
  .bis-config-dialog,
  .bis-import-message-box {
    .el-dialog,
    .el-message-box {
      background-color: #1a1b26;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }

    .table-scroll-wrapper {
      background: #1a1b26;
      border-color: #2d2e3d;
      &::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      &::-webkit-scrollbar-thumb {
        background: #2d2e3d;
        border-radius: 4px;
      }
    }

    .bis-table {
      background-color: #1a1b26;
      border-top: 1px solid #2d2e3d;

      th {
        background-color: #1a1b26 !important;
        color: #9ca3af;
        border-right-color: #2d2e3d;
        border-bottom: 2px solid #232433;
        font-weight: 600;
      }

      td {
        background-color: #1a1b26 !important;
        border-right-color: #2d2e3d;
        border-bottom-color: #232433;
        color: #d1d5db;
      }

      tr:hover td {
        background-color: rgba(255, 255, 255, 0.02);
      }
    }

    .header-incomplete {
      background-color: rgba(244, 63, 94, 0.1) !important;
      color: #fb7185 !important;
    }

    .split-cell {
      background: #1a1b26;
      border-color: #2d2e3d;
      padding: 3px;
    }

    .half-cell:not(.active) {
      color: #4b5563;
      &:hover {
        background: rgba(255, 255, 255, 0.04);
        color: #9ca3af;
      }
    }

    .half-cell.active {
      &.left-raid {
        background: #4f46e5;
        box-shadow:
          0 4px 6px -1px rgba(0, 0, 0, 0.3),
          0 0 10px rgba(79, 70, 229, 0.2);
      }
      &.right-tome {
        background: #0284c7;
        box-shadow:
          0 4px 6px -1px rgba(0, 0, 0, 0.3),
          0 0 10px rgba(2, 132, 199, 0.2);
      }
    }

    .mini-stepper {
      .el-input__wrapper {
        background-color: #1a1b26 !important;
        border: 1px solid #2d2e3d !important;
        box-shadow: none !important;
      }
      .el-input-number__increase,
      .el-input-number__decrease {
        background: #11121d !important;
        border-color: #2d2e3d !important;
        color: #6b7280 !important;
        &:hover {
          background: #1a1b26 !important;
          color: #3b82f6 !important;
        }
      }
      .el-input__inner {
        color: #e5e7eb !important;
      }
    }

    .row-header {
      color: #9ca3af;
      background-color: #1a1b26 !important;
    }

    .sticky-col {
      background-color: #1a1b26 !important;
      border-right-color: #2d2e3d !important;
    }
  }

  .bis-import-message-box {
    .el-textarea__inner {
      background-color: #11121d;
      color: #d1d5db;
      border-color: #2d2e3d;
      &:focus {
        border-color: #3b82f6;
      }
    }
  }
}

.bis-import-message-box {
  .el-textarea__inner {
    min-height: 84px !important;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
  }
}
</style>
