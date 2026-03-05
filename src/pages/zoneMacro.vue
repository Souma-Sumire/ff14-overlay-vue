<script setup lang="ts">
import type { ContentUsedType } from '@/composables/useZone'
import type { MacroInfoPlace } from '@/types/macro'
import type { UISaveData, WayMark } from '@/types/uisave'

import {
  ChatDotSquare,
  ChatSquare,
  Check,
  CopyDocument,
  Delete,
  Edit,
  Position,
  View,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import WaymarkDisplay from '@/components/uisaveEditor/WaymarkDisplay.vue'
import ZoneSelecter from '@/components/zoneSelecter.vue'
import { useDev } from '@/composables/useDev'
import { useIndexedDB } from '@/composables/useIndexedDB'
import {
  getCactbotLocaleMessage,
  getLocaleMessage,
} from '@/composables/useLang'
import { useWebSocket } from '@/composables/useWebSocket'
import { getZoneType } from '@/composables/useZone'
import {
  getMapIDByTerritoryType,
  getTerritoryTypeByMapID,
} from '@/resources/logic/contentFinderCondition'
import { defaultMacro } from '@/resources/macro'
import { ZoneInfo } from '@/resources/zoneInfo'
import { useMacroStore } from '@/store/macro'
import { doWayMarks } from '@/utils/postNamazu'
import { MARKER_MAP, parseUISave } from '@/utils/uisaveParser'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'
import 'github-markdown-css/github-markdown-light.css'

const { t } = useI18n()

const dev = useDev()
const macroStore = useMacroStore()
const showHorizon = computed(() => {
  const zone = ZoneInfo[Number(macroStore.selectZone)]
  if (!zone)
    return false
  const type = getZoneType(zone)
  return ([
    'Dungeons', // 四人迷宫
    'Trials', // 讨伐歼灭战
    'Raids', // 大型任务
  ] as ContentUsedType[]).includes(type)
})
const hideOnStartup = useStorage('zoneMacroHideOnStartup', ref(false))
if (hideOnStartup.value)
  macroStore.show = false

if (!dev.value)
  useWebSocket({ allowClose: true, addWsParam: true })

const fastEntrance = computed(() => {
  return macroStore.fastEntrance.map((v) => {
    return {
      text: getLocaleMessage(v.text),
      value: v.value,
    }
  })
})
const fileInput = ref<HTMLInputElement | null>(null)
const uisaveData = ref<UISaveData | null>(null)
const importDialogVisible = ref(false)
const onlyCurrentZone = ref(true)
const selectedWaymarks = ref<{ mark: WayMark, index: number }[]>([])
const realtimeLocalMode = useStorage('zoneMacroRealtimeLocalMode', ref(false))

const applyRealtimeLocalWaymark = useDebounceFn(async (place: MacroInfoPlace['Place']) => {
  if (!realtimeLocalMode.value)
    return
  try {
    await doWayMarks(place, true, true)
  }
  catch {}
}, 200)

const currentMapID = computed(() => {
  return getMapIDByTerritoryType(Number(macroStore.selectZone))
})

const dutyLoading = ref(false)
const dutyContent = ref('')
const dutyStatus = ref<'idle' | 'loading' | 'success' | 'empty' | 'error'>('idle')
const dutyErrorCode = ref<string | number>('')
const dutyBestProxyIndex = useStorage('duty-best-proxy-index', 0)
const dutyUrl = computed(() => {
  if (currentMapID.value > 0 && currentMapID.value !== Number(macroStore.selectZone)) {
    return `https://ff14.org/duty/${currentMapID.value}.htm`
  }
  return ''
})

interface DutyCache {
  key: string
  content: string
  expiry: number
}
const db = useIndexedDB<DutyCache>('duty-cache')

function cleanDutyHtml(rawHtml: string): string {
  if (!rawHtml)
    return ''

  const isFullPage = rawHtml.includes('<!DOCTYPE') || rawHtml.includes('<html')
  const parser = new DOMParser()
  let doc: Document | Element

  if (isFullPage) {
    const fullDoc = parser.parseFromString(rawHtml, 'text/html')
    const article = fullDoc.querySelector('#root > div.main-container > div > div > main > div.content-container > article')
    if (!article)
      return ''
    doc = article
  }
  else {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = rawHtml
    doc = tempDiv
  }

  const html = (doc as HTMLElement).innerHTML || ''

  // 3. 基础正则清理：移除图片 + 修剪标签边缘的空格
  return html
    .replace(/<img[^>]*>/gi, '')
    .replace(/>\s+/g, '>')
    .replace(/\s+</g, '<')
    .trim()
}

async function loadDuty(skipCache = false) {
  if (!dutyUrl.value)
    return

  dutyLoading.value = true
  dutyStatus.value = 'loading'
  dutyContent.value = ''
  dutyErrorCode.value = ''

  const cacheKey = dutyUrl.value
  const now = Date.now()

  try {
    // 1. 检查缓存 (如果不是强制刷新)
    if (!skipCache) {
      const cached = await db.get(cacheKey)
      if (cached && cached.expiry > now) {
        dutyContent.value = cached.content
        dutyStatus.value = cached.content ? 'success' : 'empty'
        dutyLoading.value = false
        return
      }
    }

    // 2. 尝试通过代理请求数据
    const targetUrl = dutyUrl.value
    let html = ''
    let success = false

    const allProxies = [
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url: string) => `https://cors.lol/?url=${encodeURIComponent(url)}`,
      (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ]

    // 重新排序代理：将上次成功的排在最前面
    const bestIndex = dutyBestProxyIndex.value
    const proxyOrder = Array.from({ length: allProxies.length }, (_, i) => i)
    if (bestIndex > 0 && bestIndex < allProxies.length) {
      proxyOrder.splice(bestIndex, 1)
      proxyOrder.unshift(bestIndex)
    }

    for (const pIdx of proxyOrder) {
      const getProxyUrl = allProxies[pIdx]!
      const proxyUrl = getProxyUrl(targetUrl)
      try {
        console.log(`[Duty] Attempting proxy [${pIdx}]: ${proxyUrl}`)
        const resp = await fetch(proxyUrl, {
          cache: 'no-cache',
          referrerPolicy: 'no-referrer',
        })
        if (resp.ok) {
          html = await resp.text()
          if (html) {
            success = true
            dutyBestProxyIndex.value = pIdx // 记住成功的索引
            break
          }
        }
        else {
          dutyErrorCode.value = `Proxy[${pIdx}] Error ${resp.status}`
        }
      }
      catch (e: any) {
        dutyErrorCode.value = `Proxy[${pIdx}] ${e.message || 'Failure'}`
        console.warn(`[Duty] Proxy failed: ${proxyUrl}`, e)
      }
    }

    if (success && html) {
      dutyContent.value = html
    }
    else if (!success) {
      dutyStatus.value = 'error'
    }
  }
  catch (e: any) {
    console.error('Load duty failed:', e)
    dutyStatus.value = 'error'
    dutyErrorCode.value = e.message || 'Unknown'
  }
  finally {
    dutyLoading.value = false
  }
}

watch(dutyUrl, async (newUrl) => {
  dutyContent.value = ''
  dutyStatus.value = 'idle'
  dutyErrorCode.value = ''
  if (!newUrl)
    return

  const cached = await db.get(newUrl)
  if (cached && cached.expiry > Date.now()) {
    dutyContent.value = cached.content
    dutyStatus.value = cached.content ? 'success' : 'empty'
  }
}, { immediate: true })

// 归一化处理：统一管理内容获取后的清理、缓存与展示
watch(dutyContent, async (newVal) => {
  // 如果当前已经解析成功或者是正在加载中途被逻辑反复触发，则跳过
  if (!newVal || dutyStatus.value === 'success' || dutyStatus.value === 'empty')
    return

  if (newVal.includes('404 噗') || newVal.includes('Page Not Found')) {
    dutyStatus.value = 'empty'
    return
  }

  const cleaned = cleanDutyHtml(newVal)
  if (cleaned) {
    // 先改状态再改值，防止 watch 递归
    dutyStatus.value = 'success'
    dutyContent.value = cleaned

    // 缓存回写：如果是新内容，则存入数据库
    const cacheKey = dutyUrl.value
    const cached = await db.get(cacheKey)
    if (!cached || cached.expiry <= Date.now() || cached.content !== cleaned) {
      await db.set({ key: cacheKey, content: cleaned, expiry: Date.now() + 30 * 24 * 60 * 60 * 1000 })
    }
  }
  else {
    dutyStatus.value = 'empty'
  }
})

const displayedWaymarks = computed(() => {
  if (!uisaveData.value)
    return []
  let marks = uisaveData.value.wayMarks
    .map((mark, index) => ({ mark, index }))
    .filter(m => m.mark.regionID !== 0)

  if (onlyCurrentZone.value) {
    marks = marks.filter(m => m.mark.regionID === currentMapID.value)
  }
  return marks
})

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return
  try {
    uisaveData.value = await parseUISave(await file.arrayBuffer())
    importDialogVisible.value = true
    onlyCurrentZone.value = false
  }
  catch (err) {
    ElMessage.error(`Parse failed: ${err}`)
  }
  finally {
    input.value = ''
  }
}

