import { BAKED_ACTION_META_LITE_BY_ID } from '@/resources/generated/bakedActionMetaLite'
import { resolveActionMinLevel } from '@/resources/logic/actionMinLevel'

function actionId2ClassJobLevel(id: number): string | undefined {
  if (id <= 0)
    return undefined
  const raw = Number(BAKED_ACTION_META_LITE_BY_ID[id]?.classJobLevel ?? 0)
  if (raw <= 0)
    return undefined
  return String(resolveActionMinLevel(raw, { actionId: id, fallback: 1 }))
}

export { actionId2ClassJobLevel }
