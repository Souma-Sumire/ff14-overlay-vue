<script setup lang="ts">
type MenuType = '网页/工具' | '悬浮窗'

interface Menu {
  title: string
  type: MenuType
  path: string
  comment?: string
  src?: string
  imageHeihgt?: number
  imageWidth?: number
  isNew?: boolean
  isRecommended?: boolean
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
}

function generateUrl(url: string) {
  return new URL(`../assets/screenshots/${url}`, import.meta.url).href
}

const tableData: Menu[] = [
  {
    title: '[GitHub] 国际服汉化补丁',
    type: '网页/工具',
    path: 'https://github.com/Souma-Sumire/FFXIVChnTextPatch-Souma/',
    comment: '详见仓库 README',
  },
  {
    title: '[JS脚本] Cactbot Raidboss 自定义文件',
    type: '网页/工具',
    path: 'https://github.com/Souma-Sumire/raidboss-user-js-public',
    comment: '俗称的轮椅TTS（实际上这样描述不准确），详见仓库 README',
  },
  {
    title: '[网页] FFLOGS 上传器 加速下载',
    type: '网页/工具',
    path: 'fflogsUploaderDownload',
  },
  {
    title: '[ACT悬浮窗] 减伤监控2',
    type: '悬浮窗',
    path: 'keigennRecord2?scale=1&opacity=0.9&targetType=icon&iconType=2&parseAA=1&parseDoT=0&minimize=0&actionCN=1&statusCN=1',
    comment: `可以添加到 ACT 悬浮窗中用于实时监控。也可以在浏览器中打开，导入日志分析过往记录。
URL地址栏参数说明：
scale: 缩放倍率，默认1
opacity: 悬浮窗不透明度，默认0.9
targetType: 目标显示类型，icon职业图标，job则是职业名
iconType: 目标图标类型（可选1~5），默认2
parseAA: 解析自动攻击（仅影响新记录，历史结果不会同步改变），默认开
parseDoT: 解析DoT（仅影响新记录，历史结果不会同步改变），默认关
minimize: 启动时迷你化，默认关
actionCN: action名称中文化，默认开
statusCN: status名称中文化，默认开`,
    direction: 'row-reverse',
    src: 'keigennRecord2.webp',
    isRecommended: true,
  },
  {
    title: '[ACT悬浮窗] 关键技能监控2',
    type: '悬浮窗',
    path: 'keySkillTimer?scale=1&opacity=1',
    comment: `URL地址栏参数说明：
scale: 缩放倍率，默认1
opacity: 不透明度，默认1

更多自定义功能见悬浮窗设置（取消锁定后显示）。`,
    src: 'keySkillTimer.webp',
  },
  {
    title: '[ACT悬浮窗] 妖宫图鉴',
    type: '悬浮窗',
    path: 'dd',
    src: 'dd.webp',
    comment:
      '欢迎提交<a href="https://github.com/Souma-Sumire/ff14-overlay-vue">PR</a>',
    imageWidth: 350,
    isNew: true,
  },
  {
    title: '[网页] 全副本发宏/标点',
    type: '网页/工具',
    path: 'zoneMacro?OVERLAY_WS=ws://127.0.0.1:10501/ws',
    src: 'zoneMacro.webp',
    comment:
      '需开启 ACT.OverlayPlugin WSServer\n喊话、标点需<a href="https://github.com/Natsukage/PostNamazu">鲶鱼精邮差</a>',
    imageWidth: 350,
  },
  {
    title: '[ACT悬浮窗] 食物警察',
    type: '悬浮窗',
    path: 'food',
    src: 'food.webp',
    comment: `检查食物剩余时间。\n平时会简易显示，当鼠标移入后显示食物加成属性。再次移入后显示食物名称。（仅在小队人数>=6，且至少有50%人吃食物时才显示）`,
    imageHeihgt: 136,
  },
  {
    title: '[ACT悬浮窗] 治疗/减伤时间轴',
    type: '悬浮窗',
    path: 'timeline',
    src: 'timeline.webp',
    comment: `自定义的时间轴提醒，支持FFLogs一键抄轴。
<a href="/ff14-overlay-vue/#/timelineSettings?OVERLAY_WS=ws://127.0.0.1:10501/ws">编辑时间轴请在浏览器中打开这里</a>（曾经的小齿轮）`,
    imageHeihgt: 154,
  },
  {
    title: '[ACT悬浮窗] 施法监控（技能展示）',
    type: '悬浮窗',
    path: 'castingMonitor?duration=15&displayAA=false&api=cafemaker&showHeader=true&syncFocusWS=false',
    src: 'castingMonitor.webp',
    comment: `URL地址栏参数说明：
duration: 图片从右划到左的动画持续时间（越短速度越快），默认15
displayAA: 是否显示自动攻击，默认false
api: 技能图标图床来源，国内建议cafemaker，外网则选择xivapi，默认cafemaker
showHeader: 是否显示悬浮窗头部的队员选择器（用于切换监控目标），默认true
syncFocusWS: 是否同步监控目标至通过 WebSocket 连接的其他页面（例如OBS），默认false

建议在悬浮窗的[高级]设置，增加[最大帧速率（FPS）]，避免卡顿感。
`,
  },
  {
    title: '[ACT悬浮窗] 我 TM 现在在几线？',
    type: '悬浮窗',
    path: 'instancedAreaInfo',
    src: 'instancedAreaInfo.webp',
    comment: '显示你当前在几线 / 新月岛显示唯一编号',
    imageHeihgt: 100,
  },

  {
    title: '[ACT悬浮窗] 雷达',
    type: '悬浮窗',
    path: 'radar',
    src: 'radar.webp',
    comment: '找人用。地图为指北。\nPVP区域自动禁用。',
    imageHeihgt: 180,
  },
  {
    title: '[ACT悬浮窗] OBS 自动录制 2',
    type: '悬浮窗',
    path: 'obs2',
    comment: `满足某些条件时自动控制 OBS 录屏，提供多种条件控制。`,
  },
  {
    title: '[ACT悬浮窗] 技能监控（计划报废/需重构）',
    type: '悬浮窗',
    path: 'https://souma.diemoe.net/dist/teamWatch.html',
    comment:
      '可以实现对大部分技能的CD监控。\n现已进入归档状态，不再修正bug。\n不支持“释放某技能时减少某技能N秒冷却”的特性。\n老用户如果有6.0的缓存，更新7.0之后用会有问题，请在设置页清除一次数据。',
    src: 'teamWatch.webp',
    direction: 'row-reverse',
  },
  {
    title: '[ACT悬浮窗] 盾姿提醒',
    type: '悬浮窗',
    path: 'enmity',
    comment: `仅坦克职业生效
倒计时开始时，如果小队内没有坦克开盾，醒目文字提醒"没人开盾"。
倒计时10秒时，如果小队内有0个坦克开盾，语音提醒"没人开盾"。
倒计时10秒时，如果小队内有2个坦克开盾，语音提醒"双T都开盾了"。
开场20秒后，如果小队内有2个坦克，且另一个坦克开盾了，且你没有开盾，语音提醒"ST开盾"。

URL地址栏参数说明：
stRemind: 控制是否开启开场20秒后的提醒，默认true，即开启。false为关闭。
`,
  },
  {
    title: '[OBS悬浮窗] 战斗时长显示',
    type: '悬浮窗',
    path: 'time?mode=combat&OVERLAY_WS=ws://127.0.0.1:10501/ws',
    comment: `在OBS中添加“浏览器”，以便在录像中显示战斗时间。
URL地址栏参数说明：
mode: 显示模式，默认combat，值为：combat（战斗时间）/logline（日志时间）/both（同时显示）`,
    src: 'time.webp',
    imageWidth: 300,
    direction: 'row-reverse',
  },
  {
    title: '[ACT悬浮窗] 盾值显示',
    type: '悬浮窗',
    path: 'showBarrier?lineHeight=1&fontSize=26&type=1&showSettings=1',
    comment: `速刷用，显示小队成员的现有护盾值。

URL地址栏参数说明：
lineHeight: 行高，默认1
fontSize: 字体尺寸，默认26
type: 显示方式 1=仅显示百分比 2=仅显示数值 3=同时显示，默认1
showSettings: 显示排序设置与人名，默认1，即显示，使用之前需要将其与游戏内的'小队列表'-'职能内排序顺序'保持一致，设置好了再改为0隐藏

盾值百分比为四舍五入，数值也是根据百分比计算的值，故都存在误差，无法更精准。
`,
  },
  {
    title: '[ACT悬浮窗] 读条汉化',
    type: '悬浮窗',
    path: 'castingToChinese',
    comment: '更多自定义功能见悬浮窗设置（取消锁定后显示）。',
    src: 'castingToChinese.webp',
    imageHeihgt: 80,
  },
  {
    title: '[ACT悬浮窗] LB 额外增长监控',
    type: '悬浮窗',
    path: 'https://souma.diemoe.net/dist/limitBreakTip.html?LBMax=30000&automatic=220',
    comment: '速刷用，记录LB奖励数值。',
    src: 'limitBreakTip.webp',
    imageWidth: 100,
  },
  {
    title: '[网页] ACT 自助测试',
    type: '网页/工具',
    path: 'test',
    comment: `供用户自行检测ACT是否处于正常运行状态。`,
  },
  {
    title: '[网页] 狩猎找A怪地图',
    type: '网页/工具',
    path: 'hunt',
  },
  {
    title: '[网页] 风脉地图',
    type: '网页/工具',
    path: 'aether',
  },
  {
    title: '[油猴脚本] MogStation莫古站汉化',
    type: '网页/工具',
    path: 'https://greasyfork.org/zh-CN/scripts/449987-mogstation%E8%8E%AB%E5%8F%A4%E7%AB%99%E6%B1%89%E5%8C%96',
    isNew: true,
    comment: '仅针对日文版莫古站。',
  },
  {
    title: '[油猴脚本] 石之家-修为查询',
    type: '网页/工具',
    path: 'https://greasyfork.org/zh-CN/scripts/482604-%E7%9F%B3%E4%B9%8B%E5%AE%B6-%E4%BF%AE%E4%B8%BA%E6%9F%A5%E8%AF%A2',
    comment: '数据存在72小时缓存。点击水晶图标则跳转FFLOGS页面。',
  },
  {
    title: '[油猴脚本] KOOK净化',
    type: '网页/工具',
    path: 'https://greasyfork.org/zh-CN/scripts/546095-kook%E5%87%80%E5%8C%96',
    comment: '隐藏 KOOK 网页版各种烦人的广告。屏蔽个性化入场音效。',
    isNew: true,
  },
]

