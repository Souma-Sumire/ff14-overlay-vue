<script setup lang="ts">
import type { EventMap } from "../../cactbot/types/event";
import type { KeySkillEntity } from "@/types/keySkill";
import { useDemo } from "@/composables/useDemo";
import { useDev } from "@/composables/useDev";
import { useZone } from "@/composables/useZone";
import { GLOBAL_SKILL_MAX_LEVEL } from "@/resources/globalSkills";
import { useKeySkillStore } from "@/store/keySkills";
import { compareSame, getUpgradeActionChain } from "@/utils/compareSaveAction";
import { handleImgError } from "@/utils/xivapi";
import {
  addOverlayListener,
  removeOverlayListener,
} from "../../cactbot/resources/overlay_plugin_api";
import { computed, onMounted, onUnmounted } from "vue";
import CommonActWrapper from "@/components/common/ActWrapper.vue";
import { ElButton, ElSlider } from "element-plus";

const storeKeySkill = useKeySkillStore();
const { zoneType } = useZone();
const isPvp = computed(() => zoneType.value === "Pvp");
const dev = useDev();
const demo = useDemo();

const handlePartyChanged: EventMap["PartyChanged"] = (e) => {
  storeKeySkill.party = e.party.filter((v) => v.inParty);
};

const handleLogLine: EventMap["LogLine"] = (e) => {
  if (isPvp.value) {
    return;
  }
  if (e.line[0] === "21" || (e.line[0] === "22" && e.line[45] === "0")) {
    // 15/16行
    const skillId = Number.parseInt(e.line[4]!, 16);
    const skillIdChain = getUpgradeActionChain(skillId);
    const triggerIds = [...new Set(skillIdChain.flatMap((id) => [id, compareSame(id)]))];
    const casterIdHex = e.line[2]!;
    storeKeySkill.triggerSkill(triggerIds, casterIdHex, true);
  } else if (e.line[0] === "33" && ["40000010", "4000000F"].includes(e.line[3]!)) {
    storeKeySkill.wipe();
  }
};

function testTrigger(skill: KeySkillEntity, tts: boolean) {
  if (dev || demo) {
    storeKeySkill.triggerSkill([skill.id], skill.owner.id, tts);
  }
}

onMounted(() => {
  addOverlayListener("PartyChanged", handlePartyChanged);
  addOverlayListener("LogLine", handleLogLine);
});

onUnmounted(() => {
  removeOverlayListener("PartyChanged", handlePartyChanged);
  removeOverlayListener("LogLine", handleLogLine);
  Object.values(storeKeySkill.skillStates).forEach((s) => {
    if (s.rafId) cancelAnimationFrame(s.rafId);
  });
});

function triggerAll(speed: number) {
  storeKeySkill.speed = speed;
  storeKeySkill.usedSkills.forEach((skill) => {
    storeKeySkill.triggerSkill([skill.id], skill.owner.id, false);
  });
}

function showSettings() {
  window.open(
    `${import.meta.env.BASE_URL}#/keySkillTimerSettings?OVERLAY_WS=ws://127.0.0.1:10501/ws`,
    "_blank",
    "width=1280,height=768",
  );
}
</script>

