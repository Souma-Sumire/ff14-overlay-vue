<template>
  <div class="chart-container">
    <div class="chart-header">
      <div class="chart-title">每周获取热力图</div>
    </div>
    <div class="chart-body" :style="{ height: chartHeight + 'px' }">
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
import { computed, ref, watchEffect } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { HeatmapChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  TitleComponent,
} from 'echarts/components'
import { useDark } from '@vueuse/core'
import type { LootRecord } from '@/utils/lootParser'
import { getRoleDisplayName } from '@/utils/lootParser'
import { getChartLabelRich, formatChartPlayerLabel } from '@/utils/chartUtils'
import { getRaidWeekStart, getRaidWeekLabel, getFormattedWeekLabel } from '@/utils/raidWeekUtils'

const isDark = useDark({
  storageKey: 'loot-history-theme',
})

use([
  CanvasRenderer,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  TitleComponent,
])

const props = defineProps<{
  records: LootRecord[]
  players: string[]
  getActualPlayer?: (name: string) => string
  getPlayerRole?: (name: string) => string | undefined

  recordWeekCorrections?: Record<string, number>
  syncStartDate?: string | Date
  playerVisibility?: 'all' | 'role' | 'job' | 'initial'
}>()

const zeroWeekStart = computed(() => {
  if (!props.syncStartDate) return null
  return getRaidWeekStart(new Date(props.syncStartDate))
})

// 简化 Label 显示逻辑
function getWeekInfo(record: LootRecord) {
  const offset = props.recordWeekCorrections?.[record.key] || 0
  const { label } = getRaidWeekLabel(record.timestamp, offset)
  const { label: formattedLabel, index } = getFormattedWeekLabel(label, zeroWeekStart.value)
  
  // 只显示第几周
  const displayLabel = props.syncStartDate ? `第 ${index} 周` : label

  return {
    label: displayLabel,
    fullLabel: formattedLabel,
    sortKey: index,
  }
}

const chartHeight = ref(400)

// 将数据处理抽离，为了能同时计算高度
const processedData = computed(() => {
  const weekInfoMap = new Map<string, number>() // WeekLabel -> WeekIndex
  const dataMap = new Map<string, Map<string, { count: number, items: string[] }>>()

  props.records.forEach(r => {
    const { label, sortKey } = getWeekInfo(r)
    weekInfoMap.set(label, sortKey)
    
    const p = props.getActualPlayer ? props.getActualPlayer(r.player) : r.player
    if (!props.players.includes(p)) return

    if (!dataMap.has(label)) dataMap.set(label, new Map())
    const pMap = dataMap.get(label)!
    
    if (!pMap.has(p)) pMap.set(p, { count: 0, items: [] })
    const entry = pMap.get(p)!
    entry.count++
    entry.items.push(r.item)
  })

  // 排序周次: 根据 weekInfoMap 中的 weekIdx 排序
  const sortedWeeks = Array.from(weekInfoMap.entries())
    .sort((a, b) => a[1] - b[1])
    .map(entry => entry[0])

  const xData = [...props.players]
  const seriesData: any[] = []
  
  sortedWeeks.forEach((week, yIndex) => {
    xData.forEach((player, xIndex) => {
      const entry = dataMap.get(week)?.get(player)
      const count = entry ? entry.count : 0
      seriesData.push({
        value: [xIndex, yIndex, count], 
        items: entry ? entry.items : []
      })
    })
  })

  // 计算高度
  const rowHeight = 40
  const minHeight = 300
  const calculatedHeight = sortedWeeks.length * rowHeight + 120 
  const height = Math.max(minHeight, calculatedHeight)

  return { xData, sortedWeeks, seriesData, height }
})

// 更新高度副作用
watchEffect(() => {
  chartHeight.value = processedData.value.height
})

