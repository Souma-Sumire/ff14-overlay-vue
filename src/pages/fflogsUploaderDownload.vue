<script setup lang="ts">
import { ElMessage } from 'element-plus'

interface resJson {
  url: string
  assets_url: string
  upload_url: string
  html_url: string
  id: number
  author: unknown
  node_id: string
  tag_name: string
  target_commitish: string
  name: string
  draft: boolean
  prerelease: boolean
  created_at: string
  published_at: string
  assets: unknown[]
  tarball_url: string
  zipball_url: string
  body?: unknown
}

const data = reactive({ res: {} as resJson })
const fileName = ref()
const accelerationNodeList = [
  ['https://gh.h233.eu.org/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@X.I.U/XIU2] 提供'],
  ['https://ghproxy.1888866.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [WJQSERVER-STUDIO/ghproxy] 提供'],
  ['https://gh.ddlc.top/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@mtr-static-official] 提供'],
  ['https://slink.ltd/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [知了小站] 提供'],
  ['https://gh-proxy.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh-proxy.com] 提供'],
  ['https://cors.isteed.cc/github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@Lufs\'s] 提供'],
  ['https://hub.gitmirror.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [GitMirror] 提供'],
  ['https://down.sciproxy.com/github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [sciproxy.com] 提供'],
  ['https://ghproxy.cfd/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [@yionchilau] 提供'],
  ['https://github.boki.moe/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [blog.boki.moe] 提供'],
  ['https://github.moeyy.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [moeyy.cn] 提供'],
  ['https://gh-proxy.net/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh-proxy.net] 提供'],
  ['https://github.yongyong.online/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.yongyong.online] 提供'],
  ['https://ghdd.862510.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghdd.862510.xyz] 提供'],
  ['https://hub.whtrys.space', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [FastGit 群组成员] 提供'],
  ['https://gh.jasonzeng.dev/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.jasonzeng.dev] 提供'],
  ['https://gh.monlor.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.monlor.com] 提供'],
  ['https://fastgit.cc/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [fastgit.cc] 提供'],
  ['https://github.tbedu.top/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.tbedu.top] 提供'],
  ['https://github.geekery.cn/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.geekery.cn] 提供'],
  ['https://gh-proxy.linioi.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh-proxy.linioi.com] 提供'],
  ['https://firewall.lxstd.org/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [firewall.lxstd.org] 提供'],
  ['https://mirrors.chenby.cn/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [mirrors.chenby.cn] 提供'],
  ['https://github.ednovas.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.ednovas.xyz] 提供'],
  ['https://ghfile.geekertao.top/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghfile.geekertao.top] 提供'],
  ['https://ghp.keleyaa.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghp.keleyaa.com] 提供'],
  ['https://github.wuzhij.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.wuzhij.com] 提供'],
  ['https://gh.cache.cloudns.org/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.cache.cloudns.org] 提供'],
  ['https://gh.chjina.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.chjina.com] 提供'],
  ['https://ghpxy.hwinzniej.top/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghpxy.hwinzniej.top] 提供'],
  ['https://cdn.crashmc.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [cdn.crashmc.com] 提供'],
  ['https://git.yylx.win/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [git.yylx.win] 提供'],
  ['https://gitproxy.mrhjx.cn/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gitproxy.mrhjx.cn] 提供'],
  ['https://ghproxy.cxkpro.top/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghproxy.cxkpro.top] 提供'],
  ['https://gh.xxooo.cf/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.xxooo.cf] 提供'],
  ['https://ghproxy.xiaopa.cc/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghproxy.xiaopa.cc] 提供'],
  ['https://gh.944446.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.944446.xyz] 提供'],
  ['https://github.limoruirui.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.limoruirui.com] 提供'],
  ['https://api-gh.muran.eu.org/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [api-gh.muran.eu.org] 提供'],
  ['https://gh.idayer.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.idayer.com] 提供'],
  ['https://gh.zwnes.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.zwnes.xyz] 提供'],
  ['https://gh.llkk.cc/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.llkk.cc] 提供'],
  ['https://down.npee.cn/?https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [npee社区] 提供'],
  ['https://dgithub.xyz', '美国', '[美国 西雅图] - 该公益加速源由 [dgithub.xyz] 提供'],
  ['https://gh-proxy.ygxz.in/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [@一个小站 www.ygxz.in] 提供'],
  ['https://gh.nxnow.top/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [gh.nxnow.top] 提供'],
  ['https://gh-proxy.ygxz.in/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [gh-proxy.ygxz.in] 提供'],
  ['https://gh.zwy.one/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [gh.zwy.one] 提供'],
  ['https://ghproxy.monkeyray.net/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [ghproxy.monkeyray.net] 提供'],
  ['https://gh.xx9527.cn/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [gh.xx9527.cn] 提供'],
  ['https://ghproxy.net/https://github.com', '英国', '[英国伦敦] - 该公益加速源由 [ghproxy.net] 提供'],
  ['https://ghfast.top/https://github.com', '其他', '[日本、韩国、新加坡、美国、德国等]（CDN 不固定） - 该公益加速源由 [ghproxy.link] 提供'],
  ['https://wget.la/https://github.com', '其他', '[中国香港、中国台湾、日本、美国等]（CDN 不固定） - 该公益加速源由 [ucdn.me] 提供'],
  ['https://kkgithub.com', '其他', '[中国香港、日本、韩国、新加坡等] - 该公益加速源由 [help.kkgithub.com] 提供'],
]
onMounted(() => {
  fetch(
    'https://api.github.com/repos/RPGLogs/Uploaders-fflogs/releases/latest',
    { method: 'GET' },
  )
    .then((res) => {
      if (res.ok)
        return res.json()
      throw res.status
    })
    .then((res) => {
      fileName.value = res.assets.find((v: { name: string }) =>
        /v.+\.exe$/.test(v.name),
      ).name
      data.res = res
    })
    .catch((err) => {
      if (err.status === 403)
        showErrorPopup('您的网络环境不允许访问GitHub API，请检查网络设置。')
      else
        showErrorPopup(err)
    })
})
function showErrorPopup(message: string) {
  ElMessage.error(message)
}
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-main>
        <h1>FFLOGS上传器 加速下载</h1>
        <h2>最新版本：{{ data.res.tag_name || "loading" }}</h2>
        <h2>更新时间：{{ data.res.published_at || "loading" }}</h2>
        <h3 v-if="data.res.tag_name">
          加速节点：（挨个试试，总有一个能用的）
        </h3>
        <div flex="~ col wrap gap1" items-start>
          <el-link
            v-for="(item, index) in accelerationNodeList"
            v-show="data.res.tag_name"
            :key="index"
            :href="`${item[0]}/RPGLogs/Uploaders-fflogs/releases/download/v${data.res.name}/${fileName}`"
            type="primary"
            m-r-8px
          >
            <span>{{ item[2] }}</span>
          </el-link>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<style scoped>
.el-link .el-icon--right.el-icon {
  vertical-align: text-bottom;
}
</style>
