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
  { title: "🀄国际服汉化补丁", type: "网页", path: "ffxiv_zhpatch" },
  { title: "⏩FFLOGS上传器加速下载", type: "网页", path: "fflogsUploaderDownload" },
  { title: "💃舞台节目单", type: "网页", path: "stageProgramme" },
  { title: "📟以前的悬浮窗", type: "网页", path: "other" },
];
function handleClickMenu(menu: Menu) {
  if (menu.path === "other") {
    location.href = "https://souma.diemoe.net/dist/";
    return;
  } else if (menu.path === "ffxiv_zhpatch") {
    location.href = "https://souma.diemoe.net/ffxiv_zhpatch/";
    return;
  }
  if (menu.type === "悬浮窗") pleaseUseACT();
  router.push(menu.path);
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
