<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import moment from 'moment'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

const gameIsActive = ref(false)
const gameActiveTime = ref(-1)
const gameCombatTime = ref('')
const lastLogTime = ref('')
const params = useUrlSearchParams('hash')
const mode = params.mode || ('combat' as 'both' | 'combat' | 'logline')

if (mode === 'combat' || mode === 'both') {
  const handleCombatData: (ev: {
    type: 'CombatData'
    isActive?: 'true' | 'false'
  }) => void = (e) => {
    if (e.isActive === 'true' && gameIsActive.value === false) {
      gameActiveTime.value = Date.now()
    }
    else if (e.isActive === 'false') {
      gameActiveTime.value = -1
      gameCombatTime.value = ''
    }
    gameIsActive.value = e.isActive === 'true'
  }
  addOverlayListener('CombatData', handleCombatData)
  requestAnimationFrame(function update() {
    if (gameActiveTime.value > 0) {
      const currentTime = Date.now()
      const milliseconds = currentTime - gameActiveTime.value
      const duration = moment.duration(milliseconds)
      const minutes = duration.minutes()
      const seconds = duration.seconds()
      const millisecondsString = duration.milliseconds().toString().padStart(3, '0')
      gameCombatTime.value = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${millisecondsString}`
    }
    requestAnimationFrame(update)
  })
}

if (mode === 'logline' || mode === 'both') {
  const handleLogLine: EventMap['LogLine'] = (e) => {
    if (e.line[0] !== '00') {
      lastLogTime.value
        = e?.line?.[1]?.match(/(?<=T)\d\d:\d\d:\d\d\.\d\d\d/)?.[0] ?? ''
    }
  }
  addOverlayListener('LogLine', handleLogLine)
}
</script>

<template>
  <div>
    <span v-if="mode === 'combat' || mode === 'both'" v-show="gameActiveTime >= 0"> {{ gameCombatTime }} </span>
    <span v-if="mode === 'logline' || mode === 'both'"> {{ lastLogTime }} </span>
  </div>
</template>

<style lang="scss" scoped>
span {
  background-color: rgba(0, 0, 0, 0.4);
  color: white;
  font-size: 24px;
  font-weight: bold;
  padding: 0 5px;
  margin-right: 5px;
}
</style>
