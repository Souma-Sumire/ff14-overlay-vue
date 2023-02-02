<script setup lang="ts">
import { getActionChinese } from "@/resources/actionChinese";
import {
  FflogsjsonReport,
  FflogsjsonCast,
  FflogsjsonDamageTaken,
  Fight,
  Enemy,
  Friendly,
  // CastEvent,
  TakenEvent,
  AbilityDamageType,
  // AuraAbilities,
} from "@/types/Fflogs2";
import { keigennData, createIconUrl, Keigenn } from "@/resources/keigenn";
import { ElMessage, ElMessageBox } from "element-plus";
import moment from "moment";
import { VxeTablePropTypes } from "vxe-table";
// import { getImgSrc } from "@/utils/xivapi";
type processedKeigenn = Omit<Keigenn, "icon"> & { icon: string };
const data = useStorage("fflogs-csv-timeline-create", {
  api_key: "",
  url: "",
  fight: undefined as Fight | undefined,
  enemies: [] as Enemy[],
  friendlies: [] as Friendly[],
  enemiesIDs: [] as number[],
  friendyIDs: [] as number[],
  // castEvents: [] as CastEvent[],
  takenEvents: [] as TakenEvent[],
  // auraAbilities: [] as AuraAbilities[],
  code: "" as string,
  showCN: true as boolean,
  // uniqueBuffs: [] as { id: number; url: string; title: string }[],
  filter: {
    friendlyID: 0 as number,
  },
  tableData: [] as TakenEvent[],
  keigenns: [] as processedKeigenn[],
});
data.value.keigenns = keigennData.map((k) => {
  return Object.assign(k, { icon: typeof k.icon === "number" ? createIconUrl(k.icon) : k.icon });
});
const loading = ref(false);
async function startParse() {
  loading.value = true;
  let reg = data.value.url.match(/(?<=^|\/)(?<code>[\d\w]{16,})\/?#fight=(?<fight>\d+|last)/);
  if (data.value.api_key.length !== 32) {
    ElMessageBox.alert("错误的 API key");
    return;
  }
  if (!reg) {
    ElMessage.error("战斗记录输入有误");
    return;
  }
  data.value.code = reg.groups!.code;
  await fetch(`https://cn.fflogs.com/v1/report/fights/${data.value.code}?api_key=${data.value.api_key}`)
    .then((res) => res.json())
    .then(async (res: FflogsjsonReport) => {
      const fightIndex = (reg!.groups!.fight === "last" ? res.fights.length : parseInt(reg!.groups!.fight)) - 1;
      data.value.fight = res.fights[fightIndex];
      data.value.enemiesIDs = res.enemies.filter((enemy) => enemy.type === "Boss").map((boss) => boss.id);
      data.value.enemies = res.enemies;
      data.value.friendlies = res.friendlies.filter((v) => v.fights.find((f) => f.id === fightIndex));
      data.value.friendyIDs = data.value.friendlies
        .map((friendly) => friendly.id)
        .filter((v) => res.friendlies.find((f) => f.id === v)?.type !== "LimitBreak");
      // data.value.castEvents = []; //
      data.value.takenEvents = [];
      // data.value.auraAbilities = [];
      await getEvents("taken", data.value.fight.start_time, data.value.fight.end_time, 0);
      data.value.takenEvents = data.value.takenEvents
        .filter((v) => v.ability.name !== "Combined DoTs" && v.type === "damage")
        .sort((a, b) => a.timestamp - b.timestamp);
      // data.value.castEvents.sort((a, b) => a.timestamp - b.timestamp);
      // data.value.auraAbilities = Array.from(new Set(data.value.auraAbilities));
      // data.value.uniqueBuffs = Array.from(
      //   new Set(
      //     data.value.takenEvents
      //       .map((v) => v.buffs?.split("."))
      //       .flat()
      //       .map((v) => Number(v))
      //       .filter((v) => v),
      //   ),
      // )
      //   .filter((v) => getKeigenn(v - 1000000))
      //   .sort(
      //     (a, b) =>
      //       keigennArr.findIndex((f) => f.id === a - 1000000) - keigennArr.findIndex((f) => f.id === b - 1000000),
      //   )
      //   .map((v) => ({ id: v, url: getSrc(v), title: getTitle(v) }));
      data.value.filter.friendlyID = data.value.friendyIDs?.[0] ?? 0;
      updateTableData();
    })
    .catch((e) => {
      ElMessageBox.alert(e);
    });
  loading.value = false;
}
async function getEvents(type: "casts" | "taken", start: number, end: number, index: number) {
  if (index >= 0) {
    await fetch(
      type === "casts"
        ? `https://cn.fflogs.com/v1/report/events/casts/${data.value.code}?start=${start}&end=${end}&hostility=1&sourceid=${data.value.enemiesIDs[index]}&api_key=${data.value.api_key}`
        : `https://cn.fflogs.com/v1/report/events/damage-taken/${data.value.code}?start=${start}&end=${end}&hostility=0&sourceid=${data.value.friendyIDs[index]}&api_key=${data.value.api_key}`,
    )
      .then((res) => res.json())
      .then(async (result) => {
        let res;
        if (type === "casts") res = result as FflogsjsonCast;
        else if (type === "taken") res = result as FflogsjsonDamageTaken;
        else throw new Error("Invalid event type: " + type);
        if (!res.events) throw new Error("result has no events");
        if (type === "taken") {
          data.value.takenEvents.push(...(res.events as TakenEvent[]));
          // data.value.auraAbilities.push(...res.auraAbilities);
        }
        // else if (type === "casts") data.value.castEvents.push(...(res.events as CastEvent[]));
        if (res?.nextPageTimestamp && res?.nextPageTimestamp > 0 && res.nextPageTimestamp < end)
          await getEvents(type, res.nextPageTimestamp, end, index);
        if (type === "casts" && index < data.value.enemiesIDs.length - 1) await getEvents(type, start, end, index + 1);
        if (type === "taken" && index < data.value.friendyIDs.length - 1) await getEvents(type, start, end, index + 1);
      });
  }
}
const formatTableTime = (time: string) =>
  moment.utc(Number(time) - (data.value.fight?.start_time ?? 0)).format("mm:ss.S");
// const getSourceName = (id: number) => data.value?.enemies.find((v) => v.id === id)?.name ?? id.toString();
// const filterTable = (value: string, row: any) => row.type === value;
// const takenFilter = computed(() => {
//   if (data.value.takenEvents.length > 0) {
//     const sourceIDs = Array.from(new Set(data.value.takenEvents.map((v) => v.sourceID))).filter((v) => v);
//     return sourceIDs.map((v) => {
//       return { text: getSourceName(v), value: v.toString() };
//     });
//   }
//   return [];
// });
const toCN = (id: number): string | undefined => getActionChinese(id);
const getAbilityType = (type: AbilityDamageType): any => AbilityDamageType[type] ?? "未知";
// const getSrc = (guid: number): string => {
//   const ability = data.value.auraAbilities.find((v) => v.guid === guid);
//   if (!ability) return "";
//   return "http://cafemaker.wakingsands.com/i/" + ability.abilityIcon.replace("-", "/");
// };
// const getTitle = (guid: number): string => data.value.auraAbilities.find((v) => v.guid === guid)?.name ?? "";
function updateTableData() {
  data.value.tableData = data.value.takenEvents.filter((v) => v.targetID == data.value.filter.friendlyID);
}
const rowClassName: VxeTablePropTypes.RowClassName = ({ row }) => {
  return "row-type-" + row.type;
};
</script>

<template>
  <el-container>
    <el-main p-t-0>
      <el-form>
        <el-form-item>
          <el-row :gutter="5" style="width: 100%">
            <el-col :span="6">
              <el-form-item label="API KEY">
                <el-input v-model="data.api_key" type="password" placeholder="" show-password />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="FIGHT CODE">
                <el-input v-model="data.url" type="text" placeholder="" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-button type="primary" @click="startParse" :loading="loading">开始分析</el-button>
            </el-col>
          </el-row>
          <el-col p-t-3
            >视角：
            <vxe-radio-group v-model="data.filter.friendlyID" @change="updateTableData">
              <vxe-radio-button
                v-for="i in data.friendyIDs"
                :label="i"
                :content="data.friendlies.find((f) => f.id === i)?.icon"
              ></vxe-radio-button>
            </vxe-radio-group>
          </el-col>
        </el-form-item>
      </el-form>
      <vxe-table
        size="small"
        border
        :loading="loading"
        class="mytable-scrollbar"
        height="720"
        align="center"
        show-header-overflow="tooltip"
        :show-overflow="true"
        :scroll-x="{ enabled: true, oSize: 15 }"
        :scroll-y="{ enabled: true, oSize: 15, mode: 'wheel' }"
        :data="data.tableData"
        :row-config="{ isHover: false, height: 25 }"
        :row-class-name="rowClassName"
      >
        <vxe-column title="时间" width="65" fixed="left">
          <template #default="{ row }">
            <span> {{ formatTableTime(row.timestamp) }}</span>
          </template>
        </vxe-column>
        <vxe-column fixed="left" width="140">
          <template #header>
            <el-switch v-model="data.showCN" inactive-text="原" active-text="汉" size="small" />
          </template>
          <template #default="{ row }">
            <span :class="'ability-type-' + row.ability.type">
              {{ data.showCN ? toCN(Number(row.ability.guid)) || row.ability.name : row.ability.name }}
            </span>
          </template>
        </vxe-column>
        <vxe-column title="类型" width="60">
          <template #default="{ row }">
            {{ getAbilityType(row.ability.type) }}
          </template>
        </vxe-column>
        <vxe-column title="伤害值" width="80">
          <template #default="{ row }">
            {{ row.unmitigatedAmount?.toLocaleString() ?? "-" }}
          </template>
        </vxe-column>
        <vxe-column field="multiplier" title="减伤" width="50" />
        <vxe-column field="absorbed" title="护盾" width="60" />
        <vxe-column field="amount" title="实际" width="60" />
        <!-- <vxe-column v-for="b in data.keigenns" :key="b.id" width="24" :show-overflow="false">
          <template #header>
            <div style="overflow: hidden; z-index: 1; position: absolute; left: 0px; top: 4px">
              <img
                :src="'https://cafemaker.wakingsands.com/i/' + b.icon"
                :onerror="`javascript:this.src='https://xivapi.com/i/${b.icon}';this.onerror=null;`"
                :title="b.name"
                loading="lazy"
              />
            </div>
          </template>
          <template #default="{ row }">
            <span class="noWrap" style="position: absolute; left: 0px; top: 0px">{{
              row?.buffs?.includes(b.id + 1000000) ? "√" : ""
            }}</span>
          </template>
        </vxe-column> -->
      </vxe-table>
    </el-main>
  </el-container>
</template>
<style lang="scss">
.noWrap {
  white-space: nowrap;
  overflow: hidden;
}
.ability-type-32 {
  color: orchid;
}
.ability-type-64 {
  color: orange;
}
.ability-type-128 {
  color: #a60f22;
}
.ability-type-1024 {
  color: #0187fb;
}
.row-type-calculateddamage {
  background-color: lightcyan;
}
.row-type-damage {
  background-color: inherit;
}
.mytable-scrollbar ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
/*滚动条的轨道*/
.mytable-scrollbar ::-webkit-scrollbar-track {
  background-color: #ffffff;
}
/*滚动条里面的小方块，能向上向下移动*/
.mytable-scrollbar ::-webkit-scrollbar-thumb {
  background-color: #bfbfbf;
  border-radius: 4px;
  border: 1px solid #f1f1f1;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
}
.mytable-scrollbar ::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}
.mytable-scrollbar ::-webkit-scrollbar-thumb:active {
  background-color: #787878;
}
/*边角，即两个滚动条的交汇处*/
.mytable-scrollbar ::-webkit-scrollbar-corner {
  background-color: #ffffff;
}
</style>
