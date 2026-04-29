<script setup lang="ts">
import type { MessageBoxInputData } from "element-plus";
import type {
  ImportedColumnPayload,
  MitigationImportMapMeta,
  MitigationMechanicsImportData,
  MitigationPlayerActionsImportData,
} from "@/composables/mitigation/useMitigationImportCodec";
import type { Command } from "@/composables/useCommandHistory";
import type { MitigationSheetTemplate } from "@/resources/mitigationSheetTemplates";
import type {
  ColumnDef,
  EncounterCandidate,
  MitigationRow,
  MitigationSkill,
  PartyMember,
  PlayerActionRecord,
  SheetState,
} from "@/types/mitigation";
import { ArrowDown, Close, Download, Plus, Setting, Upload } from "@element-plus/icons-vue";
import { useStorage } from "@vueuse/core";
import { ElMessage, ElMessageBox } from "element-plus";
import * as LZString from "lz-string";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  toRaw,
  triggerRef,
  watch,
} from "vue";
import { VueDraggable } from "vue-draggable-plus";
import MitigationGrid from "@/components/MitigationGrid.vue";
import ZoneSelecter from "@/components/zoneSelecter.vue";
import {
  isMitigationMechanicsImportData,
  isMitigationPlayerActionsImportData,
  parseMitigationImportText,
} from "@/composables/mitigation/useMitigationImportCodec";
import {
  buildDefaultFilters,
  buildSheetComparableState,
  fromSheetStorageShards,
  normalizeRowsForStorage,
  toSheetStorageShards,
} from "@/composables/mitigation/useMitigationSheetStorage";
import { useCommandHistory } from "@/composables/useCommandHistory";
import { useIndexedDB } from "@/composables/useIndexedDB";
import { useLogParser } from "@/composables/useLogParser";
import { useMitigationSimulator } from "@/composables/useMitigationSimulator";
import { GLOBAL_SKILL_MAX_LEVEL } from "@/resources/globalSkills";
import { DEFAULT_JOB_SORT_ORDER } from "@/resources/jobSortOrder";
import { getActionChinese } from "@/resources/logic/actionChinese";
import { completeIcon } from "@/resources/logic/status";
import { mitigationKeigennSkills } from "@/resources/mitigationKeigennSkills";
import { mitigationSheetTemplates } from "@/resources/mitigationSheetTemplates";
import { createActionId } from "@/utils/actionId";
import { chineseToIcon } from "@/utils/chineseToIcon";
import { parseDynamicPerformance, parseDynamicValue } from "@/utils/dynamicValue";
import { getMitigationColumnDisplayName } from "@/utils/mitigationColumn";
import { buildPartyColumnKey } from "@/utils/mitigationConstants";
import { getMitigationGridColumnWidth, MITIGATION_GRID_WIDTH } from "@/utils/mitigationGridLayout";
import Util from "@/utils/util";
import { getIconSrcByPath } from "@/utils/xivapi";
import { useDark, useToggle } from "@vueuse/core";

const { parseFile, extractMechanics } = useLogParser();

const loading = ref(false);
const encounters = ref<EncounterCandidate[]>([]);
const showEncounterDialog = ref(false);
const isRestoringSheet = ref(false);
const selectedEncounter = ref<EncounterCandidate | null>(null);
const showImportModeDialog = ref(false);
type LogImportMode = "mechanics-empty" | "mechanics-auto" | "actions-override-current";
type DamageNumberDisplayUnit = "k" | "w";
const logImportMode = ref<LogImportMode>("mechanics-auto");
const selectedOverrideSheetId = ref("");

const {
  canUndo,
  canRedo,
  entries: commandEntries,
  cursor: commandCursor,
  clear: clearCommandHistory,
  execute: executeCommand,
  undo: undoCommand,
  redo: redoCommand,
  jumpTo: jumpToCommandCursor,
  isApplying: isApplyingCommand,
} = useCommandHistory({ maxSize: 500 });

const encounterActionsCache = shallowRef<Record<string, PlayerActionRecord[]>>({});
const showHistoryDialog = ref(false);
const MITIGATION_MESSAGE_SCOPE_CLASS = "mitigation-generator-message-scope";

type MitigationDBItem =
  | { key: "sheetOrder"; value: string[] }
  | { key: "sheetMetaMap"; value: Record<string, Pick<SheetState, "id" | "name" | "meta">> }
  | { key: "sheetMechanicsMap"; value: Record<string, SheetState["mechanics"]> }
  | { key: "sheetPlannerMap"; value: Record<string, SheetState["planner"]> }
  | { key: "activeSheetId"; value: string | null }
  | { key: "mechanicAliases"; value: Record<string, string> }
  | { key: "mechanicColors"; value: Record<string, string> };

const db = useIndexedDB<MitigationDBItem>("mitigation-sheets");
const sheets = shallowRef<SheetState[]>([]);
const activeSheetId = ref<string | null>(null);
const editingSheetId = ref<string | null>(null);
const editingName = ref("");
const sheetContextMenu = ref({
  visible: false,
  top: 0,
  left: 0,
  sheetId: "",
});
const isHydrating = ref(true);
const persistDelayMs = 500;
let persistSheetsTimer: number | null = null;
let persistActiveIdTimer: number | null = null;
let sheetRestoreToken = 0;

const activeSheet = computed(() => sheets.value.find((s) => s.id === activeSheetId.value));
const eligibleOverrideSheets = computed(() => {
  const encounter = selectedEncounter.value;
  if (!encounter || encounter.zoneId === null)
    return [] as Array<{ id: string; name: string; isActive: boolean }>;

  return sheets.value
    .filter((sheet) => sheet.meta?.zoneId === encounter.zoneId)
    .map((sheet) => ({
      id: sheet.id,
      name: sheet.name,
      isActive: sheet.id === activeSheetId.value,
    }));
});
const hasPredefinedTemplates = computed(() => mitigationSheetTemplates.length > 0);
const canConfirmImportMode = computed(() => {
  if (logImportMode.value !== "actions-override-current") return true;
  return !!selectedOverrideSheetId.value;
});

function ensureOverrideTargetSelection() {
  if (logImportMode.value !== "actions-override-current") return;
  if (
    selectedOverrideSheetId.value &&
    eligibleOverrideSheets.value.some((s) => s.id === selectedOverrideSheetId.value)
  ) {
    return;
  }
  selectedOverrideSheetId.value =
    eligibleOverrideSheets.value.find((s) => s.isActive)?.id ||
    eligibleOverrideSheets.value[0]?.id ||
    "";
}

const rawRows = shallowRef<MitigationRow[]>([]);
const playerActions = shallowRef<PlayerActionRecord[]>([]);
const columns = shallowRef<ColumnDef[]>([]);
const playerLevel = ref(100);
const filterMechanics = ref<string[]>([]);
const mechanicAliases = ref<Record<string, string>>({});
const mechanicColors = ref<Record<string, string>>({
  aoe: "#0891b2",
  share: "#f59e0b",
  tb: "#e11d48",
  normal: "#4b5563",
});

const isActiveSheetBlank = computed(() => {
  if (!activeSheet.value) return false;
  return (
    rawRows.value.length === 0 && columns.value.length === 0 && playerActions.value.length === 0
  );
});

const DEFAULT_JOB_SKILL_FILTERS: Record<number, number[]> = {
  19: [7382, 7548],
  20: [7549, 7541, 7394],
  21: [16464, 3552],
  22: [7541, 7542],
  23: [7541],
  24: [3570, 25861, 7561, 7432],
  25: [155, 7559, 157],
  27: [25799],
  28: [7561, 7434, 25867, 7559, 16538, 3583],
  30: [7542, 7541, 2241],
  31: [7541],
  32: [7548],
  33: [16556, 7561, 3614, 7559, 25873],
  34: [7542, 7541, 7548, 36962],
  35: [],
  36: [],
  37: [7382, 7548, 16151],
  38: [7541, 7548],
  39: [24404, 7542, 7541, 7548],
  40: [24300, 7561, 24305, 24318],
  41: [7548, 7541, 7542],
  42: [],
};
const jobSkillFilters = useStorage<Record<number, number[]>>(
  "mitigation-job-skill-filters",
  DEFAULT_JOB_SKILL_FILTERS,
  localStorage,
  { shallow: true },
);
const jobSkillOrders = useStorage<Record<number, number[]>>(
  "mitigation-job-skill-orders",
  {},
  localStorage,
  { shallow: true },
);
const autoArrangeToleranceSeconds = useStorage("mitigation-auto-arrange-tolerance-seconds", 2);
const damageNumberDisplayUnit = useStorage<DamageNumberDisplayUnit>(
  "mitigation-damage-number-display-unit",
  "w",
);

const HYDRATING_SKELETON_FALLBACK_COLUMNS = 14;
const HYDRATING_SKELETON_FALLBACK_SKILLS_PER_COLUMN = 4;
const HYDRATING_SKELETON_ROW_COUNT = 34;

const skeletonFixedCellWidths = computed(() => {
  const widths: number[] = [
    MITIGATION_GRID_WIDTH.castStart,
    MITIGATION_GRID_WIDTH.time,
    MITIGATION_GRID_WIDTH.nameMin,
    MITIGATION_GRID_WIDTH.target,
  ];
  widths.push(
    MITIGATION_GRID_WIDTH.damage,
    MITIGATION_GRID_WIDTH.shield,
    MITIGATION_GRID_WIDTH.reduction,
    MITIGATION_GRID_WIDTH.damage,
  );
  return widths;
});

const skeletonPartySkillCounts = computed(() => {
  if (columns.value.length === 0) {
    return Array.from(
      { length: HYDRATING_SKELETON_FALLBACK_COLUMNS },
      () => HYDRATING_SKELETON_FALLBACK_SKILLS_PER_COLUMN,
    );
  }
  return columns.value.map((col) => {
    const hidden = new Set(col.hiddenSkillIds || []);
    const visibleCount = col.skills.reduce(
      (count, skill) => count + (hidden.has(skill.id) ? 0 : 1),
      0,
    );
    return Math.max(1, visibleCount);
  });
});

const skeletonPartyColumnWidths = computed(() => {
  return skeletonPartySkillCounts.value.map((skillCount) =>
    getMitigationGridColumnWidth(skillCount),
  );
});

const jobOrder = new Map(DEFAULT_JOB_SORT_ORDER.map((job, index) => [job, index]));
const mitigationJobEnums = new Set<number>(
  mitigationKeigennSkills.flatMap((skill) =>
    skill.job.map((job) => Util.baseJobEnumConverted(job)),
  ),
);
const partyCompositionJobOptions = computed(() => {
  return Util.getBattleJobs3()
    .map((job) => {
      const jobEnum = Util.jobToJobEnum(job);
      return {
        value: jobEnum,
        label: Util.jobToFullName(job).cn,
      };
    })
    .filter((option) => mitigationJobEnums.has(option.value))
    .sort((a, b) => getJobOrder(a.value) - getJobOrder(b.value));
});

function getJobOrder(jobEnum: number) {
  const normalized = Util.baseJobEnumConverted(jobEnum);
  return jobOrder.get(normalized) ?? Number.MAX_SAFE_INTEGER;
}

const mechanicTargetJobNameSet = new Set(
  Util.getBattleJobs3()
    .map((job) => Util.jobToFullName(job).simple1)
    .filter((name): name is string => !!name),
);

function normalizeRowDamageType(value: unknown): MitigationRow["damageType"] {
  const type = String(value || "physics");
  if (type === "magic" || type === "darkness" || type === "physics") return type;
  return "physics";
}

function normalizeMechanicTargets(targets: unknown[], targetCount: number, partySize: number) {
  const normalizedPartySize =
    Number.isFinite(partySize) && partySize > 0 ? Math.max(1, Math.round(partySize)) : 8;

  const next: string[] = [];
  const pushUnique = (name: string) => {
    if (!next.includes(name)) next.push(name);
  };

  targets.forEach((target) => {
    const name = String(target || "").trim();
    if (!name) return;
    if (name === "全部") {
      pushUnique("全部");
      return;
    }
    if (mechanicTargetJobNameSet.has(name)) pushUnique(name);
  });

  if (next.includes("全部")) return ["全部"];

  const safeTargetCount = Number.isFinite(targetCount) ? Math.max(0, Math.round(targetCount)) : 0;
  if (safeTargetCount >= normalizedPartySize) return ["全部"];

  return next;
}

