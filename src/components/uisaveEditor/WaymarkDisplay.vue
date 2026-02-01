<script setup lang="ts">
import type { CanvasMarker } from '@/components/MapCanvas.vue'
import type { WayMark } from '@/types/uisave'
import { computed } from 'vue'
import MapCanvas from '@/components/MapCanvas.vue'

const props = defineProps<{
  waymark: WayMark
  size?: number
}>()

const size = props.size ?? 180

const markMap = ['A', 'B', 'C', 'D', '1', '2', '3', '4']
const bitMap = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80]

function isActive(index: number): boolean {
  return ((props.waymark?.enableFlag ?? 0) & (bitMap[index] ?? 0)) !== 0
}

const markers = computed<CanvasMarker[]>(() => {
  const keys: Array<keyof WayMark> = [
    'A',
    'B',
    'C',
    'D',
    'One',
    'Two',
    'Three',
    'Four',
  ]

  return keys.map((key, idx) => {
    const point = props.waymark[key] as { x: number, y: number, z: number }
    return {
      key,
      label: markMap[idx] ?? '',
      x: point.x / 1000,
      z: point.z / 1000,
      active: isActive(idx),
    }
  })
})
</script>

<template>
  <MapCanvas :map-id="waymark.regionID" :markers="markers" :size="size" />
</template>
