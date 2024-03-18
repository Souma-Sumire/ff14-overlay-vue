<template>
  <span
    v-if="data.party.length === 0"
    style="color: white; text-shadow: 1px 1px 2px black"
    >等待小队...</span
  >
  <div @mouseenter="onMouseOver" @mouseleave="onMouseOut">
    <vxe-modal
      v-model="dialogVisible"
      size="small"
      :position="{
        left: 10,
        top: 10,
      }"
      width="90vw"
    >
      <template #title>
        <span>用法</span>
      </template>
      <template #default>
        <p>使悬浮窗的位置分配对应游戏内的实际位置（D1D2等）</p>
        <ul>
          <li>临时：下拉选择框修改。</li>
          <li>长期：用鼠标拖动职能顺序。</li>
        </ul>
      </template>
    </vxe-modal>
    <main :class="mouseEnter ? 'mouseIn' : ''">
      <div class="players">
        <transition-group
          name="animate__animated animate__bounce"
          enter-active-class="animate__fadeInLeft"
          leave-active-class="animate__fadeOutLeft"
        >
          <section
            v-for="(member, i) in data.party"
            :key="member.id"
            v-show="mouseEnter || member.name === playerName"
            flex="~ nowrap"
            class="player"
          >
            <vxe-select
              v-model="member.rp"
              size="mini"
              @change="handleSelectChange(i)"
              class-name="select"
            >
              <vxe-option
                v-for="(item, index) in roleAssignLocationNames[
                  getJobClassification(member.job)
                ]"
                :visible="
                  index < roleSelectLength[getJobClassification(member.job)]
                "
                :key="index"
                :value="item"
                :label="item"
              ></vxe-option>
            </vxe-select>
            <span class="name">
              {{ Util.nameToFullName(Util.jobEnumToJob(member.job)).simple2 }}
              {{ mouseEnter ? member.name : "" }}
            </span>
          </section>
        </transition-group>
      </div>
      <DragJob
        class="dragJob"
        v-show="mouseEnter"
        @updateSortArr="updateSortArr"
        :party="data.party"
        m-b-1
        p-1
      />
    </main>
  </div>
</template>
<script setup lang="ts">
import type { PlayerRuntime, Role } from "@/types/partyPlayer";
import Util, { jobEnumOrder } from "@/utils/util";
import "animate.css";
import {
  addOverlayListener,
  callOverlayHandler,
} from "../../cactbot/resources/overlay_plugin_api";

const createRPArr = (r: "T" | "H" | "D", l: number) =>
  Array(l)
    .fill(r)
    .map((v, i) => v + (+i + 1));

const roleAssignLocationNames: Record<Role, string[]> = {
  tank: ["MT", "ST", ...createRPArr("T", 70)],
  healer: [...createRPArr("H", 72)],
  dps: [...createRPArr("D", 72)],
  unknown: ["unknown"],
};

const dialogVisible = ref(false);
const defaultSortArray = useStorage("cactbotRuntime-sortArr", jobEnumOrder);

const fakeParty: PlayerRuntime[] = [
  { id: "10000001", name: "虚构战士", job: 21, inParty: true },
  { id: "10000002", name: "虚构骑士", job: 19, inParty: true },
  { id: "10000003", name: "虚构占星", job: 33, inParty: true },
  { id: "10000004", name: "虚构学者", job: 28, inParty: true },
  { id: "10000005", name: "虚构忍者", job: 30, inParty: true },
  { id: "10000006", name: "虚构武士", job: 34, inParty: true },
  { id: "10000007", name: "虚构黑魔", job: 25, inParty: true },
  { id: "10000008", name: "虚构舞者", job: 38, inParty: true },
];
const _party: PlayerRuntime[] = [];
const data = useStorage("cactbotRuntime-data", { party: _party });
const showTips = useStorage("cactbotRuntime-showTips", ref(true));
const roleSelectLength = {
  tank: 0,
  healer: 0,
  dps: 0,
  unknown: 1,
};
function updateRoleSelectLength(): void {
  roleSelectLength.tank = data.value.party.reduce(
    (p, c) => (getJobClassification(c.job) === "tank" ? p + 1 : p),
    0
  );
  roleSelectLength.healer = data.value.party.reduce(
    (p, c) => (getJobClassification(c.job) === "healer" ? p + 1 : p),
    0
  );
  roleSelectLength.dps = data.value.party.reduce(
    (p, c) => (getJobClassification(c.job) === "dps" ? p + 1 : p),
    0
  );
}
const isDev = location.href.includes("localhost");
const mouseEnter = ref(false);
const playerName = ref(isDev ? "虚构占星" : "");
if (isDev) {
  const e = { party: fakeParty };
  if (showTips.value) dialogVisible.value = true;
  data.value.party = e.party.map((p) => ({ ...p, rp: "", specify: false }));
  defaultPartySort();
  updateRoleSelectLength();
  broadcastParty();
}

