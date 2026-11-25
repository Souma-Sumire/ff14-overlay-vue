<script setup lang="ts">
import README from "@/common/markdown/timeline.md";
</script>

<template>
  <article class="syntax-docs">
    <README />
  </article>
</template>

<style scoped lang="scss">
.syntax-docs {
  font-size: 15px;
  line-height: 1.75;
  color: var(--el-text-color-regular);

  :deep(.markdown-body) {
    background: transparent;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  :deep(h1) {
    margin: 0 0 20px;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.02em;
    color: var(--el-text-color-primary);
  }

  :deep(h2) {
    margin: 36px 0 14px;
    padding-bottom: 10px;
    font-size: 20px;
    font-weight: 600;
    line-height: 1.35;
    color: var(--el-text-color-primary);
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  :deep(h3) {
    margin: 24px 0 10px;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--el-text-color-primary);
  }

  :deep(h4) {
    margin: 20px 0 10px;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--el-text-color-primary);
  }

  :deep(p) {
    margin: 0 0 14px;
  }

  :deep(a) {
    color: var(--el-color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(strong) {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  :deep(blockquote) {
    margin: 0 0 24px;
    padding: 10px 14px;
    border-left: 3px solid var(--el-color-primary);
    background-color: var(--el-fill-color-light);
    color: var(--el-text-color-regular);
    font-size: 14px;

    p:last-child {
      margin-bottom: 0;
    }
  }

  :deep(code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.88em;
    padding: 2px 6px;
    border-radius: 3px;
    background-color: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    color: var(--el-text-color-primary);
  }

  :deep(pre) {
    margin: 0 0 18px;
    padding: 14px 16px;
    overflow-x: auto;
    border-radius: 4px;
    background-color: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-lighter);
    line-height: 1.65;

    code {
      padding: 0;
      border: none;
      background: transparent;
      font-size: 13px;
      color: var(--el-text-color-primary);
      white-space: pre;
    }
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 18px;
    font-size: 14px;

    thead {
      background-color: var(--el-fill-color-light);
    }

    th,
    td {
      padding: 10px 14px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--el-border-color-lighter);
    }

    th {
      font-weight: 600;
      color: var(--el-text-color-primary);
      white-space: nowrap;
    }

    td:first-child {
      white-space: nowrap;
    }

    tbody tr:hover {
      background-color: var(--el-fill-color-lighter);
    }
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid var(--el-border-color-lighter);
    margin: 32px 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 14px;
    padding-left: 22px;
  }

  :deep(li + li) {
    margin-top: 4px;
  }
}

@media (max-width: 720px) {
  .syntax-docs {
    font-size: 14px;

    :deep(h1) {
      font-size: 24px;
    }

    :deep(h2) {
      font-size: 18px;
    }

    :deep(table) {
      display: block;
      overflow-x: auto;
    }
  }
}
</style>
