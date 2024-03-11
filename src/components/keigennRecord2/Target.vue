<template>
  <div>
    <span v-if="store.userOptions.showIcon" class="target">
      <img
        class="jobIcon"
        :src="`//cafemaker.wakingsands.com/cj/companion/${props.row.jobIcon}.png`"
        alt=""
        :data-job="store.userOptions.showName ? '' : props.row.job"
        @error="handleImgError"
        loading="lazy"
      />

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
          props.row.targetId === props.row.povId &&
          store.userOptions.replaceWithYou
            ? "YOU"
            : store.userOptions.anonymous
            ? props.row.job
            : store.formatterName(props.row.target)
        }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { useKeigennRecord2Store } from "@/store/keigennRecord2";
import type { RowVO } from "@/types/keigennRecord2";
import { handleImgError } from "@/utils/xivapi";
const store = useKeigennRecord2Store();
const props = defineProps({
  row: { type: Object as () => RowVO, required: true },
});
</script>

<style scoped lang="scss"></style>
