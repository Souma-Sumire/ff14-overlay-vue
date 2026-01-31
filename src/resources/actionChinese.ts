import { actionId2ClassJobLevel, initAction2ClassJobLevel } from './action2ClassJobLevel'
import { shallowRef } from 'vue'

let rawActionChinese: Record<string, string> | null = null
export const actionResourcesLoaded = shallowRef(false)
let cachedActionList: Array<{ id: number; name: string }> | null = null
let loadingPromise: Promise<void> | null = null

async function initActionChinese() {
  if (rawActionChinese) return
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    try {
      const [module] = await Promise.all([
        import('./actionChinese.json'),
        initAction2ClassJobLevel()
      ])
      rawActionChinese = module.default
      actionResourcesLoaded.value = true
    } catch (e) {
      console.error('Failed to init action chinese:', e)
      throw e
    } finally {
      loadingPromise = null
    }
  })()
  return loadingPromise
}

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
      .filter((item): item is { id: number; name: string } => item !== null)
  }
  return cachedActionList || []
}

function getActionChinese(id: number): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  actionResourcesLoaded.value
  return rawActionChinese?.[id]
}

function searchActions(query: string, limit: number = 100): Array<{ id: number; name: string }> {
  if (!query || !rawActionChinese) return []
  
  const list = getCachedActionList()
  const result: Array<{ id: number; name: string }> = []
  const q = query.toLowerCase()
  
  for (const item of list) {
    if (item.name.toLowerCase().includes(q) || item.id.toString().includes(q)) {
      result.push(item)
      if (result.length >= limit) break
    }
  }
  return result
}

export { getActionChinese, searchActions, initActionChinese }
