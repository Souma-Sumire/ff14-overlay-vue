<script setup lang="ts">
import { inject } from 'vue'
import RoleBadge from './RoleBadge.vue'

defineProps<{
  name: string
  role: string | null | undefined
  showOnlyRole: boolean
  nameClass?: string
}>()

const getDisplayName = inject('getDisplayName', (name: string) => name)
</script>

<template>
  <div class="player-display" :class="{ 'is-large': showOnlyRole }">
    <RoleBadge :role="role" :large="showOnlyRole" class="role-icon" />
    <span
      v-if="!showOnlyRole || !role"
      class="player-name-text"
      :class="nameClass"
    >
      {{ getDisplayName(name) }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.player-display {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  vertical-align: middle;
}

.role-icon {
  flex-shrink: 0;
}

.player-name-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
  color: #334155;

  html.dark & {
    color: #f1f5f9;
  }
}
</style>
