<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ElCheckbox, ElDialog, ElLoadingDirective as vLoading } from "element-plus";
import {
  getBeastEventTagClass,
  getBeastEventTagLabel,
  type BeastHabitatType,
} from "@/resources/beastbook";

interface EorzeaMapMarker {
  remove?(): void;
  addTo?(map: unknown): void;
}

interface EorzeaMapInstance {
  loadMapKey(key: number): Promise<void>;
  addMarker(marker: unknown): void;
  setView(latlng: unknown, zoom: number, options?: { animate?: boolean }): void;
  mapToLatLng2D(x: number, y: number): unknown;
  invalidateSize(options?: { animate?: boolean }): void;
  mapInfo: unknown;
  remove?(): void;
}

interface EorzeaMapGlobal {
  create(el: HTMLElement): Promise<EorzeaMapInstance>;
  simpleMarker(x: number, y: number, iconUrl: string, mapInfo: unknown): unknown;
  setCdnUrl(url: string): void;
  loader: {
    getIconUrl(path: string): string;
  };
}

interface GlobalWithEorzeaMap extends Window {
  YZWF?: {
    eorzeaMap?: EorzeaMapGlobal;
  };
  $?: unknown;
  jQuery?: unknown;
}

export interface BeastCoord {
  x: number;
  y: number;
}

export interface BeastHabitatItem {
  Summary: string;
  Type: BeastHabitatType;
  MapId?: number;
  Coords?: BeastCoord[];
  CoordsNote?: string;
  Level?: string;
  MobName?: string;
  EventName?: string;
  Note?: string;
}

export interface BeastListItem {
  Number: number;
  Name: string;
  Taxonomy: string;
  AutoAttackType: string;
  BorrowName: string;
  ReleaseName: string;
  ReleaseRange: string;
  OrderName: string;
  OrderRange: string;
  Habitat: string;
  Level: string;
  IconUrl: string;
  Habitats?: BeastHabitatItem[];
  CommunityHabitats?: BeastHabitatItem[];
}

interface MapMonsterItem {
  number: number;
  primaryName: string;
  subName?: string;
  eventTag?: string;
  eventName?: string;
  note?: string;
  level: string;
  sortLevel: number;
  iconUrl: string;
  coords: BeastCoord[];
  coordsText: string;
  isCaptured: boolean;
  isSelected: boolean;
  habitatItem?: BeastHabitatItem;
}

const props = defineProps<{
  modelValue: boolean;
  beastName: string;
  subName?: string;
  eventTag?: string;
  eventName?: string;
  habitatName: string;
  mapId?: number;
  coords?: BeastCoord[];
  allBeasts?: BeastListItem[];
  captured?: Record<string, boolean>;
  currentBeastNumber?: number;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "selectBeast", beastNumber: number, habitat?: BeastHabitatItem): void;
  (e: "toggleCapture", beastNumber: number, captured: boolean): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit("update:modelValue", val),
});

const mapContainerRef = ref<HTMLElement | null>(null);
const loading = ref(false);
let mapInstance: EorzeaMapInstance | null = null;
let scriptLoadPromise: Promise<void> | null = null;

const activeBeastNumber = ref<number>(props.currentBeastNumber ?? 0);
const activePrimaryName = ref<string>(props.beastName);
const activeSubName = ref<string | undefined>(props.subName);
const activeEventTag = ref<string | undefined>(props.eventTag);
const activeEventName = ref<string | undefined>(props.eventName);
const activeCoords = ref<BeastCoord[]>([]);

const isCurrentBeastCaptured = computed<boolean>({
  get: () => {
    if (!props.captured || !activeBeastNumber.value) return false;
    return Boolean(props.captured[activeBeastNumber.value.toString()]);
  },
  set: (val: boolean) => {
    if (!props.captured || !activeBeastNumber.value) return;
    props.captured[activeBeastNumber.value.toString()] = val;
    emit("toggleCapture", activeBeastNumber.value, val);
  },
});

function getInitialCoords(): BeastCoord[] {
  return props.coords ?? [];
}

const currentMapId = computed<number | undefined>(() => props.mapId);

const normalizedCoords = computed<BeastCoord[]>(() => {
  if (activeCoords.value.length > 0) return activeCoords.value;
  return getInitialCoords();
});

