import type { EventMap } from '../../cactbot/types/event'
import { onMounted, onUnmounted, ref } from 'vue'
import { ZoneInfo } from '@/resources/zoneInfo'
import ContentType from '../../cactbot/resources/content_type'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'

const CONTENT_TYPES = [
  'Savage', // 零式
  'Extreme', // 歼殛战
  'Chaotic', // 诛灭战
  'Ultimate', // 绝境战
  'OccultCrescent', // 新月岛
  'Dungeons', // 四人副本
  'Raids', // 大型任务
  'Trials', // 讨伐任务
  'VCDungeonFinder', // 多变迷宫
  'DeepDungeons', // 深层迷宫
  'Guildhests', // 行会令
  'DisciplesOfTheLand', // 出海垂钓、云冠群岛
  'Eureka', // 尤雷卡
  'SocietyQuests', // 宇宙探索
  'GrandCompany', // 金蝶游乐场
  'QuestBattles', // 任务剧情
  'TreasureHunt', // 挖宝
  'Pvp', // PVP
  'Default', // 其他
] as const

type ContentUsedType = (typeof CONTENT_TYPES)[number]

function getZoneType(zoneInfo: (typeof ZoneInfo)[number]): ContentUsedType {
  const contentType = zoneInfo.contentType
  const zoneNameFr = zoneInfo.name?.fr
  const zoneNameEn = zoneInfo.name?.en

  switch (contentType) {
    case ContentType.ChaoticAllianceRaid:
      return 'Chaotic'
    case ContentType.UltimateRaids:
      return 'Ultimate'
    case ContentType.Pvp:
      return 'Pvp'
    case ContentType.Dungeons:
      return 'Dungeons'
    case ContentType.DeepDungeons:
      return 'DeepDungeons'
    case ContentType.VCDungeonFinder:
      return 'VCDungeonFinder'
    case ContentType.Trials:
      if (zoneNameFr?.includes('(extrême)')) return 'Extreme'
      return 'Trials'
    case ContentType.Raids:
      if (zoneNameEn?.includes('(Savage)')) return 'Savage'
      return 'Raids'
    case ContentType.DisciplesOfTheLand:
      return 'DisciplesOfTheLand'
    case ContentType.Eureka:
      return 'Eureka'
    case ContentType.GrandCompany:
      return 'GrandCompany'
    case ContentType.QuestBattles:
      return 'QuestBattles'
    case ContentType.TreasureHunt:
      return 'TreasureHunt'
    case ContentType.SocietyQuests:
      return 'SocietyQuests'
    case ContentType.OccultCrescent:
      return 'OccultCrescent'
    default:
      return 'Default'
  }
}

function useZone() {
  const zoneType = ref<ContentUsedType>('Default')
  const zoneID = ref(0)

  const handleChangeZone: EventMap['ChangeZone'] = (e) => {
    zoneID.value = e.zoneID
    const zoneInfo = ZoneInfo[zoneID.value]
    if (!zoneInfo) {
      zoneType.value = 'Default'
      return
    }
    zoneType.value = getZoneType(zoneInfo)
  }

  onMounted(() => {
    addOverlayListener('ChangeZone', handleChangeZone)
  })

  onUnmounted(() => {
    removeOverlayListener('ChangeZone', handleChangeZone)
  })

  return {
    zoneID,
    zoneType,
  }
}

export { CONTENT_TYPES, type ContentUsedType, useZone }
