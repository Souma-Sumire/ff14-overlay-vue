import LZString from 'lz-string'
import actionChineseZipped from './actionChinese.json'

const actionChinese = LZString.decompressFromBase64(actionChineseZipped)

const actionChineseMap = new Map(Object.entries(actionChinese))

function getActionChinese(id: number): string | undefined {
  return actionChineseMap.get(id.toString())
}

export { actionChinese, getActionChinese }
