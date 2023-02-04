<script setup lang="ts">
import Util from "@/utils/util";
import { RemovableRef } from "@vueuse/core";
import "animate.css";
import { ElMessage } from "element-plus";
const roleAssignLocationNames: Record<Role, string[]> = {
  tank: ["MT", "ST", "T3", "T4", "T5", "T6", "T7", "T8"],
  healer: ["H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8"],
  dps: ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"],
  unknown: ["unknown"],
};
const defaultSortArray = [
  "21", //战
  "32", //暗
  "37", //枪
  "19", //骑
  "33", //占
  "24", //白
  "40", //贤
  "28", //学
  "34", //侍
  "30", //忍
  "39", //钐
  "22", //龙
  "20", //僧
  "38", //舞
  "23", //诗
  "31", //机
  "25", //黑
  "27", //召
  "35", //赤
  "36", //青
];
const fakeParty: {
  id: string;
  name: string;
  job: number;
  inParty: boolean;
}[] = [
  { id: "10000001", name: "虚构战士", job: 21, inParty: true },
  { id: "10000002", name: "虚构骑士", job: 19, inParty: true },
  { id: "10000003", name: "虚构占星", job: 33, inParty: true },
  { id: "10000004", name: "虚构学者", job: 28, inParty: true },
  { id: "10000005", name: "虚构忍者", job: 30, inParty: true },
  { id: "10000006", name: "虚构武士", job: 34, inParty: true },
  { id: "10000007", name: "虚构黑魔", job: 25, inParty: true },
  { id: "10000008", name: "虚构舞者", job: 38, inParty: true },
];
const data: RemovableRef<{
  party: {
    id: string;
    name: string;
    rp: string;
    inParty: boolean;
    job: number;
  }[];
}> = useStorage("souma-cactbot-runtime", reactive({ party: [] }));
const roleSelectLength = {
  tank: 0,
  healer: 0,
  dps: 0,
  unknown: 1,
};
function updateRoleSelectLength(): void {
  roleSelectLength.tank = data.value.party.reduce((p, c) => (getJobClassification(c.job) === "tank" ? p + 1 : p), 0);
  roleSelectLength.healer = data.value.party.reduce(
    (p, c) => (getJobClassification(c.job) === "healer" ? p + 1 : p),
    0,
  );
  roleSelectLength.dps = data.value.party.reduce((p, c) => (getJobClassification(c.job) === "dps" ? p + 1 : p), 0);
}
const isDev = location.href.includes("localhost");
if (isDev) {
  handlePartyChanged({ party: fakeParty });
}
type Role = "tank" | "healer" | "dps" | "unknown";
function getJobClassification(job: number): Role {
  if ([1, 3, 19, 21, 32, 37].includes(job)) return "tank";
  else if ([6, 24, 28, 33, 40].includes(job)) return "healer";
  else if ([2, 4, 5, 7, 20, 22, 23, 25, 26, 27, 29, 30, 31, 34, 35, 36, 38, 39].includes(job)) return "dps";
  return "unknown";
}
function handlePartyChanged(e: { party: { id: string; name: string; inParty: boolean; job: number }[] }): void {
  if (isDev && e.party.length === 0) return;
  data.value.party = e.party
    .map((p) => {
      return { ...p, rp: "" };
    })
    .sort((a, b) => defaultSortArray.indexOf(a.job.toString()) - defaultSortArray.indexOf(b.job.toString()));
  data.value.party.forEach((v) => (v.rp = getRP(v.job)));
  updateRoleSelectLength();
  broadcastParty();
}
function handleSelectChange(i: number): void {
  const t = data.value.party.find((v) => v.rp === data.value.party[i].rp && v.id !== data.value.party[i].id);
  t && (t.rp = getRP(t.job));
  broadcastParty();
}
function getRP(job: number): string {
  return (
    roleAssignLocationNames[getJobClassification(job)].find((role) => !data.value.party.find((v) => v.rp === role)) ??
    "unknown"
  );
}
function broadcastParty(): void {
  const sortArr = [...roleAssignLocationNames.tank, ...roleAssignLocationNames.healer, ...roleAssignLocationNames.dps];
  data.value.party.sort((a, b) => sortArr.indexOf(a.rp) - sortArr.indexOf(b.rp));
  callOverlayHandler({
    call: "broadcast",
    source: "soumaRuntimeJS",
    msg: { party: data.value.party },
  });
}
function handleChangePrimaryPlayer(event: { charID: string; charName: string }): void {
  if (!isDev) playerName.value = event.charName;
}
function handleBroadcastMessage(e: { source: string; msg: any }) {
  if (e.source === "soumaUserJS") {
    switch (e.msg.text) {
      case "updateNewPartyRP Success":
        ElMessage("通信成功");
        break;
      case "requestData":
        broadcastParty();
        break;
    }
  }
}
onMounted(() => {
  broadcastParty();
  addOverlayListener("PartyChanged", handlePartyChanged);
  addOverlayListener("ChangePrimaryPlayer", handleChangePrimaryPlayer);
  addOverlayListener("BroadcastMessage", handleBroadcastMessage);
  startOverlayEvents();
});
onBeforeUnmount(() => {
  removeOverlayListener("PartyChanged", handlePartyChanged);
  removeOverlayListener("ChangePrimaryPlayer", handleChangePrimaryPlayer);
  removeOverlayListener("BroadcastMessage", handleBroadcastMessage);
});
const mouseEnter = ref(false);
const playerName = ref(isDev ? "虚构占星" : "");
function onMouseOver(): void {
  mouseEnter.value = true;
}
function onMouseOut(): void {
  mouseEnter.value = false;
}
</script>

