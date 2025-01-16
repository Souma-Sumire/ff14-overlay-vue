<script setup lang="ts">
import type { RowVO } from '@/types/keigennRecord2'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'
import { getImgSrc, handleImgError } from '@/utils/xivapi'

const props = defineProps({
  row: { type: Object as () => RowVO, required: true },
})
const store = useKeigennRecord2Store()
</script>

<template>
  <div>
    <span v-if="store.userOptions.showIcon" class="target">
      <img
        class="jobIcon"
        :src="getImgSrc(`/cj/companion/${props.row.jobIcon}.png`)"
        alt=""
        :data-job="store.userOptions.showName ? '' : props.row.job"
        loading="lazy"
        @error="handleImgError"
      >

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

<style scoped lang="scss"></style>
