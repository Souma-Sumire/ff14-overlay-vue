<script setup lang="ts">
import type { EventMap, Party } from 'cactbot/types/event'
import Util from '@/utils/util'
import NetRegexes from '../../cactbot/resources/netregexes'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'
import { useZone, type ContentUsedType } from '@/composables/useZone'

const { zoneType } = useZone()

const TANK_STATUS_IDS = [
  '4F', // Paladin - Iron Will
  '5B', // Warrior - Defiance
  '2E7', // Dark Knight - Grit
  '729', // Gunbreaker - Royal Guard
] as const

const netRegexs = {
  gainsEffect: NetRegexes.gainsEffect({ effectId: TANK_STATUS_IDS }),
  losesEffect: NetRegexes.losesEffect({ effectId: TANK_STATUS_IDS }),
}
const state = reactive({
  party: [] as Party[],
  povCharID: '0',
  status: new Set<string>(),
})

const EffectiveZoneTypes: ContentUsedType[] = [
  'Savage', // 零式
  'Extreme', // 歼殛战
  'Chaotic', // 诛灭战
  'Ultimate', // 绝境战
  'DeepDungeonExtras', // 妖宫诗想
  // 'OccultCrescent', // 新月岛
  // 'SaveTheQueen', // 神佑女王（BZY）
  'Dungeons', // 四人副本
  'Raids', // 大型任务
  'Trials', // 讨伐任务
  'VCDungeonFinder', // 多变迷宫
  'DeepDungeons', // 深层迷宫
  'Guildhests', // 行会令
  // 'DisciplesOfTheLand', // 出海垂钓、云冠群岛
  // 'Eureka', // 尤雷卡
  // 'SocietyQuests', // 宇宙探索
  // 'GrandCompany', // 金蝶游乐场
  // 'QuestBattles', // 任务剧情
  'TreasureHunt', // 挖宝
  // 'Pvp', // PVP
  // 'Default', // 其他
] as const

const noEnmity = computed(() => {
  if (!EffectiveZoneTypes.includes(zoneType.value)) {
    return false
  }
  const tanks = state.party.filter((p) =>
    Util.isTankJob(Util.jobEnumToJob(p.job))
  )
  const playerIsTank = tanks.some((p) => p.id === state.povCharID)
  if (tanks.length === 0 || state.party.length === 1 || !playerIsTank) {
    return false
  }
  return !tanks.some((t) => state.status.has(t.id))
})

const handlePartyChanged: EventMap['PartyChanged'] = (e) => {
  state.party = e.party.slice()
  state.status.forEach((id) => {
    if (!state.party.some((p) => p.id === id)) {
      state.status.delete(id)
    }
  })
}

const handleChangePrimaryPlayer: EventMap['ChangePrimaryPlayer'] = (e) => {
  state.povCharID = e.charID.toString(16).toUpperCase()
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  const gains = netRegexs.gainsEffect.exec(e.rawLine)
  if (gains) {
    const id = gains.groups?.targetId
    if (id) {
      state.status.add(id)
    }
    return
  }
  const loses = netRegexs.losesEffect.exec(e.rawLine)
  if (loses) {
    const id = loses.groups?.targetId
    if (id) {
      state.status.delete(id)
    }
    return
  }
}

onMounted(() => {
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('PartyChanged', handlePartyChanged)
  addOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
})

onUnmounted(() => {
  removeOverlayListener('LogLine', handleLogLine)
  removeOverlayListener('PartyChanged', handlePartyChanged)
  removeOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
})
</script>

<template>
  <CommonActWrapper>
    <strong v-show="noEnmity">{{ $t('enmity.no_enmity_active') }}</strong>
  </CommonActWrapper>
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
