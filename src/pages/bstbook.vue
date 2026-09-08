<script setup lang="ts">
import type { MessageBoxInputData } from "element-plus";
import { completeIcon } from "@/resources/logic/status";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useDark, useStorage } from "@vueuse/core";
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElRadio,
  ElRadioButton,
  ElRadioGroup,
  ElSlider,
  ElTooltip,
} from "element-plus";
import beastbookData from "@/assets/data/beastbook.json";
import beastConstants from "@/assets/data/beastbookConstants.json";
import BeastMapDialog from "@/components/beastbook/BeastMapDialog.vue";

if (typeof window !== "undefined") {
  const savedTheme = window.localStorage.getItem("bstbook-theme");
  if (savedTheme !== "light" && savedTheme !== "dark") {
    window.localStorage.setItem("bstbook-theme", "light");
  }
}

useDark({
  storageKey: "bstbook-theme",
  initialValue: "light",
});

const ALL_TAXONOMIES: readonly string[] = beastConstants.taxonomies;
const ALL_ATTACK_TYPES: readonly string[] = beastConstants.attackTypes;
const ALL_BORROW_ACTIONS: readonly string[] = beastConstants.borrowActions;
const OVERWORLD_HABITATS: readonly string[] = beastConstants.overworldHabitats;
const DUNGEON_HABITATS: readonly string[] = beastConstants.dungeonHabitats;
const ALL_RANGES: readonly string[] = beastConstants.ranges;

const ALL_CAPTURE_STATUS = ["已拥有", "未拥有"] as const;

const beastSizeCmdDetail = `<b>/驯兽尺寸 魔兽的名字 尺寸</b><br/>
（别名：/beastsize, /beastpetsize）<br/>
变更自身召唤出的魔兽的尺寸（仅自身生效）。<br/>
<br/>
<b>尺寸选项：</b>大 / 中 / 小<br/>
<b>示例：</b><br/>
/驯兽尺寸 库西 中 （将库西变为“中”）<br/>
/驯兽尺寸 全部 小 （所有魔兽全部变为“小”）`;

const bestiaryCmdDetail = `<b>/魔兽图鉴</b><br/>
（别名：/bestiary, /bstbook）<br/>
打开游戏内魔兽图鉴窗口。`;

export interface BeastCoord {
  x: number;
  y: number;
}

export interface BeastHabitatItem {
  Summary: string;
  Type: "overworld" | "dungeon" | "special";
  MapId?: number;
  Coords?: BeastCoord;
  CoordsList?: BeastCoord[];
  CoordsNote?: string;
  Level?: string;
  MobName?: string;
  IsSubstitute?: boolean;
  Tag?: "FATE" | "理符" | "行会令";
  EventName?: string;
}

export interface BeastEntry {
  Number: number;
  Name: string;
  Level?: string;
  Taxonomy: string;
  AutoAttackType: string;
  BorrowName: string;
  BorrowIcon?: number;
  BorrowDescription?: string;
  ReleaseName: string;
  ReleaseDescription: string;
  ReleaseRange: string;
  ReleaseIcon?: number;
  OrderName: string;
  OrderDescription: string;
  OrderRange: string;
  OrderIcon?: number;
  HabitatSummary?: string;
  HabitatType?: string;
  Habitat: string;
  MapId?: number;
  Habitats?: BeastHabitatItem[];
  Icon?: number;
  Substitutes?: string[];
  SubstituteHabitats?: BeastHabitatItem[];
}

export interface BeastDisplay extends Omit<
  BeastEntry,
  "Icon" | "ReleaseIcon" | "OrderIcon" | "BorrowIcon"
> {
  IconUrl: string;
  LargeIconUrl: string;
  ReleaseIconUrl: string;
  OrderIconUrl: string;
  BorrowIconUrl: string;
}

const CDN_SOURCES = ["cafemaker.wakingsands.com", "xivapi.com", "souma.diemoe.net"] as const;

const activeCdn = useStorage<string>("bstbook-active-cdn", CDN_SOURCES[0]);

function getCdnPrefix(host: string): string {
  if (host.startsWith("http://") || host.startsWith("https://") || host.startsWith("//")) {
    return host;
  }
  if (host === "souma.diemoe.net") {
    return "https://souma.diemoe.net";
  }
  return `//${host}`;
}

function makeIconUrl(id?: number, hr = false, customHost?: string): string {
  if (!id) return "";
  const suffix = hr ? "_hr1.png" : ".png";
  const host = customHost || activeCdn.value || CDN_SOURCES[0];
  return `${getCdnPrefix(host)}/i/${completeIcon(id)}${suffix}`;
}

function recordCdnSuccess(url: string): void {
  for (const host of CDN_SOURCES) {
    if (url.includes(host)) {
      if (activeCdn.value !== host) {
        activeCdn.value = host;
      }
      break;
    }
  }
}

function handleIconLoad(e: Event): void {
  const img = e.target as HTMLImageElement;
  const src = img.currentSrc || img.src;
  if (src) {
    recordCdnSuccess(src);
  }
}

const beasts: BeastEntry[] = (beastbookData as BeastEntry[]).sort((a, b) => a.Number - b.Number);

function preloadImages(): void {
  for (const b of beasts) {
    if (b.Icon) {
      const url = makeIconUrl(b.Icon, false);
      const img = new Image();
      img.onload = () => recordCdnSuccess(img.src);
      img.onerror = () => {
        const hrUrl = makeIconUrl(b.Icon, true);
        const hrImg = new Image();
        hrImg.onload = () => recordCdnSuccess(hrImg.src);
        hrImg.onerror = () => {
          if (activeCdn.value === "souma.diemoe.net") {
            activeCdn.value = CDN_SOURCES[0];
          }
          const currentHost = CDN_SOURCES.find((h) => url.includes(h));
          if (currentHost) {
            const currentIndex = CDN_SOURCES.indexOf(currentHost);
            const nextHost = CDN_SOURCES[(currentIndex + 1) % CDN_SOURCES.length];
            const nextUrl = makeIconUrl(b.Icon, false, nextHost);
            const retryImg = new Image();
            retryImg.onload = () => recordCdnSuccess(retryImg.src);
            retryImg.src = nextUrl;
          }
        };
        hrImg.src = hrUrl;
      };
      img.src = url;
    }
  }

  const commonIcons = [
    3923, 3906, 3907, 3908, 3909, 3926, 3927, 3928, 3929, 3930, 3931, 3932, 3933,
  ];
  for (const id of commonIcons) {
    const url = makeIconUrl(id, false);
    const img = new Image();
    img.onload = () => recordCdnSuccess(img.src);
    img.src = url;
  }
}

onMounted(() => {
  preloadImages();
});

const PAGE_SIZE = 25;
const TOTAL_SLOTS = computed(() => beasts.length);

const page = useStorage("bstbook-page", 1);
const searchStr = ref("");
const captured = useStorage("bstbook-captured", {} as Record<string, boolean>);
const editingMode = ref(false);
const grayCaptured = useStorage("bstbook-grayCaptured", false);
const selectedBeastNumber = useStorage("bstbook-selectedNumber", 1);

const selectedTaxonomies = ref<string[]>([...ALL_TAXONOMIES]);
const selectedAttackTypes = ref<string[]>([...ALL_ATTACK_TYPES]);
const selectedBorrowActions = ref<string[]>([...ALL_BORROW_ACTIONS]);
type HabitatTypeFilter = "all" | "overworld" | "dungeon";
const selectedHabitatType = ref<HabitatTypeFilter>("all");
const selectedOverworldHabitat = ref<string>("all");
const selectedDungeonHabitat = ref<string>("all");
const selectedReleaseRanges = ref<string[]>([...ALL_RANGES]);
const selectedOrderRanges = ref<string[]>([...ALL_RANGES]);
const selectedCaptureStatus = ref<string[]>([...ALL_CAPTURE_STATUS]);

type SortType = "default" | "level";
const sortType = useStorage<SortType>("bstbook-sortType", "default");
const selectedLevelRange = ref<[number, number]>([1, 50]);

function parseBeastLevelRange(levelStr?: string): [number, number] {
  if (!levelStr || levelStr.trim() === "-") return [0, 0];
  const nums = levelStr.match(/\d+/g)?.map(Number);
  if (!nums || nums.length === 0) return [0, 0];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return [min, max];
}

function getBeastSortLevel(b: BeastEntry): number {
  if (!b.Level || b.Level.trim() === "-") return 0;
  const [min] = parseBeastLevelRange(b.Level);
  return min;
}

function isBeastLevelMatched(v: BeastEntry, range: [number, number]): boolean {
  const [selMin, selMax] = range;
  if (selMin <= 1 && selMax >= 50) return true;
  if (!v.Level || v.Level.trim() === "-") return true;

  if (v.Habitats && v.Habitats.length > 0) {
    return v.Habitats.some((h) => {
      const targetLevel = h.Level ?? v.Level;
      const [min, max] = parseBeastLevelRange(targetLevel);
      return max >= selMin && min <= selMax;
    });
  }

  const [bMin, bMax] = parseBeastLevelRange(v.Level);
  return bMax >= selMin && bMin <= selMax;
}

