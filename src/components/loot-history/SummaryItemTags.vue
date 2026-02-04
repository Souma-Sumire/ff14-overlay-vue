<script setup lang="ts">
interface SummaryItem {
  count: number
  isBis?: boolean
  isRandomWeapon?: boolean
  layerName?: string
  details?: { name: string, count: number }[]
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

    <el-tooltip
      v-if="item.isRandomWeapon && item.details && item.details.length"
      effect="dark"
      placement="top"
      :show-after="200"
      popper-class="rw-tooltip-popper"
    >
      <template #content>
        <div class="rw-tooltip-list">
          <div v-for="(d, i) in item.details" :key="i" class="rw-tip-row">
            <span class="rw-tip-name">{{ d.name }}</span>
            <span class="rw-tip-count">x{{ d.count }}</span>
          </div>
        </div>
      </template>
      <span
        class="count-badge cursor-help" :class="[
          item.count > 1 ? 'count-many' : item.count === 0 ? 'count-none' : 'count-single',
        ]"
      >
        x{{ item.count }}
      </span>
    </el-tooltip>
    <span
      v-else
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

.cursor-help {
  cursor: help;
  text-decoration: underline dashed currentColor 1px;
  text-underline-offset: 3px;
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
  html.dark & {
    background: rgba(148, 163, 184, 0.12);
    color: #94a3b8;
    border-color: rgba(148, 163, 184, 0.15);
  }
}

.bis-tag {
  background: rgba(219, 39, 119, 0.08);
  color: #db2777;
  border: 1px solid rgba(219, 39, 119, 0.15);
  html.dark & {
    background: rgba(219, 39, 119, 0.15);
    color: #f472b6;
    border-color: rgba(219, 39, 119, 0.25);
  }
}

.non-bis-tag {
  background: rgba(100, 116, 139, 0.08);
  color: #64748b;
  border: 1px solid rgba(100, 116, 139, 0.15);
  html.dark & {
    background: rgba(148, 163, 184, 0.12);
    color: #94a3b8;
    border-color: rgba(148, 163, 184, 0.15);
  }
}

.random-weapon-tag {
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.15);
  html.dark & {
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
  html.dark & {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border-color: rgba(59, 130, 246, 0.25);
  }
}

.count-none {
  background: #f8fafc;
  color: #94a3b8;
  border: 1px solid #e2e8f0;

  html.dark & {
    background: rgba(255, 255, 255, 0.05);
    color: #64748b;
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.count-many {
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fee2e2;
  html.dark & {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.2);
  }
}
</style>

<style>
.rw-tooltip-popper {
  background: #1f2937 !important;
  border: 1px solid #374151 !important;
  padding: 6px 10px !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4) !important;
}
/* 强制小箭头背景颜色一致 */
.rw-tooltip-popper .el-popper__arrow::before {
  background: #1f2937 !important;
  border: 1px solid #374151 !important;
}

.rw-tooltip-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
}
.rw-tip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11.5px;
  line-height: 1.3;
}
.rw-tip-name {
  color: #f3f4f6 !important;
  font-weight: 500;
}
.rw-tip-count {
  color: #fbbf24 !important;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
}
</style>