function handleSelectionChange(val: { mark: WayMark, index: number }[]) {
  selectedWaymarks.value = val
}

function doImportUISAVE() {
  selectedWaymarks.value.forEach(({ mark: m }) => {
    const place: any = {}
    MARKER_MAP.forEach((def) => {
      const p = m[def.key]
      if (p) {
        place[def.key] = {
          X: p.x / 1000,
          Y: p.y / 1000,
          Z: p.z / 1000,
          Active: (m.enableFlag & def.bit) > 0,
        }
      }
    })

    // Add new place macro
    macroStore.newPlace({
      ...place,
      Name: `Imported ${new Date(m.timestamp * 1000).toLocaleString()}`,
      MapID: m.regionID,
      Editable: false,
    })
  })
  importDialogVisible.value = false
  ElMessage.success(
    t('zoneMacro.importSelected', [selectedWaymarks.value.length]),
  )
}

function getZoneName(mapID: number) {
  const territoryType = getTerritoryTypeByMapID(mapID)
  if (!territoryType)
    return 'Unknown'
  const info = ZoneInfo[territoryType]
  if (!info)
    return 'Unknown'
  return getCactbotLocaleMessage(info.name)
}

function sortByMapName(a: { mark: WayMark }, b: { mark: WayMark }) {
  return getZoneName(a.mark.regionID).localeCompare(
    getZoneName(b.mark.regionID),
  )
}

