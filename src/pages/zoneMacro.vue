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
import { useWebSocket } from '@/composables/useWebSocket'
import { defaultMacro } from '@/resources/macro'
import zoneInfo from '@/resources/zoneInfo'
import { useMacroStore } from '@/store/macro'
import ContentType from '../../cactbot/resources/content_type'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'
import 'github-markdown-css/github-markdown-light.css'

const macroStore = useMacroStore()
const hideOnStartup = useStorage('zoneMacroHideOnStartup', ref(false))
if (hideOnStartup.value)
  macroStore.show = false

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
    .filter(v =>
      (!v.name.en.startsWith('(')
        && v.contentType
        && showContentTypes.includes(v.contentType))
      || macroStore.selectZone === v.id,
    )
    .forEach((v) => {
      const label = contentTypeLabel.find(ct => ct.type === v.contentType)?.label ?? '临时'

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
      const data = macroStore.data.zoneId[macroStore.selectZone]?.map((v) => {
        const { Editable, ...r } = v
        return r
      }) || defaultMacro.zoneId[macroStore.selectZone] || []

      const userData = data.filter(v => v.Deletability)
      const nativeData = defaultMacro.zoneId[macroStore.selectZone] ?? []
      macroStore.data.zoneId[macroStore.selectZone] = [...nativeData, ...userData]
    },
    { immediate: true },
  )
})
</script>

