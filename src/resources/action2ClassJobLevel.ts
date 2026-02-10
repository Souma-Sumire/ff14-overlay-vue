import action2ClassJobLevelMapRaw from './action2ClassJobLevel.json'

const action2ClassJobLevelMap: Map<string, any> = new Map(Object.entries(action2ClassJobLevelMapRaw))

function actionId2ClassJobLevel(id: number): string | undefined {
  return action2ClassJobLevelMap.get(id.toString())
}

export { actionId2ClassJobLevel }