function normalizeMechanicRows(rows: MitigationRow[], options: { partySize?: number } = {}) {
  const normalizedPartySize =
    Number.isFinite(options.partySize) && Number(options.partySize) > 0
      ? Math.max(1, Math.round(Number(options.partySize)))
      : 8;

  return rows.map((row, index) => {
    const { shieldValue: _legacyShieldValue, ...restRow } = row as MitigationRow & {
      shieldValue?: unknown;
    };
    const timestampRaw = Number(row.timestamp);
    const timestamp = Number.isFinite(timestampRaw) ? timestampRaw : 0;
    const rawDamageRaw = Number(row.rawDamage);
    const rawDamage = Number.isFinite(rawDamageRaw) ? Math.max(0, Math.round(rawDamageRaw)) : 0;

    const castRaw = Number.parseFloat(String(row.castTime ?? ""));
    const castTime =
      Number.isFinite(castRaw) && castRaw > 0 ? Number(castRaw.toFixed(2)) : undefined;

    const sourceTargets = Array.isArray(row.targets) ? row.targets : [];
    const parsedTargetCount = Number.isFinite(Number(row.targetCount))
      ? Math.max(0, Math.round(Number(row.targetCount)))
      : 0;
    const targets = normalizeMechanicTargets(sourceTargets, parsedTargetCount, normalizedPartySize);
    const targetCount = targets.includes("全部")
      ? Math.max(normalizedPartySize, parsedTargetCount, 1)
      : Math.max(parsedTargetCount, targets.length, 1);

    return {
      ...restRow,
      key: String(row.key || "").trim() || `row_${index}`,
      timestamp: Number(timestamp.toFixed(2)),
      actionId: String(row.actionId || "").trim(),
      action: String(row.action || "").trim() || String(row.actionId || "").trim() || "Unknown",
      source: "",
      damageType: normalizeRowDamageType(row.damageType),
      rawDamage,
      targetCount,
      targets,
      targetIds: [],
      damageDetails: [],
      rawLines: [],
      flags: [],
      castTime: castTime !== undefined ? String(castTime) : undefined,
      castStartTime: castTime !== undefined ? Number((timestamp - castTime).toFixed(2)) : undefined,
      _sim: undefined,
      _sim_str: undefined,
    } satisfies MitigationRow;
  });
}

function getAliasedName(actionId: string, originalName: string) {
  const aliases = mechanicAliases.value;
  return aliases[actionId] || aliases[originalName] || originalName;
}

function applySavedSkillOrder(skills: MitigationSkill[], savedOrder?: number[]) {
  if (!savedOrder || savedOrder.length === 0) return [...skills];

  const orderMap = new Map(savedOrder.map((id, index) => [id, index]));
  return skills.slice().sort((a, b) => {
    const indexA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const indexB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (indexA === indexB) return a.recast - b.recast;
    return indexA - indexB;
  });
}

function isSameNumberArray(a?: number[], b?: number[]) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function applyAliasesToRows(rows: MitigationRow[]) {
  let changed = false;
  const next = rows.map((row) => {
    const alias = mechanicAliases.value[row.actionId] || mechanicAliases.value[row.action];
    if (!alias || alias === row.action) return row;
    changed = true;
    return { ...row, action: alias, _v: (row._v || 0) + 1 };
  });
  return changed ? next : rows;
}

function ensureUniqueRowKeys(rows: MitigationRow[]) {
  const keyCounter = new Map<string, number>();
  let changed = false;
  const next = rows.map((row, index) => {
    const baseKey = String(row.key || "").trim() || `row_${index}`;
    const currentCount = keyCounter.get(baseKey) || 0;
    keyCounter.set(baseKey, currentCount + 1);
    const uniqueKey = currentCount === 0 ? baseKey : `${baseKey}_${currentCount + 1}`;
    if (uniqueKey === row.key && currentCount === 0) return row;
    changed = true;
    return { ...row, key: uniqueKey, _v: (row._v || 0) + 1 };
  });
  return changed ? next : rows;
}

function sanitizeFiltersByRows(filters: string[], rows: MitigationRow[]) {
  const validIds = new Set(rows.map((row) => String(row.actionId ?? "").trim()));
  if (validIds.size === 0) return [] as string[];
  if (filters.length === 0) return [];
  const next = filters
    .map((id) => String(id || "").trim())
    .filter((id, index, arr) => validIds.has(id) && arr.indexOf(id) === index);
  return next;
}

function renameRowsByActionId(rows: MitigationRow[], actionId: string, nextName: string) {
  return rows.map((row) =>
    row.actionId === actionId ? { ...row, action: nextName, _v: (row._v || 0) + 1 } : row,
  );
}

function resolveRowKeyByTimestamp(rows: MitigationRow[], ts: number) {
  if (rows.length === 0) return undefined;
  const idx = rows.findIndex((r) => r.timestamp >= ts);
  if (idx === -1) return rows.at(-1)?.key;
  return rows[idx]?.key;
}

function ensurePlayerActionsRowKey(actions: PlayerActionRecord[], rows: MitigationRow[]) {
  const rowByKey = new Map(rows.map((row) => [row.key, row] as const));
  const rowKeySet = new Set(rowByKey.keys());
  return actions.map((action) => {
    const normalizedId = action.id || createActionId();
    if (action.rowKey && rowKeySet.has(action.rowKey)) {
      const anchoredRow = rowByKey.get(action.rowKey);
      const keyTimestampMatches =
        !!anchoredRow && Math.abs(anchoredRow.timestamp - action.timestamp) <= 0.001;
      if (keyTimestampMatches) {
        return normalizedId === action.id ? action : { ...action, id: normalizedId };
      }
    }
    const resolvedRowKey = resolveRowKeyByTimestamp(rows, action.timestamp);
    if (!resolvedRowKey) {
      return normalizedId === action.id ? action : { ...action, id: normalizedId };
    }
    return {
      ...action,
      id: normalizedId,
      rowKey: resolvedRowKey,
    };
  });
}

const mechanicOptions = computed(() => {
  const map = new Map<string, { action: string; timestamp: number }>();
  rawRows.value.forEach((r: MitigationRow) => {
    if (!map.has(r.actionId)) {
      map.set(r.actionId, { action: r.action, timestamp: r.timestamp });
    } else {
      // Keep easiest timestamp found (though rows should be sorted, be safe)
      const existing = map.get(r.actionId)!;
      if (r.timestamp < existing.timestamp) {
        map.set(r.actionId, { action: r.action, timestamp: r.timestamp });
      }
    }
  });
  return Array.from(map.entries(), ([actionId, info]) => ({
    actionId,
    action: info.action,
    timestamp: info.timestamp,
  })).sort((a, b) => a.timestamp - b.timestamp);
});

const filteredRows = computed(() => {
  const filters = filterMechanics.value;
  if (!filters || filters.length === 0) return [];
  return rawRows.value.filter((row: MitigationRow) => filters.includes(row.actionId));
});

// Simulator
const { runSimulation } = useMitigationSimulator(rawRows, columns, playerActions);

let isSimulatingInternal = false;
// 当核心输入变化时运行模拟
watch(
  [rawRows, playerActions, columns, filterMechanics],
  () => {
    if (isRestoringSheet.value || isHydrating.value || isSimulatingInternal) return;

    isSimulatingInternal = true;
    try {
      runSimulation();
    } finally {
      isSimulatingInternal = false;
    }
  },
  { immediate: true, deep: false },
);

function isTypingElement(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

function handleGlobalShortcuts(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeSheetContextMenu();
    return;
  }

  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  if (isTypingElement(event.target)) return;

  const key = event.key.toLowerCase();
  if (key === "z" && !event.shiftKey) {
    event.preventDefault();
    undoActions();
    return;
  }
  if (key === "y" || (key === "z" && event.shiftKey)) {
    event.preventDefault();
    redoActions();
    return;
  }
  if (key === "h") {
    event.preventDefault();
    showHistoryDialog.value = true;
  }
}

onMounted(() => {
  void restoreFromDB();
  const isDark = useDark({ storageKey: "mitigation-generator-theme" });
  const toggleDark = useToggle(isDark);
  if (isDark.value === true) {
    // 固定使用浅色主题
    toggleDark();
  }
  document.body.classList.add(MITIGATION_MESSAGE_SCOPE_CLASS);
  window.addEventListener("keydown", handleGlobalShortcuts);
  window.addEventListener("pointerdown", handleGlobalPointerDown, true);
});

onBeforeUnmount(() => {
  document.body.classList.remove(MITIGATION_MESSAGE_SCOPE_CLASS);
  window.removeEventListener("keydown", handleGlobalShortcuts);
  window.removeEventListener("pointerdown", handleGlobalPointerDown, true);
});

const vFocus = {
  mounted: (el: HTMLElement) => {
    const input = el.querySelector("input") || el;
    const focusAndSelect = () => {
      input.focus();
      if (input instanceof HTMLInputElement) {
        input.select();
        input.setSelectionRange(0, input.value.length);
      }
    };
    focusAndSelect();
    requestAnimationFrame(focusAndSelect);
    window.setTimeout(focusAndSelect, 0);
  },
};

async function restoreFromDB() {
  isHydrating.value = true;
  try {
    const [
      sheetOrderItem,
      sheetMetaMapItem,
      sheetMechanicsMapItem,
      sheetPlannerMapItem,
      activeItem,
      mechanicAliasesItem,
    ] = await Promise.all([
      db.get("sheetOrder"),
      db.get("sheetMetaMap"),
      db.get("sheetMechanicsMap"),
      db.get("sheetPlannerMap"),
      db.get("activeSheetId"),
      db.get("mechanicAliases"),
    ]);

    if (
      sheetOrderItem?.value &&
      sheetMetaMapItem?.value &&
      sheetMechanicsMapItem?.value &&
      sheetPlannerMapItem?.value
    ) {
      sheets.value = fromSheetStorageShards({
        sheetOrder: sheetOrderItem.value,
        sheetMetaMap: sheetMetaMapItem.value,
        sheetMechanicsMap: sheetMechanicsMapItem.value,
        sheetPlannerMap: sheetPlannerMapItem.value,
      });
    }

    if (activeItem?.value !== undefined) activeSheetId.value = activeItem.value;
    if (mechanicAliasesItem?.value) mechanicAliases.value = mechanicAliasesItem.value;

    const colorsItem = await db.get("mechanicColors");
    if (colorsItem?.value) {
      mechanicColors.value = { ...mechanicColors.value, ...colorsItem.value };
    }
  } catch (err) {
    console.warn("Failed to restore from IndexedDB:", err);
  } finally {
    if (sheets.value.length > 0 && !activeSheetId.value) {
      activeSheetId.value = sheets.value[0]?.id || null;
    }
    isHydrating.value = false;
    clearCommandHistory();
  }
}

async function persistSheets(force = false) {
  if (isHydrating.value && !force) return;
  try {
    const payload = toSheetStorageShards(toRaw(sheets.value) as SheetState[]);
    await Promise.all([
      db.set({ key: "sheetOrder", value: payload.sheetOrder }),
      db.set({ key: "sheetMetaMap", value: payload.sheetMetaMap }),
      db.set({ key: "sheetMechanicsMap", value: payload.sheetMechanicsMap }),
      db.set({ key: "sheetPlannerMap", value: payload.sheetPlannerMap }),
    ]);
  } catch (err) {
    console.warn("Failed to persist sheets:", err);
    ElMessage.warning("保存失败，请检查浏览器存储空间或权限。");
  }
}

async function persistActiveSheetId() {
  if (isHydrating.value) return;
  try {
    await db.set({ key: "activeSheetId", value: activeSheetId.value });
  } catch (err) {
    console.warn("Failed to persist active sheet id:", err);
  }
}

async function persistMechanicAliases() {
  if (isHydrating.value) return;
  try {
    await db.set({ key: "mechanicAliases", value: toRaw(mechanicAliases.value) });
  } catch (err) {
    console.warn("Failed to persist mechanic aliases:", err);
  }
}

watch(
  mechanicAliases,
  () => {
    void persistMechanicAliases();
  },
  { deep: true },
);

async function persistMechanicColors() {
  if (isHydrating.value) return;
  try {
    await db.set({ key: "mechanicColors", value: toRaw(mechanicColors.value) });
  } catch (err) {
    console.warn("Failed to persist mechanic colors:", err);
  }
}

watch(
  mechanicColors,
  () => {
    void persistMechanicColors();
  },
  { deep: true },
);

watch(
  sheets,
  () => {
    if (persistSheetsTimer !== null) window.clearTimeout(persistSheetsTimer);
    persistSheetsTimer = window.setTimeout(() => {
      persistSheetsTimer = null;
      void persistSheets();
    }, persistDelayMs);
  },
  { deep: false },
);

watch(activeSheetId, () => {
  if (persistActiveIdTimer !== null) window.clearTimeout(persistActiveIdTimer);
  persistActiveIdTimer = window.setTimeout(() => {
    persistActiveIdTimer = null;
    void persistActiveSheetId();
  }, persistDelayMs);
});

watch(
  [logImportMode, eligibleOverrideSheets],
  () => {
    ensureOverrideTargetSelection();
  },
  { deep: false },
);

