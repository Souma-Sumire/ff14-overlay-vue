<script setup lang="ts">
import { useLang } from '@/composables/useLang'
import { getRawMenuData, MENU_ORDER, type Menu } from '@/resources/menuData'

const { t, locale } = useLang()

interface ExtendedMenu extends Menu {
  span?: number
}

function generateUrl(url: string) {
  return new URL(`../assets/screenshots/${url}`, import.meta.url).href
}

const tableData: Ref<ExtendedMenu[]> = ref([])
const cardRefs = new Map<string, any>()

function setCardRef(el: any, item: ExtendedMenu) {
  if (el) {
    cardRefs.set(item.title, el.$el || el)
  }
}

function updateSpans() {
  const rowHeight = 10
  const gap = 20
  tableData.value.forEach((item) => {
    const el = cardRefs.get(item.title)
    if (el) {
      const height = el.getBoundingClientRect().height
      item.span = Math.ceil((height + gap) / rowHeight)
    }
  })
}

const observer = new ResizeObserver(() => {
  updateSpans()
})

onMounted(() => {
  const container = document.querySelector('.masonry')
  if (container) observer.observe(container)
})

onUnmounted(() => {
  observer.disconnect()
})

watch(
  locale,
  () => {
    const rawData: Menu[] = getRawMenuData(locale.value, t)

    tableData.value = rawData
      .sort((a, b) => {
        const indexA = MENU_ORDER.indexOf(a.title)
        const indexB = MENU_ORDER.indexOf(b.title)
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
      })
      .map((item) => {
        const newItem: ExtendedMenu = { ...item }
        if (newItem.src) {
          newItem.src = generateUrl(newItem.src)
        }
        return newItem
      })

    nextTick(() => {
      updateSpans()
    })
  },
  {
    immediate: true,
  },
)
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-header class="sticky-header">
        <div class="header-content">
          <div class="brand">
            <h1 class="main-title">{{ t('startPages.header.title') }}</h1>
            <span class="version-tag">Project Souma</span>
          </div>
          <div class="header-actions">
            <CommonThemeToggle storage-key="start-pages-theme" />
            <CommonLanguageSwitcher />
          </div>
        </div>
      </el-header>

      <el-main class="main-container">
        <el-card class="contact-card" shadow="hover">
          <template #header>
            <div class="card-header">{{ t('startPages.contact.header') }}</div>
          </template>
          <div class="contact-info">
            <el-link
              href="https://github.com/Souma-Sumire"
              target="_blank"
              type="primary"
            >
              Github
            </el-link>
            <el-link
              href="https://space.bilibili.com/1443740"
              target="_blank"
              type="primary"
            >
              Bilibili
            </el-link>
            <span class="qq-group">
              <a target="_blank" href="https://qm.qq.com/q/yOQQhcaITK">
                <img
                  border="0"
                  src="//pub.idqqimg.com/wpa/images/group.png"
                  :alt="t('startPages.contact.qq_group_alt')"
                  :title="t('startPages.contact.qq_group_alt')"
                />
              </a>
            </span>
            <el-link
              href="https://discord.gg/VGM6764h"
              target="_blank"
              class="discord-link"
              type="primary"
            >
              Discord
            </el-link>
            <span class="warning-text">{{
              t('startPages.contact.warning')
            }}</span>
          </div>
        </el-card>

        <div class="masonry">
          <div
            v-for="(item, itemIndex) in tableData"
            :key="item.title"
            class="masonry-item"
            :style="{
              animationDelay: `${itemIndex * 0.05}s`,
              gridRowEnd: `span ${item.span || 20}`,
            }"
          >
            <el-card
              shadow="hover"
              class="menu-card"
              :body-style="{ padding: '10px' }"
              :ref="(el) => setCardRef(el, item)"
            >
              <div class="card-header-row">
                <div class="badge-group">
                  <span v-if="item.isNew" class="subtle-badge floating new"
                    >✨ {{ t('startPages.badge.new') }}</span
                  >
                  <span v-if="item.isHot" class="subtle-badge floating hot"
                    >🔥 {{ t('startPages.badge.hot') }}</span
                  >
                  <span
                    v-if="item.isRecommended"
                    class="subtle-badge floating recommended"
                    >⭐ {{ t('startPages.badge.recommended') }}</span
                  >
                </div>
                <router-link
                  v-if="!item.path.startsWith('http')"
                  :to="item.path"
                  class="card-title card-link"
                >
                  {{ t(item.title) }}
                </router-link>
                <a
                  v-else
                  :href="item.path"
                  target="_blank"
                  class="card-title card-link"
                >
                  {{ t(item.title) }}
                </a>
              </div>

              <div
                class="card-body"
                :style="{
                  display: 'flex',
                  flexDirection: item.direction ?? 'column-reverse',
                }"
              >
                <div
                  v-if="item.comment"
                  class="card-comment"
                  v-html="t(item.comment)"
                  :style="{
                    marginLeft:
                      item.direction === 'row-reverse' ? '0.5em' : '0px',
                    marginRight: item.direction === 'row' ? '0px' : '0.5em',
                    marginTop:
                      !item.direction || item.direction === 'column-reverse'
                        ? '0.5em'
                        : '0',
                  }"
                />
                <el-image
                  v-if="item.src"
                  :src="item.src"
                  fit="contain"
                  lazy
                  class="card-image"
                  @load="updateSpans"
                  :preview-src-list="[item.src]"
                  preview-teleported
                  hide-on-click-modal
                  :style="{
                    height: item.imageHeight ? `${item.imageHeight}px` : 'auto',
                    width: item.imageWidth ? `${item.imageWidth}px` : 'auto',
                  }"
                />
              </div>
            </el-card>
          </div>
        </div>
        <el-divider />
      </el-main>
    </el-container>
  </div>
