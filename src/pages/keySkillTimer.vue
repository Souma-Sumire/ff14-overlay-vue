<script setup lang="ts">
import type { EventMap } from '../../cactbot/types/event'
import type { KeySkillEntity } from '@/types/keySkill'
import { useDemo } from '@/composables/useDemo'
import { useDev } from '@/composables/useDev'
import { useZone } from '@/composables/useZone'
import { useKeySkillStore } from '@/store/keySkills'
import { compareSame } from '@/utils/compareSaveAction'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'

const params = useUrlSearchParams('hash')
const storeKeySkill = useKeySkillStore()
const { zoneType } = useZone()
const isPvp = computed(() => zoneType.value === 'Pvp')
const dev = useDev()
const demo = useDemo()

const handlePartyChanged: EventMap['PartyChanged'] = (e) => {
  storeKeySkill.party = e.party
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  if (isPvp.value) {
    return
  }
  if (e.line[0] === '21' || (e.line[0] === '22' && e.line[45] === '0')) {
    // 15/16行
    const skillId = Number.parseInt(e.line[4]!, 16)
    const skillIdCompare = compareSame(skillId)
    const casterIdHex = e.line[2]!
    storeKeySkill.triggerSkill(skillIdCompare, casterIdHex, true)
  }
  else if (e.line[0] === '33' && ['40000010', '4000000F'].includes(e.line[3]!)) {
    storeKeySkill.wipe()
  }
}

const handleChangePrimaryPlayer: EventMap['ChangePrimaryPlayer'] = (e) => {
  storeKeySkill.language = (e.charName.includes(' ') ? 'global' : 'chinese')
}

function testTrigger(skill: KeySkillEntity, tts: boolean) {
  if (dev || demo) {
    storeKeySkill.triggerSkill(skill.id, skill.owner.id, tts)
  }
}

onMounted(() => {
  addOverlayListener('PartyChanged', handlePartyChanged)
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
})

onUnmounted(() => {
  removeOverlayListener('PartyChanged', handlePartyChanged)
  removeOverlayListener('LogLine', handleLogLine)
  removeOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  Object.values(storeKeySkill.skillStates).forEach((s) => {
    if (s.rafId)
      cancelAnimationFrame(s.rafId)
  },
  )
})

function triggerAll(speed: number) {
  storeKeySkill.speed = speed
  storeKeySkill.usedSkills.forEach((skill) => {
    storeKeySkill.triggerSkill(skill.id, skill.owner.id, false)
  })
}

function showSettings() {
  window.open('/#/keySkillTimerSettings', '_blank')
}
</script>

<template>
  <CommonActWrapper>
    <template #readme>
      <span class="demo-text">
        当前为演示数据，锁定后将显示真实数据。<br>
        请尽量拉宽窗口，点击技能可模拟触发。
      </span>
    </template>
    <div v-if="!isPvp" class="key-skills-timer-container" :style="{ '--scale': params.scale?.toString(), '--opacity': params.opacity?.toString() }">
      <div class="skills-grid">
        <div
          v-for="(skill) in storeKeySkill.usedSkills"
          :key="skill.key"
          class="buff-container"
          :class="`line${skill.line}`"
          :style="{
            zIndex: (demo || dev ? 99 : undefined),
          }"
          @click="() => demo || dev ? testTrigger(skill, true) : null"
        >
          <div class="buff-filter">
            <span
              class="duration"
              :class="[
                storeKeySkill.skillStates[skill.key]?.isRecast
                  ? 'cooldown'
                  : 'active',
              ]"
            >
              {{ storeKeySkill.skillStates[skill.key]?.text || "" }}
            </span>
            <img :src="skill.src">
            <div
              v-if="storeKeySkill.skillStates[skill.key]?.active"
              :key="storeKeySkill.skillStates[skill.key]?.startTime || 0"
              class="cooldown-layer"
              :style="{
                clipPath: `inset(${storeKeySkill.skillStates[skill.key]?.clipPercent ?? 0}% 0 0 0)`,
              }"
            />
          </div>
          <span v-if="skill.owner.hasDuplicate" :class="`job ${skill.owner.jobIcon.toLowerCase()}`">
            {{ skill.owner.jobName }}
          </span>
        </div>
      </div>
    </div>
    <div v-if="dev || demo" class="test">
      <el-button @click="storeKeySkill.demoFullParty">
        模拟全部职业
      </el-button>
      <el-button
        @click="() => storeKeySkill.shuffle()"
      >
        模拟8人小队
      </el-button>
      <el-button v-if="dev" @click="() => triggerAll(1)">
        测试触发(1X)
      </el-button>
      <el-button v-if="dev" @click="() => triggerAll(5)">
        测试触发(5X)
      </el-button>
      <el-button @click="storeKeySkill.wipe">
        模拟团灭
      </el-button>
      <el-button type="primary" @click="showSettings">
        设置
      </el-button>
    </div>
  </CommonActWrapper>
</template>

<style>
::-webkit-scrollbar {
  display: none;
}
</style>

<style scoped lang="scss">
@use "@/styles/job.scss";

.key-skills-timer-container{
  zoom: var(--scale, 1);
  opacity: var(--opacity, 1);
}

.skills-grid {
  overflow: hidden;
  user-select: none;
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, 40px);
  grid-auto-rows: 40px;
  gap: 9px 3px;
}

.buff-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.buff-filter {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 1px 1px black;
  filter: drop-shadow(1px 2px 2px #000);
  width: 40px;
  height: 40px;
}

img {
  position: relative;
  width: 40px;
  height: 40px;
}

.duration {
  z-index: 4;
  position: absolute;
  font-size: 18px;
  font-weight: bold;
  text-shadow: -1px 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, 0 -1px 2px #000;
}

.duration.cooldown {
  color: #fff;
}

.duration.active {
  color: gold;
}

.cooldown-layer {
  position: absolute;
  width: 40px;
  height: 40px;
  z-index: 2;
  pointer-events: none;
  background-color: rgba(0, 0, 0, 0.75);
}

@for $i from 1 through 99 {
 .line#{$i} {
    grid-row: $i;
  }
}

img {
  // 禁止选中、拖动
  user-select: none;
  -webkit-user-drag: none;
  -moz-user-drag: none;
  -ms-user-drag: none;
}

.job {
  position: absolute;
  bottom: -8px;
  z-index: 3;
  font-size: 12.5px;
}

.demo-text {
  user-select: none;
  position: fixed;
  top: 0.5em;
  right: 0.5em;
  width: min-content;
  white-space: nowrap;
  padding: 10px;
  background-color: rgba(20, 20, 20, 0.4);
  color: white;
  font-size: 12px;
  text-shadow:
    1px 1px 1px #000,
    -1px -1px 1px #000,
    1px -1px 1px #000,
    -1px 1px 1px #000;

  z-index: 200;
  font-size: 16px;
  overflow: hidden;
}
.test{
  position:fixed;
  z-index: 200;
}
</style>
