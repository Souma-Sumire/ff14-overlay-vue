<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import type { WayMarkObj } from '@/types/PostNamazu'
import { ElNotification } from 'element-plus'
import { computed, onMounted, onUnmounted, ref, toRaw } from 'vue'
import UserCard from '@/components/UserCard.vue'
import { useDev } from '@/composables/useDev'
import { useIndexedDB } from '@/composables/useIndexedDB'
import { useWebSocket } from '@/composables/useWebSocket'
import { worlds as world } from '@/resources/worlds'
import Util from '@/utils/util'
import { addOverlayListener, callOverlayHandler, removeOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

const dev = useDev()

useWebSocket({ addWsParam: true, allowClose: false })

enum StatusFlags {
  None = 0,
  IsAnonymous = 1, // 是否匿名
  IsIdHidden = 2, // 是否隐藏ID
  IsWaymarkEnabled = 4, // 标点功能是否启用（？没开怎么发信号？）
  IsInitiator = 8, // 是否是发起者
}

interface UserInfo {
  id: string
  name: string
  job: string
  flags: StatusFlags
  waymarkIndex: number
  isAnonymous: boolean
  isIdHidden: boolean
  isWaymarkEnabled: boolean
  isInitiator: boolean
  world?: string
}

interface BBYHistoryItem {
  key: string
  timestamp: string
  queryTime?: string | null
  members: UserInfo[]
}

interface PartyMember {
  id: string
  hexId: number
  name: string
  job: number
  level: number
  world: string
}

const waymarkNames = ['A', 'B', 'C', 'D', 'One', 'Two', 'Three', 'Four']

const regexs = {
  floorMarker: /^(?<timestamp>.{14}) WaymarkMarker (?<type>1C):(?<operation>[^:]*):(?<waymark>[^:]*):(?<id>[^:]*):(?<name>[^:]*):(?<x>[^:]*):(?<y>[^:]*):(?<z>[^:]*)(?:$|:)/,
}

const users = ref<UserInfo[]>([])
const partyMembers = ref<(PartyMember | null)[]>([])
const myId = ref('')
const debugMode = ref(false)
const debugInfo = ref<any>({})
const waymarks = ref<Record<number, { x: number, y: number, z: number, active: boolean }>>({})
const lastQueryTime = ref<string | null>(null)
const partyMembersLength = computed(() => partyMembers.value.filter(v => v).length)
const blurMode = ref(false)

function toggleBlurMode() {
  blurMode.value = !blurMode.value
}
const STORAGE_KEY = 'bby'
const db = useIndexedDB<BBYHistoryItem>(STORAGE_KEY)
const history = ref<BBYHistoryItem[]>([])

async function saveHistory() {
  const data = history.value.map(v => toRaw(v))
  await db.replaceAll(data)
}

async function loadHistory() {
  try {
    const data = await db.getAll()
    if (data && data.length > 0) {
      history.value = data.sort((a, b) => b.key.localeCompare(a.key))
    }
  }
  catch (e) {
    console.error('Failed to load BBY history:', e)
  }
}

async function clearHistory() {
  history.value = []
  await db.clear()
}

const queryTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const respondents = computed(() => {
  return partyMembers.value.map((pm) => {
    if (!pm)
      return null
    const responded = users.value.find(u => u.id === pm.id)
    const jobName = Util.jobToFullName(Util.jobEnumToJob(pm.job)).cn || ''
    const isQueried = !!lastQueryTime.value
    if (responded) {
      return {
        ...responded,
        hasResponded: true,
        isQueried,
      }
    }
    return {
      id: pm.id,
      name: pm.name,
      job: jobName,
      world: pm.world,
      flags: StatusFlags.None,
      waymarkIndex: -1,
      isAnonymous: false,
      isIdHidden: false,
      isWaymarkEnabled: false,
      isInitiator: false,
      hasResponded: false,
      isQueried,
    } as UserInfo & { hasResponded: boolean, isQueried: boolean }
  }).filter(m => m !== null) as (UserInfo & { hasResponded: boolean, isQueried: boolean })[]
})

function zToFlags(z: number): StatusFlags {
  const decimal = z - Math.floor(z)
  return Math.round((decimal - 0.01) * 100) as StatusFlags
}

const logger = {
  debug: (...args: any[]) => debugMode.value && console.debug(...args),
  log: (...args: any[]) => debugMode.value && console.log(...args),
  warn: (...args: any[]) => debugMode.value && console.warn(...args),
  error: (...args: any[]) => debugMode.value && console.error(...args),
}

function isPartyModeCoord(coordStr: string): boolean {
  return coordStr.endsWith('1')
}

const handleLogEvent: EventMap['onLogEvent'] = (e) => {
  for (const log of e.detail.logs) {
    const match = regexs.floorMarker.exec(log)
    if (match?.groups) {
      const { operation, waymark, id, x, y, z } = match.groups
      const waymarkIdx = Number.parseInt(waymark || '0')
      logger.log(`[LogEvent] 捕获标点变更: ${operation} waymarkIdx:${waymarkIdx} waymarkName:${waymarkNames[waymarkIdx]} (x:${x}, y:${y}, z:${z})`)

      if (!Number.isNaN(waymarkIdx) && waymarkIdx >= 0 && waymarkIdx <= 7) {
        if (operation === 'Add' || operation === 'Change') {
          waymarks.value[waymarkIdx] = {
            x: Number.parseFloat(x || '0'),
            y: Number.parseFloat(y || '0'),
            z: Number.parseFloat(z || '0'),
            active: true,
          }
        }
        else if (operation === 'Delete') {
          if (waymarks.value[waymarkIdx]) {
            waymarks.value[waymarkIdx].active = false
          }
        }
      }

      if (!operation || (operation !== 'Add' && operation !== 'Change')) {
        continue
      }
      if (!waymark || !id || !x || !y || !z) {
        logger.warn(`[LogEvent] 标点数据缺失:`, { operation, waymark, id, x, y, z })
        continue
      }

      const xCoord = Number.parseFloat(x || '0')
      const yCoord = Number.parseFloat(y || '0')
      const zCoord = Number.parseFloat(z || '0')

      if (Number.isNaN(waymarkIdx) || waymarkIdx < 0 || waymarkIdx > 7) {
        continue
      }

      if (Math.abs(xCoord) > 10000 || Math.abs(yCoord) > 10000) {
        continue
      }

      const flags = zToFlags(zCoord)

      const xValid = isPartyModeCoord(x)
      const yValid = isPartyModeCoord(y)

      if (xValid && yValid) {
        logger.log(`[LogEvent] 检测到特征信号 (WaymarkIdx: ${waymarkIdx}, Flags: 0x${flags.toString(16)})`)

        const isInitiator = !!(flags & StatusFlags.IsInitiator)

        // 收到了 A 点的发起信号，跳过
        if (isInitiator && waymarkIdx === 0) {
          logger.log(`[LogEvent] 忽略匿名查询广播`)
          continue
        }

        const member = partyMembers.value[waymarkIdx]

        if (!member) {
          logger.warn(`[LogEvent] 索引 ${waymarkIdx} 对应的是空槽位`)
          continue
        }

        const jobName = Util.jobToFullName(Util.jobEnumToJob(member.job)).cn || ''
        logger.log(`[LogEvent] 解析成员: ${member.name} (${jobName})`)

        const user = {
          id: member.id,
          name: member.name || '未知',
          job: jobName,
          flags,
          waymarkIndex: waymarkIdx,
          isAnonymous: !!(flags & StatusFlags.IsAnonymous),
          isIdHidden: !!(flags & StatusFlags.IsIdHidden),
          isWaymarkEnabled: !!(flags & StatusFlags.IsWaymarkEnabled),
          isInitiator: !!(flags & StatusFlags.IsInitiator),
          world: member.world,
        }
        addOrUpdateUser(user)
      }
      else {
        logger.debug(`[LogEvent] 坐标特征不符 (X:${x}, Y:${y})`)
      }
    }
  }
}

// 添加或更新用户
function addOrUpdateUser(user: UserInfo) {
  if (user.id === myId.value && user.isInitiator)
    return

  const existingIndex = users.value.findIndex(u => u.id === user.id)

  if (existingIndex >= 0) {
    logger.log(`[User] 更新用户信息: ${user.name}`)
    users.value[existingIndex] = user
  }
  else {
    // 收到的是别人的发起请求信号
    if (user.isInitiator && user.id !== myId.value) {
      logger.log(`[User] 检测到来自 ${user.name} 的被动查询，清空当前列表`)
      if (users.value.length > 0) {
        logger.log(`[User] 存档当前列表到历史记录`)
        history.value.unshift({
          key: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          queryTime: lastQueryTime.value,
          members: [...users.value],
        })
        saveHistory()
      }
      lastQueryTime.value = new Date().toLocaleTimeString()
      users.value = [user]
    }
    else {
      logger.log(`[User] 新增响应者: ${user.name}`)
      users.value.push(user)
    }
  }

  logger.log(`当前响应者列表:`, users.value)
}

const handlePartyChanged: EventMap['PartyChanged'] = (e) => {
  const rawMembers: PartyMember[] = []
  if (e.party && Array.isArray(e.party)) {
    for (const member of e.party) {
      if (member.id && member.inParty) {
        rawMembers.push({
          id: member.id.toUpperCase(),
          hexId: Number.parseInt(member.id, 16),
          name: member.name || '',
          job: member.job || 0,
          level: member.level || 0,
          world: world[member.worldId as keyof typeof world] || '',
        })
      }
    }
  }

  const sortedRaw = [...rawMembers].sort((a, b) => a.hexId - b.hexId)

  const offset = 3
  const shifted = Array.from({ length: 8 }).fill(null) as (PartyMember | null)[]

  for (let i = 0; i < 8; i++) {
    const idx = (i + offset) % 8
    if (idx < sortedRaw.length) {
      shifted[i] = sortedRaw[idx] || null
    }
  }

  partyMembers.value = shifted
  logger.log(shifted)
}

function doWayMarks(json: WayMarkObj) {
  logger.log(`调用鲶鱼精邮差:`, JSON.stringify(json))
  void callOverlayHandler({
    call: 'PostNamazu',
    c: 'DoWaymarks',
    p: JSON.stringify({ ...json, LocalOnly: false }),
  })
}

function clearWayMarks() {
  logger.log(`清理所有标点`)
  void callOverlayHandler({
    call: 'PostNamazu',
    c: 'DoWaymarks',
    p: JSON.stringify({ LocalOnly: false, A: {}, B: {}, C: {}, D: {}, One: {}, Two: {}, Three: {}, Four: {} }),
  })
}

function ask() {
  const flags = StatusFlags.IsAnonymous | StatusFlags.IsIdHidden | StatusFlags.IsInitiator | StatusFlags.IsWaymarkEnabled

  const targetIdx = 0
  const targetWaymarkName = 'A'

  // 获取该标点当前位置
  const current = waymarks.value[targetIdx] || { x: 0, y: 0, z: 0 }
  const threeZero = current.x === 0 && current.y === 0 && current.z === 0

  let x = Math.round(current.x * 10) / 10
  x += (x >= 0 ? 0.01 : -0.01)

  let y = Math.round(current.y * 10) / 10
  y += (y >= 0 ? 0.01 : -0.01)

  let z = Math.floor(current.z + 0.01)
  z += 0.01 + (flags / 100)

  const json: any = {
    Local: false,
    [targetWaymarkName]: {
      X: x,
      Y: z,
      Z: y,
      Active: true,
    },
  }

  logger.log(`[Ask] 计算坐标(索引 ${targetIdx}): X=${x}, Y=${z}, Z=${y}`)
  doWayMarks(json)

  // 存档与清理
  if (users.value.length > 0) {
    history.value.unshift({
      key: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      queryTime: lastQueryTime.value,
      members: [...users.value],
    })
    saveHistory()
  }
  lastQueryTime.value = new Date().toLocaleTimeString()
  users.value = []

  ElNotification.closeAll()
  ElNotification.info({
    message: '正在获取信号...',
    position: 'top-left',
    customClass: 'bby-mini-notify',
    showClose: false,
  })

  if (queryTimer.value)
    clearTimeout(queryTimer.value)
  queryTimer.value = setTimeout(() => {
    if (threeZero)
      clearWayMarks()
    queryTimer.value = null
    ElNotification.closeAll()
    if (users.value.length > 0) {
      ElNotification.success({
        message: `发现 ${users.value.length} 名 BBY 成员`,
        position: 'top-left',
        customClass: 'bby-mini-notify',
        showClose: false,
      })
    }
    else {
      ElNotification.warning({
        message: '未发现 BBY 成员',
        position: 'top-left',
        customClass: 'bby-mini-notify',
        showClose: false,
      })
    }
  }, 1000)
}

const handleChangePrimaryPlayer: EventMap['ChangePrimaryPlayer'] = (e) => {
  const id = e.charID.toString(16).toUpperCase()
  if (myId.value !== id) {
    myId.value = id
    logger.log(`我的 ID 已更新: ${id}`)
  }
}

function addFakeData() {
  const worlds = ['地平关', '迷雾湿地', '拉诺西亚', '紫水栈桥', '幻影群岛']
  const names = ['鸣神小吉', '猫三水', '苏摩', '艾露恩', '莉莉丝', '阿尔法', '欧米茄', '泰坦', '利维亚桑', '希瓦']

  const fakeMembers: PartyMember[] = []
  for (let i = 0; i < 8; i++) {
    fakeMembers.push({
      id: (1000 + i).toString(16).toUpperCase(),
      hexId: 1000 + i,
      name: names[i % names.length]!,
      job: 1 + (i % 38), // 随便来点职业ID
      level: 100,
      world: worlds[i % worlds.length]!,
    })
  }
  partyMembers.value = fakeMembers

  const responders: UserInfo[] = []
  fakeMembers.forEach((m, idx) => {
    if (Math.random() > 0.4) {
      responders.push({
        id: m.id,
        name: m.name,
        job: Util.jobToFullName(Util.jobEnumToJob(m.job)).cn || '冒险者',
        flags: StatusFlags.None,
        waymarkIndex: idx,
        isAnonymous: false,
        isIdHidden: false,
        isWaymarkEnabled: true,
        isInitiator: false,
        world: m.world,
      })
    }
  })

  lastQueryTime.value = new Date().toLocaleTimeString()
  users.value = responders
}

onMounted(() => {
  loadHistory()
  addOverlayListener('onLogEvent', handleLogEvent)
  addOverlayListener('PartyChanged', handlePartyChanged)
  addOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  const isDark = useDark({ storageKey: 'bby-theme' })
  const toggleDark = useToggle(isDark)
  if (isDark.value === false) {
    // 固定使用深色主题
    toggleDark()
  }
})

onUnmounted(() => {
  removeOverlayListener('onLogEvent', handleLogEvent)
  removeOverlayListener('PartyChanged', handlePartyChanged)
  removeOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
})
</script>

<template>
  <CommonActWrapper>
    <div class="advwm-container">
      <div class="header">
        <h2>小队里谁在使用BBY</h2>
        <div class="query-methods">
          <div class="query-item">
            <button
              class="ask-btn" :class="{ searching: !!queryTimer }" :disabled="!!queryTimer"
              @click="ask"
            >
              {{ queryTimer ? '正在查询...' : '主动查询' }}
            </button>
            <button v-if="dev" class="ask-btn fake-test-btn" @click="addFakeData">
              生成测试数据
            </button>
            <span class="item-desc">
              通过场地标点通信，需要使用鲶鱼精邮差（你和对方都要）并处于可以标点的同一地图中<br>
              <!-- 他代码没写好，目前匿名查询对方不会收到提醒 -->
              <!-- <span class="warn-text">注意：他们会知道有人进行了匿名查询！</span> -->
            </span>
          </div>
          <div class="query-item passive">
            <span class="passive-title">被动接收</span>
            <span class="item-desc">当队伍内其他玩家发起查询时，此处也会同步显示结果。</span>
          </div>
        </div>
      </div>

      <div class="users-section">
        <div class="users-header-row">
          <h3>当前小队 ({{ respondents.length }})</h3>
          <span v-if="!lastQueryTime" class="status-hint">尚未进行查询</span>
          <template v-else>
            <span class="using-count">发现使用中: {{ users.length }}</span>
            <span class="last-query-time">最后查询: {{ lastQueryTime }}</span>
          </template>
        </div>
        <div class="users-list">
          <UserCard
            v-for="user in respondents" :key="user.id" :user="user" :blur-mode="blurMode"
            @contextmenu.prevent="toggleBlurMode"
          />
        </div>
      </div>

      <div v-if="respondents.length === 0" class="empty-state">
        <p>等待小队数据...</p>
      </div>

      <div v-if="debugMode" class="debug-section">
        <h3>调试信息</h3>
        <div style="margin-bottom: 16px;">
          <strong>用户总数:</strong> {{ users.length }}<br>
          <strong>应答者数:</strong> {{ respondents.length }}<br>
          <strong>小队成员数:</strong> {{ partyMembersLength }}
        </div>
        <details>
          <summary>用户列表详情</summary>
          <pre>{{ users }}</pre>
        </details>
        <details>
          <summary>标点解析详情</summary>
          <pre>{{ debugInfo }}</pre>
        </details>
      </div>

      <div v-if="history.length > 0" class="history-section">
        <div class="history-header">
          <h3>历史记录 ({{ history.length }})</h3>
          <button class="clear-history-btn" @click="clearHistory">
            清空历史
          </button>
        </div>
        <div class="history-list">
          <div v-for="(snapshot, index) in history" :key="index" class="history-item">
            <div class="snapshot-header">
              <div class="snapshot-time">
                存档时间: {{ snapshot.timestamp }}
              </div>
              <div v-if="snapshot.queryTime" class="snapshot-query-time">
                查询时间: {{ snapshot.queryTime
                }}
              </div>
            </div>
            <div class="snapshot-members">
              <div v-for="u in snapshot.members" :key="u.id" class="history-member-tag">
                <span class="member-name">{{ u.name }}</span>
                <span v-if="u.world" class="member-world">{{ u.world }}</span>
                <span class="member-job">{{ u.job }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </CommonActWrapper>
</template>

<style scoped lang='scss'>
// 设计系统变量
$color-primary: #3b82f6;
$color-primary-dark: #2563eb;
$color-primary-darker: #1d4ed8;
$color-success: #10b981;
$color-success-dark: #059669;
$color-warning: #f59e0b;
$color-warning-dark: #d97706;
$color-danger: #ef4444;
$color-danger-dark: #dc2626;

$color-bg-primary: #0f172a;
$color-bg-secondary: #1e293b;
$color-bg-tertiary: #334155;

$color-text-primary: #f8fafc;
$color-text-secondary: #e2e8f0;
$color-text-muted: #94a3b8;
$color-text-dim: #64748b;

$border-color-light: rgba(255, 255, 255, 0.1);
$border-color-lighter: rgba(255, 255, 255, 0.05);
$border-color-primary: rgba(59, 130, 246, 0.3);

$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.2);
$shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.3);

$transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
$transition-base: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
$transition-slow: 0.3s cubic-bezier(0.4, 0, 0.2, 1);

.advwm-container {
    padding: 12px;
    background: linear-gradient(135deg, $color-bg-secondary 0%, $color-bg-primary 100%);
    min-height: 100vh;
    box-sizing: border-box;
    color: $color-text-secondary;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    position: relative;

    &::-webkit-scrollbar {
        display: none;
    }
    scrollbar-width: none;
    -ms-overflow-style: none;

    // 添加微妙的背景纹理
    &::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.03) 0%, transparent 50%);
        pointer-events: none;
        z-index: 0;
    }

    >* {
        position: relative;
        z-index: 1;
    }
}

.last-query-time {
    font-size: 10px;
    color: $color-text-dim;
    font-weight: 500;
    padding: 2px 6px;
    background: rgba(100, 116, 139, 0.15);
    border-radius: 3px;
    border: 1px solid rgba(100, 116, 139, 0.25);
    white-space: nowrap;
}

.users-header-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    padding: 0;
    gap: 8px;
    flex-wrap: wrap;

    h3 {
        margin: 0;
    }
}

.using-count {
    font-size: 11px;
    color: $color-danger;
    font-weight: 600;
    padding: 2px 8px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 4px;
    border: 1px solid rgba(239, 68, 68, 0.2);
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &::before {
        content: '●';
        font-size: 7px;
        animation: pulse 2s ease-in-out infinite;
    }
}

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

