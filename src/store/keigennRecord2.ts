import { defineStore } from "pinia";

const DEBUG_SHOW_HEALS = false; // 调试用：主表显示治疗记录
const OPTIONS_STORAGE_KEY = "keigenn-record-2-user-options";

export interface KeigennUserOptions {
  scale: number;
  opacity: number;
  targetType: "icon" | "job";
  iconType: number;
  parseAA: boolean;
  parseDoT: boolean;
  minimize: boolean;
  minimizeStyle: "text" | "icon";
  skillLayout: "matrix" | "group" | "flat";
  singleInBoth: boolean;
  skillIconSizeMatrix: number;
  skillIconSizeGroup: number;
  skillIconSizeFlat: number;
  skillPopoverScale: number;
  amountPopoverScale: number;
  jobOrder: number[];
  jobSkillOrder: Record<number, number[]>;
  actionCN: boolean;
  statusCN: boolean;
  order: "unshift" | "push";
  anonymous: boolean;
}

const DEFAULT_USER_OPTIONS: KeigennUserOptions = {
  scale: 1, // 缩放倍率
  opacity: 0.9, // 透明度
  targetType: "icon", // 显示目标图标
  iconType: 2, // 目标图标类型
  parseAA: true, // 解析自动攻击
  parseDoT: false, // 解析DoT
  minimize: false, // 启动时迷你化
  minimizeStyle: "icon", // 缩小样式：图标+文字 | 单图标
  skillLayout: "matrix", // 冷却弹窗布局：成员矩阵 | 分类分组 | 平铺排序
  singleInBoth: false, // 是否将 single 技能同时显示在自和单
  skillIconSizeMatrix: 24, // 成员矩阵冷却图标大小（px）
  skillIconSizeGroup: 26, // 分类分组冷却图标大小（px）
  skillIconSizeFlat: 26, // 平铺排序冷却图标大小（px）
  skillPopoverScale: 1, // 冷却弹窗独立缩放倍率
  amountPopoverScale: 1, // 伤害详情弹窗独立缩放倍率
  jobOrder: [], // 自定义职业排序（空数组表示使用默认顺序）
  jobSkillOrder: {}, // 自定义各职业冷却技能排序
  actionCN: true, // action显示中文化
  statusCN: true, // status显示中文化
  order: "unshift", // 数据排列顺序
  anonymous: false, // 匿名模式（玩家名替换为职业名）
};

function createDefaultUserOptions(): KeigennUserOptions {
  return {
    ...DEFAULT_USER_OPTIONS,
    jobOrder: [],
    jobSkillOrder: {},
  };
}

const USER_OPTION_KEYS = Object.keys(DEFAULT_USER_OPTIONS) as (keyof KeigennUserOptions)[];

function parseJsonIfString(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function parseNumberArray(v: unknown): number[] {
  const raw = parseJsonIfString(v);
  if (!Array.isArray(raw)) return [];
  const result: number[] = [];
  const seen = new Set<number>();
  for (const item of raw) {
    const num = Number(item);
    if (Number.isInteger(num) && num >= 0 && !seen.has(num)) {
      seen.add(num);
      result.push(num);
    }
  }
  return result;
}

function parseJobSkillOrder(v: unknown): Record<number, number[]> {
  const raw = parseJsonIfString(v);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<number, number[]> = {};
  for (const [k, list] of Object.entries(raw as Record<string, unknown>)) {
    const jobEnum = Number(k);
    if (!Number.isInteger(jobEnum) || jobEnum <= 0) continue;
    const ids = parseNumberArray(list);
    if (ids.length > 0) result[jobEnum] = ids;
  }
  return result;
}

function parseParams<T>(v: unknown, def: T): T {
  if (v === undefined || v === null || v === "") return def;
  if (typeof def === "boolean") {
    if (typeof v === "boolean") return v as T;
    if (typeof v !== "string") return def;
    const str = v.toLowerCase();
    if (str === "0" || str === "false") return false as T;
    if (str === "1" || str === "true") return true as T;
    return def;
  }
  if (typeof def === "number") {
    const num = Number(v);
    return Number.isFinite(num) ? (num as T) : def;
  }
  if (typeof def === "string") {
    return typeof v === "string" ? (v as T) : def;
  }
  if (Array.isArray(def)) {
    return parseNumberArray(v) as T;
  }
  if (typeof def === "object") {
    return parseJobSkillOrder(v) as T;
  }
  return def;
}

function clampIntOption(val: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(val) || val <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.round(val)));
}

