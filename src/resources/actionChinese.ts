import actionChinese from './actionChinese.json'

const actionChineseMap = new Map(Object.entries(actionChinese))

function getActionChinese(id: number): string | undefined {
  return actionChineseMap.get(id.toString())
}

export { actionChinese, getActionChinese }