.status-hint {
    font-size: 11px;
    color: $color-text-muted;
    font-style: italic;
    opacity: 0.8;
}

.header {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
    padding: 0;
    align-items: flex-start;

    h2 {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
        letter-spacing: -0.6px;
        color: $color-text-primary;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        background: linear-gradient(135deg, $color-text-primary 0%, $color-text-secondary 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        position: relative;
        padding-bottom: 3px;

        &::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 50px;
            height: 2px;
            background: linear-gradient(to right, $color-primary, transparent);
            border-radius: 2px;
        }
    }
}

.ask-btn {
    padding: 8px 16px;
    min-width: 100px;
    background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: all $transition-base;
    box-shadow: $shadow-md, 0 0 0 0 rgba(59, 130, 246, 0.5);
    position: relative;
    overflow: hidden;
    text-align: center;

    &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        transform: translate(-50%, -50%);
        transition: width $transition-slow, height $transition-slow;
    }

    &:hover::before {
        width: 300px;
        height: 300px;
    }

    &:hover {
        background: linear-gradient(135deg, $color-primary-dark 0%, $color-primary-darker 100%);
        transform: translateY(-2px);
        box-shadow: $shadow-lg, 0 0 20px rgba(59, 130, 246, 0.4);
    }

    &:active {
        transform: translateY(0);
        box-shadow: $shadow-sm;
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
        transform: none;
    }

    &.searching {
        background: linear-gradient(135deg, $color-bg-tertiary 0%, #475569 100%);
        cursor: wait;
        transform: none !important;
        box-shadow: $shadow-sm !important;

        &::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            animation: shimmer 1.5s infinite;
        }
    }

    &.found {
        background: linear-gradient(135deg, $color-success 0%, $color-success-dark 100%);
    }

    &.empty {
        background: linear-gradient(135deg, $color-warning 0%, $color-warning-dark 100%);
    }

    &.fake-test-btn {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        margin-left: 8px;

        &:hover {
            box-shadow: $shadow-lg, 0 0 20px rgba(99, 102, 241, 0.4);
        }
    }
}

