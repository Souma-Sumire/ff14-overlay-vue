<script setup lang="ts">
import type { Column } from "element-plus";
import type { EncounterCandidate } from "@/types/mitigation";
import { useDark } from "@vueuse/core";
import { ElMessage } from "element-plus";
import { computed, h, onMounted, onUnmounted, ref, watch } from "vue";
import { useLogParser } from "@/composables/useLogParser";
import logDefinitions from "../../cactbot/resources/netlog_defs";
import { useStorage } from "@vueuse/core";
import CommonThemeToggle from "@/components/common/ThemeToggle.vue";

// ─── Type-code → name mapping ───────────────────────────────────────────────
const typeCodeNameMap = new Map<string, string>();
const lineActorFieldIndexMap = new Map<
  string,
  {
    sourceId: number | null;
    source: number | null;
    targetId: number | null;
    target: number | null;
  }
>();
const lineFieldNameIndexMap = new Map<string, Map<number, string>>();
for (const def of Object.values(logDefinitions)) {
  typeCodeNameMap.set(def.type, def.name);
  const fields = def.fields as Record<string, number | undefined>;
  const fieldNameMap = new Map<number, string>();
  for (const [fieldName, fieldIndex] of Object.entries(fields)) {
    if (typeof fieldIndex === "number") fieldNameMap.set(fieldIndex, fieldName);
  }
  lineFieldNameIndexMap.set(def.type, fieldNameMap);
  lineActorFieldIndexMap.set(def.type, {
    sourceId: fields.sourceId ?? null,
    source: fields.source ?? null,
    targetId: fields.targetId ?? null,
    target: fields.target ?? fields.targetName ?? null,
  });
}
function resolveTypeName(code: string): string {
  return typeCodeNameMap.get(code) ?? "Unknown";
}

// ─── Data Models ────────────────────────────────────────────────────────────
interface ParsedLineRow {
  key: string;
  globalIndex: number;
  raw: string;
  parts: string[];
  typeCode: string;
  typeName: string;
  timestampText: string;
  timestampMs: number | null;
  deltaSec: number | null;
  sourceId: string;
  source: string;
  targetId: string;
  target: string;
}

interface LogFieldDetailRow {
  index: number;
  fieldName: string;
  value: string;
}

interface LogFilterState {
  searchInputText: string;
  appliedSearchText: string;
  searchMode: "text" | "regex";
  showSearchResultsOnly: boolean;
  timeRangeStartText: string;
  timeRangeEndText: string;
  sourceIdFilterText: string;
  sourceFilterText: string;
  targetIdFilterText: string;
  targetFilterText: string;
  diffHighlightEnabled: boolean;
  visibleColumns: Record<string, boolean>;
}

interface PersistedLogSearchState {
  searchInputText: string;
  appliedSearchText: string;
  searchMode: "text" | "regex";
  showSearchResultsOnly: boolean;
  timeRangeStartText: string;
  timeRangeEndText: string;
  sourceIdFilterText: string;
  sourceFilterText: string;
  targetIdFilterText: string;
  targetFilterText: string;
}

// ─── IndexedDB ──────────────────────────────────────────────────────────────
const DB_NAME = "FF14LogViewDB";
const STORE_NAME = "logs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveLogToDB(name: string, text: string) {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ name, text }, "lastFile");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error("Failed to save DB", e);
  }
}

async function loadLogFromDB(): Promise<{ name: string; text: string } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get("lastFile");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (_e) {
    return null;
  }
}

// ─── State ──────────────────────────────────────────────────────────────────
const { parseFile } = useLogParser();
const isDark = useDark({
  storageKey: "log-view-theme",
  initialValue: "dark",
});
const persistedSearchState = useStorage<PersistedLogSearchState>("log-view-search-state", {
  searchInputText: "",
  appliedSearchText: "",
  searchMode: "text",
  showSearchResultsOnly: false,
  timeRangeStartText: "",
  timeRangeEndText: "",
  sourceIdFilterText: "",
  sourceFilterText: "",
  targetIdFilterText: "",
  targetFilterText: "",
});

const fileName = ref("");
const loading = ref(false);
const encounters = ref<EncounterCandidate[]>([]);
const selectedEncounterId = ref<string | null>(null);

// Only one column visible
const filter = ref<LogFilterState>({
  ...persistedSearchState.value,
  diffHighlightEnabled: false,
  visibleColumns: { raw: true },
});

const isDragging = ref(false);
let dragCounter = 0;
const TYPE_COLUMN_WIDTH = 118;
const enabledTypeCodePrefs = useStorage<Record<string, boolean>>("log-view-enabled-type-codes", {});
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuTypeCode = ref("");
const contextMenuTypeName = ref("");
const contextMenuTimestampMs = ref<number | null>(null);
const contextMenuRowKey = ref("");
const detailDialogVisible = ref(false);
const detailDialogRow = ref<ParsedLineRow | null>(null);

watch(
  () => ({
    searchInputText: filter.value.searchInputText,
    appliedSearchText: filter.value.appliedSearchText,
    searchMode: filter.value.searchMode,
    showSearchResultsOnly: filter.value.showSearchResultsOnly,
    timeRangeStartText: filter.value.timeRangeStartText,
    timeRangeEndText: filter.value.timeRangeEndText,
    sourceIdFilterText: filter.value.sourceIdFilterText,
    sourceFilterText: filter.value.sourceFilterText,
    targetIdFilterText: filter.value.targetIdFilterText,
    targetFilterText: filter.value.targetFilterText,
  }),
  (value) => {
    persistedSearchState.value = value;
  },
  { deep: true },
);

watch(selectedEncounterId, (newVal, oldVal) => {
  if (oldVal !== null && newVal !== null && newVal !== oldVal) {
    filter.value.searchInputText = "";
    filter.value.appliedSearchText = "";
    filter.value.showSearchResultsOnly = false;
    filter.value.timeRangeStartText = "";
    filter.value.timeRangeEndText = "";
    filter.value.sourceIdFilterText = "";
    filter.value.sourceFilterText = "";
    filter.value.targetIdFilterText = "";
    filter.value.targetFilterText = "";
  }
});

onMounted(async () => {
  try {
    loading.value = true;
    const saved = await loadLogFromDB();
    if (saved) {
      const file = new File([saved.text], saved.name, { type: "text/plain" });
      await handleFileImport(file, false);
    }
  } catch (_e) {
    // ignore
  } finally {
    loading.value = false;
  }

  window.addEventListener("click", closeContextMenu);
  window.addEventListener("blur", closeContextMenu);
});

onUnmounted(() => {
  window.removeEventListener("click", closeContextMenu);
  window.removeEventListener("blur", closeContextMenu);
});

// ─── Helpers ────────────────────────────────────────────────────────────────
function parseLineRow(
  raw: string,
  globalIndex: number,
  encounterId: string,
  combatStartMs: number | null,
): ParsedLineRow {
  const parts = raw.split("|");

  // Remove the checksum part (usually the last column) to avoid it
  // causing visual noise or matching in search/filter.
  if (parts.length > 0) {
    parts.pop();
  }
  const cleanRaw = `${parts.join("|")}|`;

  const typeCode = parts[0] ?? "";
  const timestampText = parts[1] ?? "";
  const parsed = Date.parse(timestampText);
  const timestampMs = Number.isNaN(parsed) ? null : parsed;
  const deltaSec =
    timestampMs !== null && combatStartMs !== null
      ? Number(((timestampMs - combatStartMs) / 1000).toFixed(1))
      : null;
  const actorFields = lineActorFieldIndexMap.get(typeCode) ?? {
    sourceId: null,
    source: null,
    targetId: null,
    target: null,
  };

  return {
    key: `${encounterId}_${globalIndex}`,
    globalIndex,
    raw: cleanRaw,
    parts,
    typeCode,
    typeName: resolveTypeName(typeCode),
    timestampText,
    timestampMs,
    deltaSec,
    sourceId: readPart(parts, actorFields.sourceId),
    source: readPart(parts, actorFields.source),
    targetId: readPart(parts, actorFields.targetId),
    target: readPart(parts, actorFields.target),
  };
}

