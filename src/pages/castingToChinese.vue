<script setup lang="ts">
import { getActionChinese } from '@/resources/actionChinese'
import { getActionChineseTemp } from '@/resources/actionChineseTemp'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

const params = new URLSearchParams(window.location.href.split('?')[1])

function getName(line: string[]): string {
  const id = Number.parseInt(line[4], 16)
  const sourceId = line[2]
  const rawText = line[5]
  return getActionChineseTemp(id) || getActionChinese(id) || (void (sourceId.startsWith('4') && !rawText.includes('unknown') && console.error(`未找到动作 ${id} ${rawText}`)) || rawText)
}

class Cast {
  name: string
  startTime: number
  castTime: number
  overTime: number
  actionId: number
  constructor(line: string[]) {
    this.name = getName(line)
    this.startTime = Date.now()
    this.castTime = Number(line[8]) * 1000
    this.overTime = this.startTime + this.castTime
    this.actionId = Number.parseInt(line[4], 16)
  }
}

const data: { targetCast?: Cast } = reactive({ targetCast: undefined })
const targetOptions = [
  {
    value: 'Target',
    label: '当前目标',
  },
  {
    value: 'Focus',
    label: '焦点目标',
  },
]
const settings
  = ref({
    width: 265,
    showCountdown: false,
    showProgress: false,
    showActionChinese: true,
    showActionID: false,
    offsetProgressX: 0,
    offsetProgressY: -22,
    offsetCountdownX: 265 - 25,
    offsetCountdownY: -5,
    offsetActionChineseX: 265 + 10,
    offsetActionChineseY: -45,
    offsetActionIDX: 10,
    offsetActionIDY: -5,
    ping: 80,
    keep: 100,
    fontSizeCountDown: 17,
    fontSizeActionName: 20,
    fontFamily: 'SmartisanHei',
    targetKey: 'Target' as 'Target' | 'Focus',
  })
useStorage('castingToChineseFix', settings, localStorage, { mergeDefaults: true })
const windowWidth = computed(() => `${settings.value.width}px`)
const opacityCountdown = computed(() => (settings.value.showCountdown ? 1 : 0))
const opacityProgress = computed(() => (settings.value.showProgress ? 1 : 0))
const opacityActionChinese = computed(() => settings.value.showActionChinese ? 1 : 0)
const opacityActionID = computed(() => (settings.value.showActionID ? 1 : 0))
const offsetCountdownX = computed(() => `${settings.value.offsetCountdownX}px`)
const offsetCountdownY = computed(() => `${settings.value.offsetCountdownY * -1}px`)
const offsetActionChineseX = computed(() => `${settings.value.offsetActionChineseX}px`)
const offsetActionChineseY = computed(() => `${settings.value.offsetActionChineseY * -1}px`)
const offsetActionIDX = computed(() => `${settings.value.offsetActionIDX}px`)
const offsetActionIDY = computed(() => `${settings.value.offsetActionIDY * -1}px`)
const offsetProgressX = computed(() => `${settings.value.offsetProgressX}px`)
const offsetProgressY = computed(() => `${settings.value.offsetProgressY * -1}px`)
const casting = new Map()
const now = ref(0)
const ping = settings.value.ping
const showSettings = ref(
  /^(?:1|true|on)$/i.test(params.get('showSettings') || '')
  || document.getElementById('unlocked')?.style?.display === 'flex',
)

addOverlayListener(
  'EnmityTargetData',
  (e: { Target: { ID: number } | null, Focus: { ID: number } | null }) => {
    data.targetCast = casting.get(e[settings.value.targetKey]?.ID)
  },
)

addOverlayListener('LogLine', (e: { line: string[] }) => {
  if (e.line[0] === '20')
    casting.set(Number.parseInt(e.line[2], 16), new Cast(e.line))
  else if (e.line[0] === '23')
    casting.delete(Number.parseInt(e.line[2], 16))
})

addOverlayListener('ChangeZone', () => casting.clear())

// startOverlayEvents();

requestAnimationFrame(function update() {
  now.value = Date.now()
  requestAnimationFrame(update)
})

document.addEventListener('onOverlayStateUpdate', (e) => {
  showSettings.value = e?.detail?.isLocked === false
})

function resetSettings() {
  localStorage.removeItem('castingToChinese')
  location.reload()
}
</script>

