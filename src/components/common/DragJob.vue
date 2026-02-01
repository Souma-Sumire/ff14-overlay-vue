<script setup lang="ts">
import type { RemovableRef } from '@vueuse/core'
import type { Role } from '../../../cactbot/types/job'
import type { Player } from '@/types/partyPlayer'
import { VueDraggable } from 'vue-draggable-plus'
import { usePartySortStore } from '@/store/partySort'
import Util from '@/utils/util'

const props = defineProps<{ party: Player[] }>()
const emit = defineEmits<(e: 'update') => void>()
const freeMode = ref(false)

const storePartySort = usePartySortStore()

const ROLES: { role: Role, color: string }[] = [
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

function buildJobsList(): Record<Role, number[]> {
  const roleToFilterFn = {
    tank: Util.isTankJob,
    healer: Util.isHealerJob,
    dps: Util.isDpsJob,
    crafter: Util.isCraftingJob,
    gatherer: Util.isGatheringJob,
  }

  return Object.fromEntries(
    ROLES.map(({ role }) => [
      role,
      role === 'none'
        ? []
        : Util.getBattleJobs3()
            .filter(roleToFilterFn[role])
            .map(Util.jobToJobEnum)
            .sort(Util.enumSortMethod),
    ]),
  ) as Record<Role, number[]>
}

const jobsList = buildJobsList()

const allJobsWithName = Object.values(jobsList)
  .flat()
  .map((v) => {
    return {
      name: Util.jobToFullName(Util.jobEnumToJob(v)).simple1,
      job: v,
    }
  })

const sortableJobList: RemovableRef<
  Record<
    Role,
    {
      name: string
      job: number
    }[]
  >
> = ref(
  (() => {
    const res = {} as Record<Role, { name: string, job: number }[]>
    for (const role of ROLES.map(v => v.role)) {
      res[role] = allJobsWithName
        .filter(v => jobsList[role].includes(v.job))
        .sort(
          (a, b) =>
            storePartySort.arr.indexOf(a.job)
            - storePartySort.arr.indexOf(b.job),
        )
    }
    return res
  })(),
)

function handleJobListUpdate() {
  storePartySort.arr = Object.values(sortableJobList.value)
    .flat()
    .map(v => v.job)
  emit('update')
}
</script>

<template>
  <div flex="~ col" style="position: relative">
    <el-checkbox
      v-model="freeMode"
      size="small"
      style="
        position: absolute;
        top: 0.25rem;
        right: 0.25rem;
        background: rgba(30, 30, 30, 0.33);
        color: white;
        padding: 0 3px;
        margin: 0;
        font-size: 12px;
        height: 1.5em;
        box-shadow: 0 0 2px black;
        z-index: 0;
      "
    >
      {{ $t('dragJob.freeMode') }}
    </el-checkbox>
    <VueDraggable
      v-for="(role, index) in ROLES"
      :key="index"
      v-model="sortableJobList[role.role]"
      :animation="150"
      ghost-class="ghost"
      class="m-b-0.25 m-t-0.25 flex flex-row gap-0.25 rounded p-0"
      filter=".no-draggable"
      :force-fallback="true"
      @update="handleJobListUpdate"
    >
      <div
        v-for="item in sortableJobList[role.role]"
        v-show="
          !!props.party.find((v) => v.job === 36) ? true : item.job !== 36
        "
        :key="item.job"
        :class="`${
          freeMode || isJobInParty(item.job)
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
