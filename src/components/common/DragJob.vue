<script setup lang="ts">
import type { RemovableRef } from '@vueuse/core'
import type { UseDraggableReturn } from 'vue-draggable-plus'
import type { Role } from '../../../cactbot/types/job'
import type { Player } from '@/types/partyPlayer'
import { ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import Util from '@/utils/util'

const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits<(e: 'updateSortArr', id: number[]) => void>()
const el = ref<UseDraggableReturn>()
const isDisabled = ref(true)
const free = ref(false)

export interface Props {
  party: Player[]
}

const roles: {
  role: Role
  color: string
}[] = [
  { role: 'tank', color: 'blue' },
  { role: 'healer', color: 'green' },
  { role: 'dps', color: 'red' },
  { role: 'crafter', color: 'yellow' },
  { role: 'gatherer', color: 'purple' },
  { role: 'none', color: 'gray' },
]

function isJobInParty(job: number) {
  return props.party.find(v => v.job === job)
}
const allJobs = Util.getBattleJobs3()
const jobsList: {
  [K in Role]: number[];
} = (() => {
  const res = {} as Record<Role, number[]>
  const funcMap = {
    tank: Util.isTankJob,
    healer: Util.isHealerJob,
    dps: Util.isDpsJob,
    crafter: Util.isCraftingJob,
    gatherer: Util.isGatheringJob,
  }
  for (const role of roles.map(v => v.role)) {
    res[role] = (role === 'none' ? [] : allJobs.filter(v => funcMap[role](v)))
      .map(v => Util.jobToJobEnum(v))
      .sort((a, b) => Util.enumSortMethod(a, b))
  }
  return res
})()
const jobsListAll = Object.values(jobsList).flat()
const jobs = jobsListAll.map((v) => {
  return {
    name: Util.nameToFullName(Util.jobEnumToJob(v)).simple1,
    job: v,
  }
})
const jobList: RemovableRef<
  Record<
    Role,
    {
      name: string
      job: number
    }[]
  >
> = useStorage(
  'cactbotRuntime-job-list',
  (() => {
    const res = {} as Record<Role, { name: string, job: number }[]>
    for (const role of roles.map(v => v.role)) {
      res[role] = jobs
        .filter(v => jobsList[role].includes(v.job))
        .sort(
          (a, b) =>
            jobsList[role].indexOf(a.job) - jobsList[role].indexOf(b.job),
        )
    }
    return res
  })(),
)

if (jobList.value.dps.findIndex(v => v.job === 41) === -1) {
  jobList.value.dps.push({ name: '蛇', job: 41 })
}
if (jobList.value.dps.findIndex(v => v.job === 42) === -1) {
  jobList.value.dps.push({ name: '绘', job: 42 })
}

function onUpdate() {
  emit(
    'updateSortArr',
    Object.values(jobList.value)
      .flat()
      .map(v => v.job),
  )
}

onMounted(() => {
  onUpdate()
})
</script>

<template>
  <div flex="~ col" style="position: relative">
    <el-checkbox
      v-model="free"
      size="small"
      style="
        position: absolute;
        top: 0.25rem;
        right: 0.25rem;
        background: rgba(30, 30, 30, 0.33);
        color: white;
        padding: 0 3px;
        margin: 0;
        font-size:12px;
        height: 1.5em;
        box-shadow: 0 0 2px black;
      "
    >
      解除限制
    </el-checkbox>
    <VueDraggable
      v-for="(role, index) in roles"
      :key="index"
      ref="el"
      v-model="jobList[role.role]"
      :disabled="!isDisabled"
      :animation="150"
      ghost-class="ghost"
      class="p-0 m-b-0.25 m-t-0.25 flex flex-row gap-0.25 rounded"
      filter=".no-draggable"
      :force-fallback="true"
      @update="onUpdate"
    >
      <div
        v-for="item in jobList[role.role]"
        v-show="
          !!props.party.find((v) => v.job === 36) ? true : item.job !== 36
        "
        :key="item.job"
        :class="`${
          free || isJobInParty(item.job)
            ? `draggable bg-${role.color} cursor-move`
            : 'no-draggable bg-gray-700/50 opacity-75'
        } rounded p-l-0.6 p-r-0.6 p-t-0 p-b-0.3 m-0 color-white`"
      >
        {{ item.name }}
      </div>
    </VueDraggable>
  </div>
</template>

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
