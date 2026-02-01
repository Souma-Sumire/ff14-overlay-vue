<script setup lang="ts">
import type { LootRecord } from '@/utils/lootParser'
import ChartPlayerDistribution from './ChartPlayerDistribution.vue'
import ChartRollLuck from './ChartRollLuck.vue'
import ChartWeeklyTrend from './ChartWeeklyTrend.vue'

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

<style lang="scss" scoped>
.stats-panel {
  padding: 16px;
  background: #f8fafc;
  min-height: 400px;
  transition: background-color 0.3s;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.charts-grid > * {
  min-width: 0;
}

@media (max-width: 1000px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style lang="scss">
html.dark .stats-panel {
  background: #161823;
}
</style>
