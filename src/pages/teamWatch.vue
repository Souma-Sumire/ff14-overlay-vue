<script setup lang="ts">
import type { EventMap } from '../../cactbot/types/event'
import type { TeamWatchMemberView, TeamWatchSkillView } from '@/types/teamWatchTypes'
import { useUrlSearchParams } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { useDemo } from '@/composables/useDemo'
import { useTeamWatchStore } from '@/store/teamWatchStore'
import { copyToClipboard } from '@/utils/clipboard'
import { doTextCommand } from '@/utils/postNamazu'
import { handleImgError } from '@/utils/xivapi'
import { addOverlayListener, removeOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

const params = useUrlSearchParams('hash')
const store = useTeamWatchStore()
const demo = useDemo()

const postNamazu = computed(() => params.postNamazu === 'true')

const handleChangePrimaryPlayer: EventMap['ChangePrimaryPlayer'] = (e) => {
  store.handleChangePrimaryPlayer(e)
}
const handlePartyChanged: EventMap['PartyChanged'] = (e) => {
  store.handlePartyChanged(e)
}
const handleChangeZone: EventMap['ChangeZone'] = () => {
  store.handleZoneChanged()
}
const handleLogLine: EventMap['LogLine'] = (e) => {
  store.handleLogLine(e)
}

let runtimeRaf: number | undefined
const runtimeTickMode: 'full' | '30fps' = '30fps'
const runtimeThrottleMs = 33

function skillState(skill: TeamWatchSkillView) {
  return store.getSkillState(skill)
}

async function handleSkillClick(member: TeamWatchMemberView, skill: TeamWatchSkillView) {
  if (skill.rawActionId <= 0)
    return

  const text = store.buildSkillStatusText(member, skill)
  try {
    await copyToClipboard(text)
    ElMessage.success({
      message: '已复制技能状态',
      duration: 1000,
    })
  }
  catch (error) {
    console.warn('[teamWatch] copy failed:', error)
    ElMessage.warning('复制失败')
  }

  if (postNamazu.value) {
    try {
      await doTextCommand(`/p ${text}`)
    }
    catch (error) {
      console.warn('[teamWatch] postNamazu failed:', error)
    }
  }
}

function openSettings() {
  window.open(`${import.meta.env.BASE_URL}#/teamWatchSettings`, 'teamWatchSettings', 'width=1280,height=900')
}

onMounted(() => {
  addOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  addOverlayListener('PartyChanged', handlePartyChanged)
  addOverlayListener('ChangeZone', handleChangeZone)
  addOverlayListener('LogLine', handleLogLine)

  let lastRuntimeUpdateAt = Number.NEGATIVE_INFINITY
  const tick = (timestamp: number) => {
    if (runtimeTickMode === '30fps') {
      if (timestamp - lastRuntimeUpdateAt >= runtimeThrottleMs) {
        store.updateRuntime()
        lastRuntimeUpdateAt = timestamp
      }
    }
    else {
      store.updateRuntime()
    }
    runtimeRaf = window.requestAnimationFrame(tick)
  }
  runtimeRaf = window.requestAnimationFrame(tick)
})

watch(
  () => [demo.value, store.partyCount] as const,
  ([isDemo, partyCount]) => {
    store.setFakeMode(isDemo && partyCount <= 1)
  },
  { immediate: true },
)

onUnmounted(() => {
  removeOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  removeOverlayListener('PartyChanged', handlePartyChanged)
  removeOverlayListener('ChangeZone', handleChangeZone)
  removeOverlayListener('LogLine', handleLogLine)
  if (runtimeRaf)
    cancelAnimationFrame(runtimeRaf)
})
</script>

<template>
  <CommonActWrapper>
    <template #readme>
      <div class="menu-tools">
        <el-button size="small" @click="openSettings">
          设置
        </el-button>
        <el-button size="small" @click="store.setFakeMode(false)">
          实际队伍
        </el-button>
        <el-button size="small" @click="store.setFakeMode(true)">
          测试：模拟小队
        </el-button>
        <el-button size="small" @click="store.triggerAllVisibleSkills()">
          测试：全部触发
        </el-button>
        <el-button size="small" @click="store.fillResourceStates()">
          测试：填满量谱
        </el-button>
      </div>
    </template>
    <div class="team-watch-root">
      <main class="member-list">
        <article
          v-for="member in store.members"
          :key="member.id"
          class="member-row"
        >
          <button
            v-for="(skill, index) in member.skills"
            :key="`${member.id}-${index}-${skill.rawActionId}`"
            class="skill-btn"
            :class="[
              {
                'is-hidden': skill.rawActionId <= 0 || member.level < skill.meta.classJobLevel,
                'is-cooling': skillState(skill).isCooling,
                'is-resource-empty': !skillState(skill).resourceReady,
                'flash-used': skillState(skill).isRecentlyUsed,
              },
            ]"
            :title="store.buildSkillStatusText(member, skill)"
            @click="handleSkillClick(member, skill)"
          >
            <img :src="skill.meta.iconSrc" :alt="skill.meta.name" @error="handleImgError">
            <span
              v-if="skillState(skill).overlayPercent > 0"
              class="cooldown-mask"
              :style="{ height: `${skillState(skill).overlayPercent}%` }"
            />
            <span
              v-if="!skillState(skill).isCharge"
              class="recast-text"
            >
              {{ skillState(skill).text }}
            </span>
            <span
              v-if="skillState(skill).isCharge"
              class="charges-text"
              :class="{ empty: skillState(skill).charges <= 0 }"
            >
              {{ skillState(skill).charges }}
            </span>
            <span
              v-if="skillState(skill).extraText"
              class="resource-text"
            >
              {{ skillState(skill).extraText }}
            </span>
            <span
              v-else-if="skillState(skill).hasResourceCost && skillState(skill).resourceValue !== undefined"
              class="resource-text"
              :class="{ warn: !skillState(skill).resourceReady }"
            >
              {{ skillState(skill).resourceValue ?? 0 }}
            </span>
          </button>
        </article>
      </main>
    </div>
  </CommonActWrapper>
