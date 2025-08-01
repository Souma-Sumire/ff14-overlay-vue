<script setup lang="ts">
import type { SkillState } from '@/store/keySkills'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  skill: {
    src: string
    duration: number
    recast1000ms: number
  }
  state: SkillState
  speed: number
}>()

const layerRef = ref<HTMLElement | null>(null)
let frameId: number | null = null

// 冷却总时间（秒）
const totalTime = computed(() =>
  props.skill.duration + (props.skill.recast1000ms - props.skill.duration),
)

function updateCooldownLayer() {
  if (!props.state?.active || !layerRef.value)
    return

  const now = Date.now()
  const elapsed = ((now - (props.state.startTime || 0)) / 1000) * props.speed
  const total = totalTime.value

  if (elapsed >= total) {
    layerRef.value.style.clipPath = 'inset(100% 0 0 0)'
    cancelAnimationFrame(frameId!)
    return
  }

  const progress = elapsed / total
  const pct = 100 - progress * 100
  layerRef.value.style.clipPath = `inset(${pct}% 0 0 0)`

  frameId = requestAnimationFrame(updateCooldownLayer)
}

function startCooldown() {
  cancelAnimationFrame(frameId!)
  frameId = requestAnimationFrame(updateCooldownLayer)
}

onMounted(startCooldown)
onUnmounted(() => cancelAnimationFrame(frameId!))

watch(() => props.state?.startTime, () => {
  if (props.state?.active) {
    startCooldown()
  }
})

watch(() => props.speed, () => {
  requestAnimationFrame(updateCooldownLayer)
})
</script>

<template>
  <div class="skill-cooldown-display">
    <span
      class="duration"
      :class="state?.isRecast ? 'cooldown' : 'active'"
    >
      {{ state?.text || '' }}
    </span>
    <img :src="skill.src" draggable="false">
    <div
      v-if="state?.active"
      ref="layerRef"
      class="cooldown-layer"
    />
  </div>
</template>

<style scoped>
.skill-cooldown-display {
  position: relative;
  width: 40px;
  height: 40px;
}

.duration {
  z-index: 4;
  position: absolute;
  font-size: 18px;
  font-weight: bold;
  text-shadow: -1px 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, 0 -1px 2px #000;
  pointer-events: none;
}

.duration.cooldown {
  color: #fff;
}

.duration.active {
  color: gold;
}

img {
  width: 40px;
  height: 40px;
  user-select: none;
  -webkit-user-drag: none;
}

.cooldown-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  z-index: 2;
  background-color: rgba(0, 0, 0, 0.75);
  pointer-events: none;
  clip-path: inset(100% 0 0 0);
}
</style>
