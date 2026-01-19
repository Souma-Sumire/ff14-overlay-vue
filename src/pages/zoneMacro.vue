<script setup lang="ts">
import {
  ChatDotSquare,
  ChatSquare,
  Check,
  CopyDocument,
  Delete,
  Edit,
  Position,
} from '@element-plus/icons-vue'
import { useDev } from '@/composables/useDev'
import { useWebSocket } from '@/composables/useWebSocket'
import { defaultMacro } from '@/resources/macro'
import { useMacroStore } from '@/store/macro'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'
import 'github-markdown-css/github-markdown-light.css'
import ZoneSelecter from '@/components/zoneSelecter.vue'
import { getLocaleMessage, getCactbotLocaleMessage } from '@/composables/useLang'
import type { WayMark, UISaveData } from '@/types/uisave'
import { parseUISave, MARKER_MAP } from '@/utils/uisaveParser'
import { getMapIDByTerritoryType, getTerritoryTypeByMapID } from '@/resources/contentFinderCondition'
import { ZoneInfo } from '@/resources/zoneInfo'
import WaymarkDisplay from '@/components/uisaveEditor/WaymarkDisplay.vue'
import { View } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'

const { t } = useI18n()

const dev = useDev()
const macroStore = useMacroStore()
const hideOnStartup = useStorage('zoneMacroHideOnStartup', ref(false))
if (hideOnStartup.value) macroStore.show = false

if (!dev.value) useWebSocket({ allowClose: true, addWsParam: true })

const fastEntrance = computed(() => {
  return macroStore.fastEntrance.map((v) => {
    return {
      text: getLocaleMessage(v.text),
      value: v.value,
    }
  })
})

// UISAVE Import Logic
const fileInput = ref<HTMLInputElement | null>(null)
const uisaveData = ref<UISaveData | null>(null)
const importDialogVisible = ref(false)
const onlyCurrentZone = ref(true)
const selectedWaymarks = ref<{ mark: WayMark; index: number }[]>([])

const currentMapID = computed(() => {
  return getMapIDByTerritoryType(Number(macroStore.selectZone))
})

const displayedWaymarks = computed(() => {
  if (!uisaveData.value) return []
  let marks = uisaveData.value.wayMarks
    .map((mark, index) => ({ mark, index }))
    .filter((m) => m.mark.regionID !== 0)
  
  if (onlyCurrentZone.value) {
    marks = marks.filter((m) => m.mark.regionID === currentMapID.value)
  }
  return marks
})

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    uisaveData.value = await parseUISave(await file.arrayBuffer())
    importDialogVisible.value = true
    
    // Auto-check only if current zone has data
    const hasCurrentZoneData = uisaveData.value.wayMarks.some(
      (m) => m.regionID !== 0 && m.regionID === currentMapID.value
    )
    onlyCurrentZone.value = hasCurrentZoneData
  } catch (err) {
    ElMessage.error('Parse failed: ' + err)
  } finally {
    input.value = ''
  }
}

function handleSelectionChange(val: { mark: WayMark; index: number }[]) {
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
  ElMessage.success(t('zoneMacro.importSelected', [selectedWaymarks.value.length]))
}

function getZoneName(mapID: number) {
  const territoryType = getTerritoryTypeByMapID(mapID)
  if (!territoryType) return 'Unknown'
  const info = ZoneInfo[territoryType]
  if (!info) return 'Unknown'
  return getCactbotLocaleMessage(info.name)
}

function sortByMapName(a: { mark: WayMark }, b: { mark: WayMark }) {
  return getZoneName(a.mark.regionID).localeCompare(getZoneName(b.mark.regionID))
}

onMounted(() => {
  addOverlayListener('ChangeZone', macroStore.handleChangeZone)
  watch(
    toRef(macroStore, 'selectZone'),
    () => {
      const data =
        macroStore.data.zoneId[macroStore.selectZone]?.map((v) => {
          const { Editable, ...r } = v
          return r
        }) ||
        defaultMacro.zoneId[macroStore.selectZone] ||
        []

      const userData = data.filter((v) => v.Deletability)
      const nativeData = defaultMacro.zoneId[macroStore.selectZone] ?? []
      macroStore.data.zoneId[macroStore.selectZone] = [
        ...nativeData,
        ...userData,
      ]
    },
    { immediate: true }
  )
})
</script>

