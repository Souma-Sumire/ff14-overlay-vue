<script setup lang="ts">
import type { MessageBoxInputData } from "element-plus";
import type { BisPreset } from "@/utils/bisPresets";
import type { BisConfig, BisRow, BisValue, LegacyBisConfig } from "@/utils/bisUtils";
import type { LootRecord } from "@/utils/lootParser";
import {
  ArrowDown,
  CopyDocument,
  Delete,
  InfoFilled,
  List,
  MagicStick,
  Plus,
  QuestionFilled,
  Right,
  Setting,
  User,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from "vue";
import {
  ensureBisCountDefaults,
  ensureBisOffsetDefaults,
  normalizeBisConfigFromModel,
} from "@/composables/useBisConfigSync";
import { getPresetsForRole } from "@/utils/bisPresets";
import {
  isPlayerComplete as checkPlayerComplete,
  DEFAULT_ROWS,
  LAYER_CONFIG,
} from "@/utils/bisUtils";

import { getRoleType, PART_ORDER, ROLE_DEFINITIONS } from "@/utils/lootParser";

import { getCurrentWeekNumber } from "@/utils/raidWeekUtils";
import PlayerDisplay from "./PlayerDisplay.vue";

const props = defineProps<{
  players: string[];
  records: LootRecord[];
  modelValue: BisConfig | LegacyBisConfig | undefined;
  getPlayerRole?: (name: string) => string | null | undefined;
  getActualPlayer?: (p: string) => string;
  showOnlyRole?: boolean;
  getItemSlot?: (name: string) => string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: BisConfig): void;
}>();

const tooltipsOpen = ref<Record<string, boolean>>({});

const showConfigDialog = ref(false);
const showOffsetConfigDialog = ref(false);
const excludedPlayers = ref<Set<string>>(new Set());
const customAllocations = ref<Record<string, string>>({});

const config = ref<BisConfig>({
  playerBis: {},
  needCountOffsets: {},
});
const recordsForCompute = shallowRef<LootRecord[]>([]);
const obtainedDetailsCache = shallowRef<Map<string, { name: string; count: number }[]>>(new Map());
let recordsSyncTimer: ReturnType<typeof setTimeout> | null = null;
let modelEmitTimer: ReturnType<typeof setTimeout> | null = null;

const showImportConfirmDialog = ref(false);
const showPresetConfirmDialog = ref(false);
const importDiffs = ref<PlayerDiff[]>([]);
const pendingPresetData = ref<{
  player: string;
  preset: BisPreset;
  diff: PlayerDiff | null;
} | null>(null);

const STATUS_MAP = {
  pass: { text: "放弃", class: "status-pass" },
  need: { text: "需求", class: "status-need" },
  greed: { text: "贪婪", class: "status-greed-tome" },
  assigned: { text: "分配", class: "status-assigned" },
} as const;
const GROUP_END_ROW_IDS = new Set(["weapon", "feet", "ring"]);
const SPECIAL_ITEM_IDS = new Set(["coating", "twine", "tome", "solvent"]);
const DEFAULT_ROW_BY_ID = new Map(DEFAULT_ROWS.map((row) => [row.id, row] as const));
const COUNT_ROWS = DEFAULT_ROWS.filter((r) => r.type === "count");
const NEED_OFFSET_ROWS = DEFAULT_ROWS.filter((row) => row.id !== "random_weapon");
const PART_ORDER_INDEX = new Map((PART_ORDER as string[]).map((v, i) => [v, i] as const));
const ROW_KEYWORDS_BY_ID = new Map(
  DEFAULT_ROWS.map((row) => {
    const keywords = row.keywords
      .replace(/，/g, ",")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return [row.id, keywords] as const;
  }),
);

type LogicStatus = "need" | "greed" | "pass" | "assigned";
interface LogicDetail {
  status: LogicStatus;
  reason: string;
}
interface ObtainedSummary {
  counts: Record<string, Record<string, number>>;
}
interface CellViewModel {
  obtained: number;
  needed: number;
  statusText: string;
  reason: string;
  cellClass: string;
}
const warnedMissingCellKeys = new Set<string>();

function warnMissingCache(kind: "logic" | "cell", rowId: string, player: string) {
  if (!import.meta.env.DEV) return;
  const key = `${kind}:${rowId}:${player}`;
  if (warnedMissingCellKeys.has(key)) return;
  warnedMissingCellKeys.add(key);
  console.warn(`[BisAllocator] Missing ${kind} cache for row="${rowId}", player="${player}"`);
}

const layeredViewRows = computed(() => {
  return LAYER_CONFIG.map((layer) => {
    const rows = layer.items.map((id) => DEFAULT_ROW_BY_ID.get(id)).filter((r): r is BisRow => !!r);
    return {
      name: layer.name,
      rows,
    };
  });
});

const configRows = [...DEFAULT_ROWS]
  .filter((r) => r.id !== "random_weapon")
  .sort((a, b) => {
    const ia = PART_ORDER_INDEX.get(a.keywords) ?? -1;
    const ib = PART_ORDER_INDEX.get(b.keywords) ?? -1;
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
const offsetLayeredRows = computed(() => {
  return LAYER_CONFIG.map((layer) => {
    const rows = layer.items
      .map((id) => DEFAULT_ROW_BY_ID.get(id))
      .filter((r): r is BisRow => !!r && r.id !== "random_weapon");
    return {
      name: layer.name,
      rows,
    };
  }).filter((layer) => layer.rows.length > 0);
});

const eligiblePlayers = computed(() => {
  return props.players.filter(isEligible);
});
const assignedPlayerSet = computed(() => {
  return new Set(Object.values(customAllocations.value).filter(Boolean));
});
const storageKeyByPlayer = computed(() => {
  const map: Record<string, string> = {};
  for (const player of eligiblePlayers.value) {
    map[player] = getStorageKey(player);
  }
  return map;
});
const presetsByPlayer = computed(() => {
  const map: Record<string, ReturnType<typeof getPresetsForRole>> = {};
  for (const player of eligiblePlayers.value) {
    map[player] = getPresetsForRole(props.getPlayerRole?.(player));
  }
  return map;
});
const firstEligiblePlayerByRole = computed(() => {
  const map: Record<string, string> = {};
  for (const player of eligiblePlayers.value) {
    const role = props.getPlayerRole?.(player);
    if (role && !map[role]) map[role] = player;
  }
  return map;
});

const obtainedSummary = computed<ObtainedSummary>(() => {
  const counts: Record<string, Record<string, number>> = {};

  const ensurePlayer = (player: string) => {
    if (!counts[player]) counts[player] = {};
  };
  const ensureRow = (player: string, rowId: string) => {
    counts[player]![rowId] ??= 0;
  };

  for (const rec of recordsForCompute.value || []) {
    const player = props.getActualPlayer ? props.getActualPlayer(rec.player) : rec.player;
    ensurePlayer(player);
    for (const row of DEFAULT_ROWS) {
      const keywords = ROW_KEYWORDS_BY_ID.get(row.id) || [];
      const matched =
        row.id === "random_weapon"
          ? !!props.getItemSlot && props.getItemSlot(rec.item) === "随武"
          : keywords.some((k) => rec.item.includes(k));
      if (!matched) continue;
      ensureRow(player, row.id);
      counts[player]![row.id] = (counts[player]![row.id] || 0) + 1;
    }
  }

  for (const player of eligiblePlayers.value) {
    ensurePlayer(player);
    for (const row of DEFAULT_ROWS) ensureRow(player, row.id);
  }

  return { counts };
});

const expandedPlayerPresets = ref<Set<string>>(new Set());

const isConfigComplete = computed(() => {
  for (const role of ROLE_DEFINITIONS) {
    if (!checkPlayerComplete(config.value, role)) return false;
  }
  return true;
});

const incompletePlayerCount = computed(() => {
  return ROLE_DEFINITIONS.filter((role) => !checkPlayerComplete(config.value, role)).length;
});

function getMacroInfo() {
  const now = new Date();
  return {
    weekNum: getFF14WeekNumber(),
    dateStr: `${now.getMonth() + 1}月${now.getDate()}日`,
  };
}

function handleCopyAllMacro() {
  const { weekNum, dateStr } = getMacroInfo();
  const lines = [`/p <${dateStr} 第${weekNum}周分配优先级>`];

  layeredViewRows.value.forEach((layer) => {
    lines.push(...generateEquipLines(layer.rows));
  });

  const text = lines.join("\n");
  if (!text) return;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      ElMessage.success(`已复制全层宏 (共${lines.length}行)`);
    })
    .catch(() => {
      ElMessage.error("复制失败");
    });
}

function generateEquipLines(rows: BisRow[]): string[] {
  const lines: string[] = [];
  rows.forEach((row) => {
    // 随武不进入分配宏
    if (row.id === "random_weapon") return;

    const needs: string[] = [];
    const greeds: string[] = [];
    const activePlayers = eligiblePlayers.value.filter((p) => !excludedPlayers.value.has(p));

    // 队长分配具有最高优先级
    if (customAllocations.value[row.id]) {
      const p = customAllocations.value[row.id]!;
      let displayName = props.getPlayerRole?.(p) || p;
      displayName = displayName.replace(/^LEFT:/, "").trim();
      lines.push(`/p ${row.name}：${displayName} (队长分配)`);
      return;
    }

    activePlayers.forEach((p) => {
      let displayName = props.getPlayerRole?.(p) || p;
      displayName = displayName.replace(/^LEFT:/, "").trim();

      const status = getLogicStatus(p, row);
      if (status === "need") {
        needs.push(displayName);
      } else if (status === "greed") {
        greeds.push(displayName);
      }
    });

    let content = "";
    if (needs.length > 0) {
      content = needs.join("、");
    } else if (greeds.length > 0) {
      content = greeds.length === activePlayers.length ? "随便ROLL" : greeds.join("、");
    } else {
      content = "随便ROLL";
    }

    lines.push(`/p ${row.name}：${content}`);
  });
  return lines;
}

function formatMacroLine(line: string): string {
  // 简单的高亮逻辑:
  // 1. /p 变暗
  // 2. 物品名 (冒号前) 变亮
  // 3. 常见职能名变色 (MT/ST/H1/H2/D1-D4)

  let html = line
    .replace(/^(\/p)\s+/, '<span class="macro-cmd">$1</span> ')
    .replace(/^(.+?)：/, '<span class="macro-item">$1</span>：');

  // 高亮职能组
  html = html.replace(/\b(MT|ST)\b/g, '<span class="role-tank">$1</span>');
  html = html.replace(/\b(H1|H2)\b/g, '<span class="role-healer">$1</span>');
  html = html.replace(/\b(D[1-4])\b/g, '<span class="role-dps">$1</span>');

  return html;
}

function getLayerMacroLines(layer: { name: string; rows: BisRow[] }) {
  const { weekNum, dateStr } = getMacroInfo();
  const header = `/p <${dateStr} 第${weekNum}周 ${layer.name}分配>`;
  return [header, ...generateEquipLines(layer.rows)];
}
const layerMacroLinesMap = computed(() => {
  const map: Record<string, string[]> = {};
  for (const layer of layeredViewRows.value) {
    map[layer.name] = getLayerMacroLines(layer);
  }
  return map;
});

function getFF14WeekNumber(): number {
  if (!props.records || props.records.length === 0) return 1;
  return getCurrentWeekNumber(props.records.map((r) => r.timestamp));
}

