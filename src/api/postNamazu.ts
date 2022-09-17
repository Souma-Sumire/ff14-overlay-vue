import { PlaceMark, WayMark } from "../types/Macro";

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

export function slotWayMark(place: PlaceMark[]): void {
  throw new Error("该方法尚未实现");
}