@keyframes shimmer {
    0% {
        left: -100%;
    }

    100% {
        left: 100%;
    }
}

.query-methods {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
}

.query-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
}

.query-item.passive {
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed $border-color-light;
    padding: 8px 12px;
    border-radius: 8px;
    transition: all $transition-base;

    &:hover {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(255, 255, 255, 0.15);
    }
}

.item-desc {
    font-size: 11px;
    color: $color-text-muted;
    line-height: 1.5;
    opacity: 0.9;
}

.warn-text {
    color: #fca5a5;
    font-weight: 600;
    text-shadow: 0 0 10px rgba(252, 165, 165, 0.3);
}

.passive-title {
    font-size: 13px;
    font-weight: 600;
    color: #cbd5e1;
    white-space: nowrap;
    letter-spacing: 0.2px;
}

.users-section {
    margin-bottom: 16px;

    h3 {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 8px;
        color: $color-text-primary;
        padding-left: 0;
        letter-spacing: -0.3px;
    }
}

.users-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px;
}

.empty-state {
    text-align: center;
    padding: 32px 16px;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(12px);
    border-radius: 8px;
    border: 1px dashed $border-color-light;
    transition: all $transition-base;

    p {
        font-size: 13px;
        color: $color-text-muted;
        margin: 0;
        font-weight: 500;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.15);
    }
}

