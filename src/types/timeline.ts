import type { Job } from "cactbot/types/job";

export interface ITimeline {
  name: string;
  condition: ITimelineCondition;
  timeline: string;
  source: string;
  createdAt: string;
}

export type BossPhase = "door" | "final" | undefined;

export interface ITimelineCondition {
  zoneID: string; // 0=true
  jobs: Job[]; // JobEnum.NONE=true
  phase: BossPhase;
}

export interface ITimelineLine {
  time: number;
  action?: string;
  sync?: RegExp;
  /**
   * syncOnce (运行期控制)
   * 控制当前运行中的时间轴在匹配到该同步行后，后续是否还会重复触发该行的同步。
   * 当某行被匹配同步过一次后，若带有 syncOnce: true，在本次战斗中不会再次触发该行同步。
   */
  syncOnce?: boolean;
  /**
   * battleOnce (生成/导入期控制)
   * 控制从 FFlogs 战斗日志生成时间轴文本时，相同的技能 ID 在整场战斗中是否只生成一次有效的同步行。
   * 一旦该技能被生成为同步行后，后续再在日志中出现该技能时，将只生成为注释行（例如 `# 100 "技能名称"`），防止干扰后续同步。
   */
  battleOnce?: boolean;
  syncAlready?: boolean;
  show: boolean;
  windowBefore: number;
  windowAfter: number;
  jump?: number;
  alertAlready: boolean;
  tts?: string;
  label?: string;
}

export enum TimelineConfigEnum {
  显示范围 = "displayDuration",
  变色时间 = "discoloration",
  零后持续 = "hold",
  战前准备 = "preBattle",
  TTS提前量 = "ttsAdvance",
}

export type TimelineConfigTranslate = Record<TimelineConfigEnum, string>;
export type TimelineConfigValues = Record<TimelineConfigEnum, number>;
export type ShowStyleTranslate = Record<ShowStyleConfigEnum, string>;
export type ShowStyle = Record<ShowStyleConfigEnum, number>;
export enum ShowStyleConfigEnum {
  总缩放 = "--timeline-zoom",
  总宽度 = "--timeline-width",
  未到来缩放 = "--normal-scale",
  即将到来缩放 = "--up-coming-scale",
  字体尺寸 = "--font-size",
  动画时间 = "--tras-duration",
  未到来不透明度 = "--opacity",
}
