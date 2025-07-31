<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import { useDemo } from '@/composables/useDemo'
import { useDev } from '@/composables/useDev'
import { testLimitBreak } from '@/mock/demoLimitBreak'
import { addOverlayListener, removeOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

interface Entry {
  value: number
  time: string
}

const dev = useDev()
const LBMax = 30000
const autoParam = 220
const LBAutomaticBaseline = Math.ceil(((autoParam / LBMax) * 1000)) / 1000
const stopTest = ref<(() => void) | undefined>()

const demo = useDemo()
watch(demo, () => {
  stopTest.value?.()
  clearState()
})

const state = reactive({
  lbNow: 0,
  lbBefore: 0,
  lbAddUp: 0,
  lbExtraAll: 0,
  extraEntries: [] as Entry[],
})

const extraEntries = ref<Entry[]>([])

function clearState() {
  state.lbExtraAll = 0
  state.lbNow = 0
  state.extraEntries = []
  state.lbAddUp = 0
  state.lbBefore = 0
}

function isLimitBreakGain(add: number) {
  return add > LBAutomaticBaseline
}

function isContinuous(last: Entry | undefined, newValue: number) {
  return !!last && (last.value === newValue - 1 || last.value === newValue - 5)
}

function addExtraEntry(newValue: number) {
  const last = extraEntries.value.at(-1)
  if (isContinuous(last, newValue) && extraEntries.value.length) {
    extraEntries.value[extraEntries.value.length - 1]!.value = newValue
  }
  else {
    const entry: Entry = {
      value: newValue,
      time: new Intl.DateTimeFormat('default', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date()),
    }
    extraEntries.value.push(entry)

    // 5秒后移除
    setTimeout(() => {
      const index = extraEntries.value.indexOf(entry)
      if (index !== -1)
        extraEntries.value.splice(index, 1)
    }, 5000)
  }
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  const line = e.line
  if (line[0] === '36') {
    const now = Number.parseInt(line[2]!, 16) / LBMax
    const lbAdd = now - state.lbBefore
    state.lbNow = now

    if (isLimitBreakGain(lbAdd)) {
      state.lbAddUp += lbAdd
      state.lbExtraAll += lbAdd

      const newValue = Math.round(state.lbAddUp * 100)
      addExtraEntry(newValue)
    }
    else {
      state.lbAddUp = 0
    }

    state.lbBefore = now
    if (lbAdd < -0.1)
      clearState()
  }
  else if (line[0] === '33' && ['40000010', '4000000F'].includes(line[3]!)) {
    clearState()
  }
}

function handleTest() {
  stopTest.value = testLimitBreak(handleLogLine, 4)
}

onMounted(() => {
  addOverlayListener('ChangeZone', clearState)
  addOverlayListener('LogLine', handleLogLine)
})

onUnmounted(() => {
  removeOverlayListener('ChangeZone', clearState)
  removeOverlayListener('LogLine', handleLogLine)
})
</script>

<template>
  <CommonActWrapper>
    <el-button v-if="dev || demo" type="primary" class="test-btn" @click="handleTest">
      测试
    </el-button>
    <main>
      <article id="show">
        {{ (state.lbNow * 100).toFixed(2) }}%
      </article>
      <article id="extra">
        <p v-for="(entry, index) in extraEntries" :key="index" class="anime" :data-time="entry.time">
          +{{ entry.value }}%
        </p>
      </article>
      <aside id="extraAll">
        {{ (state.lbExtraAll * 100).toFixed(0) }}%
      </aside>
    </main>
  </CommonActWrapper>
</template>

<style lang="scss" scoped>
.test-btn {
    position: fixed;
    right: 0.5em;
    top: 5em;
    z-index: 30;
}

main {
    font-size: 20px;
    color: white;
    padding: 2px 4px;

    * {
        box-sizing: border-box;
        padding: 0;
        margin: 0;
    }
}

#show {
    &::before {
        content: "LB:";
    }

    font-size: 14px;
    text-shadow: -1px 0 1.5px rgb(145, 186, 94),
    0 1.5px 1.5px rgb(145, 186, 94),
    1px 0 1.5px rgb(145, 186, 94),
    0 -1.5px 1.5px rgb(145, 186, 94);
}

#extra {
    text-shadow: -1px 0 2px rgb(169, 26, 22), 0 1.5px 2px rgb(169, 26, 22), 1px 0 2px rgb(169, 26, 22), 0 -1.5px 2px rgb(169, 26, 22);
    font-weight: bold;
}

#extraAll {
    &::before {
        content: "奖励:";
    }

    position: absolute;
    top: 21px;
    right: 4px;
    font-size: 14px;
    text-shadow: -1px 0 2px rgb(169, 26, 22),
    0 1.5px 2px rgb(169, 26, 22),
    1px 0 2px rgb(169, 26, 22),
    0 -1.5px 2px rgb(169, 26, 22);
}

.anime {
    animation: anime 5s;
    animation-fill-mode: forwards;
}

@keyframes anime {
    0% {
        opacity: 0;
        height: 0px;
        font-size: 0.5em;
    }

    4% {
        opacity: 1;
        height: 26px;
        font-size: 1.2em;
    }

    6% {
        font-size: 1em;
    }

    70% {
        opacity: 1;
    }

    90% {
        opacity: 0;
        height: 26px;
    }

    100% {
        opacity: 0;
        height: 0px;
    }
}
</style>
