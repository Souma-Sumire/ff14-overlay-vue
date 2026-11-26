<script setup lang="ts">
import type { MessageHandler } from "element-plus";
import type { RowVO } from "@/types/keigennRecord2";
import { onClickOutside, useElementSize } from "@vueuse/core";
import { ElEmpty, ElMessage } from "element-plus";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";
import { useLang } from "@/composables/useLang";
import { DEFAULT_JOB_SORT_ORDER } from "@/resources/jobSortOrder";
import { useKeigennRecord2Store } from "@/store/keigennRecord2";
import { copyToClipboard } from "@/utils/clipboard";
import { getCachedJobIconUrl } from "@/utils/keigennRecord2";
import Util from "@/utils/util";
import { EMPTY_IMAGE } from "@/utils/xivapi";
import AmountDetailView from "./AmountDetailView.vue";
import FilterHeader from "./FilterHeader.vue";
import SkillCooldownView from "./SkillCooldownView.vue";

const props = withDefaults(
  defineProps<{
    rows: RowVO[];
    actionKey: keyof RowVO;
    onlyDeath?: boolean;
    hideAutoAttack?: boolean;
    showHeals?: boolean;
  }>(),
  {
    onlyDeath: false,
    hideAutoAttack: false,
    showHeals: false,
  },
);

const ACTION_WIDTH_STORAGE_KEY = "keigenn-record-2-action-width";
const DEFAULT_NARROW_ACTION_WIDTH = 76;
const AUTO_ATTACK_PATTERN = /^(?:攻击|攻撃|[Aa]ttack)$/;
const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 24;
const OVERSCAN = 4;
const SCROLL_END_DELAY = 120;
const NARROW_FIXED_COLS_WIDTH = 38 + 42 + 52 + 32 + 22 + 6;
const NARROW_MIN_KEIGENNS_WIDTH = 54;

interface VisibleSlot {
  slotKey: number;
  index: number;
  top: number;
  row: RowVO;
}

function getMaxNarrowActionWidth(width: number): number {
  return width > 0
    ? Math.max(40, width - NARROW_FIXED_COLS_WIDTH - NARROW_MIN_KEIGENNS_WIDTH)
    : 250;
}

function loadSavedActionWidth(): number {
  try {
    const raw = localStorage.getItem(ACTION_WIDTH_STORAGE_KEY);
    if (!raw) return DEFAULT_NARROW_ACTION_WIDTH;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 40 && parsed <= 250) {
      return parsed;
    }
  } catch {
    // 忽略存储读取异常
  }
  return DEFAULT_NARROW_ACTION_WIDTH;
}

const { t } = useLang();

const store = useKeigennRecord2Store();
const userOptions = store.userOptions;
const contextMenu = useTemplateRef<HTMLElement>("contextMenu");
const singletonPopover = useTemplateRef<HTMLElement>("singletonPopover");
const tableContainer = useTemplateRef<HTMLElement>("tableContainer");
const scrollBodyRef = useTemplateRef<HTMLElement>("scrollBodyRef");
const { width: tableWidth, height: tableHeight } = useElementSize(tableContainer);

const isWide = computed(() => store.isBrowser && tableWidth.value >= 640);

const actionWidth = ref(loadSavedActionWidth());
const colWidths = computed(() => {
  if (isWide.value) {
    return {
      time: 48,
      action: Math.max(actionWidth.value, 112),
      target: 44,
      amount: 68,
      reduction: 44,
      skills: 28,
      keigennsMin: 140,
    };
  }
  const maxNarrowAction = getMaxNarrowActionWidth(tableWidth.value);
  return {
    time: 38,
    action: Math.min(actionWidth.value, maxNarrowAction),
    target: 42,
    amount: 52,
    reduction: 32,
    skills: 22,
    keigennsMin: NARROW_MIN_KEIGENNS_WIDTH,
  };
});

const actionFilter = ref("");
const targetFilter = ref("");

const hasColumnFilters = computed(() => Boolean(actionFilter.value || targetFilter.value));

const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuRow = ref<RowVO | null>(null);

const hoveredRow = ref<RowVO | null>(null);
const tooltipMode = ref<"amount" | "skills" | "death-recap" | "status" | null>(null);
const hoveredStatusIndex = ref<number>(-1);
const isPopoverPinned = ref(false);
const hoveredRecapStatus = ref<{
  src: string;
  name: string;
  source: string;
  duration: string;
} | null>(null);
const popoverVisible = ref(false);
const popoverStyle = ref<Record<string, string>>({ top: "0px", left: "0px", visibility: "hidden" });

function closePopover() {
  popoverVisible.value = false;
  isPopoverPinned.value = false;
  hoveredRecapStatus.value = null;
}

interface RecapRow {
  key: string;
  timeStr: string;
  hpPercent: number;
  amountStr: string;
  amountClass: string;
  actionCN: string;
  isDeath: boolean;
  isKillBlow: boolean;
  iconSrc: string;
  keigenns: {
    src: string;
    usefulClass: string;
    title: string;
    duration: string;
    isPov: boolean;
    effect: string;
  }[];
}

const ALL_STR = t("keigennRecord.cancelFilter");
const deathByTerrainText = computed(() =>
  t("keigennRecord.deathByTerrain", {
    source: t("keigennRecord.deathTerrain"),
  }),
);
const onlyThisPlayerText = computed(() => t("keigennRecord.onlyThisPlayer"));
const restoreAllText = computed(() => t("keigennRecord.restoreAll"));
const deathRecapText = computed(() => t("keigennRecord.deathRecap"));

function isAutoAttackRow(row: RowVO): boolean {
  if (row.type === "death") return false;
  return AUTO_ATTACK_PATTERN.test(row.action) || AUTO_ATTACK_PATTERN.test(row.actionCN);
}

const visibleBaseRows = computed(() => {
  const allowHeals = store.debugShowHeals || props.showHeals;
  return props.rows.filter((r) => {
    if (!allowHeals && r.effect === "heal") return false;
    if (props.onlyDeath && r.type !== "death") return false;
    if ((props.hideAutoAttack || !store.userOptions.parseAA) && isAutoAttackRow(r)) return false;
    if (!store.userOptions.parseDoT && r.type === "dot") return false;
    return true;
  });
});

const tableData = computed(() => {
  const baseRows = visibleBaseRows.value;
  const hasFilter =
    (actionFilter.value && actionFilter.value !== ALL_STR) ||
    (targetFilter.value && targetFilter.value !== ALL_STR);

  if (!hasFilter) {
    return baseRows;
  }

  return baseRows.filter((row) => {
    const actionMatch =
      !actionFilter.value ||
      actionFilter.value === ALL_STR ||
      row[props.actionKey] === actionFilter.value;
    const targetMatch =
      !targetFilter.value || targetFilter.value === ALL_STR || row.targetId === targetFilter.value;
    return actionMatch && targetMatch;
  });
});

const isPvpTable = computed(() => Boolean(props.rows[0]?.isPvP));
const bodyHeight = computed(() => Math.max(0, tableHeight.value - HEADER_HEIGHT));
const visibleCount = computed(() => Math.max(1, Math.ceil(bodyHeight.value / ROW_HEIGHT)));
const poolSize = computed(() => visibleCount.value + OVERSCAN * 2 + 1);
const totalHeight = computed(() => tableData.value.length * ROW_HEIGHT);

const renderStart = ref(0);
const renderEnd = ref(-1);
const isScrolling = ref(false);

