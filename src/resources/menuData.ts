export type MenuType = '网页/工具' | '悬浮窗';

export interface Menu {
  title: string;
  type: MenuType;
  path: string;
  comment?: string;
  src?: string;
  imageHeihgt?: number;
  imageWidth?: number;
  isNew?: boolean;
  isHot?: boolean;
  isRecommended?: boolean;
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
}

export const MENU_ORDER: string[] = [
  'startPages.menu.uisave_editor',
  'startPages.menu.dd_atlas',
  'startPages.menu.keigenn_record2',
  'startPages.menu.healing_timeline',
  'startPages.menu.key_skill_timer',
  'startPages.menu.zone_macro',
  'startPages.menu.obs_auto_record2',
  'startPages.menu.casting_monitor',
  'startPages.menu.food_police',
  'startPages.menu.instanced_area_info',
  'startPages.menu.casting_to_chinese',
  'startPages.menu.aether_map',
  'startPages.menu.combat_time_obs',
  'startPages.menu.radar',
  'startPages.menu.enmity_reminder',
  'startPages.menu.limit_break_tip',
  'startPages.menu.show_barrier',
  'startPages.menu.github_patch',
  'startPages.menu.cactbot_raidboss',
  'startPages.menu.fflogs_uploader_download',
  'startPages.menu.team_watch_legacy',
  'startPages.menu.act_self_test',
  'startPages.menu.hunt_map',
  'startPages.menu.mogstation_patch',
  'startPages.menu.stone_sky_logs',
  'startPages.menu.kook_purify',
];

