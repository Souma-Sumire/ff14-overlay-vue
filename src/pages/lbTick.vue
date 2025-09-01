<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import { useDemo } from '@/composables/useDemo'
import { useDev } from '@/composables/useDev'
import { testLimitBreak } from '@/mock/demoLimitBreak'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'

const dev = useDev()
const demo = useDemo()

const LB_MAX = 30000
const LB_INCREMENT = 220

const stopTest = ref<(() => void) | undefined>()

const state = reactive({
  prev: 0, // 记录上一次LB 进度，用于比较增值
  ratio: 0, // LB 进度
  bonusTotal: 0, // 全局LB 总奖励值
  chain: 0, // 单次LB 连续奖励
  chainList: [] as { key: string; num: number; timestamp: number }[], // 奖励数值储存
})

function handleClear() {
  state.prev = 0
  state.ratio = 0
  state.chain = 0
  state.chainList = []
  state.bonusTotal = 0
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  if (e.line[0] === '36') {
    const now = parseInt(e.line[2]!, 16)
    const add = now - state.prev
    state.prev = now
    state.ratio = now / LB_MAX

    if (now === 0 || add < -0.1) {
      // 重置 / 消耗
      state.chain = 0
      state.chainList = []
    } else if (add > LB_INCREMENT) {
      // 奖池还在累计
      state.chain += add
      state.bonusTotal += add

      const last = state.chainList[state.chainList.length - 1]
      if (
        last &&
        last.timestamp + 1000 > new Date(e.line[1]!).getTime() &&
        (last.num === state.chain - LB_MAX / 100 ||
          last.num === state.chain - LB_MAX / 500)
      ) {
        state.chainList[state.chainList.length - 1]!.num = state.chain
      } else {
        state.chainList.push({
          key: crypto.randomUUID(),
          num: state.chain,
          timestamp: new Date(e.line[1]!).getTime(),
        })
      }
    } else {
      // 随战斗时间自然增加的
      state.chain = 0
      return
    }
  } else if (
    e.line[0] === '33' &&
    ['40000010', '4000000F'].includes(e.line[3]!)
  ) {
    handleClear()
  }
}

function handleTest() {
  stopTest.value?.()
  stopTest.value = testLimitBreak(handleLogLine, 1)
}

watch(
  () => [demo.value, dev.value],
  () => {
    stopTest.value?.()
    handleClear()
  }
)

onMounted(() => {
  addOverlayListener('ChangeZone', handleClear)
  addOverlayListener('LogLine', handleLogLine)
})

onUnmounted(() => {
  removeOverlayListener('ChangeZone', handleClear)
  removeOverlayListener('LogLine', handleLogLine)
})
</script>

<template>
  <CommonActWrapper>
    <el-button
      v-if="dev || demo"
      type="primary"
      class="test-btn"
      @click="handleTest"
    >
      测试
    </el-button>
    <div class="lb-container">
      <p id="percent">{{ (state.ratio * 100).toFixed(2) }}%</p>
      <p id="bonusTotal">
        {{ ((state.bonusTotal / LB_MAX) * 100).toFixed(0) }}%
      </p>
      <div id="extra">
        <p v-for="item in state.chainList" :key="item.key" class="anime">
          +{{ ((item.num / LB_MAX) * 100).toFixed(0) }}%
        </p>
      </div>
    </div>
  </CommonActWrapper>
</template>

<style lang="scss" scoped>
.test-btn {
  position: fixed;
  right: 0.5em;
  top: 5em;
  z-index: 30;
}

.lb-container {
  font-size: 20px;
  color: white;
  padding: 2px 4px;

  * {
    box-sizing: border-box;
    padding: 0;
    margin: 0;
  }
}

#percent {
  &::before {
    content: 'LB:';
  }

  font-size: 14px;
  text-shadow: -1px 0 1.5px rgb(145, 186, 94), 0 1.5px 1.5px rgb(145, 186, 94),
    1px 0 1.5px rgb(145, 186, 94), 0 -1.5px 1.5px rgb(145, 186, 94);
}

#extra {
  text-shadow: -1px 0 2px rgb(169, 26, 22), 0 1.5px 2px rgb(169, 26, 22),
    1px 0 2px rgb(169, 26, 22), 0 -1.5px 2px rgb(169, 26, 22);
  font-weight: bold;
}

#bonusTotal {
  &::before {
    content: '奖励:';
  }

  position: absolute;
  top: 21px;
  right: 4px;
  font-size: 14px;
  text-shadow: -1px 0 2px rgb(169, 26, 22), 0 1.5px 2px rgb(169, 26, 22),
    1px 0 2px rgb(169, 26, 22), 0 -1.5px 2px rgb(169, 26, 22);
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
