<script setup lang="ts">
import zoneInfo from "../resources/zoneInfo";
import { Edit, Check, Delete, Position, Plus, RefreshLeft } from "@element-plus/icons-vue";
import { useMacroStore } from "../store/macro";
const macroStore = useMacroStore();
macroStore.cleanEditable();
addOverlayListener("ChangeZone", macroStore.handleChangeZone);
startOverlayEvents();
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
</script>
<template>
  <el-container>
    <el-header flex style="align-items: center; height: 35px">
      <el-space :size="10">
        <el-button type="primary" :icon="Position" @click="macroStore.positioning()">当前区域</el-button>
        <el-select w-369px m-3px v-model="macroStore.selectZone" filterable placeholder="Select">
          <el-option
            v-for="(item, i) in zoneInfo"
            :key="i"
            :label="item.name?.cn ?? `${item.name.en} / ${item.name.ja}`"
            :value="i"
          />
        </el-select>
        <span style="white-space: nowrap">常用：</span>
        <el-button
          plain
          color="rgb(24,34,44)"
          v-for="(entrance, index) in macroStore.fastEntrance"
          :key="index"
          @click="macroStore.selectZone = entrance.value"
          >{{ entrance.text }}</el-button
        >
      </el-space>
    </el-header>
    <el-main>
      <el-space wrap alignment="flex-start" style="font-size: 12px">
        <el-card v-for="(macro, index) in macroStore.data.zoneId[macroStore.selectZone]" :key="index" class="box-card">
          <template #header>
            <div class="card-header">
              <span v-show="!macro.editable">{{ macro.name }}</span>
              <el-input size="small" v-show="macro.editable" v-model="macro.name" placeholder="宏标题" />
            </div>
          </template>
          <div v-if="macro.type === 'macro'">
            <article v-if="!macro.editable">
              <div style="white-space: nowrap" v-for="(macro, o) in macro.text?.split('\n')" :key="o" class="text item">
                {{ macro }}
              </div>
            </article>
            <el-input
              size="small"
              v-show="macro.editable"
              v-model="macro.text"
              :autosize="{ minRows: 5 }"
              type="textarea"
              placeholder="宏文本"
              wrap="off"
              @change="macroStore.cleanEditable"
              style="width: 25em"
            />
            <el-row style="padding-top: 10px">
              <el-button
                class="hvr-grow"
                type="primary"
                v-show="!macro.editable"
                :icon="Edit"
                circle
                @click="macroStore.editMacro(macro)"
              />
              <el-button
                class="hvr-grow"
                type="success"
                v-show="macro.editable"
                :icon="Check"
                circle
                @click="macroStore.submitMacro(macro)"
              />
              <el-button class="hvr-grow" type="danger" :icon="Delete" circle @click="macroStore.deleteMacro(macro)" />
              <el-button class="hvr-grow" type="info" @click="macroStore.sendMacroEcho(macro?.text ?? '')"
                >默</el-button
              >
              <el-button class="hvr-grow" type="primary" @click="macroStore.sendMacroParty(macro?.text ?? '')"
                >队</el-button
              >
            </el-row>
          </div>
          <div v-if="macro.type === 'place'">
            <el-space v-show="macro.editable">
              <el-button @click="macroStore.importPPJSON(macro)">导入PP格式JSON</el-button>
            </el-space>
            <el-table :data="macro.place" border size="small" style="width: 100%">
              <el-table-column align="center" v-if="macro.editable" label="启用" width="75">
                <template #default="scope">
                  <el-switch v-model="scope.row.Active" size="small" style="--el-switch-on-color: #13ce66" />
                </template>
              </el-table-column>
              <el-table-column align="center" label="标记" width="75">
                <template #default="scope">
                  <span v-show="true">{{ scope.row.Mark }}</span>
                </template>
              </el-table-column>
              <el-table-column align="center" label="X" width="75">
                <template #default="scope">
                  <span v-show="!macro.editable">{{ scope.row.X }}</span>
                  <el-input
                    type="number"
                    :precision="2"
                    size="small"
                    controls-position="right"
                    v-show="macro.editable"
                    v-model="scope.row.X"
                  ></el-input>
                </template>
              </el-table-column>
              <el-table-column align="center" label="Z" width="75">
                <template #default="scope">
                  <span v-show="!macro.editable">{{ scope.row.Z }}</span>
                  <el-input
                    type="number"
                    :precision="2"
                    size="small"
                    controls-position="right"
                    v-show="macro.editable"
                    v-model="scope.row.Z"
                  ></el-input>
                </template>
              </el-table-column>
              <el-table-column align="center" label="Y" width="75">
                <template #default="scope">
                  <span v-show="!macro.editable">{{ scope.row.Y }}</span>
                  <el-input
                    type="number"
                    :precision="2"
                    size="small"
                    controls-position="right"
                    v-show="macro.editable"
                    v-model="scope.row.Y"
                  ></el-input>
                </template>
              </el-table-column>
            </el-table>
            <el-space>
              <div h200px w200px style="position: relative; background-color: rgba(214, 199, 148, 1)">
                <span
                  v-for="(mark, index) in macro.place"
                  :key="index"
                  class="markIcon"
                  :class="'markIcon' + mark.Mark"
                  :style="{
                    left: Math.min(200, Math.max(0, (mark.X - 100) * 4 + 100)) + 'px',
                    top: Math.min(200, Math.max(0, (mark.Z - 100) * 4 + 100)) + 'px',
                  }"
                >
                  {{ mark.Active ? markMap[mark.Mark] ?? mark.Mark : "" }}
                </span>
              </div>
            </el-space>
            <el-row style="padding-top: 10px">
              <el-button
                class="hvr-grow"
                type="primary"
                v-show="!macro.editable"
                :icon="Edit"
                circle
                @click="macroStore.editMacro(macro)"
              />
              <el-button
                class="hvr-grow"
                type="success"
                v-show="macro.editable"
                :icon="Check"
                circle
                @click="macroStore.submitMacro(macro)"
              />
              <el-button class="hvr-grow" type="danger" :icon="Delete" circle @click="macroStore.deleteMacro(macro)" />
              <el-button class="hvr-grow" type="primary" @click="macroStore.doLocalWayMark(macro?.place)"
                >本地</el-button
              >
              <el-button type="primary" plain disabled @click="macroStore.doSlotWayMark(macro?.place)"
                >插槽(未实现)</el-button
              >
            </el-row>
          </div>
        </el-card>
      </el-space>
    </el-main>
    <el-footer>
      <el-button type="success" :icon="Plus" @click="macroStore.newOne('macro')">新增宏文本</el-button>
      <el-button type="success" color="#3375b9" :icon="Plus" @click="macroStore.newOne('place')"
        >新增场地标记</el-button
      >
      <el-button type="danger" :icon="RefreshLeft" @click="macroStore.resetZone()">恢复默认</el-button>
    </el-footer>
  </el-container>
