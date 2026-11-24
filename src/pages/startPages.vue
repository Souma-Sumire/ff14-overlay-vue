<script setup lang="ts">
import type { Menu, MenuCategory } from "@/resources/menuData";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CopyDocument,
  Search,
  TopRight,
} from "@element-plus/icons-vue";
import { ElButton, ElIcon, ElImage, ElInput, ElMessage } from "element-plus";
import { computed, reactive, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import CommonLanguageSwitcher from "@/components/common/LanguageSwitcher.vue";
import CommonThemeToggle from "@/components/common/ThemeToggle.vue";
import { useLang } from "@/composables/useLang";
import { getRawMenuData, MENU_ORDER } from "@/resources/menuData";

const { t, locale } = useLang();
const router = useRouter();

type CategoryFilter = "all" | MenuCategory;

interface ParsedParamLine {
  key?: string;
  desc: string;
}

interface DisplayMenuItem extends Menu {
  id: string;
  tag: string;
  displayName: string;
  isExternal: boolean;
  resolvedUrl: string;
  summaryHtml: string;
  paramsTitle: string;
  paramLines: ParsedParamLine[];
  paramsExtraHtml: string;
  searchIndex: string;
}

const activeCategory = ref<CategoryFilter>("all");
const searchQuery = ref("");
const expandedParams = reactive<Record<string, boolean>>({});
const copiedId = ref<string | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

const PARAM_HEADER_RE =
  /(?:^|\n)(URL(?:地址[栏欄列]参[数數]说[明]?|地址[栏欄列]參數說明| Parameter Descriptions| parameters|パラメータ説明|パラメータ)\s*[:：])\s*\n?/i;

function generateUrl(url: string) {
  return new URL(`../assets/screenshots/${url}`, import.meta.url).href;
}

function parseTitle(rawTitle: string): { tag: string; name: string } {
  const match = rawTitle.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (match) {
    return { tag: match[1]!.trim(), name: match[2]!.trim() };
  }
  return { tag: "", name: rawTitle };
}

function parseComment(rawHtml: string): {
  summaryHtml: string;
  paramsTitle: string;
  paramLines: ParsedParamLine[];
  paramsExtraHtml: string;
} {
  if (!rawHtml) {
    return { summaryHtml: "", paramsTitle: "", paramLines: [], paramsExtraHtml: "" };
  }

  const match = PARAM_HEADER_RE.exec(rawHtml);
  if (!match) {
    return {
      summaryHtml: rawHtml.trim(),
      paramsTitle: "",
      paramLines: [],
      paramsExtraHtml: "",
    };
  }

  const before = rawHtml.slice(0, match.index).trim();
  const paramsTitle = match[1]!.replace(/[:：]\s*$/, "").trim();
  const after = rawHtml.slice(match.index + match[0].length).trim();

  const blocks = after.split(/\n{2,}/);
  const paramBlock = blocks[0] ?? "";
  const extraBlock = blocks.slice(1).join("\n\n").trim();

  const paramLines: ParsedParamLine[] = paramBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const kv = line.match(/^([a-zA-Z0-9_-]+)\s*[:：]\s*(.+)$/);
      if (kv) {
        return { key: kv[1], desc: kv[2]! };
      }
      return { desc: line };
    });

  return {
    summaryHtml: before,
    paramsTitle,
    paramLines,
    paramsExtraHtml: extraBlock,
  };
}

