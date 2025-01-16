<script lang="ts" setup>
import { getImgSrcByActionId } from '@/utils/xivapi'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

addOverlayListener('LogLine', handleLogLine)
// startOverlayEvents();
const targetName = {
  xie: ['尼德霍格', 'ニーズヘッグ', 'Nidhogg'],
  sheng: ['赫拉斯瓦尔格', 'フレースヴェルグ', 'Hraesvelgr'],
}
const actionTimeline: {
  show: boolean
  data: { xie: string[], xieHP: string, sheng: string[], shengHP: string }[]
} = reactive({
  data: [],
  show: false,
})
const HP = { xie: 0, sheng: 0 }
let baseTime = 0
async function handleLogLine(e: { line: string[] }): Promise<void> {
  if (e.line[0] === '20' && /^6D41$/.test(e.line[4])) {
    actionTimeline.data.length = 0
    actionTimeline.show = true
    actionTimeline.data.push({ xie: [], sheng: [], xieHP: '0', shengHP: '0' })
    baseTime = new Date().getTime()
    setTimeout(() => {
      baseTime = 0
    }, 7700)
  }
  else if (e.line[0] === '20' && /^(?:63C8|6D21)$/.test(e.line[4])) {
    actionTimeline.data.length = 0
    actionTimeline.show = false
    actionTimeline.data.push({ xie: [], sheng: [], xieHP: '0', shengHP: '0' })
  }
  else if (
    baseTime > 0
    && (e.line[0] === '21' || e.line[0] === '22')
    && e.line?.[2]?.[0] === '1'
    && e.line?.[6]?.[0] === '4'
  ) {
    if (e.line[4] === '07' || e.line[4] === '08')
      return
    const timeIndex = Math.round((new Date().getTime() - baseTime) / 1000)
    if (actionTimeline.data[timeIndex] === undefined) {
      actionTimeline.data[timeIndex] = {
        xie: [],
        sheng: [],
        xieHP: HP.xie.toFixed(1),
        shengHP: HP.sheng.toFixed(1),
      }
    }
    const img = await getImgSrcByActionId(Number.parseInt(e.line[4], 16))
    if (targetName.xie.includes(e.line[7])) {
      HP.xie = (Number(e.line[24]) / Number(e.line[25])) * 100
      actionTimeline.data[timeIndex].xie.push(img)
      actionTimeline.data[timeIndex].xieHP = HP.xie.toFixed(1)
    }
    else if (targetName.sheng.includes(e.line[7])) {
      HP.sheng = (Number(e.line[24]) / Number(e.line[25])) * 100
      actionTimeline.data[timeIndex].sheng.push(img)
      actionTimeline.data[timeIndex].shengHP = HP.sheng.toFixed(1)
    }
  }
}
</script>

<template>
  <div id="container">
    <main>
      <ul v-if="actionTimeline.show">
        <li class="li-head">
          <aside>秒</aside>
          <h5>邪龙</h5>
          <h5>圣龙</h5>
        </li>
        <li v-for="(second, i) in actionTimeline.data" :key="i" class="li-main">
          <aside>{{ i }}</aside>
          <div class="xie">
            {{ second?.xieHP ?? "" }}%<img
              v-for="(src, j) in second?.xie"
              :key="j"
              :src="src"
              alt=""
            >
          </div>
          <div class="sheng">
            {{ second?.shengHP ?? "" }}%<img
              v-for="(src, j) in second?.sheng"
              :key="j"
              :src="src"
              alt=""
            >
          </div>
        </li>
      </ul>
    </main>
  </div>
</template>

<style lang="scss">
::-webkit-scrollbar {
  display: none !important;
}
</style>

<style lang="scss" scoped>
#container {
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  ul {
    background-color: white;
    border-top: 1px solid black;
    .li-head {
      display: flex;
      h5 {
        width: 260px;
        display: flex;
        flex-flow: wrap;
        justify-content: center;
      }
    }
    .li-main {
      display: flex;
      div {
        width: 260px;
        display: flex;
        flex-flow: wrap;
        border-left: 2px solid black;
        border-top: 1px solid black;
        border-bottom: 1px solid black;
        border-right: 2px solid black;
        img {
          height: 20px;
        }
      }
    }
  }
}
</style>