// Sync back to sheets
watch(
  [rawRows, playerActions, columns, playerLevel, filterMechanics],
  () => {
    if (isRestoringSheet.value || !activeSheetId.value || isHydrating.value) return;

    const index = sheets.value.findIndex((s) => s.id === activeSheetId.value);
    if (index === -1) return;

    const sheet = sheets.value[index];
    if (sheet) {
      const normalizedRows = normalizeRowsForStorage(rawRows.value);
      const nextComparableState = buildSheetComparableState(
        rawRows.value,
        playerActions.value,
        columns.value,
        filterMechanics.value,
        playerLevel.value,
      );
      const currentComparableState = buildSheetComparableState(
        sheet.mechanics.rows,
        sheet.planner.playerActions,
        sheet.planner.columns,
        sheet.mechanics.filterMechanics || [],
        sheet.planner.playerLevel || GLOBAL_SKILL_MAX_LEVEL,
      );
      if (nextComparableState === currentComparableState) return;

      const nextSheets = sheets.value.slice();
      nextSheets[index] = {
        ...sheet,
        mechanics: {
          ...sheet.mechanics,
          rows: normalizedRows,
          filterMechanics: filterMechanics.value,
        },
        planner: {
          ...sheet.planner,
          playerActions: playerActions.value,
          columns: columns.value,
          playerLevel: playerLevel.value,
        },
      };
      sheets.value = nextSheets;
    }
  },
  { deep: false, flush: "post" },
);

// Load active sheet
function applySheetToWorkspace(id: string | null) {
  const restoreToken = ++sheetRestoreToken;
  const sheet = sheets.value.find((s) => s.id === id);
  isRestoringSheet.value = true;

  if (sheet) {
    const normalizedRows = ensureUniqueRowKeys(
      applyAliasesToRows(
        normalizeMechanicRows(sheet.mechanics.rows || [], {
          partySize: sheet.planner.columns?.length || 8,
        }),
      ),
    );
    rawRows.value = normalizedRows;
    playerActions.value = ensurePlayerActionsRowKey(
      sheet.planner.playerActions || [],
      normalizedRows,
    );
    playerLevel.value = sheet.planner.playerLevel || GLOBAL_SKILL_MAX_LEVEL;
    columns.value = normalizeColumnsWithJobFilters(sheet.planner.columns || [], {
      forceGlobal: true,
    }).columns;
    const fallbackFilters = buildDefaultFilters(rawRows.value);
    const incomingFilters = Array.isArray(sheet.mechanics.filterMechanics)
      ? sheet.mechanics.filterMechanics
      : fallbackFilters;
    filterMechanics.value = sanitizeFiltersByRows(incomingFilters, normalizedRows);
  } else {
    rawRows.value = [];
    playerActions.value = [];
    columns.value = [];
    playerLevel.value = 100;
    filterMechanics.value = [];
  }

  void nextTick(() => {
    if (restoreToken !== sheetRestoreToken) return;
    requestAnimationFrame(() => {
      if (restoreToken !== sheetRestoreToken) return;
      runSimulation();
      triggerRef(rawRows);
      isRestoringSheet.value = false;
    });
  });
}