function normalizeUserOptions(options: KeigennUserOptions): KeigennUserOptions {
  if (
    options.skillLayout !== "matrix" &&
    options.skillLayout !== "group" &&
    options.skillLayout !== "flat"
  ) {
    options.skillLayout = DEFAULT_USER_OPTIONS.skillLayout;
  }
  options.skillIconSizeMatrix = clampIntOption(
    options.skillIconSizeMatrix,
    DEFAULT_USER_OPTIONS.skillIconSizeMatrix,
    16,
    32,
  );
  options.skillIconSizeGroup = clampIntOption(
    options.skillIconSizeGroup,
    DEFAULT_USER_OPTIONS.skillIconSizeGroup,
    18,
    40,
  );
  options.skillIconSizeFlat = clampIntOption(
    options.skillIconSizeFlat,
    DEFAULT_USER_OPTIONS.skillIconSizeFlat,
    18,
    40,
  );
  if (!Number.isFinite(options.skillPopoverScale) || options.skillPopoverScale <= 0) {
    options.skillPopoverScale = DEFAULT_USER_OPTIONS.skillPopoverScale;
  } else {
    options.skillPopoverScale = Math.min(3, Math.max(0.4, options.skillPopoverScale));
  }
  if (!Number.isFinite(options.amountPopoverScale) || options.amountPopoverScale <= 0) {
    options.amountPopoverScale = DEFAULT_USER_OPTIONS.amountPopoverScale;
  } else {
    options.amountPopoverScale = Math.min(3, Math.max(0.4, options.amountPopoverScale));
  }
  options.jobOrder = parseNumberArray(options.jobOrder);
  options.jobSkillOrder = parseJobSkillOrder(options.jobSkillOrder);
  return options;
}

function loadStoredUserOptions(): KeigennUserOptions {
  const result = createDefaultUserOptions();
  try {
    const raw = localStorage.getItem(OPTIONS_STORAGE_KEY);
    if (!raw) return result;
    const parsed = JSON.parse(raw) as Partial<Record<keyof KeigennUserOptions, unknown>>;
    if (!parsed || typeof parsed !== "object") return result;
    for (const key of USER_OPTION_KEYS) {
      if (parsed[key] !== undefined) {
        (result[key] as unknown) = parseParams(parsed[key], DEFAULT_USER_OPTIONS[key]);
      }
    }
  } catch {
    // 忽略本地存储读取异常
  }
  return normalizeUserOptions(result);
}

function persistUserOptions(options: KeigennUserOptions) {
  try {
    localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options));
  } catch {
    // 忽略本地存储写入异常
  }
}

function getHashParts() {
  const hash = window.location.hash || "";
  const qIndex = hash.indexOf("?");
  if (qIndex === -1) {
    return { path: hash, params: new URLSearchParams() };
  }
  return {
    path: hash.slice(0, qIndex),
    params: new URLSearchParams(hash.slice(qIndex + 1)),
  };
}

function applyUrlOptionsTo(target: KeigennUserOptions): boolean {
  const { path, params } = getHashParts();
  let updated = false;

  for (const key of USER_OPTION_KEYS) {
    if (!params.has(key)) continue;
    const raw = params.get(key);
    (target[key] as unknown) = parseParams(raw, DEFAULT_USER_OPTIONS[key]);
    params.delete(key);
    updated = true;
  }

  if (updated) {
    normalizeUserOptions(target);
    persistUserOptions(target);
    const remaining = params.toString();
    const nextHash = remaining ? `${path}?${remaining}` : path;
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}${nextHash}`,
    );
  }

  return updated;
}

export const useKeigennRecord2Store = defineStore("keigennRecord2", {
  state: () => {
    const userOptions = loadStoredUserOptions();
    applyUrlOptionsTo(userOptions);
    return {
      userOptions,
      debugShowHeals: DEBUG_SHOW_HEALS,
      isBrowser: false,
    };
  },
  getters: {},
  actions: {
    saveUserOptions() {
      persistUserOptions(this.userOptions);
    },
    resetUserOptions() {
      Object.assign(this.userOptions, createDefaultUserOptions());
      persistUserOptions(this.userOptions);
    },
    syncUrlOptions() {
      applyUrlOptionsTo(this.userOptions);
    },
    checkIsBrowser() {
      const { params } = getHashParts();
      this.isBrowser =
        !window.OverlayPluginApi && !params.get("OVERLAY_WS") && !params.get("HOST_PORT");
      if (this.isBrowser) setTimeout(() => this.checkIsBrowser(), 1000);
    },
    formatterName(v: string) {
      const global = /^([A-Z])\S+ ([A-Z])\S+/;
      if (global.test(v)) {
        return v.replace(global, "$1.$2");
      }
      return `${v.at(0)}.${v.at(-1)}`;
    },
  },
});
