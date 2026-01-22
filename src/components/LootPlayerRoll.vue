<template>
  <div
    class="mini-roll"
    :class="[rollTypeClass, { 'winner-badge': isWinner }]"
    :title="rollTitle"
  >
    <RoleBadge
      :role="role"
      :large="showOnlyRole"
      style="margin-right: 4px"
    />

    <!-- Player Name -->
    <span class="mr-player" v-if="!showOnlyRole || !role">
      {{ roll.player }}
    </span>

    <!-- Roll Type Icon -->
    <span
      class="mr-type"
      :class="[rollTypeClass, { 'type-full-width': isSpecialType }]"
    >
      {{ rollTypeIcon }}
    </span>

    <!-- Roll Value -->
    <span v-if="hasValue" class="mr-val">
      {{ roll.value !== null ? roll.value : '-' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RoleBadge from './RoleBadge.vue'
import {
  type RollInfo,
  getRollTypeIcon,
  getRollTypeName,
} from '@/utils/lootParser'

const props = defineProps<{
  roll: RollInfo
  isWinner?: boolean
  showOnlyRole?: boolean
  getPlayerRole: (p: string) => string | undefined
}>()


const role = computed(() => props.getPlayerRole(props.roll.player))


const rollTypeClass = computed(() => {
  if (props.roll.type === 'assign') return 'type-assign'
  if (props.roll.type === 'direct') return 'type-direct'
  return `type-${props.roll.type}`
})

const rollTypeIcon = computed(() => {
  if (props.roll.type === 'assign') return '队长分配'
  if (props.roll.type === 'direct') return '直接获得'
  return getRollTypeIcon(props.roll.type)
})

const rollTitle = computed(() => {
  const typeName = props.roll.type === 'assign' ? '分配获得' : 
                   props.roll.type === 'direct' ? '直接获得' : 
                   getRollTypeName(props.roll.type)
  return `${props.roll.player} ${typeName} ${props.roll.value ?? ''}`
})

const hasValue = computed(() => {
  return props.roll.type !== 'assign' && props.roll.type !== 'direct'
})

const isSpecialType = computed(() => {
  return props.roll.type === 'assign' || props.roll.type === 'direct'
})
</script>

<style scoped>
.mini-roll {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  color: #64748b;
  margin: 2px 0;
  cursor: default;
  line-height: 1;
  height: 22px;
  box-sizing: border-box;
}

.winner-badge {
  font-weight: 700;
  font-size: 12px;
  max-width: 180px;
  background: transparent;
  border: none;
  color: #1e293b;
  padding: 0;
}

.mr-type {
  width: 1.5em; 
  height: 14px;
  background: transparent;
  color: #64748b;
  border-radius: 3px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 11px;
  font-weight: 800;
}

.mr-type.type-full-width {
  width: auto;
  padding: 0 4px;
}

.type-need {
  color: #d97706;
}
.type-greed {
  color: #475569;
}
.type-assign {
  color: #9333ea;
}
.type-direct {
  color: #64748b;
}

.mr-val {
  font-weight: 800;
  color: #334155;
  font-family: inherit;
  font-variant-numeric: tabular-nums; 
}

.mr-player {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #334155;
}
</style>