watch(
  activeSheetId,
  (id) => {
    applySheetToWorkspace(id);
  },
  { immediate: true, flush: "post" },
);

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isSameState<T>(a: T, b: T) {
  if (Object.is(a, b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

function isSameStringArray(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function isSamePlayerActionList(a: PlayerActionRecord[], b: PlayerActionRecord[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;
    if (
      left.id !== right.id ||
      left.timestamp !== right.timestamp ||
      left.columnKey !== right.columnKey ||
      left.skillId !== right.skillId ||
      left.rowKey !== right.rowKey ||
      left.recastOverride !== right.recastOverride
    ) {
      return false;
    }
  }
  return true;
}

function getCommandLabel(label?: string) {
  if (!label) return "未命名操作";
  const map: Record<string, string> = {
    "rename-mechanic": "重命名机制",
    "create-sheet": "创建 Sheet",
    "override-sheet-actions": "覆盖释放信息",
    "reorder-sheets": "拖拽排序 Sheet",
    "delete-sheet": "删除 Sheet",
    "duplicate-sheet": "复制 Sheet 副本",
    "rename-sheet": "重命名 Sheet",
    "set-sheet-zone": "设置 Sheet 地图",
    "apply-template-sheet-meta": "应用模板 Sheet 信息",
    "switch-sheet": "切换 Sheet",
    "player-level": "修改等级",
    "color-aoe": "修改 AOE 颜色",
    "color-tb": "修改死刑颜色",
    "color-normal": "修改普通颜色",
    "update-columns": "更新职业列",
    "update-player-actions": "更新释放",
    "update-filter": "更新机制筛选",
    "update-rows": "更新机制行",
    "add-custom-row": "新增自定义行",
    "import-mechanics": "导入机制",
    "import-player-actions": "导入玩家减伤",
    "update-party-composition": "编辑职业构成",
  };
  return map[label] || label;
}

const historyTimeline = computed(() => {
  const items = [
    {
      cursor: 0,
      label: "初始状态",
      active: commandCursor.value === 0,
    },
  ];
  commandEntries.value.forEach((entry) => {
    items.push({
      cursor: entry.cursor,
      label: getCommandLabel(entry.label),
      active: commandCursor.value === entry.cursor,
    });
  });
  return items;
});

function jumpToHistory(cursor: number) {
  jumpToCommandCursor(cursor);
}

function canTrackCommand() {
  return !isHydrating.value && !isApplyingCommand.value;
}

function runCommand(command: Command) {
  if (!canTrackCommand()) {
    command.redo();
    return;
  }
  executeCommand(command);
}

function applyWithCommand<T>(
  current: T,
  next: T,
  apply: (value: T) => void,
  options?: { coalesceKey?: string; label?: string; equals?: (a: T, b: T) => boolean },
) {
  const equals = options?.equals || isSameState;
  if (equals(current, next)) return;

  const before = deepClone(current);
  const after = deepClone(next);
  runCommand({
    label: options?.label,
    coalesceKey: options?.coalesceKey,
    redo: () => apply(deepClone(after)),
    undo: () => apply(deepClone(before)),
  });
}

function undoActions() {
  undoCommand();
}

function redoActions() {
  redoCommand();
}

async function handleRenameMechanic(originalName: string, actionId: string) {
  const current = getAliasedName(actionId, originalName);
  ElMessageBox.prompt("请输入新的机制名称 (留空恢复默认)", "重命名机制", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    inputValue: current,
  })
    .then((res) => {
      const value = (res as any).value;
      const prevAliases = deepClone(mechanicAliases.value);
      const prevSheets = deepClone(sheets.value);
      const prevRows = deepClone(rawRows.value);
      const nextAliases = { ...mechanicAliases.value };

      if (value && value !== originalName) {
        nextAliases[actionId] = value;
      } else {
        delete nextAliases[actionId];
      }

      // 同步更新所有 Sheet 中的数据
      const newName = value || originalName;
      const nextSheets = sheets.value.map((s) => ({
        ...s,
        mechanics: {
          ...s.mechanics,
          rows: renameRowsByActionId(s.mechanics.rows, actionId, newName),
        },
      }));

      // 同步更新当前正在编辑的数据
      const nextRows = renameRowsByActionId(rawRows.value, actionId, newName);

      runCommand({
        label: "rename-mechanic",
        redo: () => {
          mechanicAliases.value = deepClone(nextAliases);
          sheets.value = deepClone(nextSheets);
          rawRows.value = deepClone(nextRows);
        },
        undo: () => {
          mechanicAliases.value = deepClone(prevAliases);
          sheets.value = deepClone(prevSheets);
          rawRows.value = deepClone(prevRows);
        },
      });
    })
    .catch(() => {});
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    if (!file) return;
    loading.value = true;
    try {
      const candidates = await parseFile(file);
      if (candidates.length > 0) {
        encounters.value = candidates;
        showEncounterDialog.value = true;
      } else {
        ElMessage.warning("未在日志中发现战斗记录");
      }
    } catch (e) {
      console.error(e);
      ElMessage.error("导入失败，请检查日志文件是否正确");
    } finally {
      loading.value = false;
      input.value = "";
    }
  }
}

function handleEncounterSelect(encounter: EncounterCandidate) {
  selectedEncounter.value = encounter;
  if (
    (encounter.zoneId === null || eligibleOverrideSheets.value.length === 0) &&
    logImportMode.value === "actions-override-current"
  )
    logImportMode.value = "mechanics-auto";
  ensureOverrideTargetSelection();
  showEncounterDialog.value = false;
  showImportModeDialog.value = true;
}

function getEncounterActionsForImport(encounter: EncounterCandidate) {
  const cached = encounterActionsCache.value[encounter.id];
  if (cached) return cached;

  const result = extractMechanics(encounter, {
    includeMechanics: false,
    includePlayerActions: true,
  });
  encounterActionsCache.value = {
    ...encounterActionsCache.value,
    [encounter.id]: result.playerActions,
  };
  return result.playerActions;
}

function createNewSheet(
  encounter: EncounterCandidate,
  mode: Extract<LogImportMode, "mechanics-empty" | "mechanics-auto">,
) {
  const result = extractMechanics(encounter, {
    includeMechanics: true,
    includePlayerActions: mode === "mechanics-auto",
  });
  const normalizedRows = normalizeMechanicRows(
    result.rows.map((row) => ({ ...row, _v: 0 })),
    { partySize: encounter.party.length || 8 },
  );
  const normalizedActions = ensurePlayerActionsRowKey(result.playerActions, normalizedRows);

  const newSheet: SheetState = {
    id: createActionId(),
    name: `${encounter.zoneName} (${encounter.durationStr})`,
    meta: {
      zoneId: encounter.zoneId,
    },
    mechanics: {
      rows: normalizedRows,
      filterMechanics: [],
    },
    planner: {
      playerActions: normalizedActions,
      columns: generateColumnsFromParty(encounter.party),
      playerLevel: 100,
    },
  };

  // Pre-filter
  newSheet.mechanics.filterMechanics = buildDefaultFilters(normalizedRows);

  const prevSheets = deepClone(sheets.value);
  const prevActiveSheetId = activeSheetId.value;
  const nextSheets = [...sheets.value, newSheet];
  runCommand({
    label: "create-sheet",
    redo: () => {
      sheets.value = deepClone(nextSheets);
      activeSheetId.value = newSheet.id;
    },
    undo: () => {
      sheets.value = deepClone(prevSheets);
      activeSheetId.value = prevActiveSheetId;
    },
  });
}

function buildSheetName(baseName: string) {
  const normalizedBaseName = baseName.trim() || "空白 Sheet";
  const names = new Set(sheets.value.map((sheet) => sheet.name));
  if (!names.has(normalizedBaseName)) return normalizedBaseName;

  let index = 2;
  let nextName = `${normalizedBaseName} ${index}`;
  while (names.has(nextName)) {
    index += 1;
    nextName = `${normalizedBaseName} ${index}`;
  }
  return nextName;
}

function createEmptySheetWithName(baseName = "空白 Sheet") {
  const newSheet: SheetState = {
    id: createActionId(),
    name: buildSheetName(baseName),
    meta: {
      zoneId: null,
    },
    mechanics: {
      rows: [],
      filterMechanics: [],
    },
    planner: {
      playerActions: [],
      columns: [],
      playerLevel: 100,
    },
  };

  const prevSheets = deepClone(sheets.value);
  const prevActiveSheetId = activeSheetId.value;
  const nextSheets = [...sheets.value, newSheet];
  runCommand({
    label: "create-sheet",
    redo: () => {
      sheets.value = deepClone(nextSheets);
      activeSheetId.value = newSheet.id;
    },
    undo: () => {
      sheets.value = deepClone(prevSheets);
      activeSheetId.value = prevActiveSheetId;
    },
  });
}

function createEmptySheet() {
  createEmptySheetWithName();
}

async function ensureActiveSheetReady(baseName = "空白 Sheet") {
  if (activeSheetId.value) return;
  createEmptySheetWithName(baseName);
  await nextTick();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function applyEncounterActionsToSheet(encounter: EncounterCandidate, sheetId: string) {
  const sheet = sheets.value.find((s) => s.id === sheetId);
  if (!sheet) {
    ElMessage.warning("目标 Sheet 不存在");
    return;
  }

  const currentZoneId = sheet.meta?.zoneId ?? null;
  if (currentZoneId === null || encounter.zoneId === null) {
    ElMessage.error("缺少地图ID，无法执行覆盖导入");
    return;
  }
  if (currentZoneId !== encounter.zoneId) {
    ElMessage.error("地图ID不一致，无法覆盖当前 Sheet 的释放信息");
    return;
  }

  const incomingActions = getEncounterActionsForImport(encounter);
  const normalizedIncomingActions = ensurePlayerActionsRowKey(
    incomingActions,
    sheet.mechanics.rows || [],
  );
  const prevSheets = deepClone(sheets.value);
  const prevPlayerActions = deepClone(playerActions.value);
  const nextSheets = sheets.value.map((s) =>
    s.id === sheetId
      ? {
          ...s,
          planner: {
            ...s.planner,
            playerActions: normalizedIncomingActions,
          },
        }
      : s,
  );
  const shouldSyncCurrentPlayerActions = activeSheetId.value === sheetId;
  runCommand({
    label: "override-sheet-actions",
    redo: () => {
      sheets.value = deepClone(nextSheets);
      if (shouldSyncCurrentPlayerActions)
        playerActions.value = deepClone(normalizedIncomingActions);
    },
    undo: () => {
      sheets.value = deepClone(prevSheets);
      if (shouldSyncCurrentPlayerActions) playerActions.value = deepClone(prevPlayerActions);
    },
  });

  ElMessage.success(`已覆盖 Sheet「${sheet.name}」的释放信息`);
}

function confirmImportMode() {
  const encounter = selectedEncounter.value;
  if (!encounter) return;

  if (logImportMode.value === "actions-override-current") {
    if (!selectedOverrideSheetId.value) {
      ElMessage.warning("请选择一个可覆盖的 Sheet");
      return;
    }
    applyEncounterActionsToSheet(encounter, selectedOverrideSheetId.value);
  } else {
    createNewSheet(encounter, logImportMode.value);
  }

  showImportModeDialog.value = false;
  selectedEncounter.value = null;
  selectedOverrideSheetId.value = "";
}

function cancelImportMode() {
  showImportModeDialog.value = false;
  selectedEncounter.value = null;
  selectedOverrideSheetId.value = "";
}

function onSheetsReordered(list: SheetState[]) {
  if (editingSheetId.value) return;
  applyWithCommand(sheets.value, list, (value) => (sheets.value = value), {
    label: "reorder-sheets",
  });
}

function deleteSheet(id: string) {
  const nextSheets = sheets.value.filter((s) => s.id !== id);
  if (nextSheets.length === sheets.value.length) return;
  const prevSheets = deepClone(sheets.value);
  const prevActiveId = activeSheetId.value;
  const nextActiveId =
    activeSheetId.value === id
      ? nextSheets.length > 0
        ? nextSheets[0]?.id || null
        : null
      : activeSheetId.value;
  runCommand({
    label: "delete-sheet",
    redo: () => {
      sheets.value = deepClone(nextSheets);
      activeSheetId.value = nextActiveId;
    },
    undo: () => {
      sheets.value = deepClone(prevSheets);
      activeSheetId.value = prevActiveId;
    },
  });
}

function buildDuplicateSheetName(baseName: string) {
  const suffix = " - 副本";
  const names = new Set(sheets.value.map((s) => s.name));
  let nextName = `${baseName}${suffix}`;
  let index = 2;
  while (names.has(nextName)) {
    nextName = `${baseName}${suffix}${index}`;
    index += 1;
  }
  return nextName;
}

function duplicateSheet(sheet: SheetState) {
  const duplicate: SheetState = deepClone({
    ...sheet,
    id: createActionId(),
    name: buildDuplicateSheetName(sheet.name),
  });
  const currentIndex = sheets.value.findIndex((s) => s.id === sheet.id);
  const insertIndex = currentIndex >= 0 ? currentIndex + 1 : sheets.value.length;
  const prevSheets = deepClone(sheets.value);
  const prevActiveId = activeSheetId.value;
  const nextSheets = deepClone(sheets.value);
  nextSheets.splice(insertIndex, 0, duplicate);
  runCommand({
    label: "duplicate-sheet",
    redo: () => {
      sheets.value = deepClone(nextSheets);
      activeSheetId.value = duplicate.id;
    },
    undo: () => {
      sheets.value = deepClone(prevSheets);
      activeSheetId.value = prevActiveId;
    },
  });
}

function renameSheet(sheet: SheetState) {
  editingSheetId.value = sheet.id;
  editingName.value = sheet.name;
}

function confirmRename() {
  if (!editingSheetId.value) return;
  const id = editingSheetId.value;
  const name = editingName.value.trim();
  if (name) {
    const nextSheets = sheets.value.map((s) => (s.id === id ? { ...s, name } : s));
    applyWithCommand(sheets.value, nextSheets, (value) => (sheets.value = value), {
      label: "rename-sheet",
    });
  }
  editingSheetId.value = null;
  editingName.value = "";
}

function cancelRename() {
  editingSheetId.value = null;
  editingName.value = "";
}

function handleSheetTabClick(sheetId: string) {
  closeSheetContextMenu();
  applyWithCommand(activeSheetId.value, sheetId, (value) => (activeSheetId.value = value), {
    label: "switch-sheet",
  });
}

function closeSheetContextMenu() {
  if (!sheetContextMenu.value.visible) return;
  sheetContextMenu.value.visible = false;
  sheetContextMenu.value.sheetId = "";
}

function getSheetContextZoneValue() {
  const sheet = sheets.value.find((item) => item.id === sheetContextMenu.value.sheetId);
  const zoneId = sheet?.meta?.zoneId;
  if (typeof zoneId !== "number" || !Number.isFinite(zoneId) || zoneId <= 0) return "";
  return String(zoneId);
}

function updateSheetZoneFromContextMenu(value: string | number) {
  const targetSheetId = sheetContextMenu.value.sheetId;
  if (!targetSheetId) return;

  const parsed = Number(String(value || "").trim());
  const zoneId = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
  const targetSheet = sheets.value.find((sheet) => sheet.id === targetSheetId);
  if (!targetSheet) return;

  const nextMeta = {
    zoneId,
  };
  const currentMeta = {
    zoneId: targetSheet.meta?.zoneId ?? null,
  };
  if (isSameState(currentMeta, nextMeta)) return;

  const nextSheets = sheets.value.map((sheet) => {
    if (sheet.id !== targetSheetId) return sheet;
    return {
      ...sheet,
      meta: nextMeta,
    };
  });

  applyWithCommand(sheets.value, nextSheets, (value) => (sheets.value = value), {
    label: "set-sheet-zone",
    coalesceKey: `set-sheet-zone-${targetSheetId}`,
  });
}

function openSheetContextMenu(sheet: SheetState, event: MouseEvent) {
  const menuWidth = 280;
  const menuHeight = 226;
  const viewportPadding = 8;
  const left = Math.min(event.clientX, window.innerWidth - menuWidth - viewportPadding);
  const top = Math.min(event.clientY, window.innerHeight - menuHeight - viewportPadding);
  sheetContextMenu.value = {
    visible: true,
    left: Math.max(viewportPadding, left),
    top: Math.max(viewportPadding, top),
    sheetId: sheet.id,
  };
}

function handleSheetContextAction(action: "rename" | "duplicate" | "delete") {
  const targetSheet = sheets.value.find((sheet) => sheet.id === sheetContextMenu.value.sheetId);
  closeSheetContextMenu();
  if (!targetSheet) return;

  if (action === "rename") {
    renameSheet(targetSheet);
    return;
  }
  if (action === "delete") {
    deleteSheet(targetSheet.id);
    return;
  }
  duplicateSheet(targetSheet);
}

function handleGlobalPointerDown(event: PointerEvent) {
  if (!sheetContextMenu.value.visible) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest(".sheet-context-menu")) return;
  closeSheetContextMenu();
}

function handlePlayerLevelUpdate(value: number | undefined) {
  const normalized =
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(1, Math.min(100, Math.round(value)))
      : 100;
  const prevLevel = playerLevel.value;
  const prevColumns = deepClone(columns.value);
  const prevOrders = deepClone(jobSkillOrders.value);
  const prevFilters = deepClone(jobSkillFilters.value);
  const prevActions = deepClone(playerActions.value);

  const releveledColumns = columns.value.map((col) => ({
    ...col,
    skills: getSkillsForJob(col.jobEnum, normalized),
  }));
  const { nextColumns, nextFilters, nextOrders } = buildColumnsUpdatePayload(releveledColumns);
  const nextActions = prunePlayerActionsByColumns(playerActions.value, nextColumns);

  const changed =
    prevLevel !== normalized ||
    !isSameState(prevColumns, nextColumns) ||
    !isSameState(prevOrders, nextOrders) ||
    !isSameState(prevFilters, nextFilters) ||
    !isSameState(prevActions, nextActions);
  if (!changed) return;

  runCommand({
    label: "player-level",
    coalesceKey: "player-level",
    redo: () => {
      playerLevel.value = normalized;
      jobSkillOrders.value = deepClone(nextOrders);
      jobSkillFilters.value = deepClone(nextFilters);
      columns.value = deepClone(nextColumns);
      playerActions.value = deepClone(nextActions);
    },
    undo: () => {
      playerLevel.value = prevLevel;
      jobSkillOrders.value = deepClone(prevOrders);
      jobSkillFilters.value = deepClone(prevFilters);
      columns.value = deepClone(prevColumns);
      playerActions.value = deepClone(prevActions);
    },
  });
}

function handleMechanicColorUpdate(type: keyof typeof mechanicColors.value, color: string | null) {
  if (!color) return;
  const next = { ...mechanicColors.value, [type]: color };
  applyWithCommand(mechanicColors.value, next, (value) => (mechanicColors.value = value), {
    label: `color-${type}`,
    coalesceKey: `color-${type}`,
  });
}

function handleAutoArrangeToleranceUpdate(value: number | undefined) {
  const normalized = typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
  autoArrangeToleranceSeconds.value = normalized;
}

function handleDamageNumberDisplayUnitUpdate(value: unknown) {
  damageNumberDisplayUnit.value = value === "k" ? "k" : "w";
}

function generateColumnsFromParty(party: PartyMember[]): ColumnDef[] {
  return sortColumnsByJob(
    party.map((p, index) => {
      return {
        key: buildPartyColumnKey(index, p.id),
        role: resolveColumnRole(p.job),
        jobEnum: p.job,
        targetId: p.id,
        skills: getSkillsForJob(p.job, playerLevel.value),
        hiddenSkillIds: jobSkillFilters.value[p.job] || [],
      };
    }),
  );
}

function resolveColumnRole(jobEnum: number): ColumnDef["role"] {
  const role = Util.jobToRole(Util.jobEnumToJob(jobEnum));
  return (role === "none" ? "dps" : role) as ColumnDef["role"];
}

function buildColumnByJob(jobEnum: number, base?: Partial<Pick<ColumnDef, "key" | "targetId">>) {
  const key = base?.key || `manual_${createActionId()}`;
  const hiddenSkillIds = deepClone(jobSkillFilters.value[jobEnum] || []);
  return {
    key,
    role: resolveColumnRole(jobEnum),
    jobEnum,
    targetId: base?.targetId,
    skills: getSkillsForJob(jobEnum, playerLevel.value),
    hiddenSkillIds,
  } satisfies ColumnDef;
}

function replaceRowTargetsByJobName(rows: MitigationRow[], fromName: string, toName: string) {
  const normalizedFrom = String(fromName || "").trim();
  const normalizedTo = String(toName || "").trim();
  if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) return rows;

  let changed = false;
  const nextRows = rows.map((row) => {
    const currentTargets = (row.targets || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    if (currentTargets.length === 0 || currentTargets.includes("全部")) return row;

    let rowChanged = false;
    const dedupedTargets: string[] = [];
    const seen = new Set<string>();
    currentTargets.forEach((target) => {
      const nextTarget = target === normalizedFrom ? normalizedTo : target;
      if (nextTarget !== target) rowChanged = true;
      if (!seen.has(nextTarget)) {
        seen.add(nextTarget);
        dedupedTargets.push(nextTarget);
      } else {
        rowChanged = true;
      }
    });

    if (!rowChanged) return row;

    changed = true;
    return {
      ...row,
      targets: dedupedTargets,
      _v: (row._v || 0) + 1,
    };
  });

  return changed ? nextRows : rows;
}

function getSkillsForJob(jobEnum: number, level = 100): MitigationSkill[] {
  const skills = mitigationKeigennSkills
    .filter((s) => s.job.includes(jobEnum) && s.minLevel <= level)
    .map((s) => {
      const id = parseDynamicValue(s.id, level);
      const damageTakenMultiplier = s.damageTakenMultiplier
        ? parseDynamicPerformance(s.damageTakenMultiplier, level)
        : undefined;
      const shieldAmountRaw = parseDynamicValue(s.shieldAmount ?? 0, level);
      const shieldAmount =
        Number.isFinite(shieldAmountRaw) && shieldAmountRaw > 0 ? shieldAmountRaw : undefined;
      const name = getActionChinese(id) || `Skill_${id}`;
      const iconId = chineseToIcon(name);
      const iconUrl =
        iconId && iconId !== 405 ? getIconSrcByPath(`/i/${completeIcon(iconId)}.png`) : "";
      return {
        id,
        name,
        icon: iconUrl,
        mitigationScope: s.mitigationScope,
        damageTakenMultiplier,
        shieldAmount,
        isTargetMitigation: s.isEnemyTargetMitigation,
        recast: parseDynamicValue(s.recast1000ms, level),
        duration: parseDynamicValue(s.duration ?? 0, level),
        maxCharges: parseDynamicValue(s.maxCharges ?? 1, level) || 1,
      };
    })
    .sort((a, b) => a.recast - b.recast);
  return applySavedSkillOrder(skills, jobSkillOrders.value[jobEnum]);
}

function sortColumnsByJob(list: ColumnDef[]) {
  const roleOrder: Record<string, number> = { tank: 0, healer: 1, dps: 2, unknown: 3 };
  return list.slice().sort((a, b) => {
    const orderDiff = getJobOrder(a.jobEnum) - getJobOrder(b.jobEnum);
    if (orderDiff !== 0) return orderDiff;
    if (a.role !== b.role) return roleOrder[a.role]! - roleOrder[b.role]!;
    return a.key.localeCompare(b.key);
  });
}

function normalizeColumnsWithJobFilters(
  list: ColumnDef[],
  options: {
    forceGlobal?: boolean;
    jobFilterMap?: Record<number, number[]>;
    jobOrderMap?: Record<number, number[]>;
  } = {},
) {
  const nextMap: Record<number, number[]> = options.jobFilterMap
    ? deepClone(options.jobFilterMap)
    : deepClone(jobSkillFilters.value);

  if (!options.forceGlobal) {
    list.forEach((col) => {
      if (typeof col.jobEnum === "number")
        nextMap[col.jobEnum] = [...new Set(col.hiddenSkillIds || [])];
    });
  }

  const orderMap = options.jobOrderMap || jobSkillOrders.value;
  const normalized = list.map((col) => {
    const hidden = nextMap[col.jobEnum] || col.hiddenSkillIds || [];
    // Rebuild from latest catalog so resource updates apply to existing sheet columns.
    const latestSkills = getSkillsForJob(col.jobEnum, playerLevel.value);
    const fallbackOrder = col.skills?.map((skill) => skill.id) || [];
    const sortedSkills = applySavedSkillOrder(latestSkills, orderMap[col.jobEnum] || fallbackOrder);
    return { ...col, skills: sortedSkills, hiddenSkillIds: [...new Set(hidden)] };
  });
  return {
    columns: normalized,
    jobFilterMap: nextMap,
  };
}

function buildColumnsUpdatePayload(list: ColumnDef[]) {
  const nextOrders = deepClone(jobSkillOrders.value);
  list.forEach((col) => {
    if (typeof col.jobEnum === "number") {
      const currentOrder = col.skills.map((s) => s.id);
      if (!isSameNumberArray(nextOrders[col.jobEnum], currentOrder))
        nextOrders[col.jobEnum] = currentOrder;
    }
  });
  const normalized = normalizeColumnsWithJobFilters(list, { jobOrderMap: nextOrders });
  return {
    nextColumns: normalized.columns,
    nextFilters: normalized.jobFilterMap,
    nextOrders,
  };
}

function handleColumnsUpdate(list: ColumnDef[]) {
  const prevColumns = deepClone(columns.value);
  const prevOrders = deepClone(jobSkillOrders.value);
  const prevFilters = deepClone(jobSkillFilters.value);
  const { nextColumns, nextFilters, nextOrders } = buildColumnsUpdatePayload(list);

  const changed =
    !isSameState(prevColumns, nextColumns) ||
    !isSameState(prevOrders, nextOrders) ||
    !isSameState(prevFilters, nextFilters);
  if (!changed) return;

  runCommand({
    label: "update-columns",
    coalesceKey: "columns-update",
    redo: () => {
      jobSkillOrders.value = deepClone(nextOrders);
      jobSkillFilters.value = deepClone(nextFilters);
      columns.value = deepClone(nextColumns);
    },
    undo: () => {
      jobSkillOrders.value = deepClone(prevOrders);
      jobSkillFilters.value = deepClone(prevFilters);
      columns.value = deepClone(prevColumns);
    },
  });
}

function ensureColumnIdentity(list: ColumnDef[]) {
  const keySet = new Set<string>();
  return list.map((col, index) => {
    const keyBase = (col.key || "").trim() || `manual_${index + 1}`;
    let key = keyBase;
    let suffix = 1;
    while (keySet.has(key)) {
      key = `${keyBase}_${suffix}`;
      suffix += 1;
    }
    keySet.add(key);

    return {
      ...col,
      key,
    };
  });
}

function prunePlayerActionsByColumns(actions: PlayerActionRecord[], targetColumns: ColumnDef[]) {
  const skillMapByColumn = new Map<string, Set<number>>();
  targetColumns.forEach((col) => {
    skillMapByColumn.set(col.key, new Set(col.skills.map((skill) => skill.id)));
  });

  return actions
    .filter((action) => {
      const skillSet = skillMapByColumn.get(action.columnKey);
      return !!skillSet && skillSet.has(action.skillId);
    })
    .map((action) => ({ ...action, id: action.id || createActionId() }));
}

function applyPartyCompositionUpdate(
  list: ColumnDef[],
  options: { nextRows?: MitigationRow[] } = {},
) {
  const normalizedInput = ensureColumnIdentity(deepClone(list));
  const prevColumns = deepClone(columns.value);
  const prevOrders = deepClone(jobSkillOrders.value);
  const prevFilters = deepClone(jobSkillFilters.value);
  const prevActions = deepClone(playerActions.value);
  const prevRows = deepClone(rawRows.value);

  const { nextColumns, nextFilters, nextOrders } = buildColumnsUpdatePayload(normalizedInput);
  const nextActions = prunePlayerActionsByColumns(playerActions.value, nextColumns);
  const nextRows = options.nextRows ? deepClone(options.nextRows) : deepClone(prevRows);

  const changed =
    !isSameState(prevColumns, nextColumns) ||
    !isSameState(prevOrders, nextOrders) ||
    !isSameState(prevFilters, nextFilters) ||
    !isSameState(prevActions, nextActions) ||
    !isSameState(prevRows, nextRows);
  if (!changed) return;

  runCommand({
    label: "update-party-composition",
    redo: () => {
      jobSkillOrders.value = deepClone(nextOrders);
      jobSkillFilters.value = deepClone(nextFilters);
      columns.value = deepClone(nextColumns);
      playerActions.value = deepClone(nextActions);
      rawRows.value = deepClone(nextRows);
    },
    undo: () => {
      jobSkillOrders.value = deepClone(prevOrders);
      jobSkillFilters.value = deepClone(prevFilters);
      columns.value = deepClone(prevColumns);
      playerActions.value = deepClone(prevActions);
      rawRows.value = deepClone(prevRows);
    },
  });
}

function getDefaultPartyCompositionJobEnum() {
  const defaultJobEnum = partyCompositionJobOptions.value[0]?.value;
  if (defaultJobEnum === undefined) {
    ElMessage.warning("当前没有可用职业");
    return null;
  }
  return defaultJobEnum;
}

function handlePartyColumnAdd(afterColKey?: string) {
  const defaultJobEnum = getDefaultPartyCompositionJobEnum();
  if (defaultJobEnum === null) return;

  const next = ensureColumnIdentity(deepClone(columns.value));
  const insertIndex = afterColKey
    ? next.findIndex((col) => col.key === afterColKey) + 1
    : next.length;

  next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, buildColumnByJob(defaultJobEnum));
  applyPartyCompositionUpdate(next);
}

function handlePartyColumnRemove(colKey: string) {
  if (columns.value.length <= 1) {
    ElMessage.warning("至少保留一个职业列");
    return;
  }

  const next = ensureColumnIdentity(deepClone(columns.value));
  const index = next.findIndex((col) => col.key === colKey);
  if (index === -1) return;

  next.splice(index, 1);
  applyPartyCompositionUpdate(next);
}

function handlePartyColumnChangeJob(payload: { colKey: string; jobEnum: number }) {
  const { colKey, jobEnum } = payload;
  if (Number.isNaN(jobEnum)) return;

  const next = ensureColumnIdentity(deepClone(columns.value));
  const index = next.findIndex((col) => col.key === colKey);
  const current = next[index];
  if (!current || current.jobEnum === jobEnum) return;
  const previousTargetName = getMitigationColumnDisplayName(current);

  next[index] = buildColumnByJob(jobEnum, {
    key: current.key,
    targetId: current.targetId,
  });
  const currentTargetName = getMitigationColumnDisplayName(next[index]!);
  const nextRows = replaceRowTargetsByJobName(rawRows.value, previousTargetName, currentTargetName);
  applyPartyCompositionUpdate(next, { nextRows });
}

function handlePartyColumnReorder(orderedKeys: string[]) {
  if (orderedKeys.length === 0) return;

  const next = ensureColumnIdentity(deepClone(columns.value));
  const keyToColumn = new Map(next.map((col) => [col.key, col]));

  const reordered: ColumnDef[] = [];
  orderedKeys.forEach((key) => {
    const col = keyToColumn.get(key);
    if (!col) return;
    reordered.push(col);
    keyToColumn.delete(key);
  });

  if (reordered.length === 0) return;

  keyToColumn.forEach((col) => reordered.push(col));
  applyPartyCompositionUpdate(reordered);
}

function handlePlayerActionsUpdate(list: PlayerActionRecord[]) {
  const normalized = ensurePlayerActionsRowKey(list, rawRows.value);
  applyWithCommand(playerActions.value, normalized, (value) => (playerActions.value = value), {
    label: "update-player-actions",
    equals: isSamePlayerActionList,
  });
}

function handleFilterUpdate(list: string[]) {
  const normalized = sanitizeFiltersByRows(list, rawRows.value);
  applyWithCommand(filterMechanics.value, normalized, (value) => (filterMechanics.value = value), {
    label: "update-filter",
    equals: isSameStringArray,
  });
}

function handleRowsUpdate(list: MitigationRow[]) {
  const normalized = normalizeMechanicRows(list, { partySize: columns.value.length || 8 });
  applyWithCommand(rawRows.value, normalized, (value) => (rawRows.value = value), {
    label: "update-rows",
  });
}

function addCustomRow() {
  if (!activeSheetId.value) return;
  ElMessageBox.prompt("请输入时间偏移 (秒), 例如: 15 或 01:20", "新增自定义行", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    inputPattern: /^(\d+):([0-5]\d)$|^\d+$/,
    inputErrorMessage: "格式不正确 (支持 秒 或 分:秒)",
  })
    .then((res) => {
      const value = (res as any).value;
      let seconds = 0;
      if (value.includes(":")) {
        const [m, s] = value.split(":").map(Number);
        seconds = (m || 0) * 60 + (s || 0);
      } else {
        seconds = Number.parseInt(value, 10);
      }

      const key = `custom_${createActionId()}`;
      const newRow: MitigationRow = {
        key,
        timestamp: seconds,
        action: "自定义行",
        actionId: key,
        source: "User",
        damageType: "physics",
        rawDamage: 0,
        targetCount: 1,
        isAOE: false,
        isTB: false,
        isShare: false,
        damageDetails: [],
        targets: [],
        targetIds: [],
        rawLines: [],
        flags: [],
        _v: 0,
      };

      const nextRows = [...rawRows.value, newRow].sort((a, b) => a.timestamp - b.timestamp);
      const prevRows = deepClone(rawRows.value);
      const prevFilters = deepClone(filterMechanics.value);
      const nextFilters = filterMechanics.value.includes(newRow.actionId)
        ? deepClone(filterMechanics.value)
        : [...filterMechanics.value, newRow.actionId];

      runCommand({
        label: "add-custom-row",
        redo: () => {
          rawRows.value = deepClone(nextRows);
          filterMechanics.value = deepClone(nextFilters);
        },
        undo: () => {
          rawRows.value = deepClone(prevRows);
          filterMechanics.value = deepClone(prevFilters);
        },
      });
    })
    .catch(() => {});
}
function copyToClipboard(data: unknown, options: { compressed?: boolean } = {}) {
  const compressed = options.compressed ?? true;
  const jsonStr = JSON.stringify(data, null, 2);
  const text = compressed ? LZString.compressToBase64(jsonStr) : jsonStr;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      ElMessage.success(compressed ? "已复制到剪贴板" : "已复制原始 JSON 到剪贴板");
    })
    .catch(() => {
      ElMessage.error("复制失败");
    });
}