function handleRealtimeCoordinateChange(macro: MacroInfoPlace) {
  if (!realtimeLocalMode.value || !macro.Editable)
    return
  void applyRealtimeLocalWaymark(macro.Place)
}

onMounted(() => {
  addOverlayListener('ChangeZone', macroStore.handleChangeZone)
  watch(
    toRef(macroStore, 'selectZone'),
    () => {
      const data
        = macroStore.data.zoneId[macroStore.selectZone]?.map((v) => {
          const { Editable, ...r } = v
          return r
        })
        || defaultMacro.zoneId[macroStore.selectZone]
        || []

      const userData = data.filter(v => v.Deletability)
      const nativeData = defaultMacro.zoneId[macroStore.selectZone] ?? []
      macroStore.data.zoneId[macroStore.selectZone] = [
        ...nativeData,
        ...userData,
      ]
    },
    { immediate: true },
  )
})
</script>

<template>
  <el-container v-show="macroStore.show" class="elcontainer">
    <el-header height="auto" class="elheader">
      <div class="header-row">
        <el-tooltip content="定位到当前区域" placement="bottom">
          <el-button
            type="primary"
            size="small"
            :icon="Position"
            circle
            @click="macroStore.positioning()"
          />
        </el-tooltip>
        <ZoneSelecter v-model:select-zone="macroStore.selectZone" />

        <div class="fast-entrance-group">
          <el-button
            v-for="(entrance, index) in fastEntrance"
            :key="index"
            plain
            size="small"
            @click="macroStore.selectZone = entrance.value"
          >
            {{ entrance.text }}
          </el-button>
        </div>
      </div>

      <div class="header-row">
        <el-button type="success" size="small" @click="macroStore.newMacro()">
          {{ $t('zoneMacro.newMacro') }}
        </el-button>
        <el-button type="primary" size="small" @click="macroStore.newPlace()">
          {{ $t('zoneMacro.newWaymark') }}
        </el-button>

        <el-divider direction="vertical" class="toolbar-divider" />

        <el-button
          size="small"
          color="#BA5783"
          @click="macroStore.importPPJSON()"
        >
          {{ $t('zoneMacro.importPP') }}
        </el-button>
        <el-button size="small" color="#9D5C63" @click="fileInput?.click()">
          {{ $t('zoneMacro.importUISAVE') }}
        </el-button>

        <el-divider direction="vertical" class="toolbar-divider" />

        <el-button type="warning" size="small" @click="macroStore.resetZone()">
          {{ $t('zoneMacro.resetZone') }}
        </el-button>
        <el-button
          type="danger"
          size="small"
          @click="macroStore.resetAllData()"
        >
          {{ $t('zoneMacro.resetAll') }}
        </el-button>

        <el-divider direction="vertical" class="toolbar-divider" />

        <CommonThemeToggle storage-key="zone-macro-theme" />
        <CommonLanguageSwitcher />
      </div>
    </el-header>

    <el-main class="main-content">
      <el-space wrap alignment="flex-start" class="macro-grid">
        <el-empty
          v-if="
            macroStore.data.zoneId[macroStore.selectZone] === undefined
              || macroStore.data.zoneId[macroStore.selectZone]!.length === 0
          "
          w-100
          :image-size="150"
          :description="$t('zoneMacro.noDataTip')"
        />
        <el-card
          v-for="(macro, index) in macroStore.data.zoneId[
            macroStore.selectZone
          ]"
          v-else
          :key="index"
          shadow="hover"
          class="main-box-card"
        >
          <div class="badge-group">
            <span v-if="macro.Deletability" class="subtle-badge from-user">{{
              $t('zoneMacro.badgeUser')
            }}</span>
            <span v-else class="subtle-badge from-native">{{
              $t('zoneMacro.badgeNative')
            }}</span>
          </div>
          <p v-show="!macro.Editable" class="macro-title" v-html="macro.Name" />
          <el-input
            v-show="macro.Editable"
            v-model="macro.Name"
            size="small"
            :placeholder="$t('zoneMacro.placeholderMacroTitle')"
            style="width: calc(100% - 2em)"
          />

          <div v-if="'Text' in macro">
            <article v-if="!macro.Editable" class="macro-content">
              <div
                v-for="(m, o) in macro.Text?.split('\n')"
                :key="o"
                class="macroText"
              >
                {{ m }}
              </div>
            </article>
            <el-input
              v-show="macro.Editable"
              v-model="macro.Text"
              type="textarea"
              size="small"
              :placeholder="$t('zoneMacro.placeholderMacroText')"
              wrap="off"
              :autosize="{ minRows: 3 }"
              style="width: 450px; max-width: calc(100% - 2em)"
            />

            <el-row
              v-if="!macro.Editable"
              class="buttonArea"
              :style="{
                maxHeight: macro.Editable ? '100px' : null,
                opacity: macro.Editable ? 1 : null,
              }"
            >
              <el-button
                v-if="macro.Deletability"
                :icon="Edit"
                size="small"
                @click="macroStore.editMacroMacro(macro)"
              />
              <el-button
                :icon="ChatSquare"
                type="info"
                size="small"
                @click="macroStore.sendMacroEcho(macro.Text)"
              >
                {{ $t('zoneMacro.sendEcho') }}
              </el-button>
              <el-button
                :icon="ChatDotSquare"
                type="primary"
                size="small"
                @click="macroStore.sendMacroParty(macro.Text)"
              >
                {{ $t('zoneMacro.sendParty') }}
              </el-button>
            </el-row>

            <el-row v-if="macro.Editable" class="buttonAreaEditing">
              <el-button
                type="success"
                size="small"
                :icon="Check"
                @click="macroStore.submitMacroMacro(macro)"
              >
                {{ $t('zoneMacro.buttonDone') }}
              </el-button>
              <el-button
                v-if="macro.Deletability"
                type="danger"
                size="small"
                :icon="Delete"
                @click="macroStore.deleteMacro(macro)"
              >
                {{ $t('zoneMacro.buttonDelete') }}
              </el-button>
            </el-row>
          </div>

          <div v-if="'Place' in macro">
            <el-space v-show="macro.Editable">
              <el-table
                :data="
                  Object.entries(macro.Place).filter((v) =>
                    [
                      'A',
                      'B',
                      'C',
                      'D',
                      'One',
                      'Two',
                      'Three',
                      'Four',
                    ].includes(v[0]),
                  )
                "
                border
                size="small"
              >
                <el-table-column
                  align="center"
                  :label="$t('zoneMacro.tableActive')"
                  width="50"
                >
                  <template #default="scope">
                    <el-switch
                      v-model="scope.row[1].Active"
                      size="small"
                      style="--el-switch-on-color: #13ce66"
                    />
                  </template>
                </el-table-column>

                <el-table-column
                  align="center"
                  :label="$t('zoneMacro.tableMark')"
                  width="50"
                >
                  <template #default="scope">
                    <span>{{ scope.row[0] }}</span>
                  </template>
                </el-table-column>

                <el-table-column
                  align="center"
                  :label="$t('zoneMacro.tableX')"
                  width="120"
                >
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.X }}</span>
                    <el-input-number
                      v-show="macro.Editable"
                      v-model="scope.row[1].X"
                      :step="0.1"
                      :precision="2"
                      controls-position="right"
                      size="small"
                      style="width: 8.5em"
                      @change="handleRealtimeCoordinateChange(macro)"
                    />
                  </template>
                </el-table-column>

                <el-table-column
                  align="center"
                  :label="$t('zoneMacro.tableZ')"
                  width="120"
                >
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.Z }}</span>
                    <el-input-number
                      v-show="macro.Editable"
                      v-model="scope.row[1].Z"
                      :step="0.1"
                      :precision="2"
                      controls-position="right"
                      size="small"
                      style="width: 8.5em"
                      @change="handleRealtimeCoordinateChange(macro)"
                    />
                  </template>
                </el-table-column>

                <el-table-column
                  align="center"
                  :label="$t('zoneMacro.tableY')"
                  width="120"
                >
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.Y }}</span>
                    <el-input-number
                      v-show="macro.Editable"
                      v-model="scope.row[1].Y"
                      :step="0.1"
                      :precision="2"
                      controls-position="right"
                      size="small"
                      style="width: 8.5em"
                      @change="handleRealtimeCoordinateChange(macro)"
                    />
                  </template>
                </el-table-column>
              </el-table>
            </el-space>

            <el-space>
              <ZoneMacroMarksDiv
                :key="JSON.stringify(macro.Place) + macro.Name + index"
                :macro="macro"
                :zone-id="macroStore.selectZone"
              />
            </el-space>

            <el-row
              v-if="!macro.Editable"
              class="buttonArea"
              :style="{
                maxHeight: macro.Editable ? '100px' : null,
                opacity: macro.Editable ? 1 : null,
              }"
            >
              <el-button
                type="primary"
                size="small"
                @click="macroStore.doLocalWayMark(macro.Place)"
              >
                {{ $t('zoneMacro.doLocal') }}
              </el-button>
              <el-button
                type="primary"
                size="small"
                @click="macroStore.doPartyWayMark(macro.Place)"
              >
                {{ $t('zoneMacro.doPublic') }}
              </el-button>
              <el-button
                :icon="CopyDocument"
                size="small"
                class="export"
                @click="macroStore.exportWaymarksJson(macro)"
              />
              <el-button
                v-if="macro.Deletability"
                :icon="Edit"
                size="small"
                @click="macroStore.editMacroPlace(macro)"
              />
            </el-row>

            <el-row v-if="macro.Editable" class="buttonAreaEditing">
              <el-switch
                v-model="realtimeLocalMode"
                size="small"
                inline-prompt
                active-text="实时模式"
                inactive-text="手动模式"
              />
              <el-button
                type="success"
                size="small"
                :icon="Check"
                @click="macroStore.submitMacroPlace(macro)"
              >
                {{ $t('zoneMacro.buttonDone') }}
              </el-button>
              <el-button
                v-if="macro.Deletability"
                type="danger"
                size="small"
                :icon="Delete"
                @click="macroStore.deleteMacro(macro)"
              >
                {{ $t('zoneMacro.buttonDelete') }}
              </el-button>
            </el-row>
          </div>
        </el-card>
        <el-card
          v-if="dutyUrl && showHorizon"
          v-loading="dutyLoading"
          element-loading-text="正在加载..."
          shadow="hover"
          class="duty-card"
        >
          <div v-if="dutyStatus === 'idle'" class="duty-placeholder">
            <el-button type="primary" plain @click="() => loadDuty(false)">
              加载攻略
            </el-button>
          </div>
          <div v-else-if="dutyStatus === 'loading'" class="duty-placeholder" />
          <div v-else-if="dutyStatus === 'empty'" class="duty-placeholder">
            <p>暂无攻略内容</p>
          </div>
          <div v-else-if="dutyStatus === 'error'" class="duty-placeholder">
            <p>加载失败 ({{ dutyErrorCode }})</p>
            <el-button size="small" type="primary" @click="() => loadDuty(true)">
              重试
            </el-button>
          </div>
          <div v-else class="duty-html-content" v-html="dutyContent" />

          <div class="duty-card-footer">
            <el-link :href="dutyUrl" target="_blank" type="primary" size="small">
              在 新大陆见闻录 查看完整攻略
            </el-link>
          </div>
        </el-card>
      </el-space>
    </el-main>

    <input
      ref="fileInput"
      type="file"
      accept=".DAT,.dat"
      style="display: none"
      @change="onFileChange"
    >

    <el-dialog
      v-model="importDialogVisible"
      :title="$t('zoneMacro.uisaveDialogTitle')"
      width="800px"
    >
      <div style="margin-bottom: 10px">
        <el-checkbox v-model="onlyCurrentZone">
          {{
            $t('zoneMacro.onlyCurrentZone', [
              currentMapID,
              getZoneName(currentMapID),
            ])
          }}
        </el-checkbox>
      </div>

      <el-table
        :data="displayedWaymarks"
        style="width: 100%"
        height="400"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column
          :label="$t('zoneMacro.slot')"
          width="80"
          align="center"
          sortable
          sort-by="index"
        >
          <template #default="{ row }">
            {{ row.index + 1 }}
          </template>
        </el-table-column>
        <el-table-column
          prop="mark.regionID"
          :label="$t('zoneMacro.mapID')"
          width="100"
          sortable
          sort-by="mark.regionID"
        >
          <template #default="{ row }">
            {{ row.mark.regionID }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('zoneMacro.mapName')"
          sortable
          :sort-method="sortByMapName"
          min-width="150"
        >
          <template #default="{ row }">
            {{ getZoneName(row.mark.regionID) }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('zoneMacro.preview')"
          width="70"
          align="center"
        >
          <template #default="{ row }">
            <el-popover placement="left" :width="280" trigger="hover">
              <template #reference>
                <el-button :icon="View" circle size="small" />
              </template>
              <WaymarkDisplay :waymark="row.mark" :size="250" />
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('zoneMacro.timestamp')"
          width="160"
          sortable
          sort-by="mark.timestamp"
        >
          <template #default="{ row }">
            {{ new Date(row.mark.timestamp * 1000).toLocaleString() }}
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="importDialogVisible = false">
            {{
              $t('zoneMacro.cancel')
            }}
          </el-button>
          <el-button
            type="primary"
            :disabled="selectedWaymarks.length === 0"
            @click="doImportUISAVE"
          >
            {{ $t('zoneMacro.importSelected', [selectedWaymarks.length]) }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-container>
</template>

<style lang="scss" scoped>
@import '@/css/ffxiv-axis-font-icons.css';

$main-font: 'FFXIV', 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
  'Microsoft YaHei', '微软雅黑', Arial, sans-serif;

:global(*) {
  font-family: var(--el-font-family);
  pointer-events: initial;
}

:global(html),
:global(body) {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  background-color: var(--el-bg-color);
  font-family: $main-font;
}

:global(::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

:global(::-webkit-scrollbar-track) {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  .dark & {
    background: rgba(0, 0, 0, 0.3);
  }
}

:global(::-webkit-scrollbar-thumb) {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  transition: background 0.2s ease;
  &:hover {
    background: rgba(0, 0, 0, 0.5);
  }
  .dark & {
    background: rgba(255, 255, 255, 0.15);
    &:hover {
      background: rgba(255, 255, 255, 0.25);
    }
  }
}

.elcontainer {
  height: 100vh;
  width: 100%;
  background-color: var(--el-bg-color);
  display: flex;
  flex-direction: column;
}

.elheader {
  padding: 0.75rem 1rem;
  background-color: var(--el-bg-color-overlay);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid var(--el-border-color-light);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .header-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .fast-entrance-group {
    display: flex;
    gap: 0;
    flex-wrap: wrap;

    :deep(.el-button) {
      margin-left: 0 !important;
      border-radius: 0;
      &:first-child {
        border-top-left-radius: 6px;
        border-bottom-left-radius: 6px;
      }
      &:last-child {
        border-top-right-radius: 6px;
        border-bottom-right-radius: 6px;
      }
    }
  }

  :deep(.el-button) {
    transition: all 0.2s ease;
    border-radius: 6px;
    font-size: 13px;
    white-space: nowrap;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }
}

.menu {
  width: 100%;
  height: auto;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;

  > button {
    margin-left: 0 !important;
    border-radius: 6px;
    font-size: 12px;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
  }
}

.toolbar-actions {
  flex: 1;
  justify-content: flex-end;
}

.action-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.toolbar-divider {
  height: 24px;
  margin: 0 8px;
  border-color: var(--el-border-color-lighter);
}

.fast-entrance-btn {
  transition: all 0.2s ease;
  &:hover {
    transform: translateY(-1px);
  }
}

.duty-card {
  width: fit-content;
  max-width: min(42em, calc(100vw - 2rem));
  min-width: 280px;
  height: auto;
  min-height: auto;
  border-radius: 12px !important;
  margin-bottom: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  animation: fadeIn 0.35s ease-out both;
  animation-delay: 0.1s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: var(--el-color-primary-light-5);
  }

  :deep(.el-card__body) {
    padding: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}

.duty-placeholder {
  padding: 24px 16px;
  min-height: 180px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  color: var(--el-text-color-secondary);
}

.duty-html-content {
  padding: 12px 16px;
  overflow-y: auto;
  // max-height: 550px;
  flex: 1;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  background: var(--el-bg-color-overlay);

  :deep(h1), :deep(h2), :deep(h3) {
    color: var(--el-color-primary);
    font-size: 1.2em;
    margin: 12px 0 4px 0;
    padding: 0;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(ul), :deep(ol) {
    margin: 4px 0;
    padding-left: 20px;
  }

  :deep(li) {
    margin: 2px 0;
  }

  :deep(mark) {
    background-color: #ffeb3b;
    color: #333;
    border-radius: 4px;
  }
}

.duty-card-footer {
  padding: 8px 16px;
  background: var(--el-bg-color-overlay);
  border-top: 1px solid var(--el-border-color-light);
  text-align: right;
}

.main-box-card {
  position: relative;
  border-radius: 12px !important;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  animation: fadeIn 0.35s ease-out both;

  @for $i from 1 through 20 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.04}s;
    }
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: var(--el-color-primary-light-5);

    .buttonArea {
      opacity: 1;
      max-height: 100px;
    }
  }

  :deep(.el-card__body) {
    padding: 0.75em;
  }

  :deep(a) {
    color: var(--el-color-primary);
    padding: 0.5em;
    font-weight: 600;
    font-size: 13px;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: var(--el-color-primary-light-3);
    }
  }

  .buttonAreaEditing,
  .buttonArea {
    margin-top: 10px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;

    :deep(.el-button) {
      margin: 0;
      border-radius: 6px;
      font-size: 12px;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
      }
    }
  }

  .buttonArea {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: all 0.25s ease;
  }

  .macro-content {
    background: transparent;
    border: none;
    padding: 0;
    margin: 8px 0 0 0;
    transition: all 0.3s ease;
  }

  .macroText {
    white-space: pre;
    text-overflow: ellipsis;
    overflow: hidden;
    line-height: 1.6;
    font-size: 12px;
    color: var(--el-text-color-regular);
    transition: all 0.3s ease;
  }
}

