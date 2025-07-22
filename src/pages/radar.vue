<script setup lang="ts">
import type { EventMap, PluginCombatantState } from 'cactbot/types/event'
import { ElMessage } from 'element-plus'
import ZoneInfo from '@/resources/zoneInfo'
import ContentType from '../../cactbot/resources/content_type'
import NetRegexes from '../../cactbot/resources/netregexes'
import {
  addOverlayListener,
  callOverlayHandler,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'

const actReady = ref(false)
const searchTargetName = ref('')
const searchTargets = ref<PluginCombatantState[]>([])
const currentTargetIndex = ref(0)
const primaryPlayer = ref('')
const combatants = ref<PluginCombatantState[]>([])
const netRegexs = { echo: NetRegexes.echo({ line: 'find\\s*(?<target>.+)' }) }
const isPvp = ref(false)
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
let ctx: CanvasRenderingContext2D | null = null
const devicePixelRatio = ref(window.devicePixelRatio || 1)
const size = ref(Math.min(window.innerWidth, window.innerHeight) - 80)
const detectionRadius = computed(() => size.value / 2 - 20)
const distanceScale = 0.1
const unlocked = ref(document.getElementById('unlocked')?.style?.display === 'flex')

const colors = {
  radarRing: '#0f0',
  axis: '#060',
  player: '#0f0',
  target: '#ff0',
  directionLine: '#f00',
  distanceText: '#fff',
}

const sizes = {
  playerMarker: 18,
  targetMarker: 3,
  directionLineWidth: 2,
  directionIndicator: 6,
  font: '10px Arial',
}

const centerX = computed(() => size.value / 2)
const centerY = computed(() => size.value / 2)

function updateSearchTargets() {
  if (!searchTargetName.value) {
    searchTargets.value = []
    currentTargetIndex.value = 0
    return
  }
  const matched = combatants.value.filter(c => c.Name && c.Name.includes(searchTargetName.value))
  // const matched = combatants.value.filter(c => c.Name)
  searchTargets.value = matched
  currentTargetIndex.value = 0
}

function drawRadar() {
  if (!ctx)
    return
  const search = searchTargets.value[currentTargetIndex.value]
  const primary = combatants.value.find(c => c.Name === primaryPlayer.value)
  if (!search) {
    searchTargetName.value = ''
    ElMessage('找不到目标')
    return
  }
  if (!primary)
    return

  ctx.clearRect(0, 0, size.value, size.value)

  // === 雷达背景 ===
  ctx.strokeStyle = colors.radarRing
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(centerX.value, centerY.value, detectionRadius.value, 0, 2 * Math.PI)
  ctx.stroke()

  // === 坐标轴 ===
  ctx.strokeStyle = colors.axis
  ctx.beginPath()
  ctx.moveTo(centerX.value - detectionRadius.value, centerY.value)
  ctx.lineTo(centerX.value + detectionRadius.value, centerY.value)
  ctx.moveTo(centerX.value, centerY.value - detectionRadius.value)
  ctx.lineTo(centerX.value, centerY.value + detectionRadius.value)
  ctx.stroke()

  // === 计算相对位置 ===
  const dx = search.PosX - primary.PosX
  const dy = search.PosY - primary.PosY
  const distance = Math.sqrt(dx * dx + dy * dy)
  let px = centerX.value + dx / distanceScale
  let py = centerY.value + dy / distanceScale

  // === 超出雷达范围则贴边 ===
  const distFromCenter = Math.hypot(px - centerX.value, py - centerY.value)
  if (distFromCenter > detectionRadius.value) {
    const ratio = detectionRadius.value / distFromCenter
    px = centerX.value + (px - centerX.value) * ratio
    py = centerY.value + (py - centerY.value) * ratio
  }

  // === 连线 ===
  ctx.strokeStyle = colors.directionLine
  ctx.lineWidth = sizes.directionLineWidth
  ctx.beginPath()
  ctx.moveTo(centerX.value, centerY.value)
  ctx.lineTo(px, py)
  ctx.stroke()

  // === 目标点 ===
  ctx.fillStyle = colors.target
  ctx.beginPath()
  ctx.arc(px, py, sizes.targetMarker, 0, 2 * Math.PI)
  ctx.fill()

  // === 玩家三角形 ===
  const rotation = -(primary.Heading ?? 0) + Math.PI
  ctx.save()
  ctx.translate(centerX.value, centerY.value)
  ctx.rotate(rotation)
  ctx.fillStyle = colors.player

  const h = sizes.playerMarker
  const halfBase = h / 3
  const centerOffset = h * -0.2
  ctx.beginPath()
  ctx.moveTo(0, -h / 2 + centerOffset)
  ctx.lineTo(-halfBase, h / 2 + centerOffset)
  ctx.lineTo(halfBase, h / 2 + centerOffset)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // === 方向指示箭头 ===
  const angle = Math.atan2(py - centerY.value, px - centerX.value)
  ctx.fillStyle = colors.directionLine
  ctx.beginPath()
  ctx.moveTo(px, py)
  ctx.lineTo(
    px - sizes.directionIndicator * Math.cos(angle - Math.PI / 6),
    py - sizes.directionIndicator * Math.sin(angle - Math.PI / 6),
  )
  ctx.lineTo(
    px - sizes.directionIndicator * Math.cos(angle + Math.PI / 6),
    py - sizes.directionIndicator * Math.sin(angle + Math.PI / 6),
  )
  ctx.closePath()
  ctx.fill()

  // === 距离文本 ===
  ctx.fillStyle = colors.distanceText
  ctx.font = sizes.font
  ctx.fillText(`${distance.toFixed(1)}y`, px + 5, py - 5)
}

async function getCombatants() {
  const res = await callOverlayHandler({ call: 'getCombatants' })
  combatants.value = res.combatants ?? []
}

async function update() {
  await getCombatants()
  if (isPvp.value || !searchTargetName.value || !primaryPlayer.value || !actReady.value) {
    searchTargetName.value = ''
    return
  }
  drawRadar()
  setTimeout(update, 100)
}

function checkAct(): Promise<void> {
  return new Promise((resolve) => {
    callOverlayHandler({ call: 'cactbotRequestState' }).then(() => {
      actReady.value = true
      resolve()
    })
    setTimeout(() => {
      if (!actReady.value)
        checkAct()
    }, 3000)
  })
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  if (e.line[0] === '00') {
    const matches = netRegexs.echo.exec(e.rawLine)
    if (matches?.groups?.target) {
      searchTargetName.value = matches.groups.target
      getCombatants().then(() => {
        updateSearchTargets()
        update()
      })
    }
  }
}

const handleChangePrimaryPlayer: EventMap['ChangePrimaryPlayer'] = (e) => {
  primaryPlayer.value = e.charName
}

const handleChangeZone: EventMap['ChangeZone'] = (e) => {
  isPvp.value = ZoneInfo[e.zoneID]?.contentType === ContentType.Pvp
}

function handleResize() {
  size.value = Math.min(window.innerWidth, window.innerHeight) - 80
  devicePixelRatio.value = window.devicePixelRatio || 1
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(devicePixelRatio.value, devicePixelRatio.value)
  }
}

