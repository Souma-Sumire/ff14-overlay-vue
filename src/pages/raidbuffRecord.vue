<!-- 一坨大屎。。。 -->
<script setup lang="tsx">
import type { Ref } from 'vue'
import type {
  VxeTableEvents,
  VxeTableInstance,
  VxeTablePropTypes,
} from 'vxe-table'
import {
  VXETable,
} from 'vxe-table'
import { addOverlayListener, removeOverlayListener } from '../../cactbot/resources/overlay_plugin_api'
import logDefinitions from '../../cactbot/resources/netlog_defs'
import NetRegexes from '../../cactbot/resources/netregexes'
import testLog from '@/components/testLog.vue'
import { getActionChinese } from '@/resources/actionChinese'
import type {
  Raidbuff,
} from '@/resources/raidbuff'
import {
  getRaidbuff,
  universalVulnerableEnemy,
  universalVulnerableFriendly,
} from '@/resources/raidbuff'
import { completeIcon, stackUrl } from '@/resources/status'
import type { Player } from '@/types/partyPlayer'
import { deepClone } from '@/utils/deepClone'
import type {
  DamageEffect,
  DamageProperties,
  DamageType,
} from '@/utils/flags'
import {
  processAbilityLine,
  processFlags,
  translationFlags,
} from '@/utils/flags'
import Util from '@/utils/util'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'

export interface RowVO {
  timestamp: number
  time: string
  id?: string
  actionCN: string
  action: string
  source: string
  target: string
  sourceId: string
  job: string
  jobIcon: string
  jobEnum: number
  amount: number
  raidbuffs: Status[]
  currentHp: number
  maxHp: number
  effect: DamageEffect
  properties: DamageProperties
  type: DamageType
  povId: string
}
interface Status {
  name: string
  count: number
  effect: string
  effectId: string
  source: string
  sourceId: string
  target: string
  targetId: string
  expirationTimestamp: number
  fullIcon: string
  isPov: boolean
  remainingDuration?: string
}interface Encounter {
  key: string
  zoneName: string
  duration: string
  table: RowVO[]
}
const store = useKeigennRecord2Store()
const userOptions = { ...store.userOptions }
const filterPov = new URLSearchParams(window.location.href.split('?')[1]).get('filterPov') === 'true'
const onlyBuffs = new URLSearchParams(window.location.href.split('?')[1]).get('onlyBuffs') === 'true'
store.recheckIsDev()

const params = useUrlSearchParams('hash')
const isDev = ref(
  params.dev === '1'
  || (params.dev === undefined
  && !window.OverlayPluginApi
  && !params.OVERLAY_WS
  && !params.HOST_PORT),
)

if (isDev.value) {
  // 某些情况下OverlayPluginApi并不会立即被挂在到window上。用户上报，未复现。
  setTimeout(() => {
    isDev.value
      = params.dev === '1'
      || (params.dev === undefined
      && !window.OverlayPluginApi
      && !params.OVERLAY_WS
      && !params.HOST_PORT)
  }, 1000)
}

const focusing = ref({ source: false, action: false })
const focusRow: Ref<RowVO | undefined> = ref()

const minimize = ref(userOptions.minimize)

const size = {
  line_height: 28 * userOptions.scale,
  time: 35 * userOptions.scale,
  action: 65 * userOptions.scale,
  source:
    ((userOptions.showIcon ? 24 : 0)
    + (userOptions.showName
      ? userOptions.anonymous
      || (!userOptions.anonymous && userOptions.abbrId)
        ? 24
        : 36
      : 0)
      + 4)
      * userOptions.scale,
  amount: 44 * userOptions.scale,
  properties: 32 * userOptions.scale,
}

const style = {
  '--vxe-font-size-mini': `${12 * userOptions.scale}px`,
  '--vxe-table-row-line-height': `${30 * userOptions.scale}px`,
  '--vxe-table-row-height-mini': `${30 * userOptions.scale}px`,
  '--vxe-input-height-mini': `${20 * userOptions.scale}px`,
  '--vxe-select-option-height-mini': `${24 * userOptions.scale}px`,
}

const maxStorage = {
  runtime: 99,
  localStorage: 3,
}

const loading = ref(false)

// let lastPush: number = Date.now();
// let lastScroll: number = 0;

interface PlayerSP extends Player {
  timestamp: number
}