<template>
  <CommonActWrapper>
    <template #readme>
      <span class="demo-text">
        {{ $t("keySkillTimer.demo-text1") }}<br />
        {{ $t("keySkillTimer.demo-text2") }}
      </span>
    </template>
    <div v-if="!isPvp" class="key-skills-timer-container">
      <div class="skills-grid">
        <div
          v-for="skill in storeKeySkill.usedSkills"
          :key="skill.instanceKey"
          class="buff-container"
          :class="`line${skill.line}`"
          :style="{
            zIndex: demo || dev ? 99 : undefined,
          }"
          @click="() => (demo || dev ? testTrigger(skill, true) : null)"
        >
          <div class="buff-filter">
            <span
              class="duration"
              :class="[
                storeKeySkill.skillStates[skill.instanceKey]?.isRecast ? 'cooldown' : 'active',
              ]"
            >
              {{ storeKeySkill.skillStates[skill.instanceKey]?.text || "" }}
            </span>
            <img :src="skill.src" @error="handleImgError" />
            <div
              v-if="storeKeySkill.skillStates[skill.instanceKey]?.active"
              :key="storeKeySkill.skillStates[skill.instanceKey]?.startTime || 0"
              class="cooldown-layer"
              :style="{
                clipPath: `inset(${
                  storeKeySkill.skillStates[skill.instanceKey]?.clipPercent ?? 0
                }% 0 0 0)`,
              }"
            />
          </div>
          <span
            v-if="skill.owner.hasDuplicate.skill || skill.owner.hasDuplicate.job"
            :class="`job has-duplicate ${
              skill.owner.hasDuplicate.job ? 'duplicate-show-name' : 'duplicate-show-job-name'
            } ${skill.owner.jobIcon.toLowerCase()}`"
          >
            {{ skill.owner.hasDuplicate.job ? skill.owner.name : skill.owner.jobName }}
          </span>
          <span v-else-if="skill.job.length === 0" class="job no-job error">
            {{ $t("keySkillTimer.no-job") }}
          </span>
        </div>
      </div>
    </div>
    <div v-if="dev || demo" class="test">
      <div v-if="dev" class="level-sync-inline">
        <span class="level-sync-label">
          {{ $t("keySkillTimer.test-level") }} {{ storeKeySkill.levelSyncTestLevel }}
        </span>
        <el-slider
          v-model="storeKeySkill.levelSyncTestLevel"
          class="level-sync-control"
          :min="1"
          :max="GLOBAL_SKILL_MAX_LEVEL"
          :step="1"
          :show-tooltip="false"
        />
      </div>
      <el-button @click="storeKeySkill.demoFullParty">
        {{ $t("keySkillTimer.test-all-jobs") }}
      </el-button>
      <el-button v-if="dev" @click="() => storeKeySkill.shuffle()">
        {{ $t("keySkillTimer.test-8-party") }}
      </el-button>
      <el-button v-if="dev" @click="() => triggerAll(1)">
        {{ $t("keySkillTimer.test-trigger-1x") }}
      </el-button>
      <el-button v-if="dev" @click="() => triggerAll(5)">
        {{ $t("keySkillTimer.test-trigger-5x") }}
      </el-button>
      <el-button @click="storeKeySkill.wipe">
        {{ $t("keySkillTimer.test-wipe") }}
      </el-button>
      <el-button type="primary" @click="showSettings">
        {{ $t("keySkillTimer.settings") }}
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
  z-index: 10;
  position: absolute;
  font-size: 20px;
  font-weight: 800;
  font-family: "Arial Black", sans-serif;
  text-shadow:
    -1.5px -1.5px 0 #000,
    1.5px -1.5px 0 #000,
    -1.5px 1.5px 0 #000,
    1.5px 1.5px 0 #000,
    0px 2px 4px rgba(0, 0, 0, 0.8);
  pointer-events: none;
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
  background-color: rgba(0, 0, 0, 0.5);
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

.has-duplicate {
  position: absolute;
  bottom: -8px;
  z-index: 3;
  font-size: 12.5px;
}

.job.error {
  color: #ff4d4f;
  text-shadow:
    0 0 2px black,
    0 0 2px black;
  font-weight: bold;
}

.duplicate-show-name {
  // 不换行
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: auto;
  text-align: center;
  width: 5em;
  font-size: 8px;
  padding: 0 4px;
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
.test {
  position: fixed;
  z-index: 200;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.level-sync-inline {
  height: 32px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color-overlay);
}

.level-sync-label {
  font-size: 12px;
  white-space: nowrap;
}

.level-sync-control {
  width: 110px;
}

.level-sync-control :deep(.el-slider__runway) {
  margin: 0;
}
</style>
