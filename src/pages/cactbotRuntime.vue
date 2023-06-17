<script setup lang="ts">
import Util from "@/utils/util";
import { RemovableRef } from "@vueuse/core";
import "animate.css";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import { VXETable } from "vxe-table";
const createRPArr = (r: "T" | "H" | "D", l: number) =>
  Array(l)
    .fill(r)
    .map((v, i) => v + ++i);

const roleAssignLocationNames: Record<Role, string[]> = {
  tank: ["MT", "ST", ...createRPArr("T", 70)],
  healer: [...createRPArr("H", 72)],
  dps: [...createRPArr("D", 72)],
  unknown: ["unknown"],
};
// const lastRp = useStorage("cactbotRuntime-last-rp", {} as Record<string, string>);
const dialogVisible = ref(false);
const defaultSortArray = useStorage("cactbotRuntime-sortArr", [
  21, //战
  32, //暗
  37, //枪
  19, //骑
  33, //占
  24, //白
  40, //贤
  28, //学
  34, //侍
  30, //忍
  39, //钐
  22, //龙
  20, //僧
  38, //舞
  23, //诗
  31, //机
  25, //黑
  27, //召
  35, //赤
  36, //青
]);
const fakeParty: Player[] = [
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
  party: Player[];
}> = useStorage("cactbotRuntime-data", reactive({ party: [] }));
const showTips = useStorage("cactbotRuntime-showTips", ref(true));
const roleSelectLength = {
  tank: 0,
  healer: 0,
  dps: 0,
  unknown: 1,
};
function updateRoleSelectLength(): void {
  roleSelectLength.tank = data.value.party.reduce((p, c) => (getJobClassification(c.job) === "tank" ? p + 1 : p), 0);
  roleSelectLength.healer = data.value.party.reduce((p, c) => (getJobClassification(c.job) === "healer" ? p + 1 : p), 0);
  roleSelectLength.dps = data.value.party.reduce((p, c) => (getJobClassification(c.job) === "dps" ? p + 1 : p), 0);
}
const isDev = location.href.includes("localhost");
const mouseEnter = ref(false);
const playerName = ref(isDev ? "虚构占星" : "");
if (isDev) {
  handlePartyChanged({ party: fakeParty });
}
function getJobClassification(job: number): Role {
  const jobN = Number(job);
  if ([1, 3, 19, 21, 32, 37].includes(jobN)) return "tank";
  else if ([6, 24, 28, 33, 40].includes(jobN)) return "healer";
  else if ([2, 4, 5, 7, 20, 22, 23, 25, 26, 27, 29, 30, 31, 34, 35, 36, 38, 39].includes(jobN)) return "dps";
  return "unknown";
}
function handlePartyChanged(e: { party: { id: string; name: string; inParty: boolean; job: number }[] }): void {
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
}
function defaultPartySort() {
  data.value.party.sort((a, b) => defaultSortArray.value.indexOf(a.job) - defaultSortArray.value.indexOf(b.job));
  data.value.party.forEach((v) => (v.rp = undefined));
  data.value.party.forEach((v) => (v.rp = getRP(v)));
}
// function handleSelectChange(i: number): void {
//   data.value.party[i].specify = true;
//   const t = data.value.party.find((v) => v.rp === data.value.party[i].rp && v.id !== data.value.party[i].id);
//   t && (t.rp = getRP(t)) && (t.specify = true);
//   broadcastParty();
// }
function getRP(player: Player): string {
  // 如果有上一次的位置则优先使用上一次的（并且与现有的不重复） 以应对小队成员掉线或中途刷新悬浮窗需要重新选位置的情况
  // const hasLastRp = lastRp.value[player.id + player.job];
  // if (hasLastRp && !data.value.party.find((v) => v.rp === hasLastRp)) {
  //   player.specify = true;
  //   return hasLastRp;
  // }
  // 否则正常走逻辑
  return roleAssignLocationNames[getJobClassification(player.job)].find((role) => !data.value.party.find((v) => v.rp === role)) ?? "unknown";
}
function broadcastParty(): void {
  const sortArr = [...roleAssignLocationNames.tank, ...roleAssignLocationNames.healer, ...roleAssignLocationNames.dps];
  data.value.party.sort((a, b) => sortArr.indexOf(a.rp!) - sortArr.indexOf(b.rp!));
  // lastRp.value = data.value.party.reduce((pre, cur) => {
  //   if (cur.specify) pre[cur.id + cur.job] = cur.rp!;
  //   return pre;
  // }, {} as Record<string, string>);
  callOverlayHandler({
    call: "broadcast",
    source: "soumaRuntimeJS",
    msg: { party: data.value.party },
  });
}
function handleChangePrimaryPlayer(event: { charID: string; charName: string }): void {
  if (!isDev) playerName.value = event.charName;
}
const openMessage = (options: any) => {
  VXETable.modal.message(options);
};
function handleBroadcastMessage(e: { source: string; msg: any }) {
  if (e.source === "soumaUserJS") {
    switch (e.msg.text) {
      case "updateNewPartyRP Success":
        // ElNotification({
        //   message: h("i", { style: "color: teal" }, "通信成功"),
        // });
        openMessage({ content: "通信成功", status: "success", duration: 800, top: 5, id: "updateNewPartyRp" });
        break;
      case "requestData":
        broadcastParty();
        break;
    }
  }
}
function onMouseOver(): void {
  mouseEnter.value = true;
}
function onMouseOut(): void {
  mouseEnter.value = false;
}
function updateSortArr(arr: number[]) {
  // lastRp.value = {}; // 清空lastRp 因为这是手动拖拽后的新排序
  defaultSortArray.value = arr;
  defaultPartySort();
  updateRoleSelectLength();
  broadcastParty();
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
</script>

<template>
  <div @mouseenter="onMouseOver" @mouseleave="onMouseOut">
    <span v-if="data.party.length === 0" style="color: white; text-shadow: 1px 1px 2px black">等待小队...</span>
    <el-dialog v-model="dialogVisible" title="初见提示" width="90%" :destroy-on-close="true" :close-on-click-modal="false">
      <span>用鼠标拖动职业，使悬浮窗的位置分配对应游戏内的实际位置（D1D2等）</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button
            type="primary"
            @click="
              dialogVisible = false;
              showTips = false;
            "
            >明白了</el-button
          >
        </span>
      </template>
    </el-dialog>
    <el-container :style="{ width: mouseEnter ? '16.75rem' : '4rem' }">
      <el-main>
        <DragJob class="dragJob" v-show="mouseEnter" @updateSortArr="updateSortArr" :party="data.party" />
        <!-- <transition-group name="animate__animated animate__bounce" enter-active-class="animate__fadeIn" leave-active-class="animate__fadeOut"> -->
        <div v-for="(member, i) in data.party" :key="member.id" v-show="mouseEnter || member.name === playerName" flex="~ nowrap">
          <!-- <el-select v-model="member.rp" size="small" m-0 p-0 @change="handleSelectChange(i)" :teleported="false">
            <el-option
            v-for="(item, index) in roleAssignLocationNames[getJobClassification(member.job)]"
            v-show="index < roleSelectLength[getJobClassification(member.job)]"
            :key="index"
            :value="item"
            :fit-input-width="true"
            />
          </el-select> -->
          <!-- <span style="white-space: nowrap" -->
          {{ member.rp }} {{ Util.nameToFullName(Util.jobEnumToJob(member.job)).simple2 }} {{ mouseEnter ? member.name : "" }}
          <!-- </span> -->
        </div>
        <!-- </transition-group> -->
        <!-- <h5 p-0 m-0 v-show="mouseEnter" style="color: white; text-shadow: 1px 1px 2px black">默认排序：</h5> -->
      </el-main>
    </el-container>
  </div>
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
* {
  user-select: none;
}
</style>
<style lang="scss" scoped>
.el-container {
  background-color: rgba(0, 0, 0, 0.1);
  margin: 3px;
  > .el-header {
    height: 2rem;
    position: fixed;
    top: 0;
  }
  .el-main {
    padding: 0;
    margin: 0;
    > div:not(.dragJob) {
      overflow: hidden;
      // animation-duration: 0.2s;
      // animation-timing-function: ease-in-out;
      $color: rgba(0, 0, 0, 0.25);
      // > span {
      white-space: nowrap;
      color: white;
      text-shadow: 1px 1px 2px $color, -1px -1px 2px $color, 1px -1px 2px $color, -1px 1px 2px $color;
      // padding-left: 0.25em;
      // }
      // :deep(*:not(.el-popper)) {
      //   background-color: rgba(0, 0, 0, 0.01);
      // }
      // :deep(.el-input__inner) {
      //   color: white;
      // }
      // :deep(.el-popper) {
      //   background-color: rgba(255, 255, 255, 1);
      // }
      // .el-select {
      //   width: 2.5rem;
      //   :deep(.el-input__suffix-inner) {
      //     width: 0rem;
      //     position: relative;
      //     right: 0.75rem;
      //   }
      //   :deep(.el-input__wrapper) {
      //     padding: 0px 5px;
      //   }
      // }
    }
  }
}
</style>