function getShortName(name: string): string {
  return name.replace(/种$/, "");
}

function formatSlotLevel(level?: string): string {
  if (!level || level.trim() === "-") return "";
  if (level.includes("/")) {
    const [min, max] = parseBeastLevelRange(level);
    if (min > 0 && max > 0) {
      return `${min}~${max}`;
    }
  }
  return level;
}

function formatTooltipDesc(desc?: string): string {
  if (!desc) return "暂无技能说明";
  return desc.replaceAll("\n", "<br/>");
}

watch(searchStr, () => {
  nextTick(() => {
    page.value = 1;
  });
});

watch(
  [
    selectedTaxonomies,
    selectedAttackTypes,
    selectedBorrowActions,
    selectedHabitatType,
    selectedOverworldHabitat,
    selectedDungeonHabitat,
    selectedReleaseRanges,
    selectedOrderRanges,
    selectedCaptureStatus,
    selectedLevelRange,
    sortType,
  ],
  () => {
    nextTick(() => {
      page.value = 1;
    });
  },
);
// function toRoman(num: number): string {
//   const lookup: [number, string][] = [
//     [50, "L"],
//     [40, "XL"],
//     [10, "X"],
//     [9, "IX"],
//     [5, "V"],
//     [4, "IV"],
//     [1, "I"],
//   ];
//   let roman = "";
//   let n = num;
//   for (const [val, sym] of lookup) {
//     while (n >= val) {
//       roman += sym;
//       n -= val;
//     }
//   }
//   return roman || num.toString();
// }

function isBeastMatched(v: BeastEntry): boolean {
  if (!isBeastLevelMatched(v, selectedLevelRange.value)) return false;
  const isCap = Boolean(captured.value[v.Number.toString()]);
  const statusText = isCap ? "已拥有" : "未拥有";
  if (!selectedCaptureStatus.value?.includes(statusText)) return false;
  if (!selectedTaxonomies.value?.includes(v.Taxonomy)) return false;
  if (!selectedAttackTypes.value?.includes(v.AutoAttackType)) return false;
  if (!selectedBorrowActions.value?.includes(v.BorrowName)) return false;

  if (selectedHabitatType.value === "overworld") {
    const habitats = v.Habitats ?? [
      {
        Summary: v.HabitatSummary ?? "--",
        Type: (v.HabitatType as BeastHabitatItem["Type"]) ?? "overworld",
      },
    ];
    const hasMatch = habitats.some(
      (h) =>
        h.Type === "overworld" &&
        (selectedOverworldHabitat.value === "all" || h.Summary === selectedOverworldHabitat.value),
    );
    if (!hasMatch) return false;
  } else if (selectedHabitatType.value === "dungeon") {
    const habitats = v.Habitats ?? [
      {
        Summary: v.HabitatSummary ?? "--",
        Type: (v.HabitatType as BeastHabitatItem["Type"]) ?? "dungeon",
      },
    ];
    const hasMatch = habitats.some(
      (h) =>
        h.Type === "dungeon" &&
        (selectedDungeonHabitat.value === "all" || h.Summary === selectedDungeonHabitat.value),
    );
    if (!hasMatch) return false;
  }

  if (!selectedReleaseRanges.value?.includes(v.ReleaseRange)) return false;
  if (!selectedOrderRanges.value?.includes(v.OrderRange)) return false;

  const key = searchStr.value.trim();
  if (!key) return true;
  const reg = new RegExp(key, "i");
  return (
    reg.test(v.Name) ||
    reg.test(v.Number.toString()) ||
    reg.test(v.Taxonomy) ||
    reg.test(v.AutoAttackType) ||
    reg.test(v.BorrowName) ||
    reg.test(v.ReleaseName) ||
    reg.test(v.ReleaseDescription) ||
    reg.test(v.OrderName) ||
    reg.test(v.OrderDescription) ||
    reg.test(v.HabitatSummary ?? "") ||
    reg.test(v.Habitat) ||
    (v.Substitutes ? v.Substitutes.some((s) => reg.test(s)) : false) ||
    (v.SubstituteHabitats
      ? v.SubstituteHabitats.some(
          (h) => reg.test(h.Summary) || (h.MobName ? reg.test(h.MobName) : false),
        )
      : false) ||
    (v.Habitats
      ? v.Habitats.some((h) => reg.test(h.Summary) || (h.MobName ? reg.test(h.MobName) : false))
      : false)
  );
}

const sortedBeasts = computed<BeastEntry[]>(() => {
  if (sortType.value === "level") {
    return [...beasts].sort((a, b) => {
      const diff = getBeastSortLevel(a) - getBeastSortLevel(b);
      return diff !== 0 ? diff : a.Number - b.Number;
    });
  }
  return beasts;
});

const matchedBeasts = computed(() => sortedBeasts.value.filter((b) => isBeastMatched(b)));

const totalPages = computed(() => Math.max(1, Math.ceil(beasts.length / PAGE_SIZE)));

const capturedCount = computed(() => Object.values(captured.value).filter(Boolean).length);

interface SlotItem {
  slotNumber: number;
  beast?: BeastDisplay;
  isCaptured: boolean;
  isSelected: boolean;
  isMatched: boolean;
}

const beastsDisplay = ref<BeastDisplay[]>(
  beasts.map((b) => ({
    ...b,
    IconUrl: makeIconUrl(b.Icon, false),
    LargeIconUrl: makeIconUrl(b.Icon, false),
    ReleaseIconUrl: makeIconUrl(b.ReleaseIcon, false),
    OrderIconUrl: makeIconUrl(b.OrderIcon, false),
    BorrowIconUrl: makeIconUrl(b.BorrowIcon, false),
  })),
);

const isSwitching = ref(false);

const currentSlots = computed<SlotItem[]>(() => {
  const slots: SlotItem[] = [];
  const startIndex = (page.value - 1) * PAGE_SIZE;
  const pageBeasts = sortedBeasts.value.slice(startIndex, startIndex + PAGE_SIZE);

  for (let i = 0; i < PAGE_SIZE; i++) {
    const targetBeast = pageBeasts[i];
    if (targetBeast) {
      const beastDisplay = beastsDisplay.value.find((d) => d.Number === targetBeast.Number);
      const isCaptured = Boolean(captured.value[targetBeast.Number.toString()]);
      const isSelected = selectedBeastNumber.value === targetBeast.Number;
      const isMatched = isBeastMatched(targetBeast);

      slots.push({
        slotNumber: targetBeast.Number,
        beast: beastDisplay,
        isCaptured,
        isSelected,
        isMatched,
      });
    }
  }
  return slots;
});

watch(
  matchedBeasts,
  (list) => {
    if (list.length > 0) {
      if (!list.some((b) => b.Number === selectedBeastNumber.value)) {
        isSwitching.value = true;
        const first = list[0];
        if (first) {
          selectedBeastNumber.value = first.Number;
        }
        nextTick(() => {
          isSwitching.value = false;
        });
      }
    }
  },
  { immediate: true },
);

const selectedDisplay = computed<BeastDisplay | undefined>(() => {
  if (matchedBeasts.value.length === 0) return undefined;
  const match =
    matchedBeasts.value.find((b) => b.Number === selectedBeastNumber.value) ??
    matchedBeasts.value[0];
  if (!match) return undefined;
  return beastsDisplay.value.find((b) => b.Number === match.Number);
});

const isSelectedCaptured = computed({
  get: () => {
    if (!selectedDisplay.value) return false;
    return Boolean(captured.value[selectedDisplay.value.Number.toString()]);
  },
  set: (val: boolean) => {
    if (!selectedDisplay.value) return;
    captured.value[selectedDisplay.value.Number.toString()] = val;
  },
});

const mapDialogVisible = ref(false);
const activeMapHabitat = ref<BeastHabitatItem | undefined>(undefined);

function parseHabitatMinLevel(hab: BeastHabitatItem, fallbackLevel?: string): number {
  const lvl = hab.Level ?? fallbackLevel;
  if (!lvl || lvl.trim() === "-") return 0;
  const nums = lvl.match(/\d+/g)?.map(Number);
  if (!nums || nums.length === 0) return 0;
  return Math.min(...nums);
}

const displayHabitats = computed<BeastHabitatItem[]>(() => {
  if (!selectedDisplay.value) return [];
  let list: BeastHabitatItem[];
  if (selectedDisplay.value.Habitats && selectedDisplay.value.Habitats.length > 0) {
    list = [...selectedDisplay.value.Habitats];
  } else {
    list = [
      {
        Summary: selectedDisplay.value.HabitatSummary ?? "--",
        Type: (selectedDisplay.value.HabitatType as BeastHabitatItem["Type"]) ?? "overworld",
        MapId: selectedDisplay.value.MapId,
        Level: selectedDisplay.value.Level,
      },
    ];
  }

  const fallback = selectedDisplay.value.Level;
  list.sort((a, b) => parseHabitatMinLevel(a, fallback) - parseHabitatMinLevel(b, fallback));

  return list;
});

const displaySubstitutes = computed<BeastHabitatItem[]>(() => {
  if (!selectedDisplay.value) return [];
  const list = selectedDisplay.value.SubstituteHabitats ?? [];
  return [...list];
});

