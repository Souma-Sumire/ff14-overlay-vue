<script setup lang="ts">
import { computed } from "vue";
import PlayerDisplay from "./PlayerDisplay.vue";
import RoleBadge from "./RoleBadge.vue";
import { ElOption, ElSelect } from "element-plus";

const props = withDefaults(
  defineProps<{
    role: string;
    modelValue: string | undefined;
    allPlayers: string[];
    assignedPlayers: Set<string>;
    getDisplayName: (p: string) => string;
    getPlayerRole: (p: string) => string | null | undefined;
    variant?: "card" | "row";
    placeholder?: string;
    allowCreate?: boolean;
    size?: "default" | "small" | "large";
    teleported?: boolean;
  }>(),
  {
    teleported: true,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", val: string): void;
  (e: "change", val: string): void;
}>();

const playerOptions = computed(() => {
  if (!props.assignedPlayers) return props.allPlayers;
  return props.allPlayers.filter((p) => p === props.modelValue || !props.assignedPlayers?.has(p));
});
const displayNameByPlayer = computed(() => {
  const map: Record<string, string> = {};
  props.allPlayers.forEach((p) => {
    map[p] = props.getDisplayName(p);
  });
  return map;
});
const playerOptionItems = computed(() => {
  return playerOptions.value.map((p) => {
    return {
      value: p,
      label: displayNameByPlayer.value[p] || props.getDisplayName(p),
      role: props.getPlayerRole(p),
    };
  });
});

function resolveDisplayName(name: string) {
  return displayNameByPlayer.value[name] || props.getDisplayName(name);
}

function handleChange(val: string) {
  emit("update:modelValue", val);
  emit("change", val);
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
        placement="bottom-start"
        :fallback-placements="variant === 'card' ? ['bottom-start'] : ['bottom-start', 'top-start']"
        popper-class="role-setup-select-popper"
        class="role-select"
        @change="handleChange"
      >
        <template v-if="variant === 'row'" #label="{ label, value }">
          {{ resolveDisplayName(value || label) }}
        </template>
        <ElOption
          v-for="item in playerOptionItems"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        >
          <div class="select-player-row">
            <PlayerDisplay :name="item.value" :role="item.role" :show-only-role="false" />
          </div>
        </ElOption>
      </ElSelect>
    </div>
  </div>
</template>

<style lang="scss">
.role-setup-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.is-variant-card {
    display: contents; /* 让子元素直接参与父网格 */
  }

  &.is-variant-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 2px 4px;
    width: 100%;

    .item-header {
      flex-shrink: 0;
      width: 32px;
      display: flex;
      justify-content: center;
    }

    .item-body {
      flex: 0 1 180px; /* 固定基础宽度为180px，允许缩小 */
      min-width: 0;
    }
  }

  .item-body {
    .role-select {
      width: 100% !important;

      .el-input__wrapper {
        box-shadow: none !important;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 0 8px;
        height: 30px;
        transition: border-color 0.1s;

        &:hover {
          border-color: #cbd5e1;
        }

        &.is-focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px #3b82f6 inset !important;
        }
      }
    }
  }
}

.role-setup-select-popper {
  max-width: calc(100vw - 24px);
}

.role-setup-select-popper .el-select-dropdown__wrap {
  max-height: 240px;
}

html.dark {
  .role-setup-item {
    &.is-variant-row .item-body .role-select .el-input__wrapper {
      background-color: #0f172a !important;
      border-color: #334155;

      &:hover {
        border-color: #475569;
      }
    }
  }
}
</style>