const xTable = ref<VxeTableInstance>()
// const allowAutoScroll = ref(true);
const povName = useStorage('raidbuff-record-2-pov-name', '')
const povId = useStorage('raidbuff-record-2-pov-id', '')
const partyLogList = useStorage('raidbuff-record-2-party-list', [] as string[])
const jobMap = useStorage(
  'raidbuff-record-2-job-map',
  {} as Record<string, { job: number, timestamp: number }>,
)
const partyEventParty = useStorage(
  'raidbuff-record-2-party-event-party',
  [] as PlayerSP[],
)
const select = ref(0)
const data = ref<Encounter[]>([
  { zoneName: '', duration: '00:00', table: [], key: 'init' },
])
const regexes: Record<string, RegExp> = {
  rsv: /^262\|(?<timestamp>[^|]*)\|[^|]*\|[^|]*\|_rsv_(?<id>\d+)_[^|]+\|(?<real>[^|]*)\|/i,
  ability: NetRegexes.ability(),
  gainsEffect: NetRegexes.gainsEffect(),
  losesEffect: NetRegexes.losesEffect(),
  inCombat:
    /^260\|(?<timestamp>[^|]*)\|(?<inACTCombat>[^|]*)\|(?<inGameCombat>[^|]*)\|/,
  changeZone: NetRegexes.changeZone(),
  partyList:
    /^11\|(?<timestamp>[^|]*)\|(?<partyCount>\d*)\|(?<list>(?:\w{8}\|)*)\w{16}/,
  primaryPlayer: /^02\|(?<timestamp>[^|]*)\|(?<id>[^|]*)\|(?<name>[^|]*)/,
  addCombatant: NetRegexes.addedCombatant(),
  removingCombatant: NetRegexes.removingCombatant(),
}

const STORAGE_KEY = 'souma-raidbuff-record-2'
const combatTimeStamp: Ref<number> = ref(0)
const zoneName = useStorage('souma-raidbuff-record-2-zone-name', '' as string)
const rsvData = useStorage(
  'souma-raidbuff-record-2-rsv-data',
  {} as Record<number, string>,
)
const statusData: {
  friendly: { [id: string]: { [effectId: string]: Status } }
  enemy: { [name: string]: { [effectId: string]: Status } }
} = {
  friendly: {},
  enemy: {},
}

function resetLine(line: Encounter) {
  line.table.length = 0
  line.zoneName = ''
  line.duration = '00:00'
  line.key = 'init'
}

function beforeHandle() {
  loading.value = true
  combatTimeStamp.value = 0
  select.value = 0
  data.value.length = 1
  resetLine(data.value[0])
}

function afterHandle() {
  saveStorage()
  loading.value = false
}

function handleLogLine(e: {
  type: string
  line: string[]
  rawLine: string
}) {
  handleLine(e.rawLine)
}

