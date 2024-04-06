<script setup lang="ts">
import actWS from "@/assets/actWS.webp";
import {
  Check,
  Delete,
  Edit,
  Position,
  CopyDocument,
  ChatDotSquare,
  ChatSquare,
} from "@element-plus/icons-vue";
import { defaultMacro } from "@/resources/macro";
import zoneInfo from "@/resources/zoneInfo";
import { useMacroStore } from "@/store/macro";
import "github-markdown-css/github-markdown-light.css";
import README from "@/common/markdown/zoneMacro.md";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  addOverlayListener,
  callOverlayHandler,
} from "../../cactbot/resources/overlay_plugin_api";
const [help, toggleHelp] = useToggle(false);
const macroStore = useMacroStore();
const hideOnStartup = useStorage("zoneMacroHideOnStartup", ref(false));
if (hideOnStartup.value) macroStore.show = false;
macroStore.formatAllWaymarkPlaceData();

const raidEmulatorOnLoad = async () => {
  let websocketConnected = false;
  if (window.location.href.indexOf("OVERLAY_WS") > 0) {
    websocketConnected = await Promise.race<Promise<boolean>>([
      new Promise<boolean>((res) => {
        void callOverlayHandler({ call: "cactbotRequestState" }).then(() => {
          res(true);
        });
      }),
      new Promise<boolean>((res) => {
        window.setTimeout(() => {
          res(false);
        }, 1000);
      }),
    ]);
    if (!websocketConnected) {
      ElMessageBox.alert(
        `请先启动ACT，再打开此页面<img src='${actWS}' style='width:100%'>`,
        "未检测到ACT连接",
        {
          confirmButtonText: "确定",
          dangerouslyUseHTMLString: true,
        }
      );
    }
  }
};

