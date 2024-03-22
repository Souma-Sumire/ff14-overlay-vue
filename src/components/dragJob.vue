<template>
  <div flex="~ col">
    <VueDraggable
      v-for="(role, index) in roles"
      :key="index"
      ref="el"
      :disabled="!isDisabled"
      v-model="jobList[role.name]"
      animation="150"
      ghostClass="ghost"
      class="flex flex-row gap-0.25 p-0 m-t-0.25 m-b-0.25 rounded"
      @update="onUpdate"
      filter=".no-draggable"
      :forceFallback="true"
    >
      <div
        v-for="item in jobList[role.name]"
        :key="item.id"
        :class="`${
          isJobInParty(item.id)
            ? `draggable bg-${role.color} cursor-move`
            : 'no-draggable bg-gray-700/50'
        } rounded p-l-0.6 p-r-0.6 p-t-0 p-b-0.3 m-0 color-white`"
      >
        {{ item.name }}
      </div>
    </VueDraggable>
  </div>
</template>

<script setup lang="ts">
import type { Player } from "@/types/partyPlayer";
import Util from "@/utils/util";
import type { RemovableRef } from "@vueuse/core";
import type { Role } from "../../cactbot/types/job";
import { ref } from "vue";
import { type UseDraggableReturn, VueDraggable } from "vue-draggable-plus";

const el = ref<UseDraggableReturn>();
const isDisabled = ref(true);
const emit = defineEmits<(e: "updateSortArr", id: number[]) => void>();

export interface Props {
  party: Player[];
}

const props = withDefaults(defineProps<Props>(), {});

const onUpdate = () => {
  emit(
    "updateSortArr",
    Object.values(jobList.value)
      .flat()
      .map((v) => v.id)
  );
};

const roles: {
  name: Role;
  color: string;
}[] = [
  { name: "tank", color: "blue" },
  { name: "healer", color: "green" },
  { name: "dps", color: "red" },
  { name: "crafter", color: "yellow" },
  { name: "gatherer", color: "purple" },
  { name: "none", color: "gray" },
];
function isJobInParty(job: number) {
  return props.party.find((v) => v.job === job);
}
const allJobs = Util.getBattleJobs3();
const rolesKeys: Role[] = [
  "tank",
  "healer",
  "dps",
  "crafter",
  "gatherer",
  "none",
];
const jobsList: {
  [K in Role]: number[];
} = (() => {
  const res = {} as Record<Role, number[]>;
  const funcMap = {
    tank: Util.isTankJob,
    healer: Util.isHealerJob,
    dps: Util.isDpsJob,
    crafter: Util.isCraftingJob,
    gatherer: Util.isGatheringJob,
  };
  for (const role of rolesKeys) {
    res[role] = (role === "none" ? [] : allJobs.filter((v) => funcMap[role](v)))
      .map((v) => Util.jobToJobEnum(v))
      .sort((a, b) => Util.enumSortMethod(a, b));
  }
  return res;
})();
const jobsListAll = Object.values(jobsList).flat();
const jobs = jobsListAll.map((v) => {
  return {
    name: Util.nameToFullName(Util.jobEnumToJob(v)).simple1,
    id: v,
  };
});

const jobList: RemovableRef<
  Record<
    Role,
    {
      name: string;
      id: number;
    }[]
  >
> = useStorage(
  "cactbotRuntime-jobList",
  (() => {
    const res = {} as Record<Role, { name: string; id: number }[]>;
    for (const role of rolesKeys) {
      res[role] = jobs
        .filter((v) => jobsList[role].includes(v.id))
        .sort(
          (a, b) => jobsList[role].indexOf(a.id) - jobsList[role].indexOf(b.id)
        );
    }
    return res;
  })()
);
</script>

<style scoped>
* {
  user-select: none;
}
.ghost {
  opacity: 0.5;
  background: #c8ebfb;
}
.bg-blue {
  background-color: rgba(29, 78, 216, 0.75);
}
.bg-green {
  background-color: rgba(21, 128, 61, 0.75);
}
.bg-red {
  background-color: rgba(185, 28, 28, 0.75);
}
</style>
