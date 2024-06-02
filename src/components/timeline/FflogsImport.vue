<script lang="ts" setup>
import axios from 'axios'
import Swal from 'sweetalert2'
import '@sweetalert2/theme-bootstrap-4/bootstrap-4.scss'
import type { Job } from 'cactbot/types/job'
import { factory } from '@/utils/timelineSpecialRules'
import type {
  FFlogsApiV1ReportEvents,
  FFlogsQuery,
  FFlogsStance,
  FFlogsType,
  Friendlies,
} from '@/types/fflogs'
import Util from '@/utils/util'
import { getActionChinese } from '@/resources/actionChinese'
import type { ITimelineCondition } from '@/types/timeline'
import { useTimelineStore } from '@/store/timeline'

const props = defineProps<{
  filters: Record<string, number[]>
}>()

const emits = defineEmits<{
  (
    e: 'newTimeline',
    title: string,
    condition: ITimelineCondition,
    rawTimeline: string,
    codeFight: string,
  ): unknown
  (e: 'showFFlogsToggle'): void
  (e: 'clearCurrentlyTimeline'): void
  (e: 'updateFilters', target: string, value: number[]): void
}>()

enum QueryTextEnum {
  query = '查询',
  querying = '正在请求',
}

const urlRe = /(?<=^|\/)(?<code>\w{16,})\/?#fight=(?<fight>\d+|last)/
const regexType: Partial<Record<FFlogsType, string>> = {
  begincast: '14',
  cast: '1[56]',
}
const queryText = ref(QueryTextEnum.query)
const inputUrl = ref('')
const addTTS = ref(false)

const fflogsQueryConfig = reactive({} as FFlogsQuery)
claerFFlogsQueryConfig()

const timelineStore = useTimelineStore()

// fflogs导入第1步：用户点击查询按钮
function queryFFlogsReportFights(url: string) {
  Swal.fire({ text: '正在解析数据 (步骤1/3)', showConfirmButton: false })
  claerFFlogsQueryConfig()
  queryText.value = QueryTextEnum.querying
  const reg = url.match(urlRe)
  if (!timelineStore.settings.api) {
    Swal.fire({
      icon: 'error',
      title: 'FF logs API Key 未填写',
      footer:
        '<a href="https://cn.fflogs.com/profile">点击这里，在最下方起名，然后获得你的V1 Client Key</a>',
    })
    queryText.value = QueryTextEnum.query
  }
  else if (!reg) {
    Swal.fire({
      icon: 'error',
      title: 'FF logs 战斗记录链接 未填写',
      footer: '例如：aaAAAAaAAAaAaa11#fight=18',
    })
    queryText.value = QueryTextEnum.query
  }
  else if (reg) {
    fflogsQueryConfig.code = reg.groups?.code ?? ''
    axios
      .get(
        `https://cn.fflogs.com/v1/report/fights/${fflogsQueryConfig.code}?api_key=${timelineStore.settings.api}`,
      )
      .then((res) => {
        fflogsQueryConfig.bossIDs = (
          res.data.enemies as {
            id: number
            type: string
          }[]
        )
          .filter(arr => arr.type === 'Boss')
          .map(boss => boss.id)
        fflogsQueryConfig.fightIndex
          = (reg?.groups?.fight === 'last'
            ? res.data.fights.length
            : Number.parseInt(reg?.groups?.fight ?? '0')) - 1
        const fight = res.data.fights[fflogsQueryConfig.fightIndex]
        fflogsQueryConfig.zoneID = fight.zoneID
        fflogsQueryConfig.start = fight.start_time
        fflogsQueryConfig.end = fight.end_time
        fflogsQueryConfig.friendlies = (
          res.data.friendlies as Friendlies[]
        ).filter(
          value =>
            value.icon !== 'LimitBreak'
            && value.fights.find(f => f.id === fflogsQueryConfig.fightIndex + 1),
        )
        queryText.value = QueryTextEnum.query
        fflogsQueryConfig.abilityFilterEvents.length = 0
        fflogsQueryConfig.abilityFilterCandidate.length = 0
        Swal.fire('在列表中选择一名玩家')
      })
      .catch((e) => {
        Swal.fire({
          icon: 'error',
          title: 'Oops...(步骤1)',
          text: e,
        })
        queryText.value = QueryTextEnum.query
      })
  }
  else {
    Swal.fire({
      icon: 'error',
      title: 'url链接格式错误',
      footer: `验证规则：${urlRe.toString().replaceAll(/\?<\w+>/g, '')}`,
    })
    queryText.value = QueryTextEnum.query
  }
}