const option = computed(() => {
  // 显式引用
  const visibility = props.playerVisibility
  const { xData, sortedWeeks, seriesData } = processedData.value

  // Helper
  const nameToRoleMap = new Map<string, string>()
  props.players.forEach(p => {
    const role = props.getPlayerRole ? props.getPlayerRole(p) : undefined
    if (role) nameToRoleMap.set(p, getRoleDisplayName(role))
  })

  return {
    backgroundColor: 'transparent',
    animation: false,
    title: {
      show: false,
      text: visibility // 增加显式依赖
    },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const item = params.data
        const count = item.value[2]
        // Remove the early return for count === 0 to allow tooltip
        
        // x is player, y is week
        const player = xData[item.value[0]] 
        const week = sortedWeeks[item.value[1]]
        
        const role = player ? nameToRoleMap.get(player) : undefined
        
        // If items is empty or undefined
        const itemsStr = (item.items && item.items.length > 0)
           ? item.items.map((i: string) => `• ${i}`).join('<br/>')
           : '<span style="color:#94a3b8;font-style:italic">无掉落</span>'
        
        return `<b>${week}</b><br/>
                <b>${role ? `[${role}]` : ''} ${player}</b><br/>
                获取数量: ${count}<br/>
                <hr style="margin:4px 0;opacity:0.3"/>
                ${itemsStr}`
      }
    },
    grid: {
      top: 40,
      bottom: 10,
      left: 10,
      right: 10,
      containLabel: true 
    },
    xAxis: {
      position: 'bottom',
      type: 'category',
      data: xData,
      splitArea: { show: true },
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        interval: 0,
        rotate: 0,
        formatter: (value: string) => {
           const rawRole = props.getPlayerRole ? props.getPlayerRole(value) : undefined
           return formatChartPlayerLabel(value, rawRole, props.playerVisibility)
        },
        rich: getChartLabelRich(props.playerVisibility),
        color: isDark.value ? '#e2e8f0' : '#64748b',
      }
    },
    yAxis: {
      type: 'category',
      data: sortedWeeks,
      inverse: false, 
      splitArea: { show: true },
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        fontSize: 12,
        color: isDark.value ? '#e2e8f0' : '#64748b'
      }
    },
    visualMap: {
      min: 0,
      max: 8, 
      calculable: false, 
      orient: 'horizontal',
      right: 0, 
      top: 0,   
      itemWidth: 15,
      itemHeight: 15,
      type: 'piecewise',
      pieces: [
           {value: 0, color: isDark.value ? '#1b1c26' : '#f8fafc', label: '无'}, 
           {value: 1, color: isDark.value ? '#450a0a' : '#fff7ed', label: '1'}, 
           {value: 2, color: isDark.value ? '#7f1d1d' : '#ffedd5', label: '2'}, 
           {value: 3, color: isDark.value ? '#b91c1c' : '#fed7aa', label: '3'}, 
           {value: 4, color: isDark.value ? '#c2410c' : '#fdba74', label: '4'}, 
           {value: 5, color: isDark.value ? '#ea580c' : '#f97316', label: '5'}, 
           {value: 6, color: isDark.value ? '#f97316' : '#ea580c', label: '6'}, 
           {value: 7, color: isDark.value ? '#facc15' : '#c2410c', label: '7'}, 
           {min: 8, color: isDark.value ? '#fef08a' : '#9a3412', label: '8+'}    
      ],
      textStyle: {
        color: isDark.value ? '#94a3b8' : '#64748b'
      }
    },
    series: [{
      name: '每周获取',
      type: 'heatmap',
      data: seriesData,
      label: {
        show: true,
        formatter: (p: any) => {
            return p.value[2] > 0 ? p.value[2] : ''
        },
        color: 'inherit',
      },
      itemStyle: {
        borderRadius: 4,
        borderColor: isDark.value ? '#252632' : '#fff', 
        borderWidth: 2
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.4)'
        }
      }
    }]
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
  min-height: 400px; 
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
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
