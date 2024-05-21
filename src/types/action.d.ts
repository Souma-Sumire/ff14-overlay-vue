export type IActionData = [
  string,
  number,
  number,
  number,
  number,
  boolean,
  number,
  number,
  number,
  boolean,
  boolean,
]
export interface IAction {
  Id: number
  Name: string
  Icon: number
  ActionCategory: number
  ClassJob: string
  ClassJobLevel: number
  IsRoleAction: boolean
  Cast100ms: number
  Recast100ms: number
  MaxCharges: number
  IsPvP: boolean
  IsPlayerAction: boolean
  Url?: string
}
