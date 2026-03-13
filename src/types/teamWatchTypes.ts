import type { DynamicValue } from "@/types/dynamicValue";

interface TeamWatchActionMetaBase<TValue> {
  id: number;
  name: string;
  iconId: number;
  actionCategory: number;
  recast1000ms: TValue;
  duration: TValue;
  maxCharges: TValue;
  classJobLevel: number;
}

export type TeamWatchActionMetaRaw = TeamWatchActionMetaBase<DynamicValue>;

export type TeamWatchActionMeta = TeamWatchActionMetaBase<number> & {
  iconSrc: string;
};

export interface TeamWatchStorageData {
  watchJobsActionsIDUser: Record<number, number[]>;
  sortRuleUser: number[];
  actionMetaUser: Record<number, TeamWatchActionMetaRaw>;
}

export interface TeamWatchSkillView {
  rawActionId: number;
  resolvedActionId: number;
  trackedActionId: number;
  runtimeKey: string;
  meta: TeamWatchActionMeta;
}

export interface TeamWatchMemberView {
  id: string;
  name: string;
  job: number;
  level: number;
  skills: TeamWatchSkillView[];
}