</template>
<style lang="scss" scoped>
@import url("../css/hover.css");
.markIcon {
  position: absolute;
  text-align: center;
  transform: translate(-50%, -50%);
  font-size: 16px;
  font-weight: bold;
  color: white;
  -webkit-text-stroke: 1px rgba(50, 50, 50, 0.8);
  z-index: 222;
  overflow: hidden;
  padding: 5px;
}
$color1: rgba(255, 0, 0, 0.5);
$color2: rgba(255, 255, 0, 0.5);
$color3: rgba(0, 0, 255, 0.5);
$color4: rgba(128, 0, 128, 0.5);
.markIconA,
.markIconOne {
  text-shadow: -1px 0 3px $color1, 0 1px 3px $color1, 1px 0 3px $color1, 0 -1px 3px $color1;
}
.markIconB,
.markIconTwo {
  text-shadow: -1px 0 3px $color2, 0 1px 3px $color2, 1px 0 3px $color2, 0 -1px 3px $color2;
}
.markIconC,
.markIconThree {
  text-shadow: -1px 0 3px $color3, 0 1px 3px $color3, 1px 0 3px $color3, 0 -1px 3px $color3;
}
.markIconD,
.markIconFour {
  text-shadow: -1px 0 3px $color4, 0 1px 3px $color4, 1px 0 3px $color4, 0 -1px 3px $color4;
}
</style>
