<script setup lang="ts">
import { useLang } from '@/composables/useLang'

const { t, locale } = useLang()

type MenuType = '网页/工具' | '悬浮窗'

interface Menu {
  title: string
  type: MenuType
  path: string
  comment?: string
  src?: string
  imageHeihgt?: number
  imageWidth?: number
  isNew?: boolean
  isRecommended?: boolean
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
}

function generateUrl(url: string) {
  return new URL(`../assets/screenshots/${url}`, import.meta.url).href
}

const tableData: Ref<Menu[]> = ref([])

watch(
  locale,
  () => {
    tableData.value = (
      [
        {
          title: 'startPages.menu.github_patch',
          type: '网页/工具',
          path: 'https://github.com/Souma-Sumire/FFXIVChnTextPatch-Souma/',
          comment: 'startPages.comment.github_patch',
        },
        {
          title: 'startPages.menu.cactbot_raidboss',
          type: '网页/工具',
          path: 'https://github.com/Souma-Sumire/raidboss-user-js-public',
          comment: 'startPages.comment.cactbot_raidboss',
        },
        {
          title: 'startPages.menu.fflogs_uploader_download',
          type: '网页/工具',
          path: 'fflogsUploaderDownload',
        },
        {
          title: 'startPages.menu.keigenn_record2',
          type: '悬浮窗',
          path: `keigennRecord2?scale=1&opacity=0.9&targetType=icon&iconType=2&parseAA=1&parseDoT=0&minimize=0&actionCN=1&statusCN=1&lang=${locale.value}`,
          comment: 'startPages.comment.keigenn_record2_params',
          direction: 'row-reverse',
          src: 'keigennRecord2.webp',
          isRecommended: true,
        },
        {
          title: 'startPages.menu.key_skill_timer',
          type: '悬浮窗',
          path: `keySkillTimer?scale=1&opacity=1&lang=${locale.value}`,
          comment: 'startPages.comment.key_skill_timer_params',
          src: 'keySkillTimer.webp',
        },
        {
          title: 'startPages.menu.dd_atlas',
          type: '悬浮窗',
          path: `dd?scale=1&lang=${locale.value}`,
          src: 'dd.webp',
          comment: 'startPages.comment.dd_atlas',
          imageWidth: 350,
          isNew: true,
        },
        {
          title: 'startPages.menu.zone_macro',
          type: '网页/工具',
          path: `zoneMacro?OVERLAY_WS=ws://127.0.0.1:10501/ws&lang=${locale.value}`,
          src: 'zoneMacro.webp',
          comment: 'startPages.comment.zone_macro',
          imageWidth: 350,
        },
        {
          title: 'startPages.menu.food_police',
          type: '悬浮窗',
          path: `food?lang=${locale.value}`,
          src: 'food.webp',
          comment: 'startPages.comment.food_police',
          imageHeihgt: 136,
        },
        {
          title: 'startPages.menu.healing_timeline',
          type: '悬浮窗',
          path: 'timeline',
          src: 'timeline.webp',
          comment: 'startPages.comment.healing_timeline',
          imageHeihgt: 154,
        },
        {
          title: 'startPages.menu.casting_monitor',
          type: '悬浮窗',
          path: `castingMonitor?duration=15&displayAA=false&api=cafemaker&showHeader=true&syncFocusWS=false&lang=${locale.value}`,
          src: 'castingMonitor.webp',
          comment: 'startPages.comment.casting_monitor_params',
        },
        {
          title: 'startPages.menu.instanced_area_info',
          type: '悬浮窗',
          path: 'instancedAreaInfo',
          src: 'instancedAreaInfo.webp',
          comment: 'startPages.comment.instanced_area_info',
          imageHeihgt: 100,
        },

        {
          title: 'startPages.menu.radar',
          type: '悬浮窗',
          path: 'radar',
          src: 'radar.webp',
          comment: 'startPages.comment.radar',
          imageHeihgt: 180,
        },
        {
          title: 'startPages.menu.obs_auto_record2',
          type: '悬浮窗',
          path: 'obs2',
          comment: 'startPages.comment.obs_auto_record2',
        },
        {
          title: 'startPages.menu.team_watch_legacy',
          type: '悬浮窗',
          path: 'https://souma.diemoe.net/dist/teamWatch.html',
          comment: 'startPages.comment.team_watch_legacy',
          src: 'teamWatch.webp',
          direction: 'row-reverse',
        },
        {
          title: 'startPages.menu.enmity_reminder',
          type: '悬浮窗',
          path: 'enmity',
          comment: 'startPages.comment.enmity_reminder',
        },
        {
          title: 'startPages.menu.combat_time_obs',
          type: '悬浮窗',
          path: 'time?mode=combat&OVERLAY_WS=ws://127.0.0.1:10501/ws',
          comment: 'startPages.comment.combat_time_obs_params',
          src: 'time.webp',
          imageWidth: 300,
          direction: 'row-reverse',
        },
        {
          title: 'startPages.menu.show_barrier',
          type: '悬浮窗',
          path: 'showBarrier?lineHeight=1&fontSize=26&type=1&showSettings=1',
          comment: 'startPages.comment.show_barrier_params',
        },
        {
          title: 'startPages.menu.casting_to_chinese',
          type: '悬浮窗',
          path: 'castingToChinese',
          comment: 'startPages.comment.casting_to_chinese',
          src: 'castingToChinese.webp',
          imageHeihgt: 80,
        },
        {
          title: 'startPages.menu.limit_break_tip',
          type: '悬浮窗',
          path: `lbTick?lang=${locale.value}`,
          comment: 'startPages.comment.limit_break_tip',
          src: 'limitBreakTip.webp',
          imageWidth: 100,
        },
        {
          title: 'startPages.menu.act_self_test',
          type: '网页/工具',
          path: 'test',
          comment: 'startPages.comment.act_self_test',
        },
        {
          title: 'startPages.menu.hunt_map',
          type: '网页/工具',
          path: 'hunt',
        },
        {
          title: 'startPages.menu.aether_map',
          type: '网页/工具',
          path: 'aether',
        },
        {
          title: 'startPages.menu.mogstation_patch',
          type: '网页/工具',
          path: 'https://greasyfork.org/zh-CN/scripts/449987-mogstation%E8%8E%AB%E5%8F%A4%E7%AB%99%E6%B1%89%E5%8C%96',
          isNew: true,
          comment: 'startPages.comment.mogstation_patch',
        },
        {
          title: 'startPages.menu.stone_sky_logs',
          type: '网页/工具',
          path: 'https://greasyfork.org/zh-CN/scripts/482604-%E7%9F%B3%E4%B9%8B%E5%AE%B6-%E4%BF%AE%E4%B8%BA%E6%9F%A5%E8%AF%A2',
          comment: 'startPages.comment.stone_sky_logs',
        },
        {
          title: 'startPages.menu.kook_purify',
          type: '网页/工具',
          path: 'https://greasyfork.org/zh-CN/scripts/546095-kook%E5%87%80%E5%8C%96',
          comment: 'startPages.comment.kook_purify',
          isNew: true,
        },
      ] as Menu[]
    ).map((item) => {
      if (item.src) {
        item.src = generateUrl(item.src)
      }
      return item
    })
  },
  {
    immediate: true,
  }
)
</script>

