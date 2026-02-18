import action2ClassJobLevelMapRaw from './action2ClassJobLevel.json'
import { resolveActionMinLevel } from './actionMinLevel'

const action2ClassJobLevelMap: Map<string, any> = new Map(Object.entries(action2ClassJobLevelMapRaw))

function actionId2ClassJobLevel(id: number): string | undefined {
  const raw = action2ClassJobLevelMap.get(id.toString())
  if (raw === undefined)
    return undefined
  return String(resolveActionMinLevel(raw, { actionId: id, fallback: 1 }))
}

export { actionId2ClassJobLevel }
