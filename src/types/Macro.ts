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
export interface WayMarkInfo {
  X: number;
  Y: number;
  Z: number;
  Active: boolean;
  ID?: number;
}
export type WayMarkKeys = "A" | "B" | "C" | "D" | "One" | "Two" | "Three" | "Four";
export type WayMarkJSON = Required<{ [key in WayMarkKeys]?: WayMarkInfo }>;

export type PPJSON = WayMarkJSON & { Name?: string; MapID?: number };