<template>
  <el-container v-show="macroStore.show" class="elcontainer">
    <el-header flex="~ wrap" height="auto" class="elheader">
      <el-space>
        <el-button
          type="primary"
          size="small"
          :icon="Position"
          @click="macroStore.positioning()"
        />
        <ZoneSelecter v-model:selectZone="macroStore.selectZone" />
      </el-space>

      <el-space>
        <el-button-group flex="~ ! wrap">
          <el-button
            v-for="(entrance, index) in fastEntrance"
            :key="index"
            bg
            plain
            color="rgb(24,34,44)"
            size="small"
            @click="macroStore.selectZone = entrance.value"
          >
            {{ entrance.text }}
          </el-button>
        </el-button-group>
      </el-space>
      <el-space>
        <div class="menu">
          <el-button type="success" size="small" @click="macroStore.newMacro()">
            {{ $t('zoneMacro.newMacro') }}
          </el-button>
          <el-button
            type="success"
            size="small"
            color="#3375b9"
            @click="macroStore.newPlace()"
          >
            {{ $t('zoneMacro.newWaymark') }}
          </el-button>
          <el-button
            size="small"
            color="#BA5783"
            @click="macroStore.importPPJSON()"
          >
            {{ $t('zoneMacro.importPP') }}
          </el-button>
          <el-button
            size="small"
            color="#9D5C63"
            @click="fileInput?.click()"
          >
            {{ $t('zoneMacro.importUISAVE') }}
          </el-button>
          <el-button
            type="warning"
            size="small"
            @click="macroStore.resetZone()"
          >
            {{ $t('zoneMacro.resetZone') }}
          </el-button>
          <el-button
            type="danger"
            size="small"
            @click="macroStore.resetAllData()"
          >
            {{ $t('zoneMacro.resetAll') }}
          </el-button>
          <CommonThemeToggle storage-key="zone-macro-theme" m-l-2 m-r-2 />
          <CommonLanguageSwitcher m-r-2 />
        </div>
      </el-space>
    </el-header>

    <el-main style="padding: 0.25rem; margin: 0">
      <el-space wrap alignment="flex-start" style="font-size: 12px">
        <el-empty
          w-100
          :image-size="150"
          :description="$t('zoneMacro.noDataTip')"
          v-if="
            macroStore.data.zoneId[macroStore.selectZone] === undefined ||
            macroStore.data.zoneId[macroStore.selectZone]!.length === 0
          "
        />
        <el-card
          v-else
          v-for="(macro, index) in macroStore.data.zoneId[
            macroStore.selectZone
          ]"
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
            <article v-if="!macro.Editable">
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
                    ].includes(v[0])
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
      </el-space>
    </el-main>
    
    <input
      ref="fileInput"
      type="file"
      accept=".DAT,.dat"
      style="display: none"
      @change="onFileChange"
    />

    <el-dialog
      v-model="importDialogVisible"
      :title="$t('zoneMacro.uisaveDialogTitle')"
      width="800px"
    >
      <div style="margin-bottom: 10px">
        <el-checkbox v-model="onlyCurrentZone">{{
          $t('zoneMacro.onlyCurrentZone', [currentMapID, getZoneName(currentMapID)])
        }}</el-checkbox>
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
        <el-table-column :label="$t('zoneMacro.preview')" width="70" align="center">
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
          <el-button @click="importDialogVisible = false">{{ $t('zoneMacro.cancel') }}</el-button>
          <el-button type="primary" @click="doImportUISAVE" :disabled="selectedWaymarks.length === 0">
            {{ $t('zoneMacro.importSelected', [selectedWaymarks.length]) }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-container>
</template>

<style lang="scss">
@import '@/css/ffxiv-axis-font-icons.css';

* {
  font-family: 'FFXIV', 'Helvetica Neue', Helvetica, 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  pointer-events: initial;
}

::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

::-webkit-scrollbar-thumb {
  height: 30px;
  border-radius: 5px;
}

html,
body {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  opacity: 0.98;
}

.elcontainer {
  height: 100%;
  width: 100%;
}

.elheader {
  padding: 0.1rem 0.3rem;
  gap: 0.25rem;
}

.menu {
  width: auto;
  height: auto;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  > button {
    margin-left: 6px !important;
  }
}

.main-box-card {
  position: relative;

  // max-width: 500px;
  > .el-card__body {
    padding: 0.7em;
  }

  :deep(a) {
    color: blue;
    padding: 0.5em;
    font-weight: 700;
    font-size: 14px;
  }

  .buttonAreaEditing {
    margin-top: 5px;
  }

  .buttonArea {
    margin-top: 5px;
    max-height: 0;
    overflow: hidden;
    opacity: 0.5;
    transition: all 0.1s ease-in-out;

    > .el-button {
      margin: 0.1em;
    }
  }

  &:hover {
    .buttonArea {
      opacity: 1;
      max-height: 100px;
    }
  }

  .macroText {
    white-space: pre;
    text-overflow: ellipsis;
    overflow: hidden;
    line-height: 1.5;
  }

  // @media screen and (max-width: 600px) {
  //   .macroText {
  //     white-space: normal;
  //   }
  // }
}

.el-select-group__title {
  font-weight: bold;
  font-size: 12px;
  color: var(--el-text-color-regular);
  padding-left: 1em;
}

.macro-title {
  margin: 0.2em;
  font-weight: bold;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  max-width: 13em;
}

.badge-group {
  position: absolute;
  top: 2px;
  right: 2px;
}

.subtle-badge {
  user-select: none;
  pointer-events: none;
  padding: 1px 3px;
  font-size: 9px;
  line-height: 1;
  white-space: nowrap;
  border-radius: 999px;
  border: 1px solid;
  background-color: var(--el-bg-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  &.from-user {
    background-color: #13ce66;
    border-color: #13ce66;
    color: #fff;
  }

  &.from-native {
    background-color: #975b00;
    border-color: #975b00;
    color: #fff;
    filter: grayscale(20%);
    opacity: 0.8;
  }
}
</style>
