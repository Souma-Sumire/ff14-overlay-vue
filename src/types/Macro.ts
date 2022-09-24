export type MacroType = "macro" | "place";

interface Macro {
  Name: string;
  Type: MacroType;
  Editable?: boolean;
}
export interface MacroInfoMacro extends Macro {
  Type: "macro";
  Text: string;
}
export interface MacroInfoPlace extends Macro {
  Type: "place";
  Place: PPJSON;
}
export type ZoneIdInfo = Record<string, (MacroInfoMacro | MacroInfoPlace)[]>;
interface WayMarkInfo {
  X: number;
  Y: number;
  Z: number;
  Active: boolean;
  ID?: number;
}
export interface PPJSON {
  Name?: string;
  MapID?: number;
  A: WayMarkInfo;
  B: WayMarkInfo;
  C: WayMarkInfo;
  D: WayMarkInfo;
  One: WayMarkInfo;
  Two: WayMarkInfo;
  Three: WayMarkInfo;
  Four: WayMarkInfo;
}