function handleCopyMacro(command: { name: string; rows: BisRow[] } | "all") {
  if (command === "all") {
    handleCopyAllMacro();
    return;
  }

  const { weekNum, dateStr } = getMacroInfo();
  const lines = [`/p <${dateStr} 第${weekNum}周 ${command.name}分配优先级>`];
  lines.push(...generateEquipLines(command.rows));
  const text = lines.join("\n");
  const message = `已复制 ${command.name} 分配宏`;

  if (!text) return;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      ElMessage.success(message);
    })
    .catch(() => {
      ElMessage.error("复制失败");
    });
}

function isPlayerAssigned(player: string): boolean {
  return assignedPlayerSet.value.has(player);
}

function togglePlayerExclusion(player: string) {
  if (excludedPlayers.value.has(player)) {
    excludedPlayers.value.delete(player);
  } else {
    excludedPlayers.value.add(player);
  }
}

function getStorageKey(player: string): string {
  if (!props.getPlayerRole) return player;
  const role = props.getPlayerRole(player);
  if (role && !role.startsWith("LEFT:")) {
    return role;
  }
  return player;
}

function exportBisData() {
  const parts = ROLE_DEFINITIONS.filter((role) => !!config.value.playerBis[role]).map((role) => {
    const dataBinary = DEFAULT_ROWS.map((row) => {
      const val = config.value.playerBis[role]?.[row.id];
      if (row.type === "toggle") {
        return val === "raid" ? "1" : "0";
      } else {
        return typeof val === "number" && val > 0 ? "1" : "0";
      }
    }).join("");
    const data = Number.parseInt(dataBinary, 2).toString(36);
    return `${role}:${data}`;
  });
  const str = parts.join(";");
  navigator.clipboard.writeText(str).then(() => {
    ElMessage.success("BIS 设置已复制到剪贴板");
  });
}

function importBisData() {
  ElMessageBox.prompt("请粘贴 BIS 设置字符串", "导入 BIS 设置", {
    confirmButtonText: "下一步",
    cancelButtonText: "取消",
    inputType: "textarea",
    inputPlaceholder: "在此粘贴...",
    customClass: "bis-import-message-box",
    inputValidator: (value) => {
      if (!value) return "内容不能为空";
      const { error } = parseBisImportEntries(value);
      return error || true;
    },
  })
    .then((res) => {
      const { value } = res as MessageBoxInputData;
      if (!value) return;
      parseAndPreviewBisData(value);
    })
    .catch(() => {
      // 用户取消
    });
}

interface BisChange {
  label: string;
  oldVal: string;
  newVal: string;
}

interface PlayerDiff {
  name: string;
  role: string;
  isNew: boolean;
  changes: BisChange[];
  newConfig: Record<string, BisValue>;
}

interface ParsedBisImportEntry {
  role: string;
  data: string;
}

function parseBisImportEntries(rawInput: string): {
  entries: ParsedBisImportEntry[];
  error?: string;
} {
  const parts = rawInput
    .trim()
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { entries: [], error: "格式错误：无法识别有效的分隔符" };
  }

  const entries: ParsedBisImportEntry[] = [];
  for (const part of parts) {
    const segs = part.split(":");
    if (segs.length !== 2) {
      return { entries: [], error: `数据格式错误："${part.slice(0, 10)}..."` };
    }

    const role = segs[0] ?? "";
    const data = segs[1] ?? "";
    if (!data || !/^[0-9a-z]+$/i.test(data)) {
      return { entries: [], error: `数据校验失败：职位 "${role || "未知"}" 的设置已损坏` };
    }

    if (ROLE_DEFINITIONS.includes(role as any)) {
      entries.push({ role, data });
    }
  }

  if (entries.length === 0) {
    return { entries, error: "未找到匹配当前团队的有效设置数据" };
  }

  return { entries };
}

function getValDisplay(row: BisRow, val: BisValue | undefined): string {
  if (row.type === "toggle") {
    if (val === "raid") return "零式";
    if (val === "tome") return "点数";
    return "未设置";
  }
  if (typeof val !== "number")
    throw new Error(`[BisAllocator] 数据异常: ${row.name} 应为数字，实际为 ${val}`);
  return val.toString();
}

function getValClass(val: string) {
  if (val === "零式") return "is-raid";
  if (val === "点数") return "is-tome";
  return "";
}

function parseAndPreviewBisData(rawInput: string) {
  try {
    const { entries, error } = parseBisImportEntries(rawInput);
    if (error) throw new Error(error);

    const diffs: PlayerDiff[] = [];

    entries.forEach(({ role, data }) => {
      // 找到本地对应职位的玩家名（用于预览显示）
      const pName = firstEligiblePlayerByRole.value[role] || role;

      const dataBinary = Number.parseInt(data, 36).toString(2).padStart(DEFAULT_ROWS.length, "0");

      const newConfig: Record<string, BisValue> = {};
      DEFAULT_ROWS.forEach((row, idx) => {
        const char = dataBinary[idx];
        if (row.type === "toggle") {
          newConfig[row.id] = char === "1" ? "raid" : "tome";
        } else {
          newConfig[row.id] = char === "1" ? 1 : 0;
        }
      });

      const currentConfig = config.value.playerBis[role] || {};
      const changes: BisChange[] = [];
      let hasChanges = false;

      DEFAULT_ROWS.forEach((row) => {
        const oldV = currentConfig[row.id];
        const newV = newConfig[row.id];
        const sOld = getValDisplay(row, oldV);
        const sNew = getValDisplay(row, newV);
        if (sOld !== sNew) {
          hasChanges = true;
          changes.push({ label: row.name, oldVal: sOld, newVal: sNew });
        }
      });

      if (hasChanges) {
        diffs.push({
          name: pName,
          role,
          isNew: Object.keys(currentConfig).length === 0,
          changes,
          newConfig,
        });
      }
    });

    if (diffs.length === 0) {
      ElMessage.info("未检测到有效的设置变更。");
      return;
    }

    importDiffs.value = diffs;
    showImportConfirmDialog.value = true;
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e.message || "解析失败");
  }
}

function confirmImportBis() {
  confirmImportAction();
}

function confirmImportAction() {
  const newPlayerBis = { ...config.value.playerBis };
  importDiffs.value.forEach((diff) => {
    newPlayerBis[diff.role] = {
      ...newPlayerBis[diff.role],
      ...diff.newConfig,
    };
  });
  config.value.playerBis = newPlayerBis;
  showImportConfirmDialog.value = false;
  ElMessage.success(`成功更新 ${importDiffs.value.length} 个职位的配置`);
}

function setBis(player: string, rowId: string, type: BisValue) {
  const storageKey = getStorageKey(player);
  if (!config.value.playerBis[storageKey]) config.value.playerBis[storageKey] = {};
  const current = config.value.playerBis[storageKey]![rowId];
  if (current === type) {
    delete config.value.playerBis[storageKey]![rowId];
  } else {
    config.value.playerBis[storageKey]![rowId] = type;
  }
}

function setNeededCount(player: string, rowId: string, count: number) {
  const storageKey = getStorageKey(player);
  if (!config.value.playerBis[storageKey]) config.value.playerBis[storageKey] = {};
  config.value.playerBis[storageKey]![rowId] = count;
}

function normalizeOffsetValue(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.trunc(value);
}

function getNeedCountOffset(player: string, rowId: string): number {
  if (rowId === "random_weapon") return 0;
  return config.value.needCountOffsets[getStorageKey(player)]?.[rowId] || 0;
}

function setNeedCountOffset(player: string, rowId: string, value: number | null | undefined) {
  if (rowId === "random_weapon") return;

  const storageKey = getStorageKey(player);
  if (!config.value.needCountOffsets[storageKey]) config.value.needCountOffsets[storageKey] = {};
  config.value.needCountOffsets[storageKey]![rowId] = normalizeOffsetValue(value);
}

function getBaseNeedCount(player: string, row: BisRow): number {
  if (row.id === "random_weapon") return 0;
  if (row.type === "count") return getNeededCount(player, row.id);
  return getBisValue(player, row.id) === "raid" ? 1 : 0;
}

function getAdjustedNeedCount(player: string, row: BisRow): number {
  if (row.id === "random_weapon") return 0;
  return Math.max(0, getBaseNeedCount(player, row) + getNeedCountOffset(player, row.id));
}

function applyPreset(player: string, preset: BisPreset) {
  const storageKey = getStorageKey(player);
  const currentConfig = config.value.playerBis[storageKey] || {};
  const newConfig = { ...preset.config };

  const changes: BisChange[] = [];
  DEFAULT_ROWS.forEach((row) => {
    if (row.id === "random_weapon") return;
    const oldV = currentConfig[row.id];
    const newV = newConfig[row.id];

    const sOld = getValDisplay(row, oldV);
    const sNew = getValDisplay(row, newV);

    if (sOld !== sNew) {
      changes.push({
        label: row.name,
        oldVal: sOld,
        newVal: sNew,
      });
    }
  });

  if (changes.length === 0) {
    ElMessage.info("当前设置与预设相同，无需更改");
    return;
  }

  // 如果没有任何装备部位(toggle类型)被选择过，则视为全新配置，直接应用
  const hasPreviousSelection = DEFAULT_ROWS.some(
    (row) =>
      row.type === "toggle" &&
      (currentConfig[row.id] === "raid" || currentConfig[row.id] === "tome"),
  );

  if (!hasPreviousSelection) {
    if (!config.value.playerBis[storageKey]) config.value.playerBis[storageKey] = {};
    Object.assign(config.value.playerBis[storageKey], newConfig);
    ElMessage.success(`已应用预设: ${preset.name} (${player})`);
    return;
  }

  const diff: PlayerDiff = {
    name: player,
    role: props.getPlayerRole?.(player) || "Unknown",
    isNew: Object.keys(currentConfig).length === 0,
    changes,
    newConfig,
  };

  pendingPresetData.value = { player, preset, diff };
  showPresetConfirmDialog.value = true;
}

function confirmApplyPreset() {
  if (!pendingPresetData.value?.diff) return;

  const { player, preset, diff } = pendingPresetData.value;
  const storageKey = getStorageKey(player);

  if (!config.value.playerBis[storageKey]) {
    config.value.playerBis[storageKey] = {};
  }

  Object.assign(config.value.playerBis[storageKey], diff.newConfig);

  showPresetConfirmDialog.value = false;
  pendingPresetData.value = null;
  ElMessage.success(`已应用预设: ${preset.name} (${player})`);
}

function getObtainedItemsDetail(player: string, row: BisRow) {
  const cacheKey = `${player}|${row.id}`;
  const cached = obtainedDetailsCache.value.get(cacheKey);
  if (cached) return cached;

  const detailsMap: Record<string, number> = {};
  for (const rec of recordsForCompute.value || []) {
    const actual = props.getActualPlayer ? props.getActualPlayer(rec.player) : rec.player;
    if (actual !== player) continue;

    const matched =
      row.id === "random_weapon"
        ? !!props.getItemSlot && props.getItemSlot(rec.item) === "随武"
        : (ROW_KEYWORDS_BY_ID.get(row.id) || []).some((k) => rec.item.includes(k));
    if (!matched) continue;

    detailsMap[rec.item] = (detailsMap[rec.item] || 0) + 1;
  }

  const result = Object.entries(detailsMap).map(([name, count]) => ({ name, count }));
  obtainedDetailsCache.value.set(cacheKey, result);
  return result;
}