function handleOverlayStateUpdate(e: CustomEvent<{ isLocked: boolean }>) {
  unlocked.value = e?.detail?.isLocked === false
}

onMounted(() => {
  ctx = canvas.value?.getContext('2d') ?? null
  if (ctx)
    ctx.scale(devicePixelRatio.value, devicePixelRatio.value)
  checkAct()
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  addOverlayListener('ChangeZone', handleChangeZone)
  window.addEventListener('resize', handleResize)
  document.addEventListener('onOverlayStateUpdate', handleOverlayStateUpdate)
})

onUnmounted(() => {
  removeOverlayListener('LogLine', handleLogLine)
  removeOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  removeOverlayListener('ChangeZone', handleChangeZone)
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('onOverlayStateUpdate', handleOverlayStateUpdate)
})
</script>

<template>
  <div class="radar-container">
    <el-alert
      v-if="unlocked"
      class="el-alert-info"
      type="info"
      :closable="false"
      show-icon
      title="宏命令：/e find 目标名称"
      description="名称允许部分匹配"
    />
    <el-card v-if="!actReady" class="activation-prompt">
      <h1>在 ACT 中添加本页面作为数据统计悬浮窗</h1>
    </el-card>
    <div v-show="actReady && searchTargetName" class="radar-wrapper">
      <button
        v-if="searchTargets.length > 1"
        class="nav-arrow left-arrow"
        :disabled="searchTargets.length <= 1"
        aria-label="上一目标"
        @click="currentTargetIndex = (currentTargetIndex - 1 + searchTargets.length) % searchTargets.length"
      >
        ←
      </button>

      <button
        v-if="searchTargets.length > 1"
        class="nav-arrow right-arrow"
        :disabled="searchTargets.length <= 1"
        aria-label="下一目标"
        @click="currentTargetIndex = (currentTargetIndex + 1) % searchTargets.length"
      >
        →
      </button>

      <div class="target-header">
        <span class="target-name">{{ searchTargets[currentTargetIndex]?.Name ?? '' }}</span>
        <button class="cancel-btn" @click="searchTargetName = ''; searchTargets = [];">
          取消
        </button>
      </div>
      <div class="radar-canvas-container">
        <canvas
          ref="canvas"
          class="radar-canvas"
          :width="size * devicePixelRatio"
          :height="size * devicePixelRatio"
          :style="{ width: `${size}px`, height: `${size}px` }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.radar-container {
  font-family: 'Microsoft YaHei', sans-serif;
  color: white;
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  display: flex; justify-content: center; align-items: center;
  user-select: none;
  overflow: hidden;

  .activation-prompt {
    background-color: rgba(0, 0, 0, 0.7);
    border: 1px solid #444;
    h1 {
      color: #eee; font-size: 1.2rem; margin: 0;
    }
  }
}

.radar-wrapper {
  background-color: rgba(0, 0, 0, 0.75);
  border-radius: 12px;
  padding: 12px;
  width: fit-content;

  .target-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 10px; padding: 0 5px;

    .target-name {
      font-size: 1.1rem;
      font-weight: bold;
      color: #ffcc00;
      text-shadow: 0 0 5px rgba(255, 204, 0, 0.5);
    }

    .cancel-btn {
      padding: 4px 10px;
      font-size: 0.8rem;
      cursor: pointer;
    }
  }

  .radar-canvas-container {
    position: relative;
    display: inline-block;

    .radar-canvas {
      display: block;
      border-radius: 8px;
      background-color: rgba(0, 20, 0, 0.4);
    }
  }
}
.el-alert-info{
  position: fixed;
  z-index: -9;
}
</style>
