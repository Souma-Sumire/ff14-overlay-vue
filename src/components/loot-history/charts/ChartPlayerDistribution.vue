<template>
  <div class="chart-container">
    <div class="chart-header">
      <div class="chart-title">获取数量统计</div>
    </div>
    <div class="chart-body">
      <v-chart 
        class="echarts-instance" 
        :option="option" 
        :update-options="{ notMerge: true }" 
        :theme="isDark ? 'dark' : ''"
        autoresize 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import { useDark } from '@vueuse/core'
import type { LootRecord } from '@/utils/lootParser'
import { getRoleColor, getRoleDisplayName } from '@/utils/lootParser'
import { getChartLabelRich, formatChartPlayerLabel } from '@/utils/chartUtils'

const isDark = useDark({
  storageKey: 'loot-history-theme',
})

use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
])

const props = defineProps<{
  records: LootRecord[]
  players: string[]
  getActualPlayer?: (name: string) => string
  getPlayerRole?: (name: string) => string | undefined
  playerVisibility?: 'all' | 'role' | 'job' | 'initial'
}>()

const option = computed(() => {
  const visibility = props.playerVisibility
  const counts = new Map<string, number>()
  props.players.forEach((p) => counts.set(p, 0))

  props.records.forEach((r) => {
    const p = props.getActualPlayer ? props.getActualPlayer(r.player) : r.player
    if (counts.has(p)) {
      counts.set(p, (counts.get(p) || 0) + 1)
    }
  })

  // 直接使用 props.players 的顺序，因为外部已经按 Role 排序好了
  const dataList = props.players.map((p) => {
    const role = props.getPlayerRole ? props.getPlayerRole(p) : undefined
    const count = counts.get(p) || 0
    return {
      name: p,
      value: count,
      role: role ? getRoleDisplayName(role) : '',
    }
  })

  const xData = dataList.map((d) => d.name)
  const seriesData = dataList.map((d) => d.value)
  
  const nameToRoleMap = new Map<string, string>()
  props.players.forEach((p) => {
    const role = props.getPlayerRole ? props.getPlayerRole(p) : undefined
    if (role) nameToRoleMap.set(p, role)
  })

  return {
    backgroundColor: 'transparent',
    animation: false,
    title: { show: false, text: visibility },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const item = params[0]
        const name = item.name
        const role = nameToRoleMap.get(name)
        const roleStr = role ? `[${role}] ` : ''
        return `${roleStr}${name}<br/>获取数量: <b>${item.value}</b>`
      },
    },
    grid: {
      left: 10,
      right: 20,
      bottom: 10,
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisTick: {
        alignWithLabel: true,
      },
      axisLabel: {
        interval: 0,
        rotate: 0,
        formatter: (value: string) => {
          const rawRole = nameToRoleMap.get(value)
          return formatChartPlayerLabel(value, rawRole, props.playerVisibility)
        },
        rich: getChartLabelRich(props.playerVisibility),
        color: isDark.value ? '#e2e8f0' : '#64748b',
      },
      axisLine: {
        lineStyle: {
          color: isDark.value ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
        }
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: {
        lineStyle: {
          color: isDark.value ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
        }
      },
      axisLabel: {
        color: isDark.value ? '#94a3b8' : '#64748b',
      }
    },
    series: [
      {
        name: '获取数量',
        type: 'bar',
        barWidth: '50%',
        data: seriesData,
        itemStyle: {
          color: (params: any) => {
            const name = params.name
            const role = nameToRoleMap.get(name)
            return getRoleColor(role)
          },
          borderRadius: [4, 4, 0, 0],
        },

        label: {
          show: true,
          position: 'top',
          color: isDark.value ? '#f1f5f9' : '#1e293b',
        },
      },
    ],
  }
})
</script>

<style lang="scss" scoped>
.chart-container {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 400px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  transition: all 0.3s ease;
}

.chart-header {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.chart-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  transition: color 0.3s;
}

.chart-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.chart-body {
  flex: 1;
  min-height: 0;
  position: relative;
  width: 100%;
}

.echarts-instance {
  width: 100%;
  height: 100%;
  min-height: 300px;
}
</style>

<style lang="scss">
html.dark .chart-container {
  background-color: #252632;
  border-color: rgba(255, 255, 255, 0.08);
}

html.dark .chart-title {
  color: rgba(255, 255, 255, 0.9);
}

html.dark .chart-subtitle {
  color: #94a3b8;
}
</style>
