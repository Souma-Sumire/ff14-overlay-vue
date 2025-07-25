<script setup lang="ts">
import type { Role } from '../../cactbot/types/job'
import type { PlayerRuntime } from '@/types/partyPlayer'
import { useDark } from '@vueuse/core'
import { useDevMode } from '@/composables/useDevMode'
import Util from '@/utils/util'
import {
  addOverlayListener,
  callOverlayHandler,
} from '../../cactbot/resources/overlay_plugin_api'
import 'animate.css'

const mouseEnter = ref(false)

function createRPArr(
  r: 'T' | 'H' | 'D' | 'C' | 'G' | 'N',
  l: number,
  start: number = 0,
) {
  return Array.from({ length: l }, () => r).map((v, i) => v + (+i + 1 + start))
}

const dialogVisible = ref(false)
const sortArray = useStorage('cactbotRuntime-sortArr', [] as number[])

const fakeParty: PlayerRuntime[] = [
  { id: '10000001', name: '虚构暗骑', job: 32, inParty: true },
  { id: '10000002', name: '虚构骑士', job: 19, inParty: true },
  { id: '10000003', name: '虚构占星', job: 33, inParty: true },
  { id: '10000004', name: '虚构学者', job: 28, inParty: true },
  { id: '10000005', name: '虚构忍者', job: 30, inParty: true },
  { id: '10000006', name: '虚构龙骑', job: 22, inParty: true },
  { id: '10000008', name: '虚构舞者', job: 38, inParty: true },
  { id: '10000007', name: '虚构画家', job: 42, inParty: true },
]
const data = useStorage('cactbotRuntime-data', {
  party: [] as PlayerRuntime[],
})
const showTips = useStorage('cactbotRuntime-showTips', ref(true))
const roleSelectLength = useStorage('cactbotRuntime-roleSelectLength', {
  tank: 0,
  healer: 0,
  dps: 0,
  crafter: 0,
  gatherer: 0,
  none: 0,
} as Record<Role, number>)
const roleAssignLocationNames = {
  tank: ['MT', 'ST', ...createRPArr('T', 6, 2)],
  healer: [...createRPArr('H', 8)],
  dps: [...createRPArr('D', 8)],
  crafter: [...createRPArr('C', 8)],
  gatherer: [...createRPArr('G', 8)],
  none: [...createRPArr('N', 8)],
} as Record<Role, string[]>

function updateRoleSelectLength(): void {
  for (const role in roleSelectLength.value) {
    if (Object.prototype.hasOwnProperty.call(roleSelectLength.value, role)) {
      roleSelectLength.value[role as Role] = data.value.party.reduce(
        (p, c) => (getJobClassification(c.job) === role ? p + 1 : p),
        0,
      )
    }
  }
}
function getOptions(job: number) {
  const classification = getJobClassification(job)
  return roleAssignLocationNames[classification].filter((_v, i) => {
    return i < roleSelectLength.value[classification]
  })
}
const dev = useDevMode()
const playerName = ref(dev.value ? fakeParty[2].name : '')

function getJobClassification(job: number): Role {
  if ([1, 3, 19, 21, 32, 37].includes(job))
    return 'tank'
  if ([6, 24, 28, 33, 40].includes(job))
    return 'healer'
  if (
    [
      2,
      4,
      5,
      7,
      20,
      22,
      23,
      25,
      26,
      27,
      29,
      30,
      31,
      34,
      35,
      36,
      38,
      39,
      41,
      42,
    ].includes(job)
  ) {
    return 'dps'
  }

  if (Util.isCraftingJob(Util.jobEnumToJob(job)))
    return 'crafter'
  if (Util.isGatheringJob(Util.jobEnumToJob(job)))
    return 'gatherer'
  return 'none'
}

function defaultPartySort() {
  data.value.party.sort(
    (a, b) => sortArray.value.indexOf(a.job) - sortArray.value.indexOf(b.job),
  )
  for (const v of data.value.party) {
    v.rp = undefined
  }
  // 2次循环不能合并
  for (const v of data.value.party) {
    v.rp = getRP(v)
  }
}

function handleSelectChange(i: number): void {
  const t = data.value.party.find(
    v => v.rp === data.value.party[i].rp && v.id !== data.value.party[i].id,
  )
  if (t) {
    t.rp = getRP(t)
  }
  broadcastParty()
}

function getRP(player: PlayerRuntime): string {
  return (
    roleAssignLocationNames[getJobClassification(player.job)].find(
      role => !data.value.party.find(v => v.rp === role),
    ) ?? 'unknown'
  )
}

function broadcastParty(): void {
  const sortArr = [
    ...roleAssignLocationNames.tank,
    ...roleAssignLocationNames.healer,
    ...roleAssignLocationNames.dps,
    ...roleAssignLocationNames.crafter,
    ...roleAssignLocationNames.gatherer,
    ...roleAssignLocationNames.none,
  ]
  data.value.party.sort(
    (a, b) =>
      sortArr.indexOf(a.rp ?? 'unknown') - sortArr.indexOf(b.rp ?? 'unknown'),
  )
  callOverlayHandler({
    call: 'broadcast',
    source: 'soumaRuntimeJS',
    msg: { party: data.value.party },
  })
}

function updateSortArr(arr: number[]) {
  sortArray.value = arr
  updateData()
}

function getJobName(job: number) {
  return Util.nameToFullName(Util.jobEnumToJob(job)).simple1
}

