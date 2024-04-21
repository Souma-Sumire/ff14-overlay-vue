<template>
  <div @mouseenter="onMouseOver" @mouseleave="onMouseOut">
    <span
      v-show="data.party.length <= 1"
      style="color: white; text-shadow: 1px 1px 2px black"
      >...</span
    >
    <vxe-modal
      v-model="dialogVisible"
      size="small"
      :position="{
        left: 10,
        top: 10,
      }"
      width="90vw"
      @close="
        dialogVisible = false;
        showTips = false;
      "
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
    <main
      :style="{
        width: mouseEnter
          ? 15.5 + +(data.party.find((v) => v.job === 36) ? 1 : 0) + 'em'
          : '4em',
      }"
    >
      <div class="players">
        <transition-group
          name="animate__animated animate__bounce"
          enter-active-class="animate__fadeInLeft"
          leave-active-class="animate__fadeOutLeft"
        >
          <section
            v-for="(member, i) in data.party"
            :key="member.id"
            v-show="
              data.party.length > 1 &&
              (mouseEnter || member.name === playerName)
            "
            flex="~ nowrap"
            :style="{
              opacity: mouseEnter ? 1 : 0.5,
            }"
            class="player"
          >
            <vxe-select
              v-model="member.rp"
              size="mini"
              @change="handleSelectChange(i)"
              class-name="select"
            >
              <vxe-option
                v-for="(item, index) in getOptions(member.job)"
                :key="index"
                :value="item"
                :label="item"
              ></vxe-option>
            </vxe-select>
            <!-- <span class="name" :class="aprilFoolSDay ? 'aprilFoolSDay' : ''"> -->
            <span class="name">
              {{ getJobName(member.job) }}
              {{ mouseEnter ? getPlayerName(member.name) : "" }}
            </span>
          </section>
        </transition-group>
      </div>
      <DragJob
        v-show="mouseEnter"
        @updateSortArr="updateSortArr"
        :party="data.party"
        m-b-1
        p-1
      />
    </main>
    <div v-if="isDev" style="position: fixed; bottom: 0">
      <button
        @click="
          {
            data.party = data.party.filter((v) => v.name === playerName);
            updateData();
          }
        "
      >
        测试单人
      </button>
      <button
        @click="
          {
            const e = { party: fakeParty };
            data.party = e.party.map((p) => ({ ...p, rp: '', specify: false }));
            updateData();
          }
        "
      >
        测试组队
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { PlayerRuntime } from "@/types/partyPlayer";
import Util, { jobEnumOrder } from "@/utils/util";
import "animate.css";
import {
  addOverlayListener,
  callOverlayHandler,
} from "../../cactbot/resources/overlay_plugin_api";
import type { Role } from "../../cactbot/types/job";

// const aprilFoolSDay = ref(
//   new Date().getMonth() === 3 && new Date().getDate() === 1
// );

const createRPArr = (r: "T" | "H" | "D" | "C" | "G" | "N", l: number) =>
  Array(l)
    .fill(r)
    .map((v, i) => v + (+i + 1));

const roleAssignLocationNames: Record<Role, string[]> = {
  tank: ["MT", "ST", ...createRPArr("T", 6)],
  healer: [...createRPArr("H", 8)],
  dps: [...createRPArr("D", 8)],
  crafter: [...createRPArr("C", 8)],
  gatherer: [...createRPArr("G", 8)],
  none: [...createRPArr("N", 8)],
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
  { id: "10000008", name: "虚构诗人", job: 23, inParty: true },
  { id: "10000007", name: "虚构召唤", job: 27, inParty: true },
];
const _party: PlayerRuntime[] = [];
const data = useStorage("cactbotRuntime-data", { party: _party });
const showTips = useStorage("cactbotRuntime-showTips", ref(true));
const roleSelectLength: Record<Role, number> = reactive({
  tank: 0,
  healer: 0,
  dps: 0,
  crafter: 0,
  gatherer: 0,
  none: 0,
});