function syncScrollRange(scrollTop?: number) {
  const len = tableData.value.length;
  if (len === 0) {
    if (renderStart.value !== 0) renderStart.value = 0;
    if (renderEnd.value !== -1) renderEnd.value = -1;
    return;
  }
  const top = scrollTop ?? scrollBodyRef.value?.scrollTop ?? 0;
  const firstVisible = Math.max(0, Math.floor(top / ROW_HEIGHT));
  const nextStart = Math.max(0, firstVisible - OVERSCAN);
  const nextEnd = Math.min(len - 1, firstVisible + visibleCount.value - 1 + OVERSCAN);
  if (nextStart !== renderStart.value) renderStart.value = nextStart;
  if (nextEnd !== renderEnd.value) renderEnd.value = nextEnd;
}

const visibleSlots = computed<VisibleSlot[]>(() => {
  const rows = tableData.value;
  if (rows.length === 0 || renderEnd.value < renderStart.value) return [];
  const pSize = poolSize.value;
  const start = Math.max(0, Math.min(renderStart.value, rows.length - 1));
  const end = Math.min(rows.length - 1, renderEnd.value, start + pSize - 1);
  const slots: VisibleSlot[] = [];
  for (let i = start; i <= end; i++) {
    slots.push({
      slotKey: i % pSize,
      index: i,
      top: i * ROW_HEIGHT,
      row: rows[i]!,
    });
  }
  // 按固定槽位键升序排列，确保 Vue 原地复用 DOM 节点而不重新排序或重建
  slots.sort((a, b) => a.slotKey - b.slotKey);
  return slots;
});

watch(
  [() => tableData.value.length, visibleCount],
  () => {
    syncScrollRange();
  },
  { immediate: true },
);

watch(
  () => props.rows,
  (rows) => {
    closePopover();
    hoveredRow.value = null;
    tooltipMode.value = null;
    hoveredStatusIndex.value = -1;
    if (rows.length === 0) {
      actionFilter.value = "";
      targetFilter.value = "";
    }
    if (scrollBodyRef.value) {
      scrollBodyRef.value.scrollTop = 0;
    }
    syncScrollRange(0);
  },
  { immediate: true },
);

const recapRows = shallowRef<RecapRow[]>([]);
const recapSummary = ref<{ target: string; overkillText: string }>({
  target: "",
  overkillText: "",
});

function updateRecapData(deathRow: RowVO) {
  const targetId = deathRow.targetId;
  const deathTime = deathRow.timestamp;
  const startTime = deathTime - 20000;

  const result: RowVO[] = [];
  const deathIndex = props.rows.indexOf(deathRow);
  if (deathIndex === -1) return;

  for (let i = deathIndex; i >= 0; i--) {
    const r = props.rows[i];
    if (!r) continue;
    if (r.timestamp <= deathTime && r.timestamp >= startTime) {
      if (r.targetId === targetId) result.push(r);
    } else if (r.timestamp < startTime && store.userOptions.order === "push") {
      break;
    }
  }

  for (let i = deathIndex + 1; i < props.rows.length; i++) {
    const r = props.rows[i];
    if (!r) continue;
    if (r.timestamp <= deathTime && r.timestamp >= startTime) {
      if (r.targetId === targetId) result.push(r);
    } else if (r.timestamp < startTime && store.userOptions.order === "unshift") {
      break;
    }
  }

  const finalResult = Array.from(new Set(result)).sort((a, b) => b.timestamp - a.timestamp);

  let overkillText = "";
  const killerRow = finalResult.find(
    (r) => r.type !== "death" && r.effect !== "heal" && r.amount > r.currentHp,
  );
  if (killerRow) {
    const overkill = killerRow.amount - killerRow.currentHp;
    const isTenThousand = t("keigennRecord.tenThousandUnit") !== "k";
    const overkillDisplay = isTenThousand
      ? overkill > 9_999
        ? `${(overkill / 10_000).toFixed(1)}${t("keigennRecord.tenThousandUnit")}`
        : overkill.toLocaleString()
      : overkill > 999
        ? `${(overkill / 1_000).toFixed(1)}k`
        : overkill.toLocaleString();
    overkillText = t("keigennRecord.overkillDiff", { amount: overkillDisplay });
  }
  recapSummary.value = {
    target: store.userOptions.anonymous ? deathRow.job : deathRow.target,
    overkillText,
  };

  recapRows.value = finalResult.map((r) => {
    const isHeal = r.effect === "heal";
    const isDeath = r.type === "death";
    const isDamage = !isHeal && r.amount > 0 && !isDeath;

    let amountPrefix = "";
    let amountClass = "";
    if (isHeal) {
      amountPrefix = "+";
      amountClass = "is-heal";
    } else if (isDamage) {
      amountPrefix = "-";
      amountClass = "is-damage";
    }
    const amountStr =
      r.amount > 0 || isHeal
        ? amountPrefix + r.preCalculated.amountDisplay
        : r.preCalculated.amountDisplay;

    return {
      key: r.key,
      timeStr: `${((r.timestamp - deathTime) / 1000).toFixed(1).replace("-0.0", "0.0")}s`,
      hpPercent: isDeath ? 0 : Math.max(0, Math.min(100, r.preCalculated.hpPercent)),
      amountStr,
      amountClass,
      actionCN: r.actionCN,
      isDeath,
      isKillBlow: killerRow?.key === r.key,
      iconSrc: "",
      keigenns: r.preCalculated.keigenns,
      rawKeigenns: r.keigenns,
    };
  });
}

const hoveredStatusInfo = computed(() => {
  if (tooltipMode.value !== "status" || !hoveredRow.value) return null;
  const idx = hoveredStatusIndex.value;
  const pre = hoveredRow.value.preCalculated.keigenns[idx];
  const raw = hoveredRow.value.keigenns[idx];
  if (!pre && !raw) return null;
  const name = raw ? (userOptions.statusCN ? raw.name : raw.effect) : (pre?.title ?? "");
  return {
    src: pre?.src ?? "",
    name,
    source: raw?.source ?? "",
    duration: pre?.duration || raw?.remainingDuration || "",
    isPov: pre?.isPov ?? raw?.isPov ?? false,
  };
});

function setRecapStatusHover(
  pre: { src: string; title: string; duration: string },
  raw?: { name: string; effect: string; source: string; remainingDuration?: string },
) {
  hoveredRecapStatus.value = {
    src: pre.src,
    name: raw ? (userOptions.statusCN ? raw.name : raw.effect) : pre.title,
    source: raw?.source ?? "",
    duration: pre.duration || raw?.remainingDuration || "",
  };
}

function positionPopover(triggerEl: HTMLElement, mode: string) {
  popoverStyle.value = {
    ...popoverStyle.value,
    visibility: "hidden",
  };

  nextTick(() => {
    if (!popoverVisible.value || !singletonPopover.value) return;

    const rect = triggerEl.getBoundingClientRect();
    const gap = 4;
    const margin = 4;
    const popoverRect = singletonPopover.value.getBoundingClientRect();
    const w = popoverRect.width;
    const h = popoverRect.height;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const placeVertical = mode === "death-recap" && rect.left < vw * 0.45;

    let left = 0;
    let top = rect.top;

    if (placeVertical) {
      left = rect.left;
      left = Math.max(margin, Math.min(left, Math.max(margin, vw - w - margin)));
      const belowTop = rect.bottom + gap;
      const aboveTop = rect.top - gap - h;
      if (belowTop + h <= vh - margin) {
        top = belowTop;
      } else if (aboveTop >= margin) {
        top = aboveTop;
      } else {
        top = Math.max(margin, Math.min(belowTop, vh - h - margin));
      }
    } else {
      left = mode === "amount" ? rect.right + gap : rect.left - gap - w;
      if (mode === "amount" && left + w > vw - margin) {
        const flippedLeft = rect.left - gap - w;
        if (flippedLeft >= margin) {
          left = flippedLeft;
        }
      } else if (mode !== "amount" && left < margin) {
        const flippedRight = rect.right + gap;
        if (flippedRight + w <= vw - margin) {
          left = flippedRight;
        }
      }
      left = Math.max(margin, Math.min(left, Math.max(margin, vw - w - margin)));

      if (top + h > vh - margin) {
        top = vh - h - margin;
      }
      top = Math.max(margin, top);
    }

    popoverStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
      visibility: "visible",
    };
  });
}

