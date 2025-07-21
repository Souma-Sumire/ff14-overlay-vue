<script setup lang="ts">
import type { EventMap, Party } from 'cactbot/types/event'
import Util from '@/utils/util'
import NetRegexes from '../../cactbot/resources/netregexes'
import {
  addOverlayListener,
  callOverlayHandler,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'

interface Food {
  effectId: string
  expiredMillisecond: number
  durationSeconds: number
  count: string
}

interface Data {
  id: string
  name: string
  food: Food | undefined
  jobName: string
}

const party: Ref<Party[]> = ref([])
const effectData = useStorage('food-effect-data', new Map<string, Food>())
const uiData: Ref<Data[]> = useStorage('food-ui-data', [])
const actReady = ref(false)
const params = useUrlSearchParams('hash')
const dev = params.dev === '1'

function checkAct(): Promise<void> {
  if (dev)
    return Promise.resolve()
  return new Promise((resolve) => {
    callOverlayHandler({ call: 'cactbotRequestState' }).then(() => {
      actReady.value = true
      resolve()
    })
    setTimeout(() => {
      if (!actReady.value) {
        checkAct()
      }
    }, 3000)
  })
}

const netRegexs = {
  gainsEffect: NetRegexes.gainsEffect({ effectId: '30' }),
  losesEffect: NetRegexes.losesEffect({ effectId: '30' }),
}

function updateFriendlyCombatants() {
  for (const [id, food] of effectData.value.entries()) {
    if (food.expiredMillisecond < Date.now()) {
      effectData.value.delete(id)
    }
    else {
      food.durationSeconds = Math.floor((food.expiredMillisecond - Date.now()) / 1000)
    }
  }
  uiData.value = party.value.map((v) => {
    return {
      id: v.id,
      name: v.name,
      food: effectData.value.get(v.id),
      jobName: Util.nameToFullName(Util.jobEnumToJob(v.job)).simple2,
    }
  }).sort((a, b) => (a.food?.durationSeconds ?? 0) - (b.food?.durationSeconds ?? 0))
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  if (e.line[0] === '26') {
    const matches = netRegexs.gainsEffect.exec(e.rawLine)
    if (matches && matches.groups) {
      effectData.value.set(matches.groups.targetId, {
        effectId: matches.groups.effectId,
        durationSeconds: Number.parseFloat(matches.groups.duration),
        expiredMillisecond: Date.now() + Number.parseFloat(matches.groups.duration) * 1000,
        count: matches.groups.count,
      })
      updateFriendlyCombatants()
    }
  }
  else if (e.line[0] === '27') {
    const matches = netRegexs.losesEffect.exec(e.rawLine)
    if (matches && matches.groups) {
      effectData.value.delete(matches.groups.targetId)
      updateFriendlyCombatants()
    }
  }
}

const handlePartyChanged: EventMap['PartyChanged'] = (e) => {
  party.value = e.party
}

onMounted(() => {
  checkAct()
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('PartyChanged', handlePartyChanged)
  updateFriendlyCombatants()
  setInterval(() => {
    updateFriendlyCombatants()
  }, 1000)
})

onUnmounted(() => {
  removeOverlayListener('LogLine', handleLogLine)
  removeOverlayListener('PartyChanged', handlePartyChanged)
})
</script>

<template>
  <div class="container">
    <el-card v-if="!actReady || dev">
      <h1>{{ "在 ACT 中添加本页面作为数据统计悬浮窗" }}</h1>
    </el-card>
    <div v-else>
      <p v-for="item in uiData" :key="item.id" class="text">
        <span v-if="item.food === undefined">
          {{ item.jobName }} <span class="text-danger">{{ `无食物` }}</span>
        </span>
        <span v-else-if="item.food.durationSeconds <= 600">
          {{ item.jobName }} {{ item.food.count }} <span class="text-warning"> {{ `≤ ${Math.floor(item.food.durationSeconds / 60)}分钟` }}</span>
        </span>
        <span v-else>
          {{ item.jobName }} {{ item.food.count }} <span class="text-success">{{ `${Math.floor(item.food.durationSeconds / 60)}分钟` }}</span>
        </span>
      </p>
    </div>
  </div>
</template>

<style>
body {
  background-color: rgba(180, 180, 180, 0.01);
}

::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}

::-webkit-scrollbar-track {
  background-color: rgba(51, 51, 51, 1);
}

::-webkit-scrollbar-thumb {
  height: 30px;
  border-radius: 4px;
  background-color: rgba(180, 180, 180, 0.75);
}

::-webkit-scrollbar-thumb:active {
  background-color: rgba(160, 160, 160, 1);
}
</style>

<style scoped lang="scss">
.text {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  user-select: none;
  color: white;
  text-shadow: 1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000;
  list-style: none;
}

.text-danger {
  color: lightcoral;
}

.text-warning {
  color: #ffc107;
}

.text-success {
  color: #28a745;
}
</style>