</template>

<style scoped lang="scss">
.team-watch-root {
  width: fit-content;
  user-select: none;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
}

.member-row {
  display: flex;
  align-items: center;
  min-height: 38px;
  gap: 0px;
}

.skill-btn {
  position: relative;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0px solid transparent;
  box-sizing: border-box;
  background: none;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    display: block;
  }

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.08);
  }

  &::after {
    content: '';
    background: url(https://souma.diemoe.net/resources/img/frame.png) no-repeat center / 100% 100%;
    width: 48px;
    height: 48px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.8);
    transform-origin: center;
    pointer-events: none;
  }
}

.skill-btn.is-resource-empty {
  box-shadow: inset 0 0 0 1px rgba(255, 69, 69, 0.85);
  filter: saturate(0.65);
}

.skill-btn.is-hidden {
  opacity: 0;
  border-color: transparent;
  background: transparent;
  pointer-events: none;
}

.cooldown-mask {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  background: rgba(0, 0, 0, 0.55);
  pointer-events: none;
}

.recast-text {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 2;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  text-shadow:
    -1px 0 2px #000,
    0 1px 2px #000,
    1px 0 2px #000,
    0 -1px 2px #000;
}

.charges-text {
  position: absolute;
  right: 2px;
  bottom: 0;
  z-index: 2;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  text-shadow:
    -1px 0 2px #000,
    0 1px 2px #000,
    1px 0 2px #000,
    0 -1px 2px #000;
}

.charges-text.empty {
  color: #ff6a00;
}

.resource-text {
  position: absolute;
  left: 2px;
  bottom: 2px;
  z-index: 2;
  color: #f5f5f5;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  transform: scale(0.84);
  transform-origin: left bottom;
  text-shadow:
    -1px 0 2px #000,
    0 1px 2px #000,
    1px 0 2px #000,
    0 -1px 2px #000;
}

.resource-text.warn {
  color: #ff4d4f;
}

.flash-used {
  animation: used-flash 0.22s ease-out 1;
}

@keyframes used-flash {
  from {
    transform: scale(1);
    filter: brightness(1.35);
  }
  to {
    transform: scale(1);
    filter: brightness(1);
  }
}
.menu-tools {
  user-select: none;
  position: fixed;
  top: 0;
  right: 0;
  width: min-content;
  white-space: nowrap;
  padding: 10px;
  color: white;
  font-size: 12px;
  z-index: 200;
  display: flex;
  flex-direction: column;
}
.menu-tools :deep(.el-button) {
  width: 88px;
  margin-left: 0;
  justify-content: center;
  padding-inline: 8px;
}
.menu-tools :deep(.el-button + .el-button) {
  margin-left: 0;
}
</style>
