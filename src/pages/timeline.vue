<script lang="ts" setup>
import type { EventMap } from 'cactbot/types/event'
import type {
  ITimeline,
  ITimelineCondition,
  ITimelineLine,
} from '@/types/timeline'
import { Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useDev } from '@/composables/useDev'
import { parseTimeline, useTimelineStore } from '@/store/timeline'
import { tts } from '@/utils/tts'
import {
  addOverlayListener,
  callOverlayHandler,
} from '../../cactbot/resources/overlay_plugin_api'

const timelineStore = useTimelineStore()
const timelinePageData = reactive({
  loadedTimeline: [] as ITimelineLine[], // 显示在页面上的时间轴
  optionalTimeline: [] as ITimeline[], // 有多个供选择的时间轴
  selectedOptionalTimeline: null as ITimeline | null, // 用户选择的可选时间轴
})
const baseTimeMs = ref(0) // 战斗开始时间 每场战斗中这个值应该是固定的
const runtimeTimeSeconds = ref(0 - timelineStore.configValues.preBattle) // 当前进行到多少秒了 相对与baseTime来说 （战斗时间）  时间轴时间将以他为基准进行计算
const offsetTimeMS = ref(0) // sync产生的时间轴偏移 会在baseTimeMs后附加 以影响runtimeTime
let doTTS = false // 防止tts重复

// 每次get时间轴时被传入的条件对象
const playerState = useStorage('timeline-condition-2', {
  zoneId: '0',
  jobs: ['NONE'],
} as ITimelineCondition)
const dev = useDev()

const syncLines = computed(() =>
  timelinePageData.loadedTimeline.filter(item => item.sync),
)
const loadedTimelineTTS = computed(() =>
  timelinePageData.loadedTimeline.filter(v => v.tts),
)

onMounted(() => {
  init()
  sendBroadcastData('hello')
})

// 从数据列表中根据玩家职业与地区获得一个或多个时间轴
function getTimeline() {
  stopTimeline()
  timelinePageData.loadedTimeline.length = 0
  timelinePageData.optionalTimeline.length = 0
  const candidate: ITimeline[] = timelineStore.getTimeline(playerState.value)
  if (candidate.length === 1) {
    // 单个结果
    mountTimeline(candidate[0]!)
  }
  else if (candidate.length > 1) {
    // 多个结果
    timelinePageData.optionalTimeline = candidate
    mountTimeline(candidate[0]!)
  }
}

// 用户选择了某个时间轴
function selectedTimeline(timeline: ITimeline) {
  mountTimeline(timeline)
}

// 载入时间轴页面
async function mountTimeline(timeline: ITimeline, stopLoadedTimeline = true) {
  timelinePageData.selectedOptionalTimeline = timeline
  if (stopLoadedTimeline) {
    stopTimeline()
  }
  doTTS = false
  if (timeline?.timeline) {
    timelinePageData.loadedTimeline = await parseTimeline(timeline.timeline)
    timelinePageData.loadedTimeline.sort((a, b) => a.time - b.time)
  }
  setTimeout(() => {
    doTTS = true
  }, 1000)
}

// 停止当前
function stopTimeline() {
  baseTimeMs.value = 0
  runtimeTimeSeconds.value = 0 - timelineStore.configValues.preBattle
  offsetTimeMS.value = 0
  for (const v of timelinePageData.loadedTimeline)
    v.alertAlready = false

  for (const v of syncLines.value)
    v.syncAlready = false
}

// 页面时间轴开始播放
function startTimeline(countdownSeconds: number, preventTTS = true) {
  if (preventTTS) {
    doTTS = false
    setTimeout(() => {
      doTTS = true
    }, 1000)
  }
  runtimeTimeSeconds.value = 0
  offsetTimeMS.value = 0
  baseTimeMs.value = new Date().getTime() + countdownSeconds * 1000
  loadedTimelineTTS.value.forEach((v) => {
    v.alertAlready = false
  })
  play()
}

