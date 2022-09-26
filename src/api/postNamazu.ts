import { getMapIDByTerritoryType } from "../resources/contentFinderCondition";
import { PPJSON } from "../types/Macro";

export function doTextCommand(text: string): Promise<unknown> {
  return callOverlayHandler({ call: "PostNamazu", c: "DoTextCommand", p: text });
}
export function doWayMark(json: PPJSON): Promise<unknown> {
  return callOverlayHandler({ call: "PostNamazu", c: "place", p: JSON.stringify(json) });
}

export function slotWayMark(mapID: string, json: PPJSON, slot: 1 | 2 | 3 | 4 | 5 = 5): Promise<unknown> {
  json.MapID = getMapIDByTerritoryType(Number(mapID));
  json.Name = `Slot${slot}`;
  return callOverlayHandler({ call: "PostNamazu", c: "DoInsertPreset", p: JSON.stringify(json) });
}