</template>

<style lang="scss" scoped>
.common-layout {
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.main-container {
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--el-bg-color-overlay);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--el-border-color-light);
  height: 48px !important;
  width: 100%;
  display: flex;
  align-items: center;
}

.header-content {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.main-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--el-text-color-primary);
  letter-spacing: -0.5px;
}

.version-tag {
  font-size: 10px;
  font-weight: 500;
  color: var(--el-text-color-placeholder);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-card {
  position: relative;
  transition:
    transform 0.2s,
    box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
  }
}

.card-link {
  display: block;
  text-decoration: none;
  color: inherit;

  &:hover {
    color: var(--el-color-primary);
    text-decoration: underline;
  }
}

.card-title {
  display: block;
  font-size: 16px;
  font-weight: bold;
  margin-top: 8px;
  color: var(--el-color-primary);
}

.card-comment {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
  margin-bottom: 8px;
}

.card-image {
  border-radius: 4px;
}

.contact-card {
  margin-top: 16px;
  border: none;
  background-color: var(--el-fill-color-light);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);

    &::before {
      content: '';
      width: 3px;
      height: 14px;
      background-color: var(--el-color-primary);
      border-radius: 2px;
    }
  }

  :deep(.el-card__header) {
    padding: 12px 20px;
    border-bottom: 1px dashed var(--el-border-color-lighter);
    background: transparent;
  }
}

.contact-info {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
}

.qq-group {
  color: #67c23a;
}

.warning-text {
  font-size: 12px;
  padding: 4px 12px;
  background-color: var(--el-fill-color);
  border-radius: 6px;
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color-lighter);
}

.masonry {
  display: grid;
  grid-template-columns: repeat(3, minmax(300px, 440px));
  grid-auto-rows: 10px;
  gap: 0 20px;
  margin-top: 16px;
  align-items: start;
  justify-content: center;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(300px, 440px));
  }

  @media (max-width: 768px) {
    grid-template-columns: minmax(300px, 440px);
  }
}

.masonry-item {
  width: 100%;
  animation: card-in 0.5s ease-out both;
  transition: grid-row-end 0.3s ease;
  margin-bottom: 20px;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.badge-group {
  position: absolute;
  top: 21px;
  right: 12px;
  display: flex;
  gap: 6px;
  z-index: 1;
}

.subtle-badge {
  user-select: none;
  pointer-events: none;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  border-radius: 999px;
  border: 1px solid;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &.new {
    color: #2d8151;
    background-color: rgba(103, 194, 58, 0.1);
    border-color: rgba(103, 194, 58, 0.2);
  }

  &.hot {
    color: #c35a16;
    background-color: rgba(255, 142, 60, 0.1);
    border-color: rgba(255, 142, 60, 0.2);
  }

  &.recommended {
    color: #9a730b;
    background-color: rgba(230, 162, 60, 0.1);
    border-color: rgba(230, 162, 60, 0.2);
  }
}
</style>
