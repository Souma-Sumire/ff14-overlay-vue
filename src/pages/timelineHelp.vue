<script setup lang="ts">
import { useRouter } from "vue-router";
import { ElButton } from "element-plus";
import { ArrowLeft } from "@element-plus/icons-vue";
import CommonThemeToggle from "@/components/common/ThemeToggle.vue";
import SyntaxDocs from "@/components/timeline/SyntaxDocs.vue";

const router = useRouter();

function goToTimelineSettings() {
  router.push("/timelineSettings");
}
</script>

<template>
  <div class="doc-shell">
    <header class="doc-topbar">
      <el-button :icon="ArrowLeft" size="default" @click="goToTimelineSettings">
        时间轴管理
      </el-button>
      <CommonThemeToggle class="doc-theme-toggle" storage-key="timeline-settings-theme" />
    </header>

    <SyntaxDocs />
  </div>
</template>

<style scoped lang="scss">
:global(html),
:global(body) {
  margin: 0;
  min-height: 100%;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.doc-shell {
  max-width: 920px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 36px 64px;
  box-sizing: border-box;
  font-family:
    "PingFang SC",
    "Microsoft YaHei",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

.doc-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  :deep(.doc-theme-toggle) {
    width: 32px;
    height: 32px;
    border-radius: 4px;
  }
}

@media (max-width: 720px) {
  .doc-shell {
    padding: 16px 18px 48px;
  }
}
</style>