function handleLine(line: string) {
  for (const regexName in regexes) {
    const regex = regexes[regexName]
    const match = regex.exec(line)
    if (match) {
      const splitLine = line.split('|')
      switch (regexName) {
        case 'gainsEffect':
          {
            const effectId
              = splitLine[logDefinitions.GainsEffect.fields.effectId]
            const effect = splitLine[logDefinitions.GainsEffect.fields.effect]
            const target = splitLine[logDefinitions.GainsEffect.fields.target]
            const targetId
              = splitLine[logDefinitions.GainsEffect.fields.targetId]
            const count = Number(
              splitLine[logDefinitions.GainsEffect.fields.count],
            )
            let raidbuff: Raidbuff | undefined = getRaidbuff(effectId)
            if (!raidbuff) {
              const vulnerable
                = (targetId.startsWith('1')
                && universalVulnerableFriendly.get(
                  Number.parseInt(effectId, 16).toString(),
                ))
                || (targetId.startsWith('4')
                && universalVulnerableEnemy.get(
                  Number.parseInt(effectId, 16).toString(),
                ))
              if (!vulnerable)
                return
              const fullIcon = completeIcon(vulnerable.icon)
              const realIcon = count > 1 ? stackUrl(fullIcon, count) : fullIcon
              raidbuff = {
                id: Number.parseInt(effectId, 16),
                fullIcon: realIcon,
                name: vulnerable.name,
                isFriendly: vulnerable.isFriendly,
              }
            }
            const duration
              = splitLine[logDefinitions.GainsEffect.fields.duration]
            const source = splitLine[logDefinitions.GainsEffect.fields.source]
            const sourceId
              = splitLine[logDefinitions.GainsEffect.fields.sourceId]
            const timestamp = new Date(
              splitLine[logDefinitions.GainsEffect.fields.timestamp],
            ).getTime()
            const expirationTimestamp = timestamp + Number.parseFloat(duration) * 1000
            const status: Status = {
              name: raidbuff.name,
              count,
              effect,
              effectId,
              source,
              sourceId,
              target,
              targetId,
              expirationTimestamp,
              fullIcon: raidbuff.fullIcon,
              isPov: povId.value === sourceId,
            }
            if (targetId.startsWith('1') && raidbuff.isFriendly)
              (statusData.friendly[targetId] ??= {})[effectId] = status
            else if (targetId.startsWith('4') && !raidbuff.isFriendly)
              (statusData.enemy[target] ??= {})[effectId] = status
          }
          break
        case 'losesEffect':
          {
            const target = splitLine[logDefinitions.LosesEffect.fields.target]
            const targetId
              = splitLine[logDefinitions.LosesEffect.fields.targetId]
            const effectId
              = splitLine[logDefinitions.LosesEffect.fields.effectId]
            if (targetId.startsWith('1')) {
              if (statusData.friendly[targetId])
                Reflect.deleteProperty(statusData.friendly[targetId], effectId)
            }
            else {
              if (statusData.enemy[target])
                Reflect.deleteProperty(statusData.enemy[target], effectId)
            }
          }
          break
        case 'addCombatant':
          if (splitLine[logDefinitions.AddedCombatant.fields.job] !== '00') {
            const job = splitLine[logDefinitions.AddedCombatant.fields.job]
            const timestamp = new Date(
              splitLine[logDefinitions.AddedCombatant.fields.timestamp],
            ).getTime()
            jobMap.value[splitLine[logDefinitions.AddedCombatant.fields.id]] = {
              job: Number.parseInt(job, 16),
              timestamp,
            }
          }
          break
        case 'removingCombatant':
          Reflect.deleteProperty(
            jobMap.value,
            splitLine[logDefinitions.RemovedCombatant.fields.id],
          )
          break
        case 'primaryPlayer':
          { povId.value = splitLine[logDefinitions.ChangedPlayer.fields.id]
            const _povName = splitLine[logDefinitions.ChangedPlayer.fields.name]
            if (povName.value === _povName)
              return
            povName.value = _povName
            store.initEnvironment(
              splitLine[logDefinitions.ChangedPlayer.fields.name],
            )
          }
          break
        case 'partyList':
          partyLogList.value = match.groups!.list?.split('|') ?? []
          break
        case 'changeZone':
          zoneName.value = splitLine[logDefinitions.ChangeZone.fields.name]
          stopCombat(
            new Date(
              splitLine[logDefinitions.ChangeZone.fields.timestamp],
            ).getTime(),
          )
          break
        case 'inCombat':
          {
            const inACTCombat
              = splitLine[logDefinitions.InCombat.fields.inACTCombat] === '1'
            const inGameCombat
              = splitLine[logDefinitions.InCombat.fields.inGameCombat] === '1'
            const timeStamp = new Date(
              splitLine[logDefinitions.InCombat.fields.timestamp],
            ).getTime()
            if (inACTCombat || inGameCombat) {
              // new combat
              if (combatTimeStamp.value > 0)
                return
              if (data.value[0].table.length !== 0) {
                data.value[0] = markRaw(data.value[0])
                data.value.unshift({
                  zoneName: '',
                  duration: '00:00',
                  table: [],
                  key: splitLine[logDefinitions.InCombat.fields.timestamp],
                })
                if (data.value.length >= maxStorage.runtime)
                  data.value.splice(data.value.length - 1, 1)
              }
              combatTimeStamp.value = timeStamp
              data.value[0].zoneName = zoneName.value
              select.value = 0
              const $table = xTable.value
              if ($table && filterPov) {
                $table.updateData().then(() => {
                  const col = $table.getColumnByField('source')
                  if (col) {
                    const option = col.filters.find(
                      v => v.value === povName.value,
                    )
                    if (!option)
                      return

                    option.checked = true
                    $table.updateData().then(() => {
                      focusing.value.source = true
                    })
                  }
                })
              }
              return
            }
            if (!inACTCombat && !inGameCombat) {
              // stop combat
              stopCombat(timeStamp)
              return
            }
          }
          break
        case 'rsv':
          {
            const id = Number(match.groups!.id as string)
            const real = splitLine[logDefinitions.RSVData.fields.value]
            rsvData.value[Number(id)] = real
          }
          break
        case 'ability':
          if (combatTimeStamp.value === 0)
            return
          {
            const ability = processAbilityLine(splitLine)
            if (ability.isAttack && ability.amount >= 0) {
              const sourceId
                = splitLine[logDefinitions.Ability.fields.sourceId] ?? '???'
              const targetId
                = splitLine[logDefinitions.Ability.fields.targetId] ?? '???'
              if (!(sourceId.startsWith('1') && targetId.startsWith('4')))
                return

              if (
                !(
                  sourceId === povId.value
                  || partyLogList.value.includes(sourceId)
                  || partyEventParty.value.find(v => v.id === sourceId)
                )
              ) {
                return
              }

              const timestamp = new Date(
                splitLine[logDefinitions.Ability.fields.timestamp] ?? '???',
              ).getTime()
              const rawAblityName
                = splitLine[logDefinitions.Ability.fields.ability]
              const rsvMatch = rawAblityName.match(/^_rsv_(?<id>\d+)_/)
              const id = splitLine[logDefinitions.Ability.fields.id] ?? '???'
              let action = rawAblityName
              if (rsvMatch) {
                const id: number = Number(rsvMatch.groups!.id)
                action
                  = rsvData.value[id]
                  ?? rawAblityName.match(/^_(?<id>rsv_\d+)_/)!.groups!.id
              }
              else {
                action = action.replace(/unknown_.*/, '攻击')
                if (
                  userOptions.parseAA === false
                  && /^攻击|攻撃|[Aa]ttack$/.test(action)
                ) {
                  return
                }
              }
              const cn = getActionChinese(Number.parseInt(id, 16))
              const actionCN = cn && cn !== '' ? cn : action
              const currentHp
                = Number(
                  splitLine[logDefinitions.Ability.fields.targetCurrentHp],
                ) ?? '???'
              const maxHp
                = Number(splitLine[logDefinitions.Ability.fields.targetMaxHp])
                ?? '???'
              const source
                = splitLine[logDefinitions.Ability.fields.source] ?? '???'
              const target
                = splitLine[logDefinitions.Ability.fields.target] ?? '???'
              const { effect, type, properties } = processFlags(ability.flags)
              const time
                = combatTimeStamp.value === 0
                  ? 0
                  : timestamp - combatTimeStamp.value
              const formattedTime = formatTime(time)
              const playerJob = getJobById(sourceId)
              // const targetJob = jobMap.value[targetId].job ?? target.substring(0, 2);
              const job = Util.nameToFullName(
                Util.jobEnumToJob(playerJob),
              ).cn.substring(0, 2)
              const jobEnum = playerJob
              const jobIcon = Util.jobEnumToIcon(jobEnum).toLocaleLowerCase()
              const raidbuffs = deepClone(
                Object.values(statusData.friendly[sourceId] ?? [])
                  .concat(Object.values(statusData.enemy[target] ?? []))
                  .filter((v) => {
                    const remain = Math.max(
                      0,
                      (v.expirationTimestamp - timestamp) / 1000,
                    )
                    v.remainingDuration
                      = remain >= 999
                        ? ''
                        : remain.toFixed(
                          remain > 0.05 && remain < 0.95 ? 1 : 0,
                        )
                    // 有时会有过期很久的遗留的buff?
                    return Number(v.remainingDuration) > -3
                  }),
              )
              if (onlyBuffs && raidbuffs.length === 0)
                return

              addRow({
                timestamp,
                time: formattedTime,
                id,
                action,
                actionCN,
                source,
                target,
                sourceId,
                job,
                jobIcon,
                jobEnum,
                amount: ability.amount,
                raidbuffs,
                currentHp,
                maxHp,
                effect,
                properties,
                type,
                povId: povId.value,
              })
              data.value[0].duration = formatTime(
                new Date(
                  splitLine[logDefinitions.Ability.fields.timestamp],
                ).getTime() - combatTimeStamp.value,
              )
            }
            break
          }
        default:
          break
      }
    }
  }
}

