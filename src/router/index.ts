import { createRouter, createWebHashHistory } from 'vue-router'
import routes from '~pages'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    ...routes,
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/pages/404.vue'),
    },
  ],
})

const routeTitles = new Map(
  Object.entries({
    aether: '简易风脉地图',
    blubook: '青魔法书图鉴',
    cactbotRuntime: '职能分配',
    castingMonitor: '施法监控',
    castingToChinese: '读条汉化',
    dsrp6: '绝龙诗 P6 修血简易记录',
    enmity: '开盾提醒',
    fflogsUploaderDownload: '今天 FFLogsUploader 更新了吗？',
    ffxivAxisWebFont: 'FFXIV Axis 字体',
    food: '食物警察',
    hexcode: 'hexcode 简易工具',
    hunt: '有车吗？',
    instancedAreaInfo: '我 TM 现在在几线？',
    keigennRecord2: '减伤监控 2',
    lootHistory: '装备分配工具',
    obs2: 'OBS 自动录制 2',
    radar: '雷达',
    showBarrier: '盾值显示',
    startPages: '主页导航',
    test: '自助测试',
    time: '显示时间',
    timeline: '自定义时间轴',
    timelineHelp: '自定义时间轴帮助',
    timelineSettings: '自定义时间轴编辑',
    uisaveEditor: '场景标点编辑器',
    zoneMacro: '副本宏',
  })
)
for (const route of router.getRoutes()) {
  route.meta.title = routeTitles.get(route.name?.toString() ?? '') ?? route.name
}

router.afterEach((to, _from) => {
  document.title = to.meta.title?.toString() ?? ''
  // 子路由改名
  if (to.fullPath === '/pt') {
    router.push({ replace: true, path: 'dd' })
  }

  // 重置 body 和 html 的样式,防止某些页面设置全局样式后影响其他页面
  // 某些页面(如 zoneMacro, timelineSettings 等)会设置 :global(body) 样式
  // 这会导致离开这些页面后,其他页面无法正常滚动或出现样式残留
  const body = document.body
  const html = document.documentElement

  // 只重置可能影响滚动和显示的关键属性
  if (body.style.height === '100%' || body.style.height === '100vh') {
    body.style.height = ''
  }
  if (body.style.overflow === 'hidden') {
    body.style.overflow = ''
  }
  if (body.style.backgroundColor) {
    body.style.backgroundColor = ''
  }
  if (html.style.height === '100%' || html.style.height === '100vh') {
    html.style.height = ''
  }
  if (html.style.overflow === 'hidden') {
    html.style.overflow = ''
  }
})

export default router