function resolveFullUrl(path: string): string {
  if (path.startsWith("http")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const resolved = router.resolve(normalized);
  if (typeof window === "undefined") {
    return resolved.href;
  }
  return new URL(resolved.href, window.location.href).href;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const allItems = computed<DisplayMenuItem[]>(() => {
  const rawData: Menu[] = getRawMenuData(locale.value, t);

  return [...rawData]
    .sort((a, b) => {
      const indexA = MENU_ORDER.indexOf(a.title);
      const indexB = MENU_ORDER.indexOf(b.title);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    })
    .map((item) => {
      const rawTitle = t(item.title);
      const { tag, name } = parseTitle(rawTitle);
      const rawComment = item.comment
        ? item.commentArgs
          ? t(item.comment, item.commentArgs)
          : t(item.comment)
        : "";
      const parsedComment = parseComment(rawComment);
      const isExternal = item.path.startsWith("http");

      return {
        ...item,
        id: item.title,
        src: item.src ? generateUrl(item.src) : undefined,
        tag,
        displayName: name,
        isExternal,
        resolvedUrl: resolveFullUrl(item.path),
        summaryHtml: parsedComment.summaryHtml,
        paramsTitle: parsedComment.paramsTitle,
        paramLines: parsedComment.paramLines,
        paramsExtraHtml: parsedComment.paramsExtraHtml,
        searchIndex: `${rawTitle} ${stripHtml(rawComment)} ${item.path}`.toLowerCase(),
      };
    });
});

const categoryTabs = computed(() => {
  const counts: Record<MenuCategory, number> = {
    combat: 0,
    raidTool: 0,
    exploration: 0,
    script: 0,
  };
  for (const item of allItems.value) {
    counts[item.category]++;
  }
  return [
    { key: "all" as CategoryFilter, label: t("startPages.tabs.all"), count: allItems.value.length },
    { key: "combat" as CategoryFilter, label: t("startPages.tabs.combat"), count: counts.combat },
    {
      key: "raidTool" as CategoryFilter,
      label: t("startPages.tabs.raid_tool"),
      count: counts.raidTool,
    },
    {
      key: "exploration" as CategoryFilter,
      label: t("startPages.tabs.exploration"),
      count: counts.exploration,
    },
    { key: "script" as CategoryFilter, label: t("startPages.tabs.script"), count: counts.script },
  ];
});

const filteredItems = computed(() => {
  const kw = searchQuery.value.trim().toLowerCase();
  return allItems.value.filter((item) => {
    if (activeCategory.value !== "all" && item.category !== activeCategory.value) {
      return false;
    }
    if (kw && !item.searchIndex.includes(kw)) {
      return false;
    }
    return true;
  });
});

function toggleParams(id: string) {
  expandedParams[id] = !expandedParams[id];
}

function resetFilters() {
  activeCategory.value = "all";
  searchQuery.value = "";
}

async function copyItemUrl(item: DisplayMenuItem) {
  try {
    await navigator.clipboard.writeText(item.resolvedUrl);
    copiedId.value = item.id;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copiedId.value = null;
    }, 2000);
  } catch {
    ElMessage.error(item.resolvedUrl);
  }
}

const contactLinks = computed(() => [
  { label: "GitHub", href: "https://github.com/Souma-Sumire" },
  { label: "Bilibili", href: "https://space.bilibili.com/1443740" },
  {
    label: t("startPages.contact.qq_group"),
    href: "https://qm.qq.com/q/yOQQhcaITK",
    title: t("startPages.contact.qq_group_alt"),
  },
  { label: "Discord", href: "https://discord.gg/jGNedugCqG" },
]);
</script>

