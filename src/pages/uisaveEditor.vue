<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Upload,
  Download,
  MapLocation,
  Share,
} from '@element-plus/icons-vue'
import WaymarkDisplay from '@/components/uisaveEditor/WaymarkDisplay.vue'
import type { WayMark, UISaveData } from '@/types/uisave'
import { ZoneInfo } from '@/resources/zoneInfo'
import {
  getTerritoryTypeByMapID,
  getMapIDByTerritoryType,
} from '@/resources/contentFinderCondition'
import ZoneSelecter from '@/components/zoneSelecter.vue'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import { parseUISave, MARKER_MAP, xorCrypt } from '@/utils/uisaveParser'

const { t } = useI18n()

// --- 类型定义 ---
type WayMarkKey = 'A' | 'B' | 'C' | 'D' | 'One' | 'Two' | 'Three' | 'Four'

interface PPJsonPoint {
  X: number
  Y: number
  Z: number
  ID: number
  Active: boolean
}

interface PPJson {
  Name: string
  MapID: number
  A: PPJsonPoint
  B: PPJsonPoint
  C: PPJsonPoint
  D: PPJsonPoint
  One: PPJsonPoint
  Two: PPJsonPoint
  Three: PPJsonPoint
  Four: PPJsonPoint
}

// --- 响应式数据 ---
const fileInput = ref<HTMLInputElement | null>(null)
const parsedData = ref<UISaveData | null>(null)
const isDragging = ref(false)
const isParsing = ref(false)
const hasUnsavedChanges = ref(false)
const displayLimit = ref(6)
let dragCounter = 0

// --- 工具函数 ---

const toFloat = (v: number) => v / 1000
const toInt = (v: number) => Math.round(v * 1000)
const markAsModified = () => {
  hasUnsavedChanges.value = true
}
const isMarkerEnabled = (m: WayMark, bit: number) => (m.enableFlag & bit) !== 0
const toggleMarker = (m: WayMark, bit: number) => {
  const isEnabling = (m.enableFlag & bit) === 0
  m.enableFlag ^= bit
  markAsModified()

  if (isEnabling) {
    const def = MARKER_MAP.find((d) => d.bit === bit)
    if (def) {
      const p = m[def.key]
      if (p.x === 0 && p.y === 0 && p.z === 0) {
        p.x = 100000
        p.z = 100000
      }
    }
  }
}

const updateCoordinate = (
  m: WayMark,
  mKey: WayMarkKey,
  coordKey: 'x' | 'y' | 'z',
  val: number | undefined,
) => {
  if (val !== undefined) {
    m[mKey][coordKey] = toInt(val)
    markAsModified()
  }
}

