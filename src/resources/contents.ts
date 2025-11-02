import type { CascaderOption } from 'element-plus'
import ContentType from '../../cactbot/resources/content_type'
import { ZoneInfo } from './zoneInfo'
import { getCactbotLocaleMessage } from '@/composables/useLang'

export function useZoneOptions(t: (key: string) => string) {
  const groupedZoneOptions = computed(() => {
    const contentTypeLabel: { type: number; label: string }[] = [
      { type: ContentType.Dungeons, label: t('zoneSelect.dungeons') },
      { type: ContentType.Trials, label: t('zoneSelect.trials') },
      { type: ContentType.Raids, label: t('zoneSelect.raids') },
      {
        type: ContentType.ChaoticAllianceRaid,
        label: t('zoneSelect.chaoticAllianceRaid'),
      },
      { type: ContentType.UltimateRaids, label: t('zoneSelect.ultimateRaids') },
      {
        type: ContentType.VCDungeonFinder,
        label: t('zoneSelect.vcDungeonFinder'),
      },
      {
        type: ContentType.DeepDungeonExtras,
        label: t('zoneSelect.deepDungeonExtras'),
      },
      { type: ContentType.DeepDungeons, label: t('zoneSelect.deepDungeons') },
      {
        type: ContentType.DisciplesOfTheLand,
        label: t('zoneSelect.disciplesOfTheLand'),
      },
      { type: ContentType.Eureka, label: t('zoneSelect.eureka') },
      { type: ContentType.SaveTheQueen, label: t('zoneSelect.saveTheQueen') },
      {
        type: ContentType.OccultCrescent,
        label: t('zoneSelect.occultCrescent'),
      },
    ]
    const options: CascaderOption[] = []
    contentTypeLabel.forEach((ct) => {
      if (ct.type === ContentType.Trials) {
        options.push({
          label: ct.label,
          value: ContentType.Trials,
          children: [
            {
              label: t('zoneSelect.trialExtreme'),
              value: '歼殛战',
              children: [],
            },
            {
              label: t('zoneSelect.trialUnreal'),
              value: '幻巧战',
              children: [],
            },
            {
              label: t('zoneSelect.trialNormal'),
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
              label: t('zoneSelect.raidSavage'),
              value: '零式',
              children: [],
            },
            {
              label: t('zoneSelect.raidNormal'),
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
          `[${+v.exVersion + 2}.0] ` + getCactbotLocaleMessage(v.name)
        if (v.contentType === ContentType.Trials) {
          const trialsOptions = options.find(
            (ct) => ct.value === ContentType.Trials
          )
          if (!trialsOptions) return

          let targetCategoryValue = '歼灭战'
          if (
            v.name.en.includes('(Extreme)') ||
            v.name.ja?.startsWith('極') ||
            v.name.fr?.includes('(extrême)')
          ) {
            targetCategoryValue = '歼殛战'
          } else if (v.name.en.includes('(Unreal)')) {
            targetCategoryValue = '幻巧战'
          }

          const categoryNode = trialsOptions.children!.find(
            (ct) => ct.value === targetCategoryValue
          )
          if (categoryNode) {
            categoryNode.children!.push({ value, label })
          }
        } else if (v.contentType === ContentType.Raids) {
          const raidsOptions = options.find(
            (ct) => ct.value === ContentType.Raids
          )
          if (!raidsOptions) return

          const targetCategoryValue = v.name.en.includes('(Savage)')
            ? '零式'
            : '普通'

          const categoryNode = raidsOptions.children!.find(
            (ct) => ct.value === targetCategoryValue
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
      // 未分类区域
      label: t('zoneSelect.uncategorized'),
      value: '0',
    })

    return options.sort((a, b) => {
      const aIndex = contentTypeLabel.findIndex((ct) => ct.label === a.label)
      const bIndex = contentTypeLabel.findIndex((ct) => ct.label === b.label)
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
    })
  })
  return { groupedZoneOptions }
}