function parseLevelSort(levelStr?: string): number {
  if (!levelStr || levelStr.trim() === "-") return 999;
  const nums = levelStr.match(/\d+/g)?.map(Number);
  if (!nums || nums.length === 0) return 999;
  return Math.min(...nums);
}

function getMatchedHabitatsForBeast(
  b: BeastListItem,
  isCurrentSelected: boolean,
): BeastHabitatItem[] {
  const currentTag = activeEventTag.value ?? props.eventTag;
  const currentEvent = activeEventName.value ?? props.eventName;
  const currentSub = activeSubName.value ?? props.subName;

  const allCandidateHabs = [...(b.Habitats ?? []), ...(b.CommunityHabitats ?? [])];

  const mapHabs = allCandidateHabs.filter((h) => {
    if (props.mapId != null && h.MapId !== props.mapId) {
      return false;
    }
    return true;
  });

  if (mapHabs.length === 0) {
    return [];
  }

  if (isCurrentSelected) {
    const exactEvent = mapHabs.find((h) => {
      if (currentEvent && h.EventName === currentEvent) {
        return true;
      }

      if (currentSub && h.MobName === currentSub) {
        return true;
      }

      return false;
    });

    if (exactEvent) {
      return [exactEvent, ...mapHabs.filter((h) => h !== exactEvent)];
    }

    if (currentTag) {
      const tagMatch = mapHabs.find((h) => h.Type?.toLowerCase() === currentTag.toLowerCase());

      if (tagMatch) {
        return [tagMatch, ...mapHabs.filter((h) => h !== tagMatch)];
      }
    }

    if (props.coords?.length) {
      const coordMatch = mapHabs.find((h) =>
        h.Coords?.some((c) => props.coords!.some((pc) => pc.x === c.x && pc.y === c.y)),
      );

      if (coordMatch) {
        return [coordMatch, ...mapHabs.filter((h) => h !== coordMatch)];
      }
    }
  }

  return mapHabs;
}

const mapMonsterList = computed<MapMonsterItem[]>(() => {
  if (!props.allBeasts || props.allBeasts.length === 0) {
    return [];
  }

  const list: MapMonsterItem[] = [];

  for (const b of props.allBeasts) {
    const isSel = b.Number === activeBeastNumber.value;
    const isCurrent = isSel || b.Number === props.currentBeastNumber;

    const matchedHabs = getMatchedHabitatsForBeast(b, isCurrent);

    if (matchedHabs.length === 0) {
      continue;
    }

    const isCap = Boolean(props.captured?.[b.Number.toString()]);

    matchedHabs.forEach((habitat, index) => {
      const coords = habitat.Coords ?? [];
      const level = habitat.Level ?? b.Level ?? "-";

      list.push({
        number: b.Number,
        primaryName: b.Name,
        subName: habitat.MobName,
        eventTag: habitat.Type,
        eventName: habitat.EventName,
        note: habitat.Note,
        level,
        sortLevel: parseLevelSort(level),
        iconUrl: b.IconUrl,
        coords,
        coordsText: coords.map((c) => `X: ${c.x}, Y: ${c.y}`).join(" / "),
        isCaptured: isCap,
        isSelected: isSel && index === 0,
        habitatItem: habitat,
      });
    });
  }

  return list.sort((a, b) => {
    if (a.sortLevel !== b.sortLevel) {
      return a.sortLevel - b.sortLevel;
    }

    return a.number - b.number;
  });
});

const maxLevelColWidth = computed<string>(() => {
  let maxLen = 4;
  for (const item of mapMonsterList.value) {
    const text = item.level.replace(/\s*\/\s*/g, "/");
    if (text.length > maxLen) {
      maxLen = text.length;
    }
  }
  const px = Math.ceil(maxLen * 7.1 + 8);
  return `${Math.max(px, 48)}px`;
});

