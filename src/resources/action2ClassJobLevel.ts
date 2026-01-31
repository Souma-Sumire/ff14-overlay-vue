let action2ClassJobLevelMap: Map<string, any> | null = null

async function initAction2ClassJobLevel() {
  if (action2ClassJobLevelMap) return
  const module = await import('./action2ClassJobLevel.json')
  action2ClassJobLevelMap = new Map(Object.entries(module.default))
}

function actionId2ClassJobLevel(id: number): string | undefined {
  return action2ClassJobLevelMap?.get(id.toString())
}

export { actionId2ClassJobLevel, initAction2ClassJobLevel }
