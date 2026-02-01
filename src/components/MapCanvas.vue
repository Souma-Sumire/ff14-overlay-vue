<script setup lang="ts">
import type { CSSProperties, PropType } from 'vue'
import {
  computed,

  onMounted,

  ref,
  watch,
} from 'vue'
import { getTerritoryTypeByMapID } from '@/resources/contentFinderCondition'
import Map from '@/resources/map.json'
import { ZoneInfo } from '@/resources/zoneInfo'
import { getPixelCoordinates, Vector2 } from '@/utils/mapCoordinates'

export interface CanvasMarker {
  key: string
  label: string
  x: number
  z: number
  active: boolean
}

const props = defineProps({
  mapId: { type: Number, required: true },
  markers: { type: Array as PropType<CanvasMarker[]>, required: true },
  size: { type: Number, default: 180 },

  forceTerritoryType: { type: Number, default: undefined },
})

const mapSrc = computed(() => {
  if (props.mapId === 0 && !props.forceTerritoryType)
    return undefined

  const territoryType
    = props.forceTerritoryType ?? getTerritoryTypeByMapID(props.mapId)
  const mapData = Map[territoryType.toString() as keyof typeof Map]

  if (!mapData)
    return undefined
  return `https://v2.xivapi.com/api/asset/map/${mapData.id}`
})

function getPix(point: { x: number, z: number }) {
  const territoryType
    = props.forceTerritoryType ?? getTerritoryTypeByMapID(props.mapId)
  const zone = ZoneInfo[territoryType] ?? {
    sizeFactor: 100,
    offsetX: 0,
    offsetY: 0,
  }

  const worldXZCoordinates = new Vector2(point.x, point.z)
  const mapOffset = new Vector2(zone.offsetX, zone.offsetY)
  return getPixelCoordinates(worldXZCoordinates, mapOffset, zone.sizeFactor)
}

const offsetX = ref(0)
const offsetY = ref(0)
const scale = ref(0.5)
const fontSize = ref(16)

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

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  offsetX.value = mouseX - ((mouseX - offsetX.value) * newScale) / scale.value
  offsetY.value = mouseY - ((mouseY - offsetY.value) * newScale) / scale.value

  scale.value = newScale
}

function getOffset(point: { x: number, z: number }) {
  const pixelCoordinates = getPix(point)
  const size = Math.max((1 / scale.value) * fontSize.value, fontSize.value)
  return {
    '--left': `${pixelCoordinates.x}px`,
    '--top': `${pixelCoordinates.y}px`,
    '--font-size': `${size}px`,
  }
}

const cropStyle = computed<CSSProperties>(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  overflow: 'hidden',
  position: 'relative',
  cursor: isDragging.value ? 'grabbing' : 'grab',
  userSelect: 'none',
}))

const transformStyle = computed<CSSProperties>(() => ({
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
  transformOrigin: 'top left',
  width: '2048px',
  height: '2048px',
  position: 'absolute',
  left: 0,
  top: 0,
}))

const containerRef = ref<HTMLElement | null>(null)
const isVisible = ref(false)

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        isVisible.value = true
        observer.disconnect()
      }
    },
    { rootMargin: '200px' },
  )
  if (containerRef.value)
    observer.observe(containerRef.value)
})

watch(
  () => props.markers,
  () => {
    const activePoints = props.markers.filter(p => p.active)
    if (activePoints.length === 0) {
      scale.value = 0.5
      offsetX.value = props.size / 2 - 1024 * scale.value
      offsetY.value = props.size / 2 - 1024 * scale.value
      return
    }

    const ave = activePoints.reduce(
      (acc, p) => {
        const pix = getPix(p)
        acc.x += pix.x
        acc.y += pix.y
        return acc
      },
      { x: 0, y: 0 },
    )
    ave.x /= activePoints.length
    ave.y /= activePoints.length

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const p of activePoints) {
      const pix = getPix(p)
      minX = Math.min(minX, pix.x)
      maxX = Math.max(maxX, pix.x)
      minY = Math.min(minY, pix.y)
      maxY = Math.max(maxY, pix.y)
    }

    const widthPx = maxX - minX
    const heightPx = maxY - minY
    const scaleX = props.size / widthPx
    const scaleY = props.size / heightPx
    let newScale = Math.min(scaleX, scaleY)
    newScale = Math.min(1, Math.max(0.5, newScale * 0.5))

    scale.value = newScale
    offsetX.value = props.size / 2 - ave.x * scale.value
    offsetY.value = props.size / 2 - ave.y * scale.value
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div
    ref="containerRef"
    class="crop-custom"
    :style="cropStyle"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @wheel="onWheel"
  >
    <div v-if="isVisible" class="crop-1024" :style="transformStyle">
      <img v-if="mapSrc" :src="mapSrc" alt="">
      <span
        v-for="p in markers"
        :key="p.key"
        :class="`markIcon markIcon${p.key}`"
        :style="[getOffset(p)]"
      >
        {{ p.active ? p.label : '' }}
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use 'sass:color';

.crop-custom {
  user-select: none;
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
  text-shadow:
    0 0 0.2em $color1,
    0 0 0.3em $color1,
    0 0 0.4em $color1;
}
.markIconB,
.markIconTwo {
  text-shadow:
    0px 0px 0.15em rgb(125, 125, 125),
    0 0 0.1em $color2,
    0 0 0.2em $color2,
    0 0 0.3em $color2;
}
.markIconC,
.markIconThree {
  text-shadow:
    0 0 0.2em $color3,
    0 0 0.3em $color3,
    0 0 0.4em $color3;
}
.markIconD,
.markIconFour {
  text-shadow:
    0 0 0.2em $color4,
    0 0 0.3em $color4,
    0 0 0.4em $color4;
}
</style>
