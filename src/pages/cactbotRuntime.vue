<script setup lang="ts">
import type { PlayerRuntime } from '@/types/partyPlayer'
import type { Role } from '../../cactbot/types/job'
import Util, { jobEnumOrder } from '@/utils/util'
import { VxeUI } from 'vxe-table'
import {
  addOverlayListener,
  callOverlayHandler,
} from '../../cactbot/resources/overlay_plugin_api'
import 'animate.css'

VxeUI.setTheme('dark')

// const aprilFoolSDay = ref(
//   new Date().getMonth() === 3 && new Date().getDate() === 1
// );

function createRPArr(r: 'T' | 'H' | 'D' | 'C' | 'G' | 'N', l: number, start: number = 0) {
  return Array.from({ length: l }, () => r).map((v, i) => v + (+i + 1 + start))
}

const dialogVisible = ref(false)
const defaultSortArray = useStorage('cactbotRuntime-sortArr', jobEnumOrder)

const fakeParty: PlayerRuntime[] = [
  { id: '10000001', name: '虚构战士', job: 21, inParty: true },
  { id: '10000002', name: '虚构骑士', job: 19, inParty: true },
  { id: '10000003', name: '虚构占星', job: 33, inParty: true },
  { id: '10000004', name: '虚构学者', job: 28, inParty: true },
  { id: '10000005', name: '虚构忍者', job: 30, inParty: true },
  { id: '10000006', name: '虚构武士', job: 34, inParty: true },
  { id: '10000008', name: '虚构诗人', job: 23, inParty: true },
  { id: '10000007', name: '虚构召唤', job: 27, inParty: true },
]
const data = useStorage('cactbotRuntime-data', { party: [] as PlayerRuntime[] })
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
const isDev = location.href.includes('localhost')
const mouseEnter = ref(false)
const playerName = ref(isDev ? fakeParty[2].name : '')

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
    (a, b) =>
      defaultSortArray.value.indexOf(a.job)
      - defaultSortArray.value.indexOf(b.job),
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
    (a, b) => sortArr.indexOf(a.rp ?? 'unknown') - sortArr.indexOf(b.rp ?? 'unknown'),
  )
  callOverlayHandler({
    call: 'broadcast',
    source: 'soumaRuntimeJS',
    msg: { party: data.value.party },
  })
}

function onMouseOver(): void {
  mouseEnter.value = true
}

function onMouseOut(): void {
  mouseEnter.value = false
}

function updateSortArr(arr: number[]) {
  defaultSortArray.value = arr
  updateData()
}

function getJobName(job: number) {
  return Util.nameToFullName(Util.jobEnumToJob(job)).simple1
}

function getPlayerName(name: string) {
  return name
}

function updateData() {
  defaultPartySort()
  updateRoleSelectLength()
  broadcastParty()
}

onMounted(() => {
  broadcastParty()
  addOverlayListener('PartyChanged', (e) => {
    if (showTips.value)
      dialogVisible.value = true

    if (isDev && e.party.length === 0)
      return
    data.value.party = e.party
      .filter(v => v.inParty)
      .map((p) => {
        return { ...p, rp: 'unknown' }
      })
    updateData()
  })
  addOverlayListener('ChangePrimaryPlayer', (e) => {
    if (!isDev)
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
  // startOverlayEvents();
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
  <div @mouseenter="onMouseOver" @mouseleave="onMouseOut">
    <span v-show="data.party.length <= 1" class="text-white text-shadow-sm text-shadow-color-black">...</span>
    <vxe-modal
      v-model="dialogVisible" size="small" :position="{
        left: 10,
        top: 10,
      }" width="90vw" @close="
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
          ? `${18 + +(data.party.find((v) => v.job === 36) ? 1 : 0)}em`
          : '4em',
      }"
    >
      <div class="players">
        <transition-group
          name="animate__animated animate__bounce" enter-active-class="animate__fadeInLeft"
          leave-active-class="animate__fadeOutLeft"
        >
          <section
            v-for="(member, i) in data.party" v-show="data.party.length > 1
              && (mouseEnter || member.name === playerName)
            " :key="member.id" flex="~ nowrap" :style="{
              opacity: mouseEnter ? 1 : 0.5,
            }" class="player"
          >
            <vxe-select v-model="member.rp" size="mini" class-name="select" @change="handleSelectChange(i)">
              <vxe-option v-for="(item, index) in getOptions(member.job)" :key="index" :value="item" :label="item" />
            </vxe-select>
            <!-- <span class="name" :class="aprilFoolSDay ? 'aprilFoolSDay' : ''"> -->
            <span class="name">
              {{ getJobName(member.job) }}
              {{ mouseEnter ? getPlayerName(member.name) : "" }}
            </span>
          </section>
        </transition-group>
      </div>
      <DragJob v-show="mouseEnter" :party="data.party" m-b-1 p-1 @update-sort-arr="updateSortArr" />
    </main>
    <div v-if="isDev" style="position: fixed; bottom: 0">
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
        --vxe-ui-input-height-mini: $line-height;
        --vxe-ui-font-color: white;
        --vxe-ui-layout-background-color: rgba(12, 12, 12, 0.9);
        --vxe-ui-input-placeholder-color: white;

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
          background: none;
        }

        :deep(.vxe-input--suffix-icon) {
          height: $line-height;
          line-height: $line-height;
          background: none;
          padding-right: 0;
        }

        :deep(.vxe-icon-caret-down) {
          background: none;
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
