<template>
  <div
    class="mini-roll"
    :class="[rollTypeClass, { 'winner-badge': isWinner }]"
    :title="rollTitle"
  >
    <PlayerDisplay
      :name="roll.player"
      :role="role"
      :show-only-role="showOnlyRole"
      class="mr-display"
    />

    <div class="mr-content">
      <!-- Roll Type Icon -->
      <span
        class="mr-type"
        :class="[rollTypeClass, { 'type-full-width': isSpecialType }]"
      >
        {{ rollTypeIcon }}
      </span>

      <!-- Roll Value -->
      <span v-if="hasValue && roll.type !== 'replace'" class="mr-val">
        {{ roll.value !== null ? roll.value : '-' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PlayerDisplay from './PlayerDisplay.vue'
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
  return `type-${props.roll.type}`
})

const rollTypeIcon = computed(() => getRollTypeIcon(props.roll.type))

const rollTitle = computed(() => {
  const typeName = getRollTypeName(props.roll.type)
  const displayName = (props.showOnlyRole && role.value) ? role.value : props.roll.player
  return `${displayName} ${typeName} ${props.roll.value ?? ''}`
})

const hasValue = computed(() => {
  return props.roll.type !== 'assign' && props.roll.type !== 'direct'
})

const isSpecialType = computed(() => {
  return (
    props.roll.type === 'assign' ||
    props.roll.type === 'direct' ||
    props.roll.type === 'replace'
  )
})
</script>

<style lang="scss" scoped>
.mini-roll {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px 0 2px;
  font-size: 11px;
  margin: 2px 4px 2px 0;
  cursor: default;
  line-height: 1;
  height: 24px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
  color: #64748b;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);

  html.dark & {
    background: rgba(255, 255, 255, 0.03);
    color: #94a3b8;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  &.winner-badge {
    font-weight: 700;
    font-size: 12px;
    color: #1e293b;
    background: rgba(59, 130, 246, 0.06); 
    box-shadow: 0 1px 2px rgba(59, 130, 246, 0.05);

    html.dark & {
      color: #f1f5f9;
      background: rgba(59, 130, 246, 0.15);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
  }
}

.mr-display {
  padding: 0 2px;
}

.mr-content {
  display: flex;
  align-items: center;
  gap: 4px;
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
  font-weight: 800;
  white-space: nowrap;

  html.dark & {
    color: rgba(255, 255, 255, 0.4); 
  }
}

.mr-type.type-full-width {
  width: auto;
  padding: 0 2px;
  font-weight: normal;
}

.type-need {
  color: #d97706;
  html.dark & {
    color: #fbbf24;
  }
}
.type-greed {
  color: #475569;
  html.dark & {
    color: #94a3b8;
  }
}
.type-assign {
  color: #9333ea;
  html.dark & {
    color: #c084fc;
  }
}
.type-direct {
  color: #64748b;
  html.dark & {
    color: #94a3b8;
  }
}
.type-replace {
  color: #6366f1;
  html.dark & {
    color: #818cf8;
  }
}

.mr-val {
  font-weight: 800;
  color: #334155;
  font-variant-numeric: tabular-nums;

  html.dark & {
    color: rgba(255, 255, 255, 0.9); 
  }
}
</style>
