<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import { addOverlayListener, removeOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

let playerID: string

const tick = useTemplateRef<HTMLElement>('tick')

function anime() {
  const el = tick.value
  if (!el)
    return

  el.classList.remove('anime')
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('anime'))
  })
}

const handleChangePrimaryPlayer: EventMap['ChangePrimaryPlayer'] = (e) => {
  playerID = e.charID.toString(16).toUpperCase()
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  if (e.line[0] === '39' && e.line[2] === playerID && e.line[6] === e.line[7]) {
    anime()
  }
}

onMounted(() => {
  addOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  addOverlayListener('LogLine', handleLogLine)
})

onUnmounted(() => {
  removeOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  removeOverlayListener('LogLine', handleLogLine)
})
</script>

<template>
  <CommonActWrapper>
    <div class="mp-tick-container">
      <div ref="tick" class="tick" />
    </div>
  </CommonActwrapper>
</template>

<style lang="scss" scoped>
.anime {
    animation: mp 3s infinite linear;
    background-color: rgb(17, 114, 226);
}

.mp-tick-container {
    overflow: hidden;
    height: 100vh;
    width: 100vw;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 9999;
    background-color: #000;
    border-right: 3px solid #fff;
    box-sizing: border-box;
}

.tick {
    height: 100%;
    width: 100%;
}

@keyframes mp {
    0% {
        width: 0%;
    }

    100% {
        width: 100%;
    }
}
</style>
