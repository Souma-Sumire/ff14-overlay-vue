<script setup lang="ts">
import type { FFIcon } from '@/types/fflogs'
import type { RowVO } from '@/types/keigennRecord2'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'
import { isLethal } from '@/utils/keigennRecord2'

const props = defineProps({
  row: { type: Object as () => RowVO, required: true },
})
const store = useKeigennRecord2Store()

const imageError = ref(false)

function getIconSrc(jobIcon: FFIcon, type: number) {
  const jobName = jobIcon.replace(/([A-Z])/g, ' $1').trim()
  return `https://souma.diemoe.net/resources/img/cj${type}/${jobName}.png`
}

function onError(e: Event) {
  imageError.value = true
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  console.error('Failed to load image:', props.row.jobIcon)
}

const showIcon = computed(
  () => !imageError.value && (store.userOptions.targetType ?? 'icon') === 'icon'
)

const isLethalIcon = computed(() => isLethal(props.row))
</script>

<template>
  <div class="target">
    <img
      v-if="showIcon"
      :class="`jobIcon cj${store.userOptions.iconType} ${
        isLethalIcon ? 'lethal-icon' : ''
      }`"
      :src="getIconSrc(props.row.jobIcon, store.userOptions.iconType)"
      :alt="props.row.jobIcon"
      @error="onError"
    />
    <span v-else class="alt-text">{{ props.row.job }}</span>
    <span v-if="isLethalIcon" class="lethal-emoji"> 💀 </span>
    <span v-if="props.row.hasDuplicate" class="has-duplicate">
      {{ store.formatterName(props.row.target) }}
    </span>
  </div>
</template>

<style scoped lang="scss">
.has-duplicate {
  position: absolute;
  font-size: 8px;
  width: 24px;
  text-align: center;
  top: 10px;
  text-shadow: -1px 0 0 black, 0 1px 0 black, 1px 0 0 black, 0 -1px 0 black;
}

.lethal-icon {
  filter: grayscale(100%) brightness(80%);
  // transform-style: preserve-3d;
  transform: 
  // rotateX(30deg)
    rotateZ(-90deg);
}

.lethal-emoji {
  position: absolute;
  color: red;
  text-shadow: -1px 0 0 black, 0 1px 0 black, 1px 0 0 black, 0 -1px 0 black;
  top: -0.3em;
  left: -0.6em;
  opacity: 0.9;
  font-size: 0.8em;
}

.jobIcon {
  width: 2em;
  object-fit: cover;
  vertical-align: middle;
  position: relative;
}

.cj1 {
  top: 1px;
}

.cj3 {
  width: 32px;
  top: 1px;
}

.target {
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
  // perspective: 30px;
}

.YOU {
  font-weight: bolder;
  $color: rgba(3, 169, 244, 0.4);
  text-shadow: -1px 0 3px $color, 0 1px 3px $color, 1px 0 3px $color,
    0 -1px 3px $color;
}
</style>