export const getRawMenuData = (locale: string, t: (key: string, args?: any[]) => string): Menu[] => [
  {
    title: 'startPages.menu.github_patch',
    type: '网页/工具',
    path: 'https://github.com/Souma-Sumire/FFXIVChnTextPatch-Souma/',
    comment: 'startPages.comment.github_patch',
  },
  {
    title: 'startPages.menu.cactbot_raidboss',
    type: '网页/工具',
    path: 'https://github.com/Souma-Sumire/raidboss-user-js-public',
    comment: 'startPages.comment.cactbot_raidboss',
  },
  {
    title: 'startPages.menu.uisave_editor',
    type: '网页/工具',
    path: 'uisaveEditor',
    comment: t('startPages.comment.uisave_editor', [
      `<a href="https://github.com/MisakaCirno/ff14_config_editor/" target="_blank">${t('startPages.comment.uisave_editor_credits')}</a>`,
    ]),
    isNew: true,
  },
  {
    title: 'startPages.menu.fflogs_uploader_download',
    type: '网页/工具',
    path: 'fflogsUploaderDownload',
  },
  {
    title: 'startPages.menu.keigenn_record2',
    type: '悬浮窗',
    path: `keigennRecord2?scale=1&opacity=0.9&targetType=icon&iconType=2&parseAA=1&parseDoT=0&minimize=0&actionCN=1&statusCN=1&lang=${locale}`,
    comment: 'startPages.comment.keigenn_record2_params',
    direction: 'row-reverse',
    src: 'keigennRecord2.webp',
    isRecommended: true,
  },
  {
    title: 'startPages.menu.key_skill_timer',
    type: '悬浮窗',
    path: `keySkillTimer?scale=1&opacity=1&lang=${locale}`,
    comment: 'startPages.comment.key_skill_timer_params',
    src: 'keySkillTimer.webp',
    isHot: true,
  },
  {
    title: 'startPages.menu.dd_atlas',
    type: '悬浮窗',
    path: `dd?scale=1&lang=${locale}`,
    src: 'dd.webp',
    comment: 'startPages.comment.dd_atlas',
    imageWidth: 350,
    isHot: true,
  },
  {
    title: 'startPages.menu.zone_macro',
    type: '网页/工具',
    path: `zoneMacro?OVERLAY_WS=ws://127.0.0.1:10501/ws&lang=${locale}`,
    src: 'zoneMacro.webp',
    comment: 'startPages.comment.zone_macro',
    imageWidth: 350,
  },
  {
    title: 'startPages.menu.food_police',
    type: '悬浮窗',
    path: `food?lang=${locale}`,
    src: 'food.webp',
    comment: 'startPages.comment.food_police',
    imageHeihgt: 136,
  },
  {
    title: 'startPages.menu.healing_timeline',
    type: '悬浮窗',
    path: 'timeline',
    src: 'timeline.webp',
    comment: 'startPages.comment.healing_timeline',
    imageHeihgt: 154,
    isHot: true,
  },
  {
    title: 'startPages.menu.casting_monitor',
    type: '悬浮窗',
    path: `castingMonitor?duration=15&displayAA=false&api=cafemaker&showHeader=true&syncFocusWS=false&lang=${locale}`,
    src: 'castingMonitor.webp',
    comment: 'startPages.comment.casting_monitor_params',
  },
  {
    title: 'startPages.menu.instanced_area_info',
    type: '悬浮窗',
    path: 'instancedAreaInfo',
    src: 'instancedAreaInfo.webp',
    comment: 'startPages.comment.instanced_area_info',
    imageHeihgt: 100,
  },
  {
    title: 'startPages.menu.casting_to_chinese',
    type: '悬浮窗',
    path: 'castingToChinese',
    comment: 'startPages.comment.casting_to_chinese',
    src: 'castingToChinese.webp',
    imageHeihgt: 80,
  },
  {
    title: 'startPages.menu.aether_map',
    type: '网页/工具',
    path: 'aether',
  },
  {
    title: 'startPages.menu.combat_time_obs',
    type: '悬浮窗',
    path: 'time?mode=combat&OVERLAY_WS=ws://127.0.0.1:10501/ws',
    comment: 'startPages.comment.combat_time_obs_params',
    src: 'time.webp',
    imageWidth: 300,
    direction: 'row-reverse',
  },
  {
    title: 'startPages.menu.radar',
    type: '悬浮窗',
    path: 'radar',
    src: 'radar.webp',
    comment: 'startPages.comment.radar',
    imageHeihgt: 180,
  },
  {
    title: 'startPages.menu.enmity_reminder',
    type: '悬浮窗',
    path: 'enmity',
    comment: 'startPages.comment.enmity_reminder',
  },
  {
    title: 'startPages.menu.limit_break_tip',
    type: '悬浮窗',
    path: `lbTick?lang=${locale}`,
    comment: 'startPages.comment.limit_break_tip',
    src: 'limitBreakTip.webp',
    imageWidth: 100,
  },
  {
    title: 'startPages.menu.show_barrier',
    type: '悬浮窗',
    path: 'showBarrier?lineHeight=1&fontSize=26&type=1&showSettings=1',
    comment: 'startPages.comment.show_barrier_params',
  },
  {
    title: 'startPages.menu.team_watch_legacy',
    type: '悬浮窗',
    path: 'https://souma.diemoe.net/dist/teamWatch.html',
    comment: 'startPages.comment.team_watch_legacy',
    src: 'teamWatch.webp',
    direction: 'row-reverse',
  },
  {
    title: 'startPages.menu.act_self_test',
    type: '网页/工具',
    path: 'test',
    comment: 'startPages.comment.act_self_test',
  },
  {
    title: 'startPages.menu.hunt_map',
    type: '网页/工具',
    path: 'hunt',
  },
  {
    title: 'startPages.menu.mogstation_patch',
    type: '网页/工具',
    path: 'https://greasyfork.org/zh-CN/scripts/449987-mogstation%E8%8E%AB%E5%8F%A4%E7%AB%99%E6%B1%89%E5%8C%96',
    comment: 'startPages.comment.mogstation_patch',
  },
  {
    title: 'startPages.menu.stone_sky_logs',
    type: '网页/工具',
    path: 'https://greasyfork.org/zh-CN/scripts/482604-%E7%9F%B3%E4%B9%8B%E5%AE%B6-%E4%BF%AE%E4%B8%BA%E6%9F%A5%E8%AF%A2',
    comment: 'startPages.comment.stone_sky_logs',
  },
  {
    title: 'startPages.menu.kook_purify',
    type: '网页/工具',
    path: 'https://greasyfork.org/zh-CN/scripts/546095-kook%E5%87%80%E5%8C%96',
    comment: 'startPages.comment.kook_purify',
  },
];