<template>
  <div class="common-layout">
    <el-container class="main-container">
      <el-header>
        <div class="header-content">
          <h1 class="main-title">{{ t('startPages.header.title') }}</h1>
          <div flex="~ gap-5">
            <CommonThemeToggle storage-key="start-pages-theme" />
            <CommonLanguageSwitcher />
          </div>
        </div>
      </el-header>

      <el-main>
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
            <span class="warning-text">{{
              t('startPages.contact.warning')
            }}</span>
          </div>
        </el-card>

        <div class="masonry">
          <div v-for="item in tableData" :key="item.title" class="masonry-item">
            <el-card
              shadow="hover"
              class="menu-card"
              :body-style="{ padding: '10px' }"
            >
              <div class="card-header-row">
                <div class="badge-group">
                  <span v-if="item.isNew" class="subtle-badge floating new"
                    >✨ {{ t('startPages.badge.new') }}</span
                  >
                  <span
                    v-if="item.isRecommended"
                    class="subtle-badge floating recommended"
                    >🔥 {{ t('startPages.badge.recommended') }}</span
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
                  :preview-src-list="[item.src]"
                  preview-teleported
                  hide-on-click-modal
                  :style="{
                    height: item.imageHeihgt ? `${item.imageHeihgt}px` : 'auto',
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
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-card {
  position: relative;
  padding: 0 12px;
  transition: transform 0.2s, box-shadow 0.2s;

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
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.contact-card {
  background-color: var(--el-fill-color-light);
  border-left: 4px solid var(--el-color-primary);
}

.card-header {
  font-weight: bold;
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
  color: #909399;
}

.masonry {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-flow: dense;
  gap: 16px;
  margin-top: 16px;
}

.masonry-item {
  break-inside: avoid;
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
  background-color: var(--el-bg-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);

  &.new {
    color: var(--el-color-success);
    border-color: var(--el-color-success);
  }

  &.recommended {
    color: var(--el-color-warning);
    border-color: var(--el-color-warning);
  }
}
</style>
