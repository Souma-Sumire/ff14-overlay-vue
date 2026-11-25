<script lang="ts" setup>
import type { ITimeline, ITimelineLine } from "@/types/timeline";
import {
  CopyDocument,
  QuestionFilled,
  Refresh,
  RefreshLeft,
  Setting,
} from "@element-plus/icons-vue";
import type { MessageBoxInputData } from "element-plus";
import { ElLoading, ElMessage, ElMessageBox } from "element-plus";

import * as LZString from "lz-string";
import moment from "moment";
import { useRouter } from "vue-router";

import { useWebSocket } from "@/composables/useWebSocket";
import { bossPhase } from "@/resources/bossPhase";
import { MapAlias, ZoneInfo } from "@/resources/zoneInfo";
import type { EditorDiagnosticItem } from "@/components/timeline/TimelineCodeEditor.vue";
import { parseTimelineWithErrors, useTimelineStore } from "@/store/timeline";
import { copyToClipboard } from "@/utils/clipboard";
import { tts } from "@/utils/tts";
import Util from "@/utils/util";
import { handleImgError } from "@/utils/xivapi";
import { addOverlayListener, callOverlayHandler } from "../../cactbot/resources/overlay_plugin_api";
import { EventMap } from "../../cactbot/types/event";
import { Job } from "../../cactbot/types/job";
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  toRef,
  watch,
} from "vue";
import { useDebounceFn, useLocalStorage, useResizeObserver } from "@vueuse/core";
import CommonThemeToggle from "@/components/common/ThemeToggle.vue";
import ZoneSelecter from "@/components/zoneSelecter.vue";
import {
  ElButton,
  ElCheckbox,
  ElDialog,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElLink,
  ElOption,
  ElPopover,
  ElRadio,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElSlider,
  ElTable,
  ElTableColumn,
  ElTooltip,
} from "element-plus";
import TimelineFflogsImport from "@/components/timeline/FflogsImport.vue";
import TimelineSettingsDialog from "@/components/timeline/SettingsDialog.vue";
import TimelineSyntaxDocs from "@/components/timeline/SyntaxDocs.vue";
import TimelineTimelineShow from "@/components/timeline/TimelineShow.vue";

const TimelineCodeEditor = defineAsyncComponent(
  () => import("@/components/timeline/TimelineCodeEditor.vue"),
);
const codeEditorRef = ref<{ focusLine: (lineNumber: number) => void } | null>(null);

function jumpToErrorLine(lineNumber: number) {
  codeEditorRef.value?.focusLine(lineNumber);
}

const router = useRouter();
const { wsConnected } = useWebSocket({ allowClose: true, addWsParam: true });

const timelineStore = useTimelineStore();
const allTimelinesRef = toRef(timelineStore, "allTimelines");
const timelineFilters = toRef(timelineStore, "filters");

const simulatedCombatTime = ref(0);

const selectedTimelines = ref<ITimeline[]>([]);
const dialogVisible = ref(false);
const showFFlogsDialog = ref(false);
const showSettings = ref(false);
const dialogTableVisible = ref(false);
const exportDialogVisible = ref(false);
const selectedExportType = ref("compressed_full");
const exportOptions = reactive({
  compressedFull: "",
  compressedZip: "",
  rawJson: "",
  rawZipJson: "",
  fileBaseName: "timelines",
  fullSize: 0,
  optimizedSize: 0,
  rawSize: 0,
});
const fileInputRef = ref<HTMLInputElement | null>(null);

const syncStatus = ref<"idle" | "syncing">("idle");
const lastSyncTime = ref<string>("");
const hasUnsyncedChanges = ref(false);
const hasSyncTimedOut = ref(false);
const SYNC_ACK_TIMEOUT_MS = 3000;
let syncAckTimeoutTimer: number | null = null;

const showSyncWarning = computed(() => hasUnsyncedChanges.value && hasSyncTimedOut.value);