const tableDataWithSrc = tableData.map((item) => {
  if (item.src) {
    item.src = generateUrl(item.src)
  }
  return item
})
</script>

<template>
  <div class="common-layout">
    <el-container class="main-container">
      <el-header>
        <div class="header-content">
          <h1 class="main-title">主页导航</h1>
          <CommonThemeToggle storage-key="start-pages-theme" />
        </div>
      </el-header>

      <el-main>
        <el-card class="contact-card" shadow="hover">
          <template #header>
            <div class="card-header">联系我</div>
          </template>
          <div class="contact-info">
            <el-link
              href="https://github.com/Souma-Sumire"
              target="_blank"
              type="primary"
            >
              Github
            </el-link>
            <el-link
              href="https://space.bilibili.com/1443740"
              target="_blank"
              type="primary"
            >
              Bilibili
            </el-link>
            <span class="qq-group">
              <a target="_blank" href="https://qm.qq.com/q/yOQQhcaITK">
                <img
                  border="0"
                  src="//pub.idqqimg.com/wpa/images/group.png"
                  alt="艾欧泽亚不是法外之地"
                  title="艾欧泽亚不是法外之地"
                />
              </a>
            </span>
            <span class="warning-text">其余账号均为山寨，请勿相信任何信息</span>
          </div>
        </el-card>

        <div class="masonry">
          <div
            v-for="item in tableDataWithSrc"
            :key="item.title"
            class="masonry-item"
          >
            <el-card
              shadow="hover"
              class="menu-card"
              :body-style="{ padding: '10px' }"
            >
              <div class="card-header-row">
                <div class="badge-group">
                  <span v-if="item.isNew" class="subtle-badge floating new"
                    >✨ 新</span
                  >
                  <span
                    v-if="item.isRecommended"
                    class="subtle-badge floating recommended"
                    >🔥 推荐</span
                  >
                </div>
                <router-link
                  v-if="!item.path.startsWith('http')"
                  :to="item.path"
                  class="card-title card-link"
                >
                  {{ item.title }}
                </router-link>
                <a
                  v-else
                  :href="item.path"
                  target="_blank"
                  class="card-title card-link"
                >
                  {{ item.title }}
                </a>
              </div>

              <div
                class="card-body"
                :style="{
                  display: 'flex',
                  flexDirection: item.direction ?? 'column-reverse',
                }"
              >
                <div
                  class="card-comment"
                  v-html="item.comment"
                  :style="{
                    marginLeft:
                      item.direction === 'row-reverse' ? '0.5em' : '0px',
                    marginRight: item.direction === 'row' ? '0px' : '0.5em',
                    marginTop:
                      !item.direction || item.direction === 'column-reverse'
                        ? '0.5em'
                        : '0',
                  }"
                />
                <el-image
                  v-if="item.src"
                  :src="item.src"
                  fit="contain"
                  lazy
                  class="card-image"
                  :preview-src-list="[item.src]"
                  preview-teleported
                  hide-on-click-modal
                  :style="{
                    height: item.imageHeihgt ? `${item.imageHeihgt}px` : 'auto',
                    width: item.imageWidth ? `${item.imageWidth}px` : 'auto',
                  }"
                />
              </div>
            </el-card>
          </div>
        </div>
        <el-divider />
        <blockquote
          class="mx-auto max-w-prose text-left italic text-base leading-relaxed pl-4 border-l-4 border-current"
        >
          Als die Nazis die Kommunisten holten,<br />
          起初，他们追杀共产党人，<br />
          habe ich geschwiegen;<br />
          我没有站出来说话，<br />
          ich war ja kein Kommunist.<br />
          因为我不是共产党人。<br /><br />

          Als sie die Sozialdemokraten einsperrten,<br />
          接着，他们监禁社会民主党人，<br />
          habe ich geschwiegen;<br />
          我没有站出来说话，<br />
          ich war ja kein Sozialdemokrat.<br />
          因为我不是社会民主党人。<br /><br />

          Als sie die Gewerkschafter holten,<br />
          后来，他们追杀工会成员，<br />
          habe ich geschwiegen;<br />
          我没有站出来说话，<br />
          ich war ja kein Gewerkschafter.<br />
          因为我不是工会成员。<br /><br />

          Als sie mich holten,<br />
          最后，他们来追杀我，<br />
          gab es keinen mehr, der protestieren konnte.<br />
          却再也没有人站出来抗议了。<br /><br />

          — Martin Niemöller
        </blockquote>
      </el-main>
    </el-container>
  </div>