// fflogs导入第2步：用户选定了具体玩家
async function handleFFlogsQueryResultFriendliesList(player: Friendlies) {
  fflogsQueryConfig.player = player
  // 进入第三步
  await queryFFlogsReportEvents()
    .then(() => {
      fflogsQueryConfig.abilityFilterCandidate
        = fflogsQueryConfig.abilityFilterEvents.reduce((total, event) => {
          if (
            event.sourceIsFriendly
            && !total.find(v => v.actionId === event.actionId)
          ) {
            total.push(event)
          }
          return total
        }, [] as FFlogsStance)
    })
    .catch((e) => {
      Swal.fire({
        icon: 'error',
        title: 'Oops...(步骤2)',
        text: e,
      })
    })
}

// fflogs导入第3步：通过API获取选定玩家所有casts
async function queryFFlogsReportEvents() {
  Swal.fire({
    text: '正在解析数据，请耐心等待。(步骤2/3)',
    showConfirmButton: false,
  })
  const resEvents: FFlogsApiV1ReportEvents[] = []
  fflogsQueryConfig.abilityFilterEvents.length = 0
  async function queryFriendly(startTime: number) {
    await axios
      .get(
        `https://cn.fflogs.com/v1/report/events/casts/${fflogsQueryConfig.code}?start=${startTime}&end=${fflogsQueryConfig.end}&hostility=0&sourceid=${fflogsQueryConfig.player?.id}&api_key=${timelineStore.settings.api}`,
      )
      .then(
        async (res: {
          data: {
            events: FFlogsApiV1ReportEvents[]
            nextPageTimestamp?: number
          }
        }) => {
          resEvents.push(...res.data.events)
          if (
            res.data.nextPageTimestamp
            && res.data.nextPageTimestamp > 0
            && res.data.nextPageTimestamp < fflogsQueryConfig.end
          ) {
            await queryFriendly(res.data.nextPageTimestamp)
          }
        },
      )
      .catch((e) => {
        Swal.fire({
          icon: 'error',
          title: 'Oops...(步骤3.1)',
          text: e,
        })
      })
  }
  async function queryEnemies(startTime: number, index: number) {
    if (index >= 0) {
      await axios
        .get(
          `https://cn.fflogs.com/v1/report/events/casts/${fflogsQueryConfig.code}?start=${startTime}&end=${fflogsQueryConfig.end}&hostility=1&sourceid=${fflogsQueryConfig.bossIDs[index]}&api_key=${timelineStore.settings.api}`,
        )
        .then(async (res) => {
          resEvents.push(...res.data.events)
          if (
            res.data.nextPageTimestamp
            && res.data.nextPageTimestamp > 0
            && res.data.nextPageTimestamp < fflogsQueryConfig.end
          ) {
            await queryEnemies(res.data.nextPageTimestamp, index)
          }

          if (index < fflogsQueryConfig.bossIDs.length - 1)
            await queryEnemies(startTime, index + 1)
        })
        .catch((e) => {
          Swal.fire({
            icon: 'error',
            title: 'Oops...(步骤3.2)',
            text: e,
          })
        })
    }
  }
  const friendlyPromise = await queryFriendly(fflogsQueryConfig.start)
  const enemiesPromise = await queryEnemies(fflogsQueryConfig.start, 0)
  await Promise.all([friendlyPromise, enemiesPromise]).then(() => {
    for (const event of resEvents) {
      if (event.type === 'begincast' && event.sourceIsFriendly)
        continue
      // const action = actionStore.getActionById(event.ability.guid);
      fflogsQueryConfig.abilityFilterEvents.push({
        time: Number(
          ((event.timestamp - fflogsQueryConfig.start) / 1000).toFixed(1),
        ),
        type: event.type,
        actionName: getActionChinese(event.ability.guid) ?? event.ability.name,
        actionId: event.ability.guid,
        sourceIsFriendly: event.sourceIsFriendly,
        url:
          event?.ability?.abilityIcon.replace('-', '/').replace('.png', '')
          ?? '000000/000405',
        window: undefined,
      })
    }
    if (
      fflogsQueryConfig.player?.icon
      && props.filters[fflogsQueryConfig.player.icon]
    ) {
      fflogsQueryConfig.abilityFilterSelected
        = props.filters[fflogsQueryConfig.player.icon]
    }
    Swal.fire('请在技能过滤器中选择需要的技能')
  })
}