<template>
  <div class="container">
    <el-header v-show="showSettings" class="settings">
      <form>
        宽度:
        <el-input-number
          v-model="settings.width"
          :min="20"
          :max="1000"
          size="small"
          controls-position="right"
        />
      </form>
      <form>显示倒计时: <el-switch v-model="settings.showCountdown" /></form>
      <form>显示进度条: <el-switch v-model="settings.showProgress" /></form>
      <form>显示中文: <el-switch v-model="settings.showActionChinese" /></form>
      <form>显示ID: <el-switch v-model="settings.showActionID" /></form>
      <form>
        延迟(ms):
        <el-input-number
          v-model="settings.ping"
          :min="0"
          :max="10000"
          size="small"
          controls-position="right"
        />
      </form>
      <form>
        保留(ms):
        <el-input-number
          v-model="settings.keep"
          :min="0"
          :max="100000"
          size="small"
          controls-position="right"
        />
      </form>
      <form>
        进度条偏移X:
        <el-input-number
          v-model="settings.offsetProgressX"
          :min="-1000"
          :max="1000"
          size="small"
        />
      </form>
      <form>
        进度条偏移Y:
        <el-input-number
          v-model="settings.offsetProgressY"
          :min="-1000"
          :max="1000"
          size="small"
          controls-position="right"
        />
      </form>
      <form>
        倒计时偏移X:
        <el-input-number
          v-model="settings.offsetCountdownX"
          :min="-1000"
          :max="1000"
          size="small"
        />
      </form>
      <form>
        倒计时偏移Y:
        <el-input-number
          v-model="settings.offsetCountdownY"
          :min="-1000"
          :max="1000"
          size="small"
          controls-position="right"
        />
      </form>
      <form>
        中文偏移X:
        <el-input-number
          v-model="settings.offsetActionChineseX"
          :min="-1000"
          :max="1000"
          size="small"
        />
      </form>
      <form>
        中文偏移Y:
        <el-input-number
          v-model="settings.offsetActionChineseY"
          :min="-1000"
          :max="1000"
          size="small"
          controls-position="right"
        />
      </form>
      <form>
        ID偏移X:
        <el-input-number
          v-model="settings.offsetActionIDX"
          :min="-1000"
          :max="1000"
          size="small"
        />
      </form>
      <form>
        ID偏移Y:
        <el-input-number
          v-model="settings.offsetActionIDY"
          :min="-1000"
          :max="1000"
          size="small"
          controls-position="right"
        />
      </form>
      <form>
        倒计时字号(px):
        <el-input-number
          v-model="settings.fontSizeCountDown"
          :min="1"
          :max="100"
          size="small"
          controls-position="right"
        />
      </form>
      <form>
        中文字号(px):
        <el-input-number
          v-model="settings.fontSizeActionName"
          :min="1"
          :max="100"
          size="small"
          controls-position="right"
        />
      </form>
      <form style="width: 10rem">
        字体:
        <el-input
          v-model="settings.fontFamily"
          size="small"
          clearable
          @clear="settings.fontFamily = 'SmartisanHei'"
        />
      </form>
      <form class="noCSS">
        <el-select
          v-model="settings.targetKey"
          placeholder="Select"
          size="small"
          :teleported="false"
        >
          <el-option
            v-for="item in targetOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </form>
      <form class="noCSS">
        <el-popconfirm
          :teleported="false"
          title="确定要重置？"
          @confirm="resetSettings"
        >
          <template #reference>
            <el-button>重置全部用户设置</el-button>
          </template>
        </el-popconfirm>
      </form>
    </el-header>
    <el-main
      v-show="
        data.targetCast && now - data.targetCast.overTime + ping < settings.keep
      "
      :style="{ fontFamily: settings.fontFamily }"
    >
      <div
        :style="{ fontSize: `${settings.fontSizeCountDown}px` }"
        class="countdown"
      >
        {{
          Math.max(
            ((data.targetCast?.overTime ?? 1) - now - ping) / 1000,
            0,
          ).toFixed(2)
        }}
      </div>
      <el-progress
        :percentage="
          Math.min(
            ((now - (data.targetCast?.startTime ?? 1) + ping)
              / (data.targetCast?.castTime ?? 1))
              * 100,
            100,
          )
        "
        :stroke-width="8"
        :indeterminate="false"
        :show-text="false"
        color="#fbfff9"
        class="progress"
      />
      <div class="actionID">
        {{ data.targetCast?.actionId }}({{
          data.targetCast?.actionId.toString(16).toUpperCase()
        }})
      </div>
      <div
        :style="{ fontSize: `${settings.fontSizeActionName}px` }"
        class="actionChinese"
      >
        {{ data.targetCast?.name }}
      </div>
    </el-main>
  </div>
</template>

<style lang="scss" scoped>
.container{
  overflow: hidden;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
* {
  user-select: none;
}
::-webkit-scrollbar {
  display: none !important;
}
// @font-face {
//   font-family: "SmartisanHei";
//   src: url("//ffxiv-res.diemoe.net/SmartisanHei.woff2") format("woff2"),
//     url("//ffxiv-res.diemoe.net/SmartisanHei.ttf"),
//     url("//cdn.diemoe.net/files/fonts/SmartisanHei.woff2") format("woff2"),
//     url("//cdn.diemoe.net/files/fonts/SmartisanHei.ttf");
//   font-weight: normal;
//   font-style: normal;
// }
.settings {
  overflow: visible;
  position: fixed;
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
.countdown {
  position: absolute;
  opacity: v-bind(opacityCountdown);
  left: v-bind(offsetCountdownX);
  top: v-bind(offsetCountdownY);
}
.progress {
  opacity: v-bind(opacityProgress);
}
.actionChinese {
  position: absolute;
  opacity: v-bind(opacityActionChinese);
  left: v-bind(offsetActionChineseX);
  top: v-bind(offsetActionChineseY);
  text-align: right;
  transform: translateX(-100%);
}
.actionID {
  position: absolute;
  opacity: v-bind(opacityActionID);
  left: v-bind(offsetActionIDX);
  top: v-bind(offsetActionIDY);
}
.el-main {
  position: relative;
  width: 100%;
  height: 100%;
  color: rgb(254, 254, 253);
  text-shadow: -1px 0 3px #b38915, 0 1px 3px #b38915, 1px 0 3px #b38915,
    0 -1px 3px #b38915;
  padding: 0px;
  margin: 10px;
  .el-progress {
    width: v-bind(windowWidth);
    margin: 10px;
    position: absolute;
    left: v-bind(offsetProgressX);
    top: v-bind(offsetProgressY);
    :deep(.el-progress-bar) {
      box-sizing: content-box;
      box-shadow: 0 0 4px #f8a100, 0 0 2px #b28815, 0 0 1px #38260b;
      .el-progress-bar__outer,
      .el-progress-bar__inner {
        border-radius: 0;
      }
      .el-progress-bar__outer {
        background-color: #38260b;
      }
    }
    :deep(.el-progress-bar__inner) {
      transition-duration: 0s !important;
    }
  }
}
</style>