function copyPlainTextToClipboard(text: string, successMessage: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      ElMessage.success(successMessage);
    })
    .catch(() => {
      ElMessage.error("复制失败");
    });
}

function buildImportMapMetaFromActiveSheet() {
  const zoneIdRaw = activeSheet.value?.meta?.zoneId;
  const zoneId =
    typeof zoneIdRaw === "number" && Number.isFinite(zoneIdRaw)
      ? Math.max(0, Math.round(zoneIdRaw))
      : undefined;
  if (zoneId === undefined) return undefined;
  return {
    zoneId,
  } satisfies MitigationImportMapMeta;
}

function parseImportedZoneId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
  }
  return null;
}

function resolveImportedMapMeta(data: unknown) {
  const root = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;
  if (!root) return null;

  const mapObj =
    typeof root.map === "object" && root.map !== null
      ? (root.map as Record<string, unknown>)
      : null;
  const conditionObj =
    typeof root.condition === "object" && root.condition !== null
      ? (root.condition as Record<string, unknown>)
      : null;

  const zoneIdRaw =
    mapObj?.zoneId ?? mapObj?.zoneID ?? root.zoneId ?? root.zoneID ?? conditionObj?.zoneID;
  const zoneId = parseImportedZoneId(zoneIdRaw);

  if (zoneId === null) return null;

  const meta: MitigationImportMapMeta = {};
  if (zoneId !== null) meta.zoneId = zoneId;
  return meta;
}

