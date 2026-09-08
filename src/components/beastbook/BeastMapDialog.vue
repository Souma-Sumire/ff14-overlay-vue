<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ElDialog, ElLoadingDirective as vLoading } from "element-plus";

interface EorzeaMapInstance {
  loadMapKey(key: number): Promise<void>;
  addMarker(marker: unknown): void;
  setView(latlng: unknown, zoom: number): void;
  mapToLatLng2D(x: number, y: number): unknown;
  invalidateSize(): void;
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

const props = defineProps<{
  modelValue: boolean;
  beastName: string;
  habitatName: string;
  mapId?: number;
  coords?: { x: number; y: number };
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit("update:modelValue", val),
});

const mapContainerRef = ref<HTMLElement | null>(null);
const loading = ref(false);
let mapInstance: EorzeaMapInstance | null = null;
let scriptLoadPromise: Promise<void> | null = null;

const currentMapId = computed<number | undefined>(() => props.mapId);

const externalMapUrl = computed<string>(() => {
  if (!currentMapId.value || !props.coords) return "";
  return `https://map.wakingsands.com/#f=mark&id=${currentMapId.value}&x=${props.coords.x}&y=${props.coords.y}`;
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

async function renderMap(): Promise<void> {
  if (!mapContainerRef.value || !currentMapId.value || !props.coords) return;
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

    const { x, y } = props.coords;
    await mapInstance.loadMapKey(currentMapId.value);

    const iconUrl = eorzeaMap.loader.getIconUrl("ui/icon/060000/060561.tex");
    const marker = eorzeaMap.simpleMarker(x, y, iconUrl, mapInstance.mapInfo);
    mapInstance.addMarker(marker);

    setTimeout(() => {
      if (mapInstance) {
        mapInstance.setView(mapInstance.mapToLatLng2D(x, y), -1);
      }
    }, 150);
  } finally {
    loading.value = false;
  }
}

function handleOpened(): void {
  nextTick(() => {
    if (mapInstance) {
      mapInstance.invalidateSize();
      void renderMap();
    } else {
      void renderMap();
    }
  });
}

function handleClose(): void {
  visible.value = false;
}

watch(
  () => [props.habitatName, props.coords],
  () => {
    if (visible.value) {
      void renderMap();
    }
  },
);

onBeforeUnmount(() => {
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
    width="680px"
    top="8vh"
    :append-to-body="true"
    @opened="handleOpened"
    @close="handleClose"
  >
    <template #header>
      <div class="map-dialog-header">
        <div class="header-titles">
          <span class="beast-title">{{ beastName }}</span>
          <span class="habitat-badge">{{ habitatName }}</span>
          <span v-if="coords" class="coords-badge">X: {{ coords.x }}, Y: {{ coords.y }}</span>
        </div>
        <a
          v-if="externalMapUrl"
          :href="externalMapUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="external-map-link"
        >
          全屏打开
        </a>
      </div>
    </template>

    <div v-loading="loading" class="map-wrapper">
      <section class="erozea-map-outer">
        <div class="eorzea-map-glass" />
        <div id="beast-eorzea-map" ref="mapContainerRef" class="eorzea-map-inner" />
        <div class="eorzea-map-resize-handler" />
      </section>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
:deep(.el-dialog.beast-map-dialog) {
  background: #faf7f0;
  border: 1px solid #d4c8b8;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);

  .el-dialog__header {
    padding: 12px 18px 10px;
    margin-right: 0;
    border-bottom: 1px solid #e8dfd2;
  }

  .el-dialog__body {
    padding: 12px 16px 16px;
  }
}

.map-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 28px;

  .header-titles {
    display: flex;
    align-items: center;
    gap: 8px;

    .beast-title {
      font-size: 16px;
      font-weight: 700;
      color: #2b1f13;
    }

    .habitat-badge {
      font-size: 12px;
      color: #7b4c16;
      background: #ede2d3;
      padding: 1px 6px;
      border-radius: 3px;
      border: 1px solid #d5c3ac;
    }

    .coords-badge {
      font-size: 12px;
      font-family: Consolas, "Courier New", monospace;
      font-weight: 700;
      color: #7b4c16;
      background: #ede2d3;
      padding: 1px 6px;
      border-radius: 3px;
      border: 1px solid #d5c3ac;
    }
  }

  .external-map-link {
    font-size: 12px;
    color: #409eff;
    text-decoration: none;
    border: 1px solid #b3d8ff;
    padding: 2px 8px;
    border-radius: 4px;
    background: #ecf5ff;

    &:hover {
      background: #409eff;
      color: #fff;
    }
  }
}

.map-wrapper {
  width: 100%;
  height: 520px;
  background: #111;
  border: 1px solid #d4c8b8;
  border-radius: 4px;
  overflow: hidden;
  position: relative;

  .erozea-map-outer {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;

    .eorzea-map-inner {
      width: 100%;
      height: 100%;
    }
  }
}
</style>
