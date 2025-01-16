<script setup lang="ts">
import type { EventMap } from '../../../cactbot/types/event'
import NetRegexes from '../../../cactbot/resources/netregexes'
import { addOverlayListener, callOverlayHandler } from '../../../cactbot/resources/overlay_plugin_api'

const regexes: Record<string, RegExp> = {
  gainsEffects: NetRegexes.gainsEffect({ effectId: ['F9F', '343'], targetId: '1[a-zA-Z0-9]{7}' }),
}

const nowTime = ref(Date.now())

const triggerTime = ref([] as { start: number, end: number, duration: number, alreadyTTS: boolean }[])

const showString = computed(() => {
  if (triggerTime.value.length === 0 || triggerTime.value[0].end === 0) {
    return '0'
  }
  const diff = Math.abs(nowTime.value - triggerTime.value[0].end)
  const full = diff.toString().padStart(5, '0')
  const seconds = full.slice(0, 2)
  const ms = full.slice(2, 4)

  return `${seconds}.${ms}`
})

const showSettings = ref(document.getElementById('unlocked')?.style?.display === 'flex')

document.addEventListener('onOverlayStateUpdate', (e) => {
  showSettings.value = e?.detail?.isLocked === false
})

const settings = useStorage('special-r4s-settings', {
  ms: 0.65,
  text: '穿',
  test: false,
})

const handleLogEvent: EventMap['LogLine'] = (e) => {
  for (const regexName in regexes) {
    const regex = regexes[regexName]
    const match = regex.exec(e.rawLine)
    if (match) {
      switch (regexName) {
        case 'gainsEffects':{
          if (match.groups?.effectId === '343' && settings.value.test === false) {
            return
          }
          const duration = +match.groups!.duration
          const start = Date.now()
          const end = start + (+duration * 1000)
          if (triggerTime.value.find(v => Math.abs(v.start - start) <= 1000 && Math.abs(v.end - end) <= 1000)) {
            return
          }
          triggerTime.value.push({ start, end, duration, alreadyTTS: false })
          triggerTime.value.sort((a, b) => a.end - b.end)
          break
        }
      }
    }
  }
}

addOverlayListener('LogLine', handleLogEvent)

let lastUpdateTime = 0

function updateTime() {
  nowTime.value = Date.now()
  const timeDiff = nowTime.value - lastUpdateTime
  if (timeDiff > 100 && lastUpdateTime !== 0)
    console.warn(timeDiff)
  lastUpdateTime = nowTime.value
  triggerTime.value = triggerTime.value.filter(v => v.end > 0 && !(v.end < nowTime.value && v.alreadyTTS === true))
  if (triggerTime.value.length > 0 && showString.value !== '0' && Math.abs(Number.parseFloat(showString.value)) <= settings.value.ms && triggerTime.value[0].alreadyTTS === false) {
    triggerTime.value[0].alreadyTTS = true
    callOverlayHandler({ call: 'cactbotSay', text: settings.value.text })
  }
  requestAnimationFrame(() => {
    updateTime()
  })
}

setInterval(() => {
  updateTime()
}, 4.175)
</script>

<template>
  <el-header v-show="showSettings" class="settings">
    <form>
      剩余秒
      <el-input-number v-model="settings.ms" :min="0" :max="10000" size="small" :step="0.001" />
    </form>
    <form w-30>
      TTS文本      <el-input v-model="settings.text" size="small" />
    </form>    <span>
      若无法输入，先切换到ACT，再点击此悬浮窗
    </span>
    <form>
      <el-switch v-model="settings.test" size="small" />
      使用吉星相位测试
    </form>
  </el-header>
  <h1 v-show="showString !== '0'" w-50 text-right color-white>
    {{ showString }}
  </h1>
</template>

<style scoped lang='scss'>
.settings {
  user-select: none;
  overflow: visible;
  position: fixed;
  top:100px;
  right: 5px;
  z-index: 999999;
  height: 90vh;
  color: white;
  font-weight: bold;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  align-content: flex-end;
  padding-bottom: 20px;
  > form:not(.noCSS) {
    text-shadow: -1px 0 1px #000, 0 1px 1px #000, 1px 0 1px #000,
      0 -1px 1px #000;
  }
  > form {
    white-space: nowrap;
    padding: 0px 3px;
  }
}
</style>
