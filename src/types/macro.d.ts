import type { PPJSON } from "./PostNamazu";

export type MacroType = "macro" | "place";

interface Macro {
  Name: string;
  Type: MacroType;
  Editable?: boolean;
  Deletability?: boolean;
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
