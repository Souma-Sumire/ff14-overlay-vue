import { getMapIDByTerritoryType } from "../resources/contentFinderCondition";

export function doTextCommand(text: string) {
  return callOverlayHandler({ call: "PostNamazu", c: "DoTextCommand", p: text });
}
export function doWayMarks(json: PPJSON) {
  return callOverlayHandler({ call: "PostNamazu", c: "DoWaymarks", p: JSON.stringify(json) });
}

export function doInsertPreset(mapID: string, json: PPJSON, slot: Slot = 5) {
  json.MapID = getMapIDByTerritoryType(Number(mapID));
  json.Name = `Slot${slot}`;
  return callOverlayHandler({ call: "PostNamazu", c: "DoInsertPreset", p: JSON.stringify(json) });
}
export function doQueueActions(queue: PostNamazuQueueAction) {
  queue.forEach((v) => {
    if (typeof v.p === "object") v.p = JSON.stringify(v.p);
  });
  return callOverlayHandler({
    call: "PostNamazu",
    c: "DoQueueActions",
    p: queue,
  });
}
