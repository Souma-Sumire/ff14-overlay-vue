<template>
  <el-form :inline="true" class="fflogs-query">
    <el-form-item label="FF logs 战斗" style="width: 450px">
      <el-input v-model="inputUrl" placeholder="reports/AAAaAaAAaa1aA1aA#fight=3" autocomplete="on" />
    </el-form-item>
    <el-form-item label="FF logs V1 Key" style="width: 450px">
      <el-input type="password" v-model="props.settings.api" />
    </el-form-item>
    <el-form-item>
      <el-button :disabled="queryText === QueryTextEnum.querying" type="primary" @click="queryFFlogsReportFights(inputUrl)">{{
        queryText
      }}</el-button>
    </el-form-item>
  </el-form>
  <div class="fflogs-query-result-friendlies">
    <el-row>
      <el-table
        v-show="fflogsQueryConfig.abilityFilterEvents.length === 0"
        :data="fflogsQueryConfig.friendlies"
        stripe
        border
        class="fflogs-query-result-friendlies-list"
      >
        <el-table-column prop="name" label="玩家名称" min-width="60px" />
        <el-table-column prop="server" label="服务器" min-width="60px" />
        <el-table-column prop="icon" label="职业" min-width="60px" />
        <el-table-column label="选定" min-width="20px">
          <template #default="scope">
            <el-button type="text" size="small" @click="handleFFlogsQueryResultFriendliesList(scope.row)">选择</el-button>
          </template>
        </el-table-column>
      </el-table></el-row
    >
    <el-row v-show="fflogsQueryConfig.abilityFilterEvents.length > 0" class="fflogs-query-result-friendlies-ability-filter-select">
      <el-col :span="20">
        <el-select v-model="fflogsQueryConfig.abilityFilterSelected" multiple placeholder="技能过滤器" :fit-input-width="true">
          <el-option
            class="ability-filter-li"
            v-for="rule in fflogsQueryConfig.abilityFilterCandidate"
            :key="rule.actionId"
            :value="rule.actionId"
            :label="rule.actionName"
          >
            <img
              :src="`${siteImg}/${rule.url}.png`"
              :onerror="`javascript:this.src='${siteImgBak}/${rule.url}.png';this.onerror=null;`"
              class="ability-filter-li-icon"
            />{{ rule.actionName }}
          </el-option>
        </el-select>
      </el-col>
      <el-col :span="4"><el-button type="success" @click="handeleFFlogsQueryResultFriendiesListFilter()">选择好了</el-button></el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import axios from "axios";
import { reactive, ref } from "vue";
import Swal from "sweetalert2";
import "sweetalert2/src/sweetalert2.scss";
import { useActionStore } from "../../store/action";
import { FFIconToName, FFlogsApiV1ReportEvents, FFlogsQuery, Friendlies, FFlogsView } from "../../types/FFlogs";

enum QueryTextEnum {
  query = "查询",
  querying = "正在请求",
}

const actionStore = useActionStore();
const props = defineProps<{ settings: { api: any }; filters: any }>();
const emit = defineEmits(["newTimeline", "showFFlogsToggle", "clearCurrentlyTimeline"]);
const urlRe = /^.*?(?<anonymous>a:)?(?<code>[\d\w]{16,})#fight=(?<fight>\d+|last)/;
const siteImg = __SITE_IMG__;
const siteImgBak = __SITE_IMG__BAK;

let queryText = ref(QueryTextEnum.query);
let inputUrl = ref("");

const fflogsQueryConfig: FFlogsQuery = reactive({
  code: "",
  fightIndex: 0,
  start: 0,
  end: 0,
  friendlies: [],
  abilityFilterEvents: [],
  abilityFilterCandidate: [],
  abilityFilterSelected: [],
  abilityFilterEventsAfterFilterRawTimeline: "",
  player: {},
  zoneID: "0",
  bossIDs: [],
});
claerFFlogsQueryConfig();

const windowAction = new Map();
windowAction.set(26155, [999, 999]); //海德林转场 众生离绝
windowAction.set(28027, [999, 999]); //佐迪亚克转场 悼念
windowAction.set(26340, [999, 999]); //P3S转场 黑暗不死鸟

