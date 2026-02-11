<script setup lang="ts">
import { computed } from 'vue'
import PlayerDisplay from './PlayerDisplay.vue'
import RoleBadge from './RoleBadge.vue'

const props = defineProps<{
  role: string
  modelValue: string | undefined
  allPlayers: string[]
  assignedPlayers: Set<string>
  getDisplayName: (p: string) => string
  getPlayerRole: (p: string) => string | null | undefined
  variant?: 'card' | 'row'
  placeholder?: string
  allowCreate?: boolean
  size?: 'default' | 'small' | 'large'
  teleported?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'change', val: string): void
}>()

const playerOptions = computed(() => {
  if (!props.assignedPlayers)
    return props.allPlayers
  return props.allPlayers.filter(
    p => p === props.modelValue || !props.assignedPlayers?.has(p),
  )
})

function handleChange(val: string) {
  emit('update:modelValue', val)
  emit('change', val)
}
</script>

<template>
  <div
    class="role-setup-item"
    :class="[`is-variant-${variant || 'row'}`, { 'is-filled': !!modelValue }]"
  >
    <div class="item-header">
      <RoleBadge :role="role" :large="variant === 'card'" />
    </div>

    <div class="item-body">
      <ElSelect
        :model-value="modelValue"
        :placeholder="placeholder"
        filterable
        clearable
        :allow-create="allowCreate"
        :default-first-option="allowCreate"
        :size="size || (variant === 'card' ? 'default' : 'small')"
        :teleported="teleported"
        class="role-select"
        @change="handleChange"
      >
        <template v-if="variant === 'row'" #label="{ label, value }">
          {{ getDisplayName(value || label) }}
        </template>
        <ElOption
          v-for="p in playerOptions"
          :key="p"
          :label="getDisplayName(p)"
          :value="p"
        >
          <div class="select-player-row">
            <PlayerDisplay
              :name="p"
              :role="getPlayerRole(p)"
              :show-only-role="false"
            />
          </div>
        </ElOption>
      </ElSelect>
    </div>
  </div>
</template>

<style lang="scss" scoped>

</style>