function handleHover(
  row: RowVO,
  mode: "amount" | "skills" | "death-recap" | "status",
  triggerEl: HTMLElement,
  statusIndex = -1,
) {
  if (isPopoverPinned.value) return;
  if (
    popoverVisible.value &&
    hoveredRow.value?.key === row.key &&
    tooltipMode.value === mode &&
    (mode !== "status" || hoveredStatusIndex.value === statusIndex)
  )
    return;

  tooltipMode.value = mode;
  hoveredStatusIndex.value = statusIndex;
  if (mode === "death-recap") {
    hoveredRecapStatus.value = null;
    updateRecapData(row);
  }
  hoveredRow.value = row;
  positionPopover(triggerEl, mode);
  popoverVisible.value = true;
}

function pinDeathRecap(row: RowVO, triggerEl: HTMLElement) {
  if (
    isPopoverPinned.value &&
    popoverVisible.value &&
    tooltipMode.value === "death-recap" &&
    hoveredRow.value?.key === row.key
  ) {
    closePopover();
    return;
  }
  tooltipMode.value = "death-recap";
  hoveredStatusIndex.value = -1;
  hoveredRecapStatus.value = null;
  updateRecapData(row);
  hoveredRow.value = row;
  isPopoverPinned.value = true;
  popoverVisible.value = true;
  positionPopover(triggerEl, "death-recap");
}

function applyHoverTarget(el: EventTarget | null) {
  if (isPopoverPinned.value) return;
  const element = el instanceof Element ? el : el instanceof Node ? el.parentElement : null;
  if (element?.closest(".keigenn-singleton-popover")) return;

  const trigger = element?.closest("[data-row-index][data-hover-mode]") as HTMLElement | null;
  if (trigger) {
    const rowIndex = Number(trigger.dataset.rowIndex);
    const row = Number.isInteger(rowIndex) ? tableData.value[rowIndex] : undefined;
    if (row) {
      const mode = trigger.dataset.hoverMode as "amount" | "skills" | "death-recap" | "status";
      const statusIdx =
        trigger.dataset.statusIndex !== undefined ? Number(trigger.dataset.statusIndex) : -1;
      handleHover(row, mode, trigger, statusIdx);
      return;
    }
  }

  if (popoverVisible.value) {
    popoverVisible.value = false;
  }
}

const lastMousePos = { x: 0, y: 0 };
let isPointerInsideTable = false;
let pendingMoveTarget: EventTarget | null = null;
let moveRafId = 0;
let scrollRafId = 0;
let scrollEndTimer: number | null = null;

function handleTableMouseEnter() {
  isPointerInsideTable = true;
}

function handleTableMouseLeave() {
  isPointerInsideTable = false;
  pendingMoveTarget = null;
  if (moveRafId) {
    cancelAnimationFrame(moveRafId);
    moveRafId = 0;
  }
  if (!isPopoverPinned.value && popoverVisible.value) {
    popoverVisible.value = false;
  }
}

function handleMouseMove(e: MouseEvent) {
  lastMousePos.x = e.clientX;
  lastMousePos.y = e.clientY;

  // ACT OverlayPlugin 转发无按键移动时也可能带有 buttons=1，不可据此拦截
  if (isPopoverPinned.value || isScrolling.value || isResizing.value) {
    return;
  }

  pendingMoveTarget = e.target;
  if (moveRafId) return;
  moveRafId = requestAnimationFrame(() => {
    moveRafId = 0;
    if (isPopoverPinned.value || isScrolling.value || isResizing.value) {
      return;
    }
    const target =
      pendingMoveTarget instanceof Node && pendingMoveTarget.isConnected
        ? pendingMoveTarget
        : document.elementFromPoint(lastMousePos.x, lastMousePos.y);
    applyHoverTarget(target);
  });
}

function handleBodyScroll() {
  if (contextMenuVisible.value) {
    contextMenuVisible.value = false;
  }
  if (!isPopoverPinned.value && popoverVisible.value) {
    popoverVisible.value = false;
  }
  if (!isScrolling.value) {
    isScrolling.value = true;
  }
  if (!scrollRafId) {
    scrollRafId = requestAnimationFrame(() => {
      scrollRafId = 0;
      syncScrollRange();
    });
  }
  if (scrollEndTimer !== null) {
    window.clearTimeout(scrollEndTimer);
  }
  scrollEndTimer = window.setTimeout(() => {
    scrollEndTimer = null;
    isScrolling.value = false;
    if (!isPopoverPinned.value && isPointerInsideTable) {
      nextTick(() => {
        if (isScrolling.value || isPopoverPinned.value || !isPointerInsideTable) {
          return;
        }
        const el = document.elementFromPoint(lastMousePos.x, lastMousePos.y);
        applyHoverTarget(el);
      });
    }
  }, SCROLL_END_DELAY);
}

function handleTableKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && popoverVisible.value) {
    closePopover();
  }
}

function handleWindowDismiss() {
  isPointerInsideTable = false;
  contextMenuVisible.value = false;
  closePopover();
}

onMounted(() => {
  window.addEventListener("mousemove", handleMouseMove, { passive: true });
  window.addEventListener("keydown", handleTableKeydown);
  window.addEventListener("blur", handleWindowDismiss);
  document.documentElement.addEventListener("mouseleave", handleWindowDismiss);
});

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("keydown", handleTableKeydown);
  window.removeEventListener("blur", handleWindowDismiss);
  document.documentElement.removeEventListener("mouseleave", handleWindowDismiss);
  window.removeEventListener("mousemove", handleResizeMove);
  window.removeEventListener("mouseup", handleResizeStop);
  if (moveRafId) cancelAnimationFrame(moveRafId);
  if (scrollRafId) cancelAnimationFrame(scrollRafId);
  if (scrollEndTimer !== null) window.clearTimeout(scrollEndTimer);
});

onClickOutside(contextMenu, () => {
  contextMenuVisible.value = false;
});

onClickOutside(singletonPopover, () => {
  if (isPopoverPinned.value) {
    closePopover();
  }
});

const isResizing = ref(false);
let startX = 0;
let startWidth = 0;

function handleResizeStart(e: MouseEvent) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  isResizing.value = true;
  startX = e.clientX;
  startWidth = colWidths.value.action;

  window.addEventListener("mousemove", handleResizeMove);
  window.addEventListener("mouseup", handleResizeStop);
  document.body.style.cursor = "col-resize";
}

function handleResizeMove(e: MouseEvent) {
  if (!isResizing.value) return;
  const deltaX = e.clientX - startX;
  const maxWidth = isWide.value ? 250 : getMaxNarrowActionWidth(tableWidth.value);
  const newWidth = Math.max(40, Math.min(maxWidth, startWidth + deltaX));
  actionWidth.value = newWidth;
}

function handleResizeStop() {
  if (!isResizing.value) return;
  isResizing.value = false;
  window.removeEventListener("mousemove", handleResizeMove);
  window.removeEventListener("mouseup", handleResizeStop);
  document.body.style.cursor = "";
  try {
    localStorage.setItem(ACTION_WIDTH_STORAGE_KEY, String(actionWidth.value));
  } catch {
    // 忽略存储写入异常
  }
}

