<template>
  <span
    v-if="role"
    class="role-badge"
    :class="{ 'badge-large': large }"
    :style="{ backgroundColor: bgColor }"
  >
    {{ roleDisplayName }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getRoleDisplayName, getRoleColor } from '@/utils/lootParser'

const props = defineProps<{
  role: string | null | undefined
  large?: boolean
}>()

const bgColor = computed(() => getRoleColor(props.role))
const roleDisplayName = computed(() => props.role ? getRoleDisplayName(props.role) : '')
</script>

<style scoped>
.role-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 4px;
  color: white;
  font-weight: 800;
  vertical-align: middle;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-family: inherit;
  font-weight: 800;
  min-width: 2.5em; 
  text-align: center;
}
.role-badge.badge-large {
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 6px;
}
</style>
