<script setup lang="ts">
import { getMaps, type EnemyData, type DDInfo } from '@/resources/dd'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'
import type { EnmityTargetCombatant, EventMap } from 'cactbot/types/event'
import NetRegexes from '../../cactbot/resources/netregexes'

const data = useStorage('DD', undefined as DDInfo | undefined)
const traps = ref(undefined as undefined | 'disappeared' | 'revealed')

const tarIns = ref<EnmityTargetCombatant | null>(null)
const tarData = ref({} as EnemyData | undefined)

const netRegexs = {
  logMessage: NetRegexes.systemLogMessage({ id: ['1C50', '1C57', '1C58'] }),
}

const handleEnmityTargetData: EventMap['EnmityTargetData'] = (e) => {
  if (e.Target) {
    tarIns.value = e.Target
    tarData.value = data.value?.enemiesData[e.Target.BNpcNameID]
  } else {
    tarIns.value = null
    tarData.value = undefined
  }
}

const handleChangeZone: EventMap['ChangeZone'] = (e) => {
  data.value = getMaps(e.zoneID)
  traps.value = undefined
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  const logMessage = netRegexs.logMessage.exec(e.rawLine)
  if (logMessage) {
    // 成功进行了传送！
    if (logMessage.groups?.id === '1C50') {
      traps.value = undefined
      // 这一层的陷阱全部被清除了！
    } else if (logMessage.groups?.id === '1C57') {
      traps.value = 'disappeared'
      // 这一层的地图全部被点亮了！
    } else if (logMessage.groups?.id === '1C58') {
      traps.value = 'revealed'
    }
  }
}

watch(
  data,
  () => {
    ;(data.value ? addOverlayListener : removeOverlayListener)(
      'EnmityTargetData',
      handleEnmityTargetData
    )
    ;(data.value ? addOverlayListener : removeOverlayListener)(
      'LogLine',
      handleLogLine
    )
  },
  {
    immediate: true,
  }
)

onMounted(() => {
  addOverlayListener('ChangeZone', handleChangeZone)
})

onUnmounted(() => {
  removeOverlayListener('ChangeZone', handleChangeZone)
})

const getEmoji = (str: string = '未知') => {
  const s = str ?? ''
  return {
    视觉: '👁️',
    听觉: '👂',
    范围: '⭕',
    简单: '🟢',
    中等: '🟡',
    困难: '🔴',
    危险: '🚨',
    小心: '⚠️',
    未知: '❔︎',
  }[s]
}
</script>

<template>
  <CommonActWrapper>
    <div class="container" v-if="data">
      <header>
        <pre v-if="data.floorTips && tarData?.detect !== 'Boss'">{{
          data.floorTips
        }}</pre>
        <div v-if="traps">
          {{ traps === 'disappeared' ? '陷阱已清除' : '地图已点亮' }}
        </div>
      </header>
      <main class="main">
        <h3 v-show="tarIns && tarData">
          {{ tarIns?.Name }}({{ tarIns?.BNpcNameID }})
        </h3>
        <ul v-show="tarData">
          <li>评级：{{ getEmoji(tarData?.grade) }}{{ tarData?.grade }}</li>
          <li>索敌：{{ getEmoji(tarData?.detect) }}{{ tarData?.detect }}</li>
          <pre>{{ tarData?.note || '无' }}</pre>
        </ul>
      </main>
    </div>
  </CommonActWrapper>
</template>

<style lang="scss" scoped>
@use 'sass:color';
$text-color: #fefefd;
$accent-color: #947b31;
$shadow-spread: 1.5px;
$shadow-blur: 2.5px;
$font-family: 'Microsoft YaHei', sans-serif;
$font-size: 20px;

.container {
  font-family: $font-family;
  font-size: $font-size;
  color: $text-color;
  padding: 0.2em;

  text-shadow: $shadow-spread 0 $shadow-blur $accent-color,
    -$shadow-spread 0 $shadow-blur $accent-color,
    0 $shadow-spread $shadow-blur $accent-color,
    0 - $shadow-spread $shadow-blur $accent-color;

  h3 {
    padding: 5px;
    border-bottom: 1px solid rgba($accent-color, 0.5);
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    line-height: 1.4;
    padding: 2px 0;

    &::before {
      content: '◈';
      color: color.adjust($text-color, $lightness: -20%);
    }
  }

  pre {
    white-space: pre-wrap;
  }
}
</style>