function formatOffset(offset: number): string {
  return offset > 0 ? `+${offset}` : `${offset}`;
}

function getBaseLogicDetailsFor(
  player: string,
  row: BisRow,
  rawObtainedCount: number,
): { status: "need" | "greed" | "pass"; reason: string } {
  const offset = getNeedCountOffset(player, row.id);
  const neededCount = getAdjustedNeedCount(player, row);
  const offsetDesc = offset === 0 ? "" : `（基础需求偏移 ${formatOffset(offset)}）`;

  if (row.type === "count") {
    if (rawObtainedCount >= neededCount) {
      return {
        status: "pass",
        reason: `按 ${rawObtainedCount}/${neededCount} 判定为满足${offsetDesc}`,
      };
    }
    return {
      status: "need",
      reason: `按 ${rawObtainedCount}/${neededCount} 判定为需求${offsetDesc}`,
    };
  }

  if (rawObtainedCount < neededCount) {
    return {
      status: "need",
      reason: `按 ${rawObtainedCount}/${neededCount} 判定为需求${offsetDesc}`,
    };
  }

  const val = getBisValue(player, row.id);
  if (val === "raid")
    return {
      status: "pass",
      reason: offsetDesc ? `已满足零式需求${offsetDesc}` : "已满足零式需求",
    };

  // tome: 默认贪婪；若配置了正偏移导致需求 > 0，在上方会走 need
  if (neededCount === 0 && rawObtainedCount === 0) {
    return {
      status: "greed",
      reason: offsetDesc
        ? `BIS 设为“点数”，且偏移后需求为 0${offsetDesc}`
        : "BIS 设为“点数” (贪婪，未获得)",
    };
  }

  return {
    status: "pass",
    reason: offsetDesc ? `偏移后视为需求已满足${offsetDesc}` : "偏移后视为需求已满足",
  };
}

const logicDetailsByCell = computed(() => {
  const result: Record<string, Record<string, LogicDetail>> = {};

  for (const row of DEFAULT_ROWS) {
    result[row.id] = {};
    const customAlloc = customAllocations.value[row.id];

    let minObtained = Infinity;
    let allActivePass = false;

    if (SPECIAL_ITEM_IDS.has(row.id) && row.type === "count") {
      const activeStatuses = eligiblePlayers.value
        .filter((p) => !excludedPlayers.value.has(p))
        .map((p) => {
          const rawObtained = obtainedSummary.value.counts[p]?.[row.id] || 0;
          const needed = getAdjustedNeedCount(p, row);
          return {
            p,
            rawObtained,
            status: rawObtained >= needed ? "pass" : ("need" as const),
          };
        });

      if (activeStatuses.length > 0) {
        allActivePass = activeStatuses.every((x) => x.status === "pass");
        if (allActivePass) {
          minObtained = Math.min(...activeStatuses.map((x) => x.rawObtained));
        }
      }
    }

    for (const player of eligiblePlayers.value) {
      if (customAlloc) {
        result[row.id]![player] =
          customAlloc === player
            ? { status: "assigned", reason: "队长指定分配 (最高优先级)" }
            : { status: "pass", reason: "队长已指定给他人" };
        continue;
      }

      if (excludedPlayers.value.has(player)) {
        result[row.id]![player] = { status: "pass", reason: "玩家已请假/被排除" };
        continue;
      }

      const rawObtained = obtainedSummary.value.counts[player]?.[row.id] || 0;
      if (SPECIAL_ITEM_IDS.has(row.id) && row.type === "count" && allActivePass) {
        result[row.id]![player] =
          rawObtained === minObtained
            ? {
                status: "greed",
                reason: `全员需求满足，作为获得最少者 (${rawObtained}个) 兜底贪婪`,
              }
            : {
                status: "pass",
                reason: `全员需求满足，但不是获得最少者 (${rawObtained} > ${minObtained})`,
              };
        continue;
      }

      result[row.id]![player] = getBaseLogicDetailsFor(player, row, rawObtained);
    }
  }

  return result;
});
const cellViewByRowId = computed(() => {
  const map: Record<string, Record<string, CellViewModel>> = {};
  for (const row of DEFAULT_ROWS) {
    map[row.id] = {};
    for (const player of eligiblePlayers.value) {
      const rawObtained = obtainedSummary.value.counts[player]?.[row.id] || 0;
      const obtained = rawObtained;
      const needed = row.type === "count" ? getAdjustedNeedCount(player, row) : 0;
      const logicDetail = logicDetailsByCell.value[row.id]?.[player];
      const status = logicDetail?.status || "pass";
      const baseClass =
        row.id === "random_weapon"
          ? obtained === 0
            ? "status-need"
            : "status-rw-obtained"
          : STATUS_MAP[status]?.class || "";
      const cellClass = excludedPlayers.value.has(player) ? `${baseClass} is-excluded` : baseClass;
      const reason =
        row.id === "random_weapon"
          ? `累计获得 ${obtained} 个随武`
          : logicDetail?.reason || "未命中判定缓存";
      map[row.id]![player] = {
        obtained,
        needed,
        statusText: STATUS_MAP[status]?.text || "",
        reason,
        cellClass,
      };
    }
  }
  return map;
});

function getCellView(player: string, row: BisRow): CellViewModel {
  const cached = cellViewByRowId.value[row.id]?.[player];
  if (cached) return cached;
  warnMissingCache("cell", row.id, player);
  return {
    obtained: 0,
    needed: 0,
    statusText: "",
    reason: "",
    cellClass: "",
  };
}

function getLogicStatus(player: string, row: BisRow): "need" | "greed" | "pass" | "assigned" {
  return getLogicDetails(player, row).status;
}

function getLogicDetails(
  player: string,
  row: BisRow,
): {
  status: LogicStatus;
  reason: string;
} {
  const cached = logicDetailsByCell.value[row.id]?.[player];
  if (cached) return cached;
  warnMissingCache("logic", row.id, player);
  return { status: "pass", reason: "" };
}

function getOriginalStatus(player: string, row: BisRow): "need" | "greed" | "pass" {
  const obtainedCount = obtainedSummary.value.counts[player]?.[row.id] || 0;
  return getBaseLogicDetailsFor(player, row, obtainedCount).status;
}

function isGroupEndRow(rowId: string): boolean {
  return GROUP_END_ROW_IDS.has(rowId);
}

function isEligible(player: string) {
  if (!props.getPlayerRole) return false;
  const role = props.getPlayerRole(player);
  if (!role) return false;
  return !role.startsWith("LEFT:");
}

function getCurrentMatchedPresetName(player: string) {
  const role = props.getPlayerRole?.(player);
  if (!role) return null;

  const storageKey = storageKeyByPlayer.value[player] || getStorageKey(player);
  const currentConfig = config.value.playerBis[storageKey];
  if (!currentConfig || Object.keys(currentConfig).length === 0) return null;

  const { recommended, others } = presetsByPlayer.value[player] || getPresetsForRole(role);
  const allPresets = [...recommended, ...others];

  for (const preset of allPresets) {
    let isMatch = true;
    for (const key of Object.keys(preset.config)) {
      if (currentConfig[key] !== preset.config[key]) {
        isMatch = false;
        break;
      }
    }
    if (isMatch) return preset.name;
  }
  return null;
}
const matchedPresetNameByPlayer = computed(() => {
  const map: Record<string, string | null> = {};
  for (const player of eligiblePlayers.value) map[player] = getCurrentMatchedPresetName(player);
  return map;
});

const isSyncingFromProps = ref(false);

watch(
  () => props.records,
  (records) => {
    if (recordsSyncTimer) clearTimeout(recordsSyncTimer);
    recordsSyncTimer = setTimeout(() => {
      recordsForCompute.value = records || [];
      obtainedDetailsCache.value.clear();
      recordsSyncTimer = null;
    }, 120);
  },
  { immediate: true },
);
watch([() => props.getActualPlayer, () => props.getItemSlot], () => {
  obtainedDetailsCache.value.clear();
});

function hasAnyPresets(player: string) {
  const presets = presetsByPlayer.value[player] || getPresetsForRole(props.getPlayerRole?.(player));
  return presets.recommended.length > 0 || presets.others.length > 0;
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) {
      return;
    }
    const nextConfig = normalizeBisConfigFromModel(
      newVal,
      eligiblePlayers.value,
      COUNT_ROWS,
      NEED_OFFSET_ROWS,
      getStorageKey,
    );

    isSyncingFromProps.value = true;
    config.value = nextConfig;
    nextTick(() => {
      isSyncingFromProps.value = false;
    });
  },
  { immediate: true },
);

watch(
  eligiblePlayers,
  (players) => {
    ensureBisCountDefaults(config.value, players, COUNT_ROWS, getStorageKey);
    ensureBisOffsetDefaults(config.value, players, NEED_OFFSET_ROWS, getStorageKey);
  },
  { immediate: true },
);

watch(
  config,
  (newVal) => {
    if (isSyncingFromProps.value) return;
    if (modelEmitTimer) clearTimeout(modelEmitTimer);
    modelEmitTimer = setTimeout(() => {
      emit("update:modelValue", newVal);
      modelEmitTimer = null;
    }, 80);
  },
  { deep: true },
);

onUnmounted(() => {
  if (recordsSyncTimer) clearTimeout(recordsSyncTimer);
  if (modelEmitTimer) clearTimeout(modelEmitTimer);
  obtainedDetailsCache.value.clear();
});

function getBisValue(player: string, rowId: string): BisValue | undefined {
  return config.value.playerBis[getStorageKey(player)]?.[rowId];
}

function isRaidBis(player: string, rowId: string) {
  return getBisValue(player, rowId) === "raid";
}

function isTomeBis(player: string, rowId: string) {
  return getBisValue(player, rowId) === "tome";
}

function getNeededCount(player: string, rowId: string): number {
  if (rowId === "random_weapon") return 0;
  const val = getBisValue(player, rowId);
  if (typeof val !== "number")
    throw new Error(`[BisAllocator] 数据异常: ${player} 在 ${rowId} 的值应为数字，实际为 ${val}`);
  return val;
}

function resetNeedCountOffsets() {
  for (const player of eligiblePlayers.value) {
    for (const row of NEED_OFFSET_ROWS) setNeedCountOffset(player, row.id, 0);
  }
}

function getCellClass(player: string, row: BisRow): string {
  return getCellView(player, row).cellClass;
}

const getRoleGroupClass = getRoleType;
</script>