const actionOptions = computed(() => {
  const filteredRows = props.rows.filter(
    (r) => store.debugShowHeals || props.showHeals || r.effect !== "heal",
  );
  const actions = [...new Set(filteredRows.map((r) => r[props.actionKey] as string))].filter(
    (v) => v !== undefined && v !== null,
  );
  return [
    { label: ALL_STR, value: "" },
    ...actions.map((action) => ({ label: action, value: action })),
  ];
});

const targetOptions = computed(() => {
  const filteredRows = props.rows.filter(
    (r) => store.debugShowHeals || props.showHeals || r.effect !== "heal",
  );
  const players = [
    ...new Map(filteredRows.filter((r) => r.targetId).map((row) => [row.targetId, row])).values(),
  ];
  const jobCount = new Map<string, number>();
  for (const p of players) {
    jobCount.set(p.job, (jobCount.get(p.job) ?? 0) + 1);
  }
  const jobSeq = new Map<string, number>();
  const sortedPlayers = [...players].sort(
    (a, b) => DEFAULT_JOB_SORT_ORDER.indexOf(a.jobEnum) - DEFAULT_JOB_SORT_ORDER.indexOf(b.jobEnum),
  );
  return [
    { label: ALL_STR, value: "", job: -1 },
    ...sortedPlayers.map((row) => {
      let fullLabel = `${row.job}(${row.target})`;
      if (store.userOptions.anonymous) {
        if ((jobCount.get(row.job) ?? 0) > 1) {
          const idx = (jobSeq.get(row.job) ?? 0) + 1;
          jobSeq.set(row.job, idx);
          fullLabel = `${row.job} #${idx}`;
        } else {
          fullLabel = row.job;
        }
      }
      return {
        label: row.job,
        fullLabel,
        value: row.targetId,
        job: row.jobEnum,
      };
    }),
  ];
});

function filterByAction() {
  if (contextMenuRow.value) {
    const val = contextMenuRow.value[props.actionKey] as string;
    actionFilter.value = actionFilter.value === val ? "" : val;
    contextMenuVisible.value = false;
  }
}

function filterByTarget() {
  if (contextMenuRow.value) {
    const val = contextMenuRow.value.targetId;
    targetFilter.value = targetFilter.value === val ? "" : val;
    contextMenuVisible.value = false;
  }
}

function clearFilters() {
  actionFilter.value = "";
  targetFilter.value = "";
}

function getDisplayJobIcon(rowData: RowVO): string {
  if (!rowData.jobIcon) return rowData.preCalculated.jobIconSrc;
  return getCachedJobIconUrl(rowData.jobIcon, store.userOptions.iconType);
}

function handleJobImgError(e: Event) {
  const img = e.target as HTMLImageElement;
  if (img.src !== EMPTY_IMAGE) {
    img.src = EMPTY_IMAGE;
  }
}

function getRowFlagText(rowData: RowVO): string {
  if (rowData.effect === "damage done" || rowData.type === "heal") return "";
  return t(`keigennRecord.${rowData.effect}`);
}

let msgHdl: MessageHandler | null = null;

function buildRowCopyText(rowData: RowVO) {
  const {
    action,
    actionCN,
    amount,
    keigenns,
    time,
    type,
    effect,
    currentHp,
    maxHp,
    shield,
    reduction,
    jobEnum,
  } = rowData;
  const sp = effect === "damage done" ? "" : `,${t(`keigennRecord.${effect}`)}`;
  const jobName = Util.jobEnumToJob(jobEnum);
  return `${time} ${t(`keigennRecord.job.${jobName}`)} ${props.actionKey === "action" ? action : actionCN} ${amount.toLocaleString()}(${t(`keigennRecord.${type}`)}) ${t(
    "keigennRecord.reduction",
  )}(${(reduction * 100).toFixed(0)}%):${
    keigenns.length === 0 && sp === ""
      ? t("keigennRecord.none")
      : keigenns.map((k) => (userOptions.statusCN ? k.name : k.effect)).join(",") + sp
  } ${t("keigennRecord.hp")}:${currentHp}(${Math.round(
    (currentHp / maxHp) * 100,
  )}%)+${t("keigennRecord.shield")}:${Math.round((maxHp * +shield) / 100)}(${shield}%)`;
}

function copyRowText(rowData: RowVO) {
  const result = buildRowCopyText(rowData);
  copyToClipboard(result)
    .then(() => {
      msgHdl?.close();
      msgHdl = ElMessage.success({
        message: t("keigennRecord.copySuccess"),
        duration: 800,
      });
    })
    .catch(() => ElMessage.error(t("keigennRecord.copyFailed")));
}

function findLastRowBeforeDeath(deathRow: RowVO) {
  let latestRow: RowVO | null = null;
  for (const row of props.rows) {
    if (row.type === "death") continue;
    if (row.targetId !== deathRow.targetId) continue;
    if (row.timestamp >= deathRow.timestamp) continue;
    if (!latestRow || row.timestamp > latestRow.timestamp) latestRow = row;
  }
  return latestRow;
}

function copyLastRowBeforeDeath(deathRow: RowVO) {
  const lastRow = findLastRowBeforeDeath(deathRow);
  if (!lastRow) {
    ElMessage.warning(t("keigennRecord.noData"));
    return;
  }
  copyRowText(lastRow);
}

function findRowByEventTarget(target: EventTarget | null): RowVO | null {
  const rowEl = (target as HTMLElement | null)?.closest("[data-row-index]") as HTMLElement | null;
  if (!rowEl) return null;
  const rowIndex = Number(rowEl.dataset.rowIndex);
  if (!Number.isInteger(rowIndex)) return null;
  return tableData.value[rowIndex] ?? null;
}

function handleBodyClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null;
  const actionEl = target?.closest("[data-action]") as HTMLElement | null;
  const rowData = findRowByEventTarget(target);
  if (!rowData) return;

  if (actionEl) {
    e.stopPropagation();
    const action = actionEl.dataset.action;
    if (action === "only-this-player") {
      targetFilter.value = targetFilter.value === rowData.targetId ? "" : rowData.targetId;
      return;
    }
    if (action === "pin-death-recap") {
      pinDeathRecap(rowData, actionEl);
      return;
    }
  }

  if (rowData.type === "death") {
    copyLastRowBeforeDeath(rowData);
    return;
  }
  copyRowText(rowData);
}

function handleBodyContextmenu(e: MouseEvent) {
  const rowData = findRowByEventTarget(e.target);
  if (!rowData) return;
  if (rowData.type === "death") {
    contextMenuVisible.value = false;
    return;
  }
  contextMenuRow.value = rowData;
  contextMenuX.value = Math.min(e.clientX, Math.max(8, window.innerWidth - 160));
  contextMenuY.value = Math.min(e.clientY, Math.max(8, window.innerHeight - 80));
  contextMenuVisible.value = true;
}

function scrollToBottom() {
  const bodyEl = scrollBodyRef.value;
  if (!bodyEl) return;
  const maxTop = Math.max(0, totalHeight.value - bodyEl.clientHeight);
  bodyEl.scrollTop = maxTop;
  syncScrollRange(maxTop);
}

const popoverScaleStyle = computed(() => {
  const baseScale =
    Number.isFinite(userOptions.scale) && userOptions.scale > 0 ? userOptions.scale : 1;
  let extraScale = 1;
  if (tooltipMode.value === "skills") {
    extraScale =
      Number.isFinite(userOptions.skillPopoverScale) && userOptions.skillPopoverScale > 0
        ? userOptions.skillPopoverScale
        : 1;
  } else if (tooltipMode.value === "amount") {
    extraScale =
      Number.isFinite(userOptions.amountPopoverScale) && userOptions.amountPopoverScale > 0
        ? userOptions.amountPopoverScale
        : 1;
  }
  const iconSizeMap = {
    matrix: userOptions.skillIconSizeMatrix,
    group: userOptions.skillIconSizeGroup,
    flat: userOptions.skillIconSizeFlat,
  };
  const rawIconSize = iconSizeMap[userOptions.skillLayout] ?? 24;
  const fallbackIconSize = userOptions.skillLayout === "matrix" ? 24 : 26;
  const iconSize = Number.isFinite(rawIconSize) && rawIconSize > 0 ? rawIconSize : fallbackIconSize;
  return {
    "--popover-scale": String(baseScale * extraScale),
    "--skill-icon-size": `${iconSize}px`,
    "--skill-icon-scale": String(iconSize / 28),
  };
});