function getJobClassification(job: number): Role {
  const jobN = Number(job);
  if ([1, 3, 19, 21, 32, 37].includes(jobN)) return "tank";
  if ([6, 24, 28, 33, 40].includes(jobN)) return "healer";
  if (
    [
      2, 4, 5, 7, 20, 22, 23, 25, 26, 27, 29, 30, 31, 34, 35, 36, 38, 39,
    ].includes(jobN)
  )
    return "dps";
  return "unknown";
}

function defaultPartySort() {
  data.value.party.sort(
    (a, b) =>
      defaultSortArray.value.indexOf(a.job) -
      defaultSortArray.value.indexOf(b.job)
  );
  for (const v of data.value.party) {
    v.rp = undefined;
    v.rp = getRP(v);
  }
}

function handleSelectChange(i: number): void {
  data.value.party[i].specify = true;
  const t = data.value.party.find(
    (v) => v.rp === data.value.party[i].rp && v.id !== data.value.party[i].id
  );
  if (t) {
    t.rp = getRP(t);
    t.specify = true;
  }
  broadcastParty();
}

function getRP(player: PlayerRuntime): string {
  return (
    roleAssignLocationNames[getJobClassification(player.job)].find(
      (role) => !data.value.party.find((v) => v.rp === role)
    ) ?? "unknown"
  );
}

function broadcastParty(): void {
  const sortArr = [
    ...roleAssignLocationNames.tank,
    ...roleAssignLocationNames.healer,
    ...roleAssignLocationNames.dps,
  ];
  data.value.party.sort(
    (a, b) => sortArr.indexOf(a.rp ?? "") - sortArr.indexOf(b.rp ?? "")
  );
  callOverlayHandler({
    call: "broadcast",
    source: "soumaRuntimeJS",
    msg: { party: data.value.party },
  });
}

function onMouseOver(): void {
  mouseEnter.value = true;
}

function onMouseOut(): void {
  mouseEnter.value = false;
}

function updateSortArr(arr: number[]) {
  defaultSortArray.value = arr;
  defaultPartySort();
  updateRoleSelectLength();
  broadcastParty();
}

onMounted(() => {
  broadcastParty();
  addOverlayListener("PartyChanged", (e) => {
    if (showTips.value) {
      dialogVisible.value = true;
    }
    if (isDev && e.party.length === 0) return;
    data.value.party = e.party
      .filter((v) => v.inParty)
      .map((p) => {
        return { ...p, rp: "", specify: false };
      });
    defaultPartySort();
    updateRoleSelectLength();
    broadcastParty();
  });
  addOverlayListener("ChangePrimaryPlayer", (e) => {
    if (!isDev) playerName.value = e.charName;
  });
  addOverlayListener("BroadcastMessage", (e) => {
    if (
      e.source === "soumaUserJS" &&
      typeof e.msg === "object" &&
      e.msg !== null &&
      Reflect.get(e.msg, "text") === "requestData"
    ) {
      broadcastParty();
    }
  });
  startOverlayEvents();
});
</script>

<style lang="scss">
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
::-webkit-scrollbar-track {
  background-color: rgba(51, 51, 51, 1);
}
::-webkit-scrollbar-thumb {
  height: 30px;
  border-radius: 5px;
  background-color: rgba(216, 216, 216, 0.4);
}
::-webkit-scrollbar-thumb:active {
  background-color: rgba(160, 160, 160, 1);
}
* {
  user-select: none;
}
</style>

<style lang="scss" scoped>
main {
  width: 5rem;
  &.mouseIn {
    width: 16.75em;
  }
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0;
  margin: 0;
  transition-timing-function: ease-in-out;
  .players {
    $shadowColor: rgba(0, 0, 0, 0.25);
    $text-shadow: 1px 1px 2px $shadowColor, -1px -1px 2px $shadowColor,
      1px -1px 2px $shadowColor, -1px 1px 2px $shadowColor;
    $line-height: 1.5em;
    .player {
      transition-property: all;
      transition-duration: 0.3s;
      transition-timing-function: ease-in-out;
      animation-duration: 0.2s;
      animation-timing-function: ease-in-out;
      height: $line-height;
      line-height: $line-height;
      .select {
        width: 3.25em;
        --vxe-input-height-mini: $line-height;
        :deep(.vxe-input--inner) {
          color: white;
          font-family: Consolas, "Liberation Mono", Menlo, Courier, monospace;
          font-size: 16px;
          font-weight: 700;
          background-color: rgba(0, 0, 0, 0.01);
          padding: 0 0 0 0.4em;
          text-shadow: $text-shadow;
        }
        :deep(.vxe-input--suffix) {
          right: -0.2em;
        }
      }
      .name {
        white-space: nowrap;
        color: white;
        text-shadow: $text-shadow;
      }
    }
  }
}
</style>
