export type TextType = "macro" | "place";
type WayMarkInfo = {
  X: number;
  Y: number;
  Z: number;
  Active: boolean;
};
export type WayMark = {
  A?: WayMarkInfo;
  B?: WayMarkInfo;
  C?: WayMarkInfo;
  D?: WayMarkInfo;
  One?: WayMarkInfo;
  Two?: WayMarkInfo;
  Three?: WayMarkInfo;
  Four?: WayMarkInfo;
};
export type PlaceMark = {
  Mark: "A" | "B" | "C" | "D" | "One" | "Two" | "Three" | "Four";
  X: number;
  Y: number;
  Z: number;
  ID?: number;
  Active: boolean;
};
export interface MacroInfo {
  name: string;
  type: TextType;
  text?: string;
  place?: PlaceMark[];
  editable?: boolean;
}
export type ZoneIdInfo = Record<string, MacroInfo[]>;
export type postNamazuJSON = {
  Name: "Slot1" | "Slot2" | "Slot3" | "Slot4" | "Slot5";
  MapID: number;
  A: WayMarkInfo;
  B: WayMarkInfo;
  C: WayMarkInfo;
  D: WayMarkInfo;
  One: WayMarkInfo;
  Two: WayMarkInfo;
  Three: WayMarkInfo;
  Four: WayMarkInfo;
};