<template>
  <el-container v-show="macroStore.show" class="elcontainer">
    <el-header flex="~ wrap" height="auto" class="elheader">
      <el-space>
        <el-button type="primary" size="small" :icon="Position" @click="macroStore.positioning()" />
        <el-select
          v-model="macroStore.selectZone"
          size="small"
          filterable m-3px
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
      <el-space>
        <el-button-group flex="~ ! wrap">
          <el-button
            v-for="(entrance, index) in macroStore.fastEntrance" :key="index" bg plain color="rgb(24,34,44)"
            size="small" @click="macroStore.selectZone = entrance.value"
          >
            {{ entrance.text }}
          </el-button>
        </el-button-group>
      </el-space>
    </el-header>
    <el-main style="padding: 0.25rem;margin:0">
      <el-space wrap alignment="flex-start" style="font-size: 12px">
        <el-card
          v-for="(macro, index) in macroStore.data.zoneId[macroStore.selectZone]" :key="index" shadow="hover"
          class="main-box-card"
        >
          <p v-show="!macro.Editable" font-bold m-b-2 m-t-2 v-html="macro.Name" />
          <el-input v-show="macro.Editable" v-model="macro.Name" size="small" placeholder="宏标题" />
          <div v-if="'Text' in macro">
            <article v-if="!macro.Editable">
              <div v-for="(m, o) in macro.Text?.split('\n')" :key="o" class="macroText">
                {{ m }}
              </div>
            </article>
            <el-input
              v-show="macro.Editable" v-model="macro.Text" size="small" :autosize="{ minRows: 3 }"
              type="textarea" placeholder="宏文本" wrap="off" style="width: 450px"
            />
            <el-row
              v-if="!macro.Editable" class="buttonArea" :style="{
                maxHeight: macro.Editable ? '100px' : null,
                opacity: macro.Editable ? 1 : null,
              }"
            >
              <el-button
                v-if="macro.Deletability" :icon="Edit" size="small"
                @click="macroStore.editMacroMacro(macro)"
              />
              <el-button :icon="ChatSquare" size="small" type="info" @click="macroStore.sendMacroEcho(macro.Text)">
                默语
              </el-button>
              <el-button
                :icon="ChatDotSquare" size="small" type="primary"
                @click="macroStore.sendMacroParty(macro.Text)"
              >
                小队
              </el-button>
            </el-row>
            <el-row v-if="macro.Editable" class="buttonAreaEditing">
              <el-button type="success" size="small" :icon="Check" @click="macroStore.submitMacroMacro(macro)">
                完成
              </el-button>
              <el-button
                v-if="macro.Deletability" type="danger" size="small" :icon="Delete"
                @click="macroStore.deleteMacro(macro)"
              >
                删除
              </el-button>
            </el-row>
          </div>
          <div v-if="'Place' in macro">
            <el-space v-show="macro.Editable">
              <el-table
                :data="Object.entries(macro.Place).filter(v => ['A', 'B', 'C', 'D', 'One', 'Two', 'Three', 'Four'].includes(v[0]))"
                border size="small"
              >
                <el-table-column v-if="macro.Editable" align="center" label="启用" width="50">
                  <template #default="scope">
                    <el-switch v-model="scope.row[1].Active" size="small" style="--el-switch-on-color: #13ce66" />
                  </template>
                </el-table-column>
                <el-table-column align="center" label="标记" width="50">
                  <template #default="scope">
                    <span v-show="true">{{ scope.row[0] }}</span>
                  </template>
                </el-table-column>
                <el-table-column align="center" label="X（左右）" width="140">
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.X }}</span>
                    <el-input-number
                      v-show="macro.Editable" v-model="scope.row[1].X" controls-position="right"
                      :step="0.1" :precision="2" size="small"
                    />
                  </template>
                </el-table-column>
                <el-table-column align="center" label="Z（上下）" width="140">
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.Z }}</span>
                    <el-input-number
                      v-show="macro.Editable" v-model="scope.row[1].Z" controls-position="right"
                      :step="0.1" :precision="2" size="small"
                    />
                  </template>
                </el-table-column>
                <el-table-column align="center" label="Y（高度）" width="140">
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.Y }}</span>
                    <el-input-number
                      v-show="macro.Editable" v-model="scope.row[1].Y" controls-position="right"
                      :step="0.1" :precision="2" size="small"
                    />
                  </template>
                </el-table-column>
              </el-table>
            </el-space>
            <el-space>
              <ZoneMacroMarksDiv :macro="macro" />
            </el-space>
            <el-row
              v-if="!macro.Editable" class="buttonArea" :style="{
                maxHeight: macro.Editable ? '100px' : null,
                opacity: macro.Editable ? 1 : null,
              }"
            >
              <el-button type="primary" size="small" @click="macroStore.doLocalWayMark(macro.Place)">
                本地
              </el-button>
              <el-button type="primary" size="small" @click="macroStore.doPartyWayMark(macro.Place)">
                公开
              </el-button>
              <!-- <el-button type="primary" size="small" @click="macroStore.doSlotWayMark(macro.Place)">
                插槽
              </el-button> -->
              <el-button
                :icon="CopyDocument" size="small" class="export"
                @click="macroStore.exportWaymarksJson(macro)"
              >
                复制
              </el-button>
              <el-button
                v-if="macro.Deletability" :icon="Edit" size="small"
                @click="macroStore.editMacroPlace(macro)"
              />
            </el-row>
            <el-row v-if="macro.Editable" class="buttonAreaEditing">
              <el-button type="success" size="small" :icon="Check" @click="macroStore.submitMacroPlace(macro)">
                完成
              </el-button>
              <el-button
                v-if="macro.Deletability" type="danger" size="small" :icon="Delete"
                @click="macroStore.deleteMacro(macro)"
              >
                删除
              </el-button>
            </el-row>
          </div>
        </el-card>
      </el-space>
    </el-main>
    <div class="menu">
      <CommonThemeToggle />
      <el-button type="success" size="small" w-20 @click="macroStore.newMacro()">
        新增宏
      </el-button>
      <el-button type="success" w-20 size="small" color="#3375b9" @click="macroStore.newPlace()">
        新增标点
      </el-button>
      <el-button color="#BA5783" size="small" w-20 @click="macroStore.importPPJSON()">
        导入PP
      </el-button>
      <el-button type="warning" size="small" w-20 @click="macroStore.resetZone()">
        恢复本图
      </el-button>
      <el-button type="danger" size="small" w-20 @click="macroStore.resetAllData()">
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
  >.el-card__body {
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

.markIcon {
  position: absolute;
  text-align: center;
  transform: translate(-50%, -50%);
  font-weight: bold;
  color: white;
  -webkit-text-stroke: 1px rgba(50, 50, 50, 1);
  z-index: 10;
  overflow: hidden;
  padding: 5px;
  user-select: none;
}

$color1: rgba(255, 0, 0, 1);
$color2: rgba(255, 255, 0, 1);
$color3: rgba(0, 0, 255, 1);
$color4: rgba(128, 0, 128, 1);

.markIconA,
.markIconOne {
  text-shadow: 0 0 1px $color1, 0 0 2px $color1, 0 0 3px $color1;
}

.markIconB,
.markIconTwo {
  text-shadow: 0 0 1px $color2, 0 0 2px $color2, 0 0 3px $color2;
}

.markIconC,
.markIconThree {
  text-shadow: 0 0 1px $color3, 0 0 2px $color3, 0 0 3px $color3;
}

.markIconD,
.markIconFour {
  text-shadow: 0 0 1px $color4, 0 0 2px $color4, 0 0 3px $color4;
}

.el-select-group__title{
  font-weight: bold;
  font-size: 12px;
  color: var(--el-text-color-regular);
  padding-left: 1em;
}
</style>
