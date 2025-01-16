<script setup lang="ts">
import type { Encounter, Keigenn, RowVO, Status } from '@/types/keigennRecord2'
import type { Player } from '@/types/partyPlayer'
import type { Ref } from 'vue'
import { getActionChinese } from '@/resources/actionChinese'
import { completeIcon, stackUrl } from '@/resources/status'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'
import { deepClone } from '@/utils/deepClone'
import {
  processAbilityLine,
  processFlags,
  translationFlags,
} from '@/utils/flags'
import {
  getKeigenn,
  universalVulnerableEnemy,
  universalVulnerableFriendly,
} from '@/utils/keigenn'
import Util from '@/utils/util'
import {
  type VxeTableEvents,
  type VxeTableInstance,
  type VxeTablePropTypes,
  VxeUI,
} from 'vxe-table'
import logDefinitions from '../../cactbot/resources/netlog_defs'
import NetRegexes from '../../cactbot/resources/netregexes'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

VxeUI.setTheme('dark')

const store = useKeigennRecord2Store()
const userOptions = store.userOptions
// 某些情况下OverlayPluginApi并不会立即被挂在到window上。用户上报，未复现。
store.recheckIsDev()

const actionKey = computed(() =>
  userOptions.actionCN ? 'actionCN' : 'action',
)
const minimize = ref(userOptions.minimize)

const size = {
  line_height: 28 * userOptions.scale,
  time: 35 * userOptions.scale,
  action: 65 * userOptions.scale,
  target:
    ((userOptions.showIcon ? 24 : 0)
      + (userOptions.showName
        ? userOptions.anonymous
        || (!userOptions.anonymous && userOptions.abbrId)
          ? 24
          : 36
        : 0)
      + 7)
    * userOptions.scale,
  amount: 44 * userOptions.scale,
}