</template>

<style lang="scss" scoped>
.common-layout {
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.main-container {
  max-width: 1440px;
  margin: 0 auto;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-card {
  position: relative;
  padding: 0 12px;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
  }
}

.card-link {
  display: block;
  text-decoration: none;
  color: inherit;

  &:hover {
    color: var(--el-color-primary);
    text-decoration: underline;
  }
}

.card-title {
  display: block;
  font-size: 16px;
  font-weight: bold;
  margin-top: 8px;
  color: var(--el-color-primary);
}

.card-comment {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
  margin-bottom: 8px;
}

.card-image {
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.contact-card {
  background-color: var(--el-fill-color-light);
  border-left: 4px solid var(--el-color-primary);
}

.card-header {
  font-weight: bold;
}

.contact-info {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
}

.qq-group {
  color: #67c23a;
}

.warning-text {
  color: #909399;
}

.masonry {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-flow: dense;
  gap: 16px;
  margin-top: 16px;
}

.masonry-item {
  break-inside: avoid;
}

.card-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.badge-group {
  position: absolute;
  top: 21px;
  right: 12px;
  display: flex;
  gap: 6px;
  z-index: 1;
}

.subtle-badge {
  user-select: none;
  pointer-events: none;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  border-radius: 999px;
  border: 1px solid;
  background-color: var(--el-bg-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);

  &.new {
    color: var(--el-color-success);
    border-color: var(--el-color-success);
  }

  &.recommended {
    color: var(--el-color-warning);
    border-color: var(--el-color-warning);
  }
}
</style>