.debug-section {
    margin-top: 24px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 11px;

    h3 {
        margin-top: 0;
        font-size: 14px;
        margin-bottom: 12px;
        color: $color-text-primary;
        font-weight: 600;
    }

    pre {
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
        background: rgba(0, 0, 0, 0.2);
        padding: 8px;
        border-radius: 4px;
        border-left: 2px solid $color-primary;
    }
}

.history-section {
    margin-top: 24px;
    border-top: 1px solid $border-color-light;
    padding-top: 16px;

    .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;

        h3 {
            font-size: 14px;
            color: $color-text-primary;
            margin: 0;
            font-weight: 600;
            letter-spacing: -0.3px;
        }
    }

    .clear-history-btn {
        background: rgba(71, 85, 105, 0.2);
        border: 1px solid #475569;
        color: $color-text-muted;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all $transition-base;

        &:hover {
            color: $color-text-primary;
            border-color: #64748b;
            background: rgba(71, 85, 105, 0.4);
            transform: translateY(-1px);
        }

        &:active {
            transform: translateY(0);
        }
    }

    .snapshot-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
        font-size: 10px;
    }

    .snapshot-time {
        color: #64748b;
    }

    .snapshot-query-time {
        color: #4ade80;
    }
}

.history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.history-item {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid $border-color-lighter;
    transition: all $transition-base;

    &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: $border-color-light;
        transform: translateX(4px);
    }

    .snapshot-time {
        font-size: 10px;
        font-family: monospace;
        color: #64748b;
        width: 60px;
    }

    .snapshot-members {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;

        .history-member-tag {
            display: flex;
            align-items: center;
            gap: 4px;
            background: rgba(51, 65, 85, 0.6);
            backdrop-filter: blur(4px);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all $transition-fast;

            &:hover {
                background: rgba(51, 65, 85, 0.8);
                border-color: rgba(255, 255, 255, 0.15);
                transform: translateY(-1px);
            }

            .member-name {
                color: $color-text-primary;
                font-weight: 600;
            }

            .member-world {
                color: $color-text-muted;
                font-size: 9px;

                &::before {
                    content: '@';
                    opacity: 0.6;
                }
            }

            .member-job {
                color: #60a5fa;
                font-size: 9px;
                background: rgba(59, 130, 246, 0.15);
                padding: 1px 4px;
                border-radius: 3px;
                font-weight: 600;
            }
        }
    }
}
</style>

<style lang="scss">
.el-notification.bby-mini-notify {
    width: 220px;
    padding: 10px 14px;
    border-radius: 4px;
    align-items: center;

    .el-notification__group {
        margin: 0;
    }

    .el-notification__content {
        margin: 0;
        font-size: 13px;
        line-height: 1;
    }

    .el-notification__icon {
        font-size: 16px;
    }

    .el-notification__closeBtn {
        top: 10px;
    }
}
</style>
