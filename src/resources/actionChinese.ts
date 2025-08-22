import LZString from 'lz-string'
import actionChineseZipped from './actionChinese.json'

const actionChinese = JSON.parse(
  LZString.decompressFromBase64(actionChineseZipped),
) as Record<string, string>

const actionChineseMap = new Map(Object.entries(actionChinese))

function getActionChinese(id: number): string | undefined {
  return actionChineseMap.get(id.toString())
}

export { actionChinese, getActionChinese }
