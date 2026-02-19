import { actionId2ClassJobLevel } from './action2ClassJobLevel'
import actionChineseRaw from './generated/actionChinese.json'

const rawActionChinese: Record<string, string> = actionChineseRaw
let cachedActionList: Array<{ id: number, name: string }> | null = null

function getCachedActionList() {
  if (!cachedActionList && rawActionChinese) {
    // Only cache when needed for searching
    cachedActionList = Object.entries(rawActionChinese)
      .map(([id, name]) => {
        const idNumber = Number(id)
        if (actionId2ClassJobLevel(idNumber)) {
          return { id: idNumber, name }
        }
        return null
      })
      .filter((item): item is { id: number, name: string } => item !== null)
  }
  return cachedActionList || []
}

function getActionChinese(id: number): string | undefined {
  return rawActionChinese[id]
}

function searchActions(query: string, limit: number = 100): Array<{ id: number, name: string }> {
  if (!query || !rawActionChinese)
    return []

  const list = getCachedActionList()
  const result: Array<{ id: number, name: string }> = []
  const q = query.toLowerCase()

  for (const item of list) {
    if (item.name.toLowerCase().includes(q) || item.id.toString().includes(q)) {
      result.push(item)
      if (result.length >= limit)
        break
    }
  }
  return result
}

export { getActionChinese, searchActions }
