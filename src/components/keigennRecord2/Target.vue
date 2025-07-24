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
  const jobName = jobIcon.replace(/([A-Z])/g, ' $1').trim()
  return `https://souma.diemoe.net/resources/img/cj${type}/${jobName}.png`
}
function onError(e: Event) {
  imageError.value = true
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  console.error('Failed to load image:', props.row.jobIcon)
}
</script>

<template>
  <div class="target">
    <img
      v-if="!imageError && store.userOptions.targetType === 'icon'"
      :class="`jobIcon cj${store.userOptions.iconType}`"
      :src="getIconSrc(props.row.jobIcon, store.userOptions.iconType)"
      :alt="props.row.jobIcon"
      @error="onError"
    >
    <span v-else class="alt-text">{{ props.row.job }}</span>
  </div>
</template>

<style scoped lang="scss">
.jobIcon {
  width: 2em;
  object-fit: cover;
  vertical-align: middle;
  position: relative;
}

.cj1{
  top:1px
}

.cj3 {
  width: 32px;
  top: 1px;
}

.target {
  display: flex;
  flex-direction: row;
  align-items: center;
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
