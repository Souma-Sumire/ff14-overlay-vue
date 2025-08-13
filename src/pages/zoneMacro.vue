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
import zoneInfo from '@/resources/zoneInfo'
import { useMacroStore } from '@/store/macro'
import ContentType from '../../cactbot/resources/content_type'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'
import 'github-markdown-css/github-markdown-light.css'

const dev = useDev()
const macroStore = useMacroStore()
const hideOnStartup = useStorage('zoneMacroHideOnStartup', ref(false))
if (hideOnStartup.value)
  macroStore.show = false

if (!dev.value)
  useWebSocket({ allowClose: true, addWsParam: true })

const contentTypeLabel: { type: number, label: string }[] = [
  { type: ContentType.UltimateRaids, label: '绝境战' },
  { type: ContentType.OccultCrescent, label: '新月岛' },
  { type: ContentType.ChaoticAllianceRaid, label: '诛灭战' },
  { type: ContentType.Raids, label: '大型任务' },
  { type: ContentType.Dungeons, label: '四人副本' },
  { type: ContentType.Trials, label: '讨伐任务' },
  { type: ContentType.VCDungeonFinder, label: '多变迷宫' },
  { type: ContentType.DeepDungeons, label: '深层迷宫' },
  { type: ContentType.DisciplesOfTheLand, label: '采集/垂钓' },
  { type: ContentType.Eureka, label: '尤雷卡' },
]

const showContentTypes = contentTypeLabel.map(v => v.type)

