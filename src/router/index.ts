import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: () => import("../pages/Home.vue") },
    { path: "/index.html", redirect: "/" },
    { path: "/timeline", component: () => import("../pages/Timeline.vue"), meta: { title: "时间轴" } },
    { path: "/timeline/settings", component: () => import("../components/timeline/TimelineSettings.vue"), meta: { title: "时间轴编辑" } },
    { path: "/instancedAreaInfo", component: () => import("../pages/InstancedAreaInfo.vue"), meta: { title: "副本区信息" } },
    { path: "/stageProgramme", component: () => import("../pages/StageProgramme.vue"), meta: { title: "舞台节目单" } },
    { path: "/DSRP6", component: () => import("../pages/DSRP6.vue"), meta: { title: "绝龙诗P6" } },
    { path: "/obs", component: () => import("../pages/Obs.vue"), meta: { title: "obs自动录制" } },
  ],
});
router.afterEach((to) => {
  if (to.meta.title) document.title = to.meta.title as string;
});
export default router;