<template>
  <div class="start-page">
    <header class="top-header">
      <div class="header-inner">
        <div class="brand">
          <h1 class="brand-title">{{ t("startPages.header.title") }}</h1>
          <span class="brand-sub">Project Souma</span>
        </div>
        <div class="header-actions">
          <CommonThemeToggle class="header-theme-toggle" storage-key="start-pages-theme" />
          <CommonLanguageSwitcher />
        </div>
      </div>
    </header>

    <main class="page-main">
      <section class="contact-strip" aria-label="Contact">
        <div class="contact-links">
          <span class="contact-label">{{ t("startPages.contact.header") }}</span>
          <a
            v-for="link in contactLinks"
            :key="link.label"
            :href="link.href"
            :title="link.title"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
          >
            {{ link.label }}
            <el-icon class="ext-icon"><TopRight /></el-icon>
          </a>
        </div>
        <p class="contact-warning">{{ t("startPages.contact.warning") }}</p>
      </section>

      <section class="filter-bar">
        <nav class="category-tabs" role="tablist">
          <button
            v-for="tab in categoryTabs"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="activeCategory === tab.key"
            class="tab-btn"
            :class="{ active: activeCategory === tab.key }"
            @click="activeCategory = tab.key"
          >
            <span>{{ tab.label }}</span>
            <span class="tab-count">{{ tab.count }}</span>
          </button>
        </nav>

        <div class="search-box">
          <el-input
            v-model="searchQuery"
            :placeholder="t('startPages.search.placeholder')"
            :prefix-icon="Search"
            clearable
            size="default"
          />
        </div>
      </section>

      <section v-if="filteredItems.length > 0" class="tool-list">
        <article v-for="item in filteredItems" :key="item.id" class="tool-row">
          <div class="tool-content">
            <div class="tool-title-row">
              <router-link v-if="!item.isExternal" :to="item.path" class="tool-title">
                {{ item.displayName }}
              </router-link>
              <a
                v-else
                :href="item.path"
                target="_blank"
                rel="noopener noreferrer"
                class="tool-title"
              >
                {{ item.displayName }}
              </a>

              <span v-if="item.tag" class="type-tag">{{ item.tag }}</span>

              <span v-if="item.isNew" class="status-tag status-new">
                {{ t("startPages.badge.new") }}
              </span>
              <span v-if="item.isHot" class="status-tag status-hot">
                {{ t("startPages.badge.hot") }}
              </span>
              <span v-if="item.isRecommended" class="status-tag status-recommended">
                {{ t("startPages.badge.recommended") }}
              </span>
            </div>

            <div v-if="item.summaryHtml" class="tool-summary" v-html="item.summaryHtml" />

            <div v-if="item.paramLines.length > 0" class="params-section">
              <button
                type="button"
                class="params-toggle"
                :aria-expanded="!!expandedParams[item.id]"
                @click="toggleParams(item.id)"
              >
                <el-icon class="toggle-arrow" :class="{ open: expandedParams[item.id] }">
                  <ArrowDown v-if="expandedParams[item.id]" />
                  <ArrowRight v-else />
                </el-icon>
                <span>{{ t("startPages.action.params") }}</span>
                <span class="params-count">{{ item.paramLines.length }}</span>
              </button>

              <div v-if="expandedParams[item.id]" class="params-panel">
                <dl class="params-list">
                  <div v-for="(param, idx) in item.paramLines" :key="idx" class="param-item">
                    <dt v-if="param.key" class="param-key">{{ param.key }}</dt>
                    <dd class="param-desc">{{ param.desc }}</dd>
                  </div>
                </dl>
                <div
                  v-if="item.paramsExtraHtml"
                  class="params-extra"
                  v-html="item.paramsExtraHtml"
                />
              </div>
            </div>
          </div>

          <div class="tool-aside">
            <div v-if="item.src" class="thumb-frame">
              <el-image
                :src="item.src"
                fit="contain"
                lazy
                class="thumb-image"
                :preview-src-list="[item.src]"
                preview-teleported
                hide-on-click-modal
              />
            </div>

            <div class="tool-actions">
              <router-link v-if="!item.isExternal" :to="item.path" class="action-link-btn primary">
                {{ t("startPages.action.open") }}
              </router-link>
              <a
                v-else
                :href="item.path"
                target="_blank"
                rel="noopener noreferrer"
                class="action-link-btn primary"
              >
                <span>{{ t("startPages.action.visit") }}</span>
                <el-icon class="btn-icon"><TopRight /></el-icon>
              </a>

              <el-button
                v-if="!item.isExternal"
                size="small"
                class="copy-btn"
                :class="{ copied: copiedId === item.id }"
                @click="copyItemUrl(item)"
              >
                <el-icon class="btn-icon">
                  <Check v-if="copiedId === item.id" />
                  <CopyDocument v-else />
                </el-icon>
                <span>
                  {{
                    copiedId === item.id
                      ? t("startPages.action.copied")
                      : t("startPages.action.copy_url")
                  }}
                </span>
              </el-button>
            </div>
          </div>
        </article>
      </section>

      <section v-else class="empty-state">
        <p class="empty-text">{{ t("startPages.search.empty") }}</p>
        <el-button @click="resetFilters">{{ t("startPages.search.reset") }}</el-button>
      </section>
    </main>
  </div>
</template>

<style lang="scss" scoped>
:global(html[data-route="startPages"]),
:global(html[data-route="startPages"] body) {
  margin: 0;
  height: auto;
  min-height: 100%;
  overflow-y: auto;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.start-page {
  min-height: 100vh;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font-family:
    "PingFang SC",
    "Microsoft YaHei",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.top-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.header-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 32px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}

.brand-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.brand-sub {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  letter-spacing: 0.04em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;

  :deep(.header-theme-toggle) {
    width: 28px;
    height: 28px;
    border-radius: 4px;
  }
}

.page-main {
  max-width: 1120px;
  margin: 0 auto;
  padding: 20px 32px 64px;
  box-sizing: border-box;
}

.contact-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  padding: 12px 0 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.contact-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
}

.contact-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.contact-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  text-decoration: none;
  transition: color 0.15s ease;

  .ext-icon {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    transition: color 0.15s ease;
  }

  &:hover {
    color: var(--el-color-primary);

    .ext-icon {
      color: var(--el-color-primary);
    }
  }
}