const hoveredAmountDetail = computed(() => {
  const row = hoveredRow.value;
  if (!row || tooltipMode.value !== "amount") return null;
  return {
    source: row.source,
    targetName: userOptions.anonymous ? row.job : row.target,
    targetIndex: row.targetIndex,
    targetCount: row.targetCount,
    currentHp: row.currentHp,
    hpPercent: row.preCalculated.hpPercent,
    shield: row.shield,
    reduction: row.reduction,
    type: row.type,
    damageTypeClass: row.preCalculated.damageTypeClass,
    originalDamageDisplay: row.preCalculated.originalDamageDisplay,
  };
});

defineExpose({
  scrollToBottom,
  clearFilters,
  hasColumnFilters,
});
</script>

<template>
  <div
    ref="tableContainer"
    class="table-container"
    :class="{ 'is-scrolling': isScrolling }"
    :style="{
      '--table-width': `${tableWidth}px`,
      '--action-width': `${colWidths.action}px`,
      '--col-time-w': `${colWidths.time}px`,
      '--col-target-w': `${colWidths.target}px`,
      '--col-amount-w': `${colWidths.amount}px`,
      '--col-reduction-w': `${colWidths.reduction}px`,
      '--col-skills-w': `${colWidths.skills}px`,
      '--col-keigenns-min-w': `${colWidths.keigennsMin}px`,
    }"
    @mouseenter="handleTableMouseEnter"
    @mouseleave="handleTableMouseLeave"
  >
    <div class="table-wrapper">
      <div
        v-if="tableWidth > 0 && tableHeight > 0"
        class="keigenn-table performance-table"
        role="table"
      >
        <div class="keigenn-table-header-row keigenn-table-header" role="row">
          <div class="keigenn-header-cell col-time is-align-center" role="columnheader">
            <div class="header-static header-time">{{ t("keigennRecord.time") }}</div>
          </div>
          <div class="keigenn-header-cell col-action is-align-center" role="columnheader">
            <div class="header-action-container">
              <FilterHeader
                :model-value="actionFilter"
                :options="actionOptions"
                :placeholder="t('keigennRecord.action')"
                :width="isWide ? '6em' : '4.5em'"
                @update="(v: string) => (actionFilter = v === ALL_STR ? '' : v)"
              />
              <div
                class="resize-handle"
                :class="{ 'is-resizing': isResizing }"
                @mousedown="handleResizeStart"
              />
            </div>
          </div>
          <div class="keigenn-header-cell col-target is-align-center" role="columnheader">
            <FilterHeader
              :model-value="targetFilter"
              :options="targetOptions"
              :placeholder="t('keigennRecord.target')"
              :width="isWide ? '4.4em' : '3.4em'"
              @update="(v: string) => (targetFilter = v === ALL_STR ? '' : v)"
            />
          </div>
          <div class="keigenn-header-cell col-amount is-align-right" role="columnheader">
            <div class="header-static">{{ t("keigennRecord.amount") }}</div>
          </div>
          <div class="keigenn-header-cell col-reduction is-align-right" role="columnheader">
            <div class="header-static header-reduction">{{ t("keigennRecord.reduction") }}</div>
          </div>
          <div class="keigenn-header-cell col-keigenns is-align-left" role="columnheader">
            <div class="header-static">{{ t("keigennRecord.keigenns") }}</div>
          </div>
          <div class="keigenn-header-cell col-skills is-align-center" role="columnheader" />
        </div>

        <div
          ref="scrollBodyRef"
          class="keigenn-table-body"
          role="rowgroup"
          @scroll.passive="handleBodyScroll"
          @click="handleBodyClick"
          @contextmenu="handleBodyContextmenu"
        >
          <div
            v-if="tableData.length > 0"
            class="virtual-spacer"
            :style="{ height: `${totalHeight}px` }"
          >
            <div
              v-for="slot in visibleSlots"
              :key="slot.slotKey"
              class="keigenn-table-row"
              :class="{ 'row-death': slot.row.type === 'death' }"
              :data-row-index="slot.index"
              :style="{ transform: `translate3d(0, ${slot.top}px, 0)` }"
              role="row"
            >
              <template v-if="slot.row.type === 'death'">
                <div class="keigenn-row-cell col-time is-align-center" role="cell">
                  {{ slot.row.time }}
                </div>
                <div class="keigenn-row-cell death-row-content" role="cell">
                  <div class="death-message-left">
                    <span class="death-skull">💀</span>
                    <img
                      v-if="getDisplayJobIcon(slot.row)"
                      class="death-job-icon"
                      :src="getDisplayJobIcon(slot.row)"
                      :alt="slot.row.job"
                      decoding="async"
                      @error="handleJobImgError"
                    />
                    <span class="death-target-name">{{
                      userOptions.anonymous ? slot.row.job : slot.row.target
                    }}</span>
                    <span class="death-cause">{{
                      slot.row.source === "地形杀"
                        ? deathByTerrainText
                        : t("keigennRecord.deathBySource", { source: slot.row.source })
                    }}</span>
                  </div>
                  <div class="death-recap-right">
                    <span
                      class="only-this-player-inline"
                      :class="{ 'is-active': targetFilter === slot.row.targetId }"
                      data-action="only-this-player"
                    >
                      {{ targetFilter === slot.row.targetId ? restoreAllText : onlyThisPlayerText }}
                    </span>
                    <span
                      class="death-recap-inline"
                      :data-row-index="slot.index"
                      data-hover-mode="death-recap"
                      data-action="pin-death-recap"
                    >
                      {{ deathRecapText }}
                    </span>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="keigenn-row-cell col-time is-align-center" role="cell">
                  {{ slot.row.time }}
                </div>
                <div class="keigenn-row-cell col-action is-align-center" role="cell">
                  <span class="action-name-text">{{ String(slot.row[actionKey] ?? "") }}</span>
                </div>
                <div class="keigenn-row-cell col-target is-align-center" role="cell">
                  <div class="target">
                    <img
                      v-if="getDisplayJobIcon(slot.row)"
                      :class="[
                        store.isBrowser ? 'browser' : 'act',
                        'jobIcon',
                        `cj${userOptions.iconType}`,
                      ]"
                      :src="getDisplayJobIcon(slot.row)"
                      :alt="slot.row.jobIcon"
                      decoding="async"
                      @error="handleJobImgError"
                    />
                    <span v-else class="alt-text">{{ slot.row.job }}</span>
                    <span
                      v-if="slot.row.hasDuplicate && !userOptions.anonymous"
                      class="has-duplicate"
                    >
                      {{ store.formatterName(slot.row.target) }}
                    </span>
                  </div>
                </div>
                <div class="keigenn-row-cell col-amount is-align-right" role="cell">
                  <span class="amount" :data-row-index="slot.index" data-hover-mode="amount">
                    <span :class="slot.row.preCalculated.damageTypeClass">{{
                      slot.row.preCalculated.amountDisplay
                    }}</span>
                  </span>
                </div>
                <div class="keigenn-row-cell col-reduction is-align-right" role="cell">
                  <span
                    class="col-reduction-number"
                    :style="{ color: slot.row.preCalculated.reductionColor }"
                    >{{ (slot.row.reduction * 100).toFixed(0) }}</span
                  >
                </div>
                <div class="keigenn-row-cell col-keigenns is-align-left" role="cell">
                  <div class="status-container">
                    <span
                      v-for="(k, idx) in slot.row.preCalculated.keigenns"
                      :key="idx"
                      class="status"
                      :data-duration="k.duration"
                      :data-sourcePov="k.isPov"
                      :data-row-index="slot.index"
                      data-hover-mode="status"
                      :data-status-index="idx"
                    >
                      <img
                        :class="['statusIcon', k.usefulClass]"
                        :src="k.src"
                        :alt="k.effect"
                        decoding="async"
                        :data-tried="undefined"
                        :data-hr-fallback="undefined"
                        @error="handleImgError"
                      />
                    </span>
                    <span v-if="getRowFlagText(slot.row)" class="flags">{{
                      getRowFlagText(slot.row)
                    }}</span>
                  </div>
                </div>
                <div class="keigenn-row-cell col-skills is-align-center" role="cell">
                  <div class="col-skills-inner">
                    <div
                      v-if="!isPvpTable"
                      class="view-icon"
                      :data-row-index="slot.index"
                      data-hover-mode="skills"
                    >
                      <svg viewBox="0 0 1024 1024" width="12" height="12" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M512 896a384 384 0 1 0 0-768 384 384 0 0 0 0 768zm0 64a448 448 0 1 1 0-896 448 448 0 0 1 0 896z"
                        />
                        <path
                          fill="currentColor"
                          d="M480 256a32 32 0 0 1 32 32v256a32 32 0 0 1-64 0V288a32 32 0 0 1 32-32z"
                        />
                        <path
                          fill="currentColor"
                          d="M480 512h256q32 0 32 32t-32 32H480q-32 0-32-32t32-32z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div v-else class="keigenn-table-empty">
            <slot name="empty">
              <el-empty :description="store.isBrowser ? $t('keigennRecord.actTip') : undefined" />
            </slot>
          </div>
        </div>
      </div>
      <div
        v-if="contextMenuVisible"
        ref="contextMenu"
        class="context-menu"
        :style="{ top: `${contextMenuY}px`, left: `${contextMenuX}px` }"
      >
        <ul>
          <li @click="filterByAction">
            {{
              actionFilter === (contextMenuRow?.[actionKey] ?? "")
                ? t("keigennRecord.filter.action_cancel", {
                    actionName: contextMenuRow?.[actionKey] ?? t("keigennRecord.this_skill"),
                  })
                : t("keigennRecord.filter.action_only", {
                    actionName: contextMenuRow?.[actionKey] ?? t("keigennRecord.this_skill"),
                  })
            }}
          </li>

          <li @click="filterByTarget">
            {{
              targetFilter === contextMenuRow?.targetId
                ? t("keigennRecord.filter.target_cancel", {
                    jobName: contextMenuRow?.job ?? t("keigennRecord.this_job"),
                  })
                : t("keigennRecord.filter.target_only", {
                    jobName: contextMenuRow?.job ?? t("keigennRecord.this_job"),
                  })
            }}
          </li>
        </ul>
      </div>

      <Teleport to="body">
        <div
          v-show="popoverVisible && hoveredRow"
          ref="singletonPopover"
          class="keigenn-singleton-popover"
          :class="{ 'is-interactive': tooltipMode === 'death-recap' }"
          :style="popoverStyle"
        >
          <div class="keigenn-popover-scale" :style="popoverScaleStyle">
            <template v-if="hoveredAmountDetail && tooltipMode === 'amount'">
              <AmountDetailView :detail="hoveredAmountDetail" />
            </template>

            <template v-else-if="hoveredRow && tooltipMode === 'skills'">
              <SkillCooldownView
                :skills="hoveredRow.preCalculated.sortedSkills || []"
                :target-id="hoveredRow.targetId"
                :layout="userOptions.skillLayout"
                :anonymous="userOptions.anonymous"
                :single-in-both="userOptions.singleInBoth"
              />
            </template>

            <template v-else-if="hoveredRow && tooltipMode === 'status' && hoveredStatusInfo">
              <div class="status-popover-content">
                <img
                  v-if="hoveredStatusInfo.src"
                  :src="hoveredStatusInfo.src"
                  class="status-popover-icon"
                  @error="handleImgError"
                />
                <div class="status-popover-meta">
                  <span class="status-popover-name">{{ hoveredStatusInfo.name }}</span>
                  <span
                    v-if="hoveredStatusInfo.source || hoveredStatusInfo.duration"
                    class="status-popover-sub"
                  >
                    <template v-if="hoveredStatusInfo.source">{{
                      hoveredStatusInfo.source
                    }}</template>
                    <template v-if="hoveredStatusInfo.source && hoveredStatusInfo.duration">
                      ·
                    </template>
                    <template v-if="hoveredStatusInfo.duration"
                      >{{ hoveredStatusInfo.duration }}s</template
                    >
                  </span>
                </div>
              </div>
            </template>

            <template v-else-if="hoveredRow && tooltipMode === 'death-recap'">
              <div class="death-recap-popover">
                <div class="recap-summary-bar">
                  <span class="recap-target">{{ recapSummary.target }}</span>
                  <span class="recap-window">20s</span>
                  <span v-if="recapSummary.overkillText" class="recap-overkill-tag">{{
                    recapSummary.overkillText
                  }}</span>
                  <button
                    v-if="isPopoverPinned"
                    type="button"
                    class="recap-close-btn"
                    @click="closePopover"
                  >
                    ×
                  </button>
                </div>
                <div v-if="hoveredRecapStatus" class="recap-status-hint">
                  <img
                    v-if="hoveredRecapStatus.src"
                    :src="hoveredRecapStatus.src"
                    class="recap-status-hint-icon"
                    @error="handleImgError"
                  />
                  <span class="recap-status-hint-name">{{ hoveredRecapStatus.name }}</span>
                  <span
                    v-if="hoveredRecapStatus.source || hoveredRecapStatus.duration"
                    class="recap-status-hint-sub"
                  >
                    {{ hoveredRecapStatus.source
                    }}{{ hoveredRecapStatus.source && hoveredRecapStatus.duration ? " · " : ""
                    }}{{ hoveredRecapStatus.duration ? `${hoveredRecapStatus.duration}s` : "" }}
                  </span>
                </div>
                <div class="recap-table">
                  <div class="recap-header">
                    <span>{{ t("keigennRecord.time") }}</span>
                    <span class="align-right">HP</span>
                    <span class="align-right">{{ t("keigennRecord.amount") }}</span>
                    <span>{{ t("keigennRecord.action") }}</span>
                    <span>{{ t("keigennRecord.keigenns") }}</span>
                  </div>
                  <div
                    v-for="row in recapRows"
                    :key="row.key"
                    class="recap-row"
                    :class="{ 'is-death': row.isDeath, 'is-kill-blow': row.isKillBlow }"
                  >
                    <span class="time">{{ row.timeStr }}</span>
                    <span class="hp-cell align-right">{{
                      row.isDeath ? "0%" : `${row.hpPercent}%`
                    }}</span>
                    <span class="amount-cell align-right" :class="row.amountClass">
                      {{ row.amountStr }}
                    </span>
                    <div class="ability-cell">
                      <div class="ability-content">
                        <img
                          v-if="row.iconSrc"
                          :src="row.iconSrc"
                          class="ability-icon"
                          @error="handleImgError"
                        />
                        <span class="ability-name">{{ row.actionCN }}</span>
                      </div>
                    </div>
                    <div class="status-cell">
                      <div class="status-content">
                        <div
                          v-for="(k, idx) in row.keigenns"
                          :key="idx"
                          class="status-wrapper"
                          @mouseenter="setRecapStatusHover(k, (row as any).rawKeigenns?.[idx])"
                          @mouseleave="hoveredRecapStatus = null"
                        >
                          <div
                            class="status"
                            :data-duration="k.duration"
                            :class="{ 'is-pov': k.isPov }"
                          >
                            <img
                              :src="k.src"
                              class="status-icon"
                              :class="k.usefulClass"
                              @error="handleImgError"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped lang="scss">
