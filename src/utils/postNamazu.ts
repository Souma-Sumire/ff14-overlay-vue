import type { PPJSON, QueueArr, Slot, WayMarkObj } from '@/types/PostNamazu'
import { callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'
import { getMapIDByTerritoryType } from '../resources/contentFinderCondition'

export async function doTextCommand(text: string) {
  try {
    const res = await Promise.race([
      callOverlayHandler({
        call: 'PostNamazu',
        c: 'DoTextCommand',
        p: text,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PostNamazu response timeout')), 500),
      ),
    ])
    return res
  }
  catch (e) {
    console.error('PostNamazu DoTextCommand failed:', e)
    throw e
  }
}
export async function doWayMarks(
  json: WayMarkObj,
  localOnly: boolean = true,
) {
  try {
    const res = await Promise.race([
      callOverlayHandler({
        call: 'PostNamazu',
        c: 'DoWaymarks',
        p: JSON.stringify({ ...json, LocalOnly: localOnly }),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PostNamazu response timeout')), 500),
      ),
    ])
    return res
  }
  catch (e) {
    console.error('PostNamazu DoWaymarks failed:', e)
    throw e
  }
}

export async function doInsertPreset(
  mapID: number,
  json: WayMarkObj,
  slot: Slot = 1,
) {
  const ppJson: PPJSON = {
    ...json,
    MapID: getMapIDByTerritoryType(mapID),
    Name: `Slot${slot}`,
  }
  try {
    const res = await Promise.race([
      callOverlayHandler({
        call: 'PostNamazu',
        c: 'DoInsertPreset',
        p: JSON.stringify(ppJson),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PostNamazu response timeout')), 500),
      ),
    ])
    return res
  }
  catch (e) {
    console.error('PostNamazu DoInsertPreset failed:', e)
    throw e
  }
}

export async function doQueueActions(queue: QueueArr) {
  try {
    const res = await Promise.race([
      callOverlayHandler({
        call: 'PostNamazu',
        c: 'DoQueueActions',
        p: JSON.stringify(queue),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PostNamazu response timeout')), 500),
      ),
    ])
    return res
  }
  catch (e) {
    console.error('PostNamazu DoQueueActions failed:', e)
    throw e
  }
}
