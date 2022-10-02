<script setup lang="ts">
import Swal from "sweetalert2";
import "@sweetalert2/theme-bootstrap-4/bootstrap-4.scss";

interface resJson {
  url: string;
  assets_url: string;
  upload_url: string;
  html_url: string;
  id: number;
  author: any;
  node_id: string;
  tag_name: string;
  target_commitish: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  assets: any[];
  tarball_url: string;
  zipball_url: string;
  body?: any;
}

const data = reactive({ res: {} as resJson });
const accelerationNodeList = [
  { url: "https://gh.gh2233.ml/https://github.com", title: "美国" },
  { url: "https://gh.ddlc.top/https://github.com", title: "美国" },
  { url: "https://gh2.yanqishui.work/https://github.com", title: "美国" },
  { url: "https://gh-proxy-misakano7545.koyeb.app/https://github.com", title: "美国" },
  { url: "https://gh.flyinbug.top/gh/https://github.com", title: "美国" },
  { url: "https://github.91chi.fun/https://github.com", title: "美国" },
  { url: "https://proxy.zyun.vip/https://github.com", title: "美国" },
  { url: "https://git.xfj0.cn/https://github.com", title: "美国" },
  { url: "https://gh.con.sh/https://github.com", title: "美国" },
  { url: "https://ghps.cc/https://github.com", title: "美国" },
  { url: "https://cors.isteed.cc/github.com", title: "美国" },
  { url: "https://cdn.githubjs.cf", title: "美国" },
  { url: "https://download.fastgit.org", title: "日本" },
  { url: "https://gitclone.com", title: "国内" },
  { url: "https://hub.fastgit.xyz", title: "日本" },
  { url: "https://ghproxy.com/https://github.com", title: "韩国" },
  { url: "https://gh.gcdn.mirr.one", title: "俄罗斯" },
];
onMounted(() => {
  fetch("https://api.github.com/repos/RPGLogs/Uploaders-fflogs/releases/latest", { method: "GET" })
    .then((res) => {
      if (res.ok) return res.json();
      throw res.status;
    })
    .then((res: resJson) => {
      Swal.close();
      data.res = res;
    })
    .catch((err) => {
      Swal.fire({
        icon: "error",
        title: "错误",
        text: err,
      });
    });
});
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-main>
        <h1>FFLOGS上传器 加速下载</h1>
        <h2>最新版本：{{ data.res.tag_name || "loading" }}</h2>
        <h2>更新时间：{{ data.res.published_at || "loading" }}</h2>
        <h3 v-if="data.res.tag_name">加速节点：</h3>
        <div flex="~ col wrap gap1" items-start>
          <el-link
            v-if="data.res.tag_name"
            v-for="(item, index) in accelerationNodeList"
            :key="index"
            :href="`${item.url}/RPGLogs/Uploaders-fflogs/releases/download/v${data.res.name}/FF-Logs-Uploader-Setup-${data.res.name}.exe`"
            type="primary"
            m-r-8px
          >
            <span>{{ index + 1 }}.{{ item.title }}节点</span>
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