function updateData() {
  defaultPartySort()
  updateRoleSelectLength()
  broadcastParty()
}

onMounted(() => {
  const isDark = useDark({ storageKey: 'cactbot-runtime-theme' })
  const toggleDark = useToggle(isDark)
  if (isDark.value === false) {
    // 固定使用深色主题
    toggleDark()
  }
  document.body.addEventListener('mouseenter', () => (mouseEnter.value = true))
  document.body.addEventListener(
    'mouseleave',
    () => (mouseEnter.value = false),
  )
  broadcastParty()
  addOverlayListener('PartyChanged', (e) => {
    if (showTips.value)
      dialogVisible.value = true

    if (dev.value && e.party.length === 0)
      return
    data.value.party = e.party
      .filter(v => v.inParty)
      .map((p) => {
        return { ...p, rp: 'unknown' }
      })
    updateData()
  })
  addOverlayListener('ChangePrimaryPlayer', (e) => {
    if (!dev.value)
      playerName.value = e.charName
  })
  addOverlayListener('BroadcastMessage', (e) => {
    if (
      e.source === 'soumaUserJS'
      && typeof e.msg === 'object'
      && e.msg !== null
      && Reflect.get(e.msg, 'text') === 'requestData'
    ) {
      broadcastParty()
    }
  })
})

function testParty() {
  const e = { party: fakeParty }
  if (showTips.value)
    dialogVisible.value = true

  data.value.party = e.party
    .filter(v => v.inParty)
    .map((p) => {
      return { ...p, rp: 'unknown' }
    })
  updateData()
}
</script>

<template>
  <CommonActWrapper>
    <div class="cactbot-runtime">
      <el-dialog
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
        <template #header>
          <span>用法</span>
        </template>
        <template #default>
          <p>使悬浮窗的位置分配对应游戏内的实际位置（D1D2等）</p>
          <ul>
            <li>临时：下拉选择框修改。</li>
            <li>长期：用鼠标拖动职能顺序。</li>
          </ul>
        </template>
      </el-dialog>
      <main>
        <div v-if="!mouseEnter" class="you">
          {{ data.party.find((v) => v.name === playerName)?.rp ?? "" }}
        </div>
        <div v-else class="players">
          <section
            v-for="(member, i) in data.party"
            :key="member.id"
            class="player"
            :class="{ 'is-you': member.name === playerName }"
          >
            <el-select
              v-model="member.rp"
              size="small"
              class="select"
              fit-input-width
              placement="right"
              :offset="8"
              @change="handleSelectChange(i)"
            >
              <el-option
                v-for="(item, index) in getOptions(member.job)"
                :key="index"
                :value="item"
                :label="item"
              />
            </el-select>
            <span class="job-name">{{ getJobName(member.job) }}</span>
            <span v-if="mouseEnter" class="player-name">{{ member.name }}</span>
          </section>
          <CommonDragJob
            v-if="mouseEnter"
            class="drag-job"
            :party="data.party"
            p-1
            @update-sort-arr="updateSortArr"
          />
        </div>
      </main>
      <div v-if="dev" style="position: fixed; bottom: 0">
        <button
          @click=" {
            data.party = data.party.filter((v) => v.name === playerName);
            updateData();
          }
          "
        >
          测试单人
        </button>
        <button @click="testParty">
          测试组队
        </button>
      </div>
    </div>
  </CommonActWrapper>
</template>

<style scoped lang="scss">
:global(body) {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

// el-select 选中之后的文本
:global(.el-select__placeholder.is-transparent) {
  color: #ffffff;
}

// el-select 布局
:global(.el-select--small .el-select__wrapper) {
  padding: 1px 4px;
}

// el-select 下拉箭头
:global(.el-select__suffix) {
  position: absolute;
  transform: scale(0.8, 1);
  right: 0;
}

// el-select 下拉框整体
:global(.el-select-dropdown__list) {
  padding: 0;
}

// el-option 下拉框选项
:global(.el-select-dropdown__item) {
  padding: 0 0.5em;
  overflow: hidden;
  text-overflow: clip;
}

main {
  padding: 0.3em;
  width: min-content;
  background-color: rgba(255, 255, 255, 0.01);
  font-size: 14px;
}

.cactbot-runtime {
  margin-top: 1.8em;
  user-select: none;
  --el-fill-color-blank: #2d2d2d;

  .job-name,
  .player-name,
  .you {
    font-family: Consolas, "Liberation Mono", Menlo, Courier, monospace;
    color: #e0e0e0;
    text-shadow:
      1px 1px 2px rgba(0, 0, 0, 0.5),
      -1px -1px 2px rgba(0, 0, 0, 0.5),
      1px -1px 2px rgba(0, 0, 0, 0.5),
      -1px 1px 2px rgba(0, 0, 0, 0.5);
  }

  .you {
    color: #ffffff;
  }

  .players {
    width: min-content;
  }

  .player {
    width: min-content;
    display: flex;
    align-items: center;
    padding: 1.5px 2px;
    border-radius: 0.2rem;

    &.is-you {
      background: rgba(0, 122, 255, 0.2);
    }
  }

  .select {
    width: 2.4em;
    margin-right: 0.1em;
  }

  .job-name {
    font-weight: 600;
    margin: 0 0.2em;
    color: #ffffff;
  }

  .player-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #ffffff;
  }
}

.drag-job {
  background-color: rgba(255, 255, 255, 0.01);
  float: left;
}
</style>