const fflogsSourceRe = /^(?:a:)?\w{16,}(?:[#?]fight=(?:\d+|last))?$/;

const fullPath = computed(() => {
  const timelineUrl = router.resolve({ path: "/timeline" });
  return `${window.location.protocol}//${window.location.host}/ff14-overlay-vue/${timelineUrl.href}`;
});

const currentTimelineEditing = useLocalStorage<ITimeline>("timelineCurrentlyEditing", {
  name: "空",
  condition: { zoneID: "0", jobs: ["NONE"], phase: undefined },
  timeline: "空",
  source: "空",
  createdAt: "空",
});

const parsedTimelineLines = ref([] as ITimelineLine[]);
const editorDiagnostics = ref<EditorDiagnosticItem[]>([]);
const editorCursorTime = ref<number | null>(null);
const editorErrors = computed(() =>
  editorDiagnostics.value.filter((item) => item.severity === "error"),
);

function handleEditorDiagnostics(items: EditorDiagnosticItem[]) {
  editorDiagnostics.value = items;
}

function handleEditorCursorTime(time: number | null) {
  editorCursorTime.value = time;
}

function syncPreviewToTime(targetTime: number) {
  stopEditorPlay();
  const minTime = -timelineStore.configValues.preBattle;
  const lead = Math.max(timelineStore.configValues.discoloration, 2.5);
  const next = Math.min(maxSlider.value, Math.max(minTime, Number((targetTime - lead).toFixed(1))));
  simulatedCombatTime.value = next;
}

function syncPreviewToCursorLine() {
  if (editorCursorTime.value === null) return;
  syncPreviewToTime(editorCursorTime.value);
}

function handlePreviewSelectLine(line: ITimelineLine) {
  if (!line.lineNumber) return;
  codeEditorRef.value?.focusLine(line.lineNumber);
}

function sortTimelineLinesByTime() {
  const lines = currentTimelineEditing.value.timeline.split(/\r?\n/);
  const timeRe = /^\s*(?:#\s*)?(?<time>-?\d+(?::\d+(?:\.\d+)?|\.\d+)?)(?=\s|$)/;

  const headerLines: string[] = [];
  const entries: { time: number; index: number; lines: string[] }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const match = timeRe.exec(line);
    const parsedTime = match?.groups?.time ? parseFlexibleTime(match.groups.time) : null;
    if (parsedTime !== null) {
      entries.push({ time: parsedTime, index: i, lines: [line] });
    } else if (entries.length === 0) {
      headerLines.push(line);
    } else {
      entries[entries.length - 1]!.lines.push(line);
    }
  }

  if (entries.length <= 1) {
    ElMessage.info("无需排序");
    return;
  }

  entries.sort((a, b) => (a.time !== b.time ? a.time - b.time : a.index - b.index));
  currentTimelineEditing.value.timeline = [
    ...headerLines,
    ...entries.flatMap((entry) => entry.lines),
  ].join("\n");
  updateTransmissionTimeline(false);
  ElMessage.success(`已按时间升序整理 ${entries.length} 条记录`);
}

const isEditorPlaying = ref(false);
const editorPlaySpeed = ref<1 | 2 | 4>(1);
const editorPlaySpeedOptions = [1, 2, 4] as const;
let editorPlayRafId: number | null = null;
let editorPlayLastTs = 0;

function cycleEditorPlaySpeed() {
  const idx = editorPlaySpeedOptions.indexOf(editorPlaySpeed.value);
  editorPlaySpeed.value = editorPlaySpeedOptions[(idx + 1) % editorPlaySpeedOptions.length]!;
}

const shiftDialogVisible = ref(false);
const shiftForm = reactive({
  startTime: "",
  endTime: "",
  offsetSeconds: "",
  includeComments: true,
});

let loading: any = null;
let keepRetrying = false;

const keyword = ref("");
const selectedZoneId = ref("");
const selectedJob = ref("");
const selectedPhase = ref("");

const hasActiveFilters = computed(() =>
  Boolean(keyword.value || selectedZoneId.value || selectedJob.value || selectedPhase.value),
);

function clearFilters() {
  keyword.value = "";
  selectedZoneId.value = "";
  selectedJob.value = "";
  selectedPhase.value = "";
}

function handleSelectionChange(selection: ITimeline[]) {
  selectedTimelines.value = selection;
}

function clearSyncAckTimeout() {
  if (syncAckTimeoutTimer !== null) {
    clearTimeout(syncAckTimeoutTimer);
    syncAckTimeoutTimer = null;
  }
}

function armSyncAckTimeout() {
  clearSyncAckTimeout();
  syncAckTimeoutTimer = window.setTimeout(() => {
    if (!hasUnsyncedChanges.value) return;
    hasSyncTimedOut.value = true;
    syncStatus.value = "idle";
  }, SYNC_ACK_TIMEOUT_MS);
}

const filteredTimelines = computed(() => {
  return allTimelinesRef.value.filter((timeline) => {
    const nameMatch = timeline.name.toLowerCase().includes(keyword.value.toLowerCase());

    const zoneMatch = !selectedZoneId.value || timeline.condition.zoneID === selectedZoneId.value;

    const jobMatch =
      !selectedJob.value || timeline.condition.jobs.includes(selectedJob.value as Job);

    const phaseMatch =
      !selectedPhase.value ||
      (selectedPhase.value === "undefined"
        ? !timeline.condition.phase
        : timeline.condition.phase === selectedPhase.value);

    return nameMatch && zoneMatch && jobMatch && phaseMatch;
  });
});

const timeMinuteSecondDisplay = computed(() => {
  const time = simulatedCombatTime.value;
  const isNegative = time < 0;
  const totalSeconds = Math.abs(Math.floor(time));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${isNegative ? "-" : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
});

watch(
  () => currentTimelineEditing.value.condition.zoneID,
  (newZoneID) => {
    if (!bossPhase[newZoneID]) {
      currentTimelineEditing.value.condition.phase = undefined;
    }
  },
);

watch(selectedZoneId, (newZoneID) => {
  if (newZoneID && !bossPhase[newZoneID]) {
    selectedPhase.value = "";
  }
});

const maxSlider = ref(0);

function stopEditorPlay() {
  isEditorPlaying.value = false;
  if (editorPlayRafId !== null) {
    cancelAnimationFrame(editorPlayRafId);
    editorPlayRafId = null;
  }
}

function toggleEditorPlay() {
  if (isEditorPlaying.value) {
    stopEditorPlay();
    return;
  }
  if (simulatedCombatTime.value >= maxSlider.value) {
    simulatedCombatTime.value = -timelineStore.configValues.preBattle;
  }
  isEditorPlaying.value = true;
  editorPlayLastTs = performance.now();
  const step = (now: number) => {
    if (!isEditorPlaying.value) return;
    const dt = ((now - editorPlayLastTs) / 1000) * editorPlaySpeed.value;
    editorPlayLastTs = now;
    const next = Math.min(maxSlider.value, Number((simulatedCombatTime.value + dt).toFixed(2)));
    simulatedCombatTime.value = next;
    if (next >= maxSlider.value) {
      stopEditorPlay();
      return;
    }
    editorPlayRafId = requestAnimationFrame(step);
  };
  editorPlayRafId = requestAnimationFrame(step);
}

function resetEditorPlayTime() {
  stopEditorPlay();
  simulatedCombatTime.value = -timelineStore.configValues.preBattle;
}

function editTimeline(timeline: ITimeline): void {
  stopEditorPlay();
  currentTimelineEditing.value = timeline;
  prevEditingJobs = [...timeline.condition.jobs];
  dialogVisible.value = true;
  updateTransmissionTimeline(true);
}

function closeDialog() {
  stopEditorPlay();
  dialogVisible.value = false;
}

function createNewTimeline(): void {
  editTimeline(timelineStore.allTimelines[timelineStore.newTimeline()]!);
}

function updateTransmissionTimeline(resetSlider = false) {
  parseTimelineWithErrors(currentTimelineEditing.value.timeline).then(({ lines }) => {
    parsedTimelineLines.value = lines;
    const maxTime = Math.max(...parsedTimelineLines.value.map((v) => v.time), 550);
    maxSlider.value = maxTime + 30;
    if (resetSlider) {
      simulatedCombatTime.value = -timelineStore.configValues.preBattle;
    } else if (simulatedCombatTime.value > maxSlider.value) {
      simulatedCombatTime.value = maxSlider.value;
    }
  });
}

function parseFlexibleTime(raw: string): number | null {
  const trimmed = raw.trim().replace("：", ":");
  if (!trimmed) return null;
  const mmss = trimmed.match(/^(?<neg>-)?(?<mm>\d+):(?<ss>\d+(?:\.\d+)?)$/);
  if (mmss) {
    const sign = mmss.groups?.neg ? -1 : 1;
    const mins = Number(mmss.groups?.mm ?? 0);
    const secs = Number(mmss.groups?.ss ?? 0);
    return sign * (mins * 60 + secs);
  }
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function formatShiftedTime(seconds: number, useMinuteSecond: boolean): string {
  const rounded = Math.round(seconds * 10) / 10;
  if (!useMinuteSecond) {
    return rounded.toFixed(1);
  }
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const mins = Math.floor(abs / 60);
  const secs = abs - mins * 60;
  const secStr = secs < 10 ? `0${secs.toFixed(1)}` : secs.toFixed(1);
  return `${sign}${String(mins).padStart(2, "0")}:${secStr}`;
}

function openShiftDialog() {
  shiftForm.offsetSeconds = "";
  shiftDialogVisible.value = true;
}

function applyTimelineTimeShift() {
  const offset = Number(shiftForm.offsetSeconds.trim());
  if (!Number.isFinite(offset) || offset === 0) {
    ElMessage.warning("请输入非零的偏移秒数（例如 -1.5 或 2）");
    return;
  }
  const start = parseFlexibleTime(shiftForm.startTime);
  if (shiftForm.startTime.trim() && start === null) {
    ElMessage.warning("起始时间格式无效，请输入秒数或 分:秒");
    return;
  }
  const end = parseFlexibleTime(shiftForm.endTime);
  if (shiftForm.endTime.trim() && end === null) {
    ElMessage.warning("结束时间格式无效，请输入秒数或 分:秒");
    return;
  }
  if (start !== null && end !== null && start > end) {
    ElMessage.warning("起始时间不能大于结束时间");
    return;
  }

  let changedCount = 0;
  const timeLineRe = /^(\s*)(#\s*)?(-?\d+(?::\d+(?:\.\d+)?|\.\d+)?)(?=\s)/;
  const lines = currentTimelineEditing.value.timeline.split(/\r?\n/);
  const updated = lines.map((line) => {
    const match = timeLineRe.exec(line);
    if (!match) return line;
    const isComment = Boolean(match[2]);
    if (isComment && !shiftForm.includeComments) return line;
    const rawTime = match[3]!;
    const currentSec = parseFlexibleTime(rawTime);
    if (currentSec === null) return line;
    if (start !== null && currentSec < start) return line;
    if (end !== null && currentSec > end) return line;
    const nextTime = formatShiftedTime(currentSec + offset, rawTime.includes(":"));
    changedCount++;
    return `${match[1] ?? ""}${match[2] ?? ""}${nextTime}${line.slice(match[0].length)}`;
  });

  if (changedCount === 0) {
    ElMessage.info("指定时间段内没有可偏移的时间轴行");
    return;
  }

  currentTimelineEditing.value.timeline = updated.join("\n");
  updateTransmissionTimeline(false);
  shiftDialogVisible.value = false;
  ElMessage.success(`已偏移 ${changedCount} 行（${offset > 0 ? "+" : ""}${offset}s）`);
}

function previewRowTts(text: string) {
  if (!text) return;
  tts(text);
}

function getJobIconSrc(job: Job): string {
  if (!job || job === "NONE") return "";
  const full = Util.jobToFullName(job.toUpperCase() as Job);
  if (!full?.en) return "";
  return `https://souma.diemoe.net/resources/img/cj2/${full.en}.png`;
}

let prevEditingJobs: Job[] = [];

const JOB_TAG_GAP = 6;
const JOB_TAG_ARROW_RESERVE = 22;
const JOB_TAG_INDICATOR_RESERVE = 52;

const jobsSelectRef = ref<InstanceType<typeof ElSelect> | null>(null);
const maxJobTags = ref(1);
let tagMeasureCtx: CanvasRenderingContext2D | null = null;

function measureTextWidth(text: string, font: string) {
  tagMeasureCtx ??= document.createElement("canvas").getContext("2d");
  if (!tagMeasureCtx) return text.length * 12;
  tagMeasureCtx.font = font;
  return tagMeasureCtx.measureText(text).width;
}

// 按选择框实际宽度决定折叠前能放下几个职业标签，避免宽选择框里只显示一个标签
function updateMaxJobTags() {
  const root = jobsSelectRef.value?.$el as HTMLElement | null | undefined;
  const selection = root?.querySelector<HTMLElement>(".el-select__selection");
  const jobs = currentTimelineEditing.value.condition.jobs;
  const firstJob = jobs[0];
  if (!selection || !firstJob) {
    maxJobTags.value = 1;
    return;
  }

  const firstTag = selection.querySelector<HTMLElement>(".el-tag");
  const style = getComputedStyle(firstTag ?? selection);
  const font = `${style.fontSize} ${style.fontFamily}`;
  const baseTextWidth = measureTextWidth(getLabel(firstJob), font);
  const baseTagWidth = firstTag?.offsetWidth ?? baseTextWidth + 38;
  const tagWidths = jobs.map(
    (job) => baseTagWidth + measureTextWidth(getLabel(job), font) - baseTextWidth,
  );

  const fitCount = (limit: number) => {
    let used = 0;
    let count = 0;
    for (const width of tagWidths) {
      used += width + JOB_TAG_GAP;
      if (used > limit) break;
      count += 1;
    }
    return count;
  };

  const available = selection.clientWidth - JOB_TAG_ARROW_RESERVE;
  if (fitCount(available) === jobs.length) {
    maxJobTags.value = jobs.length;
    return;
  }
  maxJobTags.value = Math.max(1, fitCount(available - JOB_TAG_INDICATOR_RESERVE));
}

useResizeObserver(
  () => jobsSelectRef.value?.$el as HTMLElement | null | undefined,
  () => updateMaxJobTags(),
);

watch(
  () => currentTimelineEditing.value.condition.jobs,
  () => nextTick(updateMaxJobTags),
  { deep: true },
);

function handleEditingJobsChange(nextJobs: Job[]) {
  if (nextJobs.includes("NONE") && nextJobs.length > 1) {
    if (!prevEditingJobs.includes("NONE")) {
      currentTimelineEditing.value.condition.jobs = ["NONE"];
    } else {
      currentTimelineEditing.value.condition.jobs = nextJobs.filter((j) => j !== "NONE");
    }
  }
  prevEditingJobs = [...currentTimelineEditing.value.condition.jobs];
}

function getFflogsReportUrl(source: string): string {
  return `https://cn.fflogs.com/reports/${source.replace("#", "?")}&type=damage-done`;
}

function copyFflogsLink(source: string) {
  copyToClipboardWithMsg(getFflogsReportUrl(source), "FF Logs 链接已复制", "复制失败，请手动复制");
}

const updateTransmissionTimelineDebounced = useDebounceFn(() => {
  updateTransmissionTimeline(false);
}, 250);

watch(
  () => currentTimelineEditing.value.timeline,
  () => {
    if (dialogVisible.value) {
      updateTransmissionTimelineDebounced();
    }
  },
);

function timelineTimeFormat() {
  currentTimelineEditing.value.timeline = currentTimelineEditing.value.timeline.replaceAll(
    /(?<=^(?:#\s*)?)(\d+(?::\d+(?:\.\d{1,2})?|(?:\.\d+)?))/gm,
    (match) => {
      return match.includes(":")
        ? moment.duration(`00:${match}`).as("seconds").toFixed(1)
        : moment.utc(Number(match) * 1000).format("mm:ss.S");
    },
  );
  updateTransmissionTimeline(false);
}

function deleteTimeline(target: ITimeline): void {
  ElMessageBox.confirm(`确定要删除「${target.name}」吗？`, "删除时间轴", {
    confirmButtonText: "确认删除",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      allTimelinesRef.value.splice(
        allTimelinesRef.value.findIndex((v) => v === target),
        1,
      );
    })
    .catch(() => {});
}

function copyTimeline(target: ITimeline): void {
  const newTimeline = JSON.parse(JSON.stringify(target));
  newTimeline.name = `${newTimeline.name} - 副本`;
  newTimeline.createdAt = new Date().toLocaleString();
  allTimelinesRef.value.push(newTimeline);
  timelineStore.sortTimelines();
  ElMessage.success(`已制作「${target.name}」的副本`);
}

function batchDeleteTimelines() {
  if (selectedTimelines.value.length === 0) {
    ElMessage.warning("请选择要删除的时间轴");
    return;
  }
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedTimelines.value.length} 个时间轴吗？`,
    "批量删除",
    {
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
      type: "warning",
    },
  )
    .then(() => {
      const selectedIds = new Set(selectedTimelines.value);
      timelineStore.allTimelines = timelineStore.allTimelines.filter((v) => !selectedIds.has(v));
      selectedTimelines.value = [];
      ElMessage.success("批量删除成功");
    })
    .catch(() => {});
}

function batchClearTimelines(): void {
  ElMessageBox.confirm("确定要清空所有时间轴吗？此操作不可逆！", "危险操作", {
    confirmButtonText: "确定清空",
    cancelButtonText: "取消",
    confirmButtonClass: "el-button--danger",
    type: "error",
  })
    .then(() => {
      ElMessageBox.prompt('输入 "我确认清空" 以执行此操作', "二次确认", {
        confirmButtonText: "确定清空",
        cancelButtonText: "取消",
        inputPattern: /^我确认清空$/,
        inputErrorMessage: "请输入正确的确认文字",
        type: "warning",
      }).then(() => {
        timelineStore.allTimelines = [];
        selectedTimelines.value = [];
        ElMessage.success("已清空所有时间轴");
      });
    })
    .catch(() => {});
}

function batchExportTimelines() {
  if (selectedTimelines.value.length === 0) {
    ElMessage.warning("请选择要导出的时间轴");
    return;
  }

  exportTimelines(selectedTimelines.value);
}

function exportTimelines(timelineArr: ITimeline[]) {
  const isSingle = timelineArr.length === 1;
  const exportTarget = isSingle ? timelineArr[0] : timelineArr;

  const fullJson = JSON.stringify(exportTarget);
  const rawJson = JSON.stringify(exportTarget, null, 2);

  // 处理去注释版本
  let zipTarget;
  if (isSingle) {
    zipTarget = JSON.parse(fullJson);
    zipTarget.timeline = zipTarget.timeline.replace(/^#.*(?:\n|$)/gm, "");
  } else {
    zipTarget = JSON.parse(fullJson);
    for (const timeline of zipTarget) {
      timeline.timeline = timeline.timeline.replace(/^#.*(?:\n|$)/gm, "");
    }
  }
  const zippedJson = JSON.stringify(zipTarget);
  const safeName = isSingle
    ? (timelineArr[0]?.name || "timeline").replace(/[\\/:*?"<>|]/g, "_").trim() || "timeline"
    : `timelines-${moment().format("YYYYMMDD-HHmm")}`;

  exportOptions.compressedFull = LZString.compressToBase64(fullJson);
  exportOptions.compressedZip = LZString.compressToBase64(zippedJson);
  exportOptions.rawJson = rawJson;
  exportOptions.rawZipJson = JSON.stringify(zipTarget, null, 2);
  exportOptions.fileBaseName = safeName;
  exportOptions.fullSize = exportOptions.compressedFull.length;
  exportOptions.optimizedSize = exportOptions.compressedZip.length;
  exportOptions.rawSize = rawJson.length;

  selectedExportType.value = "compressed_full";
  exportDialogVisible.value = true;
}

function confirmExport() {
  let finalContent = "";
  if (selectedExportType.value === "compressed_full") finalContent = exportOptions.compressedFull;
  else if (selectedExportType.value === "compressed_zip")
    finalContent = exportOptions.compressedZip;
  else finalContent = exportOptions.rawJson;

  copyToClipboardWithMsg(finalContent, "数据复制成功，已写入剪切板。", "复制失败，请手动复制！");
  exportDialogVisible.value = false;
}

function downloadExportJson() {
  const jsonContent =
    selectedExportType.value === "compressed_zip"
      ? exportOptions.rawZipJson
      : exportOptions.rawJson;
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${exportOptions.fileBaseName}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  ElMessage.success(`已导出文件 ${exportOptions.fileBaseName}.json`);
  exportDialogVisible.value = false;
}

function parseImportedTimelineText(value: string): ITimeline[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list.every((item) => item && typeof item === "object" && "timeline" in item)
      ? list
      : null;
  } catch {
    const lines = value.split("\n").filter((line) => line.trim() !== "");
    let results: ITimeline[] = [];
    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        results = [...results, ...(Array.isArray(d) ? d : [d])];
      } catch {
        try {
          const decompressed = LZString.decompressFromBase64(line);
          if (decompressed) {
            const d = JSON.parse(decompressed);
            results = [...results, ...(Array.isArray(d) ? d : [d])];
          }
        } catch {
          // 跳过无法解析的行
        }
      }
    }
    return results.length > 0 ? results : null;
  }
}

function confirmAndSaveImportedTimelines(allParsedData: ITimeline[]) {
  const timelineCount = allParsedData.length;
  const titles = allParsedData.map((timeline) => `「${timeline.name}」`).join(", ");

  ElMessageBox.confirm(`确定要导入这 ${timelineCount} 个时间轴吗？\n${titles}`, "二次确认", {
    confirmButtonText: "确定导入",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      saveImportedTimelines(allParsedData);
    })
    .catch(() => {});
}

function triggerImportFile() {
  fileInputRef.value?.click();
}

async function handleImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = parseImportedTimelineText(text.trim());
    if (!parsed) {
      ElMessage.error("无法从该文件解析出有效的时间轴数据，请确认文件格式为导出的 JSON 或压缩文本");
      return;
    }
    confirmAndSaveImportedTimelines(parsed);
  } catch {
    ElMessage.error("读取文件失败，请重试");
  }
}

function importTimelineData(): void {
  ElMessageBox.prompt("请输入导出的字符串（支持单行、多行 JSON 或压缩格式）", "导入时间轴", {
    confirmButtonText: "解析",
    cancelButtonText: "取消",
    inputType: "textarea",
    inputValidator: (value) => {
      const data = parseImportedTimelineText(value);
      if (!data) {
        return "无法解析任何有效的时间轴数据，请确保输入格式正确。";
      }
      return true;
    },
    inputErrorMessage: "无效的输入",
  })
    .then((res) => {
      const { value } = res as MessageBoxInputData;
      const allParsedData = parseImportedTimelineText(value);
      if (!allParsedData) return;
      confirmAndSaveImportedTimelines(allParsedData);
    })
    .catch(() => {});
}

function saveImportedTimelines(parsedData: ITimeline[]): void {
  const buildTimelineIdentity = (timeline: ITimeline) =>
    JSON.stringify({
      name: timeline.name,
      condition: timeline.condition,
      timeline: timeline.timeline,
      source: timeline.source,
      createdAt: timeline.createdAt,
    });

  timelineStore.allTimelines.push(...parsedData);
  timelineStore.sortTimelines();

  for (const timeline of timelineStore.allTimelines) {
    timelineStore.normalizeTimeline(timeline);
  }

  // 追加操作

  const uniqueTimelines: ITimeline[] = [];
  const seen = new Set();

  for (const timeline of timelineStore.allTimelines) {
    const timelineString = buildTimelineIdentity(timeline);

    if (!seen.has(timelineString)) {
      seen.add(timelineString);
      uniqueTimelines.push(timeline);
    }
  }
  const removedCount = timelineStore.allTimelines.length - uniqueTimelines.length;

  timelineStore.allTimelines = uniqueTimelines;

  ElMessage({
    message: `追加成功！共导入 ${parsedData.length} 个时间轴${
      removedCount > 0 ? `，但其中 ${removedCount} 个重复，已自动移除。` : ""
    }`,
    type: "success",
    duration: 3000,
  });

  if (parsedData.length === 1) {
    const importedIdentity = buildTimelineIdentity(parsedData[0]!);
    const importedTimeline = timelineStore.allTimelines.find(
      (timeline) => buildTimelineIdentity(timeline) === importedIdentity,
    );
    if (importedTimeline) editTimeline(importedTimeline);
  }
}

function sendBroadcastData(type: "get" | "post", data: any = {}) {
  callOverlayHandler({
    call: "broadcast",
    source: "soumaTimelineSettings",
    msg: {
      type,
      data,
    },
  });
}

function requestACTTimelineData() {
  const timelineUrl = router.resolve({ path: "/timeline" });
  const fullPath = `${window.location.protocol}//${window.location.host}/ff14-overlay-vue/${timelineUrl.href}`;

  keepRetrying = true;
  loading = ElLoading.service({
    lock: true,
    text: `正在请求数据，请确保 ACT 中已添加并启用此悬浮窗：${fullPath}`,
    background: "rgba(0, 0, 0, 0.7)",
  });

  sendBroadcastData("get");

  setTimeout(() => {
    if (keepRetrying) {
      ElMessage.info("重新尝试获取数据...");
      requestACTTimelineData();
    }
  }, 5000);
}

const handleBroadcastMessage: EventMap["BroadcastMessage"] = (e) => {
  if (e.source !== "soumaTimeline") return;
  const msg = e.msg as { type: string; data?: any };
  if (msg.type === "post") {
    // 得到 timeline 中储存的数据（仅在网页无数据时才会触发）
    keepRetrying = false;
    loading.close();

    const data = (e.msg as { data: typeof timelineStore.$state }).data;

    for (const v of data.allTimelines) {
      timelineStore.normalizeTimeline(v);
    }

    timelineStore.allTimelines = data.allTimelines;
    timelineStore.configValues = data.configValues;
    timelineStore.showStyle = data.showStyle;
    timelineStore.saveTimelineSettings();

    ElMessage.closeAll();
    ElMessage({
      message: "数据获取成功",
      type: "success",
      duration: 3000,
    });
  } else if (msg.type === "success") {
    // timeline 回报 数据同步成功
    clearSyncAckTimeout();
    hasUnsyncedChanges.value = false;
    hasSyncTimedOut.value = false;
    syncStatus.value = "idle";
    lastSyncTime.value = new Date().toLocaleTimeString();
  } else if (msg.type === "hello") {
    // timeline 主动告知 上线
    syncData();
  }
};

function openDocs() {
  const href = "https://docs.qq.com/sheet/DTWxKT3lFbmpDV3Fm?tab=5ovrc8";
  window.open(href, "_blank");
}

const showSyntaxDrawer = ref(false);

function openMarkdown() {
  showSyntaxDrawer.value = true;
}

function openMitigationGenerator() {
  const href = router.resolve({ path: "/mitigationGenerator" }).href;
  window.open(href, "_blank");
}

function openHealerBook() {
  window.open("https://xivhealer.cn/", "_blank", "noopener,noreferrer");
}

function fflogsImportClick() {
  showFFlogsDialog.value = true;
}

function saveSettingsChanges(settings: typeof timelineStore) {
  timelineStore.configValues = settings.configValues;
  timelineStore.showStyle = settings.showStyle;
}

function copyToClipboardWithMsg(text: string, successMsg = "复制成功", errorMsg = "复制失败") {
  copyToClipboard(text)
    .then(() => ElMessage.success(successMsg))
    .catch(() => ElMessage.error(errorMsg));
}

function tableRowClassName({ row }: { row: ITimeline }) {
  return dialogVisible.value && row === currentTimelineEditing.value ? "editing-row" : "";
}

function removeCommentsInTimeline() {
  ElMessageBox.confirm("要删除所有的注释行，仅保留必要的时间轴数据吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "info",
  })
    .then(() => {
      currentTimelineEditing.value.timeline = currentTimelineEditing.value.timeline.replace(
        /^#.*(?:\n|$)/gm,
        "",
      );
      ElMessage.success("完成");
      updateTransmissionTimeline(false);
    })
    .catch(() => {});
}

function showTimelineTableDialog() {
  dialogTableVisible.value = true;
}

// function loadRecommendedTimeline() {
//   saveImportedTimelines(recommendedTimeline as ITimeline[], false)
// }

function syncData() {
  hasUnsyncedChanges.value = true;
  hasSyncTimedOut.value = false;
  syncStatus.value = "syncing";
  armSyncAckTimeout();
  sendBroadcastData("post", timelineStore.$state);
}

function getMapName(zoneId: number) {
  const names = ZoneInfo[zoneId]?.name;
  if (!names) {
    return "未知地图";
  }
  const alias = MapAlias[zoneId as keyof typeof MapAlias];
  return (alias ? `[${alias}] ` : "") + (names.cn || `${names.ja} / ${names.en}`);
}

function getLabel(job: Job) {
  return (Util.jobToFullName(job.toUpperCase() as Job)?.cn ?? job).replace("冒险者", "全部职业");
}

onMounted(() => {
  addOverlayListener("BroadcastMessage", handleBroadcastMessage);

  const unwatch = watch(wsConnected, (val) => {
    if (val) {
      if (timelineStore.allTimelines.length === 0) {
        requestACTTimelineData();
      }
      unwatch();
    }
  });

  // 语法破坏性改动
  timelineStore.allTimelines.forEach(
    (v) =>
      (v.timeline = v.timeline.replaceAll(/^(?<a>.+), once: true(?<b>.+)$/gm, "$<a>$<b> once")),
  );

  const syncDataDebounced = useDebounceFn(() => {
    syncData();
  }, 500);

  watch(
    [() => timelineStore.allTimelines, () => timelineStore.settings, () => timelineStore.filters],
    () => {
      timelineStore.saveTimelineSettings();
    },
    { deep: true },
  );

  watch(
    [
      () => timelineStore.allTimelines,
      () => timelineStore.configValues,
      () => timelineStore.showStyle,
    ],
    () => {
      if (!showSettings.value) {
        timelineStore.saveTimelineSettings();
      }
      syncDataDebounced();
    },
    { deep: true },
  );
});

onUnmounted(() => {
  clearSyncAckTimeout();
  stopEditorPlay();
});

function init(): void {
  timelineStore.loadTimelineSettings();
  timelineStore.sortTimelines();
}

init();
</script>

<template>
  <div class="page-shell">
    <header class="page-header">
      <div class="header-title-group">
        <h1 class="page-title">时间轴管理</h1>
        <span class="timeline-count">共 {{ allTimelinesRef.length }} 条</span>
      </div>

      <div class="header-status-group">
        <el-popover
          placement="bottom-end"
          title="同步未生效"
          :width="280"
          trigger="hover"
          :disabled="!showSyncWarning"
        >
          <template #reference>
            <div
              class="connection-status"
              :class="{ connected: wsConnected, warning: showSyncWarning }"
            >
              <span class="dot" />
              <span class="status-text">
                <template v-if="showSyncWarning">改动暂未同步（未收到确认）</template>
                <template v-else>{{ wsConnected ? "WS 已连接" : "WS 未连接" }}</template>
              </span>
              <span v-if="lastSyncTime && !showSyncWarning" class="sync-time">
                · 同步于 {{ lastSyncTime }}
              </span>
              <el-icon v-if="syncStatus === 'syncing'" class="is-loading sync-spinner">
                <Refresh />
              </el-icon>
            </div>
          </template>
          <div class="sync-popover-body">
            同步请求已超时（{{ SYNC_ACK_TIMEOUT_MS / 1000 }}
            秒未收到时间轴确认）。请确保已在 ACT 中启用
            <el-link type="danger" :href="fullPath" target="_blank" class="sync-popover-link">
              时间轴悬浮窗
            </el-link>
            ，改动才能实时推送到悬浮窗。
          </div>
        </el-popover>

        <el-button :icon="Setting" size="default" @click="showSettings = true">
          参数设置
        </el-button>
        <CommonThemeToggle class="header-theme-toggle" storage-key="timeline-settings-theme" />
      </div>
    </header>

    <section class="action-bar" aria-label="时间轴操作">
      <div class="primary-actions">
        <el-button type="primary" @click="fflogsImportClick">从 FFlogs 生成</el-button>
        <el-button @click="createNewTimeline">手动编写</el-button>
        <el-button @click="importTimelineData">导入字符串</el-button>
        <el-button @click="triggerImportFile">导入文件</el-button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json,.txt,application/json,text/plain"
          style="display: none"
          @change="handleImportFileChange"
        />
        <el-button
          :disabled="allTimelinesRef.length === 0"
          @click="exportTimelines(allTimelinesRef)"
        >
          导出全部
        </el-button>
      </div>
      <nav class="external-links" aria-label="相关工具与文档">
        <el-button @click="openDocs">在线文档</el-button>
        <el-button @click="openMitigationGenerator">减伤规划器</el-button>
        <el-button @click="openHealerBook">HealerBook</el-button>
        <el-button @click="openMarkdown">时间轴语法</el-button>
      </nav>
    </section>

    <main class="main-content">
      <template v-if="allTimelinesRef.length > 0">
        <div class="filter-bar">
          <div class="filter-controls">
            <el-input
              v-model="keyword"
              placeholder="搜索名称..."
              clearable
              size="default"
              class="filter-input"
            />
            <ZoneSelecter
              v-model:select-zone="selectedZoneId"
              placeholder="筛选地图"
              size="default"
              width="200px"
              :clearable="true"
            />
            <el-select
              v-model="selectedPhase"
              placeholder="筛选阶段"
              clearable
              size="default"
              class="filter-phase"
            >
              <el-option label="全部" value="" />
              <el-option label="门神" value="door" />
              <el-option label="本体" value="final" />
              <el-option label="无设定" value="undefined" />
            </el-select>
            <el-select
              v-model="selectedJob"
              placeholder="筛选职业"
              clearable
              size="default"
              class="filter-job"
            >
              <el-option label="全部职业" value="" />
              <el-option
                v-for="job in timelineStore.jobList"
                :key="job"
                :label="getLabel(job)"
                :value="job"
              >
                <span class="job-option-item">
                  <img
                    v-if="getJobIconSrc(job)"
                    :src="getJobIconSrc(job)"
                    :alt="getLabel(job)"
                    class="job-option-icon"
                    @error="handleImgError"
                  />
                  <span>{{ getLabel(job) }}</span>
                </span>
              </el-option>
            </el-select>
            <el-button v-if="hasActiveFilters" size="default" @click="clearFilters">
              重置筛选
            </el-button>
          </div>

          <div class="batch-actions">
            <span v-if="hasActiveFilters" class="filter-summary">
              匹配 {{ filteredTimelines.length }} / {{ allTimelinesRef.length }}
            </span>
            <template v-if="selectedTimelines.length > 0">
              <span class="selection-summary">已选 {{ selectedTimelines.length }} 项</span>
              <el-button type="primary" plain size="small" @click="batchExportTimelines">
                批量导出
              </el-button>
              <el-button type="danger" plain size="small" @click="batchDeleteTimelines">
                批量删除
              </el-button>
            </template>
            <el-button type="danger" plain size="small" @click="batchClearTimelines">
              清空列表
            </el-button>
          </div>
        </div>

        <el-table
          :data="filteredTimelines"
          :row-class-name="tableRowClassName"
          class="timeline-table"
          :default-sort="{ prop: 'condition', order: 'ascending' }"
          @selection-change="handleSelectionChange"
          @row-dblclick="editTimeline"
        >
          <el-table-column type="selection" width="44" align="center" />
          <el-table-column
            prop="name"
            label="名称"
            min-width="140"
            sortable
            :show-overflow-tooltip="true"
          />
          <el-table-column
            label="地图"
            sortable
            prop="condition"
            min-width="180"
            :show-overflow-tooltip="true"
          >
            <template #default="scope">
              {{ getMapName(scope.row.condition.zoneID) }}
            </template>
          </el-table-column>
          <el-table-column prop="condition" label="阶段" width="68">
            <template #default="scope">
              <span class="phase-cell">
                {{
                  scope.row.condition.phase === "door"
                    ? "门神"
                    : scope.row.condition.phase === "final"
                      ? "本体"
                      : "—"
                }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="condition" label="适用职业" min-width="200">
            <template #header>
              <span class="label-with-tip">
                <span>适用职业</span>
                <el-tooltip
                  content="自动检测当前职业需在 ACT 中启用 CactbotOverlay.dll"
                  placement="top"
                >
                  <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </span>
            </template>
            <template #default="scope">
              <span class="table-jobs-cell">
                <template v-for="(job, idx) in scope.row.condition.jobs" :key="job">
                  <span class="table-job-chip">
                    <img
                      v-if="getJobIconSrc(job)"
                      :src="getJobIconSrc(job)"
                      :alt="getLabel(job)"
                      class="job-option-icon"
                      @error="handleImgError"
                    />
                    <span>{{ getLabel(job) }}</span>
                    <span v-if="idx < scope.row.condition.jobs.length - 1">、</span>
                  </span>
                </template>
              </span>
            </template>
          </el-table-column>
          <!-- @vue-generic {ITimeline} -->
          <el-table-column label="操作" width="188" align="right" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button type="primary" size="small" @click="editTimeline(row)">编辑</el-button>
                <el-button size="small" @click="copyTimeline(row)">复制</el-button>
                <el-button type="danger" plain size="small" @click="deleteTimeline(row)">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <section v-else class="empty-state">
        <p class="empty-title">暂无时间轴</p>
        <p class="empty-desc">可以从 FFlogs 战斗记录一键生成，或手动编写、粘贴分享字符串导入。</p>
        <div class="empty-actions">
          <el-button type="primary" @click="fflogsImportClick">从 FFlogs 生成</el-button>
          <el-button @click="createNewTimeline">手动编写</el-button>
          <el-button @click="importTimelineData">导入字符串</el-button>
        </div>
      </section>
    </main>

    <el-dialog
      v-model="dialogTableVisible"
      title="时间轴解析结果"
      align-center
      draggable
      width="min(960px, 92vw)"
    >
      <el-table :data="parsedTimelineLines" max-height="60vh" class="debug-table">
        <el-table-column property="time" label="time" width="84">
          <template #default="{ row }">
            <span class="mono-num">{{ row.time }}</span>
          </template>
        </el-table-column>
        <el-table-column property="action" label="action" min-width="160">
          <template #default="{ row }">
            {{ row.action.replaceAll(/(^['"“”]|['"“”]$)/g, "") }}
          </template>
        </el-table-column>
        <el-table-column property="sync" label="sync" min-width="220" :show-overflow-tooltip="true">
          <template #default="{ row }">
            <span class="mono-text">{{ row.sync ? row.sync : "—" }}</span>
          </template>
        </el-table-column>
        <el-table-column property="syncOnce" label="once" width="72" align="center">
          <template #default="{ row }">
            {{ row.syncOnce ? "是" : "—" }}
          </template>
        </el-table-column>
        <el-table-column label="window" width="110">
          <template #default="{ row }">
            <span class="mono-num">
              {{ row.sync ? `${row.windowBefore}, ${row.windowAfter}` : "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column property="jump" label="jump" width="88">
          <template #default="{ row }">
            <span class="mono-num">{{ row.jump ? row.jump : "—" }}</span>
          </template>
        </el-table-column>
        <el-table-column property="tts" label="tts" min-width="180">
          <template #default="{ row }">
            <div v-if="row.tts" class="tts-cell">
              <span class="tts-text">{{ row.tts }}</span>
              <el-button size="small" @click="previewRowTts(row.tts)">试听</el-button>
            </div>
            <span v-else>—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-drawer
      v-model="showSyntaxDrawer"
      title="时间轴语法"
      size="min(760px, 94vw)"
      class="syntax-drawer"
    >
      <TimelineSyntaxDocs />
    </el-drawer>

    <timeline-settings-dialog v-model="showSettings" @save="saveSettingsChanges" />

    <el-dialog
      v-model="showFFlogsDialog"
      title="从 FFlogs 生成时间轴"
      width="min(760px, 92vw)"
      align-center
      :before-close="() => (showFFlogsDialog = false)"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
    >
      <timeline-fflogs-import
        :filters="timelineFilters"
        @show-f-flogs-toggle="() => (showFFlogsDialog = false)"
        @edit-timeline="editTimeline"
      />
    </el-dialog>

    <el-dialog
      v-model="dialogVisible"
      title="编辑时间轴"
      align-center
      destroy-on-close
      :before-close="closeDialog"
      class="timeline-dialog"
      width="min(1120px, 94vw)"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="editor-dialog-content">
        <el-form :model="currentTimelineEditing" label-position="top" class="meta-form">
          <div class="meta-grid">
            <el-form-item label="名称" class="meta-name">
              <el-input v-model="currentTimelineEditing.name" placeholder="请输入时间轴名称" />
            </el-form-item>

            <el-form-item label="来源" class="meta-source">
              <div class="source-container">
                <div
                  v-if="fflogsSourceRe.test(currentTimelineEditing.source)"
                  class="source-fflogs-box"
                >
                  <img
                    class="site-logo"
                    src="https://assets.rpglogs.cn/img/ff/favicon.png?v=4"
                    alt="FF Logs"
                  />
                  <span
                    class="source-code"
                    :title="getFflogsReportUrl(currentTimelineEditing.source)"
                  >
                    {{ currentTimelineEditing.source }}
                  </span>
                  <el-button
                    size="small"
                    :icon="CopyDocument"
                    class="source-copy-btn"
                    @click="copyFflogsLink(currentTimelineEditing.source)"
                  >
                    复制
                  </el-button>
                </div>
                <el-input
                  v-else
                  :value="`${currentTimelineEditing.source}${currentTimelineEditing.createdAt ? `（${currentTimelineEditing.createdAt}）` : ''}`"
                  disabled
                />
              </div>
            </el-form-item>

            <el-form-item
              label="适用地图"
              :class="
                bossPhase[currentTimelineEditing.condition.zoneID]
                  ? 'meta-zone-with-phase'
                  : 'meta-zone'
              "
            >
              <ZoneSelecter
                v-model:select-zone="currentTimelineEditing.condition.zoneID"
                size="default"
                width="100%"
              />
            </el-form-item>

            <el-form-item
              v-if="bossPhase[currentTimelineEditing.condition.zoneID]"
              label="阶段"
              class="meta-phase"
            >
              <el-radio-group v-model="currentTimelineEditing.condition.phase" size="default">
                <el-radio-button value="door">门神</el-radio-button>
                <el-radio-button value="final">本体</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item
              :class="
                bossPhase[currentTimelineEditing.condition.zoneID]
                  ? 'meta-jobs-with-phase'
                  : 'meta-jobs'
              "
            >
              <template #label>
                <span class="label-with-tip">
                  <span>适用职业</span>
                  <el-tooltip
                    content="自动检测当前职业需在 ACT 中启用 CactbotOverlay.dll"
                    placement="top"
                  >
                    <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-select
                ref="jobsSelectRef"
                v-model="currentTimelineEditing.condition.jobs"
                multiple
                collapse-tags
                collapse-tags-tooltip
                :max-collapse-tags="maxJobTags"
                style="width: 100%"
                placeholder="选择适用职业"
                @change="handleEditingJobsChange"
              >
                <el-option
                  v-for="job in timelineStore.jobList"
                  :key="job"
                  :label="getLabel(job)"
                  :value="job"
                >
                  <span class="job-option-item">
                    <img
                      v-if="getJobIconSrc(job)"
                      :src="getJobIconSrc(job)"
                      :alt="getLabel(job)"
                      class="job-option-icon"
                      @error="handleImgError"
                    />
                    <span>{{ getLabel(job) }}</span>
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
          </div>
        </el-form>

        <div class="timeline-scrub-bar">
          <span class="scrub-label">模拟进度</span>
          <el-slider
            v-model="simulatedCombatTime"
            class="scrub-slider"
            :min="-timelineStore.configValues.preBattle"
            :max="maxSlider"
            :step="0.1"
            size="small"
            @input="stopEditorPlay"
          />
          <div class="scrub-controls">
            <span class="preview-clock">
              {{ timeMinuteSecondDisplay }} ({{ simulatedCombatTime.toFixed(1) }}s)
            </span>
            <button
              type="button"
              class="transport-btn"
              :class="isEditorPlaying ? 'transport-pause' : 'transport-play'"
              :title="isEditorPlaying ? '暂停预览' : '播放预览'"
              :aria-label="isEditorPlaying ? '暂停预览' : '播放预览'"
              @click="toggleEditorPlay"
            >
              <svg v-if="!isEditorPlaying" viewBox="0 0 24 24" class="transport-svg">
                <polygon points="6,4 20,12 6,20" fill="currentColor" />
              </svg>
              <svg v-else viewBox="0 0 24 24" class="transport-svg">
                <rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor" />
                <rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              class="transport-btn transport-reset"
              title="复位到起点"
              aria-label="复位到起点"
              @click="resetEditorPlayTime"
            >
              <el-icon :size="19"><RefreshLeft /></el-icon>
            </button>
            <button
              type="button"
              class="transport-speed"
              :title="`当前播放倍速 ${editorPlaySpeed}x，点击切换`"
              :aria-label="`播放倍速 ${editorPlaySpeed}x`"
              @click="cycleEditorPlaySpeed"
            >
              {{ editorPlaySpeed }}x
            </button>
          </div>
        </div>

        <div class="editor-workspace">
          <div class="editor-pane">
            <div class="pane-header">
              <span class="pane-title">时间轴文本</span>
              <div class="pane-status">
                <el-popover
                  v-if="editorErrors.length > 0"
                  placement="bottom-end"
                  title="语法解析告警"
                  :width="360"
                  trigger="click"
                >
                  <template #reference>
                    <el-button type="danger" plain size="small">
                      {{ editorErrors.length }} 处语法错误
                    </el-button>
                  </template>
                  <ul class="parse-error-list">
                    <li
                      v-for="(err, idx) in editorErrors"
                      :key="`${err.lineNumber}-${idx}`"
                      class="parse-error-item"
                      @click="jumpToErrorLine(err.lineNumber)"
                    >
                      <strong>第 {{ err.lineNumber }} 行：</strong>{{ err.message }}
                    </li>
                  </ul>
                </el-popover>
              </div>
            </div>
            <div class="timeline-code-editor-wrap">
              <TimelineCodeEditor
                ref="codeEditorRef"
                v-model="currentTimelineEditing.timeline"
                :jobs="currentTimelineEditing.condition.jobs"
                placeholder='请键入时间轴文本，例如：10 "<圣光幕帘>~"（输入 < 补全技能，Ctrl+/ 注释，Alt+Enter 定位预览）'
                @change="updateTransmissionTimeline(false)"
                @diagnostics="handleEditorDiagnostics"
                @cursor-time="handleEditorCursorTime"
                @sync-preview="syncPreviewToTime"
              />
            </div>
          </div>

          <div class="preview-pane">
            <div class="pane-header">
              <span class="pane-title">悬浮窗预览</span>
              <el-button
                size="small"
                :disabled="editorCursorTime === null"
                title="将预览进度定位到当前光标所在行的时间（快捷键 Alt+Enter）"
                @click="syncPreviewToCursorLine"
              >
                定位到光标行
              </el-button>
            </div>
            <div class="preview-canvas">
              <timeline-timeline-show
                :config="timelineStore.configValues"
                :lines="parsedTimelineLines"
                :runtime="simulatedCombatTime"
                :show-style="timelineStore.showStyle"
                interactive
                @select-line="handlePreviewSelectLine"
              />
            </div>
          </div>
        </div>

        <div class="editor-footer">
          <div class="editor-tools">
            <el-button size="small" @click="openShiftDialog">时间段偏移</el-button>
            <el-button size="small" @click="sortTimelineLinesByTime">按时间排序</el-button>
            <el-button size="small" @click="timelineTimeFormat()">切换时间格式</el-button>
            <el-button size="small" @click="removeCommentsInTimeline()">去除注释行</el-button>
            <el-button size="small" @click="showTimelineTableDialog">解析调试</el-button>
            <el-button size="small" @click="openMarkdown">时间轴语法指南</el-button>
          </div>
          <div class="editor-primary-actions">
            <el-button @click="exportTimelines([currentTimelineEditing])">导出此轴</el-button>
            <el-button type="primary" @click="closeDialog">完成</el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="shiftDialogVisible" title="按时间段偏移" width="420px" append-to-body>
      <el-form label-position="top" class="shift-form" @submit.prevent="applyTimelineTimeShift">
        <div class="shift-range-row">
          <el-form-item label="起始时间（留空不限）">
            <el-input v-model="shiftForm.startTime" placeholder="如 120 或 02:00" clearable />
          </el-form-item>
          <el-form-item label="结束时间（留空不限）">
            <el-input v-model="shiftForm.endTime" placeholder="如 300 或 05:00" clearable />
          </el-form-item>
        </div>
        <el-form-item label="偏移秒数（正数延后，负数提前）">
          <el-input
            v-model="shiftForm.offsetSeconds"
            placeholder="例如 -1.5 或 2"
            @keyup.enter="applyTimelineTimeShift"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="shiftForm.includeComments">同时偏移注释行（# 开头）</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="shiftDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="applyTimelineTimeShift">应用偏移</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="exportDialogVisible" title="导出时间轴" width="420px" append-to-body>
      <div class="export-dialog-tip">请选择导出格式和压缩方案：</div>
      <el-radio-group v-model="selectedExportType" class="export-radio-group">
        <el-radio value="compressed_full" border>
          <span>完整压缩版</span>
          <span class="export-size-info">{{ exportOptions.fullSize }} 字节 · 保留注释</span>
        </el-radio>
        <el-radio value="compressed_zip" border>
          <span>优化压缩版</span>
          <span class="export-size-info">{{ exportOptions.optimizedSize }} 字节 · 去除注释</span>
        </el-radio>
        <el-radio value="raw_json" border>
          <span>原始 JSON 版</span>
          <span class="export-size-info">{{ exportOptions.rawSize }} 字节 · 未压缩</span>
        </el-radio>
      </el-radio-group>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="exportDialogVisible = false">取消</el-button>
          <el-button @click="downloadExportJson">下载 JSON 文件</el-button>
          <el-button type="primary" @click="confirmExport">复制到剪贴板</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
:global(html),
:global(body) {
  margin: 0;
  min-height: 100%;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.page-shell {
  max-width: 1320px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 32px 48px;
  box-sizing: border-box;
  font-family:
    "PingFang SC",
    "Microsoft YaHei",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.header-title-group {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--el-text-color-primary);
}

.timeline-count {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.header-status-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  :deep(.header-theme-toggle) {
    width: 32px;
    height: 32px;
    border-radius: 4px;
  }
}

.connection-status {
  display: inline-flex;
  align-items: center;
  height: 32px;
  box-sizing: border-box;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 0 12px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--el-color-info);
    margin-right: 7px;
    flex-shrink: 0;
    transition: background-color 0.2s ease;
  }

  &.connected {
    color: var(--el-text-color-regular);

    .dot {
      background: var(--el-color-success);
    }
  }

  &.warning {
    color: var(--el-color-danger);
    border-color: var(--el-color-danger-light-7);
    background: var(--el-color-danger-light-9);

    .dot {
      background: var(--el-color-danger);
    }
  }

  .status-text {
    font-weight: 500;
  }

  .sync-time {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    margin-left: 4px;
    color: var(--el-text-color-secondary);
  }

  .sync-spinner {
    margin-left: 6px;
  }
}

.sync-popover-body {
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
}

.sync-popover-link {
  vertical-align: baseline;
  font-weight: 600;
  text-decoration: underline;
}

.label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tip-icon {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  cursor: help;
  transition: color 0.16s ease;

  &:hover {
    color: var(--el-text-color-regular);
  }
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  padding: 20px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.primary-actions,
.external-links,
.batch-actions,
.row-actions,
.empty-actions,
.editor-tools,
.editor-primary-actions {
  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.primary-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.external-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.main-content {
  padding-top: 20px;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-input {
  width: 200px;
}

.filter-phase {
  width: 120px;
}

.filter-job {
  width: 160px;
}

.batch-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-summary,
.selection-summary {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
  margin-right: 4px;
}

.timeline-table {
  width: 100%;
  border-top: 1px solid var(--el-border-color-lighter);

  :deep(.el-table__row) {
    cursor: pointer;
  }
}

.tts-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tts-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-option-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.job-option-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
}

.table-jobs-cell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 2px;
}

.table-job-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.syntax-drawer {
  :deep(.el-drawer__body) {
    padding: 8px 24px 40px;
    overflow-y: auto;
  }
}

.scrub-controls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.transport-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    transform 0.12s ease;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &:active {
    transform: scale(0.94);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
  }
}

.transport-svg {
  width: 19px;
  height: 19px;
}

.transport-play {
  color: #409eff;
}

.transport-pause {
  color: #e6a23c;
}

.transport-reset {
  color: #0ea5e9;
}

.transport-speed {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  min-width: 34px;
  padding: 0 6px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    color 0.16s ease,
    background-color 0.16s ease;

  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
    background-color: var(--el-fill-color-light);
  }
}

.pane-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.parse-error-list {
  margin: 0;
  padding-left: 16px;
  max-height: 240px;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular);

  li + li {
    margin-top: 4px;
  }
}

.parse-error-item {
  cursor: pointer;
  border-radius: 3px;
  padding: 2px 4px;

  &:hover {
    background-color: var(--el-fill-color-light);
    color: var(--el-color-danger);
  }
}

.shift-range-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.phase-cell {
  color: var(--el-text-color-regular);
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

:deep(.editing-row > td.el-table__cell) {
  background-color: var(--el-color-primary-light-9) !important;
  font-weight: 600;
}

.empty-state {
  padding: 64px 20px;
  text-align: center;
}

.empty-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.empty-desc {
  margin: 0 auto 24px;
  max-width: 440px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.empty-actions {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.editor-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px 16px;

  :deep(.el-form-item) {
    margin-bottom: 0;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-regular);
    line-height: 1.4;
  }
}

.meta-name {
  grid-column: span 8;
}

.meta-source {
  grid-column: span 4;
}

.meta-zone {
  grid-column: span 7;
}

.meta-zone-with-phase {
  grid-column: span 5;
}

.meta-phase {
  grid-column: span 3;
}

.meta-jobs {
  grid-column: span 5;
}

.meta-jobs-with-phase {
  grid-column: span 4;
}

.timeline-scrub-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.scrub-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.scrub-slider {
  flex: 1;
}

.source-container {
  display: flex;
  align-items: center;
  height: 32px;
  width: 100%;
}

.source-fflogs-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px 0 8px;
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  height: 32px;
  width: 100%;
  box-sizing: border-box;

  .site-logo {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .source-code {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-regular);
  }

  .source-copy-btn {
    flex-shrink: 0;
  }
}

.editor-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, max-content);
  gap: 16px;
}

.editor-pane,
.preview-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 24px;
  margin-bottom: 8px;
}

.pane-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.preview-clock {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--el-color-primary);
  white-space: nowrap;
}

.timeline-code-editor-wrap {
  height: clamp(320px, 46vh, 480px);
  min-width: 0;
}

.preview-canvas {
  height: clamp(320px, 46vh, 480px);
  max-width: 420px;
  padding: 10px;
  box-sizing: border-box;
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: auto;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.editor-tools,
.editor-primary-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.mono-num,
.mono-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.export-dialog-tip {
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.export-radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
  width: 100%;

  :deep(.el-radio) {
    margin-right: 0;
    height: auto;
    padding: 10px 14px;
    display: flex;
    align-items: center;

    .el-radio__label {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
  }
}

.export-size-info {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

@media (max-width: 900px) {
  .page-shell {
    padding: 16px 16px 36px;
  }

  .meta-name,
  .meta-source,
  .meta-zone,
  .meta-zone-with-phase,
  .meta-phase,
  .meta-jobs,
  .meta-jobs-with-phase {
    grid-column: span 12;
  }

  .editor-workspace {
    grid-template-columns: 1fr;
  }

  .timeline-code-editor-wrap {
    height: 260px;
  }

  .preview-canvas {
    height: 240px;
    max-width: none;
  }
}
</style>