<template>
  <div class="bis-allocator">
    <div class="bis-toolbar">
      <el-button
        size="small"
        type="primary"
        plain
        class="setup-trigger-btn"
        @click="showConfigDialog = true"
      >
        <el-icon style="margin-right: 4px">
          <Setting />
        </el-icon>
        <span>设置 BIS</span>
        <span v-if="!isConfigComplete" class="dot-warn" />
      </el-button>
      <el-button
        size="small"
        plain
        class="offset-trigger-btn"
        @click="showOffsetConfigDialog = true"
      >
        需求装备数量偏移
      </el-button>
    </div>

    <div v-if="isConfigComplete" class="bis-view-panel">
      <div class="table-container">
        <table class="bis-table">
          <colgroup>
            <col style="width: 32px !important; min-width: 32px !important" />
            <col style="width: 110px !important; min-width: 110px !important" />
            <col v-for="p in eligiblePlayers" :key="p" />
            <col style="width: 250px !important; min-width: 250px !important" />
          </colgroup>
          <thead>
            <tr>
              <th class="sticky-col col-combined-header" style="z-index: 30" colspan="2">
                装备 \ 玩家
              </th>
              <th
                v-for="p in eligiblePlayers"
                :key="p"
                :class="{ 'is-excluded': excludedPlayers.has(p) }"
              >
                <div class="premium-header-player">
                  <PlayerDisplay
                    :name="p"
                    :role="getPlayerRole?.(p)"
                    :show-only-role="showOnlyRole"
                  />
                  <div
                    class="leave-tag-trigger"
                    :class="{
                      'is-away': excludedPlayers.has(p),
                      'is-disabled': isPlayerAssigned(p),
                    }"
                    @click.stop="isPlayerAssigned(p) ? null : togglePlayerExclusion(p)"
                  >
                    <template v-if="excludedPlayers.has(p)">
                      <span>已请假</span>
                    </template>
                    <template v-else>
                      <el-icon style="margin-right: 2px">
                        <User />
                      </el-icon>
                      <span>请假</span>
                    </template>
                  </div>
                </div>
              </th>
              <th class="col-macro">
                <div class="macro-header-content">
                  <div class="header-left">
                    <div class="title-with-icon">
                      <span>分配宏</span>
                    </div>
                    <el-popover placement="top" title="分配宏生成规则" :width="320" trigger="hover">
                      <template #reference>
                        <el-icon class="macro-help-icon" style="margin: 0">
                          <QuestionFilled />
                        </el-icon>
                      </template>
                      <div class="macro-help-content">
                        <div class="intro">生成可以直接在游戏内发送的分配宏（/p）。</div>
                        <div class="rule-item">
                          <strong>1. 优先需求</strong>
                          <span>仅显示BIS设为“零式”且尚未获得的玩家。</span>
                        </div>
                        <div class="rule-item">
                          <strong>2. 次选贪婪</strong>
                          <span>若无需求者，显示其余尚未获得的玩家。</span>
                        </div>
                        <div class="rule-item">
                          <strong>3. 兜底机制</strong>
                          <span>若全员不需要，或全员均为贪婪，显示“随便ROLL”。</span>
                        </div>
                      </div>
                    </el-popover>
                  </div>
                  <el-button
                    link
                    type="primary"
                    size="small"
                    class="copy-full-text-btn"
                    @click="handleCopyAllMacro"
                  >
                    <el-icon>
                      <CopyDocument />
                    </el-icon>
                    <span>复制全部</span>
                  </el-button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(layer, lIdx) in layeredViewRows" :key="layer.name">
              <tr
                v-for="(row, rIdx) in layer.rows"
                :key="row.id"
                :class="{
                  'is-layer-end': rIdx === layer.rows.length - 1,
                }"
              >
                <td
                  v-if="rIdx === 0"
                  :rowspan="layer.rows.length"
                  class="sticky-col col-layer layer-cell"
                  :class="{ 'is-last-layer-cell': lIdx === layeredViewRows.length - 1 }"
                >
                  {{ layer.name }}
                </td>
                <td class="sticky-col col-item row-header">
                  <div class="equip-cell-content">
                    <span>{{ row.name }}</span>
                    <el-tooltip
                      v-model:visible="tooltipsOpen[row.id]"
                      placement="right"
                      trigger="click"
                      popper-class="captain-player-tooltip-new"
                      effect="dark"
                      :offset="15"
                      :hide-after="0"
                    >
                      <template #content>
                        <div class="tooltip-title">
                          将 <span>{{ row.name }}</span> 分配给
                        </div>
                        <div class="tooltip-player-list">
                          <div
                            v-for="p in eligiblePlayers"
                            :key="p"
                            class="tooltip-player-item"
                            :class="{
                              'is-disabled': excludedPlayers.has(p),
                              'is-active': customAllocations[row.id] === p,
                            }"
                            @click="!excludedPlayers.has(p) && (customAllocations[row.id] = p)"
                          >
                            <div class="player-option-item">
                              <PlayerDisplay
                                :name="p"
                                :role="getPlayerRole?.(p)"
                                :show-only-role="showOnlyRole"
                              />
                              <span class="mini-status-tag" :class="[getOriginalStatus(p, row)]">
                                {{ STATUS_MAP[getOriginalStatus(p, row)].text }}
                              </span>
                            </div>
                          </div>
                          <div v-if="customAllocations[row.id]" class="tooltip-divider" />
                          <div
                            v-if="customAllocations[row.id]"
                            class="tooltip-player-item clear-btn"
                            @click="customAllocations[row.id] = ''"
                          >
                            <el-icon><Delete /></el-icon>
                            <span>取消分配</span>
                          </div>
                        </div>
                      </template>
                      <div
                        class="assign-tag-trigger"
                        :class="{
                          'is-active': customAllocations[row.id],
                          'is-open': tooltipsOpen[row.id],
                        }"
                      >
                        <template v-if="customAllocations[row.id]">
                          <PlayerDisplay
                            :name="customAllocations[row.id]!"
                            :role="props.getPlayerRole?.(customAllocations[row.id]!)"
                            :show-only-role="showOnlyRole"
                          />
                          <span class="p-status">已分配</span>
                        </template>
                        <template v-else>
                          <el-icon style="margin-right: 2px">
                            <Plus />
                          </el-icon>
                          <span>分配</span>
                        </template>
                      </div>
                    </el-tooltip>
                  </div>
                </td>
                <td v-for="p in eligiblePlayers" :key="p" :class="getCellClass(p, row)">
                  <div class="cell-status-container">
                    <el-popover
                      placement="auto"
                      trigger="hover"
                      popper-class="bis-common-popover"
                      width="auto"
                      :show-after="0"
                      :hide-after="0"
                      transition="none"
                    >
                      <template #reference>
                        <div class="status-text-wrapper">
                          <template v-if="row.id === 'random_weapon'">
                            <span
                              :class="[
                                getCellView(p, row).obtained > 0
                                  ? 'rw-simple-count-active'
                                  : 'rw-simple-count-none',
                                { 'is-many': getCellView(p, row).obtained >= 2 },
                              ]"
                            >
                              {{ getCellView(p, row).obtained }}
                            </span>
                          </template>
                          <template v-else>
                            <span class="status-main">{{ getCellView(p, row).statusText }}</span>
                            <span
                              v-if="row.type === 'count' && getCellView(p, row).needed > 1"
                              class="status-meta"
                            >
                              ({{ getCellView(p, row).obtained }}/{{ getCellView(p, row).needed }})
                            </span>
                          </template>
                        </div>
                      </template>

                      <div class="popover-content">
                        <div class="reason-section">
                          {{ getCellView(p, row).reason }}
                        </div>
                        <template v-if="getObtainedItemsDetail(p, row).length > 0">
                          <div class="popover-divider" />
                          <div class="obtained-list">
                            <div
                              v-for="(d, i) in getObtainedItemsDetail(p, row)"
                              :key="i"
                              class="obtained-row"
                            >
                              <span class="item-name">{{ d.name }}</span>
                              <span class="item-count">x{{ d.count }}</span>
                            </div>
                          </div>
                        </template>
                        <div v-else-if="row.id === 'random_weapon'" class="obtained-empty">
                          未获得过
                        </div>
                      </div>
                    </el-popover>
                  </div>
                </td>
                <td
                  v-if="rIdx === 0"
                  :rowspan="layer.rows.length"
                  class="col-macro macro-cell"
                  :class="{ 'is-last-layer-cell': lIdx === layeredViewRows.length - 1 }"
                >
                  <div class="macro-preview-box">
                    <div class="macro-preview-content">
                      <div
                        v-for="(line, idx) in (layerMacroLinesMap[layer.name] || []).slice(1)"
                        :key="idx"
                        class="macro-preview-line"
                        v-html="formatMacroLine(line)"
                      />
                    </div>
                    <div class="macro-copy-action" @click.stop="handleCopyMacro(layer)">
                      <el-icon><CopyDocument /></el-icon>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="logic-note">
        *
        注：当某物品所有有效玩家都判定为放弃时，系统会自动找出“已获得数量最少”的玩家（可能有多人），将其状态改为贪婪
        (Greed)。
      </div>
    </div>

    <div v-else class="bis-onboarding">
      <div class="onboarding-card">
        <div class="icon-circle">
          <el-icon><List /></el-icon>
        </div>
        <h3>开启 BIS 分配</h3>
        <p>尚未设置团队成员的 BIS，无法生成分配推荐。</p>
        <el-button type="primary" size="large" @click="showConfigDialog = true">
          立即开始设置
        </el-button>
      </div>
    </div>

    <el-dialog
      v-model="showConfigDialog"
      width="auto"
      append-to-body
      class="bis-config-dialog"
      destroy-on-close
      align-center
    >
      <div class="bis-config-panel-container">
        <div class="bis-storage-info">
          <el-icon><InfoFilled /></el-icon>
          <span>提示：此 BIS 设置跟随职位（MT/ST等），不跟随具体玩家。</span>
        </div>
        <div class="table-scroll-wrapper">
          <table class="bis-table config-table">
            <thead>
              <tr>
                <th class="sticky-col">装备 \ 玩家</th>
                <th
                  v-for="p in eligiblePlayers"
                  :key="p"
                  :class="[
                    {
                      'header-incomplete': !checkPlayerComplete(config, getStorageKey(p)),
                    },
                    { 'is-excluded': excludedPlayers.has(p) },
                    getRoleGroupClass(getPlayerRole?.(p)),
                  ]"
                >
                  <div class="vert-header">
                    <PlayerDisplay
                      :name="p"
                      :role="getPlayerRole?.(p)"
                      :show-only-role="showOnlyRole"
                    />
                    <div class="header-action-area">
                      <span
                        v-if="!checkPlayerComplete(config, getStorageKey(p))"
                        class="incomplete-label"
                        >未填写</span
                      >
                      <div class="preset-apply-zone">
                        <el-dropdown
                          v-if="hasAnyPresets(p)"
                          trigger="click"
                          popper-class="bis-preset-popper"
                          @command="(cmd: any) => applyPreset(p, cmd)"
                          @visible-change="(v: boolean) => !v && expandedPlayerPresets.delete(p)"
                        >
                          <el-button
                            size="small"
                            class="preset-btn"
                            :class="{
                              'is-matched': matchedPresetNameByPlayer[p],
                            }"
                          >
                            <el-icon v-if="!matchedPresetNameByPlayer[p]" class="magic-icon">
                              <MagicStick />
                            </el-icon>
                            <span
                              v-if="matchedPresetNameByPlayer[p]"
                              class="matched-name-inline"
                              :title="matchedPresetNameByPlayer[p] ?? ''"
                              >{{ matchedPresetNameByPlayer[p] }}</span
                            >
                            <span v-else>一键预设</span>
                          </el-button>
                          <template #dropdown>
                            <el-dropdown-menu class="bis-preset-dropdown">
                              <!-- 推荐预设 -->
                              <el-dropdown-item
                                v-for="preset in presetsByPlayer[p]?.recommended || []"
                                :key="preset.name"
                                :command="preset"
                              >
                                <div class="preset-item-content">
                                  <el-icon><MagicStick /></el-icon>
                                  <span>{{ preset.name }}</span>
                                </div>
                              </el-dropdown-item>

                              <!-- 逻辑：如果没有推荐项，直接显示全部；如果有且未展开，显示展开按钮 -->
                              <template v-if="(presetsByPlayer[p]?.recommended.length || 0) === 0">
                                <el-dropdown-item
                                  v-for="preset in presetsByPlayer[p]?.others || []"
                                  :key="preset.name"
                                  :command="preset"
                                >
                                  <div class="preset-item-content">
                                    <el-icon><MagicStick /></el-icon>
                                    <span>{{ preset.name }}</span>
                                  </div>
                                </el-dropdown-item>
                              </template>

                              <template v-else-if="(presetsByPlayer[p]?.others.length || 0) > 0">
                                <div
                                  v-if="!expandedPlayerPresets.has(p)"
                                  class="preset-expand-divider"
                                  @click.stop="expandedPlayerPresets.add(p)"
                                >
                                  <div class="divider-line" />
                                  <div class="expand-action">
                                    <span>更多同职能预设</span>
                                    <el-icon><ArrowDown /></el-icon>
                                  </div>
                                  <div class="divider-line" />
                                </div>
                                <template v-else>
                                  <el-dropdown-item
                                    v-for="(preset, idx) in presetsByPlayer[p]?.others || []"
                                    :key="preset.name"
                                    :command="preset"
                                    :divided="idx === 0"
                                  >
                                    <div class="preset-item-content">
                                      <el-icon><MagicStick /></el-icon>
                                      <span>{{ preset.name }}</span>
                                    </div>
                                  </el-dropdown-item>
                                </template>
                              </template>
                            </el-dropdown-menu>
                          </template>
                        </el-dropdown>
                      </div>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in configRows" :key="row.id">
                <td
                  class="sticky-col row-header"
                  :class="[{ 'is-group-end': isGroupEndRow(row.id) }]"
                >
                  {{ row.name }}
                </td>
                <td
                  v-for="p in eligiblePlayers"
                  :key="p"
                  class="split-cell-container"
                  :class="[{ 'is-group-end': isGroupEndRow(row.id) }]"
                >
                  <div v-if="row.type === 'toggle'" class="split-cell">
                    <div
                      class="half-cell left-raid"
                      :class="{ active: isRaidBis(p, row.id) }"
                      @click="setBis(p, row.id, 'raid')"
                    >
                      零式
                    </div>
                    <div
                      class="half-cell right-tome"
                      :class="{ active: isTomeBis(p, row.id) }"
                      @click="setBis(p, row.id, 'tome')"
                    >
                      点数
                    </div>
                  </div>

                  <div v-else class="count-cell">
                    <div class="count-wrapper">
                      <el-input-number
                        :model-value="getNeededCount(p, row.id)"
                        :min="0"
                        :max="8"
                        size="small"
                        controls-position="right"
                        class="mini-stepper"
                        @update:model-value="(v) => setNeededCount(p, row.id, v || 0)"
                      />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <div class="footer-left">
            <div class="io-action-list">
              <el-button size="small" @click="exportBisData"> 导出 BIS 设置 </el-button>
              <el-button size="small" @click="importBisData"> 导入 BIS 设置 </el-button>
            </div>
          </div>
          <div class="footer-right">
            <div class="config-status-msg">
              <span v-if="incompletePlayerCount > 0">
                还剩 {{ incompletePlayerCount }} 个职位的 BIS 尚未填完
              </span>
            </div>
            <el-button type="primary" size="small" @click="showConfigDialog = false">
              完成并关闭
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showImportConfirmDialog"
      title="确认导入 BIS 设置"
      width="600px"
      append-to-body
      destroy-on-close
      align-center
    >
      <div v-if="importDiffs.length === 0" class="import-empty-msg">没有检测到有效的变更数据。</div>
      <div v-else class="import-diff-container">
        <p class="import-summary">检测到 {{ importDiffs.length }} 位玩家的设置变更。</p>
        <div v-for="diff in importDiffs" :key="diff.name" class="diff-card">
          <div class="diff-header">
            <PlayerDisplay :name="diff.name" :role="diff.role" :show-only-role="showOnlyRole" />
            <span v-if="diff.isNew" class="diff-tag">新设置</span>
            <span v-else class="diff-tag update">更新</span>
          </div>
          <div class="diff-items">
            <div v-for="(change, idx) in diff.changes" :key="idx" class="diff-row">
              <span class="diff-label">{{ change.label }}</span>
              <div class="diff-values">
                <span class="val old" :class="getValClass(change.oldVal)">{{ change.oldVal }}</span>
                <el-icon><Right /></el-icon>
                <span class="val new" :class="getValClass(change.newVal)">{{ change.newVal }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer" style="justify-content: flex-end; gap: 12px">
          <el-button @click="showImportConfirmDialog = false"> 取消 </el-button>
          <el-button type="primary" :disabled="importDiffs.length === 0" @click="confirmImportBis">
            确认应用
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showOffsetConfigDialog"
      title="需求装备数量偏移"
      width="auto"
      append-to-body
      class="offset-config-dialog"
      destroy-on-close
      align-center
    >
      <div class="offset-popover-content">
        <div class="offset-config-inline">
          <p class="offset-config-hint">例如A想把自己的武器箱让给B，则A设置为-1，B设置为+1</p>
          <el-button size="small" text @click="resetNeedCountOffsets"> 清零偏移 </el-button>
        </div>
        <div class="table-scroll-wrapper offset-scroll-wrapper">
          <table class="bis-table config-table offset-config-table">
            <colgroup>
              <col style="width: 44px !important; min-width: 44px !important" />
              <col style="width: 96px !important; min-width: 96px !important" />
              <col v-for="p in eligiblePlayers" :key="`offset-dialog-col-${p}`" />
            </colgroup>
            <thead>
              <tr>
                <th class="offset-layer-col">层数</th>
                <th class="offset-item-col">装备 \ 玩家</th>
                <th
                  v-for="p in eligiblePlayers"
                  :key="`offset-dialog-${p}`"
                  :class="[
                    { 'is-excluded': excludedPlayers.has(p) },
                    getRoleGroupClass(getPlayerRole?.(p)),
                  ]"
                >
                  <PlayerDisplay
                    :name="p"
                    :role="getPlayerRole?.(p)"
                    :show-only-role="showOnlyRole"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              <template
                v-for="(layer, lIdx) in offsetLayeredRows"
                :key="`offset-layer-${layer.name}`"
              >
                <tr
                  v-for="(row, rIdx) in layer.rows"
                  :key="`offset-dialog-row-${row.id}`"
                  :class="{ 'is-layer-end': rIdx === layer.rows.length - 1 }"
                >
                  <td
                    v-if="rIdx === 0"
                    :rowspan="layer.rows.length"
                    class="offset-layer-col offset-layer-cell"
                    :class="{ 'is-last-layer-cell': lIdx === offsetLayeredRows.length - 1 }"
                  >
                    {{ layer.name }}
                  </td>
                  <td class="offset-item-col row-header">
                    {{ row.name }}
                  </td>
                  <td
                    v-for="p in eligiblePlayers"
                    :key="`offset-dialog-cell-${row.id}-${p}`"
                    class="split-cell-container"
                  >
                    <div class="correction-input-wrapper">
                      <el-input-number
                        :model-value="getNeedCountOffset(p, row.id)"
                        :min="-99"
                        :max="99"
                        :step="1"
                        :controls="false"
                        size="small"
                        class="correction-input"
                        :class="{ 'is-nonzero': getNeedCountOffset(p, row.id) !== 0 }"
                        @update:model-value="(v) => setNeedCountOffset(p, row.id, v)"
                      />
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer" style="justify-content: flex-end">
          <el-button type="primary" size="small" @click="showOffsetConfigDialog = false">
            完成并关闭
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showPresetConfirmDialog"
      title="确认预设变更"
      width="600px"
      append-to-body
      destroy-on-close
      align-center
    >
      <div v-if="pendingPresetData?.diff" class="import-diff-container">
        <p class="import-summary">应用 [{{ pendingPresetData.preset.name }}] 将会产生以下变更：</p>
        <div class="diff-card">
          <div class="diff-header">
            <PlayerDisplay
              :name="pendingPresetData.diff.name"
              :role="pendingPresetData.diff.role"
              :show-only-role="showOnlyRole"
            />
            <span v-if="pendingPresetData.diff.isNew" class="diff-tag">新设置</span>
            <span v-else class="diff-tag update">更新</span>
          </div>
          <div class="diff-items">
            <div
              v-for="(change, idx) in pendingPresetData.diff.changes"
              :key="idx"
              class="diff-row"
            >
              <span class="diff-label">{{ change.label }}</span>
              <div class="diff-values">
                <span class="val old" :class="getValClass(change.oldVal)">{{ change.oldVal }}</span>
                <el-icon><Right /></el-icon>
                <span class="val new" :class="getValClass(change.newVal)">{{ change.newVal }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer" style="justify-content: flex-end; gap: 12px">
          <el-button @click="showPresetConfirmDialog = false"> 取消 </el-button>
          <el-button type="primary" @click="confirmApplyPreset"> 确认应用 </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.bis-allocator {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.bis-toolbar {
  margin: 12px 12px 0px 12px;
  display: flex;
  align-items: center;
  min-height: 32px;

  // Element Plus 按钮自带左边距，我们不需要 gap
  ::deep(.el-button + .el-button),
  ::deep(.el-button + .el-dropdown),
  ::deep(.el-dropdown + .el-button),
  ::deep(.el-dropdown + .el-dropdown) {
    margin-left: 12px;
  }
}

.setup-trigger-btn {
  position: relative;
  font-weight: 600;
}

.offset-trigger-btn {
  font-weight: 600;
}

.macro-help-icon {
  color: #94a3b8;
  cursor: pointer;
  margin-left: 4px;
  font-size: 16px;
  outline: none;

  &:hover {
    color: #475569;
  }
}

.macro-help-content {
  font-size: 13px;
  line-height: 1.5;
  color: #334155;

  html.dark & {
    color: #e2e8f0;
  }

  .intro {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;

    html.dark & {
      color: #94a3b8;
      border-color: #334155;
    }
  }

  .rule-item {
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    strong {
      display: block;
      color: #3b82f6;
      font-weight: 600;
      margin-bottom: 2px;
    }

    span {
      display: block;
      color: #475569;
      html.dark & {
        color: #cbd5e1;
      }
    }
  }
}

.bis-onboarding {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 8px;
  margin: 0 12px 12px;
  border: 2px dashed #e2e8f0;
}

.onboarding-card {
  text-align: center;
  max-width: 400px;
  padding: 40px;

  h3 {
    font-size: 20px;
    color: #1e293b;
    margin: 16px 0 8px;
  }
  p {
    color: #64748b;
    margin-bottom: 24px;
    line-height: 1.6;
  }
}

.icon-circle {
  width: 64px;
  height: 64px;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto;
}

.bis-config-dialog {
  ::deep(.el-dialog) {
    width: fit-content !important;
    min-width: 600px;
    max-width: 95vw !important;
    margin: 0 auto;
    border-radius: 12px;
    overflow: hidden;
  }

  ::deep(.el-dialog__body) {
    padding: 20px;
    padding-top: 10px;
  }
}

.offset-config-dialog {
  ::deep(.el-dialog) {
    width: fit-content !important;
    min-width: 700px;
    max-width: 95vw !important;
    max-height: 90vh;
    margin: 0 auto;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  ::deep(.el-dialog__body) {
    padding: 16px 20px 12px;
    overflow: auto;
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.footer-left {
  display: flex;
  align-items: center;
}

.io-action-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.config-status-msg {
  color: #f56c6c;
  font-size: 13px;
  font-weight: 600;
}

.bis-view-panel {
  flex: 1;
  overflow: auto;
  border-radius: 6px;
  background: #f8fafc;
  padding: 12px;
  padding-top: 0;
  box-shadow: none;

  .table-container {
    max-width: 1400px;
    margin: 0 auto;
  }
}

.bis-storage-info {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;

  html.dark & {
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
  }
}

.captain-alloc-menu {
  width: 240px;
  padding: 0;
  // 移除自定义背景和边框，使用 Element Plus 默认风格
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;

  .captain-menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px 4px;
    font-size: 11px;
    font-weight: bold;
    color: #94a3b8 !important; // 强制灰蓝色
    text-transform: uppercase;
    letter-spacing: 0.03em;

    span {
      color: #94a3b8 !important; // 再次确保文字不红
    }

    .el-button {
      padding: 0;
      height: auto;
      font-size: 11px;
      color: #f87171 !important; // 仅清空按钮红
    }
  }

  .captain-menu-scroll {
    max-height: 480px;
    overflow-y: auto;
    padding-bottom: 4px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.3);
      border-radius: 2px;
    }
  }

  .layer-group-title {
    padding: 4px 16px 2px;
    font-size: 10px;
    font-weight: bold;
    color: #3b82f6;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    opacity: 0.8;
  }

  .alloc-row-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0px 12px 0px 16px; // 极致压缩垂直间距
    gap: 4px; // 缩小 gap

    .item-name {
      font-size: 11px;
      color: #71717a;
      white-space: nowrap;
      html.dark & {
        color: #a1a1aa;
      }
    }

    .compact-assign-trigger {
      width: 90px;
      height: 18px; // 强制更矮
      background: rgba(0, 0, 0, 0.03);
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 6px;
      cursor: pointer;
      transition: all 0.2s;

      .trigger-text {
        font-size: 10px; // 字体微调
        color: #71717a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .trigger-icon {
        font-size: 9px;
        color: #94a3b8;
      }

      &:hover {
        background: #fff;
        border-color: #3b82f6;
        .trigger-text {
          color: #3b82f6;
        }
      }

      &.has-val {
        background: #f0fdf4;
        border-color: #bbf7d0;
        .trigger-text {
          color: #16a34a;
          font-weight: 700;
        }
      }

      html.dark & {
        background: rgba(255, 255, 255, 0.05);
        border-color: #334155;
        .trigger-text {
          color: #9ca3af;
        }

        &:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: #3b82f6;
        }

        &.has-val {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.2);
          .trigger-text {
            color: #10b981;
          }
        }
      }
    }
  }
}

