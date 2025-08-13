<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { MacroInfoPlace } from '@/types/macro'
import { computed, ref } from 'vue'
import Map from '@/resources/map.json'
import ZoneInfo from '@/resources/zoneInfo'
import { useMacroStore } from '@/store/macro'
import { getPixelCoordinates, Vector2 } from '@/utils/mapCoordinates'

const props = defineProps({
  macro: { type: Object as () => MacroInfoPlace, required: true },
  size: { type: Number, default: 256 },
})

const spMaps = [
  '1252', // 力之塔
  '1075', // 希拉狄哈水道
  '1076', // 希拉狄哈水道 异闻
  '1155', // 六根山
  '1156', // 六根山 异闻
  '1179', // 阿罗阿罗岛
  '1180', // 阿罗阿罗岛 异闻
]

const macroStore = useMacroStore()
const isSpMap = computed(() => {
  return spMaps.includes(macroStore.selectZone)
})

const mapSrc = (() => {
  if (isSpMap.value)
    return undefined
  const id = macroStore.selectZone
  if (id === undefined)
    return undefined
  const map = Map[id as keyof typeof Map]
  if (map === undefined)
    return undefined
  return `https://v2.xivapi.com/api/asset/map/${map.id}`
})()

const markMap = ['A', 'B', 'C', 'D', '1', '2', '3', '4']

function getPix(v: { X: number, Z: number }) {
  const id = macroStore.selectZone!
  const zone = ZoneInfo[Number(id)]!
  const sizeFactor = zone.sizeFactor
  const offsetX = zone.offsetX
  const offsetY = zone.offsetY
  const worldXZCoordinates = new Vector2(Number(v.X), Number(v.Z))
  const mapOffset = new Vector2(offsetX, offsetY)
  return getPixelCoordinates(worldXZCoordinates, mapOffset, sizeFactor)
}

// 拖拽与缩放状态
const offsetX = ref(0)
const offsetY = ref(0)
const scale = ref(0.75)
const fontSize = ref(isSpMap.value ? 16 : 24)

const minScale = 0.2
const maxScale = 4

const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0

function onMouseDown(e: MouseEvent) {
  e.preventDefault()
  isDragging.value = true
  dragStartX = e.clientX - offsetX.value
  dragStartY = e.clientY - offsetY.value
}
function onMouseMove(e: MouseEvent) {
  e.preventDefault()
  if (!isDragging.value)
    return
  offsetX.value = e.clientX - dragStartX
  offsetY.value = e.clientY - dragStartY
}
function onMouseUp(e: MouseEvent) {
  e.preventDefault()
  isDragging.value = false
}
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1
  let newScale = scale.value * scaleDelta
  newScale = Math.min(maxScale, Math.max(minScale, newScale))

  // 缩放中心跟鼠标位置对齐
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  offsetX.value = mouseX - ((mouseX - offsetX.value) * newScale) / scale.value
  offsetY.value = mouseY - ((mouseY - offsetY.value) * newScale) / scale.value

  scale.value = newScale
}

function getOffset(v: { X: number, Z: number }) {
  const pixelCoordinates = getPix(v)
  const size = Math.max((1 / scale.value) * fontSize.value, fontSize.value)
  return {
    '--left': `${pixelCoordinates.x}px`,
    '--top': `${pixelCoordinates.y}px`,
    'font-size': `${size}px`,
    'font-shadow': `${size / 12}px`,
    '--text-stroke': `${fontSize.value / 36}px rgba(50, 50, 50, 1)`,
  }
}

// 动态裁剪容器样式
const cropStyle: ComputedRef<CSSProperties> = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  overflow: 'hidden',
  position: 'relative',
  cursor: isDragging.value ? 'grabbing' : 'grab',
  userSelect: 'none',
}))

// transform样式控制大图平移缩放
const transformStyle: ComputedRef<CSSProperties> = computed(() => {
  return {
    transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
    transformOrigin: 'top left',
    width: '2048px',
    height: '2048px',
    position: 'absolute',
    left: 0,
    top: 0,
  }
})