function buildSheetsWithImportedMapMeta(mapMeta: MitigationImportMapMeta | null) {
  if (!mapMeta || !activeSheetId.value)
    return { changed: false, nextSheets: deepClone(sheets.value) };

  const targetIndex = sheets.value.findIndex((sheet) => sheet.id === activeSheetId.value);
  if (targetIndex < 0) return { changed: false, nextSheets: deepClone(sheets.value) };

  const targetSheet = sheets.value[targetIndex];
  if (!targetSheet) return { changed: false, nextSheets: deepClone(sheets.value) };

  const currentMeta = targetSheet.meta || { zoneId: null as number | null };
  const resolvedZoneId = parseImportedZoneId(mapMeta.zoneId);
  const nextMeta = {
    ...currentMeta,
    zoneId: resolvedZoneId !== null ? resolvedZoneId : currentMeta.zoneId,
  };

  if (isSameState(currentMeta, nextMeta))
    return { changed: false, nextSheets: deepClone(sheets.value) };

  const nextSheets = deepClone(sheets.value);
  const nextTarget = nextSheets[targetIndex];
  if (!nextTarget) return { changed: false, nextSheets: deepClone(sheets.value) };
  nextSheets[targetIndex] = {
    ...nextTarget,
    meta: nextMeta,
  };
  return { changed: true, nextSheets };
}

function buildMechanicsExportData() {
  if (!rawRows.value.length) return null;

  // Dictionary Compression for Action Names
  const actionNames = new Set<string>();
  rawRows.value.forEach((r) => actionNames.add(r.action));
  const actionList = [...actionNames];
  const actionMap = new Map(actionList.map((n, i) => [n, i]));

  // V3 Minified: t:ts, i:id, n:nameIdx, v:dmg, ty:type, f:flags, ct:castTime, tg:targets
  const rows = rawRows.value.map((r) => {
    let ty = 3;
    if (r.damageType === "physics") ty = 0;
    else if (r.damageType === "magic") ty = 1;
    else if (r.damageType === "darkness") ty = 2;

    let f = 0;
    if (r.isShare) f |= 4;
    else if (r.isTB) f |= 2;
    else if (r.isAOE) f |= 1;

    const item: any = {
      t: Number(r.timestamp.toFixed(2)),
      i: r.actionId,
      n: actionMap.get(r.action),
      v: r.rawDamage,
      ty,
      f,
    };
    if ((r.targetCount || 0) > 1) item.tc = Math.round(r.targetCount || 0);
    if (r.castTime !== undefined) {
      const castTime = Number.parseFloat(String(r.castTime));
      if (Number.isFinite(castTime) && castTime > 0) item.ct = Number(castTime.toFixed(2));
    }
    const targets = [...new Set((r.targets || []).filter(Boolean))];
    if (targets.length > 0) item.tg = targets;
    return item;
  });

  const mapMeta = buildImportMapMetaFromActiveSheet();
  return {
    type: "mitigation-mechanics",
    actions: actionList,
    rows,
    aliases: toRaw(mechanicAliases.value),
    ...(mapMeta ? { map: mapMeta } : {}),
  } satisfies MitigationMechanicsImportData;
}

function exportMechanics(options: { compressed?: boolean } = {}) {
  const payload = buildMechanicsExportData();
  if (!payload) return;
  copyToClipboard(payload, options);
}

function buildPlayerActionsExportData() {
  if (!playerActions.value.length && !columns.value.length) return null;

  // Optimize sources & Anonymize
  const sourceToAnonMap = new Map<string, string>(); // ColumnKey -> AnonID (e.g. 10(1))
  const jobCounts = new Map<number, number>();

  // Assign anonymous IDs based on job
  columns.value.forEach((c) => {
    const j = c.jobEnum;
    const count = (jobCounts.get(j) || 0) + 1;
    jobCounts.set(j, count);
    const anonId = `${j}_${count}`; // e.g. 21_1 (WAR #1)
    sourceToAnonMap.set(c.key, anonId);
  });

  // Build anonymous sources list
  const anonSourcesList = [...sourceToAnonMap.values()];
  const anonSourceIndexMap = new Map(anonSourcesList.map((id, idx) => [id, idx]));

  // V3: Group actions by source -> skillId -> [timestamps]
  const dataMap: Record<number, Record<number, number[]>> = {};

  playerActions.value.forEach((a) => {
    const anonId = sourceToAnonMap.get(a.columnKey);
    if (!anonId) return;
    const sIdx = anonSourceIndexMap.get(anonId);
    if (sIdx === undefined) return;

    if (!dataMap[sIdx]) dataMap[sIdx] = {};
    if (!dataMap[sIdx][a.skillId]) dataMap[sIdx][a.skillId] = [];
    dataMap[sIdx][a.skillId]?.push(Number(a.timestamp.toFixed(2)));
  });

  // V2 Cols: i:anonId, j:job, h:hidden
  // Removed k (key/name) to avoid leaking names. Reconstruct on import.
  const cols = columns.value
    .filter((c) => sourceToAnonMap.has(c.key))
    .map((c) => ({
      i: sourceToAnonMap.get(c.key)!,
      j: c.jobEnum,
      h: c.hiddenSkillIds,
    }));

  const mapMeta = buildImportMapMetaFromActiveSheet();
  return {
    type: "mitigation-player-actions",
    src: anonSourcesList,
    data: dataMap,
    cols,
    ...(mapMeta ? { map: mapMeta } : {}),
  } satisfies MitigationPlayerActionsImportData;
}

function exportPlayerActions(options: { compressed?: boolean } = {}) {
  const payload = buildPlayerActionsExportData();
  if (!payload) return;
  copyToClipboard(payload, options);
}