function getJobById(targetId: string): number {
  const fromJobMap = jobMap.value[targetId]
  const fromPartyEvent = partyEventParty.value.find(
    v => v.id === targetId,
  ) ?? { job: 0, timestamp: 0 }
  return [fromJobMap, fromPartyEvent].sort(
    (a, b) => b.timestamp - a.timestamp,
  )[0].job
}

function addRow(row: RowVO) {
  // if (userOptions.pushMode) {
  //   data.value[0].table.push(row);
  //   lastPush = Date.now();
  // } else {
  data.value[0].table.unshift(row)
  // }
}

function stopCombat(timeStamp: number) {
  if (combatTimeStamp.value === 0)
    return
  data.value[0].duration = formatTime(timeStamp - combatTimeStamp.value)
  combatTimeStamp.value = 0
  statusData.friendly = {}
  statusData.enemy = {}
  saveStorage()
}

function saveStorage() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data.value.slice(0, maxStorage.localStorage)),
  )
}

function loadStorage() {
  const load = localStorage.getItem(STORAGE_KEY)
  if (load) {
    try {
      const loadData = JSON.parse(load)
      data.value.length = 0
      data.value.push(...loadData)
    }
    catch (e) {
      console.error(e)
    }
  }
}

function formatTime(time: number) {
  const minute = Math.max(Math.floor(time / 60000), 0)
  const second = Math.max(Math.floor((time - minute * 60000) / 1000), 0)
  return `${minute < 10 ? '0' : ''}${minute}:${
    second < 10 ? '0' : ''
  }${second}`
}