.contact-warning {
  margin: 0;
  padding-left: 10px;
  border-left: 2px solid var(--el-color-warning);
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.filter-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding-top: 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 24px;
}

.tab-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 12px;
  border: none;
  background: transparent;
  color: var(--el-text-color-secondary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s ease;

  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background-color: transparent;
    transition: background-color 0.15s ease;
  }

  &:hover {
    color: var(--el-text-color-primary);
  }

  &.active {
    color: var(--el-text-color-primary);
    font-weight: 600;

    &::after {
      background-color: var(--el-color-primary);
    }

    .tab-count {
      color: var(--el-color-primary);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 4px;
    border-radius: 2px;
  }
}

.tab-count {
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-placeholder);
}

.search-box {
  width: 280px;
  padding-bottom: 8px;
  flex-shrink: 0;
}

.tool-list {
  display: flex;
  flex-direction: column;
}

.tool-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
  padding: 20px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.15s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: var(--el-fill-color-lighter);
  }
}

.tool-content {
  flex: 1;
  min-width: 0;
  max-width: 68ch;
}

.tool-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}

.tool-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-decoration: none;
  line-height: 1.4;
  transition: color 0.15s ease;

  &:hover {
    color: var(--el-color-primary);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.type-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  white-space: nowrap;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  border-radius: 4px;
  border: 1px solid transparent;
  white-space: nowrap;

  &.status-new {
    color: var(--el-color-success);
    background-color: var(--el-color-success-light-9);
    border-color: var(--el-color-success-light-7);
  }

  &.status-hot {
    color: var(--el-color-danger);
    background-color: var(--el-color-danger-light-9);
    border-color: var(--el-color-danger-light-7);
  }

  &.status-recommended {
    color: var(--el-color-warning-dark-2);
    background-color: var(--el-color-warning-light-9);
    border-color: var(--el-color-warning-light-7);
  }
}

.tool-summary {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--el-text-color-secondary);
  white-space: pre-wrap;
  word-break: break-word;

  :deep(a) {
    color: var(--el-color-primary);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  }
}

.params-section {
  margin-top: 10px;
}

.params-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }

  .toggle-arrow {
    font-size: 12px;
  }

  .params-count {
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-placeholder);
  }
}

.params-panel {
  margin-top: 10px;
  padding: 12px 14px;
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.params-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
  line-height: 1.55;
}

.param-key {
  flex-shrink: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 3px;
  padding: 0 6px;
}

.param-desc {
  margin: 0;
  color: var(--el-text-color-regular);
  word-break: break-word;
}

.params-extra {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  white-space: pre-wrap;
}

.tool-aside {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.thumb-frame {
  width: 168px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

.thumb-image {
  display: block;
  max-width: 100%;
  cursor: zoom-in;

  :deep(.el-image__inner) {
    display: block;
    width: auto;
    height: auto;
    max-width: 168px;
    max-height: 120px;
    border-radius: 4px;
  }
}

.tool-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 96px;
}

.action-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 30px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  border-radius: 4px;
  box-sizing: border-box;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &.primary {
    color: var(--el-color-primary);
    background-color: var(--el-bg-color);
    border: 1px solid var(--el-color-primary-light-5);

    &:hover {
      color: var(--el-color-white);
      background-color: var(--el-color-primary);
      border-color: var(--el-color-primary);
    }
  }
}

.copy-btn {
  width: 100%;
  height: 30px;
  margin-left: 0 !important;
  padding: 0 8px;
  font-size: 12px;
  border-radius: 4px;

  &.copied {
    color: var(--el-color-success);
    border-color: var(--el-color-success);
  }
}

.btn-icon {
  font-size: 13px;
  margin-right: 2px;
}

.empty-state {
  padding: 64px 0;
  text-align: center;
}

.empty-text {
  margin: 0 0 16px;
  font-size: 15px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 860px) {
  .header-inner {
    padding: 0 20px;
  }

  .page-main {
    padding: 16px 20px 48px;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .search-box {
    width: 100%;
    padding-bottom: 12px;
  }

  .tool-row {
    flex-direction: column;
    gap: 14px;
    padding: 18px 0;
  }

  .tool-aside {
    width: 100%;
    justify-content: space-between;
  }

  .thumb-frame {
    width: auto;
    justify-content: flex-start;
  }

  .thumb-image :deep(.el-image__inner) {
    max-width: 140px;
    max-height: 96px;
  }

  .tool-actions {
    flex-direction: row;
    width: auto;
    flex-shrink: 0;
  }

  .copy-btn {
    width: auto;
  }
}
</style>
