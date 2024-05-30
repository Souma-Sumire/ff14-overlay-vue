import type { PPJSON } from './PostNamazu'

interface Macro {
  Name: string
  Editable?: boolean
  Deletability?: boolean
}
export interface MacroInfoMacro extends Macro {
  Text: string
}
export interface MacroInfoPlace extends Macro {
  Place: PPJSON
}
export type ZoneIdInfo = Record<string, (MacroInfoMacro | MacroInfoPlace)[]>