.col-time {
  width: var(--col-time-w, 40px);
  min-width: var(--col-time-w, 40px);
  max-width: var(--col-time-w, 40px);
  flex: 0 0 var(--col-time-w, 40px);
  font-variant-numeric: tabular-nums;
}

.col-action {
  width: var(--action-width, 64px);
  min-width: var(--action-width, 64px);
  max-width: var(--action-width, 64px);
  flex: 0 0 var(--action-width, 64px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.keigenn-header-cell.col-action,
.keigenn-header-cell.col-target {
  padding: 0;
  overflow: visible;
}

.header-action-container {
  position: relative;
  width: 100%;
  height: 100%;
  padding-right: 8px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 20;
  background-color: transparent;

  &::after {
    content: "";
    position: absolute;
    top: 20%;
    bottom: 20%;
    left: 2px;
    width: 2px;
    background-color: var(--el-color-primary, #409eff);
    border-radius: 1px;
    opacity: 0.65;
    transition:
      opacity 0.15s,
      background-color 0.15s;
  }

  &.is-resizing::after,
  &:hover::after {
    opacity: 1;
    background-color: var(--el-color-primary-light-3, #79bbff);
  }
}

.keigenn-header-cell.col-action:hover .resize-handle::after {
  opacity: 0.9;
}

.col-target {
  width: var(--col-target-w, 42px);
  min-width: var(--col-target-w, 42px);
  max-width: var(--col-target-w, 42px);
  flex: 0 0 var(--col-target-w, 42px);
}

.col-amount {
  width: var(--col-amount-w, 52px);
  min-width: var(--col-amount-w, 52px);
  max-width: var(--col-amount-w, 52px);
  flex: 0 0 var(--col-amount-w, 52px);
  font-variant-numeric: tabular-nums;
}

.col-reduction {
  width: var(--col-reduction-w, 35px);
  min-width: var(--col-reduction-w, 35px);
  max-width: var(--col-reduction-w, 35px);
  flex: 0 0 var(--col-reduction-w, 35px);
  font-variant-numeric: tabular-nums;
}

.col-skills {
  width: var(--col-skills-w, 24px);
  min-width: var(--col-skills-w, 24px);
  max-width: var(--col-skills-w, 24px);
  flex: 0 0 var(--col-skills-w, 24px);
}

.col-keigenns {
  min-width: 0;
  flex: 1 1 0;
}

.table-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.keigenn-table {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-regular);

  * {
    box-sizing: border-box;
  }
}

.keigenn-table-header-row {
  height: 24px;
  flex-shrink: 0;
  width: 100%;
  padding-right: 6px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-fill-color-blank);
  color: var(--el-text-color-secondary);
  font-weight: 700;
  position: relative;
  z-index: 2;
}

.keigenn-header-cell {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 2px;
  overflow: hidden;
  user-select: none;

  &.is-align-center {
    text-align: center;
    justify-content: center;
  }

  &.is-align-right {
    text-align: right;
    justify-content: flex-end;
  }

  &.is-align-left {
    text-align: left;
    justify-content: flex-start;
  }

  &.col-amount {
    padding-right: 6px;
  }

  &.col-keigenns {
    padding-left: 8px;
  }
}

.keigenn-table-body {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  contain: layout paint style;
  position: relative;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(144, 147, 153, 0.35);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(144, 147, 153, 0.6);
  }
}

.virtual-spacer {
  position: relative;
  width: 100%;
  contain: layout style;
}

.table-container.is-scrolling .virtual-spacer {
  pointer-events: none;
}

.keigenn-table-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.keigenn-table-row {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 28px;
  width: 100%;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-lighter);
  contain: layout style;
  will-change: transform;

  .table-container:not(.is-scrolling) &:not(.row-death):hover {
    background-color: rgba(255, 255, 255, 0.06);
  }

  .table-container:not(.is-scrolling) &:hover .view-icon {
    opacity: 0.95;
    background-color: rgba(255, 255, 255, 0.08);
  }
}