// --- 解析 & 序列化 ---
async function handleFile(file: File) {
  const loading = (await import('element-plus')).ElLoading.service({
    lock: true,
    text: '正在解析 UISAVE.DAT...',
    background: 'rgba(0, 0, 0, 0.7)',
  })
  isParsing.value = true

  try {
    // 使用 setTimeout 确保 Loading UI 有机会渲染
    await new Promise((resolve) => setTimeout(resolve, 50))
    
    parsedData.value = await parseUISave(await file.arrayBuffer())

    // 性能优化：分步加载剩余卡片
    displayLimit.value = 12
    const expandDisplay = () => {
      if (
        parsedData.value &&
        displayLimit.value < parsedData.value.wayMarks.length
      ) {
        displayLimit.value += 12
        requestAnimationFrame(expandDisplay)
      }
    }
    requestAnimationFrame(expandDisplay)

    requestAnimationFrame(expandDisplay)

    ElMessage.success(t('uisaveEditor.importSuccess'))
    hasUnsavedChanges.value = false
  } catch (e: unknown) {
    ElMessage.error(`解析失败: ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    isParsing.value = false
    loading.close()
  }
}

function exportFile() {
  if (!parsedData.value) return
  const {
    wayMarks,
    markerHeader,
    markerTail,
    otherSections,
    userID,
    payloadUnknown,
    fileFormatVersion,
    fileUnknown,
  } = parsedData.value

  const markerData = new Uint8Array(
    16 + wayMarks.length * 104 + markerTail.length,
  )
  markerData.set(markerHeader, 0)
  wayMarks.forEach((wm, i) => {
    const offset = 16 + i * 104
    const view = new DataView(
      markerData.buffer,
      markerData.byteOffset + offset,
      104,
    )
    MARKER_MAP.forEach((m, idx) => {
      view.setInt32(idx * 12, wm[m.key].x, true)
      view.setInt32(idx * 12 + 4, wm[m.key].y, true)
      view.setInt32(idx * 12 + 8, wm[m.key].z, true)
    })
    markerData[offset + 96] = wm.enableFlag
    markerData[offset + 97] = wm.unknown
    view.setUint16(98, wm.regionID, true)
    view.setInt32(100, wm.timestamp, true)
  })
  markerData.set(markerTail, 16 + wayMarks.length * 104)

  const fmarker = new Uint8Array(16 + markerData.length + 4)
  const fView = new DataView(fmarker.buffer)
  fView.setInt16(0, 17, true)
  fView.setInt32(8, markerData.length, true)
  fmarker.set(markerData, 16)

  const decrypted = new Uint8Array(16 + otherSections.length + fmarker.length)
  decrypted.set(payloadUnknown, 0)
  new DataView(decrypted.buffer).setBigInt64(8, userID, true)
  decrypted.set(otherSections, 16)
  decrypted.set(fmarker, 16 + otherSections.length)

  const encrypted = xorCrypt(decrypted)
  const final = new Uint8Array(16 + encrypted.length)
  const valView = new DataView(final.buffer)
  final.set(fileFormatVersion, 0)
  valView.setInt32(8, encrypted.length, true)
  final.set(fileUnknown, 12)
  final.set(encrypted, 16)

  const url = URL.createObjectURL(
    new Blob([final], { type: 'application/octet-stream' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = 'UISAVE.DAT'
  a.click()
  URL.revokeObjectURL(url)
  hasUnsavedChanges.value = false
  ElMessage.success(t('uisaveEditor.exportSuccess'))
}

async function copyMark(index: number) {
  const wm = parsedData.value?.wayMarks[index]
  if (!wm) return
  const zone = ZoneInfo[getTerritoryTypeByMapID(wm.regionID)]
  const ppJson: PPJson = {
    Name: zone?.name.cn || zone?.name.en || `Zone_${wm.regionID}`,
    MapID: wm.regionID,
    A: {
      X: toFloat(wm.A.x),
      Y: toFloat(wm.A.y),
      Z: toFloat(wm.A.z),
      ID: 0,
      Active: isMarkerEnabled(wm, 0x01),
    },
    B: {
      X: toFloat(wm.B.x),
      Y: toFloat(wm.B.y),
      Z: toFloat(wm.B.z),
      ID: 1,
      Active: isMarkerEnabled(wm, 0x02),
    },
    C: {
      X: toFloat(wm.C.x),
      Y: toFloat(wm.C.y),
      Z: toFloat(wm.C.z),
      ID: 2,
      Active: isMarkerEnabled(wm, 0x04),
    },
    D: {
      X: toFloat(wm.D.x),
      Y: toFloat(wm.D.y),
      Z: toFloat(wm.D.z),
      ID: 3,
      Active: isMarkerEnabled(wm, 0x08),
    },
    One: {
      X: toFloat(wm.One.x),
      Y: toFloat(wm.One.y),
      Z: toFloat(wm.One.z),
      ID: 4,
      Active: isMarkerEnabled(wm, 0x10),
    },
    Two: {
      X: toFloat(wm.Two.x),
      Y: toFloat(wm.Two.y),
      Z: toFloat(wm.Two.z),
      ID: 5,
      Active: isMarkerEnabled(wm, 0x20),
    },
    Three: {
      X: toFloat(wm.Three.x),
      Y: toFloat(wm.Three.y),
      Z: toFloat(wm.Three.z),
      ID: 6,
      Active: isMarkerEnabled(wm, 0x40),
    },
    Four: {
      X: toFloat(wm.Four.x),
      Y: toFloat(wm.Four.y),
      Z: toFloat(wm.Four.z),
      ID: 7,
      Active: isMarkerEnabled(wm, 0x80),
    },
  }
  await navigator.clipboard.writeText(JSON.stringify(ppJson))
  await navigator.clipboard.writeText(JSON.stringify(ppJson))
  ElMessage.success(t('uisaveEditor.copySuccess'))
}

// --- 验证器 ---
const VALID_MARKER_KEYS = new Set(['X', 'Y', 'Z', 'ID', 'Active'])
const VALID_ROOT_KEYS = new Set([
  'Name',
  'MapID',
  'A',
  'B',
  'C',
  'D',
  'One',
  'Two',
  'Three',
  'Four',
])

function validatePPJson(json: unknown): string | true {
  if (typeof json !== 'object' || json === null) return '输入必须是 JSON 对象'

  // 1. 检查根节点是否有非法字段
  for (const key of Object.keys(json)) {
    if (!VALID_ROOT_KEYS.has(key)) return `根节点包含非法字段: ${key}`
  }

  // 2. 检查必要字段类型
  const j = json as Partial<PPJson>
  if (typeof j.MapID !== 'number') return '缺少 MapID 或类型错误 (应为数字)'
  if ('Name' in j && typeof j.Name !== 'string')
    return 'Name 字段类型错误 (应为字符串)'

  // 3. 检查每一个存在的标点
  const markers = ['A', 'B', 'C', 'D', 'One', 'Two', 'Three', 'Four'] as const
  for (const key of markers) {
    if (key in j) {
      const m = j[key]
      if (typeof m !== 'object' || m === null)
        return `标点 ${key} 格式错误 (应为对象)`

      // 检查标点对象的非法字段
      for (const mKey of Object.keys(m)) {
        if (!VALID_MARKER_KEYS.has(mKey))
          return `标点 ${key} 包含非法字段: ${mKey}`
      }

      // 检查标点属性类型
      if (typeof m.X !== 'number') return `标点 ${key}.X 类型错误 (应为数字)`
      if (typeof m.Y !== 'number') return `标点 ${key}.Y 类型错误 (应为数字)`
      if (typeof m.Z !== 'number') return `标点 ${key}.Z 类型错误 (应为数字)`
      if ('ID' in m && typeof m.ID !== 'number')
        return `标点 ${key}.ID 类型错误 (应为数字)`
      if ('Active' in m && typeof m.Active !== 'boolean')
        return `标点 ${key}.Active 类型错误 (应为布尔值)`
    }
  }

  return true
}

async function pasteMark(index: number) {
  try {
    const { value: text } = await ElMessageBox.prompt(
      t('uisaveEditor.pastePrompt'),
      t('uisaveEditor.importTitle'),
      {
        confirmButtonText: t('uisaveEditor.import'),
        cancelButtonText: t('uisaveEditor.cancel'),
        inputType: 'textarea',
        inputPlaceholder: '{"Name":...,"MapID":...,"A":{...}...}',
        inputPattern: /^{.*}$/,
        inputErrorMessage: t('uisaveEditor.jsonError'),
        closeOnClickModal: false,
        customClass: 'ppjson-import-dialog',
        inputValidator: (val) => {
          if (!val) return t('uisaveEditor.inputEmpty')
          try {
            const json = JSON.parse(val)
            const res = validatePPJson(json)
            if (res !== true) {
              return `${t('uisaveEditor.invalidPPJson')}: ${res}`
            }
            return true
          } catch {
            return t('uisaveEditor.jsonError')
          }
        },
      },
    )

    if (!text) return
    const validJson = JSON.parse(text) as PPJson
    // MapID 校验已在 validatePPJson 中完成

    const wm = parsedData.value?.wayMarks[index]
    if (!wm) return

    wm.regionID = validJson.MapID

    const map: Record<string, WayMarkKey> = {
      A: 'A',
      B: 'B',
      C: 'C',
      D: 'D',
      One: 'One',
      Two: 'Two',
      Three: 'Three',
      Four: 'Four',
    }

    // Helper to set enabled state
    const setEnabled = (bit: number, active: boolean) => {
      const current = (wm.enableFlag & bit) !== 0
      if (current !== active) {
        wm.enableFlag ^= bit
      }
    }

    for (const [ppKey, wmKey] of Object.entries(map)) {
      const p = validJson[ppKey as keyof PPJson] as PPJsonPoint | undefined

      // 如果点位缺失，使用默认空值（坐标为0且不激活）覆盖
      // 如果点位存在但 Active 缺失，默认为 true (有坐标即激活)
      const targetP = p
        ? { ...p, Active: p.Active ?? true }
        : { X: 0, Y: 0, Z: 0, ID: 0, Active: false }

      // Update coordinates directly (updateCoordinate helper handles conversion & marking modified)
      updateCoordinate(wm, wmKey, 'x', targetP.X)
      updateCoordinate(wm, wmKey, 'y', targetP.Y)
      updateCoordinate(wm, wmKey, 'z', targetP.Z)

      // Update active state
      const markerDef = MARKER_MAP.find((m) => m.key === wmKey)
      if (markerDef) {
        setEnabled(markerDef.bit, targetP.Active)
      }
    }

    markAsModified()
    markAsModified()
    ElMessage.success(t('uisaveEditor.importSuccess'))
  } catch (e) {
    if (e === 'cancel') return
    console.error(e)
    ElMessage.error(t('uisaveEditor.importFail'))
  }
}

// --- 事件处理 ---
const onFileChange = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) handleFile(f)
}
const onDrop = (e: DragEvent) => {
  isDragging.value = false
  dragCounter = 0
  const f = e.dataTransfer?.files[0]
  if (f?.name.toLowerCase().endsWith('.dat')) handleFile(f)
}
const onDragEnter = () => {
  dragCounter++
  isDragging.value = true
}
const onDragLeave = () => {
  dragCounter--
  if (dragCounter === 0) isDragging.value = false
}
</script>

<template>
  <div
    class="uisave-editor"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div v-if="isDragging" class="drag-full-overlay">
      <div class="overlay-content">
        <el-icon :size="80" color="var(--el-color-primary)"><Upload /></el-icon>
        <p>{{ t('uisaveEditor.dropToLoad') }}</p>
        <span class="sub-text">{{ t('uisaveEditor.description') }}</span>
      </div>
    </div>

    <header class="header-container">
      <div class="header-left">
        <div class="title-group">
          <h1>{{ t('uisaveEditor.title') }}</h1>
          <div class="status-badges" v-if="parsedData">
            <el-tag
              v-if="hasUnsavedChanges"
              type="danger"
              effect="dark"
              round
              size="small"
              class="unsaved-tag"
            >
              ● {{ t('uisaveEditor.unsaved') }}
            </el-tag>
          </div>
        </div>
      </div>

      <div class="header-right">
        <input
          ref="fileInput"
          type="file"
          accept=".DAT,.dat"
          style="display: none"
          @change="onFileChange"
        />

        <div class="action-buttons">
          <el-button
            class="action-btn import-btn"
            size="small"
            round
            @click="fileInput?.click()"
          >
            <el-icon class="el-icon--left"><Upload /></el-icon>
            {{ t('uisaveEditor.parseDat') }}
          </el-button>

          <el-button
            class="action-btn export-btn"
            type="primary"
            size="small"
            round
            :disabled="!parsedData"
            @click="exportFile"
          >
            <el-icon class="el-icon--left"><Download /></el-icon>
            {{ t('uisaveEditor.download') }}
          </el-button>
          
        </div>

        <div class="divider"></div>

        <LanguageSwitcher />

        <CommonThemeToggle storage-key="ui-save-editor" />
      </div>
    </header>

    <div v-if="parsedData" class="content">
      <div class="marks-grid">
        <el-card
          v-for="(waymark, index) in parsedData.wayMarks.slice(0, displayLimit)"
          :key="index"
          shadow="hover"
          class="waymark-card"
        >
          <template #header>
            <div class="card-header">
              <div class="card-title">
                <span class="index-num">#{{ index + 1 }}</span>
                <span class="map-id-text">{{ t('uisaveEditor.mapId', [waymark.regionID]) }}</span>
              </div>
              <ZoneSelecter
                :select-zone="
                  getTerritoryTypeByMapID(waymark.regionID).toString()
                "
                :placeholder="t('uisaveEditor.zoneSelectPlaceholder')"
                @update:select-zone="
                  (v: string) => {
                    waymark.regionID = getMapIDByTerritoryType(Number(v))
                    markAsModified()
                  }
                "
                width="100%"
                :show-all-levels="false"
                :border="false"
                class="header-zone-select"
              />
              <div style="display: flex; gap: 0">
                <el-button
                  size="small"
                  :icon="Upload"
                  @click="pasteMark(index)"
                  :title="`${t('uisaveEditor.import')} PP JSON`"
                  text
                  style="margin: 0"
                >
                  {{ t('uisaveEditor.import') }}
                </el-button>
                <el-button
                  size="small"
                  :icon="Share"
                  @click="copyMark(index)"
                  :title="`${t('uisaveEditor.copy')} PP JSON`"
                  text
                  style="margin: 0"
                >
                  {{ t('uisaveEditor.copy') }}
                </el-button>
              </div>
            </div>
          </template>

          <div class="waymark-content">
            <div class="waymark-controls">
              <div class="control-header">
                <span class="col-mark">{{ t('uisaveEditor.active') }}</span>
                <span class="col-coord">X</span>
                <span class="col-coord">Y</span>
                <span class="col-coord">Z</span>
              </div>
              <div v-for="m in MARKER_MAP" :key="m.key" class="control-row">
                <el-checkbox
                  :model-value="isMarkerEnabled(waymark, m.bit)"
                  @change="toggleMarker(waymark, m.bit)"
                  class="marker-checkbox"
                  :disabled="waymark.regionID === 0"
                  >{{ m.label }}</el-checkbox
                >
                <el-input-number
                  :model-value="toFloat(waymark[m.key].x)"
                  @update:model-value="
                    (v) => updateCoordinate(waymark, m.key, 'x', v)
                  "
                  :step="0.01"
                  :precision="3"
                  :controls="false"
                  size="small"
                  class="coord-input"
                  :disabled="waymark.regionID === 0"
                />
                <el-input-number
                  :model-value="toFloat(waymark[m.key].y)"
                  @update:model-value="
                    (v) => updateCoordinate(waymark, m.key, 'y', v)
                  "
                  :step="0.01"
                  :precision="3"
                  :controls="false"
                  size="small"
                  class="coord-input"
                  :disabled="waymark.regionID === 0"
                />
                <el-input-number
                  :model-value="toFloat(waymark[m.key].z)"
                  @update:model-value="
                    (v) => updateCoordinate(waymark, m.key, 'z', v)
                  "
                  :step="0.01"
                  :precision="3"
                  :controls="false"
                  size="small"
                  class="coord-input"
                  :disabled="waymark.regionID === 0"
                />
              </div>
            </div>
            <div class="waymark-map-container">
              <WaymarkDisplay
                v-if="waymark.regionID !== 0"
                :waymark="waymark"
                :size="250"
              />
              <div v-else class="empty-map-placeholder">
                <el-icon :size="24" color="var(--el-text-color-placeholder)"
                  ><MapLocation
                /></el-icon>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <div v-else class="empty-state" @click="fileInput?.click()">
      <div class="empty-icon-wrapper">
        <el-icon :size="64"><Upload /></el-icon>
      </div>
      <h2>{{ t('uisaveEditor.startUsage') }}</h2>
      <p class="upload-text">{{ t('uisaveEditor.description') }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.uisave-editor {
  padding: 0;
  max-width: 100%;
  margin: 0;
  position: relative;
  min-height: 100vh;
  background-color: var(--el-bg-color-page);
  display: flex;
  flex-direction: column;

  .header-container {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 40px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid var(--el-border-color-lighter);

    .dark & {
      background: rgba(0, 0, 0, 0.6);
    }

    .header-left {
      .title-group {
        display: flex;
        align-items: center;
        gap: 16px;

        h1 {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
          background: linear-gradient(
            120deg,
            var(--el-color-primary),
            var(--el-color-primary-light-3)
          );
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }

        .status-badges {
          display: flex;
          gap: 8px;
          align-items: center;

          .file-tag {
            font-weight: 500;
            opacity: 0.8;
          }

          .unsaved-tag {
            font-weight: 600;
            box-shadow: 0 2px 6px rgba(245, 108, 108, 0.3);
          }
        }
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 20px;

      .action-buttons {
        display: flex;
        gap: 12px;

        .action-btn {
          font-weight: 600;

          &.import-btn {
            border: 1px solid var(--el-border-color);
            &:hover {
              border-color: var(--el-color-primary-light-5);
              background-color: var(--el-color-primary-light-9);
              color: var(--el-color-primary);
            }
          }

          &.export-btn {
            box-shadow: 0 4px 12px rgba(var(--el-color-primary-rgb), 0.3);
            &:hover {
              box-shadow: 0 6px 16px rgba(var(--el-color-primary-rgb), 0.4);
            }
          }
        }
      }

      .divider {
        width: 1px;
        height: 24px;
        background-color: var(--el-border-color-lighter);
      }
    }
  }

  .content {
    padding: 30px 40px;
    flex: 1;
    max-width: 1800px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .drag-full-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: var(--el-bg-color-overlay);
    backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    border: 4px dashed var(--el-color-primary);
    margin: 10px;
    width: calc(100vw - 20px);
    height: calc(100vh - 20px);
    border-radius: 20px;
    box-sizing: border-box;
    .overlay-content {
      text-align: center;
      color: var(--el-color-primary);
      p {
        font-size: 24px;
        font-weight: bold;
        margin: 20px 0 10px;
      }
      .sub-text {
        font-size: 16px;
        color: var(--el-text-color-secondary);
      }
    }
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 40px;
    border: 2px dashed var(--el-border-color-lighter);
    border-radius: 20px;
    background: var(--el-bg-color-overlay);
    transition: all 0.3s;

    .empty-icon-wrapper {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: var(--el-fill-color-light);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      color: var(--el-text-color-secondary);
    }

    h2 {
      margin: 0 0 12px;
      font-size: 24px;
      color: var(--el-text-color-primary);
    }

    .upload-text {
      font-size: 16px;
      color: var(--el-text-color-secondary);
      margin-bottom: 0;
    }

    &:hover {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      .empty-icon-wrapper {
        background: var(--el-color-primary);
        color: white;
      }
    }

    .mt-4 {
      margin-top: 24px;
    }
  }

  .marks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, 580px);
    gap: 20px;
  }

  .waymark-card {
    width: 580px;
    content-visibility: auto;
    contain-intrinsic-size: 580px 280px;
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color-light);

    &:hover {
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
      border-color: var(--el-color-primary-light-3);
    }

    :deep(.el-card__header) {
      padding: 8px 12px;
      border-bottom: 1px solid var(--el-border-color-lighter);
    }
    :deep(.el-card__body) {
      padding: 10px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      .card-title {
        display: flex;
        align-items: center;
        line-height: 1;

        .index-num {
          font-weight: 900;
          font-size: 18px;
          color: var(--el-color-primary);
          padding-right: 10px;
          border-right: 1px solid var(--el-border-color-lighter);
        }
        .map-id-text {
          font-size: 11px;
          font-weight: 600;
          color: var(--el-text-color-placeholder);
          letter-spacing: 0.2px;
          padding: 0 10px;
          border-right: 1px solid var(--el-border-color-lighter);
          white-space: nowrap;
        }
      }
      .header-zone-select {
        flex: 1;
        :deep(.el-input__inner) {
          font-size: 13px;
          font-weight: 600;
          border: none;
          padding: 0;
        }
      }
    }

    .waymark-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 2px 4px;

      .waymark-controls {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        height: 250px;
        width: 290px;
        flex-shrink: 0;
        gap: 4px;

        .control-header {
          display: flex;
          align-items: center;
          gap: 3px;
          padding-bottom: 2px;
          border-bottom: 1px solid var(--el-border-color-lighter);
          margin-bottom: 2px;

          span {
            font-size: 12px;
            color: var(--el-text-color-secondary);
            font-weight: 600;
            text-align: center;
          }

          .col-mark {
            width: 32px;
          }
          .col-coord {
            flex: 1;
            min-width: 0;
          }
        }

        .control-row {
          display: flex;
          align-items: center;
          gap: 3px;
          flex: 1;

          .marker-checkbox {
            width: 32px;
            margin: 0;
            height: 100%;
            :deep(.el-checkbox__label) {
              font-size: 12px;
              font-weight: 900;
              padding: 0 0 0 2px;
            }
          }

          :deep(.coord-input) {
            flex: 1;
            min-width: 0;
            .el-input__wrapper {
              padding: 0 4px;
              height: 24px;
              line-height: 24px;
            }
            .el-input__inner {
              padding: 0;
              height: 24px;
              line-height: 24px;
              font-size: 11px;
              font-family: 'JetBrains Mono', monospace;
              text-align: center;
            }
          }
        }
      }
      .waymark-map-container {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        .waymark-map {
          width: 250px;
          height: 250px;
          border: 1px solid var(--el-border-color-lighter);
          border-radius: 6px;
          background: #0d0d0d;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
      }
    }
  }
}
.ppjson-import-dialog {
  width: 600px !important;
  textarea {
    min-height: 240px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 12px !important;
  }
}
</style>
