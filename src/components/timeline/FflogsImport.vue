<script lang="ts" setup>
import type { Job } from 'cactbot/types/job'
import type {
  FFIcon,
  FFlogsApiV1ReportEvents,
  FFlogsQuery,
  FFlogsStance,
  Friendlies,
} from '@/types/fflogs'
import type { ITimeline } from '@/types/timeline'
import { Loading } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { getActionChinese } from '@/resources/actionChinese'
import { factory } from '@/services/timelineSpecialRules'
import { useTimelineStore } from '@/store/timeline'
import { CacheManager } from '@/utils/cacheManager'
import Util from '@/utils/util'
import { getImgSrc, handleImgError } from '@/utils/xivapi'

const props = defineProps<{
  filters: Record<string, number[]>
}>()

const emits = defineEmits<{
  (e: 'showFFlogsToggle'): void
  (e: 'editTimeline', timeline: ITimeline): void
}>()

enum QueryTextEnum {
  query = '查询',
  querying = '正在查询...',
}

const urlRe = /(?<=^|\/)(?<code>(?:a:)?\w{16,})[#?]fight=(?<fight>\d+|last)/
const queryText = ref(QueryTextEnum.query)
const inputUrl = ref('')
const addTTS = ref(false)
const isLoading = ref(false)
const currentStep = ref(0)
const confirmEnabled = ref(false)

const fflogsQueryConfig = reactive({} as FFlogsQuery)
claerFFlogsQueryConfig()

const timelineStore = useTimelineStore()

const fflogsCache = new CacheManager({
  key: 'souma-fflogs-cache',
  maxSize: 2 * 1024 * 1024,
  cleanupRatio: 0.25,
})

function getCache<T>(key: string): T | null {
  const cached = fflogsCache.get<any>(key)
  if (!cached) return null
  try {
    return JSON.parse(cached) as T
  } catch {
    return null
  }
}

function setCache<T>(
  key: string,
  data: T,
  ttl = 3 * 24 * 60 * 60 * 1000
): void {
  const cache = {
    data,
    expire: Date.now() + ttl,
  }
  fflogsCache.set(key, JSON.stringify(cache), ttl)
}

function isCacheValid(cache: { data: any; expire: number }) {
  return cache && cache.expire > Date.now()
}

// fflogs导入第1步：用户点击查询按钮
async function queryFFlogsReportFights(url: string) {
  isLoading.value = true
  claerFFlogsQueryConfig()
  queryText.value = QueryTextEnum.querying
  const reg = url.match(urlRe)
  if (!timelineStore.settings.api) {
    ElMessageBox.alert(
      '请在FF Logs个人设置页面获取V1 API Key',
      'FF logs API Key 未填写',
      {
        confirmButtonText: '确定',
        type: 'error',
        dangerouslyUseHTMLString: true,
        message:
          '<a href="https://cn.fflogs.com/profile">点击这里，在最下方<strong>填写 V1 客户名称并点击确认</strong>后，获取你的 V1 客户端密钥</a>',
      }
    )
    queryText.value = QueryTextEnum.query
    isLoading.value = false
    return
  }
  if (!reg) {
    ElMessageBox.alert('请正确填写FF Logs链接', 'FF Logs链接格式错误', {
      confirmButtonText: '确定',
      type: 'error',
    })
    queryText.value = QueryTextEnum.query
    isLoading.value = false
    return
  }

  fflogsQueryConfig.code = reg.groups?.code ?? ''
  try {
    const fightCacheKey = `fights:${fflogsQueryConfig.code}`
    const cachedFight = getCache<any>(fightCacheKey)
    let res: any

    if (cachedFight && isCacheValid(cachedFight)) {
      res = cachedFight.data
    } else {
      res = await fetch(
        `https://cn.fflogs.com/v1/report/fights/${fflogsQueryConfig.code}?api_key=${timelineStore.settings.api}`
      ).then((response) => {
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`)
        return response.json()
      })
      setCache(fightCacheKey, res)
    }
    fflogsQueryConfig.bossIDs = (
      res.enemies as {
        name: string
        id: number
        guid: number
        type: 'NPC' | 'Boss'
        icon: 'NPC' | 'Boss'
        fights: { id: number; instances: number; groups: number }[]
      }[]
    )
      .filter((arr) => ['Boss', 'NPC'].includes(arr.type))
      .map((boss) => boss.id)
    fflogsQueryConfig.enemies = res.enemies.slice()
    fflogsQueryConfig.fightIndex =
      (reg?.groups?.fight === 'last'
        ? res.fights.length
        : Number.parseInt(reg?.groups?.fight ?? '0')) - 1
    const fight = res.fights[fflogsQueryConfig.fightIndex]
    fflogsQueryConfig.zoneID = fight.zoneID
    fflogsQueryConfig.start = fight.start_time
    fflogsQueryConfig.end = fight.end_time
    fflogsQueryConfig.friendlies = (res.friendlies as Friendlies[]).filter(
      (value) =>
        value.icon !== 'LimitBreak' &&
        value.fights.find((f) => f.id === fflogsQueryConfig.fightIndex + 1)
    )
    fflogsQueryConfig.friendlies.sort((a, b) => {
      const aEnum = Util.iconToJobEnum(a.icon as FFIcon)
      const bEnum = Util.iconToJobEnum(b.icon as FFIcon)
      return Util.enumSortMethod(aEnum, bEnum)
    })
    queryText.value = QueryTextEnum.query
    fflogsQueryConfig.abilityFilterEvents.length = 0
    fflogsQueryConfig.abilityFilterCandidate.length = 0
    isLoading.value = false
    currentStep.value = 1
  } catch (e) {
    ElMessageBox.alert(
      `
  <h3 style="margin-bottom: 10px;">可能的原因：</h3>
  <ul style="padding-left: 20px; margin-bottom: 10px;">
    <li> <strong>90%概率</strong>：你没有<strong style="color: red;">先起名</strong>再获取 V1 客户端密钥</li>
    <li> <strong>5%概率</strong>：该战斗记录是私人或匿名模式</li>
    <li> <strong>5%概率</strong>：网络异常</li>
  </ul>
<p class="error-details"><strong>错误：</strong>${e}</p>
`,
      '请求失败',
      {
        confirmButtonText: '确定',
        type: 'error',
        dangerouslyUseHTMLString: true,
      }
    )
    queryText.value = QueryTextEnum.query
    isLoading.value = false
  }
}

// fflogs导入第2步：用户选定了具体玩家
async function handleFFlogsQueryResultFriendliesList(player: Friendlies) {
  isLoading.value = true
  currentStep.value = 2
  fflogsQueryConfig.player = player
  fflogsQueryConfig.type = 'friendies'
  fflogsQueryConfig.abilityFilterEvents.length = 0
  fflogsQueryConfig.abilityFilterCandidate.length = 0
  fflogsQueryConfig.enemiesAbilityFilterSelected.length = 0
  // 进入第三步
  try {
    await queryFFlogsReportEvents()
    fflogsQueryConfig.abilityFilterCandidate =
      fflogsQueryConfig.abilityFilterEvents
        .reduce((total, event) => {
          if (
            event.sourceIsFriendly &&
            !total.find((v) => v.actionId === event.actionId)
          ) {
            total.push(event)
          }
          return total
        }, [] as FFlogsStance)
        .sort((a, b) => a.time - b.time)
    if (
      fflogsQueryConfig.player?.icon &&
      props.filters[fflogsQueryConfig.player.icon]
    ) {
      fflogsQueryConfig.abilityFilterSelected = props.filters[
        fflogsQueryConfig.player.icon
      ]! as number[]
    }
    fflogsQueryConfig.abilityFilterSelected =
      fflogsQueryConfig.abilityFilterSelected.filter((v) => {
        return fflogsQueryConfig.abilityFilterCandidate.find(
          (e) => e.actionId === v
        )
      })
    isLoading.value = false
  } catch (e) {
    ElMessageBox.alert(
      `请稍后重试。如果问题持续存在,请检查您的网络连接。错误详情: ${e}`,
      '获取玩家技能数据失败',
      {
        confirmButtonText: '确定',
        type: 'error',
      }
    )
    isLoading.value = false
  }
}

// fflogs导入第3步：通过API获取选定玩家所有casts
async function queryFFlogsReportEvents() {
  confirmEnabled.value = false
  const resEvents: FFlogsApiV1ReportEvents[] = []
  fflogsQueryConfig.abilityFilterEvents.length = 0
  fflogsQueryConfig.enemiesAbilityFilterSelected.length = 0
  async function queryFriendly(startTime: number) {
    try {
      const friendlyCacheKey = `events:friendly:${fflogsQueryConfig.code}:${startTime}:${fflogsQueryConfig.player?.id}`
      const cachedFriendly = getCache<any>(friendlyCacheKey)
      let res: any

      if (cachedFriendly && isCacheValid(cachedFriendly)) {
        res = cachedFriendly.data
      } else {
        res = await fetch(
          `https://cn.fflogs.com/v1/report/events/casts/${fflogsQueryConfig.code}?start=${startTime}&end=${fflogsQueryConfig.end}&hostility=0&sourceid=${fflogsQueryConfig.player?.id}&api_key=${timelineStore.settings.api}`
        ).then((response) => {
          if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`)
          return response.json()
        })
        setCache(friendlyCacheKey, res)
      }
      resEvents.push(...res.events)
      if (
        res.nextPageTimestamp &&
        res.nextPageTimestamp > 0 &&
        res.nextPageTimestamp < fflogsQueryConfig.end
      ) {
        await queryFriendly(res.nextPageTimestamp)
      }
    } catch (e) {
      ElMessageBox.alert(
        `请稍后重试。如果问题持续存在,请检查您的网络连接。错误详情: ${e}`,
        '获取友方技能数据失败',
        {
          confirmButtonText: '确定',
          type: 'error',
        }
      )
    }
  }
  async function queryEnemies(startTime: number, index: number) {
    if (index >= 0) {
      try {
        const enemyCacheKey = `events:enemy:${fflogsQueryConfig.code}:${startTime}:${fflogsQueryConfig.bossIDs[index]}`
        const cachedEnemy = getCache<any>(enemyCacheKey)
        let res: any

        if (cachedEnemy && isCacheValid(cachedEnemy)) {
          res = cachedEnemy.data
        } else {
          res = await fetch(
            `https://cn.fflogs.com/v1/report/events/casts/${fflogsQueryConfig.code}?start=${startTime}&end=${fflogsQueryConfig.end}&hostility=1&sourceid=${fflogsQueryConfig.bossIDs[index]}&api_key=${timelineStore.settings.api}`
          ).then((response) => {
            if (!response.ok)
              throw new Error(`HTTP error! status: ${response.status}`)
            return response.json()
          })
          setCache(enemyCacheKey, res)
        }
        resEvents.push(...res.events)
        if (
          res.nextPageTimestamp &&
          res.nextPageTimestamp > 0 &&
          res.nextPageTimestamp < fflogsQueryConfig.end
        ) {
          await queryEnemies(res.nextPageTimestamp, index)
        }

        if (index < fflogsQueryConfig.bossIDs.length - 1)
          await queryEnemies(startTime, index + 1)
      } catch (e) {
        ElMessageBox.alert(
          `请稍后重试。如果问题持续存在,请检查您的网络连接。错误详情: ${e}`,
          '获取敌方技能数据失败',
          {
            confirmButtonText: '确定',
            type: 'error',
          }
        )
      }
    }
  }
  await Promise.all([
    queryFriendly(fflogsQueryConfig.start),
    queryEnemies(fflogsQueryConfig.start, 0),
  ])

  for (const event of resEvents) {
    if (event.type === 'begincast' && event.sourceIsFriendly) continue
    fflogsQueryConfig.abilityFilterEvents.push({
      time: Number(
        ((event.timestamp - fflogsQueryConfig.start) / 1000).toFixed(1)
      ),
      type: event.type,
      actionName: getActionChinese(event.ability.guid) ?? event.ability.name,
      actionId: event.ability.guid,
      sourceIsFriendly: event.sourceIsFriendly,
      url:
        event?.ability?.abilityIcon.replace('-', '/').replace('.png', '') ??
        '000000/000405',
      window: undefined,
      sourceID: event.sourceID,
    })
  }
  confirmEnabled.value = true
}

// fflogs导入第4步：用户选好了过滤器
function handeleFFlogsQueryResultFriendiesListFilter() {
  isLoading.value = true
  currentStep.value = 3
  // 保存过滤器
  if (fflogsQueryConfig.player?.icon) {
    timelineStore.updateFilters(
      fflogsQueryConfig.player?.icon,
      JSON.parse(JSON.stringify(fflogsQueryConfig.abilityFilterSelected))
    )
  }

  fflogsQueryConfig.abilityFilterEvents = fflogsQueryConfig.abilityFilterEvents
    .filter((event) => {
      return (
        (event.sourceIsFriendly &&
          fflogsQueryConfig.abilityFilterSelected.includes(event.actionId)) ||
        !event.sourceIsFriendly
      )
    })
    .sort((a, b) => a.time - b.time)
  fflogsQueryConfig.abilityFilterEvents = factory(
    fflogsQueryConfig.abilityFilterEvents
  )
  fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline =
    fflogsQueryConfig.abilityFilterEvents
      .map((item) => {
        const {
          time,
          actionName,
          actionId,
          type,
          sourceID,
          window,
          sourceIsFriendly,
          syncOnce,
          battleOnce,
        } = item

        if (sourceIsFriendly) {
          return `${time} "<${actionName}>~"${
            addTTS.value ? ` tts "${actionName}"` : ''
          }`
        }

        if (
          (/^(?:攻击|attack|攻撃)$/i.test(actionName) && !window) ||
          (type === 'cast' && !window) ||
          fflogsQueryConfig.battleSyncedIDs.includes(actionId)
        ) {
          return `# ${time} "${actionName}"`
        }

        const source = fflogsQueryConfig.enemies.find((e) => e.id === sourceID)
        if ((source?.type === 'NPC' || /unknown/.test(actionName)) && !window)
          return null

        const hexId = actionId.toString(16).toUpperCase()
        const regexType = type === 'begincast' ? 'StartsUsing' : 'Ability'
        const syncLine = `${time} "${actionName}" ${regexType} { id: "${hexId}" }`
        if (battleOnce && window) {
          fflogsQueryConfig.battleSyncedIDs.push(actionId)
        }
        return window
          ? `${syncLine} window ${window.join(',')} ${syncOnce ? 'once' : ''}`
          : `# ${syncLine}`
      })
      .filter((item) => item !== null)
      .join('\n')

  const index = timelineStore.newTimeline(
    `导入${fflogsQueryConfig.player?.name}`,
    {
      zoneId: fflogsQueryConfig.zoneID.toString(),
      jobs: [(fflogsQueryConfig.player?.icon as Job) ?? 'NONE'],
    },
    fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline,
    `${fflogsQueryConfig.code}#fight=${fflogsQueryConfig.fightIndex + 1}`
  )
  claerFFlogsQueryConfig()
  emits('showFFlogsToggle')
  emits('editTimeline', timelineStore.allTimelines[index]!)
  setTimeout(() => {
    currentStep.value = 0
  }, 500)
  isLoading.value = false
}
// fflogs导入第B2步：用户选定了敌人
async function handleFFlogsQueryResultEnemiesList() {
  isLoading.value = true
  currentStep.value = 2
  fflogsQueryConfig.type = 'enemies'
  fflogsQueryConfig.abilityFilterEvents.length = 0
  fflogsQueryConfig.abilityFilterCandidate.length = 0
  // 进入第三B步
  try {
    await queryFFlogsReportEventsEnemies()
    fflogsQueryConfig.abilityFilterCandidate =
      fflogsQueryConfig.abilityFilterEvents
        .reduce((total, item) => {
          if (
            item.sourceIsFriendly === false &&
            !total.find((v) => v.actionName === item.actionName)
          ) {
            total.push(item)
          }
          return total
        }, [] as FFlogsStance)
        .sort((a, b) => a.time - b.time)
    fflogsQueryConfig.enemiesAbilityFilterSelected =
      fflogsQueryConfig.enemiesAbilityFilterSelected.filter((v) => {
        return fflogsQueryConfig.abilityFilterCandidate.find(
          (e) => e.actionName === v
        )
      })
    isLoading.value = false
  } catch (e) {
    ElMessageBox.alert(
      `请稍后重试。如果问题持续存在,请检查您的网络连接。错误详情: ${e}`,
      '获取敌人技能数据失败',
      {
        confirmButtonText: '确定',
        type: 'error',
      }
    )
    isLoading.value = false
  }
}

// fflogs导入第B3步：通过API获取选定玩家所有casts
async function queryFFlogsReportEventsEnemies() {
  confirmEnabled.value = false
  const resEvents: FFlogsApiV1ReportEvents[] = []
  fflogsQueryConfig.abilityFilterEvents.length = 0
  fflogsQueryConfig.enemiesAbilityFilterSelected.length = 0
  async function queryEnemies(startTime: number, index: number) {
    if (index >= 0) {
      try {
        const enemyCacheKey = `events:enemy:${fflogsQueryConfig.code}:${startTime}:${fflogsQueryConfig.bossIDs[index]}`
        const cachedEnemy = getCache<any>(enemyCacheKey)
        let res: any

        if (cachedEnemy && isCacheValid(cachedEnemy)) {
          res = cachedEnemy.data
        } else {
          res = await fetch(
            `https://cn.fflogs.com/v1/report/events/casts/${fflogsQueryConfig.code}?start=${startTime}&end=${fflogsQueryConfig.end}&hostility=1&sourceid=${fflogsQueryConfig.bossIDs[index]}&api_key=${timelineStore.settings.api}`
          ).then((response) => {
            if (!response.ok)
              throw new Error(`HTTP error! status: ${response.status}`)
            return response.json()
          })
          setCache(enemyCacheKey, res)
        }
        resEvents.push(...res.events)
        if (
          res.nextPageTimestamp &&
          res.nextPageTimestamp > 0 &&
          res.nextPageTimestamp < fflogsQueryConfig.end
        ) {
          await queryEnemies(res.nextPageTimestamp, index)
        }

        if (index < fflogsQueryConfig.bossIDs.length - 1)
          await queryEnemies(startTime, index + 1)
      } catch (e) {
        ElMessageBox.alert(
          `请稍后重试。如果问题持续存在,请检查您的网络连接。错误详情: ${e}`,
          '获取敌方技能数据失败',
          {
            confirmButtonText: '确定',
            type: 'error',
          }
        )
      }
    }
  }
  await Promise.all([queryEnemies(fflogsQueryConfig.start, 0)])

  for (const event of resEvents) {
    fflogsQueryConfig.abilityFilterEvents.push({
      time: Number(
        ((event.timestamp - fflogsQueryConfig.start) / 1000).toFixed(1)
      ),
      type: event.type,
      actionName: getActionChinese(event.ability.guid) ?? event.ability.name,
      actionId: event.ability.guid,
      sourceIsFriendly: false,
      url: '',
      window: undefined,
      sourceID: event.sourceID,
    })
  }
  confirmEnabled.value = true
  fflogsQueryConfig.enemiesAbilityFilterSelected.length = 0
  const uniActionNames = Array.from(
    new Set(fflogsQueryConfig.abilityFilterEvents.map((e) => e.actionName))
  )
  fflogsQueryConfig.enemiesAbilityFilterSelected.push(...uniActionNames)
}

// fflogs导入第B4步：用户选好了过滤器
function handeleFFlogsQueryResultEnemiesListFilter() {
  // isLoading.value = true
  currentStep.value = 3
  // 保存过滤器
  // timelineStore.updateFilters(
  //   'ENEMIES',
  //   JSON.parse(
  //     JSON.stringify(fflogsQueryConfig.enemiesAbilityFilterSelected)
  //   ) as string[]
  // )
  fflogsQueryConfig.abilityFilterEvents = fflogsQueryConfig.abilityFilterEvents
    .filter((event) =>
      fflogsQueryConfig.enemiesAbilityFilterSelected.includes(event.actionName)
    )
    .sort((a, b) => a.time - b.time)
  fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline =
    fflogsQueryConfig.abilityFilterEvents
      .map((item) => {
        const { time, actionName, actionId, type } = item
        const regexType = type === 'begincast' ? 'StartsUsing' : 'Ability'
        const hexId = actionId.toString(16).toUpperCase()
        const source = fflogsQueryConfig.enemies.find(
          (e) => e.id === item.sourceID
        )
        const sourceType = source?.type === "Boss" ? 'Boss' : '分身'
        const sourceName = source?.name ?? '未知'
        return `${time} "${actionName}" ${regexType} { id: "${hexId}" } #${sourceName}（${sourceType}）`
      })
      .join('\n')
  const index = timelineStore.newTimeline(
    `BOSS时间轴（使用前请删除非必要的正则）`,
    { zoneId: fflogsQueryConfig.zoneID.toString(), jobs: [] },
    fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline,
    `${fflogsQueryConfig.code}#fight=${fflogsQueryConfig.fightIndex + 1}`
  )
  claerFFlogsQueryConfig()
  emits('showFFlogsToggle')
  emits('editTimeline', timelineStore.allTimelines[index]!)
  setTimeout(() => {
    currentStep.value = 0
  }, 500)
}

// fflogs相关配置初始化
function claerFFlogsQueryConfig() {
  fflogsQueryConfig.type = 'friendies'
  fflogsQueryConfig.code = ''
  fflogsQueryConfig.fightIndex = 0
  fflogsQueryConfig.start = 0
  fflogsQueryConfig.end = 0
  fflogsQueryConfig.friendlies = []
  fflogsQueryConfig.abilityFilterEvents = []
  fflogsQueryConfig.abilityFilterCandidate = []
  fflogsQueryConfig.abilityFilterSelected = []
  fflogsQueryConfig.enemiesAbilityFilterSelected = []
  fflogsQueryConfig.abilityFilterEventsAfterFilterRawTimeline = ''
  fflogsQueryConfig.player = undefined
  fflogsQueryConfig.zoneID = 0
  fflogsQueryConfig.bossIDs = []
  fflogsQueryConfig.enemies = []
  fflogsQueryConfig.battleSyncedIDs = []
}

function openFFLogsProfile() {
  window.open('https://cn.fflogs.com/profile', '_blank')
}

function getJobStr(icon: FFIcon) {
  return Util.jobToFullName(Util.jobEnumToJob(Util.iconToJobEnum(icon))).cn
}

onMounted(() => {
  fflogsCache.clearExpired()
})
</script>

<template>
  <el-button
    :style="
      currentStep > 0 ? {} : { visibility: 'hidden', pointerEvent: 'none' }
    "
    type="primary"
    text
    position-absolute
    z-999
    class="guide"
    @click="currentStep--"
  >
    上一步
  </el-button>
  <el-steps :active="currentStep" class="steps-guide" align-center>
    <el-step title="导入战斗" />
    <el-step title="选择目标" />
    <el-step title="过滤技能" />
  </el-steps>
  <el-card v-if="currentStep === 0" class="input-section">
    <el-form label-width="150px" class="fflogs-form">
      <el-form-item label="FF Logs 战斗链接">
        <el-input
          v-model="inputUrl"
          placeholder="https://www.fflogs.com/reports/AAAaAaAAaa1aA1aA?fight=1"
          autocomplete="on"
        />
      </el-form-item>
      <el-form-item label="FF logs V1 Key">
        <el-input
          v-model="timelineStore.settings.api"
          placeholder="在 FF Logs 个人设置页面获取 V1 API Key"
          type="password"
          show-password
        >
          <template #append>
            <el-tooltip
              content="点击前往 FF Logs 个人设置页面，在最下方填写 V1客户名称 并点击确认后，再获取你的 V1 客户端密钥"
              placement="top"
              effect="light"
            >
              <el-button type="primary" link @click="openFFLogsProfile">
                如何获取
              </el-button>
            </el-tooltip>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button
          :disabled="queryText === QueryTextEnum.querying"
          type="primary"
          @click="queryFFlogsReportFights(inputUrl)"
        >
          <el-icon v-if="isLoading" class="is-loading">
            <Loading />
          </el-icon>
          {{ queryText }}
        </el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <div class="query-results">
    <el-card v-if="currentStep === 1" class="player-selection">
      <el-table
        :data="
          fflogsQueryConfig.friendlies.filter((v) => !['NPC'].includes(v.icon))
        "
        stripe
        border
        class="friendlies-table"
      >
        <el-table-column prop="name" label="玩家名称" />
        <el-table-column label="职业">
          <template #default="{ row }">
            {{ getJobStr(row.icon) }}
          </template>
        </el-table-column>
        <el-table-column label="选定" width="100" align="center">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click="handleFFlogsQueryResultFriendliesList(scope.row)"
            >
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div flex="~" m-t-10>
        <el-button type="info" @click="handleFFlogsQueryResultEnemiesList()"
          >不选择玩家，而是生成BOSS时间轴</el-button
        >
      </div>
    </el-card>

    <el-card v-if="currentStep === 2" class="ability-filter">
      <div class="ability-filter-container">
        <div v-if="!confirmEnabled" class="loading-abilities">
          <el-icon class="is-loading">
            <Loading />
          </el-icon>
          <span>正在加载技能列表...</span>
        </div>
        <template
          v-if="confirmEnabled && fflogsQueryConfig.type === 'friendies'"
        >
          <el-select
            v-model="fflogsQueryConfig.abilityFilterSelected"
            multiple
            placeholder="选择需要导入的技能"
            :fit-input-width="true"
            class="ability-filter-select"
            filterable
          >
            <el-option
              v-for="rule in fflogsQueryConfig.abilityFilterCandidate"
              :key="rule.actionId"
              :value="rule.actionId"
              :label="rule.actionName"
              class="ability-filter-option"
            >
              <img
                :src="getImgSrc(`/i/${rule.url}.png`)"
                class="ability-filter-icon"
                :alt="rule.actionName"
                :onerror="handleImgError"
              />
              <span>{{ rule.actionName }}</span>
            </el-option>
          </el-select>
          <el-form-item label="添加 TTS 语法" w-60 m-t-3>
            <el-switch v-model="addTTS" />
          </el-form-item>
          <el-button
            type="success"
            class="filter-confirm-btn"
            :disabled="!confirmEnabled"
            @click="handeleFFlogsQueryResultFriendiesListFilter"
          >
            {{ '生成玩家时间轴' }}
          </el-button>
        </template>
        <template
          v-else-if="confirmEnabled && fflogsQueryConfig.type === 'enemies'"
        >
          <el-select
            v-if="confirmEnabled"
            v-model="fflogsQueryConfig.enemiesAbilityFilterSelected"
            multiple
            placeholder="选择需要导入的技能"
            :fit-input-width="true"
            class="ability-filter-select"
            filterable
          >
            <el-option
              v-for="rule in fflogsQueryConfig.abilityFilterCandidate"
              :key="rule.actionName"
              :value="rule.actionName"
              class="ability-filter-option"
            >
              <span> {{ rule.actionName }} </span>
            </el-option>
          </el-select>
          <el-button
            type="success"
            class="filter-confirm-btn"
            :disabled="!confirmEnabled"
            @click="handeleFFlogsQueryResultEnemiesListFilter"
          >
            {{ '生成敌人时间轴' }}
          </el-button>
        </template>
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.guide {
  margin-bottom: 20px;
  text-align: center;
}

.steps-guide {
  margin-bottom: 20px;
}

.input-section {
  margin-bottom: 20px;
}

.fflogs-form {
  max-width: 600px;
  margin: 0 auto;
}

.query-results {
  margin-top: 20px;
}

.player-selection,
.ability-filter {
  margin-bottom: 20px;
}

.friendlies-table {
  width: 100%;
}

.ability-filter-container {
  display: flex;
  align-items: center;
}

.ability-filter-select {
  flex-grow: 1;
  margin-right: 10px;
}

.ability-filter-option {
  display: inline-flex;
  align-items: center;
  padding: auto 1px;
  border: 1px dashed rgba(128, 128, 128, 0.3);
  border-radius: 4px;
  margin: 3px;
}

.ability-filter-icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
  object-fit: contain;
}

.filter-confirm-btn {
  flex-shrink: 0;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  color: white;
}

.custom-message-box {
  max-width: 500px;
  width: 90%;
}

.custom-message-box .el-message-box__content {
  word-break: break-word;
}
</style>