:deep(.el-select-group__title) {
  font-weight: 600;
  font-size: 12px;
  color: var(--el-text-color-regular);
  padding-left: 1em;
}

.macro-title {
  margin: 0 0 0.5em 0;
  font-weight: 600;
  font-size: 14px;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  max-width: 100%;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  transition: color 0.3s ease;
}

.badge-group {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

.subtle-badge {
  user-select: none;
  pointer-events: none;
  padding: 4px 10px;
  font-size: 10px;
  line-height: 1.3;
  font-weight: 600;
  white-space: nowrap;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  letter-spacing: 0.3px;
  transition: all 0.3s ease;

  &.from-user {
    background-color: var(--el-color-success);
    color: #fff;
  }

  &.from-native {
    background-color: var(--el-color-warning);
    color: #fff;
  }
}

.main-content {
  padding: 1rem;
  margin: 0;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.macro-grid {
  font-size: 13px;
  width: 100%;
}

:deep(.el-main) {
  background: transparent;
  padding: 1rem !important;
  flex: 1;
  overflow-y: auto;

  .el-space {
    width: 100%;
    gap: 0.75rem !important;
  }

  .el-empty {
    background-color: var(--el-bg-color-overlay);
    border-radius: 12px;
    padding: 3rem 2rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid var(--el-border-color-light);
    transition: all 0.3s ease;
  }

  .el-input__wrapper {
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .el-textarea__inner {
    border-radius: 6px;
    font-family: 'Consolas', 'Monaco', monospace;
    line-height: 1.6;
  }

  .el-table {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }
}

:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  background-color: var(--el-bg-color-overlay);
  transition: all 0.3s ease;

  .el-dialog__header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1.5rem 1.75rem;
    border-bottom: none;

    .el-dialog__title {
      color: #ffffff;
      font-weight: 600;
      font-size: 17px;
    }

    .el-dialog__headerbtn .el-dialog__close {
      color: rgba(255, 255, 255, 0.9);
      font-size: 20px;
      transition: color 0.2s ease;
      &:hover {
        color: #ffffff;
      }
    }
  }

  .el-dialog__body {
    padding: 1.75rem;
  }

  .el-dialog__footer {
    padding: 1.25rem 1.75rem;
    background-color: var(--el-fill-color-light);
    border-top: 1px solid var(--el-border-color-lighter);
    transition: all 0.3s ease;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
