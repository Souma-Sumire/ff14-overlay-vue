import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import routes from "~pages";

const router = createRouter({
  history: createWebHashHistory(),
  // history: createWebHistory(),
  routes,
});

const routeTitles = new Map(
  Object.entries({
    "index": "导航页",
    "timeline": "时间轴",
    "timelineSettings": "时间轴编辑",
    "instancedAreaInfo": "副本区信息",
    "stageProgramme": "舞台节目单",
    "dsrp6": "绝龙诗P6",
    "obs": "obs自动录制",
    "zoneMacro": "副本宏",
    "fflogsUploaderDownload": "今天FFLogsUploader更新了吗？",
    "jobs-dnc": "舞者增强",
    "okASTCard": "一键发卡",
    "castingToChinese": "读条汉化",
    "castingMonitor": "施法监控",
    "cactbotRuntime": "cactbot拓展",
    "blubook": "青魔法书图鉴",
    "keigennRecord": "减伤监控2",
  }),
);

router.getRoutes().forEach((route) => {
  route.meta.title = routeTitles.get(route.name?.toString() ?? "") ?? route.name;
});

router.afterEach((to, from) => {
  document.title = to.meta.title?.toString() ?? "";
  if (to.name === "index" && from.name !== undefined && to.name !== from.name) {
    // 防止子页面的style污染主页的样式
    window.location.reload();
  }
});

export default router;