function toTemplateIdBase(name: string) {
  const base = String(name || "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  return base || "template";
}

function escapeSingleQuote(text: string) {
  return String(text || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");
}

function generateTemplateSnippet() {
  const mechanics = buildMechanicsExportData();
  const playerActions = buildPlayerActionsExportData();
  if (!mechanics && !playerActions) {
    ElMessage.warning("没有可生成的模板数据");
    return;
  }

  const sheetName = activeSheet.value?.name || "新模板";
  const idBase = toTemplateIdBase(sheetName);
  const nameEscaped = escapeSingleQuote(sheetName);
  const descriptionEscaped = escapeSingleQuote(`由 ${sheetName} 生成`);

  const lines: string[] = [
    "{",
    `  id: '${idBase}',`,
    `  name: '${nameEscaped}',`,
    `  description: '${descriptionEscaped}',`,
  ];

  if (mechanics) {
    lines.push(`  mechanics: ${JSON.stringify(mechanics, null, 2).replaceAll("\n", "\n  ")},`);
  }
  if (playerActions) {
    lines.push(
      `  playerActions: ${JSON.stringify(playerActions, null, 2).replaceAll("\n", "\n  ")},`,
    );
  }
  lines.push("},");

  copyPlainTextToClipboard(lines.join("\n"), "模板片段已复制到剪贴板");
}

function decodeDamageType(typeCode: number) {
  const typeMap = ["physics", "magic", "darkness"] as const;
  return typeMap[typeCode] || "physics";
}

function buildImportedColumn(c: ImportedColumnPayload) {
  const jobEnum = c.j;
  return {
    key: c.i,
    role: resolveColumnRole(jobEnum),
    jobEnum,
    skills: getSkillsForJob(jobEnum, playerLevel.value),
    hiddenSkillIds: c.h || [],
  } satisfies ColumnDef;
}

function importMechanicData(data: MitigationMechanicsImportData) {
  const importedMapMeta = resolveImportedMapMeta(data);
  const importedMapSheetUpdate = buildSheetsWithImportedMapMeta(importedMapMeta);
  const actions = data.actions || [];
  const importedRows: MitigationRow[] = data.rows.map((r) => {
    const isShare = !!(r.f & 4);
    const isTB = !isShare && !!(r.f & 2);
    const isAOE = !isShare && !isTB && !!(r.f & 1);
    return {
      key: `imp_${createActionId()}`,
      timestamp: r.t,
      actionId: r.i,
      action: typeof r.n === "number" ? actions[r.n] || `Action_${r.i}` : r.n,
      rawDamage: r.v,
      targetCount:
        typeof r.tc === "number" && Number.isFinite(r.tc) ? Math.max(1, Math.round(r.tc)) : 1,
      damageType: decodeDamageType(r.ty),
      isAOE,
      isTB,
      isShare,
      castTime:
        typeof r.ct === "number" && Number.isFinite(r.ct) && r.ct > 0 ? String(r.ct) : undefined,
      castStartTime:
        typeof r.ct === "number" && Number.isFinite(r.ct) && r.ct > 0 ? r.t - r.ct : undefined,
      source: "Import",
      targets: Array.isArray(r.tg)
        ? r.tg.filter((item): item is string => typeof item === "string")
        : [],
      targetIds: [],
      rawLines: [],
      flags: [],
      damageDetails: [],
      _v: 0,
    };
  });
  const rows = normalizeMechanicRows(importedRows, { partySize: columns.value.length || 8 });

  const aliases = data.aliases || data.mechanicAliases;
  const nextAliases = aliases
    ? { ...mechanicAliases.value, ...aliases }
    : deepClone(mechanicAliases.value);
  const nextFilters = buildDefaultFilters(rows);
  const prevAliases = deepClone(mechanicAliases.value);
  const prevRows = deepClone(rawRows.value);
  const prevFilters = deepClone(filterMechanics.value);
  const prevActions = deepClone(playerActions.value);
  const prevSheets = deepClone(sheets.value);
  const nextActions = ensurePlayerActionsRowKey(playerActions.value, rows);
  const changed =
    !isSameState(prevAliases, nextAliases) ||
    !isSameState(prevRows, rows) ||
    !isSameState(prevFilters, nextFilters) ||
    !isSameState(prevActions, nextActions) ||
    importedMapSheetUpdate.changed;
  if (!changed) return;

  runCommand({
    label: "import-mechanics",
    redo: () => {
      mechanicAliases.value = deepClone(nextAliases);
      rawRows.value = deepClone(rows);
      filterMechanics.value = deepClone(nextFilters);
      playerActions.value = deepClone(nextActions);
      sheets.value = deepClone(importedMapSheetUpdate.nextSheets);
    },
    undo: () => {
      mechanicAliases.value = deepClone(prevAliases);
      rawRows.value = deepClone(prevRows);
      filterMechanics.value = deepClone(prevFilters);
      playerActions.value = deepClone(prevActions);
      sheets.value = deepClone(prevSheets);
    },
  });

  ElMessage.success("导入机制信息成功");
}

function importPlayerActionsData(data: MitigationPlayerActionsImportData) {
  const importedMapMeta = resolveImportedMapMeta(data);
  const importedMapSheetUpdate = buildSheetsWithImportedMapMeta(importedMapMeta);
  const newActions: PlayerActionRecord[] = [];
  let importedColumns: ColumnDef[] | null = null;

  const sources = data.src;
  const dataMap = data.data;
  Object.keys(dataMap).forEach((sourceIndexKey) => {
    const sourceIndex = Number(sourceIndexKey);
    const columnKey = sources[sourceIndex];
    if (!columnKey) return;

    const skillMap = dataMap[sourceIndexKey] || {};
    Object.keys(skillMap).forEach((skillIdKey) => {
      const skillId = Number(skillIdKey);
      const times = skillMap[skillIdKey] || [];
      times.forEach((t: number) => {
        newActions.push({
          id: createActionId(),
          timestamp: t,
          columnKey,
          skillId,
        });
      });
    });
  });

  if (data.cols) {
    importedColumns = data.cols.map((c) => buildImportedColumn(c));
  }

  const prevActions = deepClone(playerActions.value);
  const prevColumns = deepClone(columns.value);
  const prevOrders = deepClone(jobSkillOrders.value);
  const prevFilters = deepClone(jobSkillFilters.value);
  const prevSheets = deepClone(sheets.value);
  const nextActions = deepClone(ensurePlayerActionsRowKey(newActions, rawRows.value));
  const importedColumnsPayload = importedColumns
    ? buildColumnsUpdatePayload(importedColumns)
    : null;
  const nextColumns = importedColumnsPayload
    ? importedColumnsPayload.nextColumns
    : deepClone(columns.value);
  const nextOrders = importedColumnsPayload
    ? importedColumnsPayload.nextOrders
    : deepClone(jobSkillOrders.value);
  const nextFilters = importedColumnsPayload
    ? importedColumnsPayload.nextFilters
    : deepClone(jobSkillFilters.value);
  const changed =
    !isSameState(prevActions, nextActions) ||
    !isSameState(prevColumns, nextColumns) ||
    !isSameState(prevOrders, nextOrders) ||
    !isSameState(prevFilters, nextFilters) ||
    importedMapSheetUpdate.changed;
  if (!changed) return;

  runCommand({
    label: "import-player-actions",
    redo: () => {
      jobSkillOrders.value = deepClone(nextOrders);
      jobSkillFilters.value = deepClone(nextFilters);
      columns.value = deepClone(nextColumns);
      playerActions.value = deepClone(nextActions);
      sheets.value = deepClone(importedMapSheetUpdate.nextSheets);
    },
    undo: () => {
      jobSkillOrders.value = deepClone(prevOrders);
      jobSkillFilters.value = deepClone(prevFilters);
      columns.value = deepClone(prevColumns);
      playerActions.value = deepClone(prevActions);
      sheets.value = deepClone(prevSheets);
    },
  });

  ElMessage.success("导入玩家减伤成功");
}

function doImportByData(data: unknown) {
  if (isMitigationMechanicsImportData(data)) {
    importMechanicData(data);
    return true;
  }
  if (isMitigationPlayerActionsImportData(data)) {
    importPlayerActionsData(data);
    return true;
  }
  ElMessage.error("导入数据类型不受支持");
  return false;
}

function doImportByText(rawText: string) {
  const value = rawText.trim();
  if (!value) {
    ElMessage.warning("请输入要导入的字符串");
    return;
  }

  loading.value = true;
  try {
    const data = parseMitigationImportText(value);
    doImportByData(data);
  } catch (err) {
    console.error(err);
    ElMessage.error("导入字符串解析失败");
  } finally {
    loading.value = false;
  }
}

function promptImportDataWithOptions(options: { ensureSheetName?: string } = {}) {
  ElMessageBox.prompt("请粘贴导出的字符串", "导入", {
    confirmButtonText: "导入",
    cancelButtonText: "取消",
    inputType: "textarea",
    inputPlaceholder: "在这里粘贴导出字符串",
    inputValidator: (value) => {
      if (!value || !value.trim()) return "请输入要导入的字符串";
      return true;
    },
  })
    .then(async (res) => {
      const { value } = res as MessageBoxInputData;
      if (options.ensureSheetName) await ensureActiveSheetReady(options.ensureSheetName);
      doImportByText(value);
    })
    .catch(() => {});
}

function promptImportData() {
  void promptImportDataWithOptions();
}

function handleEmptyImportByText() {
  void promptImportDataWithOptions({ ensureSheetName: "导入字符串" });
}

function syncActiveSheetMetaFromTemplate(template: MitigationSheetTemplate) {
  const targetId = activeSheetId.value;
  const nextName = template.name.trim();
  const parsedZoneId = Number(template.map?.zoneId);
  const nextZoneId =
    Number.isFinite(parsedZoneId) && parsedZoneId > 0 ? Math.round(parsedZoneId) : null;
  if (!targetId || !nextName) return;

  const current = sheets.value.find((sheet) => sheet.id === targetId);
  if (!current) return;
  const currentZoneId = current.meta?.zoneId ?? null;
  if (current.name === nextName && currentZoneId === nextZoneId) return;

  const nextSheets = sheets.value.map((sheet) => {
    if (sheet.id !== targetId) return sheet;
    return {
      ...sheet,
      name: nextName,
      meta: {
        zoneId: nextZoneId,
      },
    };
  });
  applyWithCommand(sheets.value, nextSheets, (value) => (sheets.value = value), {
    label: "apply-template-sheet-meta",
  });
}

async function createSheetFromTemplate(template: MitigationSheetTemplate) {
  const payloads = [template.mechanics, template.playerActions].filter(
    (item): item is NonNullable<typeof item> => !!item,
  );

  if (payloads.length === 0) {
    ElMessage.warning("该模板未配置可导入内容");
    return;
  }

  await ensureActiveSheetReady(template.name);
  syncActiveSheetMetaFromTemplate(template);
  payloads.forEach((payload) => doImportByData(payload));
}
</script>

<template>
  <div class="app-root" @contextmenu.prevent>
    <div v-if="loading" class="loader-mask">
      <div class="loader-content">正在解析日志，请稍候...</div>
    </div>
    <header class="toolbar">
      <div class="tool-left">
        <h1 class="logo">MitigationPlanner</h1>
        <div class="file-btn">
          <el-button size="small" type="primary" :icon="Upload"> 导入日志 </el-button>
          <input class="file-input" type="file" accept=".log" @change="handleFileChange" />
        </div>
        <div v-if="activeSheet || isHydrating" class="action-btns">
          <template v-if="activeSheet">
            <el-button size="small" :disabled="!canUndo" @click="undoActions"> 撤销 </el-button>
            <el-button size="small" :disabled="!canRedo" @click="redoActions"> 重做 </el-button>
            <el-button size="small" title="Ctrl/Cmd + H" @click="showHistoryDialog = true">
              历史
            </el-button>
            <el-button size="small" :icon="Plus" type="success" plain @click="addCustomRow">
              新增行
            </el-button>
            <div class="divider" />
            <el-dropdown trigger="click">
              <el-button size="small" :icon="Download">
                导出
                <el-icon class="el-icon--right">
                  <ArrowDown />
                </el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="exportMechanics"> 仅导出机制信息 </el-dropdown-item>
                  <el-dropdown-item @click="exportPlayerActions"> 仅导出玩家减伤 </el-dropdown-item>
                  <el-dropdown-item @click="generateTemplateSnippet">
                    生成模板片段
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button size="small" :icon="Upload" @click="promptImportData"> 导入 </el-button>
          </template>
          <template v-else>
            <span class="toolbar-skel w-56" />
            <span class="toolbar-skel w-56" />
            <span class="toolbar-skel w-56" />
            <span class="toolbar-skel w-72" />
            <span class="toolbar-skel w-1" />
            <span class="toolbar-skel w-64" />
            <span class="toolbar-skel w-56" />
          </template>
        </div>
      </div>
      <div v-if="activeSheet || isHydrating" class="tool-right">
        <template v-if="activeSheet">
          <div class="lv-box">
            <span>队伍等级</span>
            <el-input-number
              :model-value="playerLevel"
              size="small"
              :min="1"
              :max="100"
              @update:model-value="handlePlayerLevelUpdate"
            />
          </div>
          <div class="stats">{{ filteredRows.length }} / {{ rawRows.length }} rows</div>

          <div class="settings-entry">
            <el-popover
              placement="bottom-end"
              :width="260"
              trigger="click"
              popper-class="config-popover"
            >
              <template #reference>
                <el-button :icon="Setting" size="small" circle />
              </template>
              <div class="config-panel">
                <div class="config-title">全局设置</div>
                <div class="config-item">
                  <span class="label">自动排轴容错</span>
                  <el-input-number
                    :model-value="autoArrangeToleranceSeconds"
                    size="small"
                    :min="0"
                    :step="0.5"
                    :precision="1"
                    style="width: 110px"
                    @update:model-value="handleAutoArrangeToleranceUpdate"
                  />
                </div>
                <div class="config-item">
                  <span class="label">数值单位</span>
                  <el-radio-group
                    :model-value="damageNumberDisplayUnit"
                    size="small"
                    @update:model-value="handleDamageNumberDisplayUnitUpdate"
                  >
                    <el-radio-button value="k"> 千(K) </el-radio-button>
                    <el-radio-button value="w"> 万(W) </el-radio-button>
                  </el-radio-group>
                </div>
                <div class="config-divider" />
                <div class="color-config">
                  <div class="config-item">
                    <span class="label">AOE 颜色</span>
                    <el-color-picker
                      :model-value="mechanicColors.aoe"
                      :teleported="false"
                      size="small"
                      @update:model-value="(v) => handleMechanicColorUpdate('aoe', v)"
                    />
                  </div>
                  <div class="config-item">
                    <span class="label">分摊 颜色</span>
                    <el-color-picker
                      :model-value="mechanicColors.share || '#f59e0b'"
                      :teleported="false"
                      size="small"
                      @update:model-value="(v) => handleMechanicColorUpdate('share', v)"
                    />
                  </div>
                  <div class="config-item">
                    <span class="label">死刑 颜色</span>
                    <el-color-picker
                      :model-value="mechanicColors.tb"
                      :teleported="false"
                      size="small"
                      @update:model-value="(v) => handleMechanicColorUpdate('tb', v)"
                    />
                  </div>
                  <div class="config-item">
                    <span class="label">普通 颜色</span>
                    <el-color-picker
                      :model-value="mechanicColors.normal"
                      :teleported="false"
                      size="small"
                      @update:model-value="(v) => handleMechanicColorUpdate('normal', v)"
                    />
                  </div>
                </div>
              </div>
            </el-popover>
          </div>
        </template>
        <template v-else>
          <span class="toolbar-skel w-44" />
          <span class="toolbar-skel w-140" />
          <span class="toolbar-skel w-96" />
          <span class="toolbar-skel circle w-28" />
        </template>
      </div>
    </header>

    <main class="content">
      <MitigationGrid
        v-if="activeSheet && !isActiveSheetBlank"
        :key="activeSheetId || 'active-sheet'"
        :rows="filteredRows"
        :all-rows="rawRows"
        :columns="columns"
        :player-actions="playerActions"
        :party-composition-job-options="partyCompositionJobOptions"
        :mechanic-options="mechanicOptions"
        :filter-mechanics="filterMechanics"
        :mechanic-colors="mechanicColors"
        :timeline-zone-id="activeSheet?.meta?.zoneId ?? 0"
        :timeline-export-source="activeSheet?.name || 'MitigationPlanner'"
        :auto-arrange-tolerance-seconds="autoArrangeToleranceSeconds"
        :damage-number-display-unit="damageNumberDisplayUnit"
        @update:columns="handleColumnsUpdate"
        @update:player-actions="handlePlayerActionsUpdate"
        @update:filter-mechanics="handleFilterUpdate"
        @update:rows="handleRowsUpdate"
        @rename-mechanic="handleRenameMechanic"
        @party-column-add="handlePartyColumnAdd"
        @party-column-remove="handlePartyColumnRemove"
        @party-column-change-job="handlePartyColumnChangeJob"
        @party-column-reorder="handlePartyColumnReorder"
      />
      <div
        v-else-if="isHydrating"
        class="loading-grid-shell"
        aria-hidden="true"
        :style="{ '--mg-skeleton-skill-cell-size': `${MITIGATION_GRID_WIDTH.skillCell}px` }"
      >
        <div class="loading-grid-header">
          <div class="loading-fixed-cols">
            <div
              v-for="(width, index) in skeletonFixedCellWidths"
              :key="`fixed-header-${index}`"
              class="skel-shimmer skel-cell"
              :style="{ width: `${width}px` }"
            />
          </div>
          <div class="loading-party-header">
            <div
              v-for="(skillCount, index) in skeletonPartySkillCounts"
              :key="`hdr-${index}`"
              class="loading-party-col"
              :style="{
                width: `${skeletonPartyColumnWidths[index] || getMitigationGridColumnWidth(skillCount)}px`,
                minWidth: `${skeletonPartyColumnWidths[index] || getMitigationGridColumnWidth(skillCount)}px`,
              }"
            >
              <div class="skel-shimmer skel-col-name" />
              <div class="loading-skill-icons">
                <span
                  v-for="k in skillCount"
                  :key="`hdr-${index}-${k}`"
                  class="skel-shimmer skel-icon"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="loading-grid-body">
          <div
            v-for="row in HYDRATING_SKELETON_ROW_COUNT"
            :key="`row-${row}`"
            class="loading-grid-row"
          >
            <div class="loading-fixed-cols">
              <div
                v-for="(width, index) in skeletonFixedCellWidths"
                :key="`fixed-row-${row}-${index}`"
                class="skel-shimmer skel-cell"
                :style="{ width: `${width}px` }"
              />
            </div>
            <div class="loading-party-cells">
              <div
                v-for="(skillCount, colIndex) in skeletonPartySkillCounts"
                :key="`row-${row}-col-${colIndex}`"
                class="loading-party-col-cells"
                :style="{
                  width: `${skeletonPartyColumnWidths[colIndex] || getMitigationGridColumnWidth(skillCount)}px`,
                  minWidth: `${skeletonPartyColumnWidths[colIndex] || getMitigationGridColumnWidth(skillCount)}px`,
                }"
              >
                <span
                  v-for="k in skillCount"
                  :key="`row-${row}-cell-${colIndex}-${k}`"
                  class="skel-mini-cell skel-shimmer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty">
        <div class="empty-card">
          <p class="empty-title">
            {{ activeSheet ? "当前 Sheet 为空" : "当前没有 Sheet" }}
          </p>
          <div class="empty-actions">
            <el-button type="primary" size="small" :icon="Upload" @click="handleEmptyImportByText">
              导入字符串
            </el-button>
            <el-dropdown trigger="click" :disabled="!hasPredefinedTemplates">
              <el-button size="small">
                使用现有模板
                <el-icon class="el-icon--right">
                  <ArrowDown />
                </el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="templateItem in mitigationSheetTemplates"
                    :key="templateItem.id"
                    @click="createSheetFromTemplate(templateItem)"
                  >
                    {{ templateItem.name }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <p v-if="!hasPredefinedTemplates" class="empty-tip">
            模板列表为空，请在 src/resources/mitigationSheetTemplates.ts 填充。
          </p>
        </div>
      </div>
    </main>

    <footer v-if="sheets.length > 0" class="sheet-footer">
      <div class="sheet-strip">
        <VueDraggable
          :model-value="sheets"
          class="sheet-tabs"
          :disabled="!!editingSheetId"
          :animation="160"
          ghost-class="sheet-ghost"
          drag-class="sheet-drag"
          fallback-class="sheet-fallback"
          @update:model-value="(list: SheetState[]) => onSheetsReordered(list)"
        >
          <div
            v-for="sheet in sheets"
            :key="sheet.id"
            class="sheet-tab"
            :class="{ active: activeSheetId === sheet.id, editing: editingSheetId === sheet.id }"
            @click="handleSheetTabClick(sheet.id)"
            @dblclick="renameSheet(sheet)"
            @contextmenu.prevent.stop="openSheetContextMenu(sheet, $event)"
          >
            <template v-if="editingSheetId === sheet.id">
              <el-input
                v-model="editingName"
                v-focus
                size="small"
                class="edit-input"
                @blur="confirmRename"
                @keyup.enter="confirmRename"
                @keyup.esc="cancelRename"
                @click.stop
              />
            </template>
            <template v-else>
              <span class="sheet-name" :title="sheet.name">{{ sheet.name }}</span>
              <el-icon class="close-btn" @click.stop="deleteSheet(sheet.id)">
                <Close />
              </el-icon>
            </template>
          </div>
        </VueDraggable>
        <button
          type="button"
          class="sheet-add-btn"
          title="新建空白 Sheet"
          @click="createEmptySheet"
        >
          +
        </button>
      </div>
    </footer>

    <transition name="sheet-menu-fade">
      <div
        v-if="sheetContextMenu.visible"
        class="sheet-context-menu"
        :style="{ top: `${sheetContextMenu.top}px`, left: `${sheetContextMenu.left}px` }"
        @click.stop
        @contextmenu.prevent
      >
        <button
          class="sheet-context-item"
          type="button"
          @click="handleSheetContextAction('rename')"
        >
          重命名
        </button>
        <button
          class="sheet-context-item"
          type="button"
          @click="handleSheetContextAction('duplicate')"
        >
          复制副本
        </button>
        <div class="sheet-context-divider" />
        <div class="sheet-context-zone">
          <span class="sheet-context-zone-label">地图ID</span>
          <ZoneSelecter
            :select-zone="getSheetContextZoneValue()"
            width="252px"
            size="small"
            :clearable="true"
            :show-all-levels="false"
            :teleported="false"
            placeholder="设置地图ID"
            @update:select-zone="updateSheetZoneFromContextMenu"
          />
        </div>
        <div class="sheet-context-divider" />
        <button
          class="sheet-context-item danger"
          type="button"
          @click="handleSheetContextAction('delete')"
        >
          删除
        </button>
      </div>
    </transition>

    <el-dialog v-model="showEncounterDialog" title="选择战斗记录" width="500px">
      <div class="enc-list">
        <div
          v-for="enc in encounters"
          :key="enc.id"
          class="enc-item"
          @click="handleEncounterSelect(enc)"
        >
          <div class="enc-main">
            <span class="enc-zone">{{ enc.zoneName }}</span>
            <span class="enc-dur">{{ enc.durationStr }}</span>
          </div>
          <div class="enc-sub">
            {{ new Date(enc.startTime).toLocaleString() }}
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="showImportModeDialog"
      title="导入模式"
      width="560px"
      @close="cancelImportMode"
    >
      <div class="import-mode-panel">
        <div class="import-enc-title">
          {{ selectedEncounter?.zoneName }}
          <span v-if="selectedEncounter">({{ selectedEncounter?.durationStr }})</span>
        </div>
        <el-radio-group v-model="logImportMode" class="import-mode-group">
          <el-radio value="mechanics-empty"> 只生成机制名称 + 空表 </el-radio>
          <el-radio value="mechanics-auto"> 机制名称 + 自动勾选单元格 </el-radio>
          <el-radio
            value="actions-override-current"
            :disabled="
              !selectedEncounter ||
              selectedEncounter.zoneId === null ||
              eligibleOverrideSheets.length === 0
            "
          >
            只解析释放信息并覆盖符合条件的 Sheet（地图ID一致）
          </el-radio>
        </el-radio-group>
        <div v-if="logImportMode === 'actions-override-current'" class="override-sheet-panel">
          <div class="override-sheet-title">请选择要覆盖的 Sheet</div>
          <el-radio-group
            v-if="eligibleOverrideSheets.length > 0"
            v-model="selectedOverrideSheetId"
            class="override-sheet-group"
          >
            <el-radio v-for="sheet in eligibleOverrideSheets" :key="sheet.id" :value="sheet.id">
              <span>{{ sheet.name }}</span>
              <span v-if="sheet.isActive" class="current-sheet-tag">（当前打开）</span>
            </el-radio>
          </el-radio-group>
          <div v-else class="override-empty">没有地图ID匹配的 Sheet</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="cancelImportMode"> 取消 </el-button>
        <el-button type="primary" :disabled="!canConfirmImportMode" @click="confirmImportMode">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showHistoryDialog" title="操作历史" width="440px">
      <div class="history-panel">
        <div class="history-shortcut-hint">
          快捷键：Ctrl/Cmd + Z（撤销），Ctrl/Cmd + Y 或 Ctrl/Cmd + Shift + Z（重做）
        </div>
        <div class="history-list">
          <button
            v-for="item in historyTimeline"
            :key="item.cursor"
            type="button"
            class="history-item"
            :class="{ active: item.active }"
            @click="jumpToHistory(item.cursor)"
          >
            <span class="history-index">#{{ item.cursor }}</span>
            <span class="history-label">{{ item.label }}</span>
            <span v-if="item.active" class="history-current">当前</span>
          </button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.app-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
}