.exclude-players-menu {
  width: 200px;
  padding: 0;

  .captain-menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px 4px;
    font-size: 11px;
    font-weight: bold;
    color: #94a3b8 !important;
    text-transform: uppercase;
    letter-spacing: 0.03em;

    span {
      color: #94a3b8 !important;
    }

    .el-button {
      padding: 0;
      height: auto;
      font-size: 11px;
      color: #f87171 !important;
    }
  }

  .exclude-menu-scroll {
    max-height: 300px;
    overflow-y: auto;
    padding: 4px 0;
  }
}

.player-option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px; // 缩小 gap
}

// 队长分配专用下拉框样式
.captain-player-popper {
  ::deep(.el-select-dropdown__wrap) {
    max-height: none !important; // 移除滚动条高度限制
  }
  ::deep(.el-select-dropdown__list) {
    padding: 2px 0;
  }
  ::deep(.el-select-dropdown__item) {
    height: 26px !important; // 压缩行高
    line-height: 26px !important;
    padding: 0 12px;

    &.is-disabled {
      background-color: transparent !important;
    }
  }
}

.mini-status-tag {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: bold;
  line-height: 1;

  &.need {
    color: #16a34a;
    background: #f0fdf4;
    html.dark & {
      color: #4ade80;
      background: rgba(22, 163, 74, 0.2);
    }
  }
  &.greed {
    color: #0284c7;
    background: #f0f9ff;
    html.dark & {
      color: #38bdf8;
      background: rgba(12, 74, 110, 0.2);
    }
  }
  &.pass {
    color: #94a3b8;
    background: #f8fafc;
    html.dark & {
      color: #64748b;
      background: rgba(255, 255, 255, 0.05);
    }
  }
}