function getHabitatDisplayLevel(hab: BeastHabitatItem): string | undefined {
  const lvl = hab.Level ?? selectedDisplay.value?.Level;
  if (!lvl || lvl.trim() === "-") return undefined;
  return lvl.replace(/\s*\/\s*/g, "/");
}

function computeHabitatLevelColWidth(habList: BeastHabitatItem[]): string {
  let maxLen = 0;
  for (const hab of habList) {
    const lvl = getHabitatDisplayLevel(hab);
    if (lvl) {
      const fullText = `Lv.${lvl}`;
      if (fullText.length > maxLen) {
        maxLen = fullText.length;
      }
    }
  }
  if (maxLen === 0) return "0px";
  const widthPx = Math.ceil(maxLen * 6.35 + 2);
  return `${widthPx}px`;
}

const mainHabitatLevelWidth = computed(() => computeHabitatLevelColWidth(displayHabitats.value));
const subHabitatLevelWidth = computed(() => computeHabitatLevelColWidth(displaySubstitutes.value));

function isHabitatMapEnabled(hab: BeastHabitatItem): boolean {
  return Boolean(hab.MapId && (hab.Coords || hab.CoordsList?.length));
}

function openHabitatMap(hab: BeastHabitatItem): void {
  if (!isHabitatMapEnabled(hab)) return;
  activeMapHabitat.value = hab;
  mapDialogVisible.value = true;
}

function handleSelectBeastFromMap(num: number): void {
  selectedBeastNumber.value = num;
}

watch(selectedDisplay, (val) => {
  activeMapHabitat.value = val?.Habitats?.[0];
});

const failedHostMap = new WeakMap<HTMLImageElement, Set<string>>();

function handleIconError(
  e: Event,
  number: number | undefined,
  field: "IconUrl" | "LargeIconUrl" | "ReleaseIconUrl" | "OrderIconUrl" | "BorrowIconUrl",
): void {
  if (!number) return;
  const img = e.target as HTMLImageElement;
  const entry = beastsDisplay.value.find((v) => v.Number === number);
  if (!entry) return;

  const currentUrl = entry[field];

  if ((field === "LargeIconUrl" || field === "IconUrl") && !/_hr1\.png/.test(currentUrl)) {
    entry[field] = currentUrl.replace(/\.png$/, "_hr1.png");
    return;
  }

  const baseSmallUrl = currentUrl.replace("_hr1.png", ".png");

  const currentHost = CDN_SOURCES.find((h) => currentUrl.includes(h));
  if (currentHost) {
    let failedSet = failedHostMap.get(img);
    if (!failedSet) {
      failedSet = new Set<string>();
      failedHostMap.set(img, failedSet);
    }
    failedSet.add(currentHost);

    if (activeCdn.value === currentHost) {
      activeCdn.value = CDN_SOURCES[0];
    }

    const currentIndex = CDN_SOURCES.indexOf(currentHost);
    let nextHost: string | undefined;
    for (let step = 1; step <= CDN_SOURCES.length; step++) {
      const candidate = CDN_SOURCES[(currentIndex + step) % CDN_SOURCES.length];
      if (candidate && !failedSet.has(candidate)) {
        nextHost = candidate;
        break;
      }
    }

    if (nextHost) {
      const oldPrefix = getCdnPrefix(currentHost);
      const newPrefix = getCdnPrefix(nextHost);
      entry[field] = baseSmallUrl.replace(oldPrefix, newPrefix).replace(currentHost, nextHost);
      return;
    }
  }

  if (activeCdn.value === "souma.diemoe.net") {
    activeCdn.value = CDN_SOURCES[0];
  }
  img.style.display = "none";
}

function highlight(str: string): string {
  const key = searchStr.value.trim();
  if (!key) return str;
  const reg = new RegExp(key, "gi");
  return str.replace(reg, (m) => `<em>${m}</em>`);
}

function handleCellClick(slot: SlotItem): void {
  if (!slot.beast || !slot.isMatched) return;
  if (selectedBeastNumber.value === slot.beast.Number) return;

  isSwitching.value = true;
  selectedBeastNumber.value = slot.beast.Number;
  nextTick(() => {
    isSwitching.value = false;
  });
}

function handlePageChange(p: number): void {
  page.value = p;
}

const batchReg = /^(?:\d+(?:[~-]\d+)?,)*\d+(?:[~-]\d+)?$/;

function handleBatchCapture(): void {
  ElMessageBox.prompt(`输入编号范围，例如 "1~${beasts.length}"、"1,3,5"`, "批量标记已拥有", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    inputPattern: batchReg,
    inputErrorMessage: "格式错误",
  })
    .then((res) => {
      const { value } = res as MessageBoxInputData;
      for (const n of value.split(",")) {
        if (/^\d+[-~]\d+$/.test(n)) {
          const [min, max] = n.split(/[-~]/).map(Number);
          for (let i = min!; i <= max!; i++) {
            captured.value[i.toString()] = true;
          }
        } else {
          captured.value[n] = true;
        }
      }
      ElMessage({ type: "success", message: "批量标记成功" });
    })
    .catch(() => {
      ElMessage({ type: "info", message: "已取消" });
    });
}

function handleClearAllCaptured(): void {
  ElMessageBox.confirm("确定将所有魔兽标记为未捕获吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      captured.value = {};
      ElMessage({ type: "success", message: "已全部标记为未捕获" });
    })
    .catch(() => {});
}
</script>

