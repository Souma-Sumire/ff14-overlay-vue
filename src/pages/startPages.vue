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
  return new URL(`../assets/screenshots/${url}`, import.meta.url)
}
const tableData: Menu[] = [
  {
    title: '[悬浮窗] 减伤监控2',
    type: '悬浮窗/网页',
    path: 'keigennRecord2?scale=1&showHeader=true&showIcon=true&showName=false&abbrId=true&anonymous=true&replaceWithYou=false&parseAA=true&parseDoT=false&minimize=false&actionCN=true&statusCN=true',
    comment: `可以添加到 ACT 悬浮窗中用于实时监控。也可以在浏览器中打开，导入日志分析过往记录。

URL地址栏参数说明：
scale: 缩放倍率，默认1
showHeader: 显示表头，默认true
showIcon: 显示目标图标，默认true
showName: 显示目标ID，默认false
abbrId: 目标ID缩写（只有在showName=true时才有效），默认true
anonymous: 目标ID改为职业名（只有在showName=true时才有效），默认true
replaceWithYou: 目标是玩家本人替换为YOU（只有在showName=true时才有效），默认false
parseAA: 解析自动攻击（仅影响新记录，历史结果不会同步改变），默认true
parseDoT: 解析DoT（仅影响新记录，历史结果不会同步改变），默认false
minimize: 启动时迷你化，默认false
actionCN: action显示中文化，默认true
statusCN: status显示中文化，默认true
    `,
    src: 'keigennRecord2.webp',
  },
  {
    title: '全副本发宏/标点',
    type: '悬浮窗',
    path: 'zoneMacro?OVERLAY_WS=ws://127.0.0.1:10501/ws',
    src: 'zoneMacro.webp',
    comment: '需开启 ACT.OverlayPlugin WSServer\n 喊话、标点需<a href="https://github.com/Natsukage/PostNamazu">鲶鱼精邮差</a>',
  },
  {
    title: '狩猎车头找怪工具',
    type: '网页',
    path: 'hunt',
  },
  {
    title: '[悬浮窗] 我 TM 现在在几线？',
    type: '悬浮窗',
    path: 'instancedAreaInfo',
    comment: '一个简单的小工具，显示你当前在几线。',
  },
  {
    title: '[悬浮窗] OBS 自动录制 2（新）',
    type: '悬浮窗',
    path: 'obs2',
    comment: '满足条件时自动开启 OBS 录屏',
  },
  {
    title: '[悬浮窗] OBS 自动录制（不再维护）',
    type: '悬浮窗',
    path: 'obs',
    comment: '满足条件时自动开启 OBS 录屏',
  },
  {
    title: '[悬浮窗] 团辅监控',
    type: '悬浮窗',
    path: 'https://souma.diemoe.net/dist/keySkillTimer.html?international=false&dajinengTTS=true&jianshangTTS=true&tuanfuTTS=true',
    comment: `URL地址栏参数说明：
international: 是否采用国际服技改数据，默认false
dajinengTTS: 是否开启大技能TTS（坦克无敌不包含在内，因为 Cactbot 已有对应功能），默认true
jianshangTTS: 是否开启减伤TTS，默认true
tuanfuTTS: 是否开启团辅TTS，默认true
`,
    src: 'keySkillTimer.webp',
  },
  {
    title: '[悬浮窗] 治疗/减伤时间轴',
    type: '悬浮窗',
    path: 'timeline',
    src: 'timeline.webp',
    comment: '适用于副职快速抄轴、打小抄等。可以实现简单的阶段同步，但面对血量轴/双轴等复杂情况时表现不佳。',
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
    title: '[悬浮窗] DNC 触发倒计时显示',
    type: '悬浮窗',
    path: 'jobs/dnc',
    comment: '在技能上显示buff消失倒计时，防止你丢失触发。仅包含6.X技能。7.0未适配，因为改的太蠢，我不玩了',
    src: 'dnc.webp',
  },
  {
    title: '[悬浮窗] 一键 VPR 连击',
    type: '悬浮窗',
    path: 'okVpr',
    comment: '<a href="#/okVpr">版本A</a>，进附体时不会重置热键栏，适合直接设置成单独键位（我没用过，不知道好不好用）\n<a href="#/okVpr2">版本B</a>，进附体时会重置热键栏，适合设置成平时按的键位（我没用过，不知道好不好用）',
  },
  {
    title: '[悬浮窗] 技能监控（不再维护）',
    type: '悬浮窗',
    path: 'obs',
    comment: '仅存档，不再维护。替代品：<a href="https://github.com/0ceal0t/JobBars">JobBars</a>',
  },
  {
    title: '国际服汉化补丁',
    type: '网页',
    path: 'https://github.com/Souma-Sumire/FFXIVChnTextPatch-Souma/',
    comment: '前往Github项目了解详情',
  },
  {
    title: '个人修改版 Cactbot Raidboss',
    type: '网页',
    path: 'https://github.com/Souma-Sumire/raidboss-user-js-public',
    comment: '前往Github项目了解详情',
  },
  {
    title: '简易风脉地图',
    type: '网页',
    path: 'aether',
  },
  {
    title: 'FFLOGS 上传器 加速下载',
    type: '网页',
    path: 'fflogsUploaderDownload',
  },
]
</script>

<template>
  <div class="common-layout" bt-white>
    <el-container>
      <el-form>
        <el-form-item label="联系我：" label-width="auto" style="margin-bottom: 0; padding-left: 1rem;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <a href="https://github.com/Souma-Sumire" target="_blank" style="text-decoration: none;">
              Github
            </a>
            <a href="https://space.bilibili.com/1443740" target="_blank" style="text-decoration: none;">
              Bilibili
            </a>
            <span style="font-weight: bold; color: #f00;">
              其余账号均为山寨，请勿相信任何信息
            </span>
          </div>
        </el-form-item>
      </el-form>

      <el-header><h1>主页导航</h1></el-header>
      <el-main>
        <vxe-table
          :data="tableData"

          stripe border
          :row-config="{ height: 100 }"
        >
          <vxe-column width="250" title="名称">
            <template #default="{ row }">
              <router-link v-if="!(row.path.startsWith('http'))" :to="row.path">
                {{ row.title }}
              </router-link>
              <a v-else :href="row.path" target="_blank">{{ row.title }} </a>
            </template>
          </vxe-column>
          <vxe-column width="420" title="预览">
            <template #default="{ row: { src } }">
              <img v-if="src" v-lazy="generateUrl(src).pathname">
              <i v-if="!src">无</i>
            </template>
          </vxe-column>
          <vxe-column field="comment" title="描述">
            <template #default="{ row }">
              <span v-html="row.comment" />
            </template>
          </vxe-column>
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
img {
  object-fit: cover;
  max-width: 400px;
}
</style>
