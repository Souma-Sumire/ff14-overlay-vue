import { getMapIDByTerritoryType } from "../resources/contentFinderCondition";
import { PlaceMark, postNamazuJSON, WayMark } from "../types/Macro";

export function doTextCommand(text: string): void {
  callOverlayHandler({ call: "PostNamazu", c: "DoTextCommand", p: text });
}
export function doWayMark(place: PlaceMark[]): void {
  let waymark: WayMark = {};
  place.map(
    (p) =>
      (waymark[p.Mark] = {
        X: p.X,
        Y: p.Y,
        Z: p.Z,
        Active: p.Active,
      }),
  );
  callOverlayHandler({ call: "PostNamazu", c: "place", p: JSON.stringify(waymark) });
}

export function slotWayMark(mapID: string, place: PlaceMark[], slot: 1 | 2 | 3 | 4 | 5 = 5): void {
  let A = { ...(place.find((v) => v.Mark === "A") ?? { Active: false, X: 0, Y: 0, Z: 0 }) };
  let B = { ...(place.find((v) => v.Mark === "B") ?? { Active: false, X: 0, Y: 0, Z: 0 }) };
  let C = { ...(place.find((v) => v.Mark === "C") ?? { Active: false, X: 0, Y: 0, Z: 0 }) };
  let D = { ...(place.find((v) => v.Mark === "D") ?? { Active: false, X: 0, Y: 0, Z: 0 }) };
  let One = { ...(place.find((v) => v.Mark === "One") ?? { Active: false, X: 0, Y: 0, Z: 0 }) };
  let Two = { ...(place.find((v) => v.Mark === "Two") ?? { Active: false, X: 0, Y: 0, Z: 0 }) };
  let Three = { ...(place.find((v) => v.Mark === "Three") ?? { Active: false, X: 0, Y: 0, Z: 0 }) };
  let Four = { ...(place.find((v) => v.Mark === "Four") ?? { Active: false, X: 0, Y: 0, Z: 0 }) };
  Reflect.deleteProperty(A, "Mark");
  Reflect.deleteProperty(B, "Mark");
  Reflect.deleteProperty(C, "Mark");
  Reflect.deleteProperty(D, "Mark");
  Reflect.deleteProperty(One, "Mark");
  Reflect.deleteProperty(Two, "Mark");
  Reflect.deleteProperty(Three, "Mark");
  Reflect.deleteProperty(Four, "Mark");
  const p: postNamazuJSON = {
    Name: `Slot${slot}`,
    MapID: getMapIDByTerritoryType(Number(mapID)),
    A: A!,
    B: B!,
    C: C!,
    D: D!,
    One: One!,
    Two: Two!,
    Three: Three!,
    Four: Four!,
  };
  callOverlayHandler({ call: "PostNamazu", c: "DoInsertPreset", p: JSON.stringify(p) });
}
