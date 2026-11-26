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
  skillIconSize: number;
  skillPopoverScale: number;
  amountPopoverScale: number;
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
  skillIconSize: 28, // 冷却图标大小（px）
  skillPopoverScale: 1, // 冷却弹窗独立缩放倍率
  amountPopoverScale: 1, // 伤害详情弹窗独立缩放倍率
  actionCN: true, // action显示中文化
  statusCN: true, // status显示中文化
  order: "unshift", // 数据排列顺序
  anonymous: false, // 匿名模式（玩家名替换为职业名）
};

const USER_OPTION_KEYS = Object.keys(DEFAULT_USER_OPTIONS) as (keyof KeigennUserOptions)[];

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
  return def;
}

function normalizeUserOptions(options: KeigennUserOptions): KeigennUserOptions {
  if (
    options.skillLayout !== "matrix" &&
    options.skillLayout !== "group" &&
    options.skillLayout !== "flat"
  ) {
    options.skillLayout = DEFAULT_USER_OPTIONS.skillLayout;
  }
  if (!Number.isFinite(options.skillIconSize) || options.skillIconSize <= 0) {
    options.skillIconSize = DEFAULT_USER_OPTIONS.skillIconSize;
  } else {
    options.skillIconSize = Math.min(48, Math.max(16, Math.round(options.skillIconSize)));
  }
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
  return options;
}

function loadStoredUserOptions(): KeigennUserOptions {
  const result: KeigennUserOptions = { ...DEFAULT_USER_OPTIONS };
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
      Object.assign(this.userOptions, DEFAULT_USER_OPTIONS);
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
