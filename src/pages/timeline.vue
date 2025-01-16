<script lang="ts" setup>
import type {
  ITimeline,
  ITimelineCondition,
  ITimelineLine,
} from '@/types/timeline'
import type { EventMap } from 'cactbot/types/event'
import { parseTimeline, useTimelineStore } from '@/store/timeline'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addOverlayListener,
  callOverlayHandler,
} from '../../cactbot/resources/overlay_plugin_api'
import '@sweetalert2/theme-bootstrap-4/bootstrap-4.scss'

const timelineStore = useTimelineStore()
const timelinePageData = reactive({
  loadedTimeline: [] as ITimelineLine[], // 显示在页面上的时间轴
  optionalTimeline: [] as ITimeline[], // 有多个供选择的时间轴
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
const params = new URLSearchParams(location.hash.split('?')[1])
const devMode = ref(
  window.location.href.match(/localhost/)
  || params.get('dev') === '1',
)

const syncLines = computed(() =>
  timelinePageData.loadedTimeline.filter(item => item.sync),
)
const loadedTimelineTTS = computed(() =>
  timelinePageData.loadedTimeline.filter(v => v.tts),
)

onMounted(() => {
  init()
})

// 从数据列表中根据玩家职业与地区获得一个或多个时间轴
function getTimeline() {
  stopTimeline()
  timelinePageData.loadedTimeline.length = 0
  timelinePageData.optionalTimeline.length = 0
  const candidate: ITimeline[] = timelineStore.getTimeline(playerState.value)
  if (candidate.length === 1) {
    // 单个结果
    mountTimeline(candidate[0])
  }
  else if (candidate.length > 1) {
    // 多个结果
    timelinePageData.optionalTimeline = candidate
  }
}

// 用户选择了某个时间轴
function selectedTimeline(timeline: ITimeline) {
  mountTimeline(timeline)
}

// 载入时间轴页面
async function mountTimeline(timeline: ITimeline, stopLoadedTimeline = true) {
  if (stopLoadedTimeline) {
    stopTimeline()
  }
  doTTS = false
  if (timeline?.timeline) {
    timelinePageData.loadedTimeline = await parseTimeline(timeline.timeline)
    timelinePageData.loadedTimeline.sort((a, b) => a.time - b.time)
    ElMessage.success(`加载了${timeline.name}`)
    // lastUsedTimeline = timeline;
  }
  setTimeout(() => {
    doTTS = true
  }, 1000)
}

// 停止当前
function stopTimeline() {
  // clearInterval(Number(runtimeTimer));
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
      || /^.{14} SystemLogMessage 29:.{8}:B1C:/.test(log)
    ) {
      // 团灭
      stopTimeline()
      // mountTimeline(lastUsedTimeline);
    }
    else {
      // 是否触发了某行的sync
      const timelineSync = syncLines.value.find((item) => {
        // console.log(item.sync, log);
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
    if (/^.{14} ChatLog 00:0038::/.test(log)) {
      // echo
      const name = log.match(/^.{14} ChatLog 00:0038::(?<name>.+)$/)?.groups?.name
      if (name) {
        const timeline = timelineStore
          .getTimeline(playerState.value)
          .find(c => c.name === name)
        if (timeline) {
          mountTimeline(timeline, false)
        }
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
  // lastUsedTimeline = { name: "", condition: { zoneId: "", job: "NONE" }, timeline: "", codeFight: "", create: "" };
  getTimeline()
}

// 调用TTS
function cactbotSay(text: string, force = false) {
  if (!text)
    return
  if (doTTS || force)
    callOverlayHandler({ call: 'cactbotSay', text })
}

// 发送数据
function sendBroadcastData(type: 'get' | 'post', data: any = {}): void {
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
    if (data.allTimelines.length < timelineStore.allTimelines.length - 1) {
      ElMessageBox.confirm(
        data.allTimelines.length === 0 ? '传入数据为空. 确定要清空数据吗?' : '你删除了2条以上的时间轴. 确定吗?',
        '警告',
        {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )
        .then(() => {
          update()
        })
        .catch(() => {
          ElMessage({
            type: 'info',
            message: '操作已取消',
          })
        })
    }
    else {
      update()
    }

    function update() {
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
        duration: 5000,
        showClose: false,
      })
      getTimeline() // 获取新数据之后查询一次
    }
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
  // startOverlayEvents();
  timelineStore.loadTimelineSettings()
  ElMessage({
    message: `${timelineStore.allTimelines.length}条时间轴已就绪`,
    type: 'info',
    duration: 1500,
    showClose: true,
  })
  getTimeline()
}
// eslint-disable-next-line no-console
console.log('使用souma时间轴的小朋友们，你们好。我不是雷军。通知一下，现在没有小齿轮了，请用你的浏览器打开：https://souma.diemoe.net/ff14-overlay-vue/#/timelineSettings?OVERLAY_WS=ws://127.0.0.1:10501/ws')
</script>

<template>
  <div id="wrapper">
    <ul
      v-if="
        timelinePageData.optionalTimeline.length
          && runtimeTimeSeconds <= -timelineStore.configValues.preBattle
      "
      class="optionalTimelines"
    >
      <li
        v-for="(item, index) in timelinePageData.optionalTimeline"
        :key="index"
        @click="selectedTimeline(item)"
      >
        {{ item.name }}
      </li>
    </ul>
    <timeline-timeline-show
      :config="timelineStore.configValues"
      :lines="timelinePageData.loadedTimeline"
      :runtime="runtimeTimeSeconds"
      :show-style="timelineStore.showStyle"
    />
    <button v-if="devMode" @click="startTimeline(30)">
      开始从-30
    </button>
    <button v-if="devMode" @click="startTimeline(0)">
      开始从0
    </button>
    <button v-if="devMode" @click="stopTimeline()">
      团灭
    </button>
    <button v-if="devMode" @click="fakeJump(1000)">
      跳转1000测试
    </button>
    <button v-if="devMode" @click="cactbotSay('今天天气真不错', true)">
      TTS测试
    </button>
    <span v-if="devMode" style="color: white; background-color: black">{{
      runtimeTimeSeconds
    }}</span>
  </div>
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
    // filter: brightness(0.8);
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
    display: flex;
    list-style: none;
    flex-direction: column;
    font-size: 16px;
    font-weight: bold;
    line-height: 2em;
    li {
      background-color: lightblue;
      margin: 2px;
      padding-left: 12px;
      &:hover {
        cursor: pointer;
        transition-duration: 0.2s;
        font-size: 20px;
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
