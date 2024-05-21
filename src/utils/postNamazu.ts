import { callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'
import { getMapIDByTerritoryType } from '../resources/contentFinderCondition'
import type { PPJSON, QueueArr, Slot } from '@/types/PostNamazu'

export function doTextCommand(text: string) {
  return callOverlayHandler({
    call: 'PostNamazu',
    c: 'DoTextCommand',
    p: text,
  })
}
export function doWayMarks(json: PPJSON) {
  return callOverlayHandler({
    call: 'PostNamazu',
    c: 'DoWaymarks',
    p: JSON.stringify(json),
  })
}

export function doInsertPreset(mapID: number, json: PPJSON, slot: Slot = 1) {
  json.MapID = getMapIDByTerritoryType(mapID)
  json.Name = `Slot${slot}`
  return callOverlayHandler({
    call: 'PostNamazu',
    c: 'DoInsertPreset',
    p: JSON.stringify(json),
  })
}

export function doQueueActions(queue: QueueArr) {
  return callOverlayHandler({
    call: 'PostNamazu',
    c: 'DoQueueActions',
    p: JSON.stringify(queue),
  })
}