const style = {
  '--vxe-font-size-mini': `${12 * userOptions.scale}px`,
  '--vxe-ui-row-line-height': `${30 * userOptions.scale}px`,
  '--vxe-ui-row-height-mini': `${30 * userOptions.scale}px`,
  '--vxe-input-height-mini': `${20 * userOptions.scale}px`,
  '--vxe-select-option-height-mini': `${24 * userOptions.scale}px`,
  '--vxe-ui-layout-background-color': `rgba(12, 12, 12, ${userOptions.opacity})`,
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
const povName = useStorage('keigenn-record-2-pov-name', '')
const povId = useStorage('keigenn-record-2-pov-id', '')
const partyLogList = useStorage('keigenn-record-2-party-list', [] as string[])
const jobMap = useStorage(
  'keigenn-record-2-job-map',
  {} as Record<string, { job: number, timestamp: number }>,
)
const partyEventParty = useStorage(
  'keigenn-record-2-party-event-party',
  [] as PlayerSP[],
)
const select = ref(0)
const data = ref<Encounter[]>([
  { zoneName: '', duration: '00:00', table: [], key: 'init' },
])
const regexes: Record<string, RegExp> = {
  rsv: /^262\|(?<timestamp>[^|]*)\|[^|]*\|[^|]*\|_rsv_(?<id>\d+)_[^|]+\|(?<real>[^|]*)\|/i,
  ability: NetRegexes.ability(),
  statusEffectExplicit: NetRegexes.statusEffectExplicit(),
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
  networkDoT: NetRegexes.networkDoT(),
}

const STORAGE_KEY = 'souma-keigenn-record-2'
const combatTimeStamp: Ref<number> = ref(0)
const zoneName = useStorage('souma-keigenn-record-2-zone-name', '' as string)
const rsvData = useStorage(
  'souma-keigenn-record-2-rsv-data',
  {} as Record<number, string>,
)
const shieldData: Record<string, string> = {}
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

function handleLine(line: string) {
  for (const regexName in regexes) {
    const regex = regexes[regexName]
    const match = regex.exec(line)
    if (match) {
      const splitLine = line.split('|')
      switch (regexName) {
        case 'statusEffectExplicit':
          if (match.groups?.targetId.startsWith('1'))
            shieldData[match.groups?.targetId] = match.groups?.currentShield

          break
        case 'gainsEffect':
          {
            const effectId
              = splitLine[logDefinitions.GainsEffect.fields.effectId]
            const effect = splitLine[logDefinitions.GainsEffect.fields.effect]
            const target = splitLine[logDefinitions.GainsEffect.fields.target]
            const targetId
              = splitLine[logDefinitions.GainsEffect.fields.targetId]
            const count = Number.parseInt(
              splitLine[logDefinitions.GainsEffect.fields.count],
              16,
            )
            let keigenn: Keigenn | undefined = getKeigenn(effectId)
            if (!keigenn) {
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
              keigenn = {
                type: 'multiplier',
                performance: { physics: 1, magic: 1, darkness: 1 },
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
            const expirationTimestamp
              = timestamp + Number.parseFloat(duration) * 1000
            const status: Status = {
              name: keigenn.name,
              count,
              effect,
              effectId,
              source,
              sourceId,
              target,
              targetId,
              expirationTimestamp,
              performance: keigenn.performance,
              fullIcon: keigenn.fullIcon,
              isPov: povId.value === sourceId,
            }
            if (targetId.startsWith('1') && keigenn.isFriendly) {
              if (statusData.friendly[targetId] === undefined)
                statusData.friendly[targetId] = {}

              statusData.friendly[targetId][effectId] = status
            }
            else if (targetId.startsWith('4') && !keigenn.isFriendly) {
              if (statusData.enemy[target] === undefined)
                statusData.enemy[target] = {}

              statusData.enemy[target][effectId] = status
            }
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
        case 'primaryPlayer': {
          povId.value = splitLine[logDefinitions.ChangedPlayer.fields.id]
          const _povName = splitLine[logDefinitions.ChangedPlayer.fields.name]
          if (povName.value === _povName)
            return
          povName.value = _povName
          store.initEnvironment(
            splitLine[logDefinitions.ChangedPlayer.fields.name],
          )
          break
        }
        case 'partyList':
          partyLogList.value = match.groups?.list?.split('|') ?? []
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
              if (data.value[0].key === 'placeholder') {
                data.value.splice(0, 1)
              }
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
            const id = Number(match.groups?.id as string)
            const real = splitLine[logDefinitions.RSVData.fields.value]
            rsvData.value[Number(id)] = real
          }
          break
        case 'networkDoT':
          if (!userOptions.parseDoT)
            return
          {
            const which = splitLine[logDefinitions.NetworkDoT.fields.which]
            const targetId = splitLine[logDefinitions.NetworkDoT.fields.id]
            if (
              which !== 'DoT'
              || targetId.startsWith('4')
              || !(
                targetId === povId.value
                || partyLogList.value.includes(targetId)
                || partyEventParty.value.find(v => v.id === targetId)
              )
            ) {
              return
            }

            const target = splitLine[logDefinitions.NetworkDoT.fields.name]
            const damage = splitLine[logDefinitions.NetworkDoT.fields.damage]
            const amount = Number.parseInt(damage, 16)
            const timestamp = new Date(
              splitLine[logDefinitions.Ability.fields.timestamp] ?? '???',
            ).getTime()
            const currentHp = Number(
              splitLine[logDefinitions.NetworkDoT.fields.currentHp],
            )
            const maxHp = Number(
              splitLine[logDefinitions.NetworkDoT.fields.maxHp],
            )
            const time
              = combatTimeStamp.value === 0
                ? 0
                : timestamp - combatTimeStamp.value
            const formattedTime = formatTime(time)
            const targetJob = getJobById(targetId)
            // const targetJob = jobMap.value[targetId].job ?? target.substring(0, 2);
            const job = Util.nameToFullName(
              Util.jobEnumToJob(targetJob),
            ).simple2
            const jobEnum = targetJob
            const jobIcon = Util.jobEnumToIcon(jobEnum).toLowerCase()
            // dot/hot日志的source不准确 故无法计算目标减
            addRow({
              timestamp,
              time: formattedTime,
              id: undefined,
              action: which,
              actionCN: which,
              source: '',
              target,
              targetId,
              job,
              jobIcon,
              jobEnum,
              amount,
              keigenns: [],
              currentHp,
              maxHp,
              effect: 'damage done',
              type: 'dot',
              shield: shieldData[targetId],
              povId: povId.value,
            })
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
              if (!(sourceId.startsWith('4') && targetId.startsWith('1')))
                return

              if (
                !(
                  targetId === povId.value
                  || partyLogList.value.includes(targetId)
                  || partyEventParty.value.find(v => v.id === targetId)
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
                const id: number = Number(rsvMatch.groups?.id)
                action
                  = rsvData.value[id]
                    ?? rawAblityName.match(/^_(?<id>rsv_\d+)_/)?.groups?.id
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
              const { effect, type } = processFlags(ability.flags)
              const time
                = combatTimeStamp.value === 0
                  ? 0
                  : timestamp - combatTimeStamp.value
              const formattedTime = formatTime(time)
              const targetJob = getJobById(targetId)
              // const targetJob = jobMap.value[targetId].job ?? target.substring(0, 2);
              const job = Util.nameToFullName(
                Util.jobEnumToJob(targetJob),
              ).simple2
              const jobEnum = targetJob
              const jobIcon = Util.jobEnumToIcon(jobEnum).toLowerCase()
              const keigenns = deepClone(
                Object.values(statusData.friendly[targetId] ?? [])
                  .concat(Object.values(statusData.enemy[source] ?? []))
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
              addRow({
                timestamp,
                time: formattedTime,
                id,
                action,
                actionCN,
                source,
                target,
                targetId,
                job,
                jobIcon,
                jobEnum,
                amount: ability.amount,
                keigenns,
                currentHp,
                maxHp,
                effect,
                type,
                shield: shieldData[match.groups?.targetId ?? ''],
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
  return `${minute < 10 ? '0' : ''}${minute}:${second < 10 ? '0' : ''
  }${second}`
}

const actionOptions = computed(() => {
  const result = new Set(
    data.value[select.value].table.map(v =>
      userOptions.actionCN ? v.actionCN : v.action,
    ),
  )
  return Array.from(result).map(v => ({ label: v, value: v }))
})

const targetOptions = computed(() => {
  const targetToJob: Record<string, string> = {}
  const result = new Set(
    data.value[select.value].table
      .slice()
      .sort((a, b) => Util.enumSortMethod(a.jobEnum, b.jobEnum))
      .map((item) => {
        targetToJob[item.target] = item.job
        return item.target
      }),
  )
  return Array.from(result).map(item => ({
    label: `${targetToJob[item]}（${item}）`,
    value: item,
  }))
})

if (store.isBrowser)
  povName.value = '测试用户'

if (povName.value !== '')
  store.initEnvironment(povName.value)

onMounted(() => {
  for (const id in jobMap.value) {
    const element = jobMap.value[id]
    if (Date.now() - element.timestamp > 1000 * 60 * 60 * 24 * 1)
      Reflect.deleteProperty(jobMap.value, id)
  }
  loadStorage()
  if (!store.isBrowser && data.value[0].key !== 'placeholder') {
    data.value.unshift({ duration: '00:00', table: [], zoneName: '', key: 'placeholder' })
  }
  addOverlayListener('LogLine', (e) => {
    handleLine(e.rawLine)
  })
  addOverlayListener('PartyChanged', (e) => {
    partyEventParty.value = e.party.map(v => ({
      ...v,
      timestamp: Date.now(),
    }))
  })
  addOverlayListener('ChangePrimaryPlayer', (e) => {
    povName.value = e.charName
    povId.value = Number(e.charID).toString(16).toUpperCase()
  })
  // startOverlayEvents();
})

function doCopy(row: RowVO) {
  const {
    // action,
    actionCN,
    amount,
    job,
    keigenns,
    // source,
    // target,
    time,
    type,
  } = row
  const sp
    = row.effect === 'damage done' ? '' : `,${translationFlags(row.effect)}`
  const result = `${time} ${job} ${actionCN} ${amount.toLocaleString()}(${translationFlags(type)}) 减伤:${keigenns.length === 0 && sp === ''
    ? '无'
    : keigenns
      .map(k => (userOptions.statusCN ? k.name : k.effect))
      .join(',') + sp
  } HP:${row.currentHp}/${row.maxHp
  }(${Math.round((row.currentHp / row.maxHp) * 100)}%)+盾:${Math.round(
    (row.maxHp * +row.shield) / 100,
  )}(${row.shield}%)`
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
  VxeUI.modal.message({ content: '已复制到剪贴板', status: 'success' })
}

const focusing = ref({ target: false, action: false })
const focusRow: Ref<RowVO | undefined> = ref()

const menuConfig = reactive<VxeTablePropTypes.MenuConfig<RowVO>>({
  className: 'my-menus',
  body: {
    options: [],
  },
})

watchEffect(() => {
  if (menuConfig.body?.options && xTable.value) {
    menuConfig.body.options[0] = [
      {
        code: 'copy',
        name: '复制详情',
        prefixIcon: 'vxe-icon-copy',
        className: 'my-copy-item',
      },
      {
        code: 'clearFilterAction',
        name: '取消技能筛选',
        prefixIcon: 'vxe-icon-funnel-clear',
        className: 'my-clear-filter',
        visible: focusing.value.action,
        disabled: false,
      },
      {
        code: 'filterSelectAction',
        name: focusRow.value?.[actionKey.value]
          ? `只看 ${focusRow.value?.[actionKey.value]}`
          : '只看该技能',
        prefixIcon: 'vxe-icon-info-circle',
        visible: !focusing.value.action,
        disabled: false,
      },
      {
        code: 'clearFilterTarget',
        name: '取消玩家筛选',
        prefixIcon: 'vxe-icon-funnel-clear',
        visible: focusing.value.target,
        disabled: false,
      },
      {
        code: 'filterSelectTarget',
        name: focusRow.value?.target
          ? `只看[${focusRow.value.job}] ${focusRow.value.target}`
          : '只看该玩家',
        prefixIcon: 'vxe-icon-user-fill',
        visible: !focusing.value.target,
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
        VxeUI.modal.message({
          content: '未选中有效数据行',
          status: 'error',
        })
        return
      }
      doCopy(row)
      break
    case 'clearFilterTarget':
      if ($table) {
        $table.clearFilter($table.getColumnByField('target'))
        focusing.value.target = false
      }
      break
    case 'clearFilterAction':
      if ($table) {
        $table.clearFilter($table.getColumnByField(actionKey.value))
        focusing.value.action = false
      }
      break
    case 'filterSelectTarget':
      if ($table) {
        const col = $table.getColumnByField('target')
        if (col) {
          const option = col.filters.find(v => v.value === row.target)
          if (!option)
            return
          option.checked = true
          $table.updateData().then(() => {
            $table.scrollToRow(row)
            focusing.value.target = true
          })
        }
      }
      break
    case 'filterSelectAction':
      if ($table) {
        const col = $table.getColumnByField(actionKey.value)
        if (col) {
          const option = col.filters.find(
            v => v.value === row[actionKey.value],
          )
          if (!option)
            return

          option.checked = true
          $table.updateData().then(() => {
            $table.scrollToRow(row)
            focusing.value.action = true
          })
        }
      }
      break
    default:
      break
  }
}

const test = {
  clearData: () => {
    select.value = 0
    data.value.length = 0
    data.value.push({
      key: Date.now().toString(),
      zoneName: '测试地区',
      duration: '00:00',
      table: [],
    })
    combatTimeStamp.value = 0
    statusData.friendly = {}
    statusData.enemy = {}
    saveStorage()
  },
  fakeData: () => {
    data.value[0].table.push({
      timestamp: 10000,
      time: data.value[0].table.length.toString(),
      id: undefined,
      action: '测试动作',
      actionCN: '测试动作',
      source: '测试敌人',
      target: povName.value,
      targetId: '1234567890',
      job: '战士',
      jobIcon: 'warrior',
      jobEnum: 0,
      amount: 1000,
      keigenns: [
        {
          name: '整体盾',
          count: 0,
          effect: '整体盾',
          effectId: 'D25',
          source: '芸豆角包子',
          sourceId: '1011A008',
          target: '芸豆角包子',
          targetId: '1011A008',
          expirationTimestamp: 1712757148883,
          performance: {
            physics: 1,
            magic: 1,
            darkness: 1,
          },
          fullIcon: '012000/012972',
          isPov: false,
          remainingDuration: '14',
        },
        {
          name: '整体论',
          count: 0,
          effect: '整体论',
          effectId: 'BBB',
          source: '芸豆角包子',
          sourceId: '1011A008',
          target: '芸豆角包子',
          targetId: '1011A008',
          expirationTimestamp: 1712757138883,
          performance: {
            physics: 1,
            magic: 1,
            darkness: 1,
          },
          fullIcon: '012000/012971',
          isPov: false,
          remainingDuration: '4',
        },
        {
          name: '均衡预后',
          count: 0,
          effect: '均衡预后',
          effectId: 'A31',
          source: '芸豆角包子',
          sourceId: '1011A008',
          target: '芸豆角包子',
          targetId: '1011A008',
          expirationTimestamp: 1712757153915,
          performance: {
            physics: 1,
            magic: 1,
            darkness: 1,
          },
          fullIcon: '012000/012954',
          isPov: false,
          remainingDuration: '19',
        },
      ],
      currentHp: 1000,
      maxHp: 1000,
      effect: 'damage done',
      type: 'magic',
      shield: '0',
      povId: povId.value,
    })
    saveStorage()
  },
  fakeLogDamage: () => {
    combatTimeStamp.value = Date.now()
    handleLine(
      `21|${new Date()}|4000044A|万魔殿|829A|尖脚|${povId.value}|${povName.value
      }|720203|B0F10000|9F0E|8200000|1B|829A8000|0|0|0|0|0|0|0|0|0|0|155065|155065|10000|10000|||94.62|98.28|0.00|-3.13|44|44|0|10000|||92.00|100.00|0.00|0.00|000010B3|0|1|fd5fa47ff773c3ca`,
    )
  },
  fakeLogStatus: () => {
    handleLine(
      `26|${new Date()}|59|复仇|15.00|${povId.value}|${povName.value}|${povId.value
      }|${povName.value}|64|129221|129221|b6388ee76760c33b`,
    )
  },
}
</script>

<template>
  <div class="wrapper" :style="style" :class="store.isBrowser ? 'is-browser' : 'not-browser'">
    <header v-if="userOptions.showHeader">
      <vxe-select v-show="!minimize" v-model="select" size="mini" class="select">
        <vxe-option
          v-for="i in data.length" :key="`${data[i - 1].key}-${data[i - 1].duration}-${data[i - 1].zoneName
          }`" :value="i - 1" :label="`${data[i - 1].duration} ${data[i - 1].zoneName}`"
        />
      </vxe-select>
      <vxe-button
        class="minimize" :class="minimize ? 'in-minimize' : 'not-minimize'"
        :icon="minimize ? 'vxe-icon-fullscreen' : 'vxe-icon-minimize'" :style="{ opacity: minimize ? 0.5 : 1 }"
        @click="clickMinimize"
      />
    </header>
    <main v-show="!minimize">
      <vxe-table
        ref="xTable" size="mini" class="vxe-table" show-overflow="tooltip" round height="100%"
        :scroll-y="{ enabled: true }" :loading="loading" :show-header="userOptions.showHeader"
        :data="data[select].table" :row-config="{ isHover: true, height: size.line_height }" :header-cell-style="{
          padding: '0px',
        }" :menu-config="menuConfig" @cell-menu="cellContextMenuEvent" @menu-click="contextMenuClickEvent"
      >
        <vxe-column :width="size.time" field="time" title="时间" align="center" />
        <vxe-column
          :width="size.action" :field="userOptions.actionCN ? 'actionCN' : 'action'" title="技能"
          :filters="actionOptions" :filter-multiple="false" :resizable="false" align="center"
        />
        <vxe-column
          :width="size.target" field="target" title="目标" :filters="targetOptions" :filter-multiple="false"
          :resizable="!userOptions.anonymous && !userOptions.abbrId" align="left" header-align="center"
          :header-class-name="userOptions.showName ? 'target-name-column-full' : 'target-name-column-abbr'"
        >
          <template #default="{ row }">
            <KeigennRecord2Target :row="row" />
          </template>
        </vxe-column>
        <vxe-column :width="size.amount" title="伤害" header-align="center">
          <template #default="{ row }">
            <KeigennRecord2Amount :row="row" />
          </template>
        </vxe-column>
        <vxe-column title="减伤" align="left">
          <template #default="{ row }">
            <KeigennRecord2StatusShow :row="row" />
          </template>
        </vxe-column>
      </vxe-table>
    </main>
  </div>
  <div v-if="store.isBrowser" class="testLog">
    <div v-if="false" class="test-buttons">
      <vxe-button class="test-button" type="primary" @click="test.clearData">
        清空
      </vxe-button>
      <vxe-button class="test-button" type="primary" @click="test.fakeData">
        假条目
      </vxe-button>
      <vxe-button class="test-button" type="primary" @click="test.fakeLogDamage">
        假伤害
      </vxe-button>
      <vxe-button class="test-button" type="primary" @click="test.fakeLogStatus">
        假状态
      </vxe-button>
    </div>
    <TestLog m-1 @before-handle="beforeHandle" @after-handle="afterHandle" @handle-line="handleLine" />
  </div>
</template>

<style lang="scss">
@use "vxe-table/styles/index.scss";

.vxe-header--column {
  line-height: 1.75em !important;

  .vxe-cell {
    white-space: nowrap !important;
  }
}

body,
html {
  background: transparent;
  padding: 0;
  margin: 0;
  overflow: hidden;
  --vxe-ui-input-height-mini: 20px;
  --vxe-ui-table-header-background-color: rgba(12, 12, 12, 0);
  --vxe-ui-table-header-font-color: #ddd;
  --vxe-ui-base-border-radius: 0;
}

* {
  user-select: none;
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
  overflow: visible !important;
}

.minimize {
  padding: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  margin-left: auto !important;
  margin-right: 0 !important;
  border: none !important;
  width: 20px !important;
  height: 20px !important;
  z-index: 13;

  i {
    margin: auto !important;
  }
}

.not-minimize {
  background-color: transparent;
  ;
}

.vxe-select-option {
  max-width: calc(100% - 2px) !important;
}

.vxe-ui--filter-wrapper:not(.is--multiple) {
  text-align: left !important;
}

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
  font-size: var(--vxe-font-size-mini) !important;
  padding: 0.5em !important;
  white-space: nowrap;

  &>div[role="title"] {
    font-size: calc(var(--vxe-font-size-mini) * 1.2) !important;
    font-weight: bold;
    margin-bottom: 0.2em !important;
  }
}

.target {
  display: flex;
  flex-direction: row;
  align-items: center;
}

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
    transition: width 0.15s ease-in-out;
    width: 4.75em;
    z-index: 15;
    position: absolute;
    right: var(--vxe-input-height-mini);

    &:hover {
      background-color: #151515;
      width: calc(100% - var(--vxe-input-height-mini));
    }
  }
}

.vxe-input--suffix {
  width: 0.85em;
  transform: translateX(-0.5em);
}

main {
  position: absolute;
  top: 0px;
  bottom: 0px;
  width: 100%;
  --vxe-ui-font-color: rgb(219, 224, 230);
}

.vxe-context-menu--link {
  --vxe-ui-font-color: rgb(219, 224, 230);
}

// .vxe-table {
// $text-color: rgba(#444, 0.5);
// text-shadow: 1px 1px 2px $text-color, -1px -1px 2px $text-color,    1px -1px 2px $text-color, -1px 1px 2px $text-color;
// }

.vxe-table--body {
  --vxe-ui-layout-background-color: transparent;
}

.jobIcon {
  width: 2em;
  object-fit: cover;
  vertical-align: middle;
}

.status {
  position: relative;
  top: -0.2em;
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
  bottom: -1.15em;
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

.vxe-ui--header-wrapper {
  background-color: #222;
  color: #fff;
}

.vxe-ui--header-wrapper .vxe-header--column {
  color: #fff;
}

.vxe-context-menu--option-wrapper,
.vxe-ui--context-menu-clild-wrapper {
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
  overflow: hidden;
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

.target-name-column-abbr {
  transform: translateX(-0.75em);
}

.is-browser {
  background-color: #fff;
}
</style>
