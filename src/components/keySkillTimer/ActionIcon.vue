<script setup lang="ts">
import { idToSrc } from '@/utils/dynamicValue'
import { ref, watch } from 'vue'

const props = defineProps<{
  id: number | string
}>()

const src = ref('')
let timer: number | undefined

watch(
  () => props.id,
  (newId) => {
    if (timer) clearTimeout(timer)
    timer = window.setTimeout(() => {
      src.value = idToSrc(newId)
    }, 300)
  },
  { immediate: true }
)
</script>

<template>
  <div class="action-icon-wrapper">
    <img v-if="src" :src="src" class="action-icon" alt="" />
    <div v-else class="action-icon-placeholder" />
  </div>
</template>

<style scoped>
.action-icon-wrapper {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}
.action-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.action-icon-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.2);
}
</style>