.toolbar {
  height: 40px;
  border-bottom: 1px solid #ddd;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fdfdfd;
}

.tool-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.action-btns {
  display: flex;
  gap: 8px;
  margin-left: 12px;
  align-items: center;
}
.divider {
  width: 1px;
  height: 16px;
  background: #eee;
  margin: 0 4px;
}

.logo {
  font-size: 14px;
  font-weight: bold;
  margin: 0;
  color: #7c3aed;
}

.file-btn {
  position: relative;
  .file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
}

.tool-right {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.toolbar-skel {
  display: inline-block;
  height: 24px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: linear-gradient(90deg, #eef2f7 25%, #f8fafc 37%, #eef2f7 63%);
  background-size: 400% 100%;
  animation: skeleton-loading 1.2s ease-in-out infinite;
}

.toolbar-skel.circle {
  border-radius: 999px;
}

.w-1 {
  width: 1px;
  height: 16px;
  border: none;
  background: #eee;
  animation: none;
}

.w-28 {
  width: 28px;
}
.w-44 {
  width: 44px;
}
.w-56 {
  width: 56px;
}
.w-64 {
  width: 64px;
}
.w-72 {
  width: 72px;
}
.w-96 {
  width: 96px;
}
.w-140 {
  width: 140px;
}
.lv-box {
  display: flex;
  align-items: center;
  gap: 4px;
}
.stats {
  color: #888;
}

.content {
  flex: 1;
  overflow: hidden;
  position: relative;
  border-bottom: 1px solid #ddd;
}

.empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.loading-grid-shell {
  height: 100%;
  overflow: auto;
  padding: 0;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  border-bottom: 1px solid #e5e7eb;
}

.loading-grid-header {
  display: flex;
  align-items: stretch;
  border: 1px solid #e5e7eb;
  border-bottom: none;
  background: #f8fafc;
  min-width: max-content;
}

.loading-grid-body {
  border: 1px solid #e5e7eb;
  overflow: hidden;
  min-width: max-content;
}

.loading-grid-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #edf1f5;
  min-height: 22px;
}

.loading-grid-row:last-child {
  border-bottom: none;
}

.loading-fixed-cols {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-right: 1px solid #e5e7eb;
  background: #f9fafb;
}

.loading-party-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  flex: 1;
}

.loading-party-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
}

.loading-skill-icons {
  display: flex;
  gap: 2px;
}

.loading-party-cells {
  display: flex;
  gap: 2px;
  padding: 2px 4px;
  align-items: center;
}

.loading-party-col-cells {
  display: flex;
  gap: 2px;
  align-items: center;
}

.skel-shimmer {
  background: linear-gradient(90deg, #ecf1f8 25%, #f8fafd 37%, #ecf1f8 63%);
  background-size: 400% 100%;
  animation: skeleton-loading 1.25s ease-in-out infinite;
}

.skel-cell {
  height: 18px;
  border-radius: 2px;
  border: 1px solid #e4e9ef;
}

.skel-col-name {
  width: 58px;
  height: 10px;
  border-radius: 99px;
}

.skel-icon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid #e4e9ef;
}

.skel-mini-cell {
  width: var(--mg-skeleton-skill-cell-size, 24px);
  height: calc(var(--mg-skeleton-skill-cell-size, 24px) - 1px);
  border-radius: 0;
  border: 1px solid #e4e9ef;
  background: #f6f8fc;
  box-sizing: border-box;
}

@keyframes skeleton-loading {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 22px;
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  background: #fafafa;
}

.empty-title {
  margin: 0;
  color: #4b5563;
  font-size: 13px;
}

.empty-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-tip {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}

.sheet-footer {
  background: #f3f3f3;
}

.sheet-strip {
  height: 32px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 0 4px;
  overflow-x: auto;
  overflow-y: hidden;
  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 2px;
  }
}

.sheet-tabs {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.sheet-add-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px 4px 0 0;
  border-bottom: none;
  background: #e0e0e0;
  color: #6b7280;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 0;

  &:hover {
    color: #4b5563;
    background: #ececec;
  }
}

.sheet-tab {
  height: 28px;
  background: #e0e0e0;
  color: #666;
  border: 1px solid #ccc;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  max-width: 300px;
  font-size: 12px;
  transition: all 0.2s;
  user-select: none;

  .sheet-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &.active {
    background: #fff;
    color: #7c3aed;
    border-color: #ddd;
    border-bottom: 1px solid #fff;
    margin-bottom: -1px;
    z-index: 1;
    height: 29px;
    border-top: 2px solid #7c3aed;
  }

  &.editing {
    padding: 0 4px;
    max-width: none;
    background: #fff;
    .edit-input {
      width: 240px;
      :deep(.el-input__inner) {
        height: 22px;
        font-size: 12px;
        padding: 0 4px;
      }
    }
  }

  &:hover:not(.active) {
    background: #e8e8e8;
  }

  .close-btn {
    font-size: 10px;
    border-radius: 50%;
    padding: 2px;
    &:hover {
      background: #ff4d4f;
      color: #fff;
    }
  }
}

.sheet-context-menu {
  position: fixed;
  z-index: 1001;
  min-width: 272px;
  padding: 6px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sheet-context-divider {
  height: 1px;
  margin: 4px 2px;
  background: #f3f4f6;
}

.sheet-context-zone {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 4px;
}

.sheet-context-zone-label {
  color: #6b7280;
  font-size: 11px;
  line-height: 1;
}

.sheet-context-item {
  width: 100%;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #374151;
  text-align: left;
  font-size: 12px;
  line-height: 20px;
  padding: 6px 8px;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }

  &.danger {
    color: #dc2626;
    &:hover {
      background: #fef2f2;
    }
  }
}

.sheet-menu-fade-enter-active,
.sheet-menu-fade-leave-active {
  transition: opacity 0.12s ease;
}

.sheet-menu-fade-enter-from,
.sheet-menu-fade-leave-to {
  opacity: 0;
}

.file-btn-mini {
  position: relative;
  height: 28px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  .file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
}

.settings-entry {
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid #eee;
  display: flex;
  align-items: center;
}

.config-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px;
}

.config-title {
  font-size: 13px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.color-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  .label {
    font-size: 12px;
    color: #666;
  }
}

.config-divider {
  width: 100%;
  height: 1px;
  background: #f0f0f0;
}

.loader-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.loader-content {
  background: #333;
  color: #fff;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 14px;
}

:deep(.el-icon) {
  vertical-align: middle;
}

.enc-list {
  max-height: 400px;
  overflow-y: auto;
}
.enc-item {
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  &:hover {
    background: #f5f7fa;
  }
}
.enc-main {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.enc-zone {
  font-weight: bold;
  font-size: 14px;
  color: #333;
}
.enc-dur {
  color: #7c3aed;
  font-weight: 500;
  font-size: 12px;
}
.enc-sub {
  color: #888;
  font-size: 11px;
}

:deep(.el-dialog__body) {
  padding: 0 20px 20px;
}

.import-mode-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-enc-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.import-mode-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.override-sheet-panel {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.override-sheet-title {
  font-size: 12px;
  color: #4b5563;
}

.override-sheet-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.current-sheet-tag {
  margin-left: 6px;
  font-size: 12px;
  color: #7c3aed;
}

.override-empty {
  font-size: 12px;
  color: #9ca3af;
}

.history-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-shortcut-hint {
  font-size: 12px;
  color: #6b7280;
}

.history-list {
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.history-item {
  width: 100%;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f9fafb;
  }

  &.active {
    background: #eff6ff;
  }
}

.history-index {
  width: 40px;
  color: #6b7280;
  font-size: 12px;
}

.history-label {
  flex: 1;
  color: #111827;
  font-size: 12px;
}

.history-current {
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}

.sheet-ghost {
  opacity: 0.35 !important;
}

.sheet-drag {
  opacity: 0.95 !important;
}

.sheet-fallback {
  opacity: 1 !important;
}
</style>
