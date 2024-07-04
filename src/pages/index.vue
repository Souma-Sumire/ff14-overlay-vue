<script setup lang="ts">
import router from '@/router'

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
    title: '7.0狩猎找怪工具',
    type: '网页',
    path: 'hunt',
  },
  {
    title: '7.0风脉地图',
    type: '网页',
    path: 'aether',
  },
  {
    title: 'Cactbot Raidboss User JS 分享',
    type: '网页',
    path: 'https://github.com/Souma-Sumire/raidboss-user-js-public',
    comment: '前往Github项目了解详情',
  },
  {
    title: '国际服汉化补丁',
    type: '网页',
    path: 'https://github.com/Souma-Sumire/FFXIVChnTextPatch-Souma/',
    comment: '前往Github项目了解详情',
  },
  {
    title: '青魔法书图鉴',
    type: '网页',
    path: 'blubook',
  },
  {
    title: 'FFLOGS上传器加速下载',
    type: '网页',
    path: 'fflogsUploaderDownload',
  },
  {
    title: '[悬浮窗] 减伤监控2',
    type: '悬浮窗/网页',
    path: 'keigennRecord2',
    comment: '详细说明：\nhttps://nga.178.com/read.php?tid=28047277',
    src: 'keigennRecord2.webp',
  },
  {
    title: '[悬浮窗] 职业增强：舞者',
    type: '悬浮窗',
    path: 'jobs/dnc',
    comment: '在技能上显示buff消失倒计时',
    src: 'dnc.webp',
  },
  {
    title: '[悬浮窗] 一键舞步',
    type: '悬浮窗',
    path: 'okDncDance',
  },
  {
    title: '[悬浮窗] 一键 VPR 连击',
    type: '悬浮窗',
    path: 'okVpr',
  },
  {
    title: '[悬浮窗] 占星一键发卡',
    type: '悬浮窗',
    path: 'okASTCard',
  },
  {
    title: '[悬浮窗] 施法监控',
    type: '悬浮窗',
    path: 'castingMonitor?duration=25&energySaving=true&displayAA=false&displayGCDSpace=false&api=cafemaker&syncFocusWS=true&showHeader=true',
    comment: '详细说明：\nhttps://nga.178.com/read.php?tid=33989985',
    src: 'castingMonitor.webp',
  },
  {
    title: '[悬浮窗] 全副本发宏/标点',
    type: '悬浮窗',
    path: 'zoneMacro',
    src: 'zoneMacro.webp',
  },
  {
    title: '[悬浮窗] 自定义技能时间轴',
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
    title: '[悬浮窗] 团辅监控（旧）',
    type: '悬浮窗',
    path: 'https://souma.diemoe.net/dist/keySkillTimer.html?international=false&dajinengTTS=true&jianshangTTS=true&tuanfuTTS=true',
    comment: '',
    src: 'keySkillTimer.webp',
  },
  {
    title: '[悬浮窗] 技能监控（旧）',
    type: '悬浮窗',
    path: 'https://souma.diemoe.net/dist/teamWatch.html?scale=1&reverse=false&rightAlign=false&postNamazu=false',
    comment: '建议使用dalamud同功能插件。',
    src: 'teamWatch.webp',
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
    title: '[悬浮窗] 团辅覆盖记录',
    type: '悬浮窗/网页',
    path: 'raidbuffRecord',
    comment: '真有用吗？',
    src: 'raidbuffRecord.webp',
  },
  {
    title: '石之家 - 修为查询',
    type: '网页',
    path: 'https://greasyfork.org/zh-CN/scripts/482604',
    src: 'risingstones.webp',
    comment: '前往GreasyFork脚本页面了解详情',
  },
]

function handleClick(e: Menu) {
  if (e.path.startsWith('http'))
    window.open(e.path, '_blank')
  else
    router.push(e.path)
}
</script>

<template>
  <div class="common-layout" bt-white>
    <el-container>
      <el-header><h1>主页导航</h1></el-header>
      <el-main>
        <vxe-table
          :data="tableData"

          stripe border
          :row-config="{ height: 100 }"
        >
          <vxe-column width="250" title="名称">
            <template #default="{ row }">
              <a style="cursor: pointer" @click="() => handleClick(row)">{{
                row.title
              }}</a>
            </template>
          </vxe-column>
          <vxe-column width="420" title="预览">
            <template #default="{ row: { src } }">
              <img v-if="src" v-lazy="generateUrl(src).pathname">
              <i v-if="!src">无</i>
            </template>
          </vxe-column>
          <vxe-column field="comment" title="描述" />
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
