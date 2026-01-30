<script setup lang="ts">
import type { FFIcon } from '@/types/fflogs'
import type { RowVO } from '@/types/keigennRecord2'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'

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
</script>

<template>
  <div class="target">
    <img
      v-if="showIcon"
      :class="`${store.isBrowser ? 'browser' : 'act'} jobIcon cj${
        store.userOptions.iconType
      }`"
      :src="getIconSrc(props.row.jobIcon, store.userOptions.iconType)"
      :alt="props.row.jobIcon"
      @error="onError"
    />
    <span v-else class="alt-text">{{ props.row.job }}</span>
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
