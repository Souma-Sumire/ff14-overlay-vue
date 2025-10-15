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
  position: absolute;

  font-size: 7.5px;
  width: 24px;
  text-align: center;
  right: 0;
  bottom: 0;
  text-shadow: -1px 0 0 black, 0 1px 0 black, 1px 0 0 black, 0 -1px 0 black;
}

.lethal-icon {
  filter: grayscale(100%) brightness(80%);
  // transform-style: preserve-3d;
  // 同样的css在act悬浮窗与Chrome浏览器悬浮窗的效果不同，原因未知，似乎是因为用到了一些过于新的css属性
  &.act {
    transform: translateX(2.5px) rotateZ(-90deg);
  }
  &.browser {
    transform: rotateZ(-90deg);
  }
}

.lethal-emoji {
  position: absolute;
  color: red;
  text-shadow: -1px 0 0 black, 0 1px 0 black, 1px 0 0 black, 0 -1px 0 black;
  &.act {
    top: -3px;
    left: -3.5px;
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

.cj1.lethal-icon {
  &.act {
    left: -0.75px;
  }
  &.browser {
    left: -0.25px;
  }
}

.cj2 {
  right: 4px;
}

.cj2.lethal-icon {
  &.act {
    right: 5px;
  }
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
  text-shadow: -1px 0 3px $color, 0 1px 3px $color, 1px 0 3px $color,
    0 -1px 3px $color;
}
</style>
