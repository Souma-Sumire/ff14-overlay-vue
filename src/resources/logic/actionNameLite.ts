import { BAKED_ACTION_META_LITE_BY_ID } from '@/resources/generated/bakedActionMetaLite'
import { actionId2ClassJobLevel } from './action2ClassJobLevel'

let cachedActionList: Array<{ id: number, name: string }> | null = null

function getActionNameLite(id: number): string | undefined {
  const normalized = Number.isFinite(id) && id > 0 ? Math.trunc(id) : 0
  if (normalized <= 0)
    return undefined
  return BAKED_ACTION_META_LITE_BY_ID[normalized]?.name
}

function getCachedActionList() {
  if (!cachedActionList) {
    cachedActionList = Object.entries(BAKED_ACTION_META_LITE_BY_ID)
      .map(([id, row]) => {
        const idNumber = Number(id)
        if (!actionId2ClassJobLevel(idNumber))
          return null
        const name = typeof row?.name === 'string' ? row.name.trim() : ''
        if (!name)
          return null
        return { id: idNumber, name }
      })
      .filter((item): item is { id: number, name: string } => item !== null)
  }
  return cachedActionList
}

function searchActionNamesLite(query: string, limit = 100): Array<{ id: number, name: string }> {
  if (!query)
    return []

  const q = query.toLowerCase()
  const result: Array<{ id: number, name: string }> = []
  const list = getCachedActionList()

  for (const item of list) {
    if (item.name.toLowerCase().includes(q) || String(item.id).includes(q)) {
      result.push(item)
      if (result.length >= limit)
        break
    }
  }

  return result
}

export { getActionNameLite, searchActionNamesLite }
