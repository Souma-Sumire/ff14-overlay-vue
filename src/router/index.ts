import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: () => import("../pages/Home.vue") },
    { path: "/index.html", redirect: "/" },
    { path: "/timeline", component: () => import("../pages/timeline/Timeline.vue"), meta: { title: "时间轴" } },
    { path: "/timeline/settings", component: () => import("../pages/timeline/TimelineSettings.vue"), meta: { title: "时间轴编辑" } },
    { path: "/instancedAreaInfo", component: () => import("../pages/instancedAreaInfo/InstancedAreaInfo.vue"), meta: { title: "副本区信息" } },
    { path: "/stageProgramme", component: () => import("../pages/stageProgramme/StageProgramme.vue"), meta: { title: "舞台节目单" } },
    { path: "/mpTick", component: () => import("../pages/mpTick/MpTick.vue"), meta: { title: "回蓝监控" } },
  ],
});
router.afterEach((to) => {
  if (to.meta.title) document.title = to.meta.title as string;
});
export default router;
