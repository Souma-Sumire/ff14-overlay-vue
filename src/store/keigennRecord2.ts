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
  return result;
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
