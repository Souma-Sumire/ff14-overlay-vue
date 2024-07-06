import actionChinese from './actionChinese.json'

const actionChineseMap = new Map(Object.entries(actionChinese))
export function getActionChinese(id: number): string | undefined {
  return actionChineseMap.get(id.toString())
}
