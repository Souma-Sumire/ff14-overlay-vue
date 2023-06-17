<template>
  <div flex="~ col">
    <VueDraggable
      v-for="role in roles"
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
          isJobInParty(item.id) ? `draggable bg-${role.color}` : 'no-draggable bg-gray-700/50'
        } rounded p-l-0.6 p-r-0.6 p-t-0 p-b-0.3 m-0 color-white cursor-move`"
      >
        {{ item.name }}
      </div>
    </VueDraggable>
  </div>
</template>

<script setup lang="ts">
import Util from "@/utils/util";
import { RemovableRef } from "@vueuse/core";
import { ref } from "vue";
import { type UseDraggableReturn, VueDraggable } from "vue-draggable-plus";

const el = ref<UseDraggableReturn>();
const isDisabled = ref(true);
const emit = defineEmits<{
  (e: "updateSortArr", id: number[]): void;
}>();

const props = defineProps<{
  party: Player[];
}>();
// function pause() {
//   el.value?.pause();
// }

// function start() {
//   el.value?.start();
// }

// const onStart = () => {
//   console.log("start");
// };

const onUpdate = () => {
  // console.log("update");
  emit(
    "updateSortArr",
    Object.values(jobList.value)
      .flat()
      .map((v) => v.id),
  );
};

const roles: {
  name: Role;
  color: string;
}[] = [
  { name: "tank", color: "blue" },
  { name: "healer", color: "green" },
  { name: "dps", color: "red" },
];
function isJobInParty(job: number) {
  return props.party.find((v) => v.job === job);
}
const jobsList: {
  [K in Role]: number[];
} = {
  tank: [21, 32, 37, 19],
  healer: [33, 24, 40, 28],
  dps: [34, 30, 39, 22, 20, 38, 23, 31, 25, 27, 35, 36],
  unknown: [],
};
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
> = useStorage("cactbotRuntime-jobList", {
  tank: jobs.filter((v) => jobsList.tank.includes(v.id)).sort((a, b) => jobsList.tank.indexOf(a.id) - jobsList.tank.indexOf(b.id)),
  healer: jobs.filter((v) => jobsList.healer.includes(v.id)).sort((a, b) => jobsList.healer.indexOf(a.id) - jobsList.healer.indexOf(b.id)),
  dps: jobs.filter((v) => jobsList.dps.includes(v.id)).sort((a, b) => jobsList.dps.indexOf(a.id) - jobsList.dps.indexOf(b.id)),
  unknown: [],
});
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
