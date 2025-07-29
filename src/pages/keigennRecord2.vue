<script setup lang="ts">
import type { Ref } from 'vue'
import type { Encounter, Keigenn, RowVO, Status } from '@/types/keigennRecord2'
import type { Player } from '@/types/partyPlayer'
import { ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import { useDark } from '@vueuse/core'
import { useDevMode } from '@/composables/useDevMode'
import { getActionChinese } from '@/resources/actionChinese'
import { completeIcon, stackUrl } from '@/resources/status'
import { useKeigennRecord2Store } from '@/store/keigennRecord2'
import { deepClone } from '@/utils/deepClone'
import { processAbilityLine, processFlags } from '@/utils/flags'

import {
  getKeigenn,
  universalVulnerableEnemy,
  universalVulnerableFriendly,
} from '@/utils/keigenn'
import Util from '@/utils/util'
import logDefinitions from '../../cactbot/resources/netlog_defs'
import NetRegexes from '../../cactbot/resources/netregexes'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

const dev = useDevMode()

const store = useKeigennRecord2Store()
const userOptions = store.userOptions
// 某些情况下OverlayPluginApi并不会立即被挂在到window上。用户上报，未复现。
store.checkIsBrowser()

const minimize = ref(userOptions.minimize)

const actionKey = computed(() =>
  userOptions.actionCN ? 'actionCN' : 'action',
)

// 太大会爆储存（5M）
const maxStorage = 3

const loading = ref(false)
let saveEnable: boolean = false

interface PlayerSP extends Player {
  timestamp: number
}

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
  {
    zoneName: '',
    duration: '00:00',
    table: shallowReactive([]),
    key: 'init',
    timestamp: -1,
  },
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
  saveEnable = false
  combatTimeStamp.value = 0
  select.value = 0
  data.value.length = 0
  data.value.push({
    zoneName: '',
    duration: '00:00',
    table: shallowReactive([]),
    key: 'placeholder',
    timestamp: -1,
  })
  resetLine(data.value[0]!)
  // 保存一个空的战斗数据，防止在数据更新后，用户每次都会加载之前的缓存
  saveStorage()
}

function afterHandle() {
  data.value = data.value.filter(
    v => v.duration !== '00:00' && v.table.length !== 0,
  )
  saveEnable = true
  // 手动解析时，不应该保存，否则只会保留最后5次战斗
  // saveStorage()
  loading.value = false
}

