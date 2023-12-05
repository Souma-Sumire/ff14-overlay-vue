<script setup lang="ts">
import router from "@/router";

type MenuType = "网页" | "悬浮窗" | "悬浮窗/网页";
interface Menu {
  title: string;
  type: MenuType;
  path: string;
  comment?: string;
}
const tableData: Menu[] = [
  {
    title: "Cactbot自定义JS分享",
    type: "网页",
    path: "https://github.com/Souma-Sumire/raidboss-user-js-public",
  },
  {
    title: "减伤监控2",
    type: "网页",
    path: "keigennRecord2",
  },
  {
    title: "青魔法书图鉴",
    type: "网页",
    path: "blubook",
  },
  {
    title: "FFLOGS上传器加速下载",
    type: "网页",
    path: "fflogsUploaderDownload",
  },
  {
    title: "国际服汉化补丁",
    type: "网页",
    path: "https://github.com/Souma-Sumire/FFXIVChnTextPatch-Souma/",
  },
  {
    title: "职业增强：舞者",
    type: "悬浮窗",
    path: "jobs/dnc",
  },
  {
    title: "占星一键发卡",
    type: "悬浮窗",
    path: "okASTCard",
  },
  {
    title: "施法监控",
    type: "悬浮窗",
    path: "castingMonitor?duration=25&energySaving=true&displayAA=false&displayGCDSpace=false&api=cafemaker&syncFocusWS=true&showHeader=true",
  },
  {
    title: "全副本发宏/标点",
    type: "悬浮窗",
    path: "zoneMacro",
  },
  {
    title: "自定义技能时间轴",
    type: "悬浮窗",
    path: "timeline",
  },
  {
    title: "OBS自动录制",
    type: "悬浮窗",
    path: "obs",
  },
  {
    title: "读条汉化",
    type: "悬浮窗",
    path: "castingToChinese",
    comment: "国服也可以用里面的倒计时功能",
  },
  {
    title: "减伤监控（旧）",
    type: "悬浮窗",
    path: "https://souma.diemoe.net/dist/keigennRecord.html?maxLength=800&24Mode=false&bgOpacity=0.45&bodyOpacity=1&fontSize=12px&th1=36px&th2=75px&th3=34px&th4=46px&imgHeight=20&mini=false&autoclean=false",
    comment: "预计将于7.0停止维护",
  },
  {
    title: "技能监控（旧）",
    type: "悬浮窗",
    path: "https://souma.diemoe.net/dist/teamWatch.html?scale=1&reverse=false&rightAlign=false&postNamazu=false",
    comment: "预计将于7.0停止维护",
  },
  {
    title: "LB额外增长监控",
    type: "悬浮窗",
    path: "https://souma.diemoe.net/dist/limitBreakTip.html?LBMax=30000&automatic=220",
    comment: "速刷用",
  },
  {
    title: "我TM现在在几线？",
    type: "悬浮窗",
    path: "instancedAreaInfo",
    comment: "版本初期狩猎用",
  },
];

function handleClick(e: Menu) {
  if (e.path.startsWith("http")) {
    window.open(e.path, "_blank");
  } else {
    router.push(e.path);
  }
}
</script>

<template>
  <div class="common-layout" bt-white>
    <el-container>
      <el-header><h1>主页导航</h1></el-header>
      <el-main>
        <vxe-table :data="tableData" border>
          <vxe-column field="title" width="250" title="名称"></vxe-column>
          <vxe-column field="type" width="100" title="类型"></vxe-column>
          <vxe-column field="path" width="100" title="链接">
            <template #default="{ row }">
              <a @click="() => handleClick(row)" style="cursor: pointer">{{ row.type === "网页" ? "访问" : "跳转" }}</a>
            </template>
          </vxe-column>
          <vxe-column field="comment" title="备注"></vxe-column>
        </vxe-table>
      </el-main>
    </el-container>
  </div>
</template>
<style lang="scss" scoped>
a,
a:visited,
a:link,
a:hover {
  color: blue;
}
a:hover {
  text-decoration: underline;
}
</style>
