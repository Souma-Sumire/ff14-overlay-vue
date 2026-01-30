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
  const jobName = jobIcon.replaceAll(/([A-Z])/g, ' $1').trim()
  return `https://souma.diemoe.net/resources/img/cj${type}/${jobName}.png`
}

function onError(e: Event) {
  imageError.value = true
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  console.error('Failed to load image:', props.row.jobIcon)
}

const showIcon = computed(
  () =>
    !imageError.value && (store.userOptions.targetType ?? 'icon') === 'icon',
)

const isLethalIcon = isLethal(props.row)
</script>

<template>
  <div class="target">
    <img
      v-if="showIcon"
      :class="`${store.isBrowser ? 'browser' : 'act'} jobIcon cj${
        store.userOptions.iconType
      } ${isLethalIcon ? 'lethal-icon' : ''}`"
      :src="getIconSrc(props.row.jobIcon, store.userOptions.iconType)"
      :alt="props.row.jobIcon"
      @error="onError"
    />
    <span v-else class="alt-text">{{ props.row.job }}</span>
    <span
      v-if="isLethalIcon"
      :class="`lethal-emoji ${store.isBrowser ? 'browser' : 'act'} emoji-cj${
        store.userOptions.iconType
      }`"
    >
      💀
    </span>
    <span v-if="props.row.hasDuplicate" class="has-duplicate">
      {{ store.formatterName(props.row.target) }}
    </span>
  </div>
</template>

<style scoped lang="scss">
.has-duplicate {
  zoom: 0.8;
  position: absolute;
  width: auto;
  text-align: center;
  font-weight: normal;
  right: 5px;
  bottom: 0;
  text-shadow:
    -0.8px 0 0 black,
    0 0.8px 0 black,
    0.8px 0 0 black,
    0 -0.8px 0 black;
  white-space: nowrap;
}

.lethal-icon {
  filter: grayscale(100%) brightness(80%);
}

.lethal-emoji {
  position: absolute;
  color: red;
  text-shadow:
    -1px 0 0 black,
    0 1px 0 black,
    1px 0 0 black,
    0 -1px 0 black;
  &.act {
    top: -3px;
    left: -7px;
    zoom: 0.7;
  }
  &.browser {
    top: -3px;
    left: -5.5px;
  }
  opacity: 0.75;
  font-size: 8px;
}

.emoji-cj3 {
  &.browser {
    top: 1px;
    left: 1.5px;
  }
  &.act {
    top: 2px;
    left: 2px;
  }
}

.jobIcon {
  width: 24px;
  object-fit: cover;
  vertical-align: middle;
  position: relative;
}

.cj1 {
  top: 1px;
  left: -2px;
}

.cj2 {
  right: 4px;
}

.cj3 {
  width: 32px;
  top: 1px;
}

.cj4 {
  right: 2px;
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
  text-shadow:
    -1px 0 3px $color,
    0 1px 3px $color,
    1px 0 3px $color,
    0 -1px 3px $color;
}
</style>
