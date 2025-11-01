<script setup lang="ts">
import { getMaps, type EnemyData, type DDInfo } from '@/resources/dd'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'
import type { EnmityTargetCombatant, EventMap } from '../../cactbot/types/event'
import NetRegexes from '../../cactbot/resources/netregexes'
import { useDev } from '@/composables/useDev'
import Util from '@/utils/util'

type Abilities = {
  stun: boolean
  slow: boolean
  sleep: boolean
  heavy: boolean
  bind: boolean
}

const dev = useDev()

const state = useStorage(
  'DD',
  {
    data: undefined as DDInfo | undefined,
    traps: undefined as undefined | 'disappeared' | 'revealed',
    tarIns: null as EnmityTargetCombatant | null,
    tarData: {} as EnemyData | undefined,
    pylons: {
      return: 0,
      passage: 0,
    },
    partyAbilities: {
      stun: true,
      slow: true,
      sleep: true,
      heavy: true,
      bind: true,
    } as Abilities,
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
      // 再生装置
      '10000008',
      // 传送装置
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
      const key =
        network6d.groups!.command! === '10000008' ? 'return' : 'passage'
      state.value.pylons[key] = parseInt(data0, 16) - 2
    } else {
      state.value.pylons.return = 0
      state.value.pylons.passage = 0
    }
    return
  }
}

const handlePartyChanged: EventMap['PartyChanged'] = (e) => {
  const abilities: Abilities = {
    stun: false,
    slow: false,
    sleep: false,
    heavy: false,
    bind: false,
  }
  state.value.partyAbilities = e.party.reduce((acc, cur) => {
    const job = Util.jobEnumToJob(cur.job)
    return {
      stun: acc.stun || Util.canStun(job),
      slow: acc.slow || Util.canSilence(job),
      sleep: acc.sleep || Util.canSleep(job),
      heavy: acc.heavy || Util.canAddle(job),
      bind: acc.bind || Util.canFeint(job),
    }
  }, abilities)
  console.log(state.value.partyAbilities)
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
  addOverlayListener('PartyChanged', handlePartyChanged)
})

onUnmounted(() => {
  removeOverlayListener('ChangeZone', handleChangeZone)
  removeOverlayListener('PartyChanged', handlePartyChanged)
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

const getResist = (k: keyof Abilities) => {
  return {
    stun: '眩晕',
    slow: '减速',
    sleep: '睡眠',
    heavy: '加重',
    bind: '止步',
  }[k]
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
          再生：{{ Math.round((state.pylons.return / 9) * 100) }}% / 传送：{{
            Math.round((state.pylons.passage / 9) * 100)
          }}%
        </div>
      </header>
      <main class="main">
        <h3 v-show="state.tarIns && state.tarData">
          {{ state.tarIns?.Name
          }}<span v-if="dev">({{ state.tarIns?.BNpcNameID }})</span>
        </h3>
        <div v-show="state.tarData">
          <div class="tar-info">
            <span>
              {{ getEmoji(state.tarData?.grade) }}{{ state.tarData?.grade }}
            </span>
            <span>
              {{ getEmoji(state.tarData?.detect) }}{{ state.tarData?.detect }}
            </span>
            <div class="resists" v-if="state.tarData?.detect !== 'Boss'">
              <div
                v-for="(v, k) in state.tarData?.resists"
                :key="k"
                v-show="dev || (v !== undefined && state.partyAbilities[k])"
                :class="`icon ${k} ${v ? 'valid' : 'invalid'}`"
              >
                <div class="icon-text">
                  {{ getResist(k) }}
                </div>
              </div>
            </div>
          </div>
          <pre>{{ state.tarData?.note || '' }}</pre>
        </div>
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

  pre {
    white-space: pre-wrap;
  }
}

.tar-info {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 5px;
}

.resists {
  display: flex;
}

.icon {
  width: 28px;
  height: 32px;
  background-size: contain;
  background-repeat: no-repeat;
  font-size: 11px;
}

.valid {
  filter: grayscale(0%);
}

.invalid {
  filter: grayscale(100%);
}

.icon-text {
  margin-top: -16px;
  white-space: nowrap;
  text-align: center;
  text-shadow: $shadow-spread 0 $shadow-blur $accent-color;
}

.stun {
  background-image: url('data:image/png;base64,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');
}

.slow {
  background-image: url('data:image/png;base64,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');
}

.heavy {
  background-image: url('data:image/png;base64,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');
}

.bind {
  background-image: url('data:image/png;base64,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');
}

.sleep {
  background-image: url('data:image/png;base64,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');
}
</style>