// fflogs导入第4步：用户选好了过滤器
function handeleFFlogsQueryResultFriendiesListFilter() {
  Swal.fire({ text: '正在解析数据 (步骤3/3)', showConfirmButton: false })
  // 保存过滤器
  if (fflogsQueryConfig.player?.icon) {
    emits(
      'updateFilters',
      fflogsQueryConfig.player?.icon,
      JSON.parse(JSON.stringify(fflogsQueryConfig.abilityFilterSelected)),
    )
  }
  // 询问是否添加TTS
  // let addTTS = false;
  // Swal.fire({
  //   title: "是否为所有技能添加TTS语音?",
  //   showDenyButton: true,
  //   showCancelButton: false,
  //   confirmButtonText: "是",
  //   denyButtonText: `否`,
  // }).then(
  //   (result) => {
  //     if (result.isConfirmed) {
  //       addTTS = true;
  //     } else if (result.isDenied) {
  //       addTTS = false;
  //     }
  // 解析处理格式化一条龙
  fflogsQueryConfig.abilityFilterEvents = fflogsQueryConfig.abilityFilterEvents
    .filter((event) => {
      return (
        (event.sourceIsFriendly
        && fflogsQueryConfig.abilityFilterSelected.includes(event.actionId))
        || !event.sourceIsFriendly
      )
    })
    .sort((a, b) => a.time - b.time)
  fflogsQueryConfig.abilityFilterEvents = factory(
    fflogsQueryConfig.abilityFilterEvents,
  )
  fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline
    = fflogsQueryConfig.abilityFilterEvents
      .map((item) => {
        if (item.sourceIsFriendly) {
          return `${item.time} "<${item.actionName}>~"${
            addTTS.value ? ` tts "${item.actionName}"` : ''
          }`
        }
        if (
          /^(?:攻击|attack|攻撃)$|^unknown/i.test(item.actionName)
          || (item.type === 'cast' && item.window === undefined)
        ) {
          return `# ${item.time} "${item.actionName}"`
        }

        // 只匹配开始施法或符合特殊规则的window
        return `${item.time} "${item.actionName}" sync /^.{14} \\w+ ${
          regexType[item.type]
        }:4.{7}:[^:]+:${item.actionId.toString(16).toUpperCase()}:/${
          item.window ? ` window ${item.window.join(',')}` : ''
        }`
      })
      .join('\n')
  emits(
    'newTimeline',
    `导入${fflogsQueryConfig.player?.name}`,
    {
      zoneId: fflogsQueryConfig.zoneID.toString(),
      job: (fflogsQueryConfig.player?.icon as Job) ?? 'NONE',
    },
    fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline,
    `${fflogsQueryConfig.code}#fight=${fflogsQueryConfig.fightIndex + 1}`,
  )
  claerFFlogsQueryConfig()
  emits('showFFlogsToggle')
  Swal.fire({
    position: 'top-end',
    icon: 'success',
    title: '已生成新时间轴',
    showConfirmButton: false,
    timer: 1500,
  })
  // },
  // }
  // );
}
// fflogs相关配置初始化
function claerFFlogsQueryConfig() {
  fflogsQueryConfig.code = ''
  fflogsQueryConfig.fightIndex = 0
  fflogsQueryConfig.start = 0
  fflogsQueryConfig.end = 0
  fflogsQueryConfig.friendlies = []
  fflogsQueryConfig.abilityFilterEvents = []
  fflogsQueryConfig.abilityFilterCandidate = []
  fflogsQueryConfig.abilityFilterSelected = []
  fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline = ''
  fflogsQueryConfig.player = undefined
  fflogsQueryConfig.zoneID = 0
  fflogsQueryConfig.bossIDs = []
}
</script>