.validation-alerts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.validation-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;

  &.info {
    background: #f0f9ff;
    color: #0369a1;
    border: 1px solid #e0f2fe;
    html.dark & {
      background: rgba(14, 165, 233, 0.1);
      border-color: rgba(14, 165, 233, 0.2);
    }
  }

  &.warning {
    background: #fff1f2;
    color: #be123c;
    border: 1px solid #ffe4e6;
    html.dark & {
      background: rgba(244, 63, 94, 0.1);
      border-color: rgba(244, 63, 94, 0.2);
    }
  }

  .alert-icon {
    font-size: 14px;
  }
}

.bis-config-panel-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: fit-content;
  margin: 0 auto;
}

.offset-popover-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 680px;
}

.offset-config-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.offset-config-hint {
  margin: 0;
  flex: 1;
  font-size: 12px;
  color: #64748b;

  html.dark & {
    color: #94a3b8;
  }
}

.offset-scroll-wrapper {
  max-height: min(62vh, calc(100vh - 260px));
}

.table-scroll-wrapper.offset-scroll-wrapper {
  overflow: auto !important;
  max-height: min(62vh, calc(100vh - 260px)) !important;
}

.offset-config-table {
  .offset-layer-col {
    width: 44px !important;
    min-width: 44px !important;
    max-width: 44px !important;
    border-right: 1px solid black !important;
  }

  .offset-item-col {
    width: 96px !important;
    min-width: 96px !important;
    max-width: 96px !important;
    border-right: 1px solid black !important;
    background: #f8fafc;
  }

  .offset-layer-cell {
    background: #f8fafc;
    color: #1e293b;
    font-weight: 800;
    font-size: 11px;
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0;
    line-height: 1.1;
    padding: 0 !important;
  }

  .offset-layer-cell:not(.is-last-layer-cell) {
    border-bottom: 1px solid black !important;
  }

  html.dark & {
    .offset-layer-col,
    .offset-item-col {
      border-right-color: #334155 !important;
    }

    .offset-item-col,
    .offset-layer-cell {
      background: #0f172a;
      color: #e2e8f0;
    }

    .offset-layer-cell:not(.is-last-layer-cell) {
      border-bottom-color: #334155 !important;
    }
  }
}

.table-scroll-wrapper {
  margin: 0 auto;
  width: fit-content;
  max-width: 100%;
  max-height: 75vh;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid black;

  -webkit-mask-image: -webkit-radial-gradient(white, black);
  mask-image: radial-gradient(white, black);

  &.is-editing {
    border-color: #3b82f6;
  }
}

.table-container {
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid black;
  border-radius: 8px;
  position: relative;
  overflow: hidden;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 10px;
    &:hover {
      background: rgba(0, 0, 0, 0.25);
    }
  }

  html.dark & {
    border-color: #334155;

    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }
  }
}

.bis-table {
  width: 100%;
  min-width: max-content;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  table-layout: fixed;
  border: none;

  th,
  td {
    box-sizing: border-box;
    text-align: center;
    min-width: 65px;
    padding: 0 4px !important;
    height: 32px;
    border-right: 1px solid rgba(148, 163, 184, 0.1);
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    vertical-align: middle;
    position: relative;

    html.dark & {
      color: #94a3b8;
      border-color: rgba(148, 163, 184, 0.1);
    }
  }

  tr td:last-child,
  tr th:last-child {
    border-right: none;
  }

  tr.is-layer-end:not(:last-child) td,
  tr.is-layer-end:not(:last-child) th {
    border-bottom: 1px solid black !important;
    html.dark & {
      border-bottom-color: #334155 !important;
    }
  }

  .layer-cell,
  .macro-cell {
    border-bottom: 1px solid rgba(148, 163, 184, 0.1) !important;

    ::deep(tr.is-layer-end:not(:last-child)) & {
      border-bottom: 1px solid black !important;
    }
  }

  // 针对 rowspan 跨到最后一行的特殊清理，防止与外部容器边框重叠
  .is-last-layer-cell {
    border-bottom: none !important;
  }

  tr:last-child td,
  tr:last-child th {
    border-bottom: none !important;
  }

  th {
    background: #f1f5f9;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    color: #475569;

    html.dark & {
      background: #111827;
      color: #94a3b8;
    }
  }

  thead {
    position: relative;
  }

  thead th {
    background: linear-gradient(
      to bottom,
      #f1f5f9 calc(100% - 1px),
      black calc(100% - 1px)
    ) !important;
    border-bottom: none !important;
    box-shadow: none !important;

    html.dark & {
      background: linear-gradient(
        to bottom,
        #111827 calc(100% - 1px),
        #334155 calc(100% - 1px)
      ) !important;
      border-bottom: none !important;
    }
  }

  .col-layer {
    left: 0;
    background: #f8fafc;
    border-right: 1px solid black !important;

    html.dark & {
      background: #0f172a;
      border-right-color: #334155 !important;
    }
  }

  .col-item {
    font-weight: 700;
    color: #334155;
    background: #f8fafc;
    border-right: 1px solid black !important;

    html.dark & {
      background: #0f172a;
      color: #e2e8f0;
      border-right-color: #334155 !important;
    }
  }

  .col-combined-header {
    left: 0;
    font-weight: 700;
    color: #334155;
    background: #f8fafc;
    border-right: 1px solid black !important;

    html.dark & {
      background: #0f172a;
      color: #e2e8f0;
      border-right-color: #334155 !important;
    }
  }

  .col-macro {
    position: relative;
    text-align: left;
    border-left: 1px solid black !important;

    html.dark & {
      border-left-color: #334155 !important;
    }

    .macro-header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 8px;
      gap: 4px;
      white-space: nowrap;

      .header-left {
        display: flex;
        align-items: center;
        gap: 2px;
      }

      .title-with-icon {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .copy-full-text-btn {
        font-size: 11px;
        font-weight: 700;
        padding: 0;
        height: auto;
        color: #3b82f6;

        &:hover {
          color: #2563eb;
          text-decoration: underline;
        }
      }

      .copy-all-icon {
        cursor: pointer;
        font-size: 13px;
        color: #3b82f6;
        transition: transform 0.2s;

        &:hover {
          transform: scale(1.2);
        }
      }
    }
  }

  .layer-cell {
    background: #f8fafc;
    color: #1e293b;
    font-weight: 800;
    font-size: 11px;
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0;
    padding: 0;
    line-height: 1.1;
    text-shadow: none;
    border-bottom-color: #475569;
  }

  .layer-cell:not(.is-last-layer-cell) {
    border-bottom: 1px solid black !important;
  }

  .macro-cell {
    background: #f8fafc;
    border-bottom-color: #475569;
    padding: 0 !important;
    vertical-align: middle;
    height: 1px;
    overflow: visible;
    position: relative;

    html.dark & {
      background: #1e1f29;
    }
  }

  .macro-preview-box {
    position: relative;
    padding: 0 8px;
    height: 100%;
    min-height: 100%;
    cursor: default;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    background: transparent;
    transition: background 0.2s ease;

    &:hover {
      background: rgba(59, 130, 246, 0.04);
    }

    &:hover .macro-copy-action {
      opacity: 1;
      transform: scale(1);
    }

    html.dark & {
      &:hover {
        background: rgba(59, 130, 246, 0.08);
      }
    }
  }

  .macro-preview-content {
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
      monospace;
    font-size: 11px;
    line-height: 1.25;
    color: #475569;
    text-align: left;
    width: 100%;
    overflow: hidden;

    html.dark & {
      color: #cbd5e1;
    }
  }

  .macro-preview-line {
    height: 32px;
    display: flex;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 24px;
  }

  .macro-copy-action {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    color: #3b82f6;
    opacity: 0;
    transform: scale(0.9) translateZ(0);
    backface-visibility: hidden;
    will-change: transform, opacity;
    transition:
      color 0.2s ease,
      border-color 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    cursor: pointer;

    &:hover {
      background: #eff6ff;
      color: #2563eb;
      border-color: #3b82f6;
    }

    html.dark & {
      background: #1e293b;
      border-color: #334155;
      color: #60a5fa;

      &:hover {
        background: #334155;
        color: #93c5fd;
      }
    }

    .el-icon {
      font-size: 14px;
    }
  }

  .macro-btn {
    font-weight: 700;
    font-size: 11px;
  }

  td.col-item {
    background: #f8fafc;
  }

  &.config-table {
    width: max-content;

    border: none !important;

    tr:first-child th {
      border-top: none !important;
    }

    .sticky-col {
      width: 72px;
      border-left: none !important;
      border-right: 1px solid #475569;
    }

    th:last-child,
    td:last-child {
      border-right: none !important;
    }

    tr:last-child td {
      border-bottom: none !important;
    }

    th,
    td {
      width: 100px;
      min-width: 100px;
      max-width: 100px;
      height: 32px;
      border-right: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      overflow: hidden;

      &.is-group-end {
        border-bottom: 1px solid #475569 !important;
      }
    }

    th {
      height: auto !important;
      padding: 4px 0 !important;

      ::deep(.player-display) {
        flex-direction: column;
        gap: 0;
        width: 100%;

        .p-name {
          font-size: 10px;
          max-width: 90px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .role-tag {
          transform: scale(0.8);
          margin-bottom: -2px;
        }
      }
    }
  }
}

.premium-header-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0;

  ::deep(.player-display) {
    flex-direction: column;
    gap: 0;
  }

  .leave-tag-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 18px;
    min-width: 48px;
    padding: 0 4px;
    border-radius: 4px;
    background: transparent;
    color: #94a3b8;
    font-size: 10px;
    cursor: pointer;
    user-select: none;
    font-weight: 800;
    opacity: 0.6;
    transition: opacity 0.2s ease;
    border: 1px solid transparent;

    span {
      color: inherit;
    }

    &:hover:not(.is-disabled) {
      opacity: 1;
      background: rgba(59, 130, 246, 0.08);
      color: #3b82f6;
      border-color: rgba(59, 130, 246, 0.15);
    }

    &.is-away {
      opacity: 1 !important;
      background: #f87171 !important;
      color: #ffffff !important;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(248, 113, 113, 0.3);
      border: none;

      span {
        color: #ffffff !important;
      }

      &:hover {
        background: #ef4444 !important;
      }
    }

    &.is-disabled {
      opacity: 0.1;
      cursor: not-allowed;
    }

    html.dark & {
      color: #64748b;

      &:hover:not(.is-disabled) {
        background: rgba(255, 255, 255, 0.05);
        color: #f1f5f9;
        border-color: rgba(255, 255, 255, 0.1);
      }

      &.is-away {
        background: #ef4444 !important;
        color: #ffffff !important;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        border: none;

        span {
          color: #ffffff !important;
        }
      }
    }
  }
}

