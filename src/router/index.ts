import { createRouter, createWebHashHistory } from 'vue-router'
import routes from '~pages'

const router = createRouter({
  history: createWebHashHistory(),
  // history: createWebHistory(),
  routes,
})

const routeTitles = new Map(
  Object.entries({
    aether: '简易风脉地图',
    blubook: '青魔法书图鉴',
    cactbotRuntime: '职能分配',
    castingMonitor: '施法监控',
    castingToChinese: '读条汉化',
    dsrp6: '绝龙诗 P6 修血简易记录',
    fflogsUploaderDownload: '今天 FFLogsUploader 更新了吗？',
    ffxivAxisWebFont: 'FFXIV Axis 字体',
    hexcode: 'hexcode 简易工具',
    hunt: '有车吗？',
    instancedAreaInfo: '我 TM 现在在几线？',
    keigennRecord2: '减伤监控 2',
    obs: 'OBS 自动录制',
    obs2: 'OBS 自动录制 2',
    showBarrier: '盾值显示',
    startPages: '主页导航',
    statusCompare: '版本新增状态一览',
    time: '显示时间',
    timeline: '自定义时间轴',
    timelineHelp: '自定义时间轴帮助',
    timelineSettings: '自定义时间轴编辑',
    zoneMacro: '副本宏',
  }),
)
for (const route of router.getRoutes()) {
  route.meta.title
    = routeTitles.get(route.name?.toString() ?? '') ?? route.name
}

router.afterEach((to, from) => {
  document.title = to.meta.title?.toString() ?? ''
  if (from.name === 'startPages' && to.name === 'zoneMacro') {
    // 刷新页面，否则不会建立WS连接
    window.location.reload()
  }
  if (to.name === 'startPages' && from.name !== undefined && to.name !== from.name) {
    // 防止子页面的style污染主页的样式
    window.location.reload()
  }
})

export default router
