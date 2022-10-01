import Swal from "sweetalert2";
import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import routes from "~pages";
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
// router.beforeResolve((to, from) => {
//   if (to.name === "index") Swal.close();
//   return true;
// });
const routeTitles = new Map(
  Object.entries({
    "index": "首页",
    "timeline": "时间轴",
    "timeline-settings": "时间轴编辑",
    "instancedAreaInfo": "副本区信息",
    "stageProgramme": "舞台节目单",
    "dsrp6": "绝龙诗P6",
    "obs": "obs自动录制",
    "zoneMacro": "副本宏",
  }),
);
router.getRoutes().forEach((route) => (route.meta.title = routeTitles.get(route.name?.toString() ?? "")));
router.afterEach((to, from) => {
  document.title = to.meta.title?.toString() ?? "页面";
  if (from.name === "index" && to.name === "index") Swal.close();
  if (from.name === "index" && to.name === "zoneMacro") location.reload();
});

export default router;