.equip-cell-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 0 4px;
  gap: 0;
  height: 100%;
  overflow: hidden;

  span {
    font-size: 11px;
    color: #475569;
    font-weight: 700;
    white-space: nowrap;
    html.dark & {
      color: #94a3b8;
    }
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }

  .assign-tag-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 16px;
    width: auto;
    min-width: 32px;
    padding: 0 3px;
    flex-shrink: 0;
    border-radius: 2px;
    color: #64748b;
    font-size: 9px;
    cursor: pointer;
    user-select: none;
    font-weight: 500;
    opacity: 0.8;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    overflow: hidden;
    white-space: nowrap;

    span {
      display: inline;
    }

    &:hover,
    &.is-active,
    &.is-open {
      width: auto;
      min-width: 32px;
      padding: 0 3px;
      opacity: 1;

      span {
        display: inline;
      }
    }

    span {
      color: inherit;
    }

    &.is-open {
      opacity: 1 !important;
      background: #dcfce7 !important;
      color: #10b981 !important;
      border-color: #10b981 !important;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.15) !important;

      span {
        color: #10b981 !important;
        font-weight: 900 !important;
      }
    }

    &:hover {
      opacity: 1;
      background: rgba(16, 185, 129, 0.08);
      color: #10b981;
      border-color: rgba(16, 185, 129, 0.15);
    }

    &.is-active {
      display: inline-flex;
      width: auto;
      height: 14px;
      opacity: 1 !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none;
      padding: 0;
      margin-left: -2px;

      ::deep(.player-display) {
        transform: scale(0.9);
        .player-name-text {
          display: none !important;
        }
      }

      .p-status {
        display: none !important;
      }

      &:hover {
        opacity: 0.8 !important;
      }
    }

    html.dark & {
      color: #64748b;

      &.is-open {
        opacity: 1 !important;
        background: rgba(16, 185, 129, 0.35) !important;
        color: #34d399 !important;
        border-color: #10b981 !important;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2) !important;

        span {
          color: #34d399 !important;
        }
      }

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #10b981;
        border-color: rgba(16, 185, 129, 0.2);
      }

      &.is-active {
        background: transparent !important;
        color: #10b981 !important;
        box-shadow: none;
        border: none;

        span {
          color: #10b981 !important;
        }
      }
    }
  }
}

.cell-status-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
  height: 100%;
}

.status-main {
  font-weight: 700;
}

.status-meta {
  font-size: 10px;
  font-weight: 500;
  opacity: 0.8;
  margin-top: 2px;
}

.status-text-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: help;
}

.rw-simple-count-active,
.rw-simple-count-none {
  text-decoration: underline dashed currentColor 1px;
  text-underline-offset: 3px;
}

.vert-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
}

.header-action-area {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.incomplete-label {
  font-size: 10px;
  font-weight: 700;
  color: #fff !important;
  background: #f87171;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.2;
  box-shadow: 0 2px 4px rgba(248, 113, 113, 0.2);
}

.sticky-col {
  position: sticky;
  left: 0;
  z-index: 10;
}

.bis-table th.sticky-col {
  z-index: 20;
}

.preset-expand-divider {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;

  .divider-line {
    flex: 1;
    height: 1px;
    background: #e2e8f0;

    html.dark & {
      background: #334155;
    }
  }

  .expand-action {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    white-space: nowrap;

    &:hover {
      color: #3b82f6;
    }
  }

  &:hover {
    .expand-action {
      color: #3b82f6;
    }
    .divider-line {
      background: #cbd5e1;
    }
  }
}

.bis-preset-dropdown {
  max-height: 320px;
  overflow-y: auto;

  ::deep(.el-dropdown-menu__item) {
    padding: 0 8px;
    line-height: 20px;
    height: auto;
    font-size: 12px;

    .el-icon {
      font-size: 12px;
      margin-right: 4px;
    }
  }
}

.status-need {
  background-color: #dcfce7 !important;
  color: #15803d !important;
}
.status-greed-tome {
  background-color: #f0f9ff !important;
  color: #0369a1 !important;
}
.status-pass {
  background-color: #f8fafc !important;
  color: #94a3b8 !important;
}
.status-assigned {
  background-color: #f0fdf4 !important;
  color: #16a34a !important;
  font-weight: 800;
  border: 1px solid #bbf7d0 !important;
  z-index: 1;
}

.row-header {
  text-align: center !important;
}

.split-cell {
  background: #f1f5f9;
  border-radius: 8px;
  margin: 0 auto;
  padding: 3px;
  display: flex;
  gap: 4px;
  width: 92px;
  height: 28px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  box-sizing: border-box;
}

.half-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 1px;
  white-space: nowrap;

  &.left-raid.active {
    background: #6366f1;
    color: #fff;
    box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
  }

  &.right-tome.active {
    background: #0ea5e9;
    color: #fff;
    box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);
  }

  &:not(.active):hover {
    background: #fff;
    color: #64748b;
  }
}

.count-value {
  font-family: "JetBrains Mono", monospace;
  font-weight: 500;
  color: #64748b;
  font-size: 12px;
}

.mini-stepper {
  width: 76px !important;
  ::deep(.el-input__wrapper) {
    padding-left: 8px;
    padding-right: 30px;
    box-shadow: 0 0 0 1px #e2e8f0 inset;
    background-color: #f8fafc;
    &:hover,
    &.is-focus {
      box-shadow: 0 0 0 1px #3b82f6 inset;
    }
  }
  ::deep(.el-input-number__increase),
  ::deep(.el-input-number__decrease) {
    width: 24px;
    background: #f1f5f9;
    border-left: 1px solid #e2e8f0;
    color: #64748b;
    &:hover {
      color: #3b82f6;
      background: #eff6ff;
    }
  }
}

.preset-apply-zone {
  display: flex;
  justify-content: center;
}

