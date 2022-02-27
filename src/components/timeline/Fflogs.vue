<template>
  <el-form :inline="true" class="fflogs-query">
    <el-form-item label="FF logs 战斗" style="width: 450px">
      <el-input v-model="inputUrl" placeholder="aaAAAAaAAAaAaa11#fight=18" />
    </el-form-item>
    <el-form-item label="FF logs V1 Key" style="width: 450px">
      <el-input type="password" v-model="props.settings.api" />
    </el-form-item>
    <el-form-item>
      <el-button :disabled="queryText === QueryTextEnum.querying" type="primary" @click="queryFflogsReportFights(inputUrl)">{{
        queryText
      }}</el-button>
    </el-form-item>
  </el-form>
  <div class="fflogs-query-result-friendlies">
    <el-table
      v-show="!fflogsQueryConfig.abilityFilterParseRule.size && fflogsQueryConfig.friendlies.length"
      :data="fflogsQueryConfig.friendlies"
      stripe
      border
      class="fflogs-query-result-friendlies-list"
    >
      <el-table-column prop="name" label="玩家名称" min-width="80px" />
      <el-table-column prop="server" label="服务器" min-width="80px" />
      <el-table-column prop="icon" label="职业" min-width="80px" />
      <el-table-column label="选定" min-width="20px">
        <template #default="scope">
          <el-button type="text" size="small" @click="handleFflogsQueryResultFriendliesList(scope.row)">选择</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div v-show="fflogsQueryConfig.abilityFilterParseRule.size" class="fflogs-query-result-friendlies-ability-filter-select">
      <el-select v-model="fflogsQueryConfig.abilityFilterUsedRule" multiple placeholder="技能过滤器" size="large">
        <el-option
          v-for="rule in fflogsQueryConfig.abilityFilterParseRule"
          :key="rule"
          :label="actionStore.getAction({ Id: rule })?.Name ?? rule"
          :value="rule"
        >
        </el-option>
      </el-select>
      <el-button type="success" @click="handeleFflogsQueryResultFriendiesListFilter()">选择好了</el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import axios from "axios";
import { reactive, Ref, ref } from "vue";
import Swal from "sweetalert2";
import "sweetalert2/src/sweetalert2.scss";
import { useActionStore } from "../../store/action";
import { FfIconToName, FflogsApiV1ReportEvents, FflogsQuery, Friendlies } from "../../types/Fflogs";

enum QueryTextEnum {
  query = "查询",
  querying = "正在请求",
}

const actionStore = useActionStore();
const props = defineProps<{ settings: { api: any } }>();
const emit = defineEmits(["newTimeline"]);

const urlReg = /^.*(?<code>[\d\w]{16,})#fight=(?<fight>\d+)/;
let queryText: Ref<QueryTextEnum> = ref(QueryTextEnum.query);
let inputUrl = ref("");

const fflogsQueryConfig: FflogsQuery = reactive({
  code: "",
  fightIndex: 0,
  start: 0,
  end: 0,
  friendlies: [],
  abilityFilterEvents: [],
  abilityFilterParseRule: new Set<number>(),
  abilityFilterUsedRule: [],
  abilityFilterEventsAfterFilterRawTimeline: "",
  player: {},
  zoneID: "0",
});

//fflogs导入第1步：用户点击查询按钮
function queryFflogsReportFights(url: string) {
  Swal.fire({ text: "正在解析数据，耗时可能较长，请耐心等待。(步骤1/3)", showConfirmButton: false });
  claerFflogsQueryConfig();
  queryText.value = QueryTextEnum.querying;
  let reg = url.match(urlReg);
  if (!props.settings.api) {
    Swal.fire({
      icon: "error",
      title: "FF logs API Key 未填写",
      footer: '<a href="https://cn.fflogs.com/profile">点击这里，在最下方获得你的V1 Client Key</a>',
    });
    queryText.value = QueryTextEnum.query;
  } else if (!reg) {
    Swal.fire({
      icon: "error",
      title: "FF logs 战斗记录链接 未填写",
      footer: "例如：aaAAAAaAAAaAaa11#fight=18",
    });
    queryText.value = QueryTextEnum.query;
  } else if (reg) {
    fflogsQueryConfig.code = reg.groups!.code;
    fflogsQueryConfig.fightIndex = parseInt(reg.groups!.fight);
    axios
      .get(`https://cn.fflogs.com/v1/report/fights/${fflogsQueryConfig.code}?api_key=${props.settings.api}`)
      .then((res) => {
        const fight = res.data.fights[fflogsQueryConfig.fightIndex - 1];
        fflogsQueryConfig.zoneID = fight.zoneID;
        fflogsQueryConfig.start = fight.start_time;
        fflogsQueryConfig.end = fight.end_time;
        fflogsQueryConfig.friendlies = (res.data.friendlies as Friendlies[]).filter((value) => {
          return value.icon !== "LimitBreak" && value.fights.find((item) => item.id === fflogsQueryConfig.fightIndex);
        });
        queryText.value = QueryTextEnum.query;
        Swal.fire("请选择一名玩家");
      })
      .catch((e) => {
        Swal.fire({
          icon: "error",
          title: "Oops...(步骤1)",
          text: e,
        });
        queryText.value = QueryTextEnum.query;
      });
  } else {
    Swal.fire({
      icon: "error",
      title: "url链接格式错误",
      footer: `验证规则：${urlReg.toString().replaceAll(/\?\<\w+\>/g, "")}`,
    });
    queryText.value = QueryTextEnum.query;
  }
}