onMounted(() => {
  // addOverlayListener("onGameExistsEvent", macroStore.handleGameExists);
  addOverlayListener("ChangeZone", macroStore.handleChangeZone);
  addOverlayListener("LogLine", macroStore.handleLogLine);
  startOverlayEvents();
  watchEffect(() => {
    if (
      (macroStore.data.zoneId[macroStore.selectZone] === undefined ||
        macroStore.data.zoneId[macroStore.selectZone]?.length === 0) &&
      defaultMacro.zoneId[macroStore.selectZone]
    ) {
      ElMessage.success("用户数据为空，加载默认数据");
      macroStore.data.zoneId[macroStore.selectZone] =
        defaultMacro.zoneId[macroStore.selectZone];
    }
  });
  watch(
    toRef(macroStore, "selectZone"),
    () => {
      macroStore.formatSelectZoneWaymarkPlaceData(macroStore.selectZone);
    },
    { immediate: true }
  );
  raidEmulatorOnLoad();
  macroStore.updateZone();
});
</script>
<template>
  <i
    class="vxe-icon-search-zoom-in"
    style="position: fixed; top: 0; right: 0; color: white; cursor: pointer"
    v-show="!macroStore.show"
    @click="macroStore.toggleShow()"
  ></i>
  <el-container
    rd-1
    m-0
    p-0
    absolute
    left-0
    top-0
    v-show="macroStore.show"
    class="elcontainer"
  >
    <el-header flex="~ wrap gap1" height="auto" p-l-1 class="elheader">
      <el-space>
        <el-button
          type="primary"
          size="small"
          :icon="Position"
          @click="macroStore.positioning()"
          >当前</el-button
        >
        <el-select
          size="small"
          style="width: 10rem"
          m-3px
          v-model="macroStore.selectZone"
          filterable
          placeholder="Select"
        >
          <el-option
            v-for="(item, i) in zoneInfo"
            :key="i"
            :label="item.name?.cn ?? `${item.name.en} / ${item.name.ja}`"
            :value="i"
          />
        </el-select>
      </el-space>
      <el-space class="fastEntrance">
        <el-button-group flex="~ ! wrap">
          <el-button
            plain
            bg
            color="rgb(24,34,44)"
            size="small"
            v-for="(entrance, index) in macroStore.fastEntrance"
            :key="index"
            @click="macroStore.selectZone = entrance.value"
            >{{ entrance.text }}</el-button
          >
        </el-button-group>
      </el-space>
    </el-header>
    <el-main p-1 m-0>
      <el-space
        v-show="!help"
        wrap
        alignment="flex-start"
        style="font-size: 12px"
      >
        <el-card
          shadow="hover"
          v-for="(macro, index) in macroStore.data.zoneId[
            macroStore.selectZone
          ]"
          :key="index"
          class="main-box-card"
        >
          <p
            m-t-2
            m-b-2
            v-show="!macro.Editable"
            v-html="macro.Name"
            font-bold
          ></p>
          <el-input
            size="small"
            v-show="macro.Editable"
            v-model="macro.Name"
            placeholder="宏标题"
          />
          <div v-if="macro.Type === 'macro'">
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
              size="small"
              v-show="macro.Editable"
              v-model="macro.Text"
              :autosize="{ minRows: 3 }"
              type="textarea"
              placeholder="宏文本"
              wrap="off"
              style="width: 450px"
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
              ></el-button>
              <el-button
                :icon="ChatSquare"
                size="small"
                type="info"
                @click="macroStore.sendMacroEcho(macro.Text)"
                >默语</el-button
              >
              <el-button
                :icon="ChatDotSquare"
                size="small"
                type="primary"
                @click="macroStore.sendMacroParty(macro.Text)"
                >小队</el-button
              >
            </el-row>
            <el-row v-if="macro.Editable" class="buttonAreaEditing">
              <el-button
                type="success"
                size="small"
                :icon="Check"
                @click="macroStore.submitMacroMacro(macro)"
                >完成</el-button
              >
              <el-button
                v-if="macro.Deletability"
                type="danger"
                size="small"
                :icon="Delete"
                @click="macroStore.deleteMacro(macro)"
              >
                删除</el-button
              ></el-row
            >
          </div>
          <div v-if="macro.Type === 'place'">
            <el-space v-show="macro.Editable">
              <el-table :data="Object.entries(macro.Place)" border size="small">
                <el-table-column
                  align="center"
                  v-if="macro.Editable"
                  label="启用"
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
                <el-table-column align="center" label="标记" width="50">
                  <template #default="scope">
                    <span v-show="true">{{ scope.row[0] }}</span>
                  </template>
                </el-table-column>
                <el-table-column align="center" label="X" width="140">
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.X }}</span>
                    <el-input-number
                      controls-position="right"
                      :step="0.1"
                      :precision="2"
                      size="small"
                      v-show="macro.Editable"
                      v-model="scope.row[1].X"
                    ></el-input-number>
                  </template>
                </el-table-column>
                <el-table-column align="center" label="Z" width="140">
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.Z }}</span>
                    <el-input-number
                      controls-position="right"
                      :step="0.1"
                      :precision="2"
                      size="small"
                      v-show="macro.Editable"
                      v-model="scope.row[1].Z"
                    ></el-input-number>
                  </template>
                </el-table-column>
                <el-table-column
                  align="center"
                  label="Y"
                  width="85"
                  v-if="false"
                >
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.Y }}</span>
                    <el-input
                      type="number"
                      :precision="2"
                      size="small"
                      controls-position="right"
                      v-show="macro.Editable"
                      v-model="scope.row[1].Y"
                    ></el-input>
                  </template>
                </el-table-column>
              </el-table>
            </el-space>
            <el-space>
              <ZoneMacroMarksDiv :macro="macro"></ZoneMacroMarksDiv>
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
                >本地</el-button
              >
              <el-button
                type="primary"
                size="small"
                @click="macroStore.doSlotWayMark(macro.Place)"
                >插槽</el-button
              >
              <el-button
                :icon="CopyDocument"
                size="small"
                class="export"
                @click="macroStore.exportWaymarksJson(macro)"
              ></el-button>
              <el-button
                v-if="macro.Deletability"
                :icon="Edit"
                size="small"
                @click="macroStore.editMacroPlace(macro)"
              ></el-button>
            </el-row>
            <el-row v-if="macro.Editable" class="buttonAreaEditing">
              <el-button
                type="success"
                size="small"
                :icon="Check"
                @click="macroStore.submitMacroPlace(macro)"
                >完成</el-button
              >
              <el-button
                v-if="macro.Deletability"
                type="danger"
                size="small"
                :icon="Delete"
                @click="macroStore.deleteMacro(macro)"
                >删除</el-button
              >
            </el-row>
          </div>
        </el-card>
      </el-space>
      <el-card v-show="help" class="markdown-body">
        <README />
      </el-card>
    </el-main>
    <div class="menu">
      <el-button size="small" @click="macroStore.toggleShow()"
        >隐藏页面</el-button
      >
      <el-button type="success" size="small" @click="macroStore.newOne('macro')"
        >新增宏</el-button
      >
      <el-button
        type="success"
        size="small"
        color="#3375b9"
        @click="macroStore.newOne('place')"
        >新增标点</el-button
      >
      <el-button color="#BA5783" size="small" @click="macroStore.importPPJSON()"
        >导入PP</el-button
      >
      <el-button type="warning" size="small" @click="macroStore.resetZone()"
        >恢复本图</el-button
      >
      <el-button type="danger" size="small" @click="macroStore.resetAllData()"
        >恢复全部</el-button
      >
      <!-- <el-button type="success" size="small" @click="macroStore.updateZone()">数据更新</el-button> -->
      <el-button size="small" @click="toggleHelp()">查看帮助</el-button>
      <form bg-white style="font-size: 12px">
        <el-switch v-model="hideOnStartup" size="small" />默认最小化
      </form>
      <i class="vxe-icon-arrow-down">菜单</i>
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
::-webkit-scrollbar-track {
  background-color: rgba(51, 51, 51, 1);
}
::-webkit-scrollbar-thumb {
  height: 30px;
  border-radius: 5px;
  background-color: rgba(216, 216, 216, 0.4);
}
::-webkit-scrollbar-thumb:active {
  background-color: rgba(160, 160, 160, 1);
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
  background-color: white;
  height: 100%;
  width: 100%;
}
.elheader {
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
  [class*="vxe-"] {
    text-align: center;
    font-size: 14px;
  }
  background: transparent;
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
  transform: translateY(calc(-100% + 1rem));
  opacity: 0.5;
  z-index: 100;
  &:hover {
    transform: translateY(0);
    opacity: 1;
    [class*="vxe-"] {
      opacity: 0;
    }
  }
  .el-button {
    margin: 0;
  }
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
    text-overflow: ellipsis;
    overflow: hidden;
    line-height: 1.5;
  }
  @media screen and (max-width: 600px) {
    .macroText {
      white-space: normal;
    }
  }
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
</style>
