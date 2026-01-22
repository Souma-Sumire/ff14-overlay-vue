<template>
  <div class="stats-panel">
    <div class="charts-grid">
      <ChartPlayerDistribution
        :records="records"
        :players="players"
        :get-actual-player="getActualPlayer"
        :get-player-role="getPlayerRole"
        :player-visibility="playerVisibility"
      />
      <ChartRollLuck
        :records="records"
        :players="players"
        :get-actual-player="getActualPlayer"
        :get-player-role="getPlayerRole"
        :player-visibility="playerVisibility"
      />
      <ChartWeeklyTrend
        :records="records"
        :players="players"
        :get-actual-player="getActualPlayer"
        :get-player-role="getPlayerRole"
        :record-week-corrections="recordWeekCorrections"
        :sync-start-date="syncStartDate"
        :player-visibility="playerVisibility"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ChartPlayerDistribution from './ChartPlayerDistribution.vue'
import ChartRollLuck from './ChartRollLuck.vue'
import ChartWeeklyTrend from './ChartWeeklyTrend.vue'
import type { LootRecord } from '@/utils/lootParser'

defineProps<{
  records: LootRecord[]
  players: string[]
  getActualPlayer?: (name: string) => string
  getPlayerRole?: (name: string) => string | undefined
  recordWeekCorrections?: Record<string, number>
  syncStartDate?: string | Date
  playerVisibility?: 'all' | 'role' | 'job' | 'initial'
}>()
</script>

<style scoped>
.stats-panel {
  padding: 16px;
  background: #f8fafc;
  min-height: 400px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.charts-grid > * {
  min-width: 0; /* 确保 grid item 可以缩小，防止被 ECharts 撑开 */
}

/* .charts-grid > :last-child {
  grid-column: auto;
  grid-column: span 2;
} */

/* 移动端适配：如果屏幕太小，强制单列 */
@media (max-width: 1000px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