onMounted(() => {
  watch(
    () => props.macro.Place,
    () => {
      const activePoints = Object.values(props.macro.Place).filter(
        p => p.Active,
      )
      if (activePoints.length === 0) {
        scale.value = 0.5
        offsetX.value = props.size / 2 - 1024 * scale.value
        offsetY.value = props.size / 2 - 1024 * scale.value
        return
      }

      // 计算平均点
      const ave = activePoints.reduce(
        (acc, p) => {
          acc.x += Number(p.X) + macroStore.defaultX
          acc.y += Number(p.Z) + macroStore.defaultY
          return acc
        },
        { x: 0, y: 0 },
      )
      ave.x /= activePoints.length
      ave.y /= activePoints.length

      // 转像素坐标 - 中心点像素
      const centerPix = getPix({
        X: -ave.x - macroStore.defaultX,
        Z: -ave.y - macroStore.defaultY,
      })

      // 找到所有点的像素坐标范围
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      for (const p of activePoints) {
        const pix = getPix({
          X: Number(p.X) + macroStore.defaultX,
          Z: Number(p.Z) + macroStore.defaultY,
        })
        minX = Math.min(minX, pix.x)
        maxX = Math.max(maxX, pix.x)
        minY = Math.min(minY, pix.y)
        maxY = Math.max(maxY, pix.y)
      }
      const widthPx = maxX - minX
      const heightPx = maxY - minY

      // 计算合适缩放，保证都能显示
      const scaleX = props.size / widthPx
      const scaleY = props.size / heightPx

      // 限制缩放范围
      let newScale = Math.min(scaleX, scaleY)
      // 初始化最大缩放限制
      const maxInitialScale = 1
      newScale = Math.min(maxInitialScale, Math.max(minScale, newScale * 0.8))

      scale.value = isSpMap.value ? 2 : newScale

      // 根据中心点重新计算偏移量，考虑缩放和坐标系翻转
      offsetX.value
        = props.size / 2 - ((centerPix.x - 1024) * -1 + 1024) * scale.value
      offsetY.value
        = props.size / 2 - ((centerPix.y - 1024) * -1 + 1024) * scale.value
    },
    { immediate: true },
  )
})
</script>

<template>
  <div
    class="crop-custom"
    :style="cropStyle"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @wheel="onWheel"
  >
    <div class="crop-1024" :style="transformStyle">
      <span
        v-for="(v, k, i) in props.macro.Place"
        :key="i"
        :class="`markIcon markIcon${k}`"
        :style="[getOffset(v)]"
      >
        {{ v.Active ? markMap[i] : "" }}
      </span>
      <img :src="mapSrc" alt="">
    </div>
  </div>
</template>

<style scoped lang="scss">
.crop-custom {
  user-select: none;
  pointer-events: none;
  background-color: rgba(214, 199, 148, 1);
}

.crop-1024 {
  position: absolute;
}

.crop-1024 img {
  width: 2048px;
  height: 2048px;
  display: block;
}

.markIcon {
  font-size: 24px;
  position: absolute;
  left: var(--left);
  top: var(--top);
  transform: translate(-50%, -50%);
  font-weight: bold;
  color: white;
  -webkit-text-stroke: var(--text-stroke);
  z-index: 10;
  padding: 0.5em;
  font-size: var(--font-size, 24px);
}

$color1: rgba(255, 0, 0, 1);
$color2: rgba(255, 255, 0, 1);
$color3: rgba(0, 0, 255, 1);
$color4: rgba(128, 0, 128, 1);

.markIconA,
.markIconOne {
  text-shadow: 0 0 var(--font-shadow, 1px) $color1, 0 0 2px $color1,
    0 0 3px $color1;
}

.markIconB,
.markIconTwo {
  text-shadow: 0 0 var(--font-shadow, 1px) $color2, 0 0 2px $color2,
    0 0 3px $color2;
}

.markIconC,
.markIconThree {
  text-shadow: 0 0 var(--font-shadow, 1px) $color3, 0 0 2px $color3,
    0 0 3px $color3;
}

.markIconD,
.markIconFour {
  text-shadow: 0 0 var(--font-shadow, 1px) $color4, 0 0 2px $color4,
    0 0 3px $color4;
}
</style>
