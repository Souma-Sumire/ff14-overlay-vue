<script setup lang="ts">
import { toRaw, triggerRef, reactive, markRaw } from 'vue'
import type { Ref } from 'vue'
import type {
  CombatDataEvent,
  Encounter,
  Keigenn,
  KeySkillSnapshot,
  PerformanceType,
  RowVO,
  Status,
} from '@/types/keigennRecord2'
import type { Player } from '@/types/partyPlayer'
import { ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import { useDark } from '@vueuse/core'
import { useDev } from '@/composables/useDev'
import { useIndexedDB } from '@/composables/useIndexedDB'
import { getActionChinese } from '@/resources/actionChinese'
import { completeIcon, stackUrl } from '@/resources/status'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'
import { processAbilityLine, processFlags } from '@/utils/flags'
import { raidbuffs } from '@/resources/raidbuffs'
import { idToSrc, parseDynamicValue } from '@/utils/dynamicValue'

import {
  getKeigenn,
  universalVulnerableEnemy,
  universalVulnerableFriendly,
} from '@/utils/keigenn'
import Util from '@/utils/util'
import logDefinitions from '../../cactbot/resources/netlog_defs'
import NetRegexes from '../../cactbot/resources/netregexes'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'
import { ZoneInfo } from '@/resources/zoneInfo'
import { getCactbotLocaleMessage, useLang } from '@/composables/useLang'

const dev = useDev()
useLang()

const store = useKeigennRecord2Store()
const userOptions = store.userOptions
// 某些情况下OverlayPluginApi并不会立即被挂在到window上。用户上报，未复现。
store.checkIsBrowser()

const minimize = ref(userOptions.minimize)

const actionKey = computed(() => (userOptions.actionCN ? 'actionCN' : 'action'))

const loading = ref(false)

interface PlayerSP extends Player {
  timestamp: number
}

const povId = useStorage('keigenn-record-2-pov-id', '')
const partyLogList = useStorage('keigenn-record-2-party-list', [] as string[])
const entitiesMap = useStorage(
  'keigenn-record-2-job-map',
  {} as Record<string, { job: number; timestamp: number; name: string; level: number }>
)
const partyEventParty = useStorage(
  'keigenn-record-2-party-event-party',
  [] as PlayerSP[]
)
const rsvData = useStorage(
  'souma-keigenn-record-2-rsv-data',
  {} as Record<number, string>
)

const rawCache = {
  povId: toRaw(povId.value),
  partyLogList: toRaw(partyLogList.value),
  entitiesMap: toRaw(entitiesMap.value),
  partyEventParty: toRaw(partyEventParty.value),
  rsvData: toRaw(rsvData.value),
}

function syncToCache<K extends keyof typeof rawCache>(
  key: K,
  source: Ref<(typeof rawCache)[K]>
) {
  watch(
    source,
    (val) => {
      rawCache[key] = toRaw(val)
    },
    { flush: 'sync' }
  )
}

syncToCache('povId', povId)
syncToCache('partyLogList', partyLogList)
syncToCache('entitiesMap', entitiesMap)
syncToCache('partyEventParty', partyEventParty)
syncToCache('rsvData', rsvData)

let rowCounter = 0
const select = ref(0)
const data = shallowRef<Encounter[]>([
  {
    zoneName: '',
    duration: '00:00',
    table: shallowReactive([]),
    key: 'init',
    timestamp: -1,
  },
])
const regexes = {
  rsv: /^262\|(?<timestamp>[^|]*)\|[^|]*\|[^|]*\|_rsv_(?<id>\d+)_[^|]+\|(?<real>[^|]*)\|/i,
  ability: NetRegexes.ability(),
  statusEffectExplicit: NetRegexes.statusEffectExplicit(),
  gainsEffect: NetRegexes.gainsEffect(),
  losesEffect: NetRegexes.losesEffect(),
  death: NetRegexes.wasDefeated(),
  inCombat:
    /^260\|(?<timestamp>[^|]*)\|(?<inACTCombat>[^|]*)\|(?<inGameCombat>[^|]*)\|/,
  changeZone: NetRegexes.changeZone(),
  partyList:
    /^11\|(?<timestamp>[^|]*)\|(?<partyCount>\d*)\|(?<list>(?:\w{8}\|)*)\w{16}/,
  primaryPlayer: /^02\|(?<timestamp>[^|]*)\|(?<id>[^|]*)\|(?<name>[^|]*)/,
  addCombatant: NetRegexes.addedCombatant(),
  removingCombatant: NetRegexes.removingCombatant(),
  networkDoT: NetRegexes.networkDoT(),
} as const

const STORAGE_KEY = 'keigenn-record-2'
const combatTimeStamp: Ref<number> = ref(0)
const zoneName = useStorage('souma-keigenn-record-2-zone-name', '' as string)
const shieldData: Record<string, string> = {}
const statusData: {
  friendly: { [id: string]: { [effectId: string]: Status } }
  enemy: { [name: string]: { [effectId: string]: Status } }
} = {
  friendly: {},
  enemy: {},
}

const trackedSkills = raidbuffs.filter((v) => v.line === 1 || v.line === 2)
let cooldownTracker: Record<string, Record<number, number>> = {}

const db = useIndexedDB<Encounter>(STORAGE_KEY)


const skillMapCache = new Map<number, Map<number, (typeof trackedSkills)[0]>>()
function getSkillMapForLevel(level: number) {
  let map = skillMapCache.get(level)
  if (!map) {
    map = new Map()
    for (const skill of trackedSkills) {
      if (skill.minLevel > level) continue
      const id = parseDynamicValue(skill.id, level)
      map.set(id, skill)
    }
    skillMapCache.set(level, map)
  }
  return map
}

function beforeHandle() {
  loading.value = true
  combatTimeStamp.value = 0
  cooldownTracker = {}
  select.value = 0
  data.value.length = 0
  data.value.push({
    zoneName: '',
    duration: '00:00',
    table: shallowReactive([]),
    key: 'init',
    timestamp: -1,
  })
}

async function afterHandle() {
  loading.value = false

  // 如果有待处理的数据,手动触发批量插入
  if (batchTimer !== null) {
    cancelAnimationFrame(batchTimer)
    batchTimer = null
    if (pendingRows.length > 0) {
      data.value[0]!.table.unshift(...pendingRows.reverse())
      pendingRows = []
    }
  }

  await saveStorage()
  triggerRef(data)
}

function handleLine(line: string) {
  const type = line.substring(0, line.indexOf('|'))
  if (!type) return
  const splitLine = line.split('|')

  switch (type) {
    case '26': // GainsEffect
      {
        const match = regexes.gainsEffect.exec(line)
        if (!match) return
        const effectId = splitLine[logDefinitions.GainsEffect.fields.effectId]!
        const effect = splitLine[logDefinitions.GainsEffect.fields.effect]!
        const target = splitLine[logDefinitions.GainsEffect.fields.target]!
        const targetId = splitLine[logDefinitions.GainsEffect.fields.targetId]!
        const count = Number.parseInt(
          splitLine[logDefinitions.GainsEffect.fields.count]!,
          16
        )
        let keigenn: Keigenn | undefined = getKeigenn(effectId)
        if (!keigenn) {
          const vulnerable =
            (targetId.startsWith('1') &&
              universalVulnerableFriendly.get(
                Number.parseInt(effectId, 16).toString()
              )) ||
            (targetId.startsWith('4') &&
              universalVulnerableEnemy.get(
                Number.parseInt(effectId, 16).toString()
              ))
          if (!vulnerable) return
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
        const duration = splitLine[logDefinitions.GainsEffect.fields.duration]!
        const source = splitLine[logDefinitions.GainsEffect.fields.source]!
        const sourceId = splitLine[logDefinitions.GainsEffect.fields.sourceId]!
        const timestamp = new Date(
          splitLine[logDefinitions.GainsEffect.fields.timestamp]!
        ).getTime()
        const expirationTimestamp =
          timestamp + Number.parseFloat(duration) * 1000
        const status: Status = {
          name: keigenn.name,
          type: keigenn.type,
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
          isPov: rawCache.povId === sourceId,
        }
        if (targetId.startsWith('1') && keigenn.isFriendly) {
          if (statusData.friendly[targetId] === undefined)
            statusData.friendly[targetId] = {}
          statusData.friendly[targetId][effectId] = status
        } else if (targetId.startsWith('4') && !keigenn.isFriendly) {
          if (statusData.enemy[target] === undefined)
            statusData.enemy[target] = {}
          statusData.enemy[target][effectId] = status
        }
      }
      break

    case '30': // LosesEffect
      {
        const target = splitLine[logDefinitions.LosesEffect.fields.target]!
        const targetId = splitLine[logDefinitions.LosesEffect.fields.targetId]!
        const effectId = splitLine[logDefinitions.LosesEffect.fields.effectId]!
        if (targetId.startsWith('1')) {
          if (statusData.friendly[targetId])
            Reflect.deleteProperty(statusData.friendly[targetId], effectId)
        } else {
          if (statusData.enemy[target])
            Reflect.deleteProperty(statusData.enemy[target], effectId)
        }
      }
      break

    case '21':
    case '22': // Ability
      {
        if (combatTimeStamp.value === 0) return
        const sourceId = splitLine[logDefinitions.Ability.fields.sourceId] ?? '???'
        const id = splitLine[logDefinitions.Ability.fields.id] ?? '???'
        const timestamp = new Date(
          splitLine[logDefinitions.Ability.fields.timestamp] ?? '???'
        ).getTime()

        if (sourceId.startsWith('1')) {
          const abilityIdDecimal = Number.parseInt(id, 16)
          const level = rawCache.entitiesMap[sourceId]?.level ?? 999

          const skillMap = getSkillMapForLevel(level)
          const trackedSkill = skillMap.get(abilityIdDecimal)

          if (trackedSkill) {
            if (!cooldownTracker[sourceId]) {
              cooldownTracker[sourceId] = {}
            }
            cooldownTracker[sourceId][abilityIdDecimal] = timestamp
          }
        }

        const ability = processAbilityLine(splitLine)
        if (ability.isAttack && ability.amount >= 0) {
          const targetId = splitLine[logDefinitions.Ability.fields.targetId] ?? '???'
          if (!(sourceId.startsWith('4') && targetId.startsWith('1'))) return

          if (
            !(
              targetId === rawCache.povId ||
              rawCache.partyLogList.includes(targetId) ||
              rawCache.partyEventParty.find((v) => v.id === targetId)
            )
          ) {
            return
          }

          const rawAblityName = splitLine[logDefinitions.Ability.fields.ability]!
          const rsvMatch = rawAblityName.match(/^_rsv_(?<id>\d+)_/)
          let action = rawAblityName
          if (rsvMatch) {
            const id: number = Number(rsvMatch.groups?.id)
            action = (rawCache.rsvData[id] ??
              rawAblityName.match(/^_(?<id>rsv_\d+)_/)?.groups?.id)!
          } else {
            action = action.replace(/unknown_.*/, '攻击')
            if (
              userOptions.parseAA === false &&
              /^攻击|攻撃|[Aa]ttack$/.test(action)
            ) {
              return
            }
          }
          const cn = getActionChinese(Number.parseInt(id, 16))
          const actionCN = cn && cn !== '' ? cn : action
          const currentHp = Number(
            splitLine[logDefinitions.Ability.fields.targetCurrentHp]
          )
          const maxHp = Number(
            splitLine[logDefinitions.Ability.fields.targetMaxHp]
          )
          const source = splitLine[logDefinitions.Ability.fields.source] ?? '???'
          const target = splitLine[logDefinitions.Ability.fields.target] ?? '???'
          const { effect, type } = processFlags(ability.flags)
          const time =
            combatTimeStamp.value === 0 ? 0 : timestamp - combatTimeStamp.value
          const formattedTime = formatTime(time)

          // 使用缓存的职业信息
          const { jobEnum, job, jobIcon, hasDuplicate } = getCachedJobInfo(targetId)

          // 浅拷贝快照
          const keigenns = Object.values(statusData.friendly[targetId] ?? [])
            .concat(Object.values(statusData.enemy[source] ?? []))
            .map((v) => {
              const remain = Math.max(
                0,
                (v.expirationTimestamp - timestamp) / 1000
              )
              // 返回新对象，避免修改原始 statusData
              return {
                ...v,
                remainingDuration:
                  remain >= 999
                    ? ''
                    : remain.toFixed(remain > 0.05 && remain < 0.95 ? 1 : 0),
              }
            })
            .filter((v) => Number(v.remainingDuration) > -3)

          const shield = shieldData[targetId] ?? '0'
          const amount = ability.amount
          let reduction = 0
          // 即死、闪避
          if (effect !== 'instant death' && effect !== 'dodge') {
            let flagMultiplier = 1
            // 格挡20%
            if (effect === 'blocked damage') flagMultiplier = 0.8
            // 招架15%
            else if (effect === 'parried damage') flagMultiplier = 0.85

            let reductionMultiplier = 1
            for (const k of keigenns) {
              if (k.type !== 'absorbed') {
                reductionMultiplier *=
                  k.performance[type as keyof PerformanceType] ?? 1
              }
            }
            reduction = 1 - reductionMultiplier * flagMultiplier
          }

          addRow({
            key: (rowCounter++).toString(),
            time: formattedTime,
            timestamp,
            id,
            action,
            actionCN,
            source,
            target,
            targetId,
            job,
            jobIcon,
            jobEnum,
            hasDuplicate,
            amount,
            keigenns,
            currentHp,
            maxHp,
            effect,
            type,
            shield,
            povId: rawCache.povId,
            reduction,
            keySkills: getKeySkillSnapshot(timestamp),
          })
          data.value[0]!.duration = formatTime(
            new Date(
              splitLine[logDefinitions.Ability.fields.timestamp]!
            ).getTime() - combatTimeStamp.value
          )
        }
      }
      break

    case '25': // Death
      {
        const match = regexes.death.exec(line)
        if (!match || !match.groups) return
        const targetId = match.groups.targetId!
        const target = match.groups.target!
        const sourceId = match.groups.sourceId!
        const source = sourceId === 'E0000000' ? '地形杀' : match.groups.source!
        const rawTimestamp = match.groups.timestamp!

        if (combatTimeStamp.value === 0) return

        if (
          !(
            targetId === rawCache.povId ||
            rawCache.partyLogList.includes(targetId!) ||
            rawCache.partyEventParty.find((v) => v.id === targetId)
          )
        ) {
          return
        }

        const timestamp = new Date(rawTimestamp!).getTime()
        const time = timestamp - combatTimeStamp.value
        const formattedTime = formatTime(time)

        const { jobEnum, job, jobIcon, hasDuplicate } =
          getCachedJobInfo(targetId!)

        addRow({
          key: (rowCounter++).toString(),
          time: formattedTime,
          timestamp,
          id: undefined,
          action: 'Death',
          actionCN: '死亡',
          source: source,
          target: target,
          targetId: targetId,
          job,
          jobIcon,
          jobEnum,
          hasDuplicate,
          amount: 0,
          keigenns: [],
          currentHp: 0,
          maxHp: 0,
          effect: 'death',
          type: 'death',
          shield: '0',
          povId: rawCache.povId,
          reduction: 0,
          keySkills: getKeySkillSnapshot(timestamp),
        })
      }
      break

    case '34': // StatusEffectExplicit (Shields)
      {
        const match = regexes.statusEffectExplicit.exec(line)
        if (match && match.groups?.targetId!.startsWith('1')) {
          shieldData[match.groups!.targetId!] = match.groups!.currentShield!
        }
      }
      break

    case '260': // InCombat
      {
        const inACTCombat =
          splitLine[logDefinitions.InCombat.fields.inACTCombat] === '1'
        const inGameCombat =
          splitLine[logDefinitions.InCombat.fields.inGameCombat] === '1'
        const timeStamp = new Date(
          splitLine[logDefinitions.InCombat.fields.timestamp]!
        ).getTime()
        if (inACTCombat || inGameCombat) {
          const key = splitLine[logDefinitions.InCombat.fields.timestamp]!
          // new combat
          if (combatTimeStamp.value > 0) {
            return
          }
          if (data.value[0]!.table.length !== 0 || pendingRows.length !== 0) {
            if (batchTimer !== null) {
              cancelAnimationFrame(batchTimer)
              batchTimer = null
            }
            if (pendingRows.length > 0) {
              data.value[0]!.table.unshift(...pendingRows.reverse())
              pendingRows = []
            }
            data.value.unshift({
              zoneName: '',
              duration: '00:00',
              table: shallowReactive([]),
              key: key,
              timestamp: timeStamp,
            })
            triggerRef(data)
          }
          combatTimeStamp.value = timeStamp
          data.value[0]!.zoneName = zoneName.value
          data.value[0]!.timestamp = timeStamp
          data.value[0]!.key = key
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

    case '01': // ChangeZone
      {
        const zoneId = parseInt(
          splitLine[logDefinitions.ChangeZone.fields.id]!,
          16
        )
        zoneName.value = splitLine[logDefinitions.ChangeZone.fields.name]!
        if (ZoneInfo[zoneId]?.name) {
          const useLangZoneName = getCactbotLocaleMessage(
            ZoneInfo[zoneId]?.name
          )
          if (useLangZoneName && useLangZoneName !== 'Unknown')
            zoneName.value = useLangZoneName
        }
        stopCombat(
          new Date(
            splitLine[logDefinitions.ChangeZone.fields.timestamp]!
          ).getTime()
        )
      }
      break

    case '11': // PartyList
      {
        const match = regexes.partyList.exec(line)
        if (match) {
          partyLogList.value = (match.groups?.list?.split('|') ?? []).filter(
            Boolean
          )
        }
      }
      break

    case '02': // PrimaryPlayer
      {
        povId.value = splitLine[logDefinitions.ChangedPlayer.fields.id]
      }
      break

    case '03': // AddCombatant
      {
        if (splitLine[logDefinitions.AddedCombatant.fields.job] !== '00') {
          const job = splitLine[logDefinitions.AddedCombatant.fields.job]!
          const name = splitLine[logDefinitions.AddedCombatant.fields.name]!
          const timestamp = new Date(
            splitLine[logDefinitions.AddedCombatant.fields.timestamp]!
          ).getTime()
          const level = parseInt(
            splitLine[logDefinitions.AddedCombatant.fields.level]!,
            16
          )
          entitiesMap.value[
            splitLine[logDefinitions.AddedCombatant.fields.id]!
          ] = {
            job: Number.parseInt(job, 16),
            timestamp,
            name,
            level,
          }
        }
      }
      break

    case '04': // RemovingCombatant
      Reflect.deleteProperty(
        entitiesMap.value,
        splitLine[logDefinitions.RemovedCombatant.fields.id]!
      )
      Reflect.deleteProperty(statusData.friendly, splitLine[logDefinitions.RemovedCombatant.fields.id]!)
      Reflect.deleteProperty(statusData.enemy, splitLine[logDefinitions.RemovedCombatant.fields.id]!)
      break

    case '262': // RSV
      {
        const match = regexes.rsv.exec(line)
        if (match) {
          const id = Number(match.groups?.id as string)
          const real = splitLine[logDefinitions.RSVData.fields.value]
          if (id && real) rsvData.value[Number(id)] = real
        }
      }
      break

    case '37': // NetworkDoT
      if (!userOptions.parseDoT) return
      {
        const which = splitLine[logDefinitions.NetworkDoT.fields.which]!
        const targetId = splitLine[logDefinitions.NetworkDoT.fields.id]!
        if (
          which !== 'DoT' ||
          targetId.startsWith('4') ||
          !(
            targetId === rawCache.povId ||
            rawCache.partyLogList.includes(targetId) ||
            rawCache.partyEventParty.find((v) => v.id === targetId)
          )
        ) {
          return
        }

        const target = splitLine[logDefinitions.NetworkDoT.fields.name]!
        const damage = splitLine[logDefinitions.NetworkDoT.fields.damage]!
        const amount = Number.parseInt(damage, 16)
        const timestamp = new Date(
          splitLine[logDefinitions.Ability.fields.timestamp] ?? '???'
        ).getTime()
        const currentHp = Number(
          splitLine[logDefinitions.NetworkDoT.fields.currentHp]
        )
        const maxHp = Number(splitLine[logDefinitions.NetworkDoT.fields.maxHp])
        const time =
          combatTimeStamp.value === 0 ? 0 : timestamp - combatTimeStamp.value
        const formattedTime = formatTime(time)

        // 使用缓存的职业信息
        const { jobEnum, job, jobIcon, hasDuplicate } = getCachedJobInfo(targetId)

        // dot/hot日志的source不准确 故无法计算目标减
        addRow({
          key: (rowCounter++).toString(),
          time: formattedTime,
          timestamp,
          id: undefined,
          action: which,
          actionCN: which,
          source: '',
          target,
          targetId,
          job,
          jobIcon,
          jobEnum,
          hasDuplicate,
          amount,
          keigenns: [],
          currentHp,
          maxHp,
          effect: 'damage done',
          type: 'dot',
          shield: shieldData[targetId] ?? '0',
          povId: rawCache.povId,
          reduction: 0,
          keySkills: [],
        })
      }
      break
  }
}

// 职业信息缓存
import type { FFIcon } from '@/types/fflogs'

interface JobInfo {
  jobEnum: number
  job: string
  jobIcon: FFIcon
  hasDuplicate: boolean
}

const jobInfoCache = new Map<string, JobInfo>()

function invalidateJobCache() {
  jobInfoCache.clear()
}

function getJobById(targetId: string) {
  const fromJobMap = entitiesMap.value[targetId]
  const fromPartyEvent = partyEventParty.value.find(
    (v) => v.id === targetId
  ) ?? { job: 0, timestamp: 0 }
  const need =
    (fromJobMap?.timestamp ?? 0) > fromPartyEvent.timestamp
      ? fromJobMap
      : fromPartyEvent

  const hasDuplicate =
    need === fromJobMap
      ? Object.entries(entitiesMap.value).some(
        ([id, job]) =>
          id !== targetId &&
          job.job === need?.job &&
          partyLogList.value.includes(id)
      )
      : partyEventParty.value.some(
        (v) => v.id !== targetId && v.job === need?.job
      )
  return { job: need?.job ?? 0, hasDuplicate }
}

function getCachedJobInfo(targetId: string): JobInfo {
  // 检查缓存
  const cached = jobInfoCache.get(targetId)
  if (cached) {
    return cached
  }

  // 计算职业信息
  const { job: targetJob, hasDuplicate } = getJobById(targetId)
  const jobEnum = targetJob
  const job = Util.jobToFullName(Util.jobEnumToJob(jobEnum)).simple2
  const jobIcon = Util.jobEnumToIcon(jobEnum)

  const jobInfo: JobInfo = {
    jobEnum,
    job,
    jobIcon,
    hasDuplicate,
  }

  // 缓存结果
  jobInfoCache.set(targetId, jobInfo)

  return jobInfo
}

let pendingRows: RowVO[] = []
let batchTimer: number | null = null

function addRow(row: RowVO) {
  pendingRows.push(markRaw(row))
  if (batchTimer === null) {
    batchTimer = requestAnimationFrame(() => {
      data.value[0]!.table.unshift(...pendingRows.reverse())
      pendingRows = []
      batchTimer = null
    })
  }
}

function stopCombat(timeStamp: number) {
  if (combatTimeStamp.value === 0) return
  data.value[0]!.duration = formatTime(timeStamp - combatTimeStamp.value)
  data.value[0] = markRaw(data.value[0]!)
  combatTimeStamp.value = 0
  statusData.friendly = {}
  statusData.enemy = {}
  cooldownTracker = {}
  invalidateJobCache()
  saveStorage()
}

const snapshotPlayers = computed(() => {
  const candidateIds = new Set<string>()

  // 1. 实时小队
  partyEventParty.value.forEach((p) => candidateIds.add(p.id))
  // 2. 日志记录的小队
  partyLogList.value.forEach((id) => candidateIds.add(id))
  // 3. POV
  if (povId.value) candidateIds.add(povId.value)

  const players: { id: string; job: number; name: string; level: number }[] = []

  for (const id of candidateIds) {
    // 从 partyEventParty 找
    const p = partyEventParty.value.find((v) => v.id === id)
    if (p) {
      players.push({
        id: p.id,
        job: p.job,
        name: p.name,
        level: p.level,
      })
      continue
    }

    // 从 jobMap 找
    const info = entitiesMap.value[id]
    if (info) {
      players.push({
        id,
        job: info.job,
        name: info.name ?? 'Unknown',
        level: info.level,
      })
    }
  }

  const jobCounts = new Map<number, number>()
  players.forEach((p) => {
    jobCounts.set(p.job, (jobCounts.get(p.job) || 0) + 1)
  })

  return players.flatMap((player) => {
    const level = player.level || 999
    const hasDuplicate = (jobCounts.get(player.job) || 0) > 1

    return trackedSkills
      .filter((skill) => skill.job.includes(player.job) && skill.minLevel <= level)
      .map((skill) => {
        const id = parseDynamicValue(skill.id, level)
        const recast = parseDynamicValue(skill.recast1000ms, level)
        return {
          id,
          name: getActionChinese(id) || 'Unknown',
          icon: idToSrc(id),
          recast1000ms: recast,
          ownerId: player.id,
          ownerName: player.name,
          ownerJob: player.job,
          hasDuplicate,
        }
      })
  })
})

function getKeySkillSnapshot(
  timestamp: number
): KeySkillSnapshot[] {
  return snapshotPlayers.value.map((item) => {
    const lastUsed = cooldownTracker[item.ownerId]?.[item.id] ?? 0
    let ready = true
    let recastLeft = 0

    if (lastUsed > 0) {
      const diff = timestamp - lastUsed
      const recastMs = item.recast1000ms * 1000
      if (diff < recastMs) {
        ready = false
        recastLeft = Math.ceil((recastMs - diff) / 1000)
      }
    }

    return {
      ...item,
      recastLeft,
      ready,
    }
  })
}

async function saveStorage() {
  if (loading.value) {
    return
  }
  const validData = data.value
    .filter((v) => v.key !== 'init' && v.timestamp > 0)
    .map((v) => {
      const rawTable = Array.isArray(v.table) ? toRaw(v.table) : []
      return {
        ...toRaw(v),
        table: rawTable,
      }
    })
  await db.replaceAll(validData)
}

async function loadStorage() {
  select.value = 0
  try {
    const loadData = await db.getAll()
    if (loadData.length) {
      data.value.length = 0
      const result = loadData
        .filter((v) => v.timestamp > Date.now() - 1000 * 60 * 60 * 24 * 3)
        .sort((a, b) => a.timestamp - b.timestamp)
        .reverse()
        .map((v) => ({
          ...v,
          table: reactive(Array.isArray(v.table) ? [...v.table] : []),
        }))

      data.value.push(...result)

      if (data.value.length === 0) {
        data.value.push({
          zoneName: '',
          duration: '00:00',
          table: shallowReactive([]),
          key: 'init',
          timestamp: -1,
        })
      }
      triggerRef(data)
    }
  } catch (e) {
    console.error(e)
    data.value.length = 0
    throw e
  }
}

function formatTime(time: number) {
  const minute = Math.max(Math.floor(time / 60000), 0)
  const second = Math.max(Math.floor((time - minute * 60000) / 1000), 0)
  return `${minute < 10 ? '0' : ''}${minute}:${second < 10 ? '0' : ''}${second}`
}

onMounted(() => {
  const isDark = useDark({ storageKey: 'keigenn-record-2-theme' })
  const toggleDark = useToggle(isDark)
  if (isDark.value === false) {
    // 固定使用深色主题
    toggleDark()
  }
  for (const id in entitiesMap.value) {
    const element = entitiesMap.value[id]!
    if (Date.now() - element.timestamp > 1000 * 60 * 60 * 24 * 1)
      Reflect.deleteProperty(entitiesMap.value, id)
  }
  loadStorage()

  addOverlayListener('LogLine', (e) => {
    handleLine(e.rawLine)
  })
  addOverlayListener('PartyChanged', (e) => {
    partyEventParty.value = e.party.map((v) => ({
      ...v,
      timestamp: Date.now(),
    }))
  })
  addOverlayListener('ChangePrimaryPlayer', (e) => {
    povId.value = Number(e.charID).toString(16).toUpperCase()
  })
  addOverlayListener('CombatData', ((e: CombatDataEvent) => {
    if (combatTimeStamp.value > 0) return
    if (e.isActive === 'true') {
      if (e.Encounter?.CurrentZoneName) {
        zoneName.value = e.Encounter.CurrentZoneName
      }

      const durationStr = e.Encounter?.duration || '00:00'
      const parts = durationStr.split(':').map(Number)
      let durationMs = 0
      if (parts.length === 3) {
        durationMs = (parts[0]! * 3600 + parts[1]! * 60 + parts[2]!) * 1000
      } else if (parts.length === 2) {
        durationMs = (parts[0]! * 60 + parts[1]!) * 1000
      }

      const now = Date.now()
      const startTime = now - durationMs

      if (data.value[0]!.table.length !== 0) {
        data.value.unshift({
          zoneName: '',
          duration: '00:00',
          table: shallowReactive([]),
          key: String(startTime),
          timestamp: startTime,
        })
        triggerRef(data)
      }

      data.value[0]!.zoneName = zoneName.value
      combatTimeStamp.value = startTime
      data.value[0]!.timestamp = startTime
      data.value[0]!.key = String(startTime)
      select.value = 0
    }
  }) as any)
})

function clickMinimize() {
  minimize.value = !minimize.value
}

function test() {
  data.value.unshift({
    zoneName: '',
    duration: '00:00',
    table: shallowReactive([]),
    key: 'test',
    timestamp: Date.now(),
  })
  triggerRef(data)
  select.value = 0
  // const last = data.value[0]!.table[0]!
  // const d = { ...last, key: crypto.randomUUID() }
  // data.value[0]!.table.unshift(d)
}

function formatTimestamp(ms: number): string {
  const date = new Date(ms)

  const h = date.getHours().toString().padStart(2, '0')
  const mm = date.getMinutes().toString().padStart(2, '0')
  const ss = date.getSeconds().toString().padStart(2, '0')

  return `${h}:${mm}:${ss}`
}
</script>

<template>
  <div class="wrapper" :style="{ '--scale': userOptions.scale, '--opacity': userOptions.opacity }" @contextmenu.prevent>
    <header>
      <div class="header-select">
        <el-select v-show="!minimize" v-model="select" size="small" class="combat-select"
          :class="store.isBrowser ? 'browser' : 'act'" popper-class="combat-select-popup" :offset="0"
          :show-arrow="false">
          <el-option v-for="i in data.length" :key="`${data[i - 1]!.key}-${data[i - 1]!.duration}-${data[i - 1]!.zoneName
            }`" :value="i - 1"
            :label="`${data[i - 1]!.zoneName}${data[i - 1]!.zoneName === '' ? '' : ` - [${data[i - 1]!.duration}] ${formatTimestamp(data[i - 1]!.timestamp)}`}`" />
        </el-select>
      </div>
      <el-button v-if="!store.isBrowser" class="minimize" :class="minimize ? 'in-minimize' : 'not-minimize'"
        :icon="minimize ? ZoomIn : ZoomOut" circle :style="{ opacity: minimize ? 0.5 : 1 }" @click="clickMinimize" />
    </header>
    <main v-show="!minimize" style="height: 100%">
      <KeigennRecord2Table :rows="data[select]!.table" :action-key="actionKey" />
    </main>
  </div>
  <div v-if="store.isBrowser || dev" class="testLog">
    <el-button v-if="dev" @click="test"> 测试 </el-button>
    <CommonTestLog m-1 @before-handle="beforeHandle" @after-handle="afterHandle" @handle-line="handleLine" />
  </div>
</template>

<style lang="scss" scoped>
:global(body) {
  background: transparent;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

* {
  user-select: none;
}

// 限制对 Element Plus 内部样式的修改，使用 :deep
:deep(.el-select__suffix) {
  position: relative;
  width: 0px;
  right: 15px;
}

.combat-select :deep(.el-select__suffix) {
  width: 14px;
  right: 7px;
}

:deep(.col-target-select .el-select__placeholder) {
  overflow: hidden;
  text-overflow: clip;
  width: 2em;
}

img[src=''],
img:not([src]) {
  &::after {
    content: attr(data-job);
  }
}

header {
  width: 100%;
  display: flex;
}

main {
  position: absolute;
  top: 0px;
  bottom: 0px;
  width: 100%;
}

.wrapper {
  zoom: var(--scale, 1);
  padding: 0;
  margin: 0;
  height: 100vh;
  width: 100%;
  position: relative;
}

.minimize {
  padding: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  margin-left: auto !important;
  margin-right: 0 !important;
  border: none !important;
  width: 22px !important;
  height: 22px !important;
  z-index: 13;

  i {
    margin: auto !important;
  }
}

.not-minimize {
  background-color: rgba(20, 20, 20, 0.4);
}

.in-minimize {
  background-color: rgba(20, 20, 20, 1);
}

/* ===== Element Plus 穿透样式 ===== */
:deep(.el-table-v2__main) {
  background-color: rgba(20, 20, 20, var(--opacity));
  border-radius: 6px;
}

:deep(.el-select-dropdown__list) {
  padding: 0;
}

:deep(.el-select-dropdown__item) {
  padding: 0 0.5em;
}

:deep(.header-filter) {
  position: fixed;
}

:deep(.el-table-v2__row-cell) {
  padding: 0 2px;
}

:deep(.el-table-v2__row) {
  cursor: pointer;
}

:deep(.col-action) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 28px;
}

:deep(.el-select__wrapper) {
  box-shadow: none !important;
}

:deep(.el-select__placeholder) {
  color: var(--el-color-primary) !important;
}

:deep(.el-select__placeholder.is-transparent) {
  color: unset !important;
}

/* ===== 战斗记录选择器 ===== */
.combat-select {
  height: 21px;
  position: absolute;
  top: 1px;
  z-index: 15;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(200, 200, 200, 0.2);
}

.combat-select.act {
  width: 24px;
  right: 26px;
  background-color: rgba(20, 20, 20, 0.4);
}

.combat-select.browser {
  width: 20em;
  right: 2px;
}

:deep(.combat-select-popup) {
  left: 0 !important;
}

.testLog {
  position: fixed;
  opacity: 0.8;
  right: 0;
  bottom: 0;
  z-index: 10;
  transition: all 0.2s ease-in-out;

  &:hover {
    opacity: 1;
  }
}
</style>

<style lang="scss">
@use '@/styles/compact-select.scss';
</style>