//fflogs导入第1步：用户点击查询按钮
function queryFFlogsReportFights(url: string) {
  Swal.fire({ text: "正在解析数据，耗时可能较长，请耐心等待。(步骤1/3)", showConfirmButton: false });
  claerFFlogsQueryConfig();
  queryText.value = QueryTextEnum.querying;
  let reg = url.match(urlRe);
  if (!props.settings.api) {
    Swal.fire({
      icon: "error",
      title: "FF logs API Key 未填写",
      footer: '<a href="https://cn.fflogs.com/profile">点击这里，在最下方起名，然后获得你的V1 Client Key</a>',
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
    axios
      .get(`https://cn.fflogs.com/v1/report/fights/${fflogsQueryConfig.code}?api_key=${props.settings.api}`)
      .then((res) => {
        fflogsQueryConfig.bossIDs = (
          res.data.enemies as {
            id: number;
            type: string;
          }[]
        )
          .filter((arr) => arr.type === "Boss")
          .map((boss) => boss.id);
        fflogsQueryConfig.fightIndex = (reg!.groups!.fight === "last" ? res.data.fights.length : parseInt(reg!.groups!.fight)) - 1;
        const fight = res.data.fights[fflogsQueryConfig.fightIndex];
        fflogsQueryConfig.zoneID = fight.zoneID;
        fflogsQueryConfig.start = fight.start_time;
        fflogsQueryConfig.end = fight.end_time;
        fflogsQueryConfig.friendlies = (res.data.friendlies as Friendlies[]).filter(
          (value) => value.icon !== "LimitBreak" && value.fights.find((f) => f.id === fflogsQueryConfig.fightIndex + 1)
        );
        queryText.value = QueryTextEnum.query;
        fflogsQueryConfig.abilityFilterEvents.length = 0;
        fflogsQueryConfig.abilityFilterCandidate.length = 0;
        Swal.fire("在列表中选择一名玩家");
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
      footer: `验证规则：${urlRe.toString().replaceAll(/\?\<\w+\>/g, "")}`,
    });
    queryText.value = QueryTextEnum.query;
  }
}

//fflogs导入第2步：用户选定了具体玩家
async function handleFFlogsQueryResultFriendliesList(player: Friendlies) {
  fflogsQueryConfig.player = player as any;
  //进入第三步
  await queryFFlogsReportEvents()
    .then(() => {
      fflogsQueryConfig.abilityFilterCandidate = fflogsQueryConfig.abilityFilterEvents.reduce((total: any[], event) => {
        if (event.sourceIsFriendly && !total.find((v) => v.actionId === event.actionId)) total.push(event);
        return total;
      }, []);
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
async function queryFFlogsReportEvents(view: FFlogsView = "casts") {
  Swal.fire({ text: "正在解析数据，耗时可能较长，请耐心等待。(步骤2/3)", showConfirmButton: false });
  let resEvents: FFlogsApiV1ReportEvents[] = [];
  fflogsQueryConfig.abilityFilterEvents.length = 0;
  async function queryFriendly(startTime: number) {
    await axios
      .get(
        `https://cn.fflogs.com/v1/report/events/${view}/${fflogsQueryConfig.code}?start=${startTime}&end=${
          fflogsQueryConfig.end
        }&hostility=0&sourceid=${fflogsQueryConfig.player!.id}&api_key=${props.settings.api}`
      )
      .then(async (res: { data: { events: FFlogsApiV1ReportEvents[]; nextPageTimestamp?: number } }) => {
        resEvents.push(...res.data.events);
        if (res.data.nextPageTimestamp && res.data.nextPageTimestamp > 0 && res.data.nextPageTimestamp < fflogsQueryConfig.end) {
          await queryFriendly(res.data.nextPageTimestamp);
        }
      })
      .catch((e) => {
        Swal.fire({
          icon: "error",
          title: "Oops...(步骤3.1)",
          text: e,
        });
        return;
      });
  }
  async function queryEnemies(startTime: number, index: number) {
    if (index >= 0) {
      await axios
        .get(
          `https://cn.fflogs.com/v1/report/events/${view}/${fflogsQueryConfig.code}?start=${startTime}&end=${fflogsQueryConfig.end}&hostility=1&sourceid=${fflogsQueryConfig.bossIDs[index]}&api_key=${props.settings.api}`
        )
        .then(async (res) => {
          resEvents.push(...res.data.events);
          if (res.data.nextPageTimestamp && res.data.nextPageTimestamp > 0 && res.data.nextPageTimestamp < fflogsQueryConfig.end) {
            await queryEnemies(res.data.nextPageTimestamp, index);
          }
          if (index < fflogsQueryConfig.bossIDs.length - 1) {
            await queryEnemies(startTime, index + 1);
          }
        })
        .catch((e) => {
          Swal.fire({
            icon: "error",
            title: "Oops...(步骤3.2)",
            text: e,
          });
          return;
        });
    }
  }
  let friendlyPromise = await queryFriendly(fflogsQueryConfig.start);
  let enemiesPromise = await queryEnemies(fflogsQueryConfig.start, 0);
  await Promise.all([friendlyPromise, enemiesPromise]).then(() => {
    for (const event of resEvents) {
      if (view === "casts") {
        if ((!/^casts?$/.test(event.type) && event.sourceIsFriendly) || (/^casts?$/.test(event.type) && !event.sourceIsFriendly)) continue;
      } else {
        if ((event.type !== view && event.sourceIsFriendly) || (event.type === view && !event.sourceIsFriendly)) continue;
      }
      let action;
      action = actionStore.getAction({ Id: event.ability.guid, IsPlayerAction: event.sourceIsFriendly });
      if (!action) action = actionStore.getAction({ Id: event.ability.guid });
      fflogsQueryConfig.abilityFilterEvents.push({
        time: Number(((event.timestamp - fflogsQueryConfig.start) / 1000).toFixed(1)),
        view: view,
        actionName: action?.Name ?? event.ability.name,
        actionId: event.ability.guid,
        sourceIsFriendly: event.sourceIsFriendly,
        url: action?.Url ?? "000000/000405",
      });
    }
    if (fflogsQueryConfig.player.icon && props.filters[fflogsQueryConfig.player.icon]) {
      fflogsQueryConfig.abilityFilterSelected = props.filters[fflogsQueryConfig.player.icon];
    }
    Swal.fire("请在技能过滤器中选择需要的技能");
  });
}

//fflogs导入第4步：用户选好了过滤器
function handeleFFlogsQueryResultFriendiesListFilter() {
  Swal.fire({ text: "正在解析数据，耗时可能较长，请耐心等待。(步骤3/3)", showConfirmButton: false });
  //保存过滤器
  if (fflogsQueryConfig.player.icon) {
    props.filters[fflogsQueryConfig.player.icon] = JSON.parse(JSON.stringify(fflogsQueryConfig.abilityFilterSelected));
  }
  //询问是否添加TTS
  let addTTS = false;
  Swal.fire({
    title: "是否自动添加TTS语音?",
    showDenyButton: true,
    showCancelButton: false,
    confirmButtonText: "是",
    denyButtonText: `否`,
  }).then((result) => {
    if (result.isConfirmed) {
      addTTS = true;
    } else if (result.isDenied) {
      addTTS = false;
    }

    //解析处理格式化一条龙
    fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline = fflogsQueryConfig.abilityFilterEvents
      .filter((event) => {
        return (event.sourceIsFriendly && fflogsQueryConfig.abilityFilterSelected.includes(event.actionId)) || !event.sourceIsFriendly;
      })
      .sort((a, b) => a.time - b.time)
      .map((item) => {
        let time = `${
          (Array(2).join("0") + Math.floor(item.time / 60)).slice(-2) +
          ":" +
          (Array(2).join("0") + Math.floor(item.time % 60)).slice(-2) +
          (item.time % 60).toFixed(1).replace(/^\d+(?=\.)/, "")
        }`;
        if (item.sourceIsFriendly) {
          return `${time} "<${item.actionName}>~"${addTTS ? ` tts "${item.actionName}"` : ""}`;
        } else {
          const viewType: Partial<Record<FFlogsView, string>> = {
            "casts": "14",
            "damage-done": "[156]",
          };
          if (windowAction.has(item.actionId)) {
            return `${time} "--${item.actionName}--" sync /^.{14} \\w+ ${viewType[item.view]}:4.{7}:[^:]+:${item.actionId
              .toString(16)
              .toUpperCase()}:/ window ${windowAction.get(item.actionId).join(",")}`;
          } else {
            return `# ${time} "--${item.actionName}--"`;
          }
        }
      })
      .join("\n");
    emit(
      "newTimeline",
      `导入${fflogsQueryConfig.player!.name}`,
      { zoneId: fflogsQueryConfig.zoneID.toString(), job: FFIconToName(fflogsQueryConfig.player.icon ?? "NONE") },
      fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline,
      `${fflogsQueryConfig.code}#fight=${fflogsQueryConfig.fightIndex + 1}`
    );
    claerFFlogsQueryConfig();
    emit("showFFlogsToggle");
    Swal.fire({
      position: "top-end",
      icon: "success",
      title: "已生成新时间轴",
      showConfirmButton: false,
      timer: 1500,
    });
  });
}

//fflogs相关配置初始化
function claerFFlogsQueryConfig() {
  fflogsQueryConfig.code = "";
  fflogsQueryConfig.fightIndex = 0;
  fflogsQueryConfig.start = 0;
  fflogsQueryConfig.end = 0;
  fflogsQueryConfig.friendlies = [];
  fflogsQueryConfig.abilityFilterEvents = [];
  fflogsQueryConfig.abilityFilterCandidate = [];
  fflogsQueryConfig.abilityFilterSelected = [];
  fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline = "";
  fflogsQueryConfig.player = {};
  fflogsQueryConfig.zoneID = "0";
  fflogsQueryConfig.bossIDs = [];
}
</script>

<style lang="scss" scoped>
.ability-filter-li {
  display: inline-flex;
  align-items: center;
  width: 200px;
  .ability-filter-li-icon {
    padding-right: 0.2em;
    height: 34px;
  }
}

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
    margin: 10px;
    //   display: flex;
    //   flex-direction: column;
    .el-select {
      width: 1040px;
      max-width: 100%;
    }
    .el-button {
      margin: 0px 10px;
      width: 1040px;
      max-width: 100%;
    }
  }
}
</style>
