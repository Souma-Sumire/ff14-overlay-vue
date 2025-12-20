<script lang="ts" setup>
import type { EventMap } from 'cactbot/types/event'
import { addOverlayListener, callOverlayHandler, removeOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

const state = reactive({
  islandId: 0,
  instanceNum: '',
})

// 岛ID逻辑
const zoneIds = [
  732, // 禁地优雷卡 常风之地
  763, // 禁地优雷卡 恒冰之地
  795, // 禁地优雷卡 涌火之地
  827, // 禁地优雷卡 丰水之地
  920, // 南方博兹雅战线
  975, // 扎杜诺尔高原
  1252, // 新月岛 南征之章
]
const encounterHistory = Object.fromEntries(zoneIds.map(id => [id, new Map()]))
const handleChangeZone: EventMap['ChangeZone'] = async (e) => {
  if (!zoneIds.includes(e.zoneID)) {
    state.islandId = 0
    return
  }
  const dummy = (await callOverlayHandler({ call: 'getCombatants' })).combatants
    .filter(
      (v) =>
        v.Name &&
        v.ID &&
        v.ID.toString(16).startsWith('4') &&
        ['木人', 'striking dummy'].includes(v.Name)
    )
    // .filter(v => v.BNpcNameID === 541 && v.ID)
    .sort((a, b) => a.ID! - b.ID!)[0]
  if (!dummy) {
    return
  }
  const islandId = dummy.ID! - 0x40000000
  const now = Date.now()
  const islandHistory = encounterHistory[e.zoneID]!
  const history = islandHistory.get(islandId)
  state.islandId = islandId

  if (!history) {
    islandHistory.set(islandId, { timestamp: now, count: islandHistory.size + 1 })
    const text = `这个岛第一次来，现在总共遇到了${islandHistory.size}个岛`
    callOverlayHandler({ call: 'cactbotSay', text })
  }
  else {
    const timeDiff = now - history.timestamp
    const timeText = timeDiff < 60000 ? `${Math.floor(timeDiff / 1000)}秒` : `${Math.floor(timeDiff / 60000)}分钟`
    const text = `这个岛${timeText}前来过，是第${history.count}个遇到的岛`
    history.timestamp = now
    callOverlayHandler({ call: 'cactbotSay', text })
  }
}

// 切线逻辑
const InstancedEnum = {
  '': '①',
  '': '②',
  '': '③',
  '': '④',
  '': '⑤',
  '': '⑥',
  '': '⑦',
  '': '⑧',
  '': '⑨',
} as const

const handleLogLine: EventMap['LogLine'] = (e) => {
  if (e.line[0] === '00' && e.line[2] === '0039') {
    const match
      = e.line[4]!.match(/当前所在副本区为“([^”]+)(?<instance>[])”/)
        ?? e.line[4]!.match(/You are now in the instanced area (.+?)(?<instance>[])”/)
        ?? e.line[4]!.match(/インスタンスエリア「(.+?)(?<instance>[])」/)
    if (match) {
      state.instanceNum = InstancedEnum[match.groups?.instance as keyof typeof InstancedEnum]
    }
  }
  else if (e.line[0] === '01') {
    state.instanceNum = ''
  }
}

onMounted(() => {
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('ChangeZone', handleChangeZone)
})

onUnmounted(() => {
  removeOverlayListener('LogLine', handleLogLine)
  removeOverlayListener('ChangeZone', handleChangeZone)
})
</script>

<template>
  <CommonActWrapper>
    <p v-if="state.instanceNum">
      {{ state.instanceNum }}
    </p>
    <p v-if="state.islandId">
      {{ state.islandId }}号岛
    </p>
  </CommonActWrapper>
</template>

<style lang="scss" scoped>
p {
  font-family: emoji;
  font-size: 24px;
  color: rgb(254, 254, 253);
  font-weight: bold;
  text-shadow: -1px 0 3px rgb(179, 137, 21), 0 1px 3px rgb(179, 137, 21), 1px 0 3px rgb(179, 137, 21), 0 -1px 3px rgb(179, 137, 21);
  text-align: end;
  overflow: hidden;
  padding: 3px;
  margin: 0;
  opacity: 0.9;
}
</style>