<template>
  <el-form :inline="true" class="fflogs-query">
    <el-form-item label="FF logs 战斗" style="width: 450px">
      <el-input v-model="inputUrl" placeholder="reports/AAAaAaAAaa1aA1aA#fight=3" autocomplete="on" />
    </el-form-item>
    <el-form-item label="FF logs V1 Key" style="width: 450px">
      <el-input v-model="timelineStore.settings.api" />
    </el-form-item>
    <el-form-item label="添加TTS" style="width: 100px">
      <el-switch v-model="addTTS" />
    </el-form-item>
    <el-form-item>
      <el-button :disabled="queryText === QueryTextEnum.querying" type="primary" @click="queryFFlogsReportFights(inputUrl)">
        {{ queryText }}
      </el-button>
    </el-form-item>
  </el-form>
  <div class="fflogs-query-result-friendlies">
    <el-row>
      <el-table
        v-show="fflogsQueryConfig.abilityFilterEvents.length === 0"
        :data="fflogsQueryConfig.friendlies.filter((v) => v.icon !== 'NPC')"
        stripe
        border
        class="fflogs-query-result-friendlies-list"
      >
        <el-table-column prop="name" label="玩家名称" min-width="60px" />
        <el-table-column prop="server" label="服务器" min-width="60px" />
        <el-table-column label="职业" min-width="60px">
          <template #default="{ row }">
            {{ Util.nameToFullName(Util.jobEnumToJob(Util.iconToJobEnum(row.icon))).cn }}
          </template>
        </el-table-column>
        <el-table-column label="选定" min-width="20px">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleFFlogsQueryResultFriendliesList(scope.row)">
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-row>
    <el-row v-show="fflogsQueryConfig.abilityFilterEvents.length > 0" class="fflogs-query-result-friendlies-ability-filter-select">
      <el-col :span="20">
        <el-select v-model="fflogsQueryConfig.abilityFilterSelected" multiple placeholder="技能过滤器" :fit-input-width="true">
          <el-option
            v-for="rule in fflogsQueryConfig.abilityFilterCandidate"
            :key="rule.actionId"
            class="ability-filter-li"
            :value="rule.actionId"
            :label="rule.actionName"
          >
            <img
              :src="`https://cafemaker.wakingsands.com/i/${rule.url}.png`"
              class="ability-filter-li-icon"
              title=""
              :onerror="`javascript:this.src='https://xivapi.com/i/${rule.url}.png';this.onerror=null;`"
            >{{ rule.actionName }}
          </el-option>
        </el-select>
      </el-col>
      <el-col :span="4">
        <el-button type="success" @click="handeleFFlogsQueryResultFriendiesListFilter()">
          选择好了
        </el-button>
      </el-col>
    </el-row>
  </div>
</template>

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
  // padding: ;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-end;
  :deep(.el-form-item){
    margin: 10px;
  }
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
