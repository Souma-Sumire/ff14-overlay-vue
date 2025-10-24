import type { CascaderOption } from 'element-plus'
import ContentType from '../../cactbot/resources/content_type'
import { ZoneInfo } from './zoneInfo'

const contentTypeLabel: { type: number; label: string }[] = [
  { type: ContentType.Dungeons, label: '四人迷宫' },
  { type: ContentType.Trials, label: '讨伐歼灭战' },
  { type: ContentType.Raids, label: '大型任务' },
  { type: ContentType.ChaoticAllianceRaid, label: '诛灭战' },
  { type: ContentType.UltimateRaids, label: '绝境战' },
  { type: ContentType.VCDungeonFinder, label: '多变迷宫' },
  { type: ContentType.DeepDungeonExtras, label: '深宫诗想' },
  { type: ContentType.DeepDungeons, label: '深层迷宫' },
  { type: ContentType.DisciplesOfTheLand, label: '采集/垂钓' },
  { type: ContentType.Eureka, label: '尤雷卡' },
  { type: ContentType.SaveTheQueen, label: '博兹雅' },
  { type: ContentType.OccultCrescent, label: '新月岛' },
]

const groupedZoneOptions = computed(() => {
  const options: CascaderOption[] = []
  contentTypeLabel.forEach((ct) => {
    if (ct.type === ContentType.Trials) {
      options.push({
        label: ct.label,
        value: ContentType.Trials,
        children: [
          {
            label: '歼殛战',
            value: '歼殛战',
            children: [],
          },
          {
            label: '幻巧战',
            value: '幻巧战',
            children: [],
          },
          {
            label: '歼灭战',
            value: '歼灭战',
            children: [],
          },
        ],
      })
    } else if (ct.type === ContentType.Raids) {
      options.push({
        label: ct.label,
        value: ContentType.Raids,
        children: [
          {
            label: '零式',
            value: '零式',
            children: [],
          },
          {
            label: '普通',
            value: '普通',
            children: [],
          },
        ],
      })
    } else
      options.push({
        label: ct.label,
        value: ct.type,
        children: [],
      })
  })

  Object.entries(ZoneInfo)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => {
      if (a.exVersion !== b.exVersion) return b.exVersion - a.exVersion
      if (
        a.contentType === ContentType.Raids &&
        b.contentType === ContentType.Raids &&
        b.name.ja &&
        a.name.ja
      ) {
        return a.name.ja.localeCompare(b.name.ja)
      }
      return Number(a.id) - Number(b.id)
    })
    .filter(
      (v) =>
        !v.name.en.startsWith('(') &&
        v.contentType &&
        contentTypeLabel.some((ct) => ct.type === v.contentType)
    )
    .forEach((v) => {
      const value = v.id
      const label =
        `[${+v.exVersion + 2}.0] ` +
        (v.name?.cn ?? `${v.name.en} / ${v.name.ja}`)
      if (v.contentType === ContentType.Trials) {
        const trialsOptions = options.find(
          (ct) => ct.value === ContentType.Trials
        )
        if (!trialsOptions) return

        let targetCategory = '歼灭战'
        if (
          v.name.en.includes('(Extreme)') ||
          v.name.ja?.startsWith('極') ||
          v.name.fr?.includes('(extrême)')
        ) {
          targetCategory = '歼殛战'
        } else if (v.name.en.includes('(Unreal)')) {
          targetCategory = '幻巧战'
        }

        const categoryNode = trialsOptions.children!.find(
          (ct) => ct.value === targetCategory
        )
        if (categoryNode) {
          categoryNode.children!.push({ value, label })
        }
      } else if (v.contentType === ContentType.Raids) {
        const raidsOptions = options.find(
          (ct) => ct.value === ContentType.Raids
        )
        if (!raidsOptions) return

        const targetCategory = v.name.en.includes('(Savage)') ? '零式' : '普通'
        const categoryNode = raidsOptions.children!.find(
          (ct) => ct.value === targetCategory
        )
        if (categoryNode) {
          categoryNode.children!.push({ value, label })
        }
      } else {
        const contentNode = options.find((ct) => ct.value === v.contentType)
        if (contentNode) {
          contentNode.children!.push({ value, label })
        }
      }
    })

  options.push({
    label: '未分类区域',
    value: '0',
  })

  return options.sort((a, b) => {
    const aIndex = contentTypeLabel.findIndex((ct) => ct.label === a.label)
    const bIndex = contentTypeLabel.findIndex((ct) => ct.label === b.label)
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })
})

export { contentTypeLabel, groupedZoneOptions }
