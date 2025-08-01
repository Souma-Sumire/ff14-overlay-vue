import action2ClassJobLevel from './action2ClassJobLevel.json'

const action2ClassJobLevelMap = new Map(Object.entries(action2ClassJobLevel))

function actionId2ClassJobLevel(id: number): string | undefined {
  return action2ClassJobLevelMap.get(id.toString())
}

export { actionId2ClassJobLevel }
