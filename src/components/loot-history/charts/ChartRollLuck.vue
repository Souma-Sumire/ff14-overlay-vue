<template>
  <div class="chart-container">
    <div class="chart-header">
      <div class="chart-title">Roll 点运气统计</div>
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
import { BarChart, BoxplotChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
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
  BoxplotChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
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
  // 1. 收集每位玩家的 Roll 点历史
  const playerRolls = new Map<string, number[]>()
  props.players.forEach((p) => playerRolls.set(p, []))

  props.records.forEach((r) => {
    // 遍历该条记录的所有 roll 信息
    r.rolls.forEach((roll) => {
      // 只统计 Need 和 Greed 且有数值的
      if ((roll.type === 'need' || roll.type === 'greed') && roll.value !== null) {
        const p = props.getActualPlayer ? props.getActualPlayer(roll.player) : roll.player
        // 只统计在显示列表中的玩家
        if (playerRolls.has(p)) {
          playerRolls.get(p)!.push(roll.value)
        }
      }
    })
  })

  // 2. 计算统计指标 (平均值)
  const dataList = props.players.map((p) => {
    const rolls = playerRolls.get(p) || []
    const count = rolls.length
    const sum = rolls.reduce((a, b) => a + b, 0)
    const avg = count > 0 ? sum / count : 0
    const max = count > 0 ? Math.max(...rolls) : 0
    const min = count > 0 ? Math.min(...rolls) : 0
    const role = props.getPlayerRole ? props.getPlayerRole(p) : undefined
    
    return {
      name: p,
      value: avg, // 主图显示平均值
      min,
      max,
      count,
      role: role || '',
      formattedRole: role ? getRoleDisplayName(role) : '',
    }
  })

  // 3. 准备图表数据
  const xData = dataList.map((d) => d.name)
  const seriesData = dataList.map((d) => d.value)
  
  const nameToRoleMap = new Map<string, string>()
  const nameToDataMap = new Map<string, typeof dataList[0]>()
  
  dataList.forEach((d) => {
    nameToRoleMap.set(d.name, d.formattedRole)
    nameToDataMap.set(d.name, d)
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
        const data = nameToDataMap.get(name)
        if (!data) return ''

        const roleStr = data.formattedRole ? `[${data.formattedRole}] ` : ''
        
        let html = `${roleStr}<b>${name}</b><br/>`
        if (data.count === 0) {
          html += `<span style="color:#999">无数据</span>`
        } else {
          html += `平均点数: <b>${data.value.toFixed(1)}</b><br/>`
          html += `最高点数: ${data.max}<br/>`
          html += `最低点数: ${data.min}<br/>`
          html += `Roll点次数: ${data.count}`
        }
        return html
      },
    },
    grid: {
      left: 10,
      right: 20,
      bottom: 10,
      top: '15%',
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
          const rawRole = nameToDataMap.get(value)?.role
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
      min: 0,
      max: 100,
      name: '平均点数',
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
        name: '平均Roll点',
        type: 'bar',
        barWidth: '50%',
        data: seriesData,
        itemStyle: {
          color: (params: any) => {
            const data = nameToDataMap.get(params.name)
            return getRoleColor(data?.role)
          },
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          formatter: (p: any) => p.value > 0 ? p.value.toFixed(1) : '',
          color: isDark.value ? '#f1f5f9' : '#1e293b',
        },
          markLine: {
            data: [{ type: 'average', name: '平均' }],
            symbol: 'none',
            lineStyle: {
              color: isDark.value ? 'rgba(255,255,255,0.4)' : '#999',
              type: 'dashed'
            },
            label: {
              position: 'start',
              formatter: '{b}',
              color: isDark.value ? '#94a3b8' : '#64748b',
              padding: [0, 8, 0, 0]
            }
          }
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

  :global(.dark) & {
    background-color: #252632;
    border-color: rgba(255, 255, 255, 0.08);
  }
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

  :global(.dark) & {
    color: rgba(255, 255, 255, 0.9);
  }
}

.chart-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;

  :global(.dark) & {
    color: #94a3b8;
  }
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
