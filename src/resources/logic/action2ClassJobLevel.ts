import { BAKED_ACTION_META_LITE_BY_ID } from '@/resources/generated/bakedActionMetaLite'
import { resolveActionMinLevel } from '@/resources/logic/actionMinLevel'

function actionId2ClassJobLevel(id: number): string | undefined {
  const normalized = Number.isFinite(id) && id > 0 ? Math.trunc(id) : 0
  if (normalized <= 0)
    return undefined
  const raw = Number(BAKED_ACTION_META_LITE_BY_ID[normalized]?.classJobLevel ?? 0)
  if (!Number.isFinite(raw) || raw <= 0)
    return undefined
  return String(resolveActionMinLevel(raw, { actionId: id, fallback: 1 }))
}

export { actionId2ClassJobLevel }
