<script setup lang="ts">
import { getMaps, type EnemyData, type DDInfo } from '@/resources/dd'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'
import type { EnmityTargetCombatant, EventMap } from 'cactbot/types/event'
import NetRegexes from '../../cactbot/resources/netregexes'

const state = useStorage(
  'DD',
  {
    data: undefined as DDInfo | undefined,
    traps: undefined as undefined | 'disappeared' | 'revealed',
    tarIns: null as EnmityTargetCombatant | null,
    tarData: {} as EnemyData | undefined,
    construct: {
      '10000008': 0,
      '10000009': 0,
    },
  },
  sessionStorage
)

const netRegexs = {
  logMessage: NetRegexes.systemLogMessage({ id: ['1C50', '1C57', '1C58'] }),
  network6d: NetRegexes.network6d({
    command: [
      // 进到新的一层会同时出现01和06，暂不知其区别
      '10000001',
      '10000006',
      // TODO: 确认死、天、U宫的ID是否一致
      // 再生装置（妖宫）
      '10000008',
      // 传送装置（妖宫）
      '10000009',
    ],
  }),
}

const handleEnmityTargetData: EventMap['EnmityTargetData'] = (e) => {
  if (e.Target) {
    state.value.tarIns = e.Target
    state.value.tarData = state.value.data?.enemiesData[e.Target.BNpcNameID]
  } else {
    state.value.tarIns = null
    state.value.tarData = undefined
  }
}

const handleChangeZone: EventMap['ChangeZone'] = (e) => {
  state.value.data = getMaps(e.zoneID)
  state.value.traps = undefined
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  const logMessage = netRegexs.logMessage.exec(e.rawLine)
  if (logMessage) {
    // 成功进行了传送！
    if (logMessage.groups?.id === '1C50') {
      state.value.traps = undefined
      // 这一层的陷阱全部被清除了！
    } else if (logMessage.groups?.id === '1C57') {
      state.value.traps = 'disappeared'
      // 这一层的地图全部被点亮了！
    } else if (logMessage.groups?.id === '1C58') {
      state.value.traps = 'revealed'
    }
    return
  }
  const network6d = netRegexs.network6d.exec(e.rawLine)
  if (network6d) {
    const command = network6d.groups!.command!
    const data0 = network6d.groups!.data0!
    if (['10000008', '10000009'].includes(command)) {
      // 0d02 = 0%
      // 0d11 = 100%
      state.value.construct[
        network6d.groups!.command! as keyof typeof state.value.construct
      ] = parseInt(data0, 16) - 2
    } else {
      state.value.construct[10000008] = 0
      state.value.construct[10000009] = 0
    }
    return
  }
}
watchEffect(() => {
  ;(state.value.data ? addOverlayListener : removeOverlayListener)(
    'EnmityTargetData',
    handleEnmityTargetData
  )
  ;(state.value.data ? addOverlayListener : removeOverlayListener)(
    'LogLine',
    handleLogLine
  )
})

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
    <div class="container" v-if="state.data">
      <header>
        <pre v-if="state.data.floorTips && state.tarData?.detect !== 'Boss'">{{
          state.data.floorTips
        }}</pre>
        <div v-if="state.traps">
          {{ state.traps === 'disappeared' ? '陷阱已清除' : '地图已点亮' }}
        </div>
        <div>
          再生：{{ Math.round((state.construct[10000008] / 9) * 100) }}% /
          传送：{{ Math.round((state.construct[10000009] / 9) * 100) }}%
        </div>
      </header>
      <main class="main">
        <h3 v-show="state.tarIns && state.tarData">
          {{ state.tarIns?.Name }}({{ state.tarIns?.BNpcNameID }})
        </h3>
        <ul v-show="state.tarData">
          <li>
            评级：{{ getEmoji(state.tarData?.grade) }}{{ state.tarData?.grade }}
          </li>
          <li>
            索敌：{{ getEmoji(state.tarData?.detect)
            }}{{ state.tarData?.detect }}
          </li>
          <pre>{{ state.tarData?.note || '无' }}</pre>
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

:global(body::-webkit-scrollbar) {
  display: none;
}

:global(body::-webkit-scrollbar) {
  width: 5px;
  height: 5px;
}

:global(body::-webkit-scrollbar-thumb) {
  height: 30px;
  border-radius: 5px;
}

* {
  padding: 0.1rem;
  margin: 0.1rem;
}

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
