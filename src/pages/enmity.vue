<script setup lang="ts">
import type { EventMap, Party } from 'cactbot/types/event'
import Util, { iconToJobEnum } from '@/utils/util'
import NetRegexes from '../../cactbot/resources/netregexes'
import {
  addOverlayListener,
  callOverlayHandler,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'

interface CombatantState {
  OwnerID: number
  Type: number
  MonsterType: number
  Status: number
  AggressionStatus: number
  IsTargetable: boolean
  Name: string
  Radius: number
  BNpcID: number
  CurrentMP: number
  IsCasting1: number
  BNpcNameID: number
  TransformationId: number
  WeaponId: number
  TargetID: number
  ModelStatus: number
  ID: number
  Job: number
  CurrentHP: number
  MaxHP: number
  PosX: number
  PosY: number
  PosZ: number
  Heading: number
  Distance: null
  EffectiveDistance: null
  Effects: Effect[]
  MaxMP: number
  Level: number
  WorldID: number
  CurrentWorldID: number
  NPCTargetID: number
  CurrentGP: number
  MaxGP: number
  CurrentCP: number
  MaxCP: number
  PCTargetID: number
  IsCasting2: number
  CastBuffID: number
  CastTargetID: number
  CastGroundTargetX: number
  CastGroundTargetY: number
  CastGroundTargetZ: number
  CastDurationCurrent: number
  CastDurationMax: number
  PartyType: number
  WorldName: string
}

interface Effect {
  BuffID: number
  Stack: number
  Timer: number
  ActorID: number
  isOwner: boolean
}

let povCharID = 0
const party: Ref<Party[]> = ref([])
const actReady = ref(false)
const params = useUrlSearchParams('hash')
const dev = params.dev === '1'
const noEnmity = ref(false)
const TANK_JOBS = [
  iconToJobEnum.Paladin,
  iconToJobEnum.Warrior,
  iconToJobEnum.DarkKnight,
  iconToJobEnum.Gunbreaker,
]
const TANK_STATUS_IDS = [
  2843, // Paladin - Iron Will
  3124, // Warrior - Defiance
  743, // Dark Knight - Grit
  1833, // Gunbreaker - Royal Guard
]

function checkAct(): Promise<void> {
  if (dev)
    return Promise.resolve()
  return new Promise((resolve) => {
    callOverlayHandler({ call: 'cactbotRequestState' }).then(() => {
      actReady.value = true
      resolve()
    })
    setTimeout(() => {
      if (!actReady.value) {
        checkAct()
      }
    }, 3000)
  })
}

let intervalTimer: NodeJS.Timeout | undefined
let timeoutTimer: NodeJS.Timeout | undefined
const netRegexs = {
  countdown: NetRegexes.countdown(),
  countdownCancel: NetRegexes.countdownCancel(),
  wipe: NetRegexes.network6d({ command: ['40000010', '4000000F'] }),
  inCombat: NetRegexes.inCombat(),
}

async function getEnmityCombatants() {
  const data = await callOverlayHandler({ call: 'getCombatants' })
  const partyCombatState: CombatantState[] = data.combatants.filter(c =>
    party.value.some(p => Number.parseInt(p.id, 16) === c.ID && p.inParty),
  ) as unknown as CombatantState[]
  const povJob = partyCombatState.find(c => c.ID === povCharID)?.Job
  if (povJob === undefined) {
    console.error('未找到玩家职业')
    clearTimers()
    noEnmity.value = false
    return Promise.reject(new Error('未找到玩家职业'))
  }
  if (!TANK_JOBS.includes(povJob)) {
    // 玩家不是T
    clearTimers()
    noEnmity.value = false
    return Promise.reject(new Error('玩家不是坦克职业'))
  }
  // 玩家是T
  const enmityTanks = partyCombatState.filter(c =>
    c.Effects.some(e => TANK_STATUS_IDS.includes(e.BuffID)),
  )
  return { enmityTanks, partyCombatState }
}

function checkInterval() {
  clearTimers()
  intervalTimer = setInterval(() => {
    // 倒计时中持续检查
    getEnmityCombatants()
      .then(({ enmityTanks }) => {
        if (enmityTanks.length === 0) {
          // 没人开盾 文字提醒开盾
          noEnmity.value = true
          return
        }
        // 有人开盾（无论是谁）
        noEnmity.value = false
      })
      .catch(() => {
        noEnmity.value = false
      })
  }, 500)
}

function clearTimers() {
  if (timeoutTimer)
    clearTimeout(timeoutTimer)
  if (intervalTimer)
    clearInterval(intervalTimer)
}

function say(text: string) {
  callOverlayHandler({ call: 'cactbotSay', text })
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  const countdown = netRegexs.countdown.exec(e.rawLine)?.groups?.countdownTime
  if (countdown !== undefined) {
    checkInterval()
    timeoutTimer = setTimeout(
      () => {
        // 倒计时10秒
        getEnmityCombatants()
          .then(({ enmityTanks }) => {
            if (enmityTanks.length === 2) {
              // 2个T开盾 语音提示
              say('双T都开盾了')
            }
            if (enmityTanks.length === 0) {
              // 0个T开盾 语音提示
              say('没人开盾')
            }
          })
          .catch(() => {
            noEnmity.value = false
          })
      },
      (Number.parseInt(countdown) - 10) * 1000,
    )
  }
  else if (netRegexs.countdownCancel.test(e.rawLine)) {
    // 倒计时取消
    clearTimers()
    noEnmity.value = false
  }
  else if (netRegexs.wipe.test(e.rawLine)) {
    // 团灭
    clearTimers()
    noEnmity.value = false
  }
  else if (netRegexs.inCombat.test(e.rawLine)) {
    // 战斗开始
    if (!(params.stRemind !== 'false')) {
      return
    }
    const { inACTCombat, inGameCombat } = netRegexs.inCombat.exec(e.rawLine)!.groups || {}
    if (inACTCombat === '1' && inGameCombat === '1') {
      checkInterval()
      timeoutTimer = setTimeout(() => {
        getEnmityCombatants()
          .then(({ enmityTanks, partyCombatState }) => {
            // 如果小队内有2个坦克，且另一个坦克开盾了，且你没有开盾
            const partyTanksLength = partyCombatState.filter(v => Util.isTankJob(Util.jobEnumToJob(v.Job))).length
            if (partyTanksLength === 2 && enmityTanks.length === 1 && enmityTanks[0].ID !== povCharID) {
              say('ST开盾')
            }
          })
          .catch(() => {
            noEnmity.value = false
          })
      }, 20000)
    }
  }
}

const handlePartyChanged: EventMap['PartyChanged'] = (e) => {
  party.value = e.party
}

const handleChangePrimaryPlayer: EventMap['ChangePrimaryPlayer'] = (e) => {
  povCharID = e.charID
}

onMounted(() => {
  checkAct()
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('PartyChanged', handlePartyChanged)
  addOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
})

onUnmounted(() => {
  if (intervalTimer)
    clearInterval(intervalTimer)
  if (timeoutTimer)
    clearTimeout(timeoutTimer)
  removeOverlayListener('LogLine', handleLogLine)
  removeOverlayListener('PartyChanged', handlePartyChanged)
  removeOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
})
</script>

<template>
  <el-card v-if="!actReady || dev">
    <h1>{{ "在 ACT 中添加本页面作为数据统计悬浮窗" }}</h1>
  </el-card>
  <strong v-show="noEnmity">没人开盾</strong>
</template>

<style scoped lang="scss">
strong {
  overflow: hidden;
  color: red;
  font-size: 120px;
  text-align: center;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  user-select: none;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
}
</style>
