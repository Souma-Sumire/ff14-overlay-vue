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
    path: 'keigennRecord2',
    comment: '可以添加到 ACT 悬浮窗中用于实时监控。也可以在浏览器中打开，导入日志分析过往记录',
    src: 'keigennRecord2.webp',
  },
  {
    title: '[悬浮窗] 施法监控',
    type: '悬浮窗',
    path: 'castingMonitor?duration=25&energySaving=true&displayAA=false&displayGCDSpace=false&api=cafemaker&syncFocusWS=true&showHeader=true',
    src: 'castingMonitor.webp',
  },
  {
    title: '[悬浮窗] 全副本发宏/标点',
    type: '悬浮窗',
    path: 'zoneMacro',
    src: 'zoneMacro.webp',
    comment: '当开启 OverlayPlugin WSServer 后，可<a href="/#/zoneMacro?OVERLAY_WS=ws://127.0.0.1:10501/ws">在浏览器中使用</a>，操作不再局促',
  },
  {
    title: '[悬浮窗] 治疗/减伤时间轴',
    type: '悬浮窗',
    path: 'timeline',
    src: 'timeline.webp',
  },
  {
    title: '[悬浮窗] OBS 自动录制',
    type: '悬浮窗',
    path: 'obs',
  },
  {
    title: '[悬浮窗] 读条汉化',
    type: '悬浮窗',
    path: 'castingToChinese',
    comment: '',
    src: 'castingToChinese.webp',
  },
  {
    title: '[悬浮窗] 团辅监控',
    type: '悬浮窗',
    path: 'https://souma.diemoe.net/dist/keySkillTimer.html?international=false&dajinengTTS=true&jianshangTTS=true&tuanfuTTS=true',
    comment: '',
    src: 'keySkillTimer.webp',
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
    comment: '狩猎用，显示你当前在几线。',
  },
  {
    title: '[悬浮窗] 职业增强：舞者',
    type: '悬浮窗',
    path: 'jobs/dnc',
    comment: '在技能上显示buff消失倒计时，防止你丢失触发。仅包含6.X技能。7.0舞者过于蠢，我不玩了',
    src: 'dnc.webp',
  },
  {
    title: '[悬浮窗] 一键 VPR 连击 Type1',
    type: '悬浮窗',
    path: 'okVpr',
    comment: '进附体时不会重置热键栏，适合直接设置成单独键位的情况（我自己没用过，不知道好不好用）',
  },
  {
    title: '[悬浮窗] 一键 VPR 连击 Type2',
    type: '悬浮窗',
    path: 'okVpr2',
    comment: '进附体时会重置热键栏，适合设置成平时按的键位的情况（我自己没用过，不知道好不好用）',
  },
  {
    title: '[悬浮窗] 6.X 占星一键发卡',
    type: '悬浮窗',
    path: 'okASTCard',
    comment: '不再维护，即将在国服 7.0 更新后删除',
  },
  {
    title: '[悬浮窗] 一键舞步',
    type: '悬浮窗',
    path: 'okDncDance',
    comment: '不再维护，推荐使用 <a href="https://github.com/AtmoOmen/DalamudPlugins">Daily Routines</a> 的自动跳舞模块',
  },
  {
    title: '国际服汉化补丁',
    type: '网页',
    path: 'https://github.com/Souma-Sumire/FFXIVChnTextPatch-Souma/',
    comment: '前往Github项目了解详情',
  },
  {
    title: '6.X Cactbot JS 分享',
    type: '网页',
    path: 'https://github.com/Souma-Sumire/raidboss-user-js-public',
    comment: '前往Github项目了解详情',
  },
  {
    title: '7.0 车头找怪工具',
    type: '网页',
    path: 'hunt',
  },
  {
    title: '7.0 风脉地图',
    type: '网页',
    path: 'aether',
  },
  {
    title: '6.58 青魔法书图鉴',
    type: '网页',
    path: 'blubook',
  },
  {
    title: 'FFLOGS上传器加速下载',
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
