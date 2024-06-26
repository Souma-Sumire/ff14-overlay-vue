<script setup lang="ts">
import Swal from 'sweetalert2'
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
  [
    'https://gh.h233.eu.org/https://github.com',
    '[美国 Cloudflare CDN] - 该公益加速源由 [@X.I.U/XIU2] 提供',
  ],
  [
    'https://gh.ddlc.top/https://github.com',
    '[美国 Cloudflare CDN] - 该公益加速源由 [@mtr-static-official] 提供',
  ],
  [
    'https://dl.ghpig.top/https://github.com',
    '[美国 Cloudflare CDN] - 该公益加速源由 [feizhuqwq.com] 提供',
  ],
  [
    'https://slink.ltd/https://github.com',
    '[美国 Cloudflare CDN] - 该公益加速源由 [知了小站] 提供',
  ],
  [
    'https://gh.con.sh/https://github.com',
    '[美国 Cloudflare CDN] - 该公益加速源由 [佚名] 提供',
  ],
  [
    'https://cors.isteed.cc/github.com',
    '[美国 Cloudflare CDN] - 该公益加速源由 [@Lufs\'s] 提供',
  ],
  [
    'https://hub.gitmirror.com/https://github.com',
    '[美国 Cloudflare CDN] - 该公益加速源由 [GitMirror] 提供',
  ],
  [
    'https://sciproxy.com/github.com',
    '[美国 Cloudflare CDN] - 该公益加速源由 [sciproxy.com] 提供',
  ],
  [
    'https://ghproxy.cc/https://github.com',
    '[美国 洛杉矶] - 该公益加速源由 [@yionchiii lau] 提供',
  ],
  [
    'https://cf.ghproxy.cc/https://github.com',
    '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchiii lau] 提供',
  ],
  [
    'https://gh.jiasu.in/https://github.com',
    '[美国 Cloudflare CDN] - 该公益加速源由 [@0-RTT] 提供',
  ],
  ['https://dgithub.xyz', '[美国 西雅图] - 该公益加速源由 [dgithub.xyz] 提供'],
  [
    'https://download.nuaa.cf',
    '[美国 洛杉矶] - 该公益加速源由 [FastGit 群组成员] 提供',
  ],
  [
    'https://download.scholar.rr.nu',
    '[美国 纽约] - 该公益加速源由 [FastGit 群组成员] 提供',
  ],
  [
    'https://download.yzuu.cf',
    '[美国 纽约] - 该公益加速源由 [FastGit 群组成员] 提供',
  ],
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
      Swal.close()
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
  Swal.fire({
    icon: 'error',
    title: '错误',
    text: message,
  })
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
