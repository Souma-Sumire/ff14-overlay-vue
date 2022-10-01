<script setup lang="ts">
import actWS from "@/assets/actWS.png";
import { Check, Delete, Edit, Plus, Position, RefreshLeft } from "@element-plus/icons-vue";
import Swal from "sweetalert2";
import "@sweetalert2/theme-bootstrap-4/bootstrap-4.scss";
import { defaultMacro } from "@/resources/macro";
import zoneInfo from "@/resources/zoneInfo";
import { useMacroStore } from "@/store/macro";
// import charactersJson from "@/resources/characters.json";

// const charactersData = new Map(Object.entries(charactersJson));
const [help, toggleHelp] = useToggle(false);
const macroStore = useMacroStore();
macroStore.initAllData();
{
  //兼容旧数据的更新策略 日后删除
  for (const macros in macroStore.data.zoneId) {
    for (const key in macroStore.data.zoneId[macros]) {
      const item = macroStore.data.zoneId[macros][key];
      // @ts-ignore
      if (item.name) item.Name = item.name;
      // @ts-ignore
      if (item.type) item.Type = item.type;
      // @ts-ignore
      if (item.text) item.Text = item.text;
      // @ts-ignore
      if (item.place) item.Place = item.place;
      Reflect.deleteProperty(item, "name");
      Reflect.deleteProperty(item, "type");
      Reflect.deleteProperty(item, "text");
      Reflect.deleteProperty(item, "place");
      if (item.Type === "place") {
        Reflect.deleteProperty(item.Place, "MapID");
        Reflect.deleteProperty(item.Place, "Name");
        if (item.Place instanceof Array) {
          const res = {
            A: item.Place.find((v) => v.Mark === "A"),
            B: item.Place.find((v) => v.Mark === "B"),
            C: item.Place.find((v) => v.Mark === "C"),
            D: item.Place.find((v) => v.Mark === "D"),
            One: item.Place.find((v) => v.Mark === "One"),
            Two: item.Place.find((v) => v.Mark === "Two"),
            Three: item.Place.find((v) => v.Mark === "Three"),
            Four: item.Place.find((v) => v.Mark === "Four"),
          };
          // @ts-ignore
          for (const k in res) Reflect.deleteProperty(res[k], "Mark");
          item.Place = res;
        }
      }
    }
  }
}
const markMap = {
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  One: "1",
  Two: "2",
  Three: "3",
  Four: "4",
};
addOverlayListener("onGameExistsEvent", macroStore.handleGameExists);
addOverlayListener("ChangeZone", macroStore.handleChangeZone);
addOverlayListener("LogLine", macroStore.handleLogLine);
startOverlayEvents();
watchEffect(() => {
  macroStore.data.zoneId[macroStore.selectZone] =
    macroStore.data.zoneId[macroStore.selectZone] || defaultMacro.zoneId[macroStore.selectZone];
});
watch(
  toRef(macroStore, "selectZone"),
  () => {
    macroStore.initSelectZoneData(macroStore.selectZone);
  },
  { immediate: true },
);
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
      Swal.fire({
        title: "已断开连接",
        text: "请按照上图所示进行操作，然后刷新页面。",
        imageUrl: actWS,
        allowOutsideClick: false,
        showConfirmButton: false,
      });
    }
  }
};
onMounted(() => {
  raidEmulatorOnLoad();
});
// function parseMacroText(innerHTML: string): string {
//   return innerHTML
//     .split("")
//     .map((v) => {
//       const conV = convertUnicode(v);
//       if (charactersData.has(conV)) {
//         const [char, info] = charactersData.get(conV) as [string, string];
//         return `<i class="xiv ${char}" data-info="${info}"></i>`;
//       }
//       return v;
//     })
//     .join("");
// }
// function convertUnicode(string: string) {
//   return string.charCodeAt(0).toString(16);
// }
</script>
<template>
  <el-container bg-white rd-1>
    <el-header flex="~ wrap gap1" height="auto">
      <el-space>
        <el-button type="primary" :icon="Position" @click="macroStore.positioning()">当前区域</el-button>
        <el-select w-369px m-3px v-model="macroStore.selectZone" filterable placeholder="Select">
          <el-option
            v-for="(item, i) in zoneInfo"
            :key="i"
            :label="item.name?.cn ?? `${item.name.en} / ${item.name.ja}`"
            :value="i"
          />
        </el-select>
      </el-space>
      <el-space>
        <el-button-group flex="~ !">
          <el-button
            plain
            bg
            color="rgb(24,34,44)"
            v-for="(entrance, index) in macroStore.fastEntrance"
            :key="index"
            @click="macroStore.selectZone = entrance.value"
            >{{ entrance.text }}</el-button
          >
        </el-button-group>
      </el-space>
    </el-header>
    <el-main>
      <el-space wrap alignment="flex-start" style="font-size: 12px">
        <el-card
          shadow="hover"
          v-for="(macro, index) in macroStore.data.zoneId[macroStore.selectZone]"
          :key="index"
          class="main-box-card"
        >
          <template #header>
            <div class="card-header">
              <span v-show="!macro.Editable" v-html="macro.Name"></span>
              <el-input size="small" v-show="macro.Editable" v-model="macro.Name" placeholder="宏标题" />
            </div>
          </template>
          <div v-if="macro.Type === 'macro'">
            <article v-if="!macro.Editable">
              <div v-for="(m, o) in macro.Text?.split('\n')" :key="o" class="macroText">{{ m }}</div>
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
              class="buttonArea"
              style="margin-top: 5px"
              :style="{ maxHeight: macro.Editable ? '100px' : null, opacity: macro.Editable ? 1 : null }"
            >
              <el-button
                type="primary"
                v-show="!macro.Editable"
                :icon="Edit"
                circle
                @click="macroStore.editMacroMacro(macro)"
              />
              <el-button
                type="success"
                v-show="macro.Editable"
                :icon="Check"
                circle
                @click="macroStore.submitMacroMacro(macro)"
              />
              <el-button type="danger" :icon="Delete" circle @click="macroStore.deleteMacro(macro)" />
              <el-button type="info" @click="macroStore.sendMacroEcho(macro.Text)">默</el-button>
              <el-button type="primary" @click="macroStore.sendMacroParty(macro.Text)">队</el-button>
            </el-row>
          </div>
          <div v-if="macro.Type === 'place'">
            <el-space v-show="macro.Editable">
              <el-table :data="Object.entries(macro.Place)" border size="small">
                <el-table-column align="center" v-if="macro.Editable" label="启用" width="85">
                  <template #default="scope">
                    <el-switch v-model="scope.row[1].Active" size="small" style="--el-switch-on-color: #13ce66" />
                  </template>
                </el-table-column>
                <el-table-column align="center" label="标记" width="85">
                  <template #default="scope">
                    <span v-show="true">{{ scope.row[0] }}</span>
                  </template>
                </el-table-column>
                <el-table-column align="center" label="X" width="85">
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.X }}</span>
                    <el-input
                      type="number"
                      :precision="2"
                      size="small"
                      controls-position="right"
                      v-show="macro.Editable"
                      v-model="scope.row[1].X"
                    ></el-input>
                  </template>
                </el-table-column>
                <el-table-column align="center" label="Z" width="85">
                  <template #default="scope">
                    <span v-show="!macro.Editable">{{ scope.row.Z }}</span>
                    <el-input
                      type="number"
                      :precision="2"
                      size="small"
                      controls-position="right"
                      v-show="macro.Editable"
                      v-model="scope.row[1].Z"
                    ></el-input>
                  </template>
                </el-table-column>
                <el-table-column align="center" label="Y" width="85">
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
              <div h200px w200px style="position: relative; background-color: rgba(214, 199, 148, 1)">
                <div v-for="(mark, i) in ['A', 'B', 'C', 'D', 'One', 'Two', 'Three', 'Four']" :key="i">
                  <span
                    class="markIcon"
                    :class="'markIcon' + mark"
                    :style="{
                      left: Math.min(200, Math.max(0, (Number(macro.Place[(mark as WayMarkKeys)].X) + macroStore.defaultX) * 3 + 100)) + 'px',
                      top: Math.min(200, Math.max(0, (Number(macro.Place[mark as WayMarkKeys].Z) + macroStore.defaultY) * 3 + 100)) + 'px',
                    }"
                  >
                    {{ macro.Place[mark as WayMarkKeys].Active ? markMap[mark as WayMarkKeys] ?? mark : "" }}
                  </span>
                </div>
              </div>
            </el-space>
            <el-row
              class="buttonArea"
              style="margin-top: 5px"
              :style="{ maxHeight: macro.Editable ? '100px' : null, opacity: macro.Editable ? 1 : null }"
            >
              <el-button
                type="primary"
                v-show="!macro.Editable"
                :icon="Edit"
                circle
                @click="macroStore.editMacroPlace(macro)"
              />
              <el-button
                type="success"
                v-show="macro.Editable"
                :icon="Check"
                circle
                @click="macroStore.submitMacroPlace(macro)"
              />
              <el-button type="danger" :icon="Delete" circle @click="macroStore.deleteMacro(macro)" />
              <!-- <el-button type="primary" @click="macroStore.doLocalWayMark(macro.Place)">本地</el-button> -->
              <el-button type="primary" plain @click="macroStore.doSlotWayMark(macro.Place)">插槽</el-button>
            </el-row>
          </div>
        </el-card>
      </el-space>
    </el-main>
    <el-footer>
      <el-space flex="~ wrap" style="column-gap: 0em; row-gap: 0.5em">
        <el-button type="success" :icon="Plus" @click="macroStore.newOne('macro')">新增宏文本</el-button>
        <el-button type="success" color="#3375b9" :icon="Plus" @click="macroStore.newOne('place')"
          >新增场地标记</el-button
        >
        <el-button color="#BA5783" :icon="Plus" @click="macroStore.importPPJSON()">导入PP字符串</el-button>
        <el-button type="warning" :icon="RefreshLeft" @click="macroStore.resetZone()">恢复本图默认</el-button>
        <el-button type="danger" :icon="RefreshLeft" @click="macroStore.resetAllData()">恢复全部默认</el-button>
        <el-button @click="toggleHelp()">帮助</el-button>
      </el-space>
      <el-card v-show="help" m-t-1em> <ZoneMacroZoneMacroHelp></ZoneMacroZoneMacroHelp> </el-card>
    </el-footer>
  </el-container>
</template>
<style lang="scss">
@import "@/css/ffxiv-axis-font-icons.css";
* {
  font-family: "FFXIV", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑",
    Arial, sans-serif;
  pointer-events: initial;
}
.main-box-card {
  max-width: 500px;
  :deep(a) {
    color: blue;
    padding: 0.5em;
    font-weight: 700;
    font-size: 14px;
  }
  .buttonArea {
    max-height: 0;
    overflow: hidden;
    opacity: 0.5;
    transition: all 0.5s ease-in-out;
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
    white-space: nowrap;
    vertical-align: baseline;
    line-height: 1.5;
  }
}

.markIcon {
  position: absolute;
  text-align: center;
  transform: translate(-50%, -50%);
  font-size: 21px;
  font-weight: bold;
  color: white;
  -webkit-text-stroke: 1px rgba(50, 50, 50, 1);
  z-index: 10;
  overflow: hidden;
  padding: 5px;
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
