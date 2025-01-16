<script setup lang="ts">
import { ElMessage } from 'element-plus'
import '@sweetalert2/theme-bootstrap-4/bootstrap-4.scss'

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
  ['https://gh.h233.eu.org/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [@X.I.U/XIU2] 提供'],
  ['https://gh.xiu2.us.kg/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [@X.I.U/XIU2] 提供'],
  ['https://gh.ddlc.top/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [@mtr-static-official] 提供'],
  ['https://dl.ghpig.top/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [feizhuqwq.com] 提供'],
  ['https://slink.ltd/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [知了小站] 提供'],
  ['https://gh.con.sh/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [佚名] 提供'],
  ['https://gh-proxy.com/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [佚名] 提供'],
  ['https://cors.isteed.cc/github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [@Lufs\'s] 提供'],
  ['https://hub.gitmirror.com/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [GitMirror] 提供'],
  ['https://sciproxy.com/github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [sciproxy.com] 提供'],
  ['https://ghproxy.cc/https://github.com', '[美国 洛杉矶] - 该公益加速源由 [@yionchiii] 提供'],
  ['https://cf.ghproxy.cc/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchiii] 提供'],
  ['https://www.ghproxy.cc/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchiii] 提供'],
  ['https://ghproxy.cn/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchiii] 提供'],
  ['https://www.ghproxy.cn/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchiii] 提供'],
  ['https://github.site', '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchiii] 提供'],
  ['https://github.store', '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchiii] 提供'],
  ['https://github.tmby.shop/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [blog.tmby.shop] 提供'],
  ['https://github.moeyy.xyz/https://github.com', '[美国 Cloudflare CDN] - 该公益加速源由 [@Moeyy] 提供'],
  ['https://hub.whtrys.space', '[美国 Cloudflare CDN] - 该公益加速源由 [FastGit 群组成员] 提供'],
  ['https://dgithub.xyz', '[美国 西雅图] - 该公益加速源由 [dgithub.xyz] 提供'],
  ['https://gh-proxy.ygxz.in/https://github.com', '[美国 洛杉矶] - 该公益加速源由 [@一个小站 www.ygxz.in] 提供'],
  ['https://download.ixnic.net', '[美国 洛杉矶] - 该公益加速源由 [@黃埔興國] 提供'],
  ['https://ghproxy.net/https://github.com', '[英国伦敦] - 该公益加速源由 [ghproxy]'],
  ['https://ghp.ci/https://github.com', '[日本、韩国、新加坡、美国、德国等]（CDN 不固定） - 该公益加速源由 [ghproxy] 提供'],
  ['https://kkgithub.com', '[中国香港、日本、韩国、新加坡等] - 该公益加速源由 [help.kkgithub.com] 提供'],
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
            <span>{{ (index + 1).toString().padStart(2, "0") }}.{{
              item[1]
            }}节点</span>
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