// ─── File Import ────────────────────────────────────────────────────────────
async function handleFileImport(file: File, saveDb = true) {
  loading.value = true;
  fileName.value = file.name;
  try {
    const text = await file.text();
    if (saveDb) {
      saveLogToDB(file.name, text);
      filter.value.searchInputText = "";
      filter.value.appliedSearchText = "";
      filter.value.showSearchResultsOnly = false;
      filter.value.timeRangeStartText = "";
      filter.value.timeRangeEndText = "";
      filter.value.sourceIdFilterText = "";
      filter.value.sourceFilterText = "";
      filter.value.targetIdFilterText = "";
      filter.value.targetFilterText = "";
    }
    const freshFile = new File([text], file.name);
    // Step 1 – split encounters
    const parsed = await parseFile(freshFile);
    encounters.value = parsed;

    if (parsed.length === 0) {
      ElMessage.warning("未发现战斗记录");
    } else {
      selectedEncounterId.value = parsed[0]!.id;
    }
  } catch (e) {
    console.error("File parse error", e);
    ElMessage.error("文件解析出错");
  } finally {
    loading.value = false;
  }
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) handleFileImport(file);
  input.value = "";
}

function isSupportedLogFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith(".log") || lowerName.endsWith(".txt");
}

function onDragEnter(event: DragEvent) {
  if (!event.dataTransfer?.types.includes("Files")) return;
  dragCounter++;
  isDragging.value = true;
}

function onDragOver(event: DragEvent) {
  if (!event.dataTransfer?.types.includes("Files")) return;
  isDragging.value = true;
}

function onDragLeave(event: DragEvent) {
  if (!event.dataTransfer?.types.includes("Files")) return;
  dragCounter = Math.max(0, dragCounter - 1);
  if (dragCounter === 0) isDragging.value = false;
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  dragCounter = 0;
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  if (!isSupportedLogFile(file)) {
    ElMessage.warning("仅支持导入 .log 或 .txt 文件");
    return;
  }
  handleFileImport(file);
}

// ─── Selected encounter ─────────────────────────────────────────────────────
const selectedEncounter = computed(() => {
  if (!selectedEncounterId.value) return null;
  return encounters.value.find((e) => e.id === selectedEncounterId.value) ?? null;
});

// ─── Base rows (boundary-aware) ─────────────────────────────────────────────
const baseRows = computed<ParsedLineRow[]>(() => {
  const enc = selectedEncounter.value;
  if (!enc) return [];

  return enc.lines.map((line, idx) => parseLineRow(line, idx, enc.id, enc.startTime));
});

// ─── Dynamic type sidebar ───────────────────────────────────────────────────
function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compareTypeCodes(a: string, b: string) {
  const aNum = Number(a);
  const bNum = Number(b);
  const aIsNumeric = !Number.isNaN(aNum);
  const bIsNumeric = !Number.isNaN(bNum);
  if (aIsNumeric && bIsNumeric) return aNum - bNum;
  if (aIsNumeric) return -1;
  if (bIsNumeric) return 1;
  return a.localeCompare(b);
}

function ensureRegexStartsWithAnchor(text: string) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("^")) return trimmed;
  return `^${trimmed}`;
}

function rowMatchesSearch(row: ParsedLineRow, regex: RegExp | null) {
  return regex ? regex.test(row.raw) : true;
}

function getTimeOfDayMs(timestampMs: number) {
  const date = new Date(timestampMs);
  return (
    ((date.getHours() * 60 + date.getMinutes()) * 60 + date.getSeconds()) * 1000 +
    date.getMilliseconds()
  );
}

function readPart(parts: string[], index: number | null) {
  if (index === null) return "";
  return parts[index] ?? "";
}