function updateRoleSelectLength(): void {
  for (const role in roleSelectLength) {
    if (Object.prototype.hasOwnProperty.call(roleSelectLength, role)) {
      roleSelectLength[role as Role] = data.value.party.reduce(
        (p, c) => (getJobClassification(c.job) === role ? p + 1 : p),
        0
      );
    }
  }
}
const getOptions = (job: number) => {
  const classification = getJobClassification(job);
  return roleAssignLocationNames[classification].filter((_v, i) => {
    return i < roleSelectLength[classification];
  });
};
const isDev = location.href.includes("localhost");
const mouseEnter = ref(false);
const playerName = ref(isDev ? "虚构SMN" : "");

const getJobClassification = (job: number): Role => {
  const jobN = Number(job);
  if ([1, 3, 19, 21, 32, 37].includes(jobN)) return "tank";
  if ([6, 24, 28, 33, 40].includes(jobN)) return "healer";
  if (
    [
      2, 4, 5, 7, 20, 22, 23, 25, 26, 27, 29, 30, 31, 34, 35, 36, 38, 39,
    ].includes(jobN)
  )
    return "dps";

  if (Util.isCraftingJob(Util.jobEnumToJob(job))) return "crafter";
  if (Util.isGatheringJob(Util.jobEnumToJob(job))) return "gatherer";
  return "none";
};

const defaultPartySort = () => {
  data.value.party.sort(
    (a, b) =>
      defaultSortArray.value.indexOf(a.job) -
      defaultSortArray.value.indexOf(b.job)
  );
  for (const v of data.value.party) {
    v.rp = undefined;
    v.rp = getRP(v);
  }
};

const handleSelectChange = (i: number): void => {
  data.value.party[i].specify = true;
  const t = data.value.party.find(
    (v) => v.rp === data.value.party[i].rp && v.id !== data.value.party[i].id
  );
  if (t) {
    t.rp = getRP(t);
    t.specify = true;
  }
  broadcastParty();
};

const getRP = (player: PlayerRuntime): string => {
  return (
    roleAssignLocationNames[getJobClassification(player.job)].find(
      (role) => !data.value.party.find((v) => v.rp === role)
    ) ?? "unknown"
  );
};

const broadcastParty = (): void => {
  const sortArr = [
    ...roleAssignLocationNames.tank,
    ...roleAssignLocationNames.healer,
    ...roleAssignLocationNames.dps,
    ...roleAssignLocationNames.crafter,
    ...roleAssignLocationNames.gatherer,
    ...roleAssignLocationNames.none,
  ];
  data.value.party.sort(
    (a, b) => sortArr.indexOf(a.rp ?? "") - sortArr.indexOf(b.rp ?? "")
  );
  callOverlayHandler({
    call: "broadcast",
    source: "soumaRuntimeJS",
    msg: { party: data.value.party },
  });
};

const onMouseOver = (): void => {
  mouseEnter.value = true;
};

const onMouseOut = (): void => {
  mouseEnter.value = false;
};

const updateSortArr = (arr: number[]) => {
  defaultSortArray.value = arr;
  updateData();
};

const getJobName = (job: number) => {
  return Util.nameToFullName(Util.jobEnumToJob(job)).simple1;
};

const getPlayerName = (name: string) => {
  return name;
};

const updateData = () => {
  defaultPartySort();
  updateRoleSelectLength();
  broadcastParty();
};

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
    updateData();
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
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0;
  margin: 0;
  border-radius: 5px;
  transition-timing-function: ease-in-out;
  .players {
    margin-left: 1px;
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
        // &.aprilFoolSDay {
        //   animation: shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both
        //     infinite;
        //   @keyframes shake {
        //     10%,
        //     90% {
        //       transform: translateX(-4px);
        //     }
        //     20%,
        //     80% {
        //       transform: translateX(4px);
        //     }
        //     30%,
        //     50%,
        //     70% {
        //       transform: translateX(-4px);
        //     }
        //     40%,
        //     60% {
        //       transform: translateX(4px);
        //     }
        //   }
        // }
      }
    }
  }
}
</style>
