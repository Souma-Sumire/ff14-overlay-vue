<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import moment from 'moment'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

const time = ref('')
const gameIsActive = ref(false)
const gameActiveTime = ref(0)
const gameCombatTime = ref('')
const lastLogTime = ref('')
const params = new URLSearchParams(window.location.search)
const timeType = params.get('timeType') === 'game' ? 'game' : 'real'

requestAnimationFrame(function update() {
  time.value = moment().format('YYYY/MM/DD HH:mm:ss.SSS')
  if (gameActiveTime.value > 0) {
    const currentTime = Date.now()
    const milliseconds = currentTime - gameActiveTime.value
    const duration = moment.duration(milliseconds)
    const minutes = duration.minutes()
    const seconds = duration.seconds()
    gameCombatTime.value = `${minutes < 10 ? '0' : ''}${minutes}:${
      seconds < 10 ? '0' : ''
    }${seconds}`
  }
  requestAnimationFrame(update)
})

const handleCombatData: (ev: {
  type: 'CombatData'
  isActive?: 'true' | 'false'
}) => void = (e) => {
  if (e.isActive === 'true' && gameIsActive.value === false) {
    gameActiveTime.value = Date.now()
  }
  else if (e.isActive === 'false') {
    gameActiveTime.value = 0
    gameCombatTime.value = ''
  }
  gameIsActive.value = e.isActive === 'true'
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  if (e.line[0] === '00')
    return
  lastLogTime.value
    = e?.line?.[1]?.match(/(?<=T)\d\d:\d\d:\d\d\.\d\d\d/)?.[0] ?? ''
}

addOverlayListener('CombatData', handleCombatData)
addOverlayListener('LogLine', handleLogLine)
// startOverlayEvents();
</script>

<template>
  <!-- <span class="time realTime">
    {{ time }}
  </span> -->
  <div>
    <span v-if="gameCombatTime" class="time gameTime">
      {{ gameCombatTime }}
    </span>
    <span v-if="timeType === 'game'" class="time logTime">
      {{ lastLogTime }}
    </span>
    <span v-if="timeType === 'real'" class="time realTime">
      {{ time }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.time {
  background-color: rgba(0, 0, 0, 0.4);
  color: white;
  font-size: 24px;
  font-weight: bold;
  padding: 2px 5px;
}

.realTime {
  padding: 2px 5px;
}

.gameTime {
  margin-left: 5px;
}
</style>
