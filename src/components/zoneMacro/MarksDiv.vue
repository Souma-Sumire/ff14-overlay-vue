<script setup lang="ts">
import type { MacroInfoPlace } from '@/types/macro'
import type { WayMarkInfo } from '@/types/PostNamazu'
import { useMacroStore } from '@/store/macro'

const props = defineProps({ macro: { type: Object as () => MacroInfoPlace, required: true } })

const macroStore = useMacroStore()

const offset = { x: 100, y: 100 }
const markMap = [
  'A',
  'B',
  'C',
  'D',
  '1',
  '2',
  '3',
  '4',
]

const markViewSize = 180
const markViewScale = 3
const markViewFontSize = 19

watch(
  () => props.macro.Place,
  () => {
    const ave = { x: 0, y: 0, count: 0 }
    for (const key in props.macro.Place) {
      const e = props.macro.Place[
        key as keyof typeof props.macro.Place
      ] as WayMarkInfo
      if (e.Active !== true)
        continue

      ave.x += Number(e.X)
      ave.y += Number(e.Z)
      ave.count++
    }
    if (ave.count === 0) {
      offset.x = -macroStore.defaultX
      offset.y = -macroStore.defaultY
    }
    else {
      offset.x = ave.x / ave.count
      offset.y = ave.y / ave.count
    }
  },
  { immediate: true },
)

function getOffset(v: { X: number, Z: number }) {
  const left = `${Math.min(markViewSize, Math.max(0, (v.X - offset.x) * markViewScale + markViewSize / 2))}px`
  const top = `${Math.min(markViewSize, Math.max(0, (v.Z - offset.y) * markViewScale + markViewSize / 2))}px`
  return { left, top }
}
</script>

<template>
  <div
    style="position: relative; background-color: rgba(214, 199, 148, 1)"
    :style="{
      height: `${markViewSize}px`,
      width: `${markViewSize}px`,
      fontSize: `${markViewFontSize}px`,
    }"
  >
    <span
      v-for="(v, k, i) in props.macro.Place"
      :key="i"
      :class="`markIcon` + ` ` + `markIcon${k}`"
      :style="getOffset(v)"
    >
      {{ v.Active ? markMap[i] : "" }}
    </span>
  </div>
</template>

<style scoped lang="scss"></style>