const sourceOptions = computed(() => {
  const targetToJob: Record<string, string> = {}
  const result = new Set(
    data.value[select.value].table
      .slice()
      .sort((a, b) => Util.enumSortMethod(a.jobEnum, b.jobEnum))
      .map((item) => {
        targetToJob[item.source] = item.job
        return item.source
      }),
  )
  return Array.from(result).map(item => ({
    label: `${targetToJob[item]}（${item}）`,
    value: item,
  }))
})

function handleChangePrimaryPlayer(event: {
  charID: number
  charName: string
}): void {
  povName.value = event.charName
  povId.value = event.charID.toString(16).toUpperCase()
}

function handlePartyChanged(e: {
  party: { id: string, name: string, inParty: boolean, job: number }[]
}): void {
  partyEventParty.value = e.party.map(v => ({ ...v, timestamp: Date.now() }))
}

onMounted(() => {
  for (const id in jobMap.value) {
    const element = jobMap.value[id]
    if (Date.now() - element.timestamp > 1000 * 60 * 60 * 24 * 1)
      Reflect.deleteProperty(jobMap.value, id)
  }
  loadStorage()
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('PartyChanged', handlePartyChanged)
  addOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  // startOverlayEvents();
})

onUnmounted(() => {
  removeOverlayListener('LogLine', handleLogLine)
})

function doCopy(row: RowVO) {
  const {
    action,
    actionCN,
    amount,
    job,
    raidbuffs,
    source,
    time,
    type,
    properties,
  } = row
  const sp
    = row.effect === 'damage done' ? '' : `,${translationFlags(row.effect)}`
  const result = `${time} [${job}]${source}的“${action}${
    actionCN !== action ? `(${actionCN})` : ''
  }”造成${amount.toLocaleString()}点${translationFlags(type)}${translationFlags(
    properties,
  )}伤害。团辅：${
    raidbuffs.length === 0 && sp === ''
      ? '无'
      : raidbuffs
          .map(k => (userOptions.statusCN ? k.name : k.effect))
          .join(',') + sp
  }。`
  copyText(result)
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const input = document.createElement('input')
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
  })
  VXETable.modal.message({ content: '已复制到剪贴板', status: 'success' })
}

const menuConfig = reactive<VxeTablePropTypes.MenuConfig<RowVO>>({
  className: 'my-menus',
  body: {
    options: [],
  },
})

watchEffect(() => {
  if (menuConfig.body && menuConfig.body.options && xTable.value) {
    menuConfig.body.options[0] = [
      {
        code: 'copy',
        name: '复制详情',
        prefixIcon: 'vxe-icon-copy',
        className: 'my-copy-item',
      },
      {
        code: 'clearFilterTarget',
        name: '取消玩家筛选',
        prefixIcon: 'vxe-icon-funnel-clear',
        visible: focusing.value.source,
        disabled: false,
      },
      {
        code: 'filterSelectTarget',
        name: focusRow.value?.source
          ? `只看[${focusRow.value.job}] ${focusRow.value.source}`
          : '只看该玩家',
        prefixIcon: 'vxe-icon-user-fill',
        visible: !focusing.value.source,
        disabled: false,
      },
    ]
  }
})

function clickMinimize() {
  minimize.value = !minimize.value
  // if (minimize.value === false && userOptions.pushMode) {
  //   lastPush = Date.now();
  //   requestAnimationFrame(() => scroll());
  // }
}

const cellContextMenuEvent: VxeTableEvents.CellMenu<RowVO> = ({ row }) => {
  const $table = xTable.value
  if ($table) {
    $table.setCurrentRow(row)
    focusRow.value = row
  }
}