//fflogs导入第2步：用户选定了具体玩家
async function handleFflogsQueryResultFriendliesList(player: Friendlies) {
  fflogsQueryConfig.player = player as any;
  await queryFflogsReportEvents()
    .then(() => {
      fflogsQueryConfig.abilityFilterParseRule = new Set(
        fflogsQueryConfig.abilityFilterEvents.reduce((total: number[], event: { time: number; actionName: string; actionId: number }) => {
          total.push(event.actionId);
          return total;
        }, [])
      );
    })
    .catch((e) => {
      Swal.fire({
        icon: "error",
        title: "Oops...(步骤2)",
        text: e,
      });
      return;
    });
}

//fflogs导入第3步：通过API获取选定玩家所有casts
async function queryFflogsReportEvents(type: string = "casts") {
  Swal.fire({ text: "正在解析数据，耗时可能较长，请耐心等待。(步骤2/3)", showConfirmButton: false });
  let resEvents: FflogsApiV1ReportEvents[] = [];
  fflogsQueryConfig.abilityFilterEvents.length = 0;
  async function query(startTime: number) {
    await axios
      .get(
        `https://cn.fflogs.com/v1/report/events/${type}/${fflogsQueryConfig.code}?start=${startTime}&end=${
          fflogsQueryConfig.end
        }&hostility=0&sourceid=${fflogsQueryConfig.player!.id}&api_key=${props.settings.api}`
      )
      .then((res: { data: { events: FflogsApiV1ReportEvents[]; nextPageTimestamp?: number } }) => {
        resEvents.push(...res.data.events);
        if (res.data.nextPageTimestamp && res.data.nextPageTimestamp > 0 && res.data.nextPageTimestamp < fflogsQueryConfig.end) {
          query(res.data.nextPageTimestamp);
        }
      })
      .catch((e) => {
        Swal.fire({
          icon: "error",
          title: "Oops...(步骤3)",
          text: e,
        });
        return;
      });
  }
  await query(fflogsQueryConfig.start).then(() => {
    for (const event of resEvents) {
      if (event.type !== "cast") continue;
      let action = actionStore.getAction({ Id: event.ability.guid });
      if (!action) continue;
      fflogsQueryConfig.abilityFilterEvents.push({
        time: Number(((event.timestamp - fflogsQueryConfig.start) / 1000).toFixed(1)),
        actionName: action?.Name ?? event.ability.name,
        actionId: event.ability.guid,
      });
    }
    Swal.fire("请在技能过滤器中选择需要的技能");
  });
}

//fflogs导入第4步：用户选好了过滤器
function handeleFflogsQueryResultFriendiesListFilter() {
  Swal.fire({ text: "正在解析数据，耗时可能较长，请耐心等待。(步骤3/3)", showConfirmButton: false });
  fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline = fflogsQueryConfig.abilityFilterEvents
    .filter((event) => {
      return fflogsQueryConfig.abilityFilterUsedRule.includes(event.actionId);
    })
    .map((item) => {
      let time = `${
        (Array(2).join("0") + Math.floor(item.time / 60)).slice(-2) +
        ":" +
        (Array(2).join("0") + Math.floor(item.time % 60)).slice(-2) +
        (item.time % 60).toFixed(1).replace(/^\d+(?=\.)/, "")
      }`;
      return `${time} "<${item.actionName}>~"`;
    })
    .join("\n");
  emit(
    "newTimeline",
    `${fflogsQueryConfig.player!.name}`,
    { zoneId: fflogsQueryConfig.zoneID.toString(), jobList: [FfIconToName(fflogsQueryConfig.player.icon ?? "NONE")] },
    fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline,
    `${fflogsQueryConfig.code}#fight=${fflogsQueryConfig.fightIndex}`
  );
  claerFflogsQueryConfig();
  Swal.fire({
    position: "top-end",
    icon: "success",
    title: "已生成新时间轴",
    showConfirmButton: false,
    timer: 1500,
  });
}

//fflogs相关配置初始化
function claerFflogsQueryConfig() {
  fflogsQueryConfig.code = "";
  fflogsQueryConfig.end = 0;
  fflogsQueryConfig.fightIndex = 0;
  fflogsQueryConfig.friendlies.length = 0;
  fflogsQueryConfig.start = 0;
  fflogsQueryConfig.abilityFilterParseRule = new Set<number>();
  fflogsQueryConfig.abilityFilterUsedRule = [];
  fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline = "";
  fflogsQueryConfig.zoneID = "";
  fflogsQueryConfig.player = {};
}
</script>

<style lang="scss" scoped>
.fflogs-query {
  background-color: aliceblue;
  padding: 5px;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-end;
}
.fflogs-query-result-friendlies {
  margin: 10px 0px;
  .fflogs-query-result-friendlies-list {
    width: 1040px;
    ul {
      list-style-type: none;
    }
  }
  :deep(.fflogs-query-result-friendlies-ability-filter-select) {
    display: flex;
    flex-direction: column;
    .el-select {
      width: 1040px;
      max-width: 100%;
    }
    .el-button {
      margin: 10px 0px;
    }
  }
}
</style>