.keigenn-row-cell {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 2px;
  overflow: hidden;

  &.is-align-center {
    text-align: center;
    justify-content: center;
  }

  &.is-align-right {
    text-align: right;
    justify-content: flex-end;
  }

  &.is-align-left {
    text-align: left;
    justify-content: flex-start;
  }

  &.col-keigenns,
  &.col-time,
  &.col-skills {
    overflow: visible;
    background-color: transparent;
  }
}

.col-skills-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 10;
}

.view-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  opacity: 0.38;
}

.amount {
  display: inline-block;
  border-bottom: 1px dashed transparent;

  &:hover {
    border-bottom-color: rgba(255, 255, 255, 0.35);
  }
}

.context-menu {
  position: fixed;
  background-color: rgb(24, 25, 28);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.55);
  border-radius: 4px;
  min-width: 140px;
  padding: 4px 0;
  font-size: 12px;
  color: var(--el-text-color-primary);
  z-index: 3000;
  user-select: none;
}

.context-menu ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.context-menu ul li {
  padding: 5px 14px;
  line-height: 1.4;
  cursor: pointer;
  white-space: nowrap;
  color: var(--el-text-color-primary);
}

.context-menu ul li:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--el-color-primary);
}

.context-menu ul li:active {
  background-color: var(--el-color-primary-dark-2);
}

.col-reduction-number {
  &::after {
    content: "%";
    font-size: 0.72em;
    margin-left: 1px;
  }
}

.header-reduction,
.header-time {
  white-space: nowrap;
}

.row-death {
  background-color: rgba(90, 14, 14, 0.36);
  box-shadow: inset 2px 0 0 #ff5252;
  cursor: pointer;

  .table-container:not(.is-scrolling) &:hover {
    background-color: rgba(110, 18, 18, 0.48);
  }

  .keigenn-row-cell {
    background-color: transparent;
  }
}

.death-row-content {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 4px 0 2px;
  overflow: hidden;
}

.action-name-text {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.death-message-left {
  flex: 1 1 auto;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #d6dbe3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  line-height: 28px;
  text-align: left;
  cursor: pointer;

  .death-job-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .death-skull {
    flex-shrink: 0;
    line-height: 1;
  }

  .death-target-name {
    color: #88c6ff;
    font-weight: 600;
    flex-shrink: 0;
  }

  .death-cause {
    color: #aeb6c2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .death-terrain {
    color: #ffe58f;
    font-weight: 600;
  }
}

.death-recap-right {
  flex-shrink: 0;
  display: inline-flex;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
  z-index: 12;
}

.only-this-player-inline,
.death-recap-inline {
  display: inline-flex;
  align-items: center;
  height: 18px;
  line-height: 16px;
  padding: 0 5px;
  font-size: 10.5px;
  font-weight: 500;
  border-radius: 0;
  white-space: nowrap;
  cursor: pointer;
}

.only-this-player-inline {
  color: #b7c0cc;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);

  &.is-active {
    color: #ffffff;
    background: rgba(64, 158, 255, 0.25);
    border-color: rgba(64, 158, 255, 0.65);
  }

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.32);
  }
}