const contextMenuClickEvent: VxeTableEvents.MenuClick<RowVO> = ({
  menu,
  row,
}) => {
  const $table = xTable.value

  switch (menu.code) {
    case 'copy':
      if (!row) {
        VXETable.modal.message({
          content: '未选中有效数据行',
          status: 'error',
        })
        return
      }
      doCopy(row)
      break
    case 'clearFilterTarget':
      if ($table) {
        $table.clearFilter($table.getColumnByField('source'))
        focusing.value.source = false
      }
      break
    case 'filterSelectTarget':
      if ($table) {
        const col = $table.getColumnByField('source')
        if (col) {
          const option = col.filters.find(v => v.value === row.source)
          if (!option)
            return

          option.checked = true
          $table.updateData().then(() => {
            $table.scrollToRow(row)
            focusing.value.source = true
          })
        }
      }
      break
    default:
      break
  }
}
</script>

<template>
  <div class="wrapper" :style="style">
    <header>
      <vxe-select
        v-show="!minimize"
        v-model="select"
        size="mini"
        class="select"
      >
        <vxe-option
          v-for="i in data.length"
          :key="`${data[i - 1].key}-${data[i - 1].duration}-${
            data[i - 1].zoneName
          }`"
          :value="i - 1"
          :label="`${data[i - 1].duration} ${data[i - 1].zoneName}`"
        />
      </vxe-select>
      <vxe-button
        class="minimize"
        :icon="minimize ? 'vxe-icon-fullscreen' : 'vxe-icon-minimize'"
        :style="{ opacity: minimize ? 0.5 : 1 }"
        @click="clickMinimize"
      />
    </header>
    <main v-show="!minimize">
      <vxe-table
        ref="xTable"
        size="mini"
        class="vxe-table"
        show-overflow="tooltip"
        round
        height="100%"
        :scroll-y="{ enabled: true }"
        :loading="loading"
        :show-header="userOptions.showHeader"
        :data="data[select].table"
        :row-config="{ isHover: true, height: size.line_height }"
        :header-cell-style="{
          padding: '0px',
        }"
        :menu-config="menuConfig"
        @cell-menu="cellContextMenuEvent"
        @menu-click="contextMenuClickEvent"
      >
        <vxe-column
          :width="size.source"
          field="source"
          :title="userOptions.showName ? '友方' : '友'"
          :filters="sourceOptions"
          :filter-multiple="false"
          :resizable="!userOptions.anonymous && !userOptions.abbrId"
          align="left"
          header-align="center"
        >
          <template #default="{ row }">
            <KeigennRecord2Target :row="row" />
          </template>
        </vxe-column>
        <vxe-column
          :width="size.time"
          field="time"
          title="时间"
          align="center"
        />
        <vxe-column
          :width="size.action"
          :field="userOptions.actionCN ? 'actionCN' : 'action'"
          title="技能"
          :resizable="false"
          align="right"
        />
        <vxe-column :width="size.amount" title="伤害" header-align="center">
          <template #default="{ row }">
            <KeigennRecord2Amount :row="row" />
          </template>
        </vxe-column>
        <vxe-column
          :width="size.properties"
          title="直暴"
          header-align="center"
          align="center"
        >
          <template #default="{ row }">
            {{
              translationFlags(row.properties)
                .replace(/普通$/, "")
                // eslint-disable-next-line no-irregular-whitespace
                .replace("直击", "直　")
                // eslint-disable-next-line no-irregular-whitespace
                .replace("暴击", "　暴")
            }}
          </template>
        </vxe-column>
        <vxe-column title="团辅" align="left">
          <template #default="{ row }">
            <RaidbuffRecordStatusShow :row="row" />
          </template>
        </vxe-column>
      </vxe-table>
    </main>
  </div>
  <div v-if="isDev" class="testLog">
    <testLog
      @before-handle="beforeHandle"
      @after-handle="afterHandle"
      @handle-line="handleLine"
    />
  </div>
</template>

<style lang="scss">
$base-bg: lighten(#151515, 0%);
$bg-color: rgba($base-bg, 0.7);
$tooltip-bg-color: lighten(#303133, 0%);
$text-color: lighten(#c9d1d9, 50%);
$border-color: lighten(#4e4a4a, 0%);
$selected-bg-color: lighten(#262626, 0%);
$striped-bg-color: lighten(#2b2929, 0%);
$primary-color-hover: lighten(white, 0%);
$warning-color-active: lighten(orange, 0%);
$vxe-form-background-color: $bg-color;
$vxe-pager-background-color: $bg-color;
$vxe-button-default-background-color: lighten($bg-color, 15%);
$vxe-table-header-background-color: transparent;
$vxe-font-color: darken($text-color, 12%);
$vxe-table-header-font-color: $text-color;
$vxe-table-footer-font-color: $text-color;
$vxe-table-body-background-color: transparent;
$vxe-table-row-striped-background-color: $striped-bg-color;
$vxe-table-border-color: $border-color;
$vxe-table-row-hover-background-color: darken($primary-color-hover, 50%);
$vxe-table-row-hover-striped-background-color: lighten($striped-bg-color, 10%);
$vxe-table-row-current-background-color: fade($primary-color-hover, 20%);
$vxe-table-row-hover-current-background-color: fade($primary-color-hover, 20%);
$vxe-table-column-hover-background-color: fade($primary-color-hover, 20%);
$vxe-table-column-current-background-color: fade($primary-color-hover, 20%);
$vxe-table-row-checkbox-checked-background-color: fade(
  $warning-color-active,
  15%
);
$vxe-table-row-hover-checkbox-checked-background-color: fade(
  $warning-color-active,
  20%
);
$vxe-table-menu-background-color: lighten($tooltip-bg-color, 10%);
$vxe-table-filter-panel-background-color: rgba($base-bg, 75%);
$vxe-grid-maximize-background-color: $bg-color;
$vxe-pager-perfect-background-color: $bg-color;
$vxe-pager-perfect-button-background-color: lighten($bg-color, 15%);
$vxe-input-background-color: $bg-color;
$vxe-input-border-color: $border-color;
$vxe-select-panel-background-color: $bg-color;
$vxe-table-popup-border-color: $border-color;
$vxe-select-option-hover-background-color: lighten($selected-bg-color, 15%);
$vxe-pulldown-panel-background-color: $bg-color;
$vxe-table-fixed-left-scrolling-box-shadow: 8px 0px 10px -5px rgba(255, 255, 255, 0.12);
$vxe-table-fixed-right-scrolling-box-shadow: -8px 0px 10px -5px rgba(255, 255, 255, 0.12);
$vxe-loading-background-color: rgba(0, 0, 0, 0.5);
$vxe-tooltip-dark-background-color: lighten($tooltip-bg-color, 25%);
$vxe-modal-header-background-color: $selected-bg-color;
$vxe-modal-body-background-color: $tooltip-bg-color;
$vxe-modal-border-color: $border-color;
$vxe-toolbar-panel-background-color: $bg-color;
$vxe-input-disabled-color: lighten($striped-bg-color, 20%);
$vxe-input-disabled-background-color: lighten($striped-bg-color, 25%);
$vxe-checkbox-icon-background-color: lighten($selected-bg-color, 15%);
$vxe-checkbox-checked-icon-border-color: $border-color;
$vxe-checkbox-indeterminate-icon-background-color: lighten(
  $selected-bg-color,
  15%
);
$vxe-border-radius: 0px;
$vxe-select-panel-background-color: rgba(21, 21, 21, 0.8);

.vxe-header--column {
  line-height: 1.75em !important;
  // 不换行
  .vxe-cell {
    white-space: nowrap !important;
  }
}

body,
html {
  padding: 0;
  margin: 0;
  overflow: hidden;
}

* {
  user-select: none;
}
.vxe-table--main-wrapper {
  background-color: rgba($bg-color, 0.8);
}

.vxe-body--row {
  &:hover {
    cursor: pointer;
  }
}
img[src=""],
img:not([src]) {
  // opacity: 0;
  // display: none;
  &::after {
    content: attr(data-job);
  }
}
.vxe-cell {
  padding-left: 2px !important;
  padding-right: 2px !important;
}
.minimize {
  padding: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  margin-left: auto !important;
  margin-right: 0 !important;
  border: none !important;
  width: var(--vxe-input-height-mini) !important;
  height: var(--vxe-input-height-mini) !important;
  z-index: 13;
}

.vxe-select-option {
  max-width: calc(100% - 2px) !important;
}
.vxe-table--filter-wrapper:not(.is--multiple) {
  text-align: left !important;
}

@import "vxe-table/styles/index.scss";

::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}
::-webkit-scrollbar-track {
  background-color: rgba(51, 51, 51, 1);
}
::-webkit-scrollbar-thumb {
  height: 30px;
  border-radius: 4px;
  background-color: rgba(180, 180, 180, 0.75);
}
::-webkit-scrollbar-thumb:active {
  background-color: rgba(160, 160, 160, 1);
}
.el-popper {
  min-width: 0 !important;
  width: auto !important;
}
.my-el-popover {
  & > div[role="title"] {
    font-size: calc(var(--vxe-font-size-mini) * 1.2) !important;
    font-weight: bold;
    margin-bottom: 0.2em !important;
  }
  font-size: var(--vxe-font-size-mini) !important;
  padding: 0.5em !important;
  white-space: nowrap;
}
.target {
  display: flex;
  flex-direction: row;
  align-items: center;
}
// .target-extra {
//   position: relative;
//   display: inline-flex;
//   flex-direction: column;
//   height: var(--vxe-input-height-mini);
//   p {
//     position: absolute;
//     margin: 0;
//     padding: 0;
//     transform-origin: center left;
//   }
//   .hp,
//   .shiled {
//     width: 3.7em;
//     display: flex;
//     justify-content: space-between;
//   }
//   $s: 0.8;
//   $y: 0.6em;
//   .shiled {
//     transform: scale($s) translateY(-$y) translateX(0.25em);
//   }
//   .hp {
//     transform: scale($s) translateY($y) translateX(0.25em);
//   }
// }
.wrapper {
  padding: 0;
  margin: 0;
  height: calc(100vh);
  width: 100%;
  position: relative;
}
header {
  height: var(--vxe-input-height-mini);
  width: 100%;
  display: flex;
  .select {
    &:hover {
      width: calc(100% - var(--vxe-input-height-mini));
    }
    transition: width 0.2s ease-in-out;
    width: 5.25em;
    z-index: 15;
    position: absolute;
    right: var(--vxe-input-height-mini);
    background-color: lighten(#151515, 0%);
  }
}
main {
  position: absolute;
  top: 0px;
  bottom: 0px;
  width: 100%;
}
.vxe-table {
  $text-color: rgba(#444, 0.5);
  text-shadow: 1px 1px 1px $text-color, -1px -1px 1px $text-color,
    1px -1px 1px $text-color, -1px 1px 1px $text-color;
}
.jobIcon {
  width: 2em;
  object-fit: cover;
  vertical-align: middle;
}
.status {
  position: relative;
  top: -0.4em;
  object-fit: cover;
}
.statusIcon {
  width: 1.6em;
  object-fit: cover;
  vertical-align: middle;
}
.status::before {
  content: attr(data-duration);
  // vertical-align: bottom;
  height: 1em;
  line-height: 1em;
  z-index: 1;
  position: absolute;
  text-align: center;
  left: 50%;
  bottom: -1.1em;
  transform: translateX(-50%) scale(0.725);
  transform-origin: top center;
  font-size: calc(var(--vxe-font-size-mini));
  font-family: emoji;
}
.status[data-sourcePov="true"]::before {
  color: aquamarine;
}

.physics {
  color: rgb(255, 100, 100);
}
.magic {
  color: rgb(100, 200, 255);
}
.darkness {
  color: rgb(255, 100, 255);
}

.unuseful {
  filter: grayscale(100%);
}
.half-useful {
  filter: grayscale(50%);
}
.useful {
  filter: grayscale(0%);
}

.lethal {
  // 红色下划线
  border-bottom: 1px dashed red;
}

.vxe-table--header-wrapper {
  background-color: #222;
  color: #fff;
}
.vxe-table--header-wrapper .vxe-header--column {
  color: #fff;
}
.vxe-context-menu--option-wrapper,
.vxe-table--context-menu-clild-wrapper {
  border: none;
}
.testLog {
  position: fixed;
  opacity: 0.8;
  right: 0;
  z-index: 10;
  transition: all 0.2s ease-in-out;
  bottom: 0;
  &:hover {
    opacity: 1;
  }
}
.YOU {
  font-weight: bolder;
  $color: rgba(3, 169, 244, 0.4);
  text-shadow: -1px 0 3px $color, 0 1px 3px $color, 1px 0 3px $color,
    0 -1px 3px $color;
}
.my-menus {
  background-color: #252525;
}
.my-menus .vxe-ctxmenu--link {
  width: 200px;
}
.my-menus .vxe-context-menu--link {
  padding-right: 0.2em;
}
.my-copy-item {
  font-weight: 700;
}
.my-clear-filter {
  font-style: oblique;
}
.amount {
  display: flex;
  justify-content: flex-end;
}
</style>
