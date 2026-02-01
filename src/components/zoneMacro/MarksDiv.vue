<script setup lang="ts">
import type { CanvasMarker } from '@/components/MapCanvas.vue'
import type { MacroInfoPlace } from '@/types/macro'
import { computed } from 'vue'
import MapCanvas from '@/components/MapCanvas.vue'
import { useMacroStore } from '@/store/macro'

const props = defineProps({
  macro: { type: Object as () => MacroInfoPlace, required: true },
  size: { type: Number, default: 180 },
})

const macroStore = useMacroStore()
const markMap = ['A', 'B', 'C', 'D', '1', '2', '3', '4']

const markers = computed<CanvasMarker[]>(() => {
  if (!props.macro?.Place)
    return []
  const places = props.macro.Place
  const keys = Object.keys(places) as Array<keyof typeof places>
  return keys.map((key, idx) => {
    const p = places[key]
    return {
      key,
      label: markMap[idx] ?? key,
      x: Number(p.X),
      z: Number(p.Z),
      active: p.Active,
    }
  })
})
</script>

<template>
  <MapCanvas
    :map-id="Number(macroStore.selectZone)"
    :force-territory-type="Number(macroStore.selectZone)"
    :markers="markers"
    :size="size"
  />
</template>
