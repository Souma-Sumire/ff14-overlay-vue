<script setup lang="ts">
import type { EventMap, PluginCombatantState } from 'cactbot/types/event'
import { useZone } from '@/composables/useZone'
import NetRegexes from '../../cactbot/resources/netregexes'
import {
  addOverlayListener,
  callOverlayHandler,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'

const searchTargetName = ref('')
const searchTargets = ref<PluginCombatantState[]>([])
const currentTargetIndex = ref(0)
const primaryPlayer = ref('')
const combatants = ref<PluginCombatantState[]>([])
const netRegexs = { echo: NetRegexes.echo({ line: 'find\\s*(?<target>.+)' }) }
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
let ctx: CanvasRenderingContext2D | null = null
const devicePixelRatio = ref(window.devicePixelRatio || 1)
const size = ref(Math.min(window.innerWidth, window.innerHeight) - 80)
const detectionRadius = computed(() => size.value / 2 - 20)
const { zoneType } = useZone()
const searchType: Ref<'single' | 'all'> = ref('single')

const colors = {
  radarRing: '#0f0',
  axis: '#060',
  player: '#0f0',
  target: '#ff0',
  directionLine: '#f00',
  distanceText: '#fff',
  nameText: '#fff',
}

const sizes = {
  playerMarker: 18,
  targetMarker: 3,
  directionLineWidth: 2,
  directionIndicator: 6,
}

const centerX = computed(() => size.value / 2)
const centerY = computed(() => size.value / 2)

function updateSearchTargets() {
  if (!searchTargetName.value) {
    searchTargets.value = []
    currentTargetIndex.value = 0
    return
  }
  const matched = combatants.value.filter(
    (c) => c.Name && c.Name.includes(searchTargetName.value)
  )
  // const matched = combatants.value.filter(c => c.Name)
  searchTargets.value = matched
}

function drawRadar() {
  searchType.value = 'single'
  const distanceScale = 0.5
  if (!ctx) {
    throw new Error('canvas context is null')
  }
  const search = searchTargets.value[currentTargetIndex.value]
  const primary = combatants.value.find((c) => c.Name === primaryPlayer.value)
  if (!search) {
    ctx.clearRect(0, 0, size.value, size.value)
    return
  }
  if (!primary) return

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
    py - sizes.directionIndicator * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    px - sizes.directionIndicator * Math.cos(angle + Math.PI / 6),
    py - sizes.directionIndicator * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()

  // === 距离文本 ===
  ctx.fillStyle = colors.distanceText
  ctx.font = '10px Arial'
  ctx.fillText(`${distance.toFixed(1)}y`, px + 5, py - 5)
}

function calculatePosition(
  c: {
    PosX: number
    PosY: number
  },
  primary: {
    PosX: number
    PosY: number
  },
  distanceScale: number
): { px: number; py: number } {
  const dx = c.PosX - primary.PosX
  const dy = c.PosY - primary.PosY
  let px = centerX.value + dx / distanceScale
  let py = centerY.value + dy / distanceScale

  const dist = Math.hypot(px - centerX.value, py - centerY.value)
  if (dist > detectionRadius.value) {
    const ratio = detectionRadius.value / dist
    px = centerX.value + (px - centerX.value) * ratio
    py = centerY.value + (py - centerY.value) * ratio
  }

  return { px, py }
}

function drawAll() {
  searchType.value = 'all'
  const distanceScale = 1
  if (!ctx) throw new Error('canvas context is null')

  const primary = combatants.value.find((c) => c.Name === primaryPlayer.value)
  const searchs = combatants.value.filter(
    (c) => c.Name !== primaryPlayer.value && c.ID
  )

  if (!primary) return

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

  // 先缓存所有目标的位置
  const positions = new Map<string, { px: number; py: number }>()
  for (const c of searchs) {
    positions.set(
      c.ID!.toString(),
      calculatePosition(c, primary, distanceScale)
    )
  }

  // 画连线
  for (const c of searchs) {
    const pos = positions.get(c.ID!.toString())
    if (!pos) continue
    ctx.strokeStyle = colors.directionLine
    ctx.lineWidth = sizes.directionLineWidth
    ctx.beginPath()
    ctx.moveTo(centerX.value, centerY.value)
    ctx.lineTo(pos.px, pos.py)
    ctx.stroke()
  }

  // 画红点
  for (const c of searchs) {
    const pos = positions.get(c.ID!.toString())
    if (!pos) continue
    ctx.fillStyle = colors.target
    ctx.beginPath()
    ctx.arc(pos.px, pos.py, sizes.targetMarker, 0, 2 * Math.PI)
    ctx.fill()
  }

  // 画名字
  for (const c of searchs) {
    const pos = positions.get(c.ID!.toString())
    if (!pos) continue
    const name = c.Name ?? ''
    const textWidth = ctx.measureText(name).width

    ctx.shadowColor = 'black'
    ctx.shadowBlur = 1
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1

    ctx.fillStyle = colors.nameText
    ctx.font = '8px Arial'
    ctx.fillText(name, pos.px - textWidth / 2, pos.py - sizes.targetMarker - 3)

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  // === 玩家指示三角形 ===
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
}

async function getCombatants() {
  const res = await callOverlayHandler({ call: 'getCombatants' })
  combatants.value = res.combatants ?? []
}

async function update() {
  await getCombatants()
  updateSearchTargets()
  if (
    zoneType.value === 'Pvp' ||
    !searchTargetName.value ||
    !primaryPlayer.value
  ) {
    searchTargetName.value = ''
    return
  }
  if (searchTargetName.value === '*') {
    drawAll()
  } else {
    drawRadar()
  }
  setTimeout(update, 100)
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  if (e.line[0] === '00') {
    const matches = netRegexs.echo.exec(e.rawLine)
    if (matches?.groups?.target) {
      searchTargetName.value = matches.groups.target
      currentTargetIndex.value = 0
      getCombatants().then(() => {
        update()
      })
    }
  }
}

const handleChangePrimaryPlayer: EventMap['ChangePrimaryPlayer'] = (e) => {
  primaryPlayer.value = e.charName
}

function handleResize() {
  size.value = Math.min(window.innerWidth, window.innerHeight) - 80
  devicePixelRatio.value = window.devicePixelRatio || 1
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(devicePixelRatio.value, devicePixelRatio.value)
  }
}

onMounted(() => {
  ctx = canvas.value?.getContext('2d') ?? null
  if (ctx) ctx.scale(devicePixelRatio.value, devicePixelRatio.value)
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  removeOverlayListener('LogLine', handleLogLine)
  removeOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <CommonActWrapper>
    <template #readme>
      <el-alert
        class="el-alert-info"
        type="info"
        :closable="false"
        show-icon
        :title="$t('radar.macroTitle')"
        :description="$t('radar.macroDesc')"
      />
    </template>
    <div class="radar-container">
      <div v-show="searchTargetName" class="radar-wrapper">
        <div v-if="searchTargets.length > 1">
          <button
            class="nav-arrow left-arrow"
            :disabled="searchTargets.length <= 1"
            :aria-label="$t('radar.prevTarget')"
            @click="
              currentTargetIndex =
                (currentTargetIndex - 1 + searchTargets.length) %
                searchTargets.length
            "
          >
            ←
          </button>
          <span>
            （{{ currentTargetIndex + 1 }} / {{ searchTargets.length }}）
          </span>
          <button
            class="nav-arrow right-arrow"
            :disabled="searchTargets.length <= 1"
            :aria-label="$t('radar.nextTarget')"
            @click="
              currentTargetIndex =
                (currentTargetIndex + 1) % searchTargets.length
            "
          >
            →
          </button>
        </div>

        <div class="target-header">
          <span v-if="searchType === 'single'" class="target-name">{{
            searchTargets[currentTargetIndex]?.Name ??
            $t('radar.targetNotFound', { targetName: searchTargetName })
          }}</span>
          <button
            class="cancel-btn"
            @click="
              () => {
                searchTargetName = ''
                searchTargets = []
              }
            "
          >
            {{ $t('radar.cancelBtn') }}
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
  </CommonActWrapper>
</template>

<style scoped lang="scss">
.radar-container {
  font-family: 'Microsoft YaHei', sans-serif;
  color: white;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  overflow: hidden;

  .activation-prompt {
    background-color: rgba(0, 0, 0, 0.7);
    border: 1px solid #444;

    h1 {
      color: #eee;
      font-size: 1.2rem;
      margin: 0;
    }
  }
}

.radar-wrapper {
  background-color: rgba(0, 0, 0, 0.75);
  border-radius: 12px;
  padding: 12px;
  width: fit-content;

  .target-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding: 0 5px;

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

.el-alert-info {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 24em;
  z-index: 999;
}
</style>