function parseTimeOfDayInput(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { value: null as number | null, error: "" };

  const match = trimmed.match(/^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) {
    return { value: null as number | null, error: "时间范围格式应为 hh:mm:ss.xxx" };
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millisText = (match[4] ?? "").padEnd(3, "0");
  const millis = millisText ? Number(millisText) : 0;

  if (hours > 23 || minutes > 59 || seconds > 59 || millis > 999) {
    return { value: null as number | null, error: "时间范围超出有效时间" };
  }

  return {
    value: ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis,
    error: "",
  };
}

function formatTimeOfDay(timestampMs: number) {
  const date = new Date(timestampMs);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const millis = date.getMilliseconds().toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${millis}`;
}

const appliedSearchText = computed(() => filter.value.appliedSearchText.trim());

// Helper: create a regex computed + error ref from a reactive text source
function useRegex(textGetter: () => string) {
  const error = ref("");
  const regex = computed<RegExp | null>(() => {
    const text = textGetter().trim();
    if (!text) return null;
    try {
      return new RegExp(text, "i");
    } catch {
      return null;
    }
  });
  watch(textGetter, (raw) => {
    const text = raw.trim();
    if (!text) {
      error.value = "";
      return;
    }
    try {
      // eslint-disable-next-line no-new
      new RegExp(text, "i");
      error.value = "";
    } catch (e: any) {
      error.value = e.message ?? "Invalid regex";
    }
  });
  return { regex, error };
}

const { regex: regexSearchRegex, error: regexSearchError } = useRegex(() =>
  filter.value.searchMode === "regex" ? filter.value.appliedSearchText : "",
);

const activeSearchRegex = computed<RegExp | null>(() => {
  if (!appliedSearchText.value) return null;
  if (filter.value.searchMode === "regex") return regexSearchRegex.value;
  return new RegExp(escapeRegExp(appliedSearchText.value), "i");
});

const searchError = computed(() =>
  filter.value.searchMode === "regex" ? regexSearchError.value : "",
);

const searchScopedRows = computed<ParsedLineRow[]>(() => {
  const regex = activeSearchRegex.value;
  if (!regex) return baseRows.value;
  return baseRows.value.filter((row) => rowMatchesSearch(row, regex));
});

const parsedTimeRange = computed(() => {
  const start = parseTimeOfDayInput(filter.value.timeRangeStartText);
  const end = parseTimeOfDayInput(filter.value.timeRangeEndText);
  if (start.error)
    return { start: null as number | null, end: null as number | null, error: start.error };
  if (end.error)
    return { start: null as number | null, end: null as number | null, error: end.error };
  if (start.value !== null && end.value !== null && start.value > end.value) {
    return { start: start.value, end: end.value, error: "开始时间不能大于结束时间" };
  }
  return { start: start.value, end: end.value, error: "" };
});

const timeRangeError = computed(() => parsedTimeRange.value.error);

function rowMatchesTimeRange(row: ParsedLineRow) {
  const { start, end, error } = parsedTimeRange.value;
  if (error) return true;
  if (start === null && end === null) return true;
  if (row.timestampMs === null) return false;
  const rowTimeOfDayMs = getTimeOfDayMs(row.timestampMs);
  if (start !== null && rowTimeOfDayMs < start) return false;
  if (end !== null && rowTimeOfDayMs > end) return false;
  return true;
}

const { regex: sourceIdFilterRegex, error: sourceIdFilterError } = useRegex(() =>
  ensureRegexStartsWithAnchor(filter.value.sourceIdFilterText),
);
const { regex: sourceFilterRegex, error: sourceFilterError } = useRegex(
  () => filter.value.sourceFilterText,
);
const { regex: targetIdFilterRegex, error: targetIdFilterError } = useRegex(() =>
  ensureRegexStartsWithAnchor(filter.value.targetIdFilterText),
);
const { regex: targetFilterRegex, error: targetFilterError } = useRegex(
  () => filter.value.targetFilterText,
);

const actorFilterError = computed(
  () =>
    sourceIdFilterError.value ||
    sourceFilterError.value ||
    targetIdFilterError.value ||
    targetFilterError.value ||
    "",
);

function rowMatchesActorFilters(row: ParsedLineRow) {
  if (
    sourceIdFilterRegex.value &&
    !sourceIdFilterError.value &&
    !sourceIdFilterRegex.value.test(row.sourceId)
  )
    return false;

  if (
    sourceFilterRegex.value &&
    !sourceFilterError.value &&
    !sourceFilterRegex.value.test(row.source)
  )
    return false;

  if (
    targetIdFilterRegex.value &&
    !targetIdFilterError.value &&
    !targetIdFilterRegex.value.test(row.targetId)
  )
    return false;

  if (
    targetFilterRegex.value &&
    !targetFilterError.value &&
    !targetFilterRegex.value.test(row.target)
  )
    return false;

  return true;
}

const timeFilteredRows = computed<ParsedLineRow[]>(() =>
  searchScopedRows.value.filter(rowMatchesTimeRange),
);

const actorFilteredRows = computed<ParsedLineRow[]>(() =>
  timeFilteredRows.value.filter(rowMatchesActorFilters),
);

const typeFilterSourceRows = computed<ParsedLineRow[]>(() =>
  filter.value.showSearchResultsOnly
    ? actorFilteredRows.value
    : baseRows.value.filter((row) => rowMatchesTimeRange(row) && rowMatchesActorFilters(row)),
);

const availableTypeCodes = computed(() => {
  const map = new Map<string, { code: string; name: string; count: number }>();
  for (const row of typeFilterSourceRows.value) {
    const existing = map.get(row.typeCode);
    if (existing) {
      existing.count++;
    } else {
      map.set(row.typeCode, { code: row.typeCode, name: row.typeName, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => compareTypeCodes(a.code, b.code));
});

function isTypeCodeEnabled(typeCode: string) {
  return enabledTypeCodePrefs.value[typeCode] ?? true;
}

function setTypeCodeEnabled(typeCode: string, enabled: boolean) {
  enabledTypeCodePrefs.value = {
    ...enabledTypeCodePrefs.value,
    [typeCode]: enabled,
  };
}

function onTypeCheckboxChange(event: Event, typeCode: string) {
  const checked = (event.target as HTMLInputElement).checked;
  setTypeCodeEnabled(typeCode, checked);
}

// ─── Filter chain ───────────────────────────────────────────────────────────
const filteredRows = computed<ParsedLineRow[]>(() => {
  const sourceRows = filter.value.showSearchResultsOnly
    ? actorFilteredRows.value
    : baseRows.value.filter((row) => rowMatchesTimeRange(row) && rowMatchesActorFilters(row));

  return sourceRows.filter((r) => isTypeCodeEnabled(r.typeCode));
});

// ─── Search Navigation ──────────────────────────────────────────────────────
const matchIndices = computed(() => {
  const re = activeSearchRegex.value;
  if (!re) return [];

  const indices: number[] = [];
  const rows = filteredRows.value;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (re.test(r.raw)) {
      indices.push(i);
    }
  }
  return indices;
});

watch(
  () => filter.value.searchInputText,
  (value) => {
    if (!value.trim() && filter.value.appliedSearchText) {
      filter.value.appliedSearchText = "";
      filter.value.showSearchResultsOnly = false;
    }
  },
);

const tableRef = ref<any>(null);
const currentMatchIdx = ref(-1);

watch(matchIndices, (indices) => {
  if (indices.length > 0) {
    currentMatchIdx.value = 0;
    scrollToIndex(indices[0] as number);
  } else {
    currentMatchIdx.value = -1;
  }
});

function scrollToIndex(index: number) {
  if (tableRef.value) {
    tableRef.value.scrollToRow(index, "center");
  }
}

function scrollToNextMatch() {
  if (matchIndices.value.length === 0) return;
  currentMatchIdx.value = (currentMatchIdx.value + 1) % matchIndices.value.length;
  scrollToIndex(matchIndices.value[currentMatchIdx.value] as number);
}

function scrollToPrevMatch() {
  if (matchIndices.value.length === 0) return;
  currentMatchIdx.value =
    (currentMatchIdx.value - 1 + matchIndices.value.length) % matchIndices.value.length;
  scrollToIndex(matchIndices.value[currentMatchIdx.value] as number);
}

function applySearch(mode: "text" | "regex") {
  filter.value.searchMode = mode;
  filter.value.appliedSearchText = filter.value.searchInputText.trim();
  filter.value.showSearchResultsOnly = !!filter.value.appliedSearchText;
}

function runSearch() {
  applySearch(filter.value.searchMode);
}

const currentMatchLabel = computed(() => {
  if (matchIndices.value.length === 0) return "0 / 0";
  return `${currentMatchIdx.value + 1} / ${matchIndices.value.length}`;
});

const currentMatchRowKey = computed(() => {
  if (currentMatchIdx.value < 0) return null;
  const rowIndex = matchIndices.value[currentMatchIdx.value];
  if (rowIndex === undefined) return null;
  return filteredRows.value[rowIndex]?.key ?? null;
});

const detailFieldRows = computed<LogFieldDetailRow[]>(() => {
  const row = detailDialogRow.value;
  if (!row) return [];
  const fieldNameMap = lineFieldNameIndexMap.get(row.typeCode) ?? new Map<number, string>();
  return row.parts.map((value, index) => ({
    index,
    fieldName: fieldNameMap.get(index) ?? `field_${index}`,
    value,
  }));
});

function rowClass({ rowIndex }: { rowIndex: number }) {
  if (matchIndices.value.length > 0) {
    if (rowIndex === matchIndices.value[currentMatchIdx.value]) {
      return "active-match-row";
    }
  }
  return "";
}

// ─── Diff highlight ─────────────────────────────────────────────────────────
interface DiffInfo {
  changedFieldCount: number;
  changedIndices: Set<number>;
}

const diffMap = computed<Map<string, DiffInfo>>(() => {
  const map = new Map<string, DiffInfo>();
  if (!filter.value.diffHighlightEnabled) return map;

  const rows = filteredRows.value;
  // Track last seen row for each typeCode
  const lastByType = new Map<string, ParsedLineRow>();

  for (const row of rows) {
    const prev = lastByType.get(row.typeCode);
    if (prev) {
      const changedIndices = new Set<number>();
      const maxLen = Math.max(row.parts.length, prev.parts.length);
      for (let i = 0; i < maxLen; i++) {
        if (i === 1) continue; // skip timestamp field
        if ((row.parts[i] ?? "") !== (prev.parts[i] ?? "")) changedIndices.add(i);
      }
      map.set(row.key, { changedFieldCount: changedIndices.size, changedIndices });
    }
    lastByType.set(row.typeCode, row);
  }
  return map;
});

// ─── Type sidebar actions ───────────────────────────────────────────────────
function setAllTypes(enabled: boolean) {
  const next = { ...enabledTypeCodePrefs.value };
  for (const item of availableTypeCodes.value) next[item.code] = enabled;
  enabledTypeCodePrefs.value = next;
}

function hideTypeCode(typeCode: string) {
  if (!typeCode) return;
  if (!isTypeCodeEnabled(typeCode)) return;
  setTypeCodeEnabled(typeCode, false);
  ElMessage.success(`已隐藏类型 ${typeCode} ${resolveTypeName(typeCode)}`);
}

function closeContextMenu() {
  contextMenuVisible.value = false;
  contextMenuTimestampMs.value = null;
  contextMenuRowKey.value = "";
}

function openTypeContextMenu(event: MouseEvent, rowData: ParsedLineRow) {
  event.preventDefault();
  contextMenuRowKey.value = rowData.key;
  contextMenuTypeCode.value = rowData.typeCode;
  contextMenuTypeName.value = rowData.typeName;
  contextMenuTimestampMs.value = rowData.timestampMs;
  contextMenuPosition.value = {
    x: event.clientX,
    y: event.clientY,
  };
  contextMenuVisible.value = true;
}

function hideCurrentContextMenuType() {
  hideTypeCode(contextMenuTypeCode.value);
  closeContextMenu();
}

function openRowDetailDialog() {
  const row = filteredRows.value.find((item) => item.key === contextMenuRowKey.value);
  if (!row) return;
  detailDialogRow.value = row;
  detailDialogVisible.value = true;
  closeContextMenu();
}

function focusAroundCurrentContextTime(seconds = 3) {
  if (contextMenuTimestampMs.value === null) {
    ElMessage.warning("当前日志行没有可用的时间戳");
    return;
  }
  const start = contextMenuTimestampMs.value - seconds * 1000;
  const end = contextMenuTimestampMs.value + seconds * 1000;
  filter.value.timeRangeStartText = formatTimeOfDay(start);
  filter.value.timeRangeEndText = formatTimeOfDay(end);
  closeContextMenu();
}

// ─── Horizontal scroll sync ─────────────────────────────────────────────────
const hScrollRef = ref<HTMLDivElement | null>(null);
const hScrollLeft = ref(0);
const contentWidth = ref(0);

let _measureCtx: CanvasRenderingContext2D | null = null;
function measureTextWidth(text: string): number {
  if (!_measureCtx) {
    const canvas = document.createElement("canvas");
    _measureCtx = canvas.getContext("2d");
    if (_measureCtx) {
      _measureCtx.font = "11.5px 'JetBrains Mono', 'Fira Code', 'Consolas', 'Menlo', monospace";
    }
  }
  return _measureCtx ? _measureCtx.measureText(text).width : text.length * 7.5;
}

watch(
  filteredRows,
  (rows) => {
    let maxPx = 0;
    for (let i = 0; i < rows.length; i++) {
      const w = measureTextWidth(rows[i]?.raw || "");
      if (w > maxPx) maxPx = w;
    }
    contentWidth.value = Math.ceil(maxPx + 60 + TYPE_COLUMN_WIDTH);

    // Reset horizontal scroll when data changes
    hScrollLeft.value = 0;
    if (hScrollRef.value) {
      hScrollRef.value.scrollLeft = 0;
    }
  },
  { immediate: true },
);

function onHScroll() {
  if (hScrollRef.value) {
    hScrollLeft.value = hScrollRef.value.scrollLeft;
  }
}

// ─── Table columns (el-table-v2) ────────────────────────────────────────────
const tableColumns = computed<Column<any>[]>(() => {
  const allCols: Column<any>[] = [
    {
      key: "type",
      title: "Type",
      dataKey: "typeCode",
      width: TYPE_COLUMN_WIDTH,
      cellRenderer: ({ rowData }: { rowData: ParsedLineRow }) =>
        h(
          "div",
          {
            class: "cell-type-wrap",
            onContextmenu: (event: MouseEvent) => openTypeContextMenu(event, rowData),
          },
          [
            h("span", { class: "cell-type-code" }, rowData.typeCode || "--"),
            h("span", { class: "cell-type-name" }, rowData.typeName),
          ],
        ),
    },
    {
      key: "raw",
      title: "Raw",
      dataKey: "raw",
      width: 200,
      flexGrow: 1,
      cellRenderer: ({ rowData }: { rowData: ParsedLineRow }) => {
        const diff = diffMap.value.get(rowData.key);
        const enableDiff = diff && diff.changedFieldCount > 0 && filter.value.diffHighlightEnabled;
        const sRe = activeSearchRegex.value;
        const isCurrentMatchRow = rowData.key === currentMatchRowKey.value;

        const displayParts = rowData.parts;

        const children = displayParts
          .map((part, idx) => {
            const isChanged = enableDiff && diff.changedIndices.has(idx);

            let content: any = part;
            // Apply search highlight if configured and not empty part
            if (sRe && !searchError.value && part && sRe.test(part)) {
              // we split the text and highlight all matches
              let lastIndex = 0;
              const fragments = [];

              // Re-instantiate regex with global flag to find *all* matches in this part
              // (Assumes you don't use g flag in main incRe computed)
              const globalRegex = new RegExp(sRe.source, sRe.ignoreCase ? "gi" : "g");
              let match;
              while (true) {
                match = globalRegex.exec(part);
                if (!match) break;
                if (match.index > lastIndex) {
                  fragments.push(part.substring(lastIndex, match.index));
                }
                fragments.push(
                  h(
                    "span",
                    { class: isCurrentMatchRow ? "search-highlight-current" : "search-highlight" },
                    match[0],
                  ),
                );
                lastIndex = match.index + match[0].length;
              }
              if (lastIndex < part.length) {
                fragments.push(part.substring(lastIndex));
              }
              content = fragments;
            }

            return [
              h("span", { class: isChanged ? "diff-changed" : "diff-unchanged" }, content),
              h("span", { class: "diff-separator" }, "|"),
            ];
          })
          .flat();

        return h(
          "span",
          {
            class: "cell-raw",
            onContextmenu: (event: MouseEvent) => openTypeContextMenu(event, rowData),
          },
          children,
        );
      },
    },
  ];

  return allCols;
});

// ─── Encounter option label ─────────────────────────────────────────────────
function encounterLabel(enc: EncounterCandidate) {
  const start = new Date(enc.startTime).toLocaleTimeString();
  return `${enc.zoneName} | ${start} | ${enc.durationStr} | ${enc.lines.length} 行`;
}
</script>

<template>
  <div
    class="log-view-root"
    :class="{ 'is-dark': isDark }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
    @contextmenu.prevent
  >
    <div v-if="isDragging" class="drag-overlay">
      <div class="drag-overlay-card">
        <div class="drag-overlay-title">释放鼠标以上传日志</div>
        <div class="drag-overlay-subtitle">支持 .log / .txt</div>
      </div>
    </div>

    <div v-if="encounters.length === 0 && !loading" class="empty-hint">
      <p>拖入 <code>.log</code> 或 <code>.txt</code> 文件以开始分析</p>
    </div>

    <div v-else class="main-layout">
      <!-- ── Left Sidebar ── -->
      <aside class="sidebar">
        <!-- 拖放区域 (移入侧边栏上方) -->
        <section class="sidebar-section">
          <div class="sidebar-toolbar">
            <div class="drop-zone" :class="{ dragging: isDragging }">
              <label class="file-label">
                <input type="file" accept=".log,.txt" hidden @change="onFileInput" />
                <span class="file-btn">📂 选择/拖入</span>
              </label>
            </div>

            <CommonThemeToggle storage-key="log-view-theme" />
          </div>

          <div v-if="loading" class="loading-indicator">
            <el-icon class="is-loading">
              <i class="el-icon-loading" />
            </el-icon>
            解析中…
          </div>
        </section>

        <!-- 选择战斗 -->
        <section v-if="encounters.length > 0" class="sidebar-section">
          <el-select
            v-model="selectedEncounterId"
            placeholder="选择战斗"
            class="encounter-select-sidebar"
          >
            <el-option
              v-for="enc in encounters"
              :key="enc.id"
              :label="encounterLabel(enc)"
              :value="enc.id"
            />
          </el-select>
        </section>

        <!-- Type code checkboxes (占据剩余空间) -->
        <section class="sidebar-section type-section">
          <h3 class="section-title">
            类型过滤
            <span class="type-actions">
              <button class="link-btn" @click="setAllTypes(true)">全选</button>
              <button class="link-btn" @click="setAllTypes(false)">全不选</button>
            </span>
          </h3>
          <div class="type-list">
            <div v-for="item in availableTypeCodes" :key="item.code" class="type-item">
              <input
                type="checkbox"
                :checked="isTypeCodeEnabled(item.code)"
                class="type-checkbox"
                @change="onTypeCheckboxChange($event, item.code)"
              />
              <span class="type-code">{{ item.code }}</span>
              <span class="type-name">{{ item.name }}</span>
              <span class="type-count">({{ item.count }})</span>
            </div>
          </div>
        </section>

        <!-- Diff toggle -->
        <section class="sidebar-section diff-section">
          <el-checkbox v-model="filter.diffHighlightEnabled" size="small"> 差异高亮 </el-checkbox>
        </section>
      </aside>

      <!-- ── Main Area ── -->
      <div class="content-area">
        <div class="controls-bar">
          <div class="search-toolbar">
            <el-input
              v-model="filter.searchInputText"
              placeholder="在战斗日志中查找..."
              clearable
              :class="{ 'regex-error': searchError }"
              class="search-input"
              @keyup.enter="runSearch"
            />

            <div class="search-actions">
              <button class="nav-btn" @click="applySearch('text')">以文本方式查询</button>
              <button class="nav-btn" @click="applySearch('regex')">以正则表达式方式查询</button>
              <label class="result-toggle result-toggle-inline">
                <input v-model="filter.showSearchResultsOnly" type="checkbox" />
                <span>只显示搜索结果</span>
              </label>
              <button
                class="nav-btn"
                :disabled="matchIndices.length === 0"
                @click="scrollToPrevMatch"
              >
                上一个
              </button>
              <button
                class="nav-btn"
                :disabled="matchIndices.length === 0"
                @click="scrollToNextMatch"
              >
                下一个
              </button>
            </div>

            <div class="search-status">
              <span class="match-count">{{ currentMatchLabel }}</span>
            </div>
          </div>

          <div class="time-filter-bar">
            <span class="time-filter-label">时间范围</span>
            <el-input
              v-model="filter.timeRangeStartText"
              placeholder="hh:mm:ss.xxx"
              clearable
              :class="{ 'regex-error': timeRangeError }"
              class="time-range-input"
            />
            <span class="time-filter-separator">~</span>
            <el-input
              v-model="filter.timeRangeEndText"
              placeholder="hh:mm:ss.xxx"
              clearable
              :class="{ 'regex-error': timeRangeError }"
              class="time-range-input"
            />
          </div>

          <div class="actor-filter-bar">
            <div class="actor-id-filter">
              <span class="actor-id-anchor">^</span>
              <el-input
                v-model="filter.sourceIdFilterText"
                placeholder="SourceID"
                clearable
                :class="{ 'regex-error': actorFilterError }"
                class="actor-filter-input actor-id-input"
              />
            </div>
            <el-input
              v-model="filter.sourceFilterText"
              placeholder="Source (正则)"
              clearable
              :class="{ 'regex-error': actorFilterError }"
              class="actor-filter-input"
            />
            <div class="actor-id-filter">
              <span class="actor-id-anchor">^</span>
              <el-input
                v-model="filter.targetIdFilterText"
                placeholder="TargetID"
                clearable
                :class="{ 'regex-error': actorFilterError }"
                class="actor-filter-input actor-id-input"
              />
            </div>
            <el-input
              v-model="filter.targetFilterText"
              placeholder="Target (正则)"
              clearable
              :class="{ 'regex-error': actorFilterError }"
              class="actor-filter-input"
            />
          </div>

          <div v-if="searchError" class="error-hint">
            {{ searchError }}
          </div>
          <div v-if="timeRangeError" class="error-hint">
            {{ timeRangeError }}
          </div>
          <div v-if="actorFilterError" class="error-hint">
            {{ actorFilterError }}
          </div>
        </div>

        <div class="table-area">
          <el-auto-resizer style="height: 100%; width: 100%">
            <template #default="{ height, width }">
              <div style="display: flex; flex-direction: column; height: 100%">
                <el-table-v2
                  ref="tableRef"
                  class="log-table"
                  :columns="tableColumns"
                  :data="filteredRows"
                  :width="width"
                  :height="contentWidth > width ? height - 14 : height"
                  :row-height="24"
                  :header-height="28"
                  row-key="key"
                  :overscan-row-count="5"
                  :row-class-name="rowClass"
                  :expand-column-key="currentMatchIdx.toString()"
                  scrollbar-always-on
                  :style="{
                    '--h-scroll-offset': `-${hScrollLeft}px`,
                    '--h-content-width': `${contentWidth}px`,
                  }"
                >
                  <template #empty>
                    <div class="table-empty">暂无匹配的日志行</div>
                  </template>
                </el-table-v2>
                <div
                  v-if="contentWidth > width"
                  ref="hScrollRef"
                  class="h-scroll-track"
                  @scroll="onHScroll"
                >
                  <div :style="{ width: `${contentWidth}px`, height: '1px' }" />
                </div>
              </div>
            </template>
          </el-auto-resizer>
        </div>
      </div>
    </div>

    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }"
      @click.stop
      @contextmenu.prevent
    >
      <div class="context-menu-header">{{ contextMenuTypeCode }} {{ contextMenuTypeName }}</div>
      <button class="context-menu-item" @click="openRowDetailDialog">详细信息</button>
      <button
        class="context-menu-item"
        :disabled="contextMenuTimestampMs === null"
        @click="focusAroundCurrentContextTime(3)"
      >
        只看前后3秒
      </button>
      <button class="context-menu-item danger" @click="hideCurrentContextMenuType">
        隐藏此类型
      </button>
    </div>

    <el-dialog
      v-model="detailDialogVisible"
      title="日志行详细信息"
      width="min(960px, 92vw)"
      class="log-detail-dialog"
    >
      <template v-if="detailDialogRow">
        <div class="detail-summary">
          <div class="detail-summary-item">
            <span class="detail-summary-label">类型</span>
            <span>{{ detailDialogRow.typeCode }} {{ detailDialogRow.typeName }}</span>
          </div>
          <div class="detail-summary-item">
            <span class="detail-summary-label">时间戳</span>
            <span>{{ detailDialogRow.timestampText || "-" }}</span>
          </div>
          <div class="detail-summary-item">
            <span class="detail-summary-label">Source</span>
            <span>{{ detailDialogRow.sourceId || "-" }} {{ detailDialogRow.source || "" }}</span>
          </div>
          <div class="detail-summary-item">
            <span class="detail-summary-label">Target</span>
            <span>{{ detailDialogRow.targetId || "-" }} {{ detailDialogRow.target || "" }}</span>
          </div>
        </div>

        <div class="detail-raw-block">
          {{ detailDialogRow.raw }}
        </div>

        <div class="detail-table-wrap">
          <table class="detail-table">
            <thead>
              <tr>
                <th>Index</th>
                <th>Field</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="field in detailFieldRows" :key="`${detailDialogRow.key}_${field.index}`">
                <td>{{ field.index }}</td>
                <td>{{ field.fieldName }}</td>
                <td>{{ field.value || "-" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
/* ── Global/Variables ── */
.log-view-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--lv-bg-page);
  color: var(--lv-text);
  font-family: "JetBrains Mono", "Fira Code", "Consolas", "Menlo", monospace;
  overflow: hidden;

  --lv-bg-page: #f5f7fb;
  --lv-bg-elevated: #ffffff;
  --lv-bg-panel: #eef3f9;
  --lv-bg-muted: #e6edf5;
  --lv-bg-overlay: rgba(241, 245, 249, 0.84);
  --lv-text: #1f2937;
  --lv-text-strong: #0f172a;
  --lv-text-muted: #64748b;
  --lv-text-soft: #94a3b8;
  --lv-border: #d7dee8;
  --lv-border-strong: #c2ccd8;
  --lv-scrollbar: #b8c4d4;
  --lv-accent: #2563eb;
  --lv-accent-soft: rgba(37, 99, 235, 0.12);
  --lv-accent-strong: #1d4ed8;
  --lv-danger: #dc2626;
  --lv-danger-soft: rgba(220, 38, 38, 0.08);
  --lv-success: #15803d;
  --lv-success-soft: rgba(21, 128, 61, 0.08);
  --lv-warning: #b45309;
  --lv-warning-soft: rgba(180, 83, 9, 0.14);
  --lv-type-accent: #7c3aed;
  --lv-type-soft: rgba(124, 58, 237, 0.12);
  --lv-shadow: rgba(15, 23, 42, 0.08);
  --lv-mask: rgba(15, 23, 42, 0.22);

  --el-bg-color: var(--lv-bg-page);
  --el-bg-color-page: var(--lv-bg-page);
  --el-bg-color-overlay: var(--lv-bg-elevated);
  --el-text-color-primary: var(--lv-text);
  --el-text-color-regular: var(--lv-text-muted);
  --el-border-color: var(--lv-border-strong);
  --el-border-color-light: var(--lv-border);
  --el-border-color-lighter: var(--lv-border);
  --el-fill-color-blank: var(--lv-bg-page);
  --el-mask-color: var(--lv-mask);
}

.log-view-root.is-dark {
  --lv-bg-page: #0d1117;
  --lv-bg-elevated: #161b22;
  --lv-bg-panel: #161b22;
  --lv-bg-muted: #21262d;
  --lv-bg-overlay: rgba(13, 17, 23, 0.72);
  --lv-text: #c9d1d9;
  --lv-text-strong: #f3f4f6;
  --lv-text-muted: #8b949e;
  --lv-text-soft: #6e7681;
  --lv-border: #21262d;
  --lv-border-strong: #30363d;
  --lv-scrollbar: #30363d;
  --lv-accent: #58a6ff;
  --lv-accent-soft: rgba(88, 166, 255, 0.12);
  --lv-accent-strong: #79c0ff;
  --lv-danger: #f85149;
  --lv-danger-soft: rgba(248, 81, 73, 0.1);
  --lv-success: #3fb950;
  --lv-success-soft: rgba(63, 185, 80, 0.08);
  --lv-warning: #e3b341;
  --lv-warning-soft: rgba(227, 179, 65, 0.2);
  --lv-type-accent: #d2a8ff;
  --lv-type-soft: rgba(210, 168, 255, 0.1);
  --lv-shadow: rgba(0, 0, 0, 0.2);
  --lv-mask: rgba(0, 0, 0, 0.8);

  /* Custom Scrollbar for the whole app */
  * {
    scrollbar-width: thin;
    scrollbar-color: var(--lv-scrollbar) transparent;
  }
  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background-color: var(--lv-scrollbar);
    border-radius: 10px;
  }
}

.drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: var(--lv-bg-overlay);
  backdrop-filter: blur(4px);
}

.drag-overlay-card {
  min-width: 280px;
  padding: 24px 32px;
  border: 1px solid color-mix(in srgb, var(--lv-accent) 40%, transparent);
  border-radius: 16px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--lv-bg-elevated) 96%, transparent),
    color-mix(in srgb, var(--lv-bg-page) 96%, transparent)
  );
  box-shadow: 0 20px 60px color-mix(in srgb, var(--lv-shadow) 220%, transparent);
  text-align: center;
}

.drag-overlay-title {
  color: var(--lv-text);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.drag-overlay-subtitle {
  margin-top: 10px;
  color: var(--lv-accent-strong);
  font-size: 13px;
}

/* ── Toolbar / Drop Zone inside sidebar ── */
.drop-zone {
  border: 2px dashed var(--lv-border-strong);
  border-radius: 8px;
  padding: 6px 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  background: color-mix(in srgb, var(--lv-bg-elevated) 75%, transparent);

  &.dragging {
    border-color: var(--lv-accent);
    background: var(--lv-accent-soft);
    transform: scale(1.02);
  }

  &:hover {
    border-color: var(--lv-accent-strong);
    background: color-mix(in srgb, var(--lv-bg-elevated) 92%, transparent);
  }
}

.file-label {
  cursor: pointer;
  display: flex;
  align-items: center;
  height: 100%;
}

.file-btn {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  color: var(--lv-accent);
  letter-spacing: 0.5px;
}

.stats {
  display: flex;
  gap: 12px;
  font-size: 12px;

  .stat-item {
    padding: 4px 12px;
    background: var(--lv-bg-muted);
    border: 1px solid var(--lv-border-strong);
    border-radius: 12px;
    color: var(--lv-text-muted);
    display: inline-flex;
    align-items: center;
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--lv-text) 8%, transparent);
    transition: color 0.2s;

    &:hover {
      color: var(--lv-text);
    }
  }
}

.loading-indicator {
  font-size: 13px;
  color: var(--lv-accent);
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.empty-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--lv-text-muted);
  animation: pulse 3s infinite;

  code {
    background: var(--lv-bg-muted);
    color: var(--lv-text);
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 16px;
    margin: 0 6px;
    border: 1px solid var(--lv-border-strong);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

/* ── Main Layout ── */
.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: var(--lv-bg-page);
}

/* ── Sidebar ── */
.sidebar {
  width: 252px;
  min-width: 220px;
  background: var(--lv-bg-elevated);
  border-right: 1px solid var(--lv-border-strong);
  padding: 10px 0;
  flex-shrink: 0;
  box-shadow: 2px 0 8px var(--lv-shadow);
  display: flex;
  flex-direction: column;
  height: 100%; /* Ensure sidebar takes full height and bounds its children */
  overflow: hidden; /* Prevent default vertical scroll here; let inner type-list scroll */
}

.sidebar-section {
  padding: 0 12px 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--lv-border);

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
}

.sidebar-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 10px;
  font-weight: 700;
  color: var(--lv-text-soft);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.encounter-select {
  width: 100%;

  :deep(.el-input__wrapper) {
    background-color: var(--lv-bg-page);
    box-shadow: 0 0 0 1px var(--lv-border-strong) inset;
  }
}

/* ── Type checkbox list ── */
.type-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Important to keep flex child from overflowing */
}

.diff-section {
  margin-top: auto; /* Push down if needed */
  border-top: 1px solid var(--lv-border);
  border-bottom: none;
  padding-top: 8px;
}

.type-actions {
  display: flex;
  gap: 4px;
}

.link-btn {
  background: var(--lv-accent-soft);
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--lv-accent);
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  padding: 1px 5px;
  transition: all 0.2s;

  &:hover {
    background: color-mix(in srgb, var(--lv-accent) 18%, transparent);
    border-color: color-mix(in srgb, var(--lv-accent) 30%, transparent);
  }
}

.type-list {
  overflow-y: auto;
  flex: 1;
  padding-right: 2px;
  margin-top: 2px;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  margin-bottom: 1px;
  border-radius: 5px;
  font-size: 11px;
  line-height: 1.35;
  transition:
    background 0.2s,
    transform 0.1s;
  border: 1px solid transparent;

  &:hover {
    background: color-mix(in srgb, var(--lv-accent) 8%, transparent);
    border-color: color-mix(in srgb, var(--lv-accent) 15%, transparent);
  }
}

.type-checkbox {
  accent-color: var(--lv-accent);
  width: 13px;
  height: 13px;
  cursor: pointer;
  margin: 0;
}

.type-code {
  font-weight: 700;
  color: var(--lv-type-accent);
  min-width: 22px;
  text-align: center;
  background: var(--lv-type-soft);
  border-radius: 4px;
  padding: 1px 3px;
  font-size: 10px;
}

.type-name {
  color: var(--lv-text);
  flex: 1;
  word-break: break-all;
}

.type-count {
  color: var(--lv-text-muted);
  font-size: 10px;
  font-weight: 600;
  background: var(--lv-bg-muted);
  padding: 1px 5px;
  border-radius: 10px;
}

/* ── Filter visual states ── */
.regex-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--lv-danger) inset !important;
  background-color: var(--lv-danger-soft);
}

.error-hint {
  color: var(--lv-danger);
  font-size: 11px;
  margin-top: 4px;
  font-weight: 500;
}

.mt-1 {
  margin-top: 8px;
}

// Global overrides for Element Plus Inputs in dark mode
:deep(.el-input__wrapper) {
  background-color: var(--lv-bg-page);
  box-shadow: 0 0 0 1px var(--lv-border-strong) inset;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 0 0 1px var(--lv-text-muted) inset;
  }

  &.is-focus {
    box-shadow: 0 0 0 1px var(--lv-accent) inset;
  }
}

:deep(.el-input__inner) {
  color: var(--lv-text);
  &::placeholder {
    color: var(--lv-text-soft);
  }
}

/* ── Content Area & Search Bar ── */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.controls-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: var(--lv-bg-page);
  border-bottom: 1px solid var(--lv-border);
}

.search-toolbar {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.time-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.actor-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.actor-id-filter {
  display: flex;
  align-items: center;
  gap: 4px;
}

.actor-id-anchor {
  color: var(--lv-text-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.time-filter-label {
  color: var(--lv-text);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.time-filter-separator {
  color: var(--lv-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.search-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 8px;
  border: 1px solid var(--lv-border-strong);
  border-radius: 6px;
  background: var(--lv-bg-elevated);
}

.nav-btn {
  background: var(--lv-bg-muted);
  border: 1px solid var(--lv-border-strong);
  color: var(--lv-text);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 9px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--lv-bg-muted) 72%, var(--lv-accent-soft));
    border-color: var(--lv-accent);
    color: var(--lv-accent-strong);
  }

  &:disabled {
    color: var(--lv-text-soft);
    background: var(--lv-bg-elevated);
    border-color: var(--lv-border);
    cursor: not-allowed;
  }
}

.search-input {
  flex: 1 1 280px;
  max-width: 460px;

  :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px var(--lv-border-strong) inset;
    background: var(--lv-bg-elevated);
    border-radius: 5px;
    padding: 0 8px;
    min-height: 30px;

    &.is-focus {
      box-shadow: 0 0 0 1px var(--lv-accent) inset;
    }
  }
}

.time-range-input {
  width: 118px;

  :deep(.el-input__wrapper) {
    background: var(--lv-bg-elevated);
    box-shadow: 0 0 0 1px var(--lv-border-strong) inset;
    min-height: 30px;
    padding: 0 8px;
  }
}

.actor-filter-input {
  width: 160px;

  :deep(.el-input__wrapper) {
    background: var(--lv-bg-elevated);
    box-shadow: 0 0 0 1px var(--lv-border-strong) inset;
    min-height: 30px;
    padding: 0 8px;
  }
}

.actor-id-input {
  width: 118px;
}

.match-count {
  color: var(--lv-text);
  font-size: 12px;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.result-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--lv-text);
  cursor: pointer;

  input {
    margin: 0;
    accent-color: var(--lv-accent);
  }
}

.result-toggle-inline {
  padding: 0 5px;
  height: 30px;
  border: 1px solid var(--lv-border-strong);
  border-radius: 4px;
  background: var(--lv-bg-elevated);
}

@media (max-width: 1180px) {
  .search-status {
    width: fit-content;
  }
}

.encounter-select-sidebar {
  width: 100%;

  :deep(.el-input__wrapper) {
    background-color: transparent;
    box-shadow: none;
    border: 1px solid var(--lv-border-strong);

    &:hover,
    &.is-focus {
      border-color: var(--lv-accent);
    }
  }
}

/* ── Table Area ── */
.table-area {
  flex: 1;
  overflow: hidden;
  background: var(--lv-bg-page);
  position: relative;
}

.log-table {
  font-size: 11px;
  background: var(--lv-bg-page);
  overflow: hidden !important; /* Clip translated content at the outermost boundary */

  :deep(.el-table-v2__root) {
    background: var(--lv-bg-page);
  }

  :deep(.el-table-v2__emptyblock) {
    background: var(--lv-bg-page);
  }

  :deep(.el-table-v2__row) {
    transition: background-color 0.15s;
    background: var(--lv-bg-page);

    &:hover {
      background: var(--lv-bg-elevated) !important;
    }
  }

  :deep(.el-table-v2__header-row) {
    background: var(--lv-bg-elevated) !important;
    color: var(--lv-text-muted);
    font-weight: 600;
    border-bottom: 1px solid var(--lv-border-strong);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 10px;
  }

  :deep(.el-table-v2__header-cell) {
    background: transparent !important;
    border-right: 1px solid var(--lv-border);
    &:last-child {
      border-right: none;
    }
  }

  :deep(.el-table-v2__row-cell) {
    background: transparent !important;
    border-bottom: 1px solid var(--lv-border);
    border-right: 1px solid var(--lv-border);
    padding-right: 10px; /* 保留一些右侧呼吸空间 */
    &:last-child {
      border-right: none;
    }
  }

  :deep(.el-table-v2__header-cell:first-child),
  :deep(.el-table-v2__row-cell:first-child) {
    padding-left: 6px;
    padding-right: 6px;
  }
}

.table-empty {
  color: var(--lv-text-muted);
  font-size: 12px;
  text-align: center;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  &::before {
    content: "📭";
    font-size: 24px;
    opacity: 0.5;
  }
}

/* ── Cell styles ── */
:deep(.cell-index) {
  color: var(--lv-text-soft);
  font-size: 11px;
  user-select: none;
}

:deep(.cell-time) {
  color: var(--lv-accent);
  font-size: 11px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  background: color-mix(in srgb, var(--lv-accent) 8%, transparent);
  padding: 2px 6px;
  border-radius: 4px;
}

:deep(.cell-type) {
  color: var(--lv-type-accent);
  font-size: 11px;
  white-space: nowrap;
  font-weight: 500;
}

:deep(.cell-type-wrap) {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  min-width: 0;
  padding: 0 1px;
  cursor: context-menu;
}

:deep(.cell-type-code) {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 4.2ch;
  min-width: 4.2ch;
  padding: 1px 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--lv-type-accent) 14%, transparent);
  color: var(--lv-type-accent);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

:deep(.cell-type-name) {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: var(--lv-text);
  font-size: 10px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

:deep(.cell-delta) {
  color: var(--lv-success);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

:deep(.cell-raw) {
  word-break: normal;
  line-height: 1.35;
  font-size: 11.5px;
  white-space: pre;
  display: inline-block;
  padding: 0 2px;
  border-radius: 4px;
  transition: background 0.2s;
}

:deep(.diff-changed) {
  background-color: var(--lv-warning-soft);
  color: var(--lv-warning);
  border-radius: 2px;
}

:deep(.active-match-row) {
  background-color: color-mix(in srgb, var(--lv-warning) 22%, transparent) !important;
}

:deep(.active-match-row:hover) {
  background-color: color-mix(in srgb, var(--lv-warning) 30%, transparent) !important;
}

:deep(.search-highlight) {
  background-color: color-mix(in srgb, var(--lv-accent) 28%, transparent);
  color: var(--lv-text);
  border-radius: 2px;
}

:deep(.search-highlight-current) {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--lv-warning) 82%, white),
    color-mix(in srgb, var(--lv-warning) 65%, #fb923c)
  );
  color: #111;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(255, 214, 102, 0.65);
  font-weight: 700;
}

:deep(.diff-unchanged) {
  color: var(--lv-text-strong);
  transition: color 0.15s;
}

:deep(.diff-separator) {
  color: var(--lv-text-muted);
  transition: color 0.15s;
}

:deep(.cell-diff-empty) {
  color: var(--lv-text-soft);
  font-size: 11px;
}

:deep(.cell-diff-count) {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--lv-warning) 18%, transparent),
    color-mix(in srgb, var(--lv-warning) 10%, transparent)
  );
  color: var(--lv-warning);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lv-warning) 30%, transparent);
}

/* ── Horizontal scroll track ── */
.h-scroll-track {
  width: 100%;
  height: 14px;
  overflow-x: auto;
  overflow-y: hidden;
  background: var(--lv-bg-elevated);
  border-top: 1px solid var(--lv-border);
  flex-shrink: 0;

  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: var(--lv-bg-elevated);
  }
  &::-webkit-scrollbar-thumb {
    background-color: var(--lv-scrollbar);
    border-radius: 4px;
    &:hover {
      background-color: color-mix(in srgb, var(--lv-scrollbar) 80%, var(--lv-text-muted));
    }
  }
}

.context-menu {
  position: fixed;
  z-index: 80;
  min-width: 160px;
  overflow: hidden;
  border: 1px solid var(--lv-border-strong);
  border-radius: 10px;
  background: color-mix(in srgb, var(--lv-bg-elevated) 98%, transparent);
  box-shadow: 0 16px 40px color-mix(in srgb, var(--lv-shadow) 220%, transparent);
  backdrop-filter: blur(8px);
}

.context-menu-header {
  padding: 8px 10px 6px;
  border-bottom: 1px solid var(--lv-border);
  color: var(--lv-text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.context-menu-item {
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: var(--lv-text);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;

  &:hover {
    background: var(--lv-accent-soft);
    color: var(--lv-text);
  }

  &:disabled {
    color: var(--lv-text-soft);
    cursor: not-allowed;
  }

  &:disabled:hover {
    background: transparent;
    color: var(--lv-text-soft);
  }
}

.context-menu-item.danger:hover {
  background: color-mix(in srgb, var(--lv-danger) 12%, transparent);
  color: var(--lv-danger);
}

:deep(.log-detail-dialog .el-dialog) {
  background: var(--lv-bg-elevated);
  border: 1px solid var(--lv-border-strong);
  border-radius: 14px;
}

:deep(.log-detail-dialog .el-dialog__header) {
  margin-right: 0;
  border-bottom: 1px solid var(--lv-border);
  padding: 12px 16px;
}

:deep(.log-detail-dialog .el-dialog__title) {
  color: var(--lv-text);
  font-weight: 700;
}

:deep(.log-detail-dialog .el-dialog__body) {
  padding: 12px 16px 16px;
}

.detail-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin-bottom: 10px;
}

.detail-summary-item {
  display: flex;
  gap: 6px;
  min-width: 0;
  color: var(--lv-text);
  font-size: 11px;
}

.detail-summary-label {
  flex: 0 0 auto;
  color: var(--lv-text-muted);
  font-weight: 700;
}

.detail-raw-block {
  margin-bottom: 10px;
  padding: 8px 10px;
  border: 1px solid var(--lv-border-strong);
  border-radius: 8px;
  background: var(--lv-bg-page);
  color: var(--lv-text);
  font-size: 10px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-all;
}

.detail-table-wrap {
  max-height: 56vh;
  overflow: auto;
  border: 1px solid var(--lv-border-strong);
  border-radius: 10px;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--lv-bg-page);
  color: var(--lv-text);
  font-size: 11px;

  th,
  td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--lv-border);
    text-align: left;
    vertical-align: top;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--lv-bg-elevated);
    color: var(--lv-text-muted);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  td:first-child {
    width: 60px;
    color: var(--lv-accent-strong);
    font-variant-numeric: tabular-nums;
  }

  td:nth-child(2) {
    width: 150px;
    color: var(--lv-type-accent);
    word-break: break-word;
  }

  td:last-child {
    font-family: "JetBrains Mono", "Fira Code", "Consolas", "Menlo", monospace;
    word-break: break-all;
  }
}

@media (max-width: 900px) {
  .detail-summary {
    grid-template-columns: 1fr;
  }
}

/* ── Horizontal scroll overrides ── */
:deep(.el-table-v2__header-row),
:deep(.el-table-v2__row) {
  transform: translateX(var(--h-scroll-offset, 0px));
  width: var(--h-content-width, 100%) !important;
  min-width: 100%;
}

:deep(.el-table-v2__main),
:deep(.el-table-v2__body),
:deep(.el-table-v2__header),
:deep(.el-table-v2__header-wrapper),
:deep(.el-table-v2__row),
:deep(.el-table-v2__header-row),
:deep(.el-vl__window),
:deep(.el-vl__wrapper) {
  overflow: visible !important;
  width: var(--h-content-width, 100%) !important;
  min-width: 100%;
}
</style>