.preset-btn {
  height: 20px;
  padding: 0 6px;
  overflow: hidden;
  font-size: 10px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;

  &:hover {
    background: #f1f5f9;
    color: #334155;
    border-color: #cbd5e1;
    transform: translateY(-1.5px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  &:active {
    transform: translateY(0);
  }

  .magic-icon {
    margin-right: 2px;
    font-size: 10px;
    color: #f59e0b;
    flex-shrink: 0;
  }

  &.is-matched {
    color: #3b82f6 !important;
    border-color: #3b82f6 !important;
    background: #eff6ff !important;

    html.dark & {
      background: rgba(59, 130, 246, 0.1) !important;
    }
  }

  .matched-name-inline {
    display: inline-block;
    max-width: 85px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: normal;
    font-size: 10px;
  }
}

.preset-item-content {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 0;
  font-weight: 500;

  .el-icon {
    color: #f59e0b;
    font-size: 14px;
  }
}

html.dark {
  .preset-btn {
    background: #1e1f29 !important;
    border-color: #334155 !important;
    color: #94a3b8 !important;

    &:hover {
      background: #2a2b36 !important;
      color: #e2e8f0 !important;
      border-color: #475569 !important;
    }
  }
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

html.dark {
  .bis-allocator {
    .config-header-actions {
      background: #1e1f29;
      border-color: rgba(255, 255, 255, 0.1);
    }

    .bis-view-panel {
      background: #16171f;
      border-color: rgba(255, 255, 255, 0.08);
      box-shadow: none;
    }

    .bis-table {
      th,
      td {
        border-right-color: #334155;
        border-bottom-color: #1e1f29;
      }

      th {
        border-top-color: #1e293b;
        background: #1e1f29;
        color: #94a3b8;
        border-bottom-color: #475569;
      }

      tr.is-layer-end td {
        border-bottom-color: #475569;
      }

      .col-layer {
        background: #1e1f29;
        border-left-color: #475569;
        border-right-color: #475569;
      }

      .col-item {
        background: #1e1f29;
        border-right-color: #475569;
      }

      .layer-cell {
        background: #1e1f29;
        color: #cbd5e1;
        border-bottom-color: #475569;
      }

      .layer-cell:not(.is-last-layer-cell) {
        border-bottom-color: #334155 !important;
      }

      td.col-item {
        background: #1e1f29;
      }

      .status-need {
        background-color: rgba(6, 78, 59, 0.5) !important;
        color: #6ee7b7 !important;
        box-shadow: none;
        backdrop-filter: brightness(1.2);
      }
      .status-greed-tome {
        background-color: rgba(12, 74, 110, 0.5) !important;
        color: #7dd3fc !important;
        box-shadow: none;
        backdrop-filter: brightness(1.2);
      }
      .status-pass {
        background-color: transparent !important;
        color: #475569 !important;

        &:hover {
          background-color: rgba(255, 255, 255, 0.02) !important;
          color: #64748b !important;
        }
      }
      .status-assigned {
        background-color: rgba(16, 185, 129, 0.2) !important;
        color: #34d399 !important;
        font-weight: 800;
        border: 1px solid rgba(16, 185, 129, 0.5) !important;
        box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
      }

      .status-rw-need {
        background-color: rgba(180, 83, 9, 0.2) !important;
        color: #fbbf24 !important;
        .rw-simple-count-active {
          color: #fbbf24 !important;
        }
      }
      .status-rw-obtained {
        background-color: transparent !important;
        .rw-simple-count-active {
          color: #94a3b8 !important;
          &.is-many {
            color: #f59e0b !important;
          }
        }
        .rw-simple-count-none {
          color: #475569 !important;
        }
      }
    }

    .row-header {
      color: #94a3b8;
    }

    .bis-onboarding {
      background: #16171f;
      border-color: rgba(255, 255, 255, 0.08);
    }

    .onboarding-card {
      h3 {
        color: rgba(255, 255, 255, 0.9);
      }
      p {
        color: #94a3b8;
      }
    }

    .icon-circle {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }
  }
}

.import-diff-container {
  max-height: 500px;
  overflow-y: auto;
  padding: 4px;
}

.import-empty-msg {
  text-align: center;
  padding: 40px;
  color: #64748b;
  font-size: 14px;
}

.import-summary {
  margin-bottom: 16px;
  color: #475569;
  font-weight: 600;
  font-size: 14px;
}

.diff-card {
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 12px;
  overflow: hidden;

  html.dark & {
    background: #1e1f29;
    border-color: #334155;
  }
}

.diff-header {
  padding: 12px 16px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;

  html.dark & {
    background: #2a2b36;
    border-bottom-color: #334155;
  }
}

.diff-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
  background: #dcfce7;
  color: #15803d;

  &.update {
    background: #e0f2fe;
    color: #0369a1;
  }
}

.diff-items {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diff-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  padding-bottom: 4px;
  border-bottom: 1px dashed #e2e8f0;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  html.dark & {
    border-bottom-color: #334155;
  }
}

.diff-label {
  color: #64748b;
  min-width: 60px;
}

.diff-values {
  display: flex;
  align-items: center;
  gap: 8px;

  .val {
    font-weight: 700;

    &.old {
      color: #94a3b8;
      text-decoration: line-through;
      opacity: 0.6;
    }

    &.new {
      color: #3b82f6;
    }

    &.is-raid {
      color: #15803d !important;
      html.dark & {
        color: #6ee7b7 !important;
      }
    }

    &.is-tome {
      color: #0369a1 !important;
      html.dark & {
        color: #7dd3fc !important;
      }
    }
  }
}

.is-excluded {
  opacity: 0.4;
  text-decoration: line-through;
  filter: grayscale(1);
  background-color: rgba(0, 0, 0, 0.02) !important;

  html.dark & {
    background-color: rgba(255, 255, 255, 0.05) !important;
  }
}

.correction-input-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  .correction-input {
    width: 56px !important;
    height: 20px;

    ::deep(.el-input__wrapper) {
      padding: 0;
      text-align: center;
      background: transparent;
      box-shadow: none;
      border-bottom: 1px solid transparent;
      border-radius: 0;
      height: 20px;

      &:hover,
      &.is-focus {
        border-bottom-color: #3b82f6;
      }
    }

    ::deep(.el-input__inner) {
      height: 20px;
      line-height: 20px;
      text-align: center;
      font-family: "JetBrains Mono", monospace;
      font-weight: 600;
      font-size: 11px;
      color: #94a3b8;
    }

    &.is-nonzero {
      ::deep(.el-input__inner) {
        color: #3b82f6;
      }
      ::deep(.el-input__wrapper) {
        border-bottom-color: #3b82f6;
      }
    }

    html.dark & {
      ::deep(.el-input__wrapper) {
        border-bottom-color: #334155;
      }
      &.is-nonzero ::deep(.el-input__inner) {
        color: #60a5fa;
      }
    }
  }
}

.is-header-away {
  opacity: 0.6;
}

.logic-note {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
  font-style: italic;
}
</style>

<style lang="scss">
html.dark {
  .bis-config-dialog,
  .offset-config-dialog,
  .bis-import-message-box {
    .el-dialog,
    .el-message-box {
      background-color: #1a1b26;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
  }

  .table-scroll-wrapper {
    background: #1a1b26;
    border-color: #2d2e3d;
    border-color: #2d2e3d;
  }

  .bis-table {
    background-color: #1a1b26;

    th {
      background-color: #1a1b26 !important;
      color: #9ca3af;
      border-right-color: #2d2e3d;
      border-bottom-color: #232433;
    }

    td {
      background-color: #1a1b26 !important;
      border-right-color: #2d2e3d;
      border-bottom-color: #232433;
      color: #d1d5db;
    }
  }

  .header-incomplete {
    background-color: rgba(244, 63, 94, 0.1) !important;
    color: #fb7185 !important;
  }

  .split-cell {
    background: #1a1b26;
    border-color: #2d2e3d;
    padding: 3px;
  }

  .half-cell:not(.active) {
    color: #4b5563;
    &:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #9ca3af;
    }
  }

  .half-cell.active {
    &.left-raid {
      background: #4f46e5;
      box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.3),
        0 0 10px rgba(79, 70, 229, 0.2);
    }
    &.right-tome {
      background: #0284c7;
      box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.3),
        0 0 10px rgba(2, 132, 199, 0.2);
    }
  }

  .mini-stepper {
    .el-input__wrapper {
      background-color: #1a1b26 !important;
      box-shadow: 0 0 0 1px #2d2e3d inset !important;
      border: none !important;
    }
    .el-input-number__increase,
    .el-input-number__decrease {
      background: #11121d !important;
      border: none !important;
      border-left: 1px solid #2d2e3d !important;
      color: #6b7280 !important;
      &:hover {
        background: #1a1b26 !important;
        color: #3b82f6 !important;
      }
    }
    .el-input__inner {
      color: #e5e7eb !important;
    }
  }

  .row-header {
    color: #9ca3af;
    background-color: #1a1b26 !important;
  }

  .sticky-col {
    background-color: #1a1b26 !important;
    border-right-color: #2d2e3d !important;
  }

  .bis-import-message-box {
    .el-textarea__inner {
      background-color: #11121d;
      color: #d1d5db;
      border-color: #2d2e3d;
      &:focus {
        border-color: #3b82f6;
      }
    }
  }
}

.bis-import-message-box {
  .el-textarea__inner {
    min-height: 84px !important;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
  }
}
</style>

<style lang="scss">
.el-popper.captain-player-popper,
.el-popper.captain-player-tooltip-new {
  background: #ffffff !important;
  border: 1px solid #e4e7ed !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  padding: 4px !important;

  .el-select-dropdown__wrap {
    max-height: none !important;
  }

  .tooltip-title {
    padding: 4px 8px;
    font-size: 14px;
    color: #475569;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 8px;
    font-weight: 600;

    span {
      font-weight: 700;
      color: #1e293b;
      margin: 0 2px;
    }

    html.dark & {
      color: #94a3b8;
      border-bottom-color: rgba(255, 255, 255, 0.1);
      span {
        color: #f1f5f9;
      }
    }
  }

  .tooltip-player-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 140px;
  }

  .tooltip-player-item {
    padding: 2px 8px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover:not(.is-disabled) {
      background: rgba(0, 0, 0, 0.05);
    }
    &.is-active {
      background: rgba(59, 130, 246, 0.1);
    }
    &.is-disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    &.clear-btn {
      color: #f87171;
      font-size: 10px;
      font-weight: bold;
      text-align: center;
      padding: 4px 0;
      &:hover {
        background: rgba(248, 113, 113, 0.05);
      }
    }
  }

  .tooltip-divider {
    height: 1px;
    background: #e4e7ed;
    margin: 3px 0;
  }

  .el-popper__arrow {
    &::before {
      background: #ffffff !important;
      border: 1px solid #e4e7ed !important;
      border-top: none !important;
      border-right: none !important;
    }
  }

  html.dark & {
    background: #1e293b !important;
    border-color: #334155 !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;

    .tooltip-player-item:hover:not(.is-disabled) {
      background: rgba(255, 255, 255, 0.1);
    }
    .tooltip-divider {
      background: #334155;
    }

    .el-popper__arrow::before {
      background: #1e293b !important;
      border: 1px solid #334155 !important;
      border-top: none !important;
      border-right: none !important;
    }
  }
}

.el-popper.bis-common-popover {
  background: #1f2937 !important;
  border: 1px solid #374151 !important;
  padding: 8px 12px !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4) !important;
  border-radius: 8px !important;
  color: #f3f4f6 !important;
  min-width: unset !important;

  .el-popper__arrow::before {
    background: #1f2937 !important;
    border: 1px solid #374151 !important;
  }

  .popover-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 11.5px;
    white-space: nowrap;
  }

  .reason-section {
    color: #e5e7eb;
    line-height: 1.4;
    font-weight: 500;
  }

  .popover-divider {
    height: 1px;
    background: rgba(75, 85, 99, 0.4);
    margin: 2px 0;
  }

  .obtained-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .obtained-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .item-name {
    color: #d1d5db;
  }

  .item-count {
    color: #fbbf24;
    font-family: "JetBrains Mono", monospace;
    font-weight: 700;
  }

  .obtained-empty {
    color: #6b7280;
    text-align: center;
    font-style: italic;
  }
}

/* Macro Syntax Highlighting */
.macro-cmd {
  color: #94a3b8;
  font-weight: normal;
}
.macro-item {
  color: #334155;
  font-weight: 700;
}
.role-tank {
  color: #2563eb;
  font-weight: 600;
}
.role-healer {
  color: #16a34a;
  font-weight: 600;
}
.role-dps {
  color: #dc2626;
  font-weight: 600;
}

html.dark {
  .macro-cmd {
    color: #64748b;
  }
  .macro-item {
    color: #e2e8f0;
  }
  .role-tank {
    color: #60a5fa;
  }
  .role-healer {
    color: #4ade80;
  }
  .role-dps {
    color: #f87171;
  }
}
</style>
