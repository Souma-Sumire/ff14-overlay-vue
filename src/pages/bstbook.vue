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
  ElRadioButton,
  ElRadioGroup,
  ElTooltip,
} from "element-plus";
import beastbookData from "@/assets/data/beastbook.json";
import beastConstants from "@/assets/data/beastbookConstants.json";

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

export interface BeastEntry {
  Number: number;
  Name: string;
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
  Coords?: { x: number; y: number };
  Icon?: number;
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
const selectedOverworldHabitats = ref<string[]>([...OVERWORLD_HABITATS]);
const selectedDungeonHabitats = ref<string[]>([...DUNGEON_HABITATS]);
const selectedReleaseRanges = ref<string[]>([...ALL_RANGES]);
const selectedOrderRanges = ref<string[]>([...ALL_RANGES]);
const selectedCaptureStatus = ref<string[]>([...ALL_CAPTURE_STATUS]);

function getShortName(name: string): string {
  return name.replace(/种$/, "");
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
    selectedOverworldHabitats,
    selectedDungeonHabitats,
    selectedReleaseRanges,
    selectedOrderRanges,
    selectedCaptureStatus,
  ],
  () => {
    nextTick(() => {
      page.value = 1;
    });
  },
);

function toRoman(num: number): string {
  const lookup: [number, string][] = [
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let roman = "";
  let n = num;
  for (const [val, sym] of lookup) {
    while (n >= val) {
      roman += sym;
      n -= val;
    }
  }
  return roman || num.toString();
}

function isBeastMatched(v: BeastEntry): boolean {
  const isCap = Boolean(captured.value[v.Number.toString()]);
  const statusText = isCap ? "已拥有" : "未拥有";
  if (!selectedCaptureStatus.value.includes(statusText)) return false;
  if (!selectedTaxonomies.value.includes(v.Taxonomy)) return false;
  if (!selectedAttackTypes.value.includes(v.AutoAttackType)) return false;
  if (!selectedBorrowActions.value.includes(v.BorrowName)) return false;

  if (selectedHabitatType.value === "overworld") {
    if (v.HabitatType !== "overworld") return false;
    const hab = v.HabitatSummary ?? "--";
    if (!selectedOverworldHabitats.value.includes(hab)) return false;
  } else if (selectedHabitatType.value === "dungeon") {
    if (v.HabitatType !== "dungeon") return false;
    const hab = v.HabitatSummary ?? "--";
    if (!selectedDungeonHabitats.value.includes(hab)) return false;
  }

  if (!selectedReleaseRanges.value.includes(v.ReleaseRange)) return false;
  if (!selectedOrderRanges.value.includes(v.OrderRange)) return false;

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
    (v.Coords ? reg.test(`X: ${v.Coords.x}, Y: ${v.Coords.y}`) : false)
  );
}

const matchedBeasts = computed(() => beasts.filter((b) => isBeastMatched(b)));

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
    LargeIconUrl: makeIconUrl(b.Icon, true),
    ReleaseIconUrl: makeIconUrl(b.ReleaseIcon, false),
    OrderIconUrl: makeIconUrl(b.OrderIcon, false),
    BorrowIconUrl: makeIconUrl(b.BorrowIcon, false),
  })),
);

const isSwitching = ref(false);

