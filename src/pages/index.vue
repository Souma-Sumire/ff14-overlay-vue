<script setup lang="ts">
import { pleaseUseACT } from "../utils/pleaseUseACT";
import router from "../router";
type MenuType = "网页" | "悬浮窗" | "悬浮窗/网页";
interface Menu {
  title: string;
  type: MenuType;
  path: string;
}
const menu: Menu[] = [
  {
    title: "♿[Github]CACTBOT JS 火箭轮椅",
    type: "网页",
    path: "https://github.com/Souma-Sumire/raidboss-user-js-public",
  },
  { title: "🪐占星一键发卡", type: "悬浮窗", path: "okASTCard" },
  {
    title: "🌱施法监控",
    type: "悬浮窗",
    path: "castingMonitor?duration=25&energySaving=true&displayAA=false&displayGCDSpace=false&api=cafemaker&syncFocusWS=true&showHeader=true",
  },
  { title: "👍全副本一键发宏/标点", type: "悬浮窗", path: "zoneMacro" },
  { title: "🔥技能时间轴", type: "悬浮窗", path: "timeline" },
  { title: "📹OBS自动录制", type: "悬浮窗", path: "obs" },
  { title: "🤷我TM现在在几线？", type: "悬浮窗", path: "instancedAreaInfo" },
  { title: "📖绝龙诗双分摊修血记录", type: "悬浮窗", path: "dsrP6" },
  { title: "🀄[Github]国际服汉化补丁", type: "网页", path: "https://github.com/Souma-Sumire/FFXIVChnTextPatch-Souma/" },
  { title: "⏩FFLOGS上传器加速下载", type: "网页", path: "fflogsUploaderDownload" },
  { title: "💃舞台节目单（没啥用，被窝同款）", type: "网页", path: "stageProgramme" },
  {
    title: "🧐减伤监控",
    type: "悬浮窗",
    path: "https://souma.diemoe.net/dist/keigennRecord.html?maxLength=800&24Mode=false&bgOpacity=0.45&bodyOpacity=1&fontSize=12px&th1=36px&th2=75px&th3=34px&th4=46px&imgHeight=20&mini=false&autoclean=false",
  },
  {
    title: "🕵️团辅团减监控",
    type: "悬浮窗",
    path: "https://souma.diemoe.net/dist/keySkillTimer.html?international=false&dajinengTTS=true&jianshangTTS=true&tuanfuTTS=true",
  },
  {
    title: "👨‍✈️技能监控",
    type: "悬浮窗",
    path: "https://souma.diemoe.net/dist/teamWatch.html?scale=1&reverse=false&rightAlign=false&postNamazu=false",
  },
  {
    title: "📰读条汉化",
    type: "悬浮窗",
    path: "https://souma.diemoe.net/dist/castingToChinese.html?directive=false&focus=false&tts=false&hideProg=false&hideCountdown=false&roomaji=true&progHeight=10px&fontSize=20px&fontFamily=SmartisanHei&ping=80&showCastId=true",
  },
  {
    title: "🏵️LB额外增长监控",
    type: "悬浮窗",
    path: "https://souma.diemoe.net/dist/limitBreakTip.html?LBMax=30000&automatic=220",
  },
  {
    title: "OBS用的：显示具体时间",
    type: "网页",
    path: "time",
  },
];
function handleClickMenu(menu: Menu) {
  if (menu.type === "悬浮窗") {
    pleaseUseACT(() => {
      /^http/.test(menu.path) ? (location.href = menu.path) : router.push(menu.path);
    });
  } else {
    /^http/.test(menu.path) ? (location.href = menu.path) : router.push(menu.path);
  }
}
</script>

<template>
  <div class="common-layout" bt-white>
    <el-container>
      <el-header><h1>主页导航</h1></el-header>
      <el-main>
        <el-table :data="menu" :show-header="false">
          <el-table-column label="跳转" width="85">
            <template #default="scope"> <el-button @click="handleClickMenu(scope.row)">跳转</el-button> </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" />
        </el-table>
      </el-main>
    </el-container>
  </div>
</template>