.death-recap-inline {
  color: #ffd3d3;
  background: rgba(255, 82, 82, 0.14);
  border: 1px solid rgba(255, 82, 82, 0.38);

  &:hover {
    color: #ffffff;
    background: rgba(255, 82, 82, 0.28);
    border-color: rgba(255, 82, 82, 0.65);
  }
}

.target {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  position: relative;

  .has-duplicate {
    zoom: 0.8;
    position: absolute;
    width: auto;
    text-align: center;
    font-weight: normal;
    right: 4px;
    bottom: 0;
    text-shadow:
      -0.8px 0 0 black,
      0 0.8px 0 black,
      0.8px 0 0 black,
      0 -0.8px 0 black;
    white-space: nowrap;
  }

  .jobIcon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    vertical-align: middle;
    position: relative;

    &.cj1 {
      top: 1px;
      left: -2px;
    }

    &.cj2 {
      right: 4px;
    }

    &.cj3 {
      width: 32px;
      height: 28px;
      top: 1px;
    }

    &.cj4 {
      right: 2px;
    }
  }
}

.status-container {
  display: flex;
  flex-wrap: nowrap;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;

  .status {
    position: relative;
    top: -2px;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: flex-end;

    &::before {
      content: attr(data-duration);
      z-index: 1;
      position: absolute;
      bottom: -4px;
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      width: 100%;
      text-align: center;
      transform: scale(0.6);
      transform-origin: center bottom;
      white-space: nowrap;
      text-shadow:
        -1px -1px 0 #000,
        1px -1px 0 #000,
        -1px 1px 0 #000,
        1px 1px 0 #000;
    }

    &[data-sourcePov="true"]::before {
      color: aquamarine;
    }
  }

  .statusIcon {
    display: block;
    width: 18px;
    height: 24px;
    object-fit: contain;
    vertical-align: middle;
  }

  .flags {
    margin-left: 5px;
    font-size: 11px;
    color: #cfd6e0;
    white-space: nowrap;
    flex-shrink: 0;
  }
}

.physics {
  color: rgb(255, 100, 100);
}
.magic {
  color: rgb(100, 200, 255);
}
.darkness {
  color: rgb(255, 100, 255);
}
.is-heal {
  color: #4caf50;
}
.unuseful {
  opacity: 0.3;
}
.half-useful {
  opacity: 0.6;
}
.useful {
  opacity: 1;
}
</style>

<style lang="scss">
.keigenn-singleton-popover {
  position: fixed;
  z-index: 2000;
  pointer-events: none;
  width: max-content;
  max-width: calc(100vw - 8px);
  max-height: calc(100vh - 8px);
  overflow: hidden;

  &.is-interactive {
    pointer-events: auto;
  }

  .keigenn-popover-scale {
    display: inline-block;
    zoom: var(--popover-scale, 1);
    transform-origin: top left;
    padding: 6px 8px;
    background: rgb(24, 25, 29);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 4px;
    color: rgb(214, 219, 227);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.65);
    font-size: 12px;
    line-height: 1.25;
    font-variant-numeric: tabular-nums;
    max-width: 100%;
    max-height: calc((100vh - 12px) / var(--popover-scale, 1));
    overflow-y: auto;
    box-sizing: border-box;
  }

  .status-popover-content {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 110px;
    max-width: 240px;

    .status-popover-icon {
      width: 16px;
      height: 21px;
      object-fit: cover;
      flex-shrink: 0;
    }

    .status-popover-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .status-popover-name {
      font-size: 12px;
      font-weight: 600;
      color: #e6ebf2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-popover-sub {
      font-size: 11px;
      color: #9ba4b2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.death-recap-popover {
  display: flex;
  flex-direction: column;
  max-width: calc(100vw - 24px);

  .recap-summary-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 4px 4px;
    margin-bottom: 2px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    font-size: 11px;

    .recap-target {
      font-weight: 600;
      color: #88c6ff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    .recap-window {
      color: #8f98a6;
      font-size: 10px;
    }

    .recap-overkill-tag {
      margin-left: auto;
      font-size: 10.5px;
      font-weight: 600;
      color: #ff7878;
      white-space: nowrap;
    }

    .recap-close-btn {
      margin-left: 4px;
      padding: 0 4px;
      height: 16px;
      line-height: 14px;
      font-size: 12px;
      color: #9ba4b2;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 2px;
      cursor: pointer;

      &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.14);
      }
    }
  }

  .recap-status-hint {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 5px;
    margin-bottom: 3px;
    background: rgba(255, 255, 255, 0.05);
    border-left: 2px solid #60a5fa;
    font-size: 11px;

    .recap-status-hint-icon {
      width: 12px;
      height: 16px;
      object-fit: cover;
      flex-shrink: 0;
    }

    .recap-status-hint-name {
      color: #e6ebf2;
      font-weight: 600;
      white-space: nowrap;
    }

    .recap-status-hint-sub {
      color: #9ba4b2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .recap-table {
    display: table;
    width: auto;
    border-collapse: collapse;
  }

  .recap-header,
  .recap-row {
    display: table-row;
  }

  .recap-header > span {
    display: table-cell;
    padding: 2px 5px;
    font-weight: 600;
    font-size: 11px;
    color: #9ba4b2;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    white-space: nowrap;

    &.align-right,
    &:nth-child(1),
    &:nth-child(2),
    &:nth-child(3) {
      text-align: right;
    }
  }

  .recap-row {
    font-size: 11.5px;
    line-height: normal;
    background-color: transparent;

    & > * {
      display: table-cell;
      padding: 2px 5px;
      vertical-align: middle;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      white-space: nowrap;
    }

    &.is-kill-blow {
      background: rgba(255, 82, 82, 0.12);
    }

    &.is-death {
      background: rgba(168, 26, 26, 0.24);
    }

    &.is-death > *:first-child {
      position: relative;
    }

    &.is-death > *:first-child::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background-color: #ff5252;
    }

    .align-right {
      text-align: right;
    }

    .time {
      color: #8f98a6;
      font-variant-numeric: tabular-nums;
      font-size: 11px;
      text-align: right;
    }

    .hp-cell {
      color: #a6b0bf;
      font-variant-numeric: tabular-nums;
      font-size: 11px;
    }

    .amount-cell {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      font-size: 11px;
      text-align: right;

      &.is-heal {
        color: #4caf50;
      }

      &.is-damage {
        color: #ff6b6b;
      }
    }

    .ability-cell {
      .ability-content {
        display: flex;
        align-items: center;

        .ability-icon {
          width: 14px;
          height: 14px;
          object-fit: cover;
          margin-right: 4px;
          flex-shrink: 0;
        }

        .ability-name {
          white-space: nowrap;
          color: #7cc4ff;
          font-weight: 500;
          font-size: 11px;
          max-width: 9em;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }

    .status-cell {
      padding: 0 3px;

      .status-content {
        display: flex;
        column-gap: 0px;
        row-gap: 0px;
        flex-wrap: nowrap;
        align-items: center;
      }

      .status-wrapper {
        display: flex;
        padding: 0;
      }

      .status {
        height: 17px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;

        &::after {
          content: attr(data-duration);
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%) scale(0.7);
          transform-origin: center bottom;
          font-family:
            system-ui,
            -apple-system,
            sans-serif;
          font-size: 10px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          color: #fff;
          white-space: nowrap;
          text-align: center;
          text-shadow:
            -1px -1px 0 #000,
            1px -1px 0 #000,
            -1px 1px 0 #000,
            1px 1px 0 #000;
          z-index: 10;
          pointer-events: none;
          padding: 0;
        }

        &.is-pov::after {
          color: #69f0ae;
        }
      }

      .status-icon {
        display: block;
        width: 13px;
        height: 17px;
        object-fit: cover;
      }
    }
  }
}
</style>