const currentSlots = computed<SlotItem[]>(() => {
  const slots: SlotItem[] = [];
  const startIndex = (page.value - 1) * PAGE_SIZE;

  for (let i = 0; i < PAGE_SIZE; i++) {
    const beastNumber = startIndex + i + 1;
    const targetBeast = beasts.find((b) => b.Number === beastNumber);
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

const failedHostMap = new WeakMap<HTMLImageElement, Set<string>>();

function handleIconError(
  e: Event,
  number: number,
  field: "IconUrl" | "LargeIconUrl" | "ReleaseIconUrl" | "OrderIconUrl" | "BorrowIconUrl",
): void {
  const img = e.target as HTMLImageElement;
  const entry = beastsDisplay.value.find((v) => v.Number === number);
  if (!entry) return;

  const currentUrl = entry[field];

  if (field === "LargeIconUrl" && /_hr1\.png/.test(currentUrl)) {
    entry[field] = currentUrl.replace("_hr1.png", ".png");
    return;
  }

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
      entry[field] = currentUrl.replace(oldPrefix, newPrefix).replace(currentHost, nextHost);
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
              placeholder="搜索名称 / 技能 / 属性 / 描述 / 坐标"
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
              <el-checkbox-group v-model="selectedOverworldHabitats" size="small">
                <el-checkbox v-for="h in OVERWORLD_HABITATS" :key="h" :value="h" :label="h">
                  {{ h === "--" ? "无" : h }}
                </el-checkbox>
              </el-checkbox-group>
            </div>

            <div v-else-if="selectedHabitatType === 'dungeon'" class="habitat-sub-group">
              <el-checkbox-group v-model="selectedDungeonHabitats" size="small">
                <el-checkbox v-for="h in DUNGEON_HABITATS" :key="h" :value="h" :label="h">
                  {{ h }}
                </el-checkbox>
              </el-checkbox-group>
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
                  @error="handleIconError($event, slot.beast.Number, 'IconUrl')"
                />
                <div v-else class="unknown-mark">?</div>

                <div class="slot-name-badge" v-html="highlight(getShortName(slot.beast.Name))" />

                <el-checkbox
                  v-if="editingMode"
                  v-model="captured[slot.beast.Number.toString()]"
                  class="slot-checkbox"
                  @click.stop
                />
                <div v-if="!editingMode && slot.isCaptured" class="captured-mark">✓</div>
              </template>
            </div>
            <div class="slot-number">{{ slot.slotNumber }}</div>
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
              <span class="roman-num">{{ toRoman(selectedDisplay.Number) }}</span>
              <span class="name" v-html="highlight(selectedDisplay.Name)" />
            </div>
            <div class="header-capture">
              <el-checkbox
                v-model="captured[selectedDisplay.Number.toString()]"
                label="已捕获该魔兽"
                size="small"
              />
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
                @error="handleIconError($event, selectedDisplay.Number, 'LargeIconUrl')"
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
                      @error="handleIconError($event, selectedDisplay.Number, 'BorrowIconUrl')"
                    />
                    <div v-else class="borrow-placeholder" />
                  </div>
                  <span class="borrow-name" v-html="highlight(selectedDisplay.BorrowName)" />
                </div>
              </el-tooltip>
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
                  @error="handleIconError($event, selectedDisplay.Number, 'ReleaseIconUrl')"
                />
                <div v-else class="skill-placeholder" />
              </div>
              <div class="skill-detail">
                <div class="skill-name" v-html="highlight(selectedDisplay.ReleaseName)" />
                <div class="skill-desc" v-html="highlight(selectedDisplay.ReleaseDescription)" />
              </div>
              <div class="skill-range-tag">{{ selectedDisplay.ReleaseRange }}</div>
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
                  @error="handleIconError($event, selectedDisplay.Number, 'OrderIconUrl')"
                />
                <div v-else class="skill-placeholder" />
              </div>
              <div class="skill-detail">
                <div class="skill-name" v-html="highlight(selectedDisplay.OrderName)" />
                <div class="skill-desc" v-html="highlight(selectedDisplay.OrderDescription)" />
              </div>
              <div class="skill-range-tag">{{ selectedDisplay.OrderRange }}</div>
            </div>
          </div>

          <div class="habitat-section">
            <div class="habitat-title">主要栖息地</div>
            <div class="habitat-location">
              <span class="location-name">{{ selectedDisplay.HabitatSummary ?? "--" }}</span>
              <span v-if="selectedDisplay.Coords" class="habitat-coords">
                X: {{ selectedDisplay.Coords.x }}, Y: {{ selectedDisplay.Coords.y }}
              </span>
              <span
                v-else-if="selectedDisplay.HabitatType === 'dungeon'"
                class="habitat-coords habitat-dungeon-tag"
              >
                副本
              </span>
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
  justify-content: center;
  padding: 16px 0;
  box-sizing: border-box;
  color: #3b2d1d;
  user-select: none;

  .filter-panel {
    width: 1140px;
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

          :deep(.el-checkbox-group) {
            display: flex;
            flex-wrap: wrap;
            gap: 2px 14px;
            align-items: center;
          }

          :deep(.el-checkbox) {
            margin-right: 0;
            color: #3b2d1d;
            height: 24px;

            .el-checkbox__label {
              font-size: 12px;
              padding-left: 5px;
            }
          }
        }

        &.habitat-filter-row {
          .habitat-filter-content {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;

            .habitat-type-radios {
              flex-shrink: 0;

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

            .habitat-sub-group {
              flex: 1;
              display: flex;
              align-items: center;
            }
          }
        }
      }
    }
  }

  .bstbook-container {
    width: 1140px;
    height: 646px;
    min-height: 646px;
    max-height: 646px;
    overflow: hidden;
    display: flex;
    background: #faf7f0;
    border: 1.5px solid #dcd4c6;
    border-radius: 10px;
    box-shadow: 0 3px 16px rgba(0, 0, 0, 0.06);
    box-sizing: border-box;

    .left-panel {
      width: 440px;
      flex-shrink: 0;
      padding: 16px 24px 14px;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;

      .panel-header {
        margin-bottom: 12px;

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
      }

      .grid-panel {
        display: grid;
        grid-template-columns: repeat(5, 68px);
        gap: 6px 12px;
        justify-content: space-between;

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
            width: 66px;
            height: 76px;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding-top: 2px;
            background: #f2ece2;
            border: 1px solid #ddd4c7;
            box-sizing: border-box;
            transition: all 0.15s ease-in-out;

            &:hover {
              border-color: #bfaea0;
              background: #ebe3d6;
            }

            .beast-icon {
              width: 54px;
              height: 54px;
              border-radius: 4px;
              object-fit: cover;
              display: block;
            }

            .unknown-mark {
              font-size: 24px;
              font-weight: bold;
              color: #b5a794;
              margin-top: 14px;
            }

            .slot-name-badge {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 18px;
              line-height: 18px;
              font-size: 11px;
              text-align: center;
              color: #f7eedf;
              background: rgba(36, 26, 17, 0.58);
              border-bottom-left-radius: 5px;
              border-bottom-right-radius: 5px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              padding: 0 2px;
              box-sizing: border-box;
              pointer-events: none;
              z-index: 1;

              :deep(em) {
                background: #f1b332;
                color: #2b1f13;
                font-style: normal;
                padding: 0 1px;
                border-radius: 2px;
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
              top: -4px;
              right: -4px;
              width: 20px;
              height: 20px;
              background: #2e7d32;
              color: #ffffff;
              border: 1.5px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 13px;
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

            .slot-number {
              color: #b5a794;
            }
          }

          &.active:not(.unmatched-cell) .slot-card {
            box-shadow:
              0 0 0 2px #e6a23c,
              0 0 6px rgba(230, 162, 60, 0.4);
            border-color: #e6a23c;
            background: #fdfbf7;
          }

          .slot-number {
            margin-top: 4px;
            font-size: 13px;
            font-weight: bold;
            color: #5d4a36;
            text-align: center;
            min-height: 17px;
            line-height: 17px;
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
      height: 100%;
      min-height: 0;
      max-height: 100%;
      padding: 24px 32px 18px;
      border-left: 1px solid #e8dfd2;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      user-select: text;
      box-sizing: border-box;

      .detail-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        flex-shrink: 0;

        .title-group {
          display: flex;
          align-items: baseline;
          gap: 12px;

          .roman-num {
            font-size: 20px;
            font-weight: bold;
            color: #594735;
            min-width: 44px;
          }

          .name {
            font-size: 21px;
            font-weight: bold;
            color: #2b1f13;
          }
        }

        .header-capture {
          display: flex;
          align-items: center;
          flex-shrink: 0;

          :deep(.el-checkbox) {
            font-weight: 600;
            color: #5d4a36;
          }
        }
      }

      .meta-section {
        display: flex;
        align-items: center;
        gap: 24px;
        margin-bottom: 16px;
        flex-shrink: 0;

        .avatar-wrap {
          width: 120px;
          height: 120px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f2ece2;
          border: 1px solid #d4c8b8;
          border-radius: 8px;
          box-sizing: border-box;
          overflow: hidden;
          padding: 6px;

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
          gap: 12px;
          font-size: 14px;
          min-width: 190px;

          .attr-row {
            display: flex;
            align-items: center;
            gap: 12px;

            .attr-title {
              color: #0b6e51;
              font-weight: 700;
              min-width: 90px;
              font-size: 13px;
            }

            .attr-text {
              color: #332517;
              font-weight: 600;
              font-size: 14px;
            }
          }
        }

        .borrow-card {
          margin-left: auto;
          width: 90px;
          min-width: 90px;
          max-width: 90px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f7f2ea;
          border: 1px solid #dcd4c6;
          border-radius: 8px;
          padding: 8px 6px;
          box-sizing: border-box;

          .borrow-box {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;

            .borrow-icon-wrap {
              width: 50px;
              height: 50px;
              border-radius: 6px;
              background: #f2ece2;
              border: 1.5px solid #d4a853;
              box-sizing: border-box;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 1px 4px rgba(168, 108, 12, 0.15);

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

            .borrow-name {
              width: 100%;
              text-align: center;
              font-size: 13px;
              font-weight: 700;
              color: #2b1f13;
              margin-top: 6px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }
        }
      }

      .skill-item {
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
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 64px;
            max-height: 64px;
            min-height: 64px;
            overflow: hidden;

            .skill-name {
              font-size: 15px;
              font-weight: 700;
              color: #22180f;
              height: 18px;
              line-height: 18px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 2px;
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

          .skill-range-tag {
            margin-left: auto;
            align-self: center;
            font-size: 12px;
            color: #5c4a39;
            background: #ebd8c2;
            padding: 3px 9px;
            border-radius: 4px;
            font-weight: 500;
            line-height: 1.4;
            white-space: nowrap;
            flex-shrink: 0;
          }
        }
      }

      .habitat-section {
        margin-top: 6px;
        flex-shrink: 0;

        .habitat-title {
          font-size: 13px;
          font-weight: 700;
          color: #a86c0c;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .habitat-location {
          display: flex;
          align-items: center;
          gap: 10px;

          .location-name {
            font-size: 13px;
            font-weight: normal;
            color: #2b1c0e;
          }

          .habitat-coords {
            font-size: 13px;
            font-family: Consolas, "Courier New", monospace;
            font-weight: 700;
            color: #7b4c16;
            background: #ede2d3;
            padding: 1px 7px;
            border-radius: 4px;
            border: 1px solid #d5c3ac;

            &.habitat-dungeon-tag {
              font-family: inherit;
              font-size: 12px;
            }
          }
        }
      }

      .habitat-desc {
        margin-top: auto;
        font-size: 12px;
        color: #8c7d6b;
        line-height: 1.5;
        max-height: 42px;
        overflow-y: auto;
        padding-right: 6px;
        flex-shrink: 0;
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
    width: 1140px;
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    padding: 0 4px;

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
}
</style>
