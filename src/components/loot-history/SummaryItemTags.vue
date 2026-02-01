<script setup lang="ts">
interface SummaryItem {
  count: number
  isBis?: boolean
  isRandomWeapon?: boolean
  layerName?: string
  [key: string]: any
}

defineProps<{
  item: SummaryItem
}>()
</script>

<template>
  <div class="summary-item-right">
    <span v-if="item.isRandomWeapon" class="random-weapon-tag">随武</span>
    <template v-else>
      <span v-if="item.isBis" class="bis-tag">毕业</span>
      <span v-else-if="item.isBis === false" class="non-bis-tag">副职</span>
    </template>
    <span v-if="item.layerName" class="layer-tag">{{ item.layerName }}</span>
    <span
      class="count-badge" :class="[
        item.count > 1 ? 'count-many' : item.count === 0 ? 'count-none' : 'count-single',
      ]"
    >
      x{{ item.count }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.summary-item-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bis-tag,
.non-bis-tag,
.random-weapon-tag,
.layer-tag {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 99px;
  font-weight: 800;
  white-space: nowrap;
}

.layer-tag {
  background: rgba(148, 163, 184, 0.08);
  color: #64748b;
  border: 1px solid rgba(148, 163, 184, 0.15);
  :global(html.dark) & {
    background: rgba(148, 163, 184, 0.12);
    color: #94a3b8;
    border-color: rgba(148, 163, 184, 0.15);
  }
}

.bis-tag {
  background: rgba(219, 39, 119, 0.08);
  color: #db2777;
  border: 1px solid rgba(219, 39, 119, 0.15);
  :global(html.dark) & {
    background: rgba(219, 39, 119, 0.15);
    color: #f472b6;
    border-color: rgba(219, 39, 119, 0.25);
  }
}

.non-bis-tag {
  background: rgba(100, 116, 139, 0.08);
  color: #64748b;
  border: 1px solid rgba(100, 116, 139, 0.15);
  :global(html.dark) & {
    background: rgba(148, 163, 184, 0.12);
    color: #94a3b8;
    border-color: rgba(148, 163, 184, 0.15);
  }
}

.random-weapon-tag {
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.15);
  :global(html.dark) & {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border-color: rgba(245, 158, 11, 0.2);
  }
}

.count-badge {
  padding: 1px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 10px;
}

.count-single {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.2);
  :global(html.dark) & {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border-color: rgba(59, 130, 246, 0.25);
  }
}

.count-none {
  background: #f8fafc;
  color: #cbd5e1;
  border: 1px solid #f1f5f9;
  :global(html.dark) & {
    background: rgba(255, 255, 255, 0.02);
    color: #475569;
    border-color: rgba(255, 255, 255, 0.05);
  }
}

.count-many {
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fee2e2;
  :global(html.dark) & {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.2);
  }
}
</style>