<template>
  <div class="app">
    <div class="filter-panel">
      <div class="filter-section">
        <div class="filter-row">
          <span class="filter-label">文字：</span>
          <div class="filter-content">
            <el-input
              v-model="searchStr"
              placeholder="搜索名称 / 技能 / 属性 / 描述 / 栖息地"
              class="search-input"
              clearable
              size="small"
            />
          </div>
        </div>

        <div class="filter-row">
          <span class="filter-label">状态：</span>
          <div class="filter-content">
            <el-checkbox-group v-model="selectedCaptureStatus" size="small">
              <el-checkbox v-for="s in ALL_CAPTURE_STATUS" :key="s" :value="s" :label="s">
                {{ s }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </div>

        <div class="filter-row level-filter-row">
          <span class="filter-label">等级：</span>
          <div class="filter-content level-filter-content">
            <el-slider
              v-model="selectedLevelRange"
              range
              :min="1"
              :max="50"
              size="small"
              class="level-slider"
            />
            <span class="level-range-text"
              >Lv.{{ selectedLevelRange[0] }} ~ Lv.{{ selectedLevelRange[1] }}</span
            >
          </div>
        </div>

        <div class="filter-row">
          <span class="filter-label">分类：</span>
          <div class="filter-content">
            <el-checkbox-group v-model="selectedTaxonomies" size="small">
              <el-checkbox v-for="t in ALL_TAXONOMIES" :key="t" :value="t" :label="t">
                {{ t }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </div>

        <div class="filter-row habitat-filter-row">
          <span class="filter-label">栖息地：</span>
          <div class="filter-content habitat-filter-content">
            <el-radio-group v-model="selectedHabitatType" size="small" class="habitat-type-radios">
              <el-radio-button value="all" label="all">全部</el-radio-button>
              <el-radio-button value="overworld" label="overworld">大地图</el-radio-button>
              <el-radio-button value="dungeon" label="dungeon">副本</el-radio-button>
            </el-radio-group>

            <div v-if="selectedHabitatType === 'overworld'" class="habitat-sub-group">
              <el-radio-group v-model="selectedOverworldHabitat" size="small">
                <el-radio value="all" label="all">全部</el-radio>
                <el-radio v-for="h in OVERWORLD_HABITATS" :key="h" :value="h" :label="h">
                  {{ h === "--" ? "无" : h }}
                </el-radio>
              </el-radio-group>
            </div>

            <div v-else-if="selectedHabitatType === 'dungeon'" class="habitat-sub-group">
              <el-radio-group v-model="selectedDungeonHabitat" size="small">
                <el-radio value="all" label="all">全部</el-radio>
                <el-radio v-for="h in DUNGEON_HABITATS" :key="h" :value="h" :label="h">
                  {{ h }}
                </el-radio>
              </el-radio-group>
            </div>
          </div>
        </div>

        <div class="filter-row">
          <span class="filter-label">属性：</span>
          <div class="filter-content">
            <el-checkbox-group v-model="selectedAttackTypes" size="small">
              <el-checkbox v-for="a in ALL_ATTACK_TYPES" :key="a" :value="a" :label="a">
                {{ a }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </div>

        <div class="filter-row">
          <span class="filter-label">借用：</span>
          <div class="filter-content">
            <el-checkbox-group v-model="selectedBorrowActions" size="small">
              <el-checkbox v-for="b in ALL_BORROW_ACTIONS" :key="b" :value="b" :label="b">
                {{ b }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </div>

        <div class="filter-row">
          <span class="filter-label">释放：</span>
          <div class="filter-content">
            <el-checkbox-group v-model="selectedReleaseRanges" size="small">
              <el-checkbox v-for="r in ALL_RANGES" :key="r" :value="r" :label="r">
                {{ r }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </div>

        <div class="filter-row">
          <span class="filter-label">大招：</span>
          <div class="filter-content">
            <el-checkbox-group v-model="selectedOrderRanges" size="small">
              <el-checkbox v-for="o in ALL_RANGES" :key="o" :value="o" :label="o">
                {{ o }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </div>
    </div>

    <div class="bstbook-container">
      <div class="left-panel">
        <div class="panel-header">
          <div class="pagination-bar">
            <button
              v-for="p in totalPages"
              :key="p"
              type="button"
              class="page-btn"
              :class="{ active: page === p }"
              @click="handlePageChange(p)"
            >
              {{ p }}
            </button>
          </div>
          <div class="sort-controls">
            <el-radio-group v-model="sortType" size="small">
              <el-radio-button value="default" label="default">编号排序</el-radio-button>
              <el-radio-button value="level" label="level">等级排序</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="grid-panel">
          <div
            v-for="slot in currentSlots"
            :key="slot.slotNumber"
            class="grid-cell"
            :class="{
              active: slot.isSelected && slot.isMatched,
              'unmatched-cell': !slot.isMatched,
            }"
            @click="handleCellClick(slot)"
          >
            <div
              class="slot-card"
              :class="{
                captured: slot.isCaptured,
                uncaptured: !slot.isCaptured && grayCaptured && slot.beast,
                'card-unmatched': !slot.isMatched,
              }"
            >
              <template v-if="slot.beast">
                <img
                  v-if="slot.beast.IconUrl"
                  :src="slot.beast.IconUrl"
                  class="beast-icon"
                  draggable="false"
                  @load="handleIconLoad"
                  @error="handleIconError($event, slot.beast?.Number, 'IconUrl')"
                />
                <div v-else class="unknown-mark">?</div>

                <span v-if="slot.beast.Level && !editingMode" class="slot-level-badge">
                  Lv.{{ formatSlotLevel(slot.beast.Level) }}
                </span>

                <div class="slot-name-badge">
                  <span class="badge-number">#{{ slot.slotNumber }}</span>
                  <span class="badge-name" v-html="highlight(getShortName(slot.beast.Name))" />
                </div>

                <el-checkbox
                  v-if="editingMode"
                  v-model="captured[slot.beast.Number.toString()]"
                  class="slot-checkbox"
                  @click.stop
                />
                <div v-if="!editingMode && slot.isCaptured" class="captured-mark">✓</div>
              </template>
            </div>
          </div>
        </div>

        <div class="capture-summary">
          <span class="label">捕获数量</span>
          <span class="count">{{ capturedCount }}/{{ TOTAL_SLOTS }}</span>
        </div>
      </div>

      <div class="right-panel">
        <template v-if="selectedDisplay">
          <div class="detail-header">
            <div class="title-group">
              <span class="roman-num">#{{ selectedDisplay.Number }}</span>
              <span class="name" v-html="highlight(selectedDisplay.Name)" />
            </div>
            <div class="header-capture">
              <el-checkbox v-model="isSelectedCaptured" label="已捕获该魔兽" size="large" />
            </div>
          </div>

          <div class="meta-section">
            <div class="avatar-wrap">
              <img
                v-if="!isSwitching && selectedDisplay.LargeIconUrl"
                :src="selectedDisplay.LargeIconUrl"
                class="avatar-img"
                draggable="false"
                @load="handleIconLoad"
                @error="handleIconError($event, selectedDisplay?.Number, 'LargeIconUrl')"
              />
            </div>
            <div class="attrs-wrap">
              <div class="attr-row">
                <span class="attr-title">博物学分类</span>
                <span class="attr-text" v-html="highlight(selectedDisplay.Taxonomy)" />
              </div>
              <div class="attr-row">
                <span class="attr-title">自动攻击属性</span>
                <span class="attr-text" v-html="highlight(selectedDisplay.AutoAttackType)" />
              </div>
            </div>
            <div class="borrow-column">
              <div class="skill-title">借用</div>
              <div class="borrow-card">
                <el-tooltip
                  raw-content
                  :content="formatTooltipDesc(selectedDisplay.BorrowDescription)"
                  placement="left-start"
                  :show-after="100"
                  popper-class="borrow-tooltip"
                >
                  <div class="borrow-box">
                    <div class="borrow-icon-wrap">
                      <img
                        v-if="!isSwitching && selectedDisplay.BorrowIconUrl"
                        :src="selectedDisplay.BorrowIconUrl"
                        class="borrow-icon"
                        draggable="false"
                        @load="handleIconLoad"
                        @error="handleIconError($event, selectedDisplay?.Number, 'BorrowIconUrl')"
                      />
                      <div v-else class="borrow-placeholder" />
                    </div>
                    <span class="borrow-name" v-html="highlight(selectedDisplay.BorrowName)" />
                  </div>
                </el-tooltip>
              </div>
            </div>
          </div>

          <div class="skill-item">
            <div class="skill-title">释放</div>
            <div class="skill-main">
              <div class="skill-icon-wrap">
                <img
                  v-if="!isSwitching && selectedDisplay.ReleaseIconUrl"
                  :src="selectedDisplay.ReleaseIconUrl"
                  class="skill-icon"
                  draggable="false"
                  @load="handleIconLoad"
                  @error="handleIconError($event, selectedDisplay?.Number, 'ReleaseIconUrl')"
                />
                <div v-else class="skill-placeholder" />
              </div>
              <div class="skill-detail">
                <div class="skill-header-line">
                  <span class="skill-name" v-html="highlight(selectedDisplay.ReleaseName)" />
                  <span v-if="selectedDisplay.ReleaseRange" class="skill-range-tag">
                    {{ selectedDisplay.ReleaseRange }}
                  </span>
                </div>
                <div class="skill-desc" v-html="highlight(selectedDisplay.ReleaseDescription)" />
              </div>
            </div>
          </div>

          <div class="skill-item">
            <div class="skill-title">大招</div>
            <div class="skill-main">
              <div class="skill-icon-wrap">
                <img
                  v-if="!isSwitching && selectedDisplay.OrderIconUrl"
                  :src="selectedDisplay.OrderIconUrl"
                  class="skill-icon"
                  draggable="false"
                  @load="handleIconLoad"
                  @error="handleIconError($event, selectedDisplay?.Number, 'OrderIconUrl')"
                />
                <div v-else class="skill-placeholder" />
              </div>
              <div class="skill-detail">
                <div class="skill-header-line">
                  <span class="skill-name" v-html="highlight(selectedDisplay.OrderName)" />
                  <span v-if="selectedDisplay.OrderRange" class="skill-range-tag">
                    {{ selectedDisplay.OrderRange }}
                  </span>
                </div>
                <div class="skill-desc" v-html="highlight(selectedDisplay.OrderDescription)" />
              </div>
            </div>
          </div>

          <div
            class="habitat-section"
            :class="{ 'has-substitutes': displaySubstitutes.length > 0 }"
          >
            <div class="habitat-columns">
              <div class="habitat-col main-habitat-col">
                <div class="habitat-title">主要栖息地</div>
                <div class="habitat-location">
                  <template v-for="(hab, idx) in displayHabitats" :key="idx">
                    <div class="habitat-item-row">
                      <span
                        v-if="getHabitatDisplayLevel(hab)"
                        class="habitat-level-text"
                        :style="{ width: mainHabitatLevelWidth, minWidth: mainHabitatLevelWidth }"
                      >
                        Lv.{{ getHabitatDisplayLevel(hab) }}
                      </span>
                      <span
                        class="habitat-type-tag"
                        :class="hab.Type === 'dungeon' ? 'tag-dungeon' : 'tag-overworld'"
                      >
                        {{ hab.Type === "dungeon" ? "副本" : "野外" }}
                      </span>
                      <el-tooltip
                        v-if="isHabitatMapEnabled(hab)"
                        content="点击打开地图"
                        placement="top"
                        :show-after="50"
                      >
                        <button type="button" class="habitat-map-btn" @click="openHabitatMap(hab)">
                          <svg
                            class="map-pin-icon"
                            viewBox="0 0 16 16"
                            width="13"
                            height="13"
                            fill="currentColor"
                          >
                            <path
                              d="M8 0a5.53 5.53 0 0 0-5.5 5.5c0 3.82 5.5 10.5 5.5 10.5s5.5-6.68 5.5-10.5A5.53 5.53 0 0 0 8 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"
                            />
                          </svg>
                          <span class="location-name">{{ hab.Summary }}</span>
                          <span
                            v-if="hab.CoordsList && hab.CoordsList.length > 0"
                            class="location-coords"
                          >
                            <span
                              v-for="(c, cIdx) in hab.CoordsList"
                              :key="cIdx"
                              class="coord-badge"
                              ><span class="coord-paren">(</span>{{ c.x }},{{ c.y
                              }}<span class="coord-paren">)</span></span
                            >
                          </span>
                          <span v-else-if="hab.Coords" class="location-coords">
                            <span class="coord-badge"
                              ><span class="coord-paren">(</span>{{ hab.Coords.x }},{{ hab.Coords.y
                              }}<span class="coord-paren">)</span></span
                            >
                          </span>
                          <span v-if="hab.CoordsNote" class="location-coords-note">
                            ({{ hab.CoordsNote }})
                          </span>
                        </button>
                      </el-tooltip>
                      <span v-else class="habitat-plain-text">
                        {{ hab.Summary }}
                      </span>
                    </div>
                  </template>
                </div>
              </div>

              <div class="habitat-col substitute-col">
                <div class="habitat-title">
                  <span>同模怪物（Beta）</span>
                  <span class="habitat-title-note">* 仅供参考，不保证真实性</span>
                </div>
                <div class="habitat-location scrollable">
                  <template v-if="displaySubstitutes.length > 0">
                    <template v-for="(subHab, idx) in displaySubstitutes" :key="idx">
                      <div class="habitat-item-row">
                        <span
                          v-if="getHabitatDisplayLevel(subHab)"
                          class="habitat-level-text"
                          :style="{ width: subHabitatLevelWidth, minWidth: subHabitatLevelWidth }"
                        >
                          Lv.{{ getHabitatDisplayLevel(subHab) }}
                        </span>

                        <span
                          v-if="subHab.Tag === '行会令'"
                          class="habitat-type-tag tag-guildorder"
                        >
                          行会令
                        </span>
                        <span v-else-if="subHab.Tag === '理符'" class="habitat-type-tag tag-leve">
                          理符
                        </span>
                        <span v-else-if="subHab.Tag === 'FATE'" class="habitat-type-tag tag-fate">
                          FATE
                        </span>
                        <span
                          v-else-if="subHab.Type === 'dungeon'"
                          class="habitat-type-tag tag-dungeon"
                        >
                          副本
                        </span>
                        <span v-else class="habitat-type-tag tag-overworld"> 野外 </span>

                        <span
                          v-if="
                            subHab.Tag === '行会令' ||
                            (subHab.Tag === '理符' && !isHabitatMapEnabled(subHab))
                          "
                          class="habitat-plain-text"
                          :title="subHab.EventName || subHab.Summary"
                        >
                          {{ subHab.EventName || subHab.Summary }}
                        </span>
                        <el-tooltip
                          v-else-if="isHabitatMapEnabled(subHab)"
                          :content="
                            subHab.EventName
                              ? `【${subHab.Tag || '平替'}】${subHab.EventName} · 点击打开地图`
                              : '点击打开地图'
                          "
                          placement="top"
                          :show-after="50"
                        >
                          <button
                            type="button"
                            class="habitat-map-btn"
                            @click="openHabitatMap(subHab)"
                          >
                            <svg
                              class="map-pin-icon"
                              viewBox="0 0 16 16"
                              width="13"
                              height="13"
                              fill="currentColor"
                            >
                              <path
                                d="M8 0a5.53 5.53 0 0 0-5.5 5.5c0 3.82 5.5 10.5 5.5 10.5s5.5-6.68 5.5-10.5A5.53 5.53 0 0 0 8 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"
                              />
                            </svg>
                            <span class="location-name">{{ subHab.Summary }}</span>
                            <span
                              v-if="subHab.CoordsList && subHab.CoordsList.length > 0"
                              class="location-coords"
                            >
                              <span
                                v-for="(c, cIdx) in subHab.CoordsList"
                                :key="cIdx"
                                class="coord-badge"
                                ><span class="coord-paren">(</span>{{ c.x }},{{ c.y
                                }}<span class="coord-paren">)</span></span
                              >
                            </span>
                            <span v-else-if="subHab.Coords" class="location-coords">
                              <span class="coord-badge"
                                ><span class="coord-paren">(</span>{{ subHab.Coords.x }},{{
                                  subHab.Coords.y
                                }}<span class="coord-paren">)</span></span
                              >
                            </span>
                            <span v-if="subHab.CoordsNote" class="location-coords-note">
                              ({{ subHab.CoordsNote }})
                            </span>
                          </button>
                        </el-tooltip>
                        <span v-else class="habitat-plain-text">
                          {{ subHab.Summary }}
                        </span>
                      </div>
                    </template>
                  </template>
                  <div v-else class="habitat-empty-placeholder">暂无平替魔物</div>
                </div>
              </div>
            </div>
          </div>

          <div class="habitat-desc" v-html="highlight(selectedDisplay.Habitat)" />
        </template>
        <div v-else class="empty-detail">请选择一只魔兽查看详情</div>
      </div>
    </div>

    <div class="page-footer-bar">
      <div class="footer-mark-tools">
        <span class="tools-label">标记：</span>
        <el-checkbox v-model="editingMode" label="编辑模式" size="small" />
        <el-checkbox v-model="grayCaptured" label="未拥有的变灰" size="small" />
        <el-button size="small" class="batch-btn" @click="handleBatchCapture"> 批量标记 </el-button>
        <el-button size="small" class="batch-btn" @click="handleClearAllCaptured">
          清空捕获
        </el-button>
      </div>

      <div class="footer-credit">
        数据来源参考
        <a
          href="https://www.bilibili.com/video/BV19nbV6TEQk/"
          target="_blank"
          rel="noopener noreferrer"
          class="credit-link"
        >
          BV19nbV6TEQk
        </a>
        /
        <a
          href="https://ff14.huijiwiki.com/wiki/%E9%AD%94%E5%85%BD%E5%9B%BE%E9%89%B4"
          target="_blank"
          rel="noopener noreferrer"
          class="credit-link"
        >
          灰机WIKI
        </a>
      </div>

      <div class="footer-cmd-tips">
        <span class="tip-title">指令提示：</span>
        <el-tooltip
          placement="top"
          popper-class="cmd-tooltip"
          raw-content
          :content="beastSizeCmdDetail"
        >
          <span class="cmd-badge">/驯兽尺寸</span>
        </el-tooltip>
        <span class="tip-desc">调整魔兽尺寸</span>

        <span class="tip-sep">|</span>

        <el-tooltip
          placement="top"
          popper-class="cmd-tooltip"
          raw-content
          :content="bestiaryCmdDetail"
        >
          <span class="cmd-badge">/魔兽图鉴</span>
        </el-tooltip>
        <span class="tip-desc">打开图鉴窗口</span>
      </div>
    </div>

    <BeastMapDialog
      v-if="selectedDisplay"
      v-model="mapDialogVisible"
      :beast-name="selectedDisplay.Name"
      :sub-name="activeMapHabitat?.MobName"
      :event-tag="activeMapHabitat?.Tag"
      :event-name="activeMapHabitat?.EventName"
      :habitat-name="activeMapHabitat?.Summary ?? selectedDisplay.HabitatSummary ?? ''"
      :map-id="activeMapHabitat?.MapId ?? selectedDisplay.MapId"
      :coords="
        activeMapHabitat?.CoordsList ??
        activeMapHabitat?.Coords ??
        selectedDisplay.Habitats?.[0]?.CoordsList ??
        selectedDisplay.Habitats?.[0]?.Coords
      "
      :all-beasts="beastsDisplay"
      :captured="captured"
      :current-beast-number="selectedDisplay.Number"
      @select-beast="handleSelectBeastFromMap"
      @toggle-capture="
        (num: number, val: boolean) => {
          captured[num.toString()] = val;
        }
      "
    />
  </div>
</template>

<style scoped lang="scss">
:deep(em) {
  font-style: normal;
  background-color: #ffd04b;
  color: #000;
  border-radius: 2px;
  padding: 0 2px;
}

:global(.borrow-tooltip) {
  max-width: 320px !important;
  white-space: pre-line !important;
  line-height: 1.55 !important;
  font-size: 12px !important;
}

:global(.cmd-tooltip) {
  max-width: 360px !important;
  line-height: 1.6 !important;
  font-size: 12px !important;
}

.app {
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 24px 16px 36px;
  box-sizing: border-box;
  color: #3b2d1d;
  user-select: none;

  .filter-panel {
    width: 100%;
    max-width: 1250px;
    margin-bottom: 12px;
    padding: 10px 18px;
    background: #fdfbf7;
    border: 1px solid #dcd4c6;
    border-radius: 8px;
    box-sizing: border-box;

    .filter-section {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .filter-row {
        display: flex;
        align-items: flex-start;
        width: 100%;

        .filter-label {
          font-size: 13px;
          font-weight: 700;
          color: #5d4a36;
          width: 58px;
          min-width: 58px;
          flex-shrink: 0;
          text-align: right;
          padding-right: 8px;
          white-space: nowrap;
          line-height: 24px;
          box-sizing: border-box;
        }

        .filter-content {
          flex: 1;
          display: flex;
          align-items: center;
          min-height: 24px;

          .search-input {
            width: 320px;
          }

          :deep(.el-checkbox-group),
          :deep(.el-radio-group) {
            display: flex;
            flex-wrap: wrap;
            gap: 2px 14px;
            align-items: center;
          }

          :deep(.el-checkbox),
          :deep(.el-radio) {
            margin-right: 0;
            color: #3b2d1d;
            height: 24px;

            .el-checkbox__label,
            .el-radio__label {
              font-size: 12px;
              padding-left: 5px;
            }

            .el-radio__input.is-checked .el-radio__inner {
              background-color: #836f58;
              border-color: #836f58;
            }

            .el-radio__input.is-checked + .el-radio__label {
              color: #5d4a36;
              font-weight: 600;
            }
          }

          :deep(.el-radio-button__inner) {
            padding: 3px 9px;
            font-size: 12px;
            height: 24px;
            line-height: 16px;
            background: #f4ede3;
            border-color: #d8cdbf;
            color: #5d4a36;
          }

          :deep(.el-radio-button.is-active .el-radio-button__inner) {
            background: #836f58;
            border-color: #6d5b47;
            color: #fff;
            box-shadow: -1px 0 0 0 #6d5b47;
          }
        }

        &.level-filter-row {
          .level-filter-content {
            display: flex;
            align-items: center;
            gap: 16px;

            .level-slider {
              width: 240px;
              margin: 0 4px;

              :deep(.el-slider__bar) {
                background-color: #836f58;
              }

              :deep(.el-slider__button) {
                border-color: #836f58;
                width: 13px;
                height: 13px;
              }
            }

            .level-range-text {
              font-size: 12px;
              font-weight: 700;
              color: #5d4a36;
              min-width: 96px;
            }
          }
        }

        &.habitat-filter-row {
          min-height: 50px;

          .habitat-filter-content {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            flex-wrap: wrap;
            min-height: 50px;

            .habitat-type-radios {
              flex-shrink: 0;
            }

            .habitat-sub-group {
              flex: 1;
              display: flex;
              align-items: flex-start;
            }
          }
        }
      }
    }
  }

  .bstbook-container {
    width: 100%;
    max-width: 1280px;
    height: 596px;
    min-height: 596px;
    max-height: 596px;
    overflow: hidden;
    display: flex;
    background: #faf7f0;
    border: 1.5px solid #dcd4c6;
    border-radius: 10px;
    box-shadow: 0 3px 16px rgba(0, 0, 0, 0.06);
    box-sizing: border-box;

    .left-panel {
      width: 530px;
      flex-shrink: 0;
      padding: 14px 20px 12px;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      transition:
        width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      .panel-header {
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .pagination-bar {
          display: flex;
          gap: 10px;

          .page-btn {
            width: 36px;
            height: 30px;
            line-height: 28px;
            text-align: center;
            font-size: 15px;
            font-weight: bold;
            color: #5d4a36;
            cursor: pointer;
            border-radius: 5px;
            border: 1px solid #dcd4c6;
            background: #f4eee5;
            transition: all 0.15s;

            &:hover {
              background-color: #ebe3d6;
            }

            &.active {
              background-color: #e6a23c;
              border-color: #d6942c;
              color: #fff;
            }
          }
        }

        .sort-controls {
          display: flex;
          align-items: center;

          :deep(.el-radio-button__inner) {
            height: 30px;
            line-height: 28px;
            padding: 0 10px;
            font-size: 12px;
            background: #f4ede3;
            border-color: #dcd4c6;
            color: #5d4a36;
          }

          :deep(.el-radio-button__inner:hover) {
            background-color: #ebe3d6;
            color: #5d4a36;
          }

          :deep(.el-radio-button.is-active .el-radio-button__inner) {
            background-color: #e6a23c;
            border-color: #d6942c;
            color: #fff;
            box-shadow: -1px 0 0 0 #d6942c;
          }
        }
      }

      .grid-panel {
        display: grid;
        grid-template-columns: repeat(5, 82px);
        gap: 13px 19px;
        justify-content: space-between;
        transition:
          gap 0.3s cubic-bezier(0.4, 0, 0.2, 1),
          grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        .grid-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition:
            opacity 0.2s ease,
            filter 0.2s ease;

          .slot-card {
            position: relative;
            width: 82px;
            height: 88px;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding-top: 3px;
            background: #f2ece2;
            border: 1px solid #ddd4c7;
            box-sizing: border-box;
            transition:
              width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              background 0.15s ease-in-out,
              border-color 0.15s ease-in-out,
              box-shadow 0.15s ease-in-out;

            &:hover {
              border-color: #bfaea0;
              background: #ebe3d6;
            }

            .beast-icon {
              width: 62px;
              height: 62px;
              border-radius: 4px;
              object-fit: cover;
              display: block;
              transition:
                width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .unknown-mark {
              font-size: 26px;
              font-weight: bold;
              color: #b5a794;
              margin-top: 14px;
            }

            .slot-level-badge {
              position: absolute;
              top: 3px;
              right: 4px;
              max-width: 52px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-size: 10px;
              font-weight: 800;
              color: #5c3202;
              letter-spacing: -0.2px;
              pointer-events: none;
              z-index: 2;
              line-height: 12px;
              text-shadow:
                1px 1px 0 #fff,
                -1px -1px 0 #fff,
                1px -1px 0 #fff,
                -1px 1px 0 #fff,
                0 0 3px #fff;
              filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.28));
            }

            .slot-name-badge {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 20px;
              display: flex;
              align-items: baseline;
              padding: 0 4px;
              box-sizing: border-box;
              background: rgba(36, 26, 17, 0.68);
              border-bottom-left-radius: 5px;
              border-bottom-right-radius: 5px;
              pointer-events: none;
              z-index: 1;

              .badge-number {
                font-size: 11px;
                font-weight: 700;
                color: #e5b364;
                flex-shrink: 0;
                margin-right: 3px;
                letter-spacing: -0.2px;
                line-height: 20px;
              }

              .badge-name {
                flex: 1;
                font-size: 11px;
                text-align: center;
                color: #f7eedf;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 20px;
                padding-right: 2px;

                :deep(em) {
                  background: #f1b332;
                  color: #2b1f13;
                  font-style: normal;
                  padding: 0 1px;
                  border-radius: 2px;
                }
              }
            }

            .slot-checkbox {
              position: absolute;
              top: 2px;
              left: 2px;
              z-index: 3;
            }

            .captured-mark {
              position: absolute;
              top: 2px;
              left: 2px;
              width: 16px;
              height: 16px;
              background: #2e7d32;
              color: #ffffff;
              border: 1.5px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: 900;
              box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
              z-index: 2;
            }

            &.captured {
              border-color: #a3c9a8;
              background: #f4f8f4;
            }

            &.uncaptured {
              filter: grayscale(1) brightness(0.65);
            }
          }

          &.unmatched-cell {
            opacity: 0.18;
            filter: grayscale(85%);
            cursor: not-allowed;

            .slot-card {
              pointer-events: none;
              background: #ede6da;
              border-color: #d6ccbe;

              &:hover {
                background: #ede6da;
                border-color: #d6ccbe;
              }
            }
          }

          &.active:not(.unmatched-cell) .slot-card {
            box-shadow:
              0 0 0 2px #e6a23c,
              0 0 6px rgba(230, 162, 60, 0.4);
            border-color: #e6a23c;
            background: #fdfbf7;
          }
        }
      }

      .capture-summary {
        margin-top: 10px;
        display: flex;
        justify-content: center;
        align-items: baseline;
        gap: 12px;
        font-size: 15px;
        color: #4b3c2e;

        .count {
          font-size: 20px;
          font-weight: bold;
          color: #7a2211;
          letter-spacing: 0.5px;
        }
      }
    }

    .right-panel {
      flex: 1;
      min-width: 0;
      height: 100%;
      min-height: 0;
      max-height: 100%;
      padding: 18px 24px 14px;
      border-left: 1px solid #e8dfd2;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      user-select: text;
      box-sizing: border-box;
      transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      .detail-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 28px;
        min-height: 28px;
        max-height: 28px;
        margin-bottom: 12px;
        flex-shrink: 0;
        gap: 8px;

        .title-group {
          display: flex;
          align-items: baseline;
          gap: 12px;
          min-width: 0;
          flex-shrink: 1;

          .roman-num {
            font-size: 20px;
            font-weight: bold;
            color: #594735;
            min-width: 44px;
            flex-shrink: 0;
          }

          .name {
            font-size: 21px;
            font-weight: bold;
            color: #2b1f13;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .level-badge {
            font-family: Consolas, "Segoe UI", Monaco, monospace;
            font-size: 12.5px;
            font-weight: 700;
            color: #8c430e;
            background: #f7e8d0;
            border: 1px solid #e2cbab;
            border-radius: 4px;
            padding: 1px 6px;
            line-height: 16px;
            letter-spacing: 0.2px;
            flex-shrink: 0;
            font-variant-numeric: tabular-nums;
          }
        }

        .header-capture {
          display: flex;
          align-items: center;
          flex-shrink: 0;

          :deep(.el-checkbox) {
            margin: 0;
            cursor: pointer;
            user-select: none;
            --el-checkbox-checked-bg-color: #257a2b;
            --el-checkbox-checked-input-border-color: #257a2b;
            --el-checkbox-input-border-color-hover: #257a2b;

            .el-checkbox__inner {
              border: 1.8px solid #4a3622;
              border-radius: 3px;
              background: #ffffff;
              transition: all 0.15s ease;
            }

            &:hover {
              .el-checkbox__inner {
                border-color: #257a2b;
              }
              .el-checkbox__label {
                color: #257a2b;
              }
            }

            &.is-checked {
              .el-checkbox__inner {
                background-color: #257a2b;
                border-color: #257a2b;
              }

              .el-checkbox__label {
                color: #1b5e20;
                font-weight: 800;
              }
            }

            .el-checkbox__label {
              font-size: 15px;
              font-weight: 700;
              color: #1a1006;
              padding-left: 8px;
              letter-spacing: 0.5px;
              transition: color 0.15s ease;
            }
          }
        }
      }

      .meta-section {
        display: flex;
        align-items: center;
        gap: 14px;
        height: 84px;
        min-height: 84px;
        max-height: 84px;
        margin-bottom: 6px;
        flex-shrink: 0;

        .avatar-wrap {
          width: 84px;
          height: 84px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f2ece2;
          border: 1px solid #d4c8b8;
          border-radius: 6px;
          box-sizing: border-box;
          overflow: hidden;
          padding: 4px;
          transition:
            width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            height 0.3s cubic-bezier(0.4, 0, 0.2, 1);

          .avatar-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }
        }

        .attrs-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          min-width: 140px;
          flex: 1;

          .attr-row {
            display: flex;
            align-items: center;
            gap: 8px;

            .attr-title {
              color: #0b6e51;
              font-weight: 700;
              min-width: 60px;
              font-size: 12px;
              flex-shrink: 0;
            }

            .attr-text {
              color: #332517;
              font-weight: 600;
              font-size: 13px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }
        }

        .borrow-column {
          margin-left: auto;
          display: flex;
          flex-direction: column;
          align-items: center;

          .skill-title {
            font-size: 12px;
            font-weight: 700;
            color: #a86c0c;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
            line-height: 1.2;
          }

          .borrow-card {
            width: 56px;
            min-width: 56px;
            max-width: 64px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            background: transparent;
            border: none;
            padding: 0;
            box-sizing: border-box;

            .borrow-box {
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              cursor: pointer;

              .borrow-icon-wrap {
                width: 48px;
                height: 48px;
                border-radius: 6px;
                background: #f2ece2;
                border: 1.5px solid #d4a853;
                box-sizing: border-box;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 1px 4px rgba(168, 108, 12, 0.18);
                transition:
                  transform 0.15s ease,
                  border-color 0.15s ease;

                .borrow-icon {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  display: block;
                }

                .borrow-placeholder {
                  width: 100%;
                  height: 100%;
                }
              }

              &:hover .borrow-icon-wrap {
                border-color: #b5832a;
                transform: scale(1.04);
              }

              .borrow-name {
                width: 72px;
                text-align: center;
                font-size: 11px;
                font-weight: 700;
                color: #2b1f13;
                margin-top: 3px;
                margin-bottom: -12px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.2;
                position: relative;
                z-index: 2;
              }
            }
          }
        }
      }

      .skill-item {
        height: 84px;
        min-height: 84px;
        max-height: 84px;
        margin-bottom: 8px;
        flex-shrink: 0;

        .skill-title {
          font-size: 13px;
          font-weight: 700;
          color: #a86c0c;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }

        .skill-main {
          display: flex;
          align-items: center;
          gap: 12px;

          .skill-icon-wrap {
            width: 48px;
            height: 48px;
            border-radius: 6px;
            overflow: hidden;
            flex-shrink: 0;
            background: #f2ece2;
            border: 1px solid #d4c8b8;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;

            .skill-icon {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            }

            .skill-placeholder {
              width: 100%;
              height: 100%;
            }
          }

          .skill-detail {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 64px;
            max-height: 64px;
            min-height: 64px;
            overflow: hidden;

            .skill-header-line {
              display: flex;
              align-items: center;
              gap: 8px;
              height: 18px;
              line-height: 18px;
              margin-bottom: 2px;
              min-width: 0;

              .skill-name {
                font-size: 15px;
                font-weight: 700;
                color: #22180f;
                line-height: 18px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex-shrink: 1;
              }

              .skill-range-tag {
                font-size: 11px;
                color: #5c4a39;
                background: #ebd8c2;
                border: 1px solid #d4c1aa;
                padding: 0 6px;
                border-radius: 3px;
                font-weight: 600;
                line-height: 16px;
                height: 18px;
                white-space: nowrap;
                flex-shrink: 0;
                box-sizing: border-box;
                display: inline-flex;
                align-items: center;
              }
            }

            .skill-desc {
              font-size: 12px;
              color: #36281b;
              line-height: 14.5px;
              white-space: pre-line;
              height: 44px;
              min-height: 44px;
              max-height: 44px;
              overflow-y: auto;
              scrollbar-width: thin;
              scrollbar-color: #dcd4c6 transparent;

              &::-webkit-scrollbar {
                width: 4px;
              }

              &::-webkit-scrollbar-thumb {
                background: #dcd4c6;
                border-radius: 2px;
              }

              &::-webkit-scrollbar-thumb:hover {
                background: #bfaea0;
              }
            }
          }
        }
      }

      .habitat-section {
        margin-top: 4px;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;

        .habitat-columns {
          display: flex;
          gap: 12px;
          width: 100%;
          flex: 1;
          min-height: 0;

          .habitat-col {
            min-width: 0;
            display: flex;
            flex-direction: column;
            min-height: 0;
            box-sizing: border-box;

            &.main-habitat-col {
              flex: 0 0 252px;
              width: 252px;
            }

            &.substitute-col {
              flex: 1;
              min-width: 0;
            }

            .habitat-title {
              font-size: 12px;
              font-weight: 700;
              color: #a86c0c;
              letter-spacing: 0.5px;
              height: 18px;
              line-height: 18px;
              margin-bottom: 6px;
              display: flex;
              align-items: baseline;
              gap: 6px;
              flex-shrink: 0;

              .habitat-title-note {
                font-size: 10.5px;
                font-weight: 400;
                color: #8c7d6b;
                letter-spacing: normal;
              }
            }

            .habitat-location {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 4px;
              flex: 1;
              min-height: 0;
              max-height: 136px;
              overflow-y: auto;
              padding-right: 4px;
              scrollbar-width: thin;
              scrollbar-color: #dcd4c6 transparent;

              &::-webkit-scrollbar {
                width: 3px;
              }

              &::-webkit-scrollbar-thumb {
                background: #dcd4c6;
                border-radius: 2px;
              }

              &::-webkit-scrollbar-thumb:hover {
                background: #bfaea0;
              }

              .habitat-item-row {
                display: flex;
                align-items: flex-start;
                gap: 4px;
                width: 100%;
                min-width: 0;
                min-height: 22px;
                box-sizing: border-box;

                .habitat-level-text {
                  font-family: sans-serif;
                  font-size: 11.5px;
                  font-weight: 700;
                  color: #8c430e;
                  flex-shrink: 0;
                  line-height: 16px;
                  margin-top: 2px;
                  white-space: nowrap;
                  letter-spacing: -0.3px;
                  font-variant-numeric: tabular-nums;
                }

                .habitat-type-tag {
                  font-size: 10.5px;
                  font-weight: 700;
                  width: 38px;
                  min-width: 38px;
                  max-width: 38px;
                  height: 18px;
                  line-height: 16px;
                  border-radius: 2px;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                  box-sizing: border-box;
                  letter-spacing: 0.2px;
                  margin-top: 1px;

                  &.tag-overworld {
                    color: #24522a;
                    background: #edf4ec;
                    border: 1px solid #a3c4a8;
                  }

                  &.tag-dungeon {
                    color: #1e3d66;
                    background: #eef3f9;
                    border: 1px solid #9db5d2;
                  }

                  &.tag-fate {
                    color: #7c4708;
                    background: #fdf6e6;
                    border: 1px solid #d9b87b;
                  }

                  &.tag-leve {
                    color: #17544b;
                    background: #ecf5f3;
                    border: 1px solid #9cc4bd;
                  }

                  &.tag-guildorder {
                    color: #38306b;
                    background: #f1eff8;
                    border: 1px solid #b3a7d4;
                  }
                }

                .habitat-plain-text {
                  font-size: 11.5px;
                  font-weight: 600;
                  color: #3b2d1d;
                  line-height: 16px;
                  margin-top: 2px;
                  word-break: break-all;
                  flex: 1;
                  min-width: 0;
                }

                .habitat-map-btn {
                  display: inline-flex;
                  flex-wrap: wrap;
                  align-items: center;
                  gap: 2px 4px;
                  padding: 1px 6px;
                  background: #fbf8f2;
                  border: 1px solid #cbbeae;
                  border-radius: 4px;
                  font-size: 11.5px;
                  color: #433221;
                  line-height: 16px;
                  min-height: 20px;
                  cursor: pointer;
                  user-select: none;
                  transition: all 0.15s ease;
                  text-align: left;
                  box-sizing: border-box;
                  max-width: 100%;
                  flex-shrink: 1;

                  .map-pin-icon {
                    color: #8c430e;
                    flex-shrink: 0;
                    width: 12px;
                    height: 12px;
                    margin-top: 2px;
                    align-self: flex-start;
                    transition:
                      transform 0.15s ease,
                      color 0.15s ease;
                  }

                  .location-name {
                    font-size: 11.5px;
                    font-weight: 700;
                    color: #2e2012;
                    line-height: 16px;
                    word-break: break-word;
                  }

                  .location-coords {
                    display: inline-flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 1px 3px;

                    .coord-badge {
                      display: inline-block;
                      font-size: 11px;
                      font-family: Consolas, "Courier New", monospace;
                      font-weight: 700;
                      color: #7b4c16;
                      line-height: 16px;
                      letter-spacing: -0.5px;
                      transition: color 0.15s;

                      &:not(:last-child)::after {
                        content: ",";
                      }

                      .coord-paren {
                        display: inline-block;
                        transform: scaleX(0.75);
                        margin: 0 -0.5px;
                      }
                    }
                  }

                  .location-coords-note {
                    font-size: 10.5px;
                    color: #8c7d6b;
                    line-height: 16px;
                  }

                  &:hover {
                    background: #f5ebe0;
                    border-color: #8c430e;
                    color: #8c430e;
                    box-shadow: 0 1px 3px rgba(140, 67, 14, 0.12);

                    .map-pin-icon {
                      color: #b45309;
                      transform: scale(1.1);
                    }

                    .location-coords .coord-badge {
                      color: #8c430e;
                    }
                  }

                  &:active {
                    background: #ede0cf;
                    transform: translateY(1px);
                  }
                }
              }

              .habitat-empty-placeholder {
                font-size: 12px;
                color: #a59888;
                line-height: 26px;
                height: 26px;
                font-style: italic;
              }
            }

            &.main-habitat-col {
              flex: 0 0 calc(50% - 6px);
              width: calc(50% - 6px);
              max-width: calc(50% - 6px);
            }

            &.substitute-col {
              flex: 0 0 calc(50% - 6px);
              width: calc(50% - 6px);
              max-width: calc(50% - 6px);
            }
          }
        }
      }

      .habitat-desc {
        margin-top: 6px;
        font-size: 11px;
        color: #9c8d7c;
        line-height: 1.45;
        max-height: 34px;
        overflow-y: auto;
        padding-right: 6px;
        flex-shrink: 0;
        scrollbar-width: thin;
        scrollbar-color: #dcd4c6 transparent;

        &::-webkit-scrollbar {
          width: 3px;
        }

        &::-webkit-scrollbar-thumb {
          background: #dcd4c6;
          border-radius: 2px;
        }

        &::-webkit-scrollbar-thumb:hover {
          background: #bfaea0;
        }
      }

      .empty-detail {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-size: 16px;
        color: #8c7d6b;
      }
    }
  }

  .page-footer-bar {
    width: 100%;
    max-width: 1250px;
    min-width: 0;
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    padding: 0 4px;
    flex-wrap: wrap;
    gap: 8px;

    .footer-mark-tools {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: #8c7d6b;

      .tools-label {
        font-weight: 600;
        color: #8c7d6b;
      }

      :deep(.el-checkbox) {
        margin-right: 0;
        color: #725b44;

        .el-checkbox__label {
          font-size: 12px;
          padding-left: 4px;
        }

        .el-checkbox__inner {
          border-color: #cbbeae;
          background-color: #faf7f2;
        }

        &.is-checked {
          .el-checkbox__label {
            color: #533f2c;
          }

          .el-checkbox__inner {
            background-color: #836f58;
            border-color: #836f58;
          }
        }
      }

      .batch-btn {
        height: 22px;
        padding: 0 8px;
        font-size: 12px;
        background-color: #f2ece2;
        border: 1px solid #d8cdbf;
        color: #6d5b47;
        border-radius: 4px;

        &:hover {
          background-color: #ebe3d6;
          border-color: #c4b4a0;
          color: #4b3b2a;
        }
      }
    }

    .footer-credit {
      font-size: 11px;
      color: #9c8d7c;
      text-align: center;
      user-select: text;

      .credit-link {
        color: #7b4c16;
        text-decoration: underline;
        margin-left: 2px;
        transition: color 0.15s;

        &:hover {
          color: #d6942c;
        }
      }
    }

    .footer-cmd-tips {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #8c7d6b;

      .tip-title {
        font-weight: 700;
        color: #7a6a58;
      }

      .cmd-badge {
        display: inline-block;
        padding: 1px 6px;
        background: #f2ece2;
        border: 1px solid #d8cdbf;
        border-radius: 4px;
        font-family: Consolas, "Courier New", monospace;
        font-weight: 600;
        color: #5c4226;
        cursor: help;
        transition: all 0.15s;

        &:hover {
          background: #ebe3d6;
          border-color: #c4b4a0;
        }
      }

      .tip-desc {
        color: #8c7d6b;
      }

      .tip-sep {
        color: #c8beaf;
        margin: 0 2px;
      }
    }
  }

  @media (max-width: 1079px) and (min-width: 861px) {
    padding: 16px 12px 24px;

    .bstbook-container {
      .left-panel {
        width: 450px;
        padding: 12px 14px 10px;

        .grid-panel {
          grid-template-columns: repeat(5, 74px);
          gap: 10px 12px;
          justify-content: center;

          .slot-card {
            width: 74px;
            height: 80px;

            .beast-icon {
              width: 56px;
              height: 56px;
            }
          }
        }
      }

      .right-panel {
        padding: 14px 16px 12px;

        .meta-section {
          gap: 12px;

          .avatar-wrap {
            width: 92px;
            height: 92px;
          }

          .borrow-card {
            width: 78px;
            min-width: 78px;
          }
        }

        .habitat-desc {
          margin-top: 6px;
          max-height: 34px;
        }
      }
    }
  }

  @media (max-width: 860px) {
    padding: 14px 10px 24px;

    .bstbook-container {
      flex-direction: column;
      height: auto;
      min-height: auto;
      max-height: unset;
      overflow: visible;

      .left-panel {
        width: 100%;
        max-width: 490px;
        margin: 0 auto;
        padding: 14px 12px 10px;

        .grid-panel {
          grid-template-columns: repeat(5, 76px);
          gap: 10px 12px;
          justify-content: center;

          .slot-card {
            width: 76px;
            height: 82px;

            .beast-icon {
              width: 58px;
              height: 58px;
            }
          }
        }
      }

      .right-panel {
        width: 100%;
        border-left: none;
        border-top: 1.5px solid #e8dfd2;
        height: auto;
        min-height: auto;
        max-height: unset;
        overflow: visible;
        padding: 16px 16px 18px;

        .habitat-desc {
          max-height: unset;
          overflow-y: visible;
          margin-top: 10px;
        }
      }
    }

    .page-footer-bar {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      text-align: center;

      .footer-mark-tools {
        justify-content: center;
        flex-wrap: wrap;
      }

      .footer-cmd-tips {
        justify-content: center;
        flex-wrap: wrap;
      }
    }
  }

  @media (max-width: 560px) {
    padding: 10px 8px 20px;

    .filter-panel {
      padding: 8px 10px;

      .filter-section .filter-row {
        gap: 6px;

        .filter-item.search-item {
          width: 100%;
          max-width: 100%;

          :deep(.el-input) {
            width: 100%;
          }
        }
      }
    }

    .bstbook-container {
      .left-panel {
        padding: 10px 8px 10px;

        .panel-header {
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }

        .grid-panel {
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 6px 4px;

          .slot-card {
            width: 100%;
            height: auto;
            aspect-ratio: 82 / 88;
            min-width: 0;
            padding-top: 2px;

            .beast-icon {
              width: 78%;
              height: 78%;
              border-radius: 3px;
            }

            .unknown-mark {
              font-size: 20px;
              margin-top: 8px;
            }

            .slot-level-badge {
              font-size: 9px;
              right: 2px;
              top: 2px;
            }

            .slot-name-badge {
              height: 17px;
              padding: 0 2px;

              .badge-number {
                font-size: 10px;
                min-width: 16px;
              }

              .badge-name {
                font-size: 10px;
              }
            }
          }
        }
      }

      .right-panel {
        padding: 12px 10px 14px;

        .detail-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .meta-section {
          flex-wrap: wrap;
          gap: 10px;

          .avatar-wrap {
            width: 80px;
            height: 80px;
          }

          .attrs-wrap {
            min-width: 100%;
            font-size: 13px;
          }

          .borrow-card {
            margin-left: 0;
            width: 100%;
            max-width: 100%;
            padding: 6px 10px;

            .borrow-box {
              flex-direction: row;
              gap: 10px;
              align-items: center;

              .borrow-icon-wrap {
                width: 40px;
                height: 40px;
                flex-shrink: 0;
              }

              .borrow-name {
                text-align: left;
                margin-top: 0;
              }
            }
          }
        }

        .skill-item .skill-main {
          flex-wrap: wrap;
          gap: 8px;

          .skill-range-tag {
            margin-left: 0;
            align-self: flex-start;
          }
        }

        .habitat-section .habitat-location .habitat-item-row {
          flex-wrap: wrap;
          gap: 4px;

          .habitat-map-btn {
            flex-wrap: wrap;
            word-break: break-all;
            max-width: 100%;
          }
        }
      }
    }
  }
}
</style>
