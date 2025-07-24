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
  <div>
    <span v-if="store.userOptions.showIcon" class="target">
      <img
        v-if="!imageError"
        :class="`jobIcon cj${store.userOptions.iconType}`"
        :src="getIconSrc(props.row.jobIcon, store.userOptions.iconType)"
        :alt="props.row.jobIcon"
        :data-job="store.userOptions.showName ? '' : props.row.job"
        @error="onError"
      >
      <span v-else class="alt-text">{{ props.row.job }}</span>
      <span
        v-if="store.userOptions.showName"
        :class="`job ${props.row.jobIcon} ${
          props.row.targetId === props.row.povId ? 'YOU' : ''
        }`"
        :style="
          !store.userOptions.abbrId && store.userOptions.showName
            ? { overflow: 'hidden', textOverflow: 'ellipsis' }
            : {}
        "
      >
        {{
          props.row.targetId === props.row.povId
            && store.userOptions.replaceWithYou
            ? "YOU"
            : store.userOptions.anonymous
              ? props.row.job
              : store.formatterName(props.row.target)
        }}
      </span>
    </span>
  </div>
</template>

<style scoped lang="scss">
.jobIcon {
  width: 2em;
  object-fit: cover;
  vertical-align: middle;
  position: relative;
}
.cj3 {
  width: 2.75em;
  left: -4px;
  top: 1px;
}
</style>