function play() {
  if (baseTimeMs.value === 0)
    return
  runtimeTimeSeconds.value
    = (new Date().getTime() - baseTimeMs.value + offsetTimeMS.value) / 1000
  const l = loadedTimelineTTS.value.find(
    v =>
      !v.alertAlready
      && v.time - timelineStore.configValues.ttsAdvance <= runtimeTimeSeconds.value,
  )
  if (l) {
    l.alertAlready = true
    if (l.tts)
      cactbotSay(l.tts)
  }
  requestAnimationFrame(play)
}
// 日志
function handleLogEvent(e: { detail: { logs: string[] } }) {
  for (const log of e.detail.logs) {
    const regex = log.match(
      /^.{14} \w+ 00:(?:00b9|0[12]39)::?(?:距离战斗开始还有|Battle commencing in |戦闘開始まで)(?<cd>\d+)[^（(\d]+[（(]/i,
    )
    if (regex) {
      // 倒计时
      startTimeline(Number.parseInt(regex?.groups?.cd || '0'))
    }
    else if (
      /^.{14} Director 21:.{8}:4000000F/.test(log)
      || /^.{14} ChatLog 00:0038::end$/.test(log)
    ) {
      // 团灭
      stopTimeline()
    }
    else {
      // 是否触发了某行的sync
      const timelineSync = syncLines.value.find((item) => {
        return (
          item.sync
          && ((item.syncOnce && !item.syncAlready) || !item.syncOnce)
          && runtimeTimeSeconds.value >= item.time - item.windowBefore
          && runtimeTimeSeconds.value <= item.time + Number(item.windowAfter)
          && item.sync.test(log)
        )
      })
      // 如果匹配sync则同步到time，有jump则同步至jump
      if (timelineSync) {
        timelineSync.syncAlready = true
        syncTimeline(timelineSync.jump || timelineSync.time)
      }
    }
  }
}

// 测试用
function fakeJump(time: number) {
  syncTimeline(time)
}

// 同步页面时间轴
function syncTimeline(targetTime: number) {
  if (baseTimeMs.value === 0)
    startTimeline(0, false)
  offsetTimeMS.value += (targetTime - runtimeTimeSeconds.value) * 1000
  loadedTimelineTTS.value.forEach((v) => {
    if (v.time < targetTime)
      v.alertAlready = true
  })
}

// 玩家状态（职业）
const handlePlayerChangedEvent: EventMap['onPlayerChangedEvent'] = (e) => {
  if (playerState.value.jobs[0] !== e.detail.job) {
    playerState.value.jobs[0] = e.detail.job
    getTimeline()
  }
}

// 切换场景
const handleChangeZone: EventMap['ChangeZone'] = (e) => {
  playerState.value.zoneId = String(e.zoneID)
  getTimeline()
}

// 调用TTS
function cactbotSay(text: string, force = false) {
  if (!text)
    return
  if (doTTS || force)
    tts(text)
}

function testAlert() {
  ElMessage.closeAll()
  ElMessage({
    message: '弹窗测试',
    type: 'success',
    duration: 0,
    showClose: true,
  })
}

// 发送数据
function sendBroadcastData(type: 'get' | 'post' | 'success' | 'hello', data: any = {}): void {
  callOverlayHandler({
    call: 'broadcast',
    source: 'soumaTimeline',
    msg: {
      type,
      data,
    },
  })
}

// 接受广播
const handleBroadcastMessage: EventMap['BroadcastMessage'] = (e) => {
  if (e.source !== 'soumaTimelineSettings') {
    return
  }
  if ((e.msg as any).type === 'post') {
    const data = (e.msg as { data: typeof timelineStore.$state }).data
    for (const v of data.allTimelines) {
      if (v.condition.jobs === undefined) {
        v.condition.jobs = [(v.condition as any).job]
      }
      v.condition.jobs.sort((a, b) => timelineStore.jobList.indexOf(a) - timelineStore.jobList.indexOf(b))
      Reflect.deleteProperty(v.condition, 'job')
    }
    timelineStore.allTimelines = data.allTimelines
    timelineStore.configValues = data.configValues
    timelineStore.showStyle = data.showStyle
    timelineStore.saveTimelineSettings()
    ElMessage.closeAll()
    ElMessage({
      message: '已更新数据',
      type: 'success',
      duration: 3000,
      showClose: false,
    })
    getTimeline() // 获取新数据之后查询一次
    sendBroadcastData('success')
  }
  if ((e.msg as any).type === 'get') {
    sendBroadcastData('post', timelineStore.$state) // 发送数据
  }
}
function handleInCombatChanged(ev: {
  type: 'onInCombatChangedEvent'
  detail: {
    inGameCombat: boolean
    inACTCombat: boolean
  }
}) {
  if (ev.detail.inGameCombat && ev.detail.inACTCombat && baseTimeMs.value === 0)
    startTimeline(0)
  else if (!ev.detail.inGameCombat && !ev.detail.inACTCombat)
    stopTimeline()
}

function init() {
  addOverlayListener('onLogEvent', handleLogEvent)
  addOverlayListener('onPlayerChangedEvent', handlePlayerChangedEvent)
  addOverlayListener('ChangeZone', handleChangeZone)
  addOverlayListener('BroadcastMessage', handleBroadcastMessage)
  addOverlayListener('onInCombatChangedEvent', handleInCombatChanged)
  timelineStore.loadTimelineSettings()
  ElMessage({
    message: `${timelineStore.allTimelines.length}条时间轴已就绪`,
    type: 'info',
    duration: 1000,
    showClose: false,
  })
  getTimeline()
}
</script>

<template>
  <CommonActWrapper>
    <div id="wrapper">
      <ul
        v-if="
          timelinePageData.optionalTimeline.length
            && runtimeTimeSeconds <= -timelineStore.configValues.preBattle
        "
        class="optionalTimelines"
      >
        <span style="color: white; text-shadow: 1px 1px 1px black, -1px -1px 1px black, 1px -1px 1px black, -1px 1px 1px black;">选择一个时间轴</span>
        <li
          v-for="(item, index) in timelinePageData.optionalTimeline"
          :key="index"
          :class="timelinePageData.selectedOptionalTimeline === item ? 'active' : ''"
          @click="selectedTimeline(item)"
        >
          {{ item.name }}
          <el-icon v-if="timelinePageData.selectedOptionalTimeline === item">
            <Check />
          </el-icon>
        </li>
      </ul>
      <timeline-timeline-show
        :config="timelineStore.configValues"
        :lines="timelinePageData.loadedTimeline"
        :runtime="runtimeTimeSeconds"
        :show-style="timelineStore.showStyle"
      />
      <button v-if="dev" @click="startTimeline(30)">
        开始从-30
      </button>
      <button v-if="dev" @click="startTimeline(0)">
        开始从0
      </button>
      <button v-if="dev" @click="stopTimeline()">
        团灭
      </button>
      <button v-if="dev" @click="fakeJump(1000)">
        跳转1000测试
      </button>
      <button v-if="dev" @click="tts('今天天气真不错')">
        TTS测试
      </button>
      <button v-if="dev" @click="testAlert">
        弹窗测试
      </button>
      <span v-if="dev" style="color: white; background-color: black">{{
        runtimeTimeSeconds
      }}</span>
    </div>
  </CommonActwrapper>
</template>

<style lang="scss">
::-webkit-scrollbar {
  display: none !important;
}
</style>

<style lang="scss" scoped>
* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  user-select: none;
}

#wrapper {
  overflow: hidden;
  user-select: none;
  min-height: 100px;
  .icon {
    background-color: rgba($color: #000000, $alpha: 0.01);
    cursor: pointer;
    filter: drop-shadow(1px 2px 1px black);
    fill: blueviolet;
    opacity: 0.8;
    transition-duration: 0.2s;
    position: fixed;
    top: 0;
    right: 0;
    margin: 5px;
    &:hover {
      opacity: 1;
      transform-origin: center center;
      transform: scale(1.2);
    }
  }
  .optionalTimelines {
    font-size: 18px;
    li {
      background-color: lightblue;
      margin: 1px 0px;
      padding: 1px 2px;
      white-space: nowrap;
      font-size: 14px;
      letter-spacing: -0.5px;
      &:hover {
        cursor: pointer;
        text-decoration: underline;
      }
      &.active {
        font-weight: bold;
      }
    }
  }
  footer {
    position: fixed;
    bottom: 0;
    right: 0;
  }
}
</style>
