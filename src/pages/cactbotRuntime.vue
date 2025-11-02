<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import type {
  Player,
  PlayerRuntime as PlayerWithRp,
  Role,
} from '@/types/partyPlayer'
import { VueDraggable } from 'vue-draggable-plus'
import { useDev } from '@/composables/useDev'
import { RandomPartyGenerator } from '@/mock/demoParty'
import { usePartySortStore } from '@/store/partySort'
import Util from '@/utils/util'
import {
  addOverlayListener,
  callOverlayHandler,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'

const usedRole: Role[] = ['tank', 'healer', 'dps'] as const
const storePartySort = usePartySortStore()
const mouseEnter = ref(false)
const dev = useDev()
const generator = new RandomPartyGenerator()
const state = reactive({
  party: [] as Player[],
  partySorted: {
    tank: [] as Player[],
    healer: [] as Player[],
    dps: [] as Player[],
  },
})

function createRPArr(r: 'T' | 'H' | 'D', l: number, start: number = 0) {
  return Array.from({ length: l }, () => r).map((v, i) => v + (+i + 1 + start))
}

const roleAssignLocationNames: Record<Role, string[]> = {
  tank: ['MT', 'ST', ...createRPArr('T', 22, 2)],
  healer: [...createRPArr('H', 24)],
  dps: [...createRPArr('D', 24)],
}

const playerName = ref('')

function broadcast(): void {
  const rps = [
    ...roleAssignLocationNames.tank.slice(0, state.partySorted.tank.length),
    ...roleAssignLocationNames.healer.slice(0, state.partySorted.healer.length),
    ...roleAssignLocationNames.dps.slice(0, state.partySorted.dps.length),
  ]

  const msgParty: PlayerWithRp[] = [
    ...state.partySorted.tank,
    ...state.partySorted.healer,
    ...state.partySorted.dps,
  ].map((v, i) => {
    return { ...v, rp: rps[i] }
  })
  // console.log('广播组队信息', JSON.stringify(msgParty.map(v => (v.name))))
  callOverlayHandler({
    call: 'broadcast',
    source: 'soumaRuntimeJS',
    msg: { party: msgParty },
  })
}

function sortParty() {
  // console.log('原始组队信息', JSON.stringify(state.party.map(v => (v.name))))
  const res = state.party
    .slice()
    .sort(
      (a, b) =>
        storePartySort.arr.indexOf(Util.baseJobEnumConverted(a.job)) -
        storePartySort.arr.indexOf(Util.baseJobEnumConverted(b.job))
    )
  state.partySorted.tank = res.filter((v) =>
    Util.isTankJob(Util.jobEnumToJob(v.job))
  )
  state.partySorted.healer = res.filter((v) =>
    Util.isHealerJob(Util.jobEnumToJob(v.job))
  )
  state.partySorted.dps = res.filter((v) =>
    Util.isDpsJob(Util.jobEnumToJob(v.job))
  )
  broadcast()
}

function onRuleUpdated() {
  sortParty()
}

function onTempRuleUpdate() {
  broadcast()
}

const eventHandlers: {
  mouseEnter: () => void
  mouseLeave: () => void
  partyChanged: EventMap['PartyChanged']
  changePrimaryPlayer: EventMap['ChangePrimaryPlayer']
  broadcastMessage: EventMap['BroadcastMessage']
} = {
  mouseEnter: () => {
    mouseEnter.value = true
  },
  mouseLeave: () => {
    mouseEnter.value = false
  },
  partyChanged: (e) => {
    if (dev.value && e.party.length === 0) return
    state.party = e.party.filter((v) => v.inParty)
    sortParty()
  },
  changePrimaryPlayer: (e) => {
    if (dev.value) {
      return
    }
    playerName.value = e.charName
  },
  broadcastMessage: (e) => {
    if (
      e.source === 'soumaUserJS' &&
      typeof e.msg === 'object' &&
      e.msg !== null &&
      Reflect.get(e.msg, 'text') === 'requestData'
    ) {
      broadcast()
    }
  },
}

onMounted(() => {
  document.body.addEventListener('mouseenter', eventHandlers.mouseEnter)
  document.body.addEventListener('mouseleave', eventHandlers.mouseLeave)
  addOverlayListener('ChangePrimaryPlayer', eventHandlers.changePrimaryPlayer)
  addOverlayListener('PartyChanged', eventHandlers.partyChanged)
  addOverlayListener('BroadcastMessage', eventHandlers.broadcastMessage)
})

onUnmounted(() => {
  document.body.removeEventListener('mouseenter', eventHandlers.mouseEnter)
  document.body.removeEventListener('mouseleave', eventHandlers.mouseLeave)
  removeOverlayListener('PartyChanged', eventHandlers.partyChanged)
  removeOverlayListener(
    'ChangePrimaryPlayer',
    eventHandlers.changePrimaryPlayer
  )
  removeOverlayListener('BroadcastMessage', eventHandlers.broadcastMessage)
})

function testSolo() {
  playerName.value = generator.party.value[0]!.name
  state.party = generator.party.value.filter((v) => v.name === playerName.value)
  sortParty()
}

function testParty() {
  playerName.value = generator.party.value[0]!.name
  state.party = generator.party.value
  sortParty()
}

function testShuffleParty() {
  generator.shuffle({
    dps: 4,
    healer: 2,
    tank: 2,
    crafter: 3,
    gatherer: 3,
    none: 3,
  })
  testParty()
}
</script>

<template>
  <CommonActWrapper>
    <template #readme>
      <span class="demo-text">
        <p>{{ $t('cactbotRuntime.usageLine1') }}</p>
        <ul>
          <li>{{ $t('cactbotRuntime.usageLine2') }}</li>
          <li>{{ $t('cactbotRuntime.usageLine3') }}</li>
        </ul>
      </span>
    </template>
    <div class="cactbot-runtime-container">
      <main>
        <div class="players" flex="~ nowrap gap-1">
          <div class="fixed-rp">
            <div
              v-for="(role, roleIndex) in usedRole"
              :key="`fixed-rp-${role}`"
              class="player-role"
            >
              <div
                v-for="(member, i) in state.partySorted[role]"
                :key="i"
                style="
                  overflow: hidden;
                  white-space: nowrap;
                  text-overflow: ellipsis;
                "
              >
                <span v-show="mouseEnter || member.name === playerName">{{
                  roleAssignLocationNames[role][i]
                }}</span>
              </div>
              <el-divider
                v-if="
                  state.partySorted[role].length > 0 &&
                  roleIndex < 2 &&
                  mouseEnter
                "
              />
            </div>
          </div>
          <div class="fixed-player">
            <VueDraggable
              v-for="(role, index) in usedRole"
              :key="`fixed-player-${role}`"
              v-model="state.partySorted[role]"
              :animation="200"
              ghost-class="ghost"
              :force-fallback="true"
              filter=".no-draggable"
              @update="onTempRuleUpdate"
            >
              <div
                v-for="member in state.partySorted[role]"
                v-show="mouseEnter"
                :key="member.id"
                class="player-line"
              >
                <span>{{ member.name }}</span>
              </div>
              <el-divider
                v-if="
                  state.partySorted[role].length > 0 && index < 2 && mouseEnter
                "
                class="no-draggable"
              />
            </VueDraggable>
          </div>
        </div>
        <div class="drag-job">
          <CommonDragJob
            v-if="mouseEnter"
            :party="state.party"
            @update="onRuleUpdated"
          />
        </div>
      </main>
      <div v-if="dev" style="position: fixed; bottom: 0">
        <button @click="testSolo">
          {{ $t('cactbotRuntime.testSolo') }}
        </button>
        <button @click="testParty">
          {{ $t('cactbotRuntime.testParty') }}
        </button>
        <button @click="testShuffleParty">
          {{ $t('cactbotRuntime.testShuffleParty') }}
        </button>
      </div>
    </div>
  </CommonActWrapper>
</template>

<style scoped lang="scss">
:global(body) {
  overflow: hidden;
}

.demo-text {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  text-shadow: 1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000,
    -1px 1px 1px #000;
  opacity: 1;
  color: lightblue;
  background-color: rgba(20, 20, 20, 0.8);
  padding: 0 0.5em;
  margin: 0em;
  max-width: 24em;
  ul {
    padding-left: 2em;
  }
}

.cactbot-runtime-container {
  padding: 0.2em;
  user-select: none;
  max-width: 18em;
}

.players {
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5), -1px -1px 2px rgba(0, 0, 0, 0.5),
    1px -1px 2px rgba(0, 0, 0, 0.5), -1px 1px 2px rgba(0, 0, 0, 0.5);
  background-color: rgba(0, 0, 0, 0.5);
  width: min-content;
  padding: 0 0em 0 0.2em;
  margin-bottom: 1em;
}

.player-line {
  white-space: nowrap;
  padding-right: 0.4em;
  &:hover {
    cursor: pointer;
  }
}

.drag-job {
  position: relative;
  // 创建一个几乎不可见的区域连接两个区域，以保持hover效果
  &:before {
    content: '';
    position: absolute;
    top: -1em;
    background-color: rgba(0, 0, 0, 0.01);
    z-index: -1;
    width: 8em;
    height: 2em;
  }
  background-color: rgba(0, 0, 0, 0.5);
}

.ghost {
  opacity: 0;
}

.el-divider {
  margin: 0.1em 0;
}
</style>
