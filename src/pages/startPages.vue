<script setup lang="ts">
type MenuType = '网页' | '悬浮窗' | '悬浮窗/网页'

interface Menu {
  title: string
  type: MenuType
  path: string
  comment?: string
  src?: string
}

function generateUrl(url: string) {
  return new URL(`../assets/screenshots/${url}`, import.meta.url).href
}

const tableData: Menu[] = [
  {
    title: '国际服汉化补丁',
    type: '网页',
    path: 'https://github.com/Souma-Sumire/FFXIVChnTextPatch-Souma/',
    comment: '前往Github查看详情',
  },
  {
    title: 'Cactbot Raidboss 自定义文件',
    type: '网页',
    path: 'https://github.com/Souma-Sumire/raidboss-user-js-public',
    comment: '俗称轮椅TTS。前往Github查看详情',
  },
  {
    title: 'FFLOGS 上传器 加速下载',
    type: '网页',
    path: 'fflogsUploaderDownload',
  },
  {
    title: '[悬浮窗] 关键技能监控2',
    type: '悬浮窗',
    path: 'keySkillTimer?scale=1&opacity=1',
    comment: `（以前叫团辅监控）2025年重构版，支持完全自定义。并保留原版本的所有特性。
URL地址栏参数说明：
scale: 缩放倍率，默认1
opacity: 背景不透明度，默认1`,
    src: 'keySkillTimer.webp',
  },
  {
    title: '[悬浮窗] 雷达',
    type: '悬浮窗',
    path: 'radar',
    src: 'radar.webp',
    comment: '找人用。地图为指北。PVP区域自动禁用。',
  },
  {
    title: '[悬浮窗] 食物警察',
    type: '悬浮窗',
    path: 'food',
    src: 'food.webp',
    comment: `检查食物剩余时间。仅在6人以上小队且至少有1人吃食物才生效。\n平时会简易显示，当鼠标移入后显示食物加成属性。再次移入后显示食物名称。`,
  },
  {
    title: '[网页] ACT 自助测试',
    type: '网页',
    path: 'test',
    comment: `供用户自行检测ACT是否处于正常运行状态。`,
  },
  {
    title: '[悬浮窗] 减伤监控2',
    type: '悬浮窗/网页',
    path: 'keigennRecord2?scale=1&opacity=0.9&targetType=icon&iconType=3&parseAA=1&parseDoT=0&minimize=0&actionCN=1&statusCN=1',
    comment: `可以添加到 ACT 悬浮窗中用于实时监控。也可以在浏览器中打开，导入日志分析过往记录。
URL地址栏参数说明：
scale: 缩放倍率，默认1
opacity: 悬浮窗不透明度，默认0.9
targetType: 目标显示类型，icon职业图标，job则是职业名
iconType: 目标图标类型（可选1~5），默认3
parseAA: 解析自动攻击（仅影响新记录，历史结果不会同步改变），默认开
parseDoT: 解析DoT（仅影响新记录，历史结果不会同步改变），默认关
minimize: 启动时迷你化，默认关
actionCN: action名称中文化，默认开
statusCN: status名称中文化，默认开
    `,
    src: 'keigennRecord2.webp',
  },
  {
    title: '[悬浮窗] 治疗/减伤时间轴',
    type: '悬浮窗',
    path: 'timeline',
    src: 'timeline.webp',
    comment: `自定义的时间轴提醒，支持FFLogs一键抄轴。
<a href="/ff14-overlay-vue/#/timelineSettings?OVERLAY_WS=ws://127.0.0.1:10501/ws">编辑时间轴请在浏览器中打开这里</a>（曾经的小齿轮）`,
  },
  {
    title: '[网页] 全副本发宏/标点',
    type: '网页',
    path: 'zoneMacro?OVERLAY_WS=ws://127.0.0.1:10501/ws',
    src: 'zoneMacro.webp',
    comment:
      '需开启 ACT.OverlayPlugin WSServer\n喊话、标点需<a href="https://github.com/Natsukage/PostNamazu">鲶鱼精邮差</a>',
  },
  {
    title: '[悬浮窗] 技能监控',
    type: '悬浮窗',
    path: 'https://souma.diemoe.net/dist/teamWatch.html',
    comment:
      '可以实现对大部分技能的CD监控。\n现已进入维护阶段，不再新增特性。\n不支持“释放某技能时减少某技能N秒冷却”的特性。\n老用户如果有6.0的缓存，更新7.0之后用会有问题，请在设置页清除一次数据。',
    src: 'teamWatch.webp',
  },
  {
    title: '[悬浮窗] 施法监控（技能展示）',
    type: '悬浮窗',
    path: 'castingMonitor?duration=15&displayAA=false&api=cafemaker&showHeader=true&syncFocusWS=false',
    src: 'castingMonitor.webp',
    comment: `URL地址栏参数说明：
duration: 图片从右划到左的动画持续时间（越短速度越快），默认15
displayAA: 是否显示自动攻击，默认false
api: 技能图标图床来源，国内建议cafemaker，外网则选择xivapi，默认cafemaker
showHeader: 是否显示悬浮窗头部的队员选择器（用于切换监控目标），默认true
syncFocusWS: 是否同步监控目标至通过 WebSocket 连接的其他页面（例如OBS），默认false

若使用时感觉有点卡，技能图是一段一段的挪动的，可以在悬浮窗的[高级]设置，增加[最大帧速率（FPS）]到60。
`,
  },
  {
    title: '[悬浮窗] 读条汉化',
    type: '悬浮窗',
    path: 'castingToChinese',
    comment: '',
    src: 'castingToChinese.webp',
  },
  {
    title: '[悬浮窗] 盾姿提醒',
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
    title: '[悬浮窗] OBS 自动录制 2',
    type: '悬浮窗',
    path: 'obs2',
    comment: '满足条件时自动开启 OBS 录屏',
  },
  {
    title: '[OBS悬浮窗] 战斗时长显示',
    type: '悬浮窗',
    path: 'time?mode=combat&OVERLAY_WS=ws://127.0.0.1:10501/ws',
    comment: `在OBS中添加“浏览器”，以便在录像中显示战斗时间。
URL地址栏参数说明：
mode: 显示模式，默认combat，值为：combat（战斗时间）/logline（日志时间）/both（同时显示）`,
    src: 'time.webp',
  },
  {
    title: '[悬浮窗] 盾值显示',
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
    title: '[悬浮窗] LB 额外增长监控',
    type: '悬浮窗',
    path: 'https://souma.diemoe.net/dist/limitBreakTip.html?LBMax=30000&automatic=220',
    comment: '速刷用，记录LB奖励数值。',
    src: 'limitBreakTip.webp',
  },
  {
    title: '[悬浮窗] 我 TM 现在在几线？',
    type: '悬浮窗',
    path: 'instancedAreaInfo',
    comment: '显示你当前在几线。',
  },
  {
    title: '[网页] 狩猎找A怪地图',
    type: '网页',
    path: 'hunt',
  },
  {
    title: '[网页] 风脉地图',
    type: '网页',
    path: 'aether',
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
          <h1 class="main-title">
            主页导航
          </h1>
          <CommonThemeToggle storage-key="start-pages-theme" />
        </div>
      </el-header>

      <el-main>
        <el-card class="contact-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>联系我</span>
            </div>
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
            <span class="qq-group">QQ群: 231937107</span>
            <span class="warning-text">
              其余账号均为山寨，请勿相信任何信息
            </span>
            <span class="info-text">
              本人无国服最终幻想14账号（已卖），请勿打扰同名的其他玩家
            </span>
          </div>
        </el-card>

        <el-table :data="tableDataWithSrc" stripe border style="width: 100%">
          <el-table-column prop="title" label="名称" width="250">
            <template #default="{ row }">
              <router-link
                v-if="!row.path.startsWith('http')"
                :to="row.path"
                class="table-link"
              >
                {{ row.title }}
              </router-link>
              <el-link v-else :href="row.path" target="_blank" type="primary">
                {{ row.title }}
              </el-link>
            </template>
          </el-table-column>

          <el-table-column label="预览" width="300">
            <template #default="{ row }">
              <el-image
                v-if="row.src"
                :src="row.src"
                fit="cover"
                :preview-src-list="[row.src]"
                preview-teleported
                hide-on-click-modal
                lazy
                loading="lazy"
              />
              <i v-else>无</i>
            </template>
          </el-table-column>

          <el-table-column prop="comment" label="描述" min-width="600">
            <template #default="{ row }">
              <div class="comment-text" v-html="row.comment" />
            </template>
          </el-table-column>
        </el-table>
      </el-main>
    </el-container>
  </div>
</template>

<style scoped lang="scss">
.common-layout {
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  line-height: 1.6;
}

.main-container {
  max-width: 1440px;
  margin: 0 auto;
}

.contact-card {
  margin-bottom: 30px;
  background-color: var(--el-bg-color);

  .card-header {
    font-weight: bold;
  }
}

.contact-info {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.qq-group {
  font-weight: bold;
  color: #67c23a;
}

.warning-text {
  font-weight: bold;
  color: #f56c6c;
}

.info-text {
  color: #909399;
}

.table-link {
  color: var(--el-color-primary);
  text-decoration: none;
  transition: color 0.3s;

  &:hover {
    color: var(--el-color-primary-light-3);
    text-decoration: underline;
  }
}

.preview-image {
  max-width: 360px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}
</style>