<template>
  <span v-if="data.party.length === 0" style="color: white; text-shadow: 1px 1px 2px black">等待小队...</span>
  <el-container @mouseenter="onMouseOver" @mouseleave="onMouseOut">
    <el-main>
      <transition-group
        name="animate__animated animate__bounce"
        enter-active-class="animate__fadeInLeft"
        leave-active-class="animate__fadeOutLeft"
      >
        <div
          v-for="(member, i) in data.party"
          :key="member.id"
          v-show="mouseEnter || member.name === playerName"
          flex="~ nowrap"
        >
          <el-select v-model="member.rp" size="small" m-0 p-0 @change="handleSelectChange(i)" :teleported="false">
            <el-option
              v-for="(item, index) in roleAssignLocationNames[getJobClassification(member.job)]"
              v-show="index < roleSelectLength[getJobClassification(member.job)]"
              :key="index"
              :value="item"
              :fit-input-width="true"
            />
          </el-select>
          <span style="white-space: nowrap"
            >{{ Util.nameToFullName(Util.jobEnumToJob(member.job)).simple2 }} {{ member.name }}</span
          >
        </div>
      </transition-group>
    </el-main>
  </el-container>
</template>
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
</style>
<style lang="scss" scoped>
:deep(*) {
  user-select: none !important;
}
.el-container {
  background-color: rgba(0, 0, 0, 0.1);
  width: 16rem;
  > .el-header {
    height: 2rem;
    position: fixed;
    top: 0;
  }
  .el-main {
    padding: 0;
    margin: 0;
    > div {
      animation-duration: 0.2s;
      animation-timing-function: ease-in-out;
      $color: rgba(0, 0, 0, 0.25);
      > span {
        color: white;
        text-shadow: 1px 1px 2px $color, -1px -1px 2px $color, 1px -1px 2px $color, -1px 1px 2px $color;
        // padding-left: 0.25em;
      }
      :deep(*:not(.el-popper)) {
        background-color: rgba(0, 0, 0, 0.01);
      }
      :deep(.el-input__inner) {
        color: white;
      }
      :deep(.el-popper) {
        background-color: rgba(255, 255, 255, 1);
      }
      .el-select {
        width: 2.5rem;
        :deep(.el-input__suffix-inner) {
          width: 0rem;
          position: relative;
          right: 0.75rem;
        }
        :deep(.el-input__wrapper) {
          padding: 0px 5px;
        }
      }
    }
  }
}
</style>