function handleLine(line: string) {
  for (const regexName in regexes) {
    const regex = regexes[regexName]!
    const match = regex.exec(line)
    if (match) {
      const splitLine = line.split('|')
      switch (regexName) {
        case 'statusEffectExplicit':
          if (match.groups?.targetId!.startsWith('1'))
            shieldData[match.groups!.targetId!] = match.groups!.currentShield!

          break
        case 'gainsEffect':
          {
            const effectId = splitLine[logDefinitions.GainsEffect.fields.effectId]!
            const effect = splitLine[logDefinitions.GainsEffect.fields.effect]!
            const target = splitLine[logDefinitions.GainsEffect.fields.target]!
            const targetId = splitLine[logDefinitions.GainsEffect.fields.targetId]!
            const count = Number.parseInt(
              splitLine[logDefinitions.GainsEffect.fields.count]!,
              16,
            )
            let keigenn: Keigenn | undefined = getKeigenn(effectId)
            if (!keigenn) {
              const vulnerable = (targetId.startsWith('1')
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
            const duration = splitLine[logDefinitions.GainsEffect.fields.duration]!
            const source = splitLine[logDefinitions.GainsEffect.fields.source]!
            const sourceId = splitLine[logDefinitions.GainsEffect.fields.sourceId]!
            const timestamp = new Date(
              splitLine[logDefinitions.GainsEffect.fields.timestamp]!,
            ).getTime()
            const expirationTimestamp = timestamp + Number.parseFloat(duration) * 1000
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
            const target = splitLine[logDefinitions.LosesEffect.fields.target]!
            const targetId = splitLine[logDefinitions.LosesEffect.fields.targetId]!
            const effectId = splitLine[logDefinitions.LosesEffect.fields.effectId]!
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
            const job = splitLine[logDefinitions.AddedCombatant.fields.job]!
            const timestamp = new Date(splitLine[logDefinitions.AddedCombatant.fields.timestamp]!).getTime()
            jobMap.value[splitLine[logDefinitions.AddedCombatant.fields.id]!] = {
              job: Number.parseInt(job, 16),
              timestamp,
            }
          }
          break
        case 'removingCombatant':
          Reflect.deleteProperty(
            jobMap.value,
            splitLine[logDefinitions.RemovedCombatant.fields.id]!,
          )
          break
        case 'primaryPlayer':
          {
            povId.value = splitLine[logDefinitions.ChangedPlayer.fields.id]
            const _povName = splitLine[logDefinitions.ChangedPlayer.fields.name]
            if (povName.value === _povName)
              return
            povName.value = _povName
            store.initEnvironment(
              splitLine[logDefinitions.ChangedPlayer.fields.name]!,
            )
          }
          break
        case 'partyList':
          partyLogList.value = match.groups?.list?.split('|') ?? []
          break
        case 'changeZone':
          zoneName.value = splitLine[logDefinitions.ChangeZone.fields.name]
          stopCombat(
            new Date(
              splitLine[logDefinitions.ChangeZone.fields.timestamp]!,
            ).getTime(),
          )
          break
        case 'inCombat':
          {
            const inACTCombat = splitLine[logDefinitions.InCombat.fields.inACTCombat] === '1'
            const inGameCombat = splitLine[logDefinitions.InCombat.fields.inGameCombat] === '1'
            const timeStamp = new Date(
              splitLine[logDefinitions.InCombat.fields.timestamp]!,
            ).getTime()
            if (inACTCombat || inGameCombat) {
              // new combat
              if (combatTimeStamp.value > 0) {
                return
              }
              else if (data.value[0]!.key === 'placeholder') {
                data.value.splice(0, 1)
              }
              if (data.value[0]!.table.length !== 0) {
                data.value.unshift({
                  zoneName: '',
                  duration: '00:00',
                  table: shallowReactive([]),
                  key: splitLine[logDefinitions.InCombat.fields.timestamp]!,
                  timestamp: timeStamp,
                })
                if (data.value.length >= maxStorage)
                  data.value.splice(data.value.length - 1, 1)
              }
              combatTimeStamp.value = timeStamp
              data.value[0]!.zoneName = zoneName.value
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
            if (id && real)
              rsvData.value[Number(id)] = real
          }
          break
        case 'networkDoT':
          if (!userOptions.parseDoT)
            return
          {
            const which = splitLine[logDefinitions.NetworkDoT.fields.which]!
            const targetId = splitLine[logDefinitions.NetworkDoT.fields.id]!
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

            const target = splitLine[logDefinitions.NetworkDoT.fields.name]!
            const damage = splitLine[logDefinitions.NetworkDoT.fields.damage]!
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
            const time = combatTimeStamp.value === 0
              ? 0
              : timestamp - combatTimeStamp.value
            const formattedTime = formatTime(time)
            const targetJob = getJobById(targetId)
            // const targetJob = jobMap.value[targetId].job ?? target.substring(0, 2);
            const job = Util.nameToFullName(
              Util.jobEnumToJob(targetJob),
            ).simple2
            const jobEnum = targetJob
            const jobIcon = Util.jobEnumToIcon(jobEnum)
            // dot/hot日志的source不准确 故无法计算目标减
            addRow({
              key: data.value[0]!.table.length.toString(),
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
              shield: shieldData[targetId] ?? '0',
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
              const sourceId = splitLine[logDefinitions.Ability.fields.sourceId] ?? '???'
              const targetId = splitLine[logDefinitions.Ability.fields.targetId] ?? '???'
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
              const rawAblityName = splitLine[logDefinitions.Ability.fields.ability]!
              const rsvMatch = rawAblityName.match(/^_rsv_(?<id>\d+)_/)
              const id = splitLine[logDefinitions.Ability.fields.id] ?? '???'
              let action = rawAblityName
              if (rsvMatch) {
                const id: number = Number(rsvMatch.groups?.id)
                action = (rsvData.value[id] ?? rawAblityName.match(/^_(?<id>rsv_\d+)_/)?.groups?.id)!
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
              const currentHp = Number(
                splitLine[logDefinitions.Ability.fields.targetCurrentHp],
              ) ?? '???'
              const maxHp = Number(splitLine[logDefinitions.Ability.fields.targetMaxHp])
                ?? '???'
              const source = splitLine[logDefinitions.Ability.fields.source] ?? '???'
              const target = splitLine[logDefinitions.Ability.fields.target] ?? '???'
              const { effect, type } = processFlags(ability.flags)
              const time = combatTimeStamp.value === 0
                ? 0
                : timestamp - combatTimeStamp.value
              const formattedTime = formatTime(time)
              const targetJob = getJobById(targetId)
              // const targetJob = jobMap.value[targetId].job ?? target.substring(0, 2);
              const job = Util.nameToFullName(
                Util.jobEnumToJob(targetJob),
              ).simple2
              const jobEnum = targetJob
              const jobIcon = Util.jobEnumToIcon(jobEnum)
              const keigenns = deepClone(
                Object.values(statusData.friendly[targetId] ?? [])
                  .concat(Object.values(statusData.enemy[source] ?? []))
                  .filter((v) => {
                    const remain = Math.max(
                      0,
                      (v.expirationTimestamp - timestamp) / 1000,
                    )
                    v.remainingDuration = remain >= 999
                      ? ''
                      : remain.toFixed(
                          remain > 0.05 && remain < 0.95 ? 1 : 0,
                        )
                    // 有时会有过期很久的遗留的buff?
                    return Number(v.remainingDuration) > -3
                  }),
              )
              addRow({
                key: data.value[0]!.table.length.toString(),
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
                shield: shieldData[match.groups!.targetId!] ?? '0',
                povId: povId.value,
              })
              data.value[0]!.duration = formatTime(
                new Date(
                  splitLine[logDefinitions.Ability.fields.timestamp]!,
                ).getTime() - combatTimeStamp.value,
              )
            }
          }
          break
        default:
          break
      }
    }
  }
}

function getJobById(targetId: string): number {
  const fromJobMap = jobMap.value[targetId]!
  const fromPartyEvent = partyEventParty.value.find(
    v => v.id === targetId,
  ) ?? { job: 0, timestamp: 0 }
  return [fromJobMap, fromPartyEvent].sort(
    (a, b) => b.timestamp - a.timestamp,
  )[0]!.job
}

function addRow(row: RowVO) {
  data.value[0]!.table.unshift(row)
}

function stopCombat(timeStamp: number) {
  if (combatTimeStamp.value === 0)
    return
  data.value[0]!.duration = formatTime(timeStamp - combatTimeStamp.value)
  data.value[0] = markRaw(data.value[0]!)
  combatTimeStamp.value = 0
  statusData.friendly = {}
  statusData.enemy = {}
  saveStorage()
}

function saveStorage() {
  if (!saveEnable) {
    return
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      data.value
        .filter(v => v.key !== 'placeholder' && v.timestamp > 0)
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, maxStorage),
    ),
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
      data.value.length = 0
      throw e
    }
  }
}

function formatTime(time: number) {
  const minute = Math.max(Math.floor(time / 60000), 0)
  const second = Math.max(Math.floor((time - minute * 60000) / 1000), 0)
  return `${minute < 10 ? '0' : ''}${minute}:${second < 10 ? '0' : ''
  }${second}`
}

if (store.isBrowser)
  povName.value = '测试用户'

if (povName.value !== '')
  store.initEnvironment(povName.value)

onMounted(() => {
  const isDark = useDark({ storageKey: 'keigenn-record-2-theme' })
  const toggleDark = useToggle(isDark)
  if (isDark.value === false) {
    // 固定使用深色主题
    toggleDark()
  }
  for (const id in jobMap.value) {
    const element = jobMap.value[id]!
    if (Date.now() - element.timestamp > 1000 * 60 * 60 * 24 * 1)
      Reflect.deleteProperty(jobMap.value, id)
  }
  loadStorage()

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
})

function clickMinimize() {
  minimize.value = !minimize.value
}

function test() {
  const last = data.value[0]!.table[0]!
  const d = { ...last, key: crypto.randomUUID() }
  data.value[0]!.table.unshift(d)
}
</script>

<template>
  <div class="wrapper" :style="{ '--scale': userOptions.scale, '--opacity': userOptions.opacity }" @contextmenu.prevent>
    <header>
      <div class="header-select">
        <el-select
          v-show="!minimize" v-model="select" size="small" class="combat-select"
          :class="store.isBrowser ? 'browser' : 'act'" popup-class-name="combat-select-popup" :offset="0"
          :show-arrow="false"
        >
          <el-option
            v-for="i in data.length" :key="`${data[i - 1]!.key}-${data[i - 1]!.duration}-${data[i - 1]!.zoneName
            }`" :value="i - 1" :label="`${data[i - 1]!.duration} ${data[i - 1]!.zoneName}`"
          />
        </el-select>
      </div>
      <el-button
        v-if="!store.isBrowser" class="minimize" :class="minimize ? 'in-minimize' : 'not-minimize'"
        :icon="minimize ? ZoomIn : ZoomOut" circle :style="{ opacity: minimize ? 0.5 : 1 }" @click="clickMinimize"
      />
    </header>
    <main v-show="!minimize" style="height: 100%">
      <KeigennRecord2Table :rows="data[select]!.table" :action-key="actionKey" />
    </main>
  </div>
  <div v-if="store.isBrowser || dev" class="testLog">
    <el-button v-if="dev" @click="test">
      测试
    </el-button>
    <CommonTestLog m-1 @before-handle="beforeHandle" @after-handle="afterHandle" @handle-line="handleLine" />
  </div>
</template>

<style>
.el-select__suffix {
  position: relative;
  width: 0px;
  right: 15px;
}

.combat-select .el-select__suffix {
  width: 14px;
  right: 7px
}

.col-target-select .el-select__placeholder {
  overflow: hidden;
  text-overflow: clip;
  width: 2em;
}
</style>

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

img[src=""],
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

/* ===== Element Plus 样式重写 ===== */
:global(.el-table-v2__main) {
  background-color: rgba(20, 20, 20, var(--opacity));
  border-radius: 6px;
}

// el-select 下拉范围
:global(.el-select-dropdown__list) {
  padding: 0;
}

// el-option 下拉选项
:global(.el-select-dropdown__item) {
  padding: 0 0.5em;
}

// 让表头显示完整
:global(.header-filter) {
  position: fixed;
}

// 表格列间隔
:global(.el-table-v2__row-cell) {
  padding: 0 2px;
}

// 表格行指针手势
:global(.el-table-v2__row) {
  cursor: pointer;
}

// action列样式
:global(.col-action) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 28px;
}

// amount列样式（允许超出单元格宽度）
:global(.col-amount) {
  overflow: visible !important;
  z-index: 2; // 在图标上方
}

// 表头筛选去掉边框
:global(.el-select__wrapper) {
  box-shadow: none !important;
}

// 正在筛选 改变文字颜色
:global(.el-select__placeholder) {
  color: var(--el-color-primary) !important;
}

// 未筛选 文字颜色
:global(.el-select__placeholder.is-transparent) {
  color: unset !important;
}

/* ===== 战斗记录选择器 ===== */
.combat-select {
  height: 21px;
  position: absolute;
  top: 1px;
  z-index: 15;
  border-radius: 4px;
  box-shadow: 0 0 0 1px rgba(200, 200, 200, 0.2);
}

.combat-select.act {
  width: 1.5em;
  right: 24px;
  background-color: rgba(20, 20, 20, 0.4);
}

.combat-select.browser {
  width: 16em;
  right: 2px;
}

.combat-select-popup {
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