function loadStyle(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLLinkElement>(`link[href="${href}"]`);
    if (existing) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load style: ${href}`));
    document.head.appendChild(link);
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureLibrariesLoaded(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = (async () => {
    await Promise.all([
      loadStyle("https://code.bdstatic.com/npm/leaflet@1.5.1/dist/leaflet.css"),
      loadStyle(
        "https://code.bdstatic.com/npm/@thewakingsands/eorzea-interactive-map@1.1.1/dist/map.css",
      ),
    ]);

    const win = window as unknown as GlobalWithEorzeaMap;
    if (!win.$ && !win.jQuery) {
      await loadScript("https://code.bdstatic.com/npm/jquery@3.2.1/dist/jquery.min.js");
    }

    if (!win.YZWF?.eorzeaMap) {
      await loadScript(
        "https://code.bdstatic.com/npm/@thewakingsands/eorzea-interactive-map@1.1.1/dist/map.js",
      );
    }

    if (win.YZWF?.eorzeaMap) {
      win.YZWF.eorzeaMap.setCdnUrl("https://map.ffcafe.cn/assets");
    }
  })();

  return scriptLoadPromise;
}

let lastRenderedKey = "";
let loadedMapKey: number | null = null;
let currentCustomMarkers: EorzeaMapMarker[] = [];

async function renderMap(targetCoords?: BeastCoord[]): Promise<void> {
  if (!mapContainerRef.value || !currentMapId.value) return;
  const coords = targetCoords ?? normalizedCoords.value;
  if (coords.length === 0) return;

  const renderKey = `${currentMapId.value}_${coords.map((c) => `${c.x},${c.y}`).join(";")}`;
  if (renderKey === lastRenderedKey && mapInstance) {
    return;
  }
  lastRenderedKey = renderKey;

  loading.value = true;

  try {
    await ensureLibrariesLoaded();
    const win = window as unknown as GlobalWithEorzeaMap;
    const eorzeaMap = win.YZWF?.eorzeaMap;
    if (!eorzeaMap) {
      loading.value = false;
      return;
    }

    if (!mapInstance) {
      mapContainerRef.value.innerHTML = "";
      mapInstance = await eorzeaMap.create(mapContainerRef.value);
    }

    const isMapChanged = loadedMapKey !== currentMapId.value;
    if (isMapChanged) {
      await mapInstance.loadMapKey(currentMapId.value);
      loadedMapKey = currentMapId.value;
      currentCustomMarkers = [];
    } else {
      for (const m of currentCustomMarkers) {
        m.remove?.();
      }
      currentCustomMarkers = [];
    }

    const iconUrl = eorzeaMap.loader.getIconUrl("ui/icon/060000/060561.tex");
    for (const c of coords) {
      const marker = eorzeaMap.simpleMarker(
        c.x,
        c.y,
        iconUrl,
        mapInstance.mapInfo,
      ) as EorzeaMapMarker;
      mapInstance.addMarker(marker);
      currentCustomMarkers.push(marker);
    }

    const first = coords[0];
    if (first) {
      const targetLatLng = mapInstance.mapToLatLng2D(first.x, first.y);
      if (isMapChanged) {
        setTimeout(() => {
          if (mapInstance) {
            mapInstance.setView(targetLatLng, 0);
          }
        }, 300);
      } else {
        mapInstance.setView(targetLatLng, 0, { animate: true });
      }
    }
  } finally {
    loading.value = false;
  }
}

let resizeObserver: ResizeObserver | null = null;

function handleSelectMonster(item: MapMonsterItem): void {
  activeBeastNumber.value = item.number;
  activePrimaryName.value = item.primaryName;
  activeSubName.value = item.subName;
  activeEventTag.value = item.eventTag;
  activeEventName.value = item.eventName;
  activeCoords.value = item.coords;
  emit("selectBeast", item.number, item.habitatItem);
  void renderMap(item.coords);
}

function handleOpened(): void {
  nextTick(() => {
    if (!resizeObserver && mapContainerRef.value && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        mapInstance?.invalidateSize({ animate: false });
      });
      resizeObserver.observe(mapContainerRef.value);
    }
    if (mapInstance) {
      mapInstance.invalidateSize({ animate: false });
      const first = activeCoords.value[0] ?? normalizedCoords.value[0];
      if (first) {
        const targetLatLng = mapInstance.mapToLatLng2D(first.x, first.y);
        mapInstance.setView(targetLatLng, 0, { animate: false });
      }
    } else {
      void renderMap();
    }
  });
}

function handleClose(): void {
  visible.value = false;
  lastRenderedKey = "";
}

watch(
  () => [
    props.modelValue,
    props.habitatName,
    props.coords,
    props.currentBeastNumber,
    props.beastName,
    props.subName,
    props.eventTag,
    props.eventName,
  ],
  () => {
    activeBeastNumber.value = props.currentBeastNumber ?? 0;
    activePrimaryName.value = props.beastName;
    activeSubName.value = props.subName;
    activeEventTag.value = props.eventTag;
    activeEventName.value = props.eventName;
    activeCoords.value = props.coords ?? [];
    if (visible.value) {
      void renderMap();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (mapInstance && typeof mapInstance.remove === "function") {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<template>
  <el-dialog
    v-model="visible"
    class="beast-map-dialog"
    width="92vw"
    top="2.5vh"
    :show-close="false"
    :append-to-body="true"
    @opened="handleOpened"
    @close="handleClose"
  >
    <div class="map-dialog-body">
      <div v-loading="loading" class="map-wrapper">
        <section class="erozea-map-outer">
          <div class="eorzea-map-glass" />
          <div id="beast-eorzea-map" ref="mapContainerRef" class="eorzea-map-inner" />
          <div class="eorzea-map-resize-handler" />
        </section>
      </div>

      <div v-if="mapMonsterList.length > 0" class="sidebar-panel">
        <div class="sidebar-controls">
          <div v-if="activeBeastNumber" class="active-beast-info">
            <div class="active-title-row">
              <span class="active-num">#{{ activeBeastNumber }}</span>
              <span class="active-name">{{ activePrimaryName }}</span>
              <span v-if="activeSubName" class="active-sub-tag">
                {{ activeSubName }}
              </span>
            </div>
            <div
              v-if="getBeastEventTagLabel(activeEventTag) || activeEventName"
              class="active-event-row"
            >
              <span
                v-if="getBeastEventTagLabel(activeEventTag)"
                class="active-event-tag"
                :class="getBeastEventTagClass(activeEventTag)"
              >
                {{ getBeastEventTagLabel(activeEventTag) }}
              </span>
              <span v-if="activeEventName" class="active-event-title">
                {{ activeEventName }}
              </span>
            </div>
          </div>
          <div class="controls-actions">
            <el-checkbox
              v-if="activeBeastNumber"
              v-model="isCurrentBeastCaptured"
              size="large"
              class="header-capture-checkbox"
            >
              已捕获该魔兽
            </el-checkbox>
            <button
              type="button"
              class="dialog-close-btn"
              title="关闭"
              aria-label="关闭"
              @click="handleClose"
            >
              <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
                <path
                  d="M576 512l277.333333-277.333333c17.066667-17.066667 17.066667-46.933333 0-64s-46.933333-17.066667-64 0L512 448 234.666667 170.666667c-17.066667-17.066667-46.933333-17.066667-64 0s-17.066667 46.933333 0 64L448 512 170.666667 789.333333c-17.066667 17.066667-17.066667 46.933333 0 64 8.533333 8.533333 19.2 12.8 32 12.8s23.466667-4.266667 32-12.8L512 576l277.333333 277.333333c8.533333 8.533333 19.2 12.8 32 12.8s23.466667-4.266667 32-12.8c17.066667-17.066667 17.066667-46.933333 0-64L576 512z"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="map-sidebar">
          <div class="sidebar-table-head">
            <span class="col-cell col-num">序号</span>
            <span class="col-cell col-icon-placeholder" />
            <span class="col-cell col-name">名称</span>
            <span class="col-cell col-level" :style="{ width: maxLevelColWidth }">等级</span>
            <span class="col-cell col-coords">坐标</span>
          </div>
          <div class="sidebar-list">
            <div
              v-for="item in mapMonsterList"
              :key="item.number"
              class="sidebar-item"
              :class="{
                captured: item.isCaptured,
                active: item.isSelected,
              }"
              @click="handleSelectMonster(item)"
            >
              <span class="col-cell col-num">#{{ item.number }}</span>
              <div class="col-cell col-icon-wrap">
                <img :src="item.iconUrl" class="monster-icon" alt="" />
                <span v-if="item.isCaptured" class="captured-mark">✓</span>
              </div>
              <div class="col-cell col-name">
                <div class="name-main-line">
                  <span class="primary-text">{{ item.primaryName }}</span>
                  <span v-if="item.subName" class="sub-text">{{ item.subName }}</span>
                </div>
                <div
                  v-if="getBeastEventTagLabel(item.eventTag) || item.eventName || item.note"
                  class="name-event-line"
                >
                  <span
                    v-if="getBeastEventTagLabel(item.eventTag)"
                    class="event-tag-badge"
                    :class="getBeastEventTagClass(item.eventTag)"
                  >
                    {{ getBeastEventTagLabel(item.eventTag) }}
                  </span>
                  <span v-if="item.eventName" class="event-name-text">
                    {{ item.eventName }}
                  </span>
                  <span v-if="item.note" class="event-note-text" :title="item.note">
                    ({{ item.note }})
                  </span>
                </div>
              </div>
              <span class="col-cell col-level" :style="{ width: maxLevelColWidth }">
                {{ item.level.replace(/\s*\/\s*/g, "/") }}
              </span>
              <div class="col-cell col-coords">
                <div v-for="(coord, cIdx) in item.coords" :key="cIdx" class="coord-pair">
                  <span class="coord-paren">(</span>
                  <span class="coord-val">{{ coord.x }}</span>
                  <span class="coord-sep">,</span>
                  <span class="coord-val">{{ coord.y }}</span>
                  <span class="coord-paren">)</span>
                </div>
                <div v-if="item.coords.length === 0" class="coord-pair coord-empty">-</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
:deep(.el-dialog.beast-map-dialog) {
  width: 92vw;
  min-width: 960px;
  max-width: 1720px;
  background: #faf7f0;
  border: 1.5px solid #d4c8b8;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.22);
  margin-bottom: 20px;

  .el-dialog__header {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
  }

  .el-dialog__body {
    padding: 12px;
  }
}

.map-dialog-body {
  display: flex;
  gap: 14px;
  height: 82vh;
  min-height: 600px;
  max-height: 980px;
}

.map-wrapper {
  flex: 1;
  min-width: 0;
  height: 100%;
  background: #111;
  border: 1px solid #d4c8b8;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  user-select: none;
  -webkit-user-select: none;

  .erozea-map-outer {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;

    .eorzea-map-inner {
      width: 100%;
      height: 100%;
      user-select: none;
      -webkit-user-select: none;

      :deep(*) {
        user-select: none !important;
        -webkit-user-select: none !important;
      }
    }
  }
}

:deep(.leaflet-control-layers-list),
:deep(.leaflet-control-layers-scrollbar) {
  max-height: none !important;
  overflow: hidden !important;
  scrollbar-width: none;
}

:deep(.leaflet-control-layers-list::-webkit-scrollbar),
:deep(.leaflet-control-layers-scrollbar::-webkit-scrollbar) {
  display: none;
}

.sidebar-panel {
  width: 460px;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .sidebar-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 2px;
    min-height: 38px;
    height: auto;
    flex-shrink: 0;

    .active-beast-info {
      display: flex;
      flex-direction: column;
      justify-content: center;
      user-select: none;
      gap: 2px;
      min-width: 0;

      .active-title-row {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 6px;

        .active-num {
          font-size: 15px;
          font-weight: 800;
          color: #753b08;
        }

        .active-name {
          font-size: 16px;
          font-weight: 800;
          color: #1a1006;
          word-break: break-word;
        }

        .active-sub-tag {
          font-size: 11px;
          font-weight: 700;
          color: #7e5210;
          background: #fbf4e6;
          border: 1px solid #dec08a;
          padding: 0 5px;
          border-radius: 2px;
          line-height: 15px;
          white-space: nowrap;
        }
      }

      .active-event-row {
        display: flex;
        align-items: center;
        gap: 6px;

        .active-event-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 0 4px;
          border-radius: 2px;
          line-height: 14px;
          height: 14px;
          flex-shrink: 0;
          white-space: nowrap;

          &.tag-fate {
            color: #7e5210;
            background: #fbf4e6;
            border: 1px solid #dec08a;
          }

          &.tag-overworld {
            color: #1c5947;
            background: #e8f4f0;
            border: 1px solid #9ecbbd;
          }

          &.tag-leve {
            color: #1c5947;
            background: #e8f4f0;
            border: 1px solid #9ecbbd;
          }

          &.tag-guildhest {
            color: #29437a;
            background: #edf0f8;
            border: 1px solid #abb7da;
          }

          &.tag-dungeon {
            color: #2b496e;
            background: #edf2f7;
            border: 1px solid #a8bdd6;
          }
        }

        .active-event-title {
          font-size: 12px;
          font-weight: 600;
          color: #5c4a38;
          line-height: 1.25;
        }
      }
    }

    .controls-actions {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }

    .header-capture-checkbox {
      margin: 0;
      cursor: pointer;
      user-select: none;
      --el-checkbox-checked-bg-color: #257a2b;
      --el-checkbox-checked-input-border-color: #257a2b;
      --el-checkbox-input-border-color-hover: #257a2b;

      :deep(.el-checkbox__inner) {
        border: 1.8px solid #4a3622;
        border-radius: 3px;
        background: #ffffff;
        transition: all 0.15s ease;
      }

      &:hover {
        :deep(.el-checkbox__inner) {
          border-color: #257a2b;
        }
        :deep(.el-checkbox__label) {
          color: #257a2b;
        }
      }

      &.is-checked {
        :deep(.el-checkbox__inner) {
          background-color: #257a2b;
          border-color: #257a2b;
        }

        :deep(.el-checkbox__label) {
          color: #1b5e20;
          font-weight: 800;
        }
      }

      :deep(.el-checkbox__label) {
        font-size: 15px;
        font-weight: 700;
        color: #1a1006;
        padding-left: 8px;
        letter-spacing: 0.5px;
        transition: color 0.15s ease;
      }
    }

    .dialog-close-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: #6e5741;
      padding: 0;
      transition: all 0.15s ease;

      &:hover {
        background: #ebdcc8;
        color: #1a1006;
      }
    }
  }

  .map-sidebar {
    flex: 1;
    min-height: 0;
    width: 100%;
    height: auto;
    display: flex;
    flex-direction: column;
    background: #fdfbf7;
    border: 1px solid #d8cdbf;
    border-radius: 4px;
    box-sizing: border-box;
    overflow: hidden;

    .sidebar-table-head {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: #f0e7db;
      border-bottom: 1px solid #dccebd;
      font-size: 12.5px;
      font-weight: 700;
      color: #6b553e;
      flex-shrink: 0;
      font-family: inherit;

      .col-cell {
        font-family: inherit;
      }
    }

    .sidebar-list {
      flex: 1;
      overflow-y: auto;
      padding: 2px 0;
      display: flex;
      flex-direction: column;
      scrollbar-width: thin;
      scrollbar-color: #dcd4c6 transparent;

      &::-webkit-scrollbar {
        width: 5px;
      }

      &::-webkit-scrollbar-thumb {
        background: #dcd4c6;
        border-radius: 2px;
      }

      .sidebar-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-bottom: 1px solid #efe6d8;
        background: transparent;
        cursor: pointer;
        position: relative;
        transition: background-color 0.15s ease;

        &:hover {
          background: #f4ede1;
        }

        &.active {
          background: #fff6e6;
          box-shadow:
            inset 0 1px 0 #fae7cb,
            inset 0 -1px 0 #fae7cb;

          &::before {
            content: "";
            position: absolute;
            left: 3px;
            top: 50%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-top: 5px solid transparent;
            border-bottom: 5px solid transparent;
            border-left: 6px solid #d47e12;
          }

          .col-level {
            color: #b05700 !important;
            font-weight: 800;
          }

          .col-num {
            color: #b05700 !important;
            font-weight: 700;
          }

          .col-name {
            color: #b05700 !important;
            font-weight: 900;
          }

          .col-coords .coord-val {
            color: #8f4500 !important;
            font-weight: 800;
          }

          .col-coords .coord-paren,
          .col-coords .coord-sep {
            color: #b05700 !important;
            font-weight: 700;
          }

          .col-icon-wrap .monster-icon {
            opacity: 1 !important;
            filter: none !important;
            box-shadow: 0 0 0 1.5px #d47e12;
          }
        }

        &.captured {
          .col-level,
          .col-coords .coord-val,
          .col-coords .coord-paren,
          .col-coords .coord-sep {
            color: #b5a898 !important;
            font-weight: 400;
          }

          .col-num {
            color: #baaea0;
            font-weight: 400;
          }

          .col-name {
            color: #9c8e7e;
            font-weight: 500;
          }

          .col-icon-wrap .monster-icon {
            opacity: 0.45;
            filter: grayscale(60%);
          }
        }
      }
    }

    .col-cell {
      min-width: 0;
    }

    .col-level {
      text-align: center;
      flex-shrink: 0;
      white-space: nowrap;
      font-family: Consolas, "Segoe UI", monospace;
      font-variant-numeric: tabular-nums;
      font-size: 12.5px;
      font-weight: 700;
      color: #4a3622;
      line-height: 1.2;
      letter-spacing: -0.2px;
    }

    .col-icon-placeholder,
    .col-icon-wrap {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;

      .monster-icon {
        width: 44px;
        height: 44px;
        border-radius: 4px;
        object-fit: cover;
        display: block;
      }

      .captured-mark {
        position: absolute;
        top: -3px;
        right: -3px;
        width: 16px;
        height: 16px;
        background: #2e7d32;
        color: #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 900;
        border: 1.5px solid #ffffff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
        box-sizing: border-box;
      }
    }

    .col-num {
      width: 36px;
      text-align: center;
      flex-shrink: 0;
      font-family: Consolas, monospace;
      font-variant-numeric: tabular-nums;
      font-size: 12.5px;
      font-weight: 600;
      color: #7b6855;
    }

    .col-name {
      flex: 1;
      min-width: 0;
      text-align: left;
      padding-left: 2px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;

      .name-main-line {
        display: flex;
        align-items: baseline;
        gap: 5px;
        flex-wrap: wrap;

        .primary-text {
          font-size: 14px;
          font-weight: 700;
          color: #2b1f13;
          word-break: break-word;
        }

        .sub-text {
          font-size: 11px;
          font-weight: 700;
          color: #7e5210;
          background: #fbf4e6;
          border: 1px solid #dec08a;
          padding: 0 4px;
          border-radius: 2px;
          line-height: 14px;
          white-space: nowrap;
        }
      }

      .name-event-line {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        line-height: 1.25;

        .event-tag-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 0 3px;
          border-radius: 2px;
          line-height: 13px;
          height: 13px;
          flex-shrink: 0;
          white-space: nowrap;

          &.tag-fate {
            color: #7e5210;
            background: #fbf4e6;
            border: 1px solid #dec08a;
          }

          &.tag-overworld {
            color: #1c5947;
            background: #e8f4f0;
            border: 1px solid #9ecbbd;
          }

          &.tag-dungeon {
            color: #2b496e;
            background: #edf2f7;
            border: 1px solid #a8bdd6;
          }
        }

        .event-name-text {
          font-size: 11.5px;
          color: #705d4b;
          font-weight: 600;
          white-space: normal;
          line-height: 1.25;
          word-break: break-all;
        }

        .event-note-text {
          font-size: 11px;
          color: #8c7d6b;
          font-weight: 500;
          white-space: normal;
          line-height: 1.25;
          word-break: break-all;
        }
      }
    }

    .col-coords {
      width: 82px;
      text-align: center;
      flex-shrink: 0;
      font-family: Consolas, monospace;
      font-variant-numeric: tabular-nums;
      font-size: 12.5px;
      font-weight: 600;
      color: #4a3622;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;

      .coord-pair {
        display: inline-flex;
        align-items: baseline;
        justify-content: center;
        line-height: 17px;
        white-space: nowrap;
        letter-spacing: -0.4px;

        .coord-paren {
          color: #9c8a77;
          font-weight: normal;
          padding: 0;
        }

        .coord-sep {
          color: #9c8a77;
          margin-right: 2px;
        }

        .coord-val {
          color: #4a3622;
          font-weight: 600;
        }
      }

      .coord-empty {
        color: #b5a898;
      }
    }
  }
}

@media (max-width: 960px) {
  :deep(.el-dialog.beast-map-dialog) {
    width: 96vw !important;
    max-width: 98vw !important;
    margin-top: 1.5vh !important;

    .el-dialog__header {
      display: none !important;
    }

    .el-dialog__body {
      padding: 8px 10px 12px;
      overflow-x: auto;
    }
  }

  .map-dialog-body {
    min-width: 760px;
  }

  .sidebar-panel {
    width: 420px;
  }
}
</style>
