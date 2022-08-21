<template>
  <main>
    <ul v-if="actionTimeline.show">
      <li class="li-head">
        <aside>秒</aside>
        <h5>邪龙</h5>
        <h5>圣龙</h5>
      </li>
      <li class="li-main" v-for="(second, i) in actionTimeline.data" :key="i">
        <aside>{{ i }}</aside>
        <div class="xie">{{ second?.xieHP ?? "" }}%<img v-for="(src, j) in second.xie" :key="j" :src="src" alt="" /></div>
        <div class="sheng">{{ second?.shengHP ?? "" }}%<img v-for="(src, j) in second.sheng" :key="j" :src="src" alt="" /></div>
      </li>
    </ul>
  </main>
</template>

<script lang="ts" setup>
// import "../common/hasOverlayPluginApi";
import { reactive } from "vue";
import { useActionStore } from "../store/action";
addOverlayListener("LogLine", handleLogLine);
startOverlayEvents();
const actionStore = useActionStore();
const siteImg = __SITE_IMG__;
const targetName = {
  xie: ["尼德霍格", "ニーズヘッグ", "Nidhogg"],
  sheng: ["赫拉斯瓦尔格", "フレースヴェルグ", "Hraesvelgr"],
};
const actionTimeline: { show: boolean; data: { xie: string[]; xieHP: string; sheng: string[]; shengHP: string }[] } = reactive({
  data: [],
  show: false,
});
const hp: { xie: number; sheng: number } = { xie: 0, sheng: 0 };
let baseTime = 0;
function createACompleteImg(url = "000000/000405"): string {
  return siteImg + "/" + url + ".png";
}
function handleLogLine(e: { line: string[] }): void {
  if (baseTime === 0 && e.line[0] === "20" && /^6D41$/.test(e.line[4])) {
    actionTimeline.data.length = 0;
    actionTimeline.show = true;
    actionTimeline.data[0] = { xie: [], sheng: [], xieHP: "0", shengHP: "0" };
    baseTime = new Date().getTime();
    setTimeout(() => {
      baseTime = 0;
    }, 7700);
  } else if (e.line[0] === "20" && /^(?:63C8|6D21)$/.test(e.line[4])) {
    actionTimeline.data.length = 0;
    actionTimeline.show = false;
    actionTimeline.data[0] = { xie: [], sheng: [], xieHP: "0", shengHP: "0" };
  } else if (baseTime > 0 && (e.line[0] === "21" || e.line[0] === "22") && e.line[2][0] === "1" && e.line[6][0] === "4") {
    if (e.line[4] === "07" || e.line[4] === "08") return;
    const timeIndex = Math.round((new Date().getTime() - baseTime) / 1000);
    if (actionTimeline.data[timeIndex] === undefined)
      actionTimeline.data[timeIndex] = { xie: [], sheng: [], xieHP: hp.xie.toFixed(1), shengHP: hp.sheng.toFixed(1) };
    // console.log(1, actionTimeline.data[timeIndex].xieHP.toString(), actionTimeline.data[timeIndex].shengHP.toString());
    const img = createACompleteImg(actionStore.getActionById(parseInt(e.line[4], 16))?.Url);
    if (targetName.xie.includes(e.line[7])) {
      hp.xie = (Number(e.line[24]) / Number(e.line[25])) * 100;
      actionTimeline.data[timeIndex].xie.push(img);
      actionTimeline.data[timeIndex].xieHP = hp.xie.toFixed(1);
      // console.log(2.1, actionTimeline.data[timeIndex].xieHP.toString());
    } else if (targetName.sheng.includes(e.line[7])) {
      hp.sheng = (Number(e.line[24]) / Number(e.line[25])) * 100;
      actionTimeline.data[timeIndex].sheng.push(img);
      actionTimeline.data[timeIndex].shengHP = hp.sheng.toFixed(1);
      // console.log(2.2, actionTimeline.data[timeIndex].shengHP.toString());
    }
  }
}
</script>

<style lang="scss">
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
</style>
