<script setup lang="ts">
import type { MacroInfoPlace } from '@/types/macro'
import type { WayMarkInfo, WayMarkKeys } from '@/types/PostNamazu'
import { syncMap } from '@/resources/macro'
import { useMacroStore } from '@/store/macro'

const props = defineProps({
  macro: { type: Object as () => MacroInfoPlace, required: true },
})

const macroStore = useMacroStore()

const offset = { x: 0, y: 0, active: false }
const markMap: Record<WayMarkKeys, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  One: '1',
  Two: '2',
  Three: '3',
  Four: '4',
}

// 多变迷宫地图ID
const specialMap = Object.entries(syncMap).flat().map(v => Number(v))
const marks = Object.keys(markMap) as WayMarkKeys[]
const markViewSize = 180
const markViewScale = 3
const markViewFontSize = 19

watch(
  () => macroStore.selectZone,
  () => {
    if (specialMap.includes(Number(macroStore.selectZone))) {
      offset.active = true
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
      offset.x = ave.x / ave.count
      offset.y = ave.y / ave.count
    }
    else {
      offset.active = false
      offset.x = 0
      offset.y = 0
    }
  },
  { immediate: true },
)

function getOffset(v: number, offset: number) {
  return Math.min(
    markViewSize,
    Math.max(0, (v + offset) * markViewScale + markViewSize / 2),
  )
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
      v-for="(mark, index) in marks"
      :key="index"
      :class="`markIcon` + ` ` + `markIcon${mark}`"
      :style="{
        left: `${getOffset(
          Number(macro.Place[mark]?.X),
          offset.active ? -offset.x : macroStore.defaultX,
        )}px`,
        top: `${getOffset(
          Number(macro.Place[mark]?.Z),
          offset.active ? -offset.y : macroStore.defaultY,
        )}px`,
      }"
    >
      {{ macro.Place[mark]?.Active ? markMap[mark] ?? mark : "" }}
    </span>
  </div>
</template>

<style scoped lang="scss"></style>