const groupedZoneOptions = computed(() => {
  const groups: Record<string, { value: string, label: string }[]> = {}

  Object.entries(zoneInfo)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => {
      if (a.exVersion !== b.exVersion)
        return a.exVersion - b.exVersion
      if (
        a.contentType === ContentType.Raids
        && b.contentType === ContentType.Raids
        && b.name.ja
        && a.name.ja
      ) {
        return a.name.ja.localeCompare(b.name.ja)
      }
      return Number(a.id) - Number(b.id)
    })
    .filter(
      v =>
        (!v.name.en.startsWith('(')
          && v.contentType
          && showContentTypes.includes(v.contentType))
        || macroStore.selectZone === v.id,
    )
    .forEach((v) => {
      const label
        = contentTypeLabel.find(ct => ct.type === v.contentType)?.label
          ?? '临时'

      if (groups[label] === undefined)
        groups[label] = []

      groups[label]!.push({
        value: v.id,
        label: v.name?.cn ?? `${v.name.en} / ${v.name.ja}`,
      })
    })

  return Object.entries(groups)
    .map(([label, options]) => ({ label, options }))
    .sort((a, b) => {
      const aIndex = contentTypeLabel.findIndex(ct => ct.label === a.label)
      const bIndex = contentTypeLabel.findIndex(ct => ct.label === b.label)
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
    })
})

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
    <!-- 顶部 Header 区域 -->
    <el-header flex="~ wrap" height="auto" class="elheader">
      <!-- 位置与选择区域 -->
      <el-space>
        <el-button
          type="primary"
          size="small"
          :icon="Position"
          @click="macroStore.positioning()"
        />
        <el-select
          v-model="macroStore.selectZone"
          size="small"
          filterable
          m-3px
          style="width: 16rem"
        >
          <el-option-group
            v-for="group in groupedZoneOptions"
            :key="group.label"
            :label="group.label"
          >
            <el-option
              v-for="item in group.options"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-option-group>
        </el-select>
      </el-space>

      <!-- 快捷区域按钮 -->
      <el-space>
        <el-button-group flex="~ ! wrap">
          <el-button
            v-for="(entrance, index) in macroStore.fastEntrance"
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
    </el-header>

    <!-- 主体区域 -->
    <el-main style="padding: 0.25rem; margin: 0">
      <el-space wrap alignment="flex-start" style="font-size: 12px">
        <!-- 每个宏卡片 -->
        <el-card
          v-for="(macro, index) in macroStore.data.zoneId[
            macroStore.selectZone
          ]"
          :key="index"
          shadow="hover"
          class="main-box-card"
        >
          <!-- 宏标题 -->
          <p
            v-show="!macro.Editable"
            m-b-2
            m-t-2
            font-bold
            v-html="macro.Name"
          />
          <el-input
            v-show="macro.Editable"
            v-model="macro.Name"
            size="small"
            placeholder="宏标题"
          />

          <!-- 宏文本 -->
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
              placeholder="宏文本"
              wrap="off"
              :autosize="{ minRows: 3 }"
              style="width: 450px"
            />

            <!-- 非编辑状态按钮 -->
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
                默语
              </el-button>
              <el-button
                :icon="ChatDotSquare"
                type="primary"
                size="small"
                @click="macroStore.sendMacroParty(macro.Text)"
              >
                小队
              </el-button>
            </el-row>

            <!-- 编辑状态按钮 -->
            <el-row v-if="macro.Editable" class="buttonAreaEditing">
              <el-button
                type="success"
                size="small"
                :icon="Check"
                @click="macroStore.submitMacroMacro(macro)"
              >
                完成
              </el-button>
              <el-button
                v-if="macro.Deletability"
                type="danger"
                size="small"
                :icon="Delete"
                @click="macroStore.deleteMacro(macro)"
              >
                删除
              </el-button>
            </el-row>
          </div>

          <!-- 标点数据 -->
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
                <!-- 启用 -->
                <el-table-column align="center" label="启用" width="50">
                  <template #default="scope">
                    <el-switch
                      v-model="scope.row[1].Active"
                      size="small"
                      style="--el-switch-on-color: #13ce66"
                    />
                  </template>
                </el-table-column>

                <!-- 标记 -->
                <el-table-column align="center" label="标记" width="50">
                  <template #default="scope">
                    <span>{{ scope.row[0] }}</span>
                  </template>
                </el-table-column>

                <!-- X轴 -->
                <el-table-column align="center" label="X（左右）" width="140">
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.X }}</span>
                    <el-input-number
                      v-show="macro.Editable"
                      v-model="scope.row[1].X"
                      :step="0.1"
                      :precision="2"
                      controls-position="right"
                      size="small"
                    />
                  </template>
                </el-table-column>

                <!-- Z轴 -->
                <el-table-column align="center" label="Z（上下）" width="140">
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.Z }}</span>
                    <el-input-number
                      v-show="macro.Editable"
                      v-model="scope.row[1].Z"
                      :step="0.1"
                      :precision="2"
                      controls-position="right"
                      size="small"
                    />
                  </template>
                </el-table-column>

                <!-- Y轴 -->
                <el-table-column align="center" label="Y（高度）" width="140">
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.Y }}</span>
                    <el-input-number
                      v-show="macro.Editable"
                      v-model="scope.row[1].Y"
                      :step="0.1"
                      :precision="2"
                      controls-position="right"
                      size="small"
                    />
                  </template>
                </el-table-column>
              </el-table>
            </el-space>

            <!-- 显示标记组件 -->
            <el-space>
              <ZoneMacroMarksDiv
                :key="JSON.stringify(macro.Place) + macro.Name + index"
                :macro="macro"
                :zone-id="macroStore.selectZone"
              />
            </el-space>

            <!-- 标点按钮（非编辑） -->
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
                本地
              </el-button>
              <el-button
                type="primary"
                size="small"
                @click="macroStore.doPartyWayMark(macro.Place)"
              >
                公开
              </el-button>
              <el-button
                :icon="CopyDocument"
                size="small"
                class="export"
                @click="macroStore.exportWaymarksJson(macro)"
              >
                复制
              </el-button>
              <el-button
                v-if="macro.Deletability"
                :icon="Edit"
                size="small"
                @click="macroStore.editMacroPlace(macro)"
              />
            </el-row>

            <!-- 标点按钮（编辑） -->
            <el-row v-if="macro.Editable" class="buttonAreaEditing">
              <el-button
                type="success"
                size="small"
                :icon="Check"
                @click="macroStore.submitMacroPlace(macro)"
              >
                完成
              </el-button>
              <el-button
                v-if="macro.Deletability"
                type="danger"
                size="small"
                :icon="Delete"
                @click="macroStore.deleteMacro(macro)"
              >
                删除
              </el-button>
            </el-row>
          </div>
        </el-card>
      </el-space>
    </el-main>

    <!-- 底部菜单区域 -->
    <div class="menu">
      <CommonThemeToggle storage-key="zone-macro-theme" />
      <el-button
        type="success"
        size="small"
        w-20
        @click="macroStore.newMacro()"
      >
        新增宏
      </el-button>
      <el-button
        type="success"
        size="small"
        w-20
        color="#3375b9"
        @click="macroStore.newPlace()"
      >
        新增标点
      </el-button>
      <el-button
        size="small"
        w-20
        color="#BA5783"
        @click="macroStore.importPPJSON()"
      >
        导入PP
      </el-button>
      <el-button
        type="warning"
        size="small"
        w-20
        @click="macroStore.resetZone()"
      >
        恢复本图
      </el-button>
      <el-button
        type="danger"
        size="small"
        w-20
        @click="macroStore.resetAllData()"
      >
        恢复全部
      </el-button>
    </div>
  </el-container>
</template>

<style lang="scss">
@import "@/css/ffxiv-axis-font-icons.css";

* {
  font-family: "FFXIV", "Helvetica Neue", Helvetica, "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
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
  padding-left: 0.25rem !important;

  .fastEntrance {
    max-height: 0;
    opacity: 0;
    transition: all 0.1s;
    width: 100%;
  }

  &:hover {
    .fastEntrance {
      max-height: 2.5rem;
      opacity: 1;
    }
  }
}

.menu {
  width: auto;
  height: auto;
  margin: 0.2rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  transition: all 0.1s;
  position: fixed;
  top: 0;
  right: 0;
  align-items: flex-end;
}

.main-box-card {
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
</style>
