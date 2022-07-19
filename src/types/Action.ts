export type IActionData = [string, number, number, number, number, boolean, number, number, number, boolean, boolean];
export type IAction = {
  Id: number;
  Name: string;
  Icon: number;
  ActionCategory: number;
  ClassJob: string;
  ClassJobLevel: number;
  IsRoleAction: boolean;
  Cast100ms: number;
  Recast100ms: number;
  MaxCharges: number;
  IsPvP: boolean;
  IsPlayerAction: boolean;
  Url?: string;
};
export enum ActionEnum {
  "Name",
  "Icon",
  "ActionCategory",
  "ClassJob",
  "ClassJobLevel",
  "IsRoleAction",
  "Cast100ms",
  "Recast100ms",
  "MaxCharges",
  "IsPvP",
  "IsPlayerAction",
}
// export type IActionOptions = {
//   Id?: number;
//   Name?: string;
//   Icon?: number;
//   ActionCategory?: ActionCategoryEnum;
//   ClassJob?: number;
//   ClassJobLevel?: number;
//   IsRoleAction?: boolean;
//   Cast100ms?: number;
//   Recast100ms?: number;
//   MaxCharges?: number;
//   IsPvP?: boolean;
//   IsPlayerAction?: boolean;
// };
// export enum ActionEnum {
//   Id,
//   Name,
//   Icon,
//   ActionCategory,
//   ClassJob,
//   ClassJobLevel,
//   IsRoleAction,
//   Cast100ms,
//   Recast100ms,
//   MaxCharges,
//   IsPvP,
//   IsPlayerAction,
// }
export enum ActionCategoryEnum {
  自动攻击 = 1,
  魔法 = 2,
  战技 = 3,
  能力 = 4,
  道具 = 5,
  采集能力 = 6,
  制作能力 = 7,
  任务 = 8,
  极限技 = 9,
  系统 = 10,
  弩炮 = 11,
  坐骑 = 12,
  特殊技能 = 13,
  道具操作 = 14,
  奋战技 = 15,
}
