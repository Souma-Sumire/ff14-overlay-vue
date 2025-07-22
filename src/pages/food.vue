<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import type { Food, Players } from '@/types/food'
import { demoFoodData } from '@/components/food/demoFoodData'
import Util from '@/utils/util'
import NetRegexes from '../../cactbot/resources/netregexes'
import {
  addOverlayListener,
  callOverlayHandler,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'
import mealsItemActionData0 from '../resources/mealsItemActionData0.json'

const party: Ref<{ id: string, name: string, jobName: string }[]> = ref([])
const effectData = new Map<string, Food>()
const uiData: Ref<Players[]> = useStorage('souma-food-ui-data', [])
const actReady = ref(false)
const params = useUrlSearchParams('hash')
const dev = params.dev === '1'
const demo = ref((document.getElementById('unlocked')?.style?.display === 'flex') || dev)
const display = computed(
  () =>
    (party.value.length >= 6
      && uiData.value.filter(v => v.food).length >= 1)
    || (demo.value),
)

function checkAct(): Promise<void> {
  if (dev)
    return Promise.resolve()
  return new Promise((resolve) => {
    callOverlayHandler({ call: 'cactbotRequestState' }).then(() => {
      actReady.value = true
      resolve()
    })
    setTimeout(() => {
      if (!actReady.value) {
        checkAct()
      }
    }, 3000)
  })
}

const netRegexs = {
  gainsEffect: NetRegexes.gainsEffect({ effectId: '30' }),
  losesEffect: NetRegexes.losesEffect({ effectId: '30' }),
}

function updateFriendlyCombatants() {
  if (demo.value) {
    uiData.value = demoFoodData.sort(
      (a, b) => (a.food?.durationSeconds ?? 0) - (b.food?.durationSeconds ?? 0),
    )
    return
  }
  for (const [id, food] of effectData.entries()) {
    if (food.expiredMillisecond < Date.now()) {
      effectData.delete(id)
    }
    else {
      food.durationSeconds = Math.floor(
        (food.expiredMillisecond - Date.now()) / 1000,
      )
    }
  }
  uiData.value = party.value
    .map(v => ({ ...v, food: effectData.get(v.id) }))
    .sort(
      (a, b) => (a.food?.durationSeconds ?? 0) - (b.food?.durationSeconds ?? 0),
    )
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  if (e.line[0] === '26') {
    const matches = netRegexs.gainsEffect.exec(e.rawLine)
    if (matches && matches.groups) {
      const count = matches.groups.count
      const id = Number.parseInt(count, 16)
      const key = (id >= 10000 ? id - 10000 : id).toString()
      const data0
        = mealsItemActionData0[key as keyof typeof mealsItemActionData0]
      effectData.set(matches.groups.targetId, {
        durationSeconds: Number.parseFloat(matches.groups.duration),
        expiredMillisecond:
          Date.now() + Number.parseFloat(matches.groups.duration) * 1000,
        name: data0.Name,
        params: data0.ParamsValues,
        hq: id >= 10000,
        level: Number(data0.Level),
      })
      updateFriendlyCombatants()
    }
  }
  else if (e.line[0] === '30') {
    const matches = netRegexs.losesEffect.exec(e.rawLine)
    if (matches && matches.groups) {
      effectData.delete(matches.groups.targetId)
      updateFriendlyCombatants()
    }
  }
}

const handlePartyChanged: EventMap['PartyChanged'] = (e) => {
  party.value = e.party.map((v) => {
    return {
      id: v.id,
      name: v.name,
      jobName: Util.nameToFullName(Util.jobEnumToJob(v.job)).simple2,
    }
  })
}

const replaceMap: Record<string, string> = {
  信念: '信',
  耐力: '耐',
  咏唱速度: '咏',
  技能速度: '技',
  暴击: '暴',
  坚韧: '坚',
  信仰: '仰',
}

function getFoodParams(params: Food['params'], hq: boolean): string {
  const p = params
    .filter(v => v.Params !== '耐力' && v.Params)
    .sort((a, b) => {
      const aV = hq ? a['Max{HQ}'] : a.Max
      const bV = hq ? b['Max{HQ}'] : b.Max
      return Number.parseInt(aV, 10) - Number.parseInt(bV, 10)
    })
    .map(v => v.Params)
    .join('>')

  return p.replace(
    /信念|耐力|咏唱速度|技能速度|暴击|坚韧|信仰/g,
    m => replaceMap[m],
  )
  // const p = params.filter(v => v.Params !== '耐力' && v.Params)
  // if (hq) {
  //   return p.map(v => `${v.Params} +${v.Value}%（上限${v.Max}）`).join('<br>')
  // }
  // return p.map(v => `${v.Params} +${v['Value{HQ}']}%（上限${v['Max{HQ}']})`).join('<br>')
}

function getMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60)
  return m > 59 ? '>1小时' : `${m}分钟`
}

onMounted(() => {
  checkAct()
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('PartyChanged', handlePartyChanged)
  updateFriendlyCombatants()
  setInterval(() => {
    updateFriendlyCombatants()
  }, 1_000)
  document.addEventListener('onOverlayStateUpdate', (e) => {
    demo.value = e?.detail?.isLocked === false
  })
})

onUnmounted(() => {
  removeOverlayListener('LogLine', handleLogLine)
  removeOverlayListener('PartyChanged', handlePartyChanged)
})
</script>

<template>
  <div class="container" :class="{ demo }">
    <el-card v-if="!(actReady || dev)">
      <h1>{{ "在 ACT 中添加本页面作为数据统计悬浮窗" }}</h1>
    </el-card>
    <div v-else-if="display" class="party-list">
      <p v-for="item in uiData" :key="item.id" class="party-member">
        <span class="job-name">{{ item.jobName }}</span>

        <span class="food-status">
          <template v-if="item.food">
            <span class="food-name-wrapper">
              <span class="food-params">{{
                `(${item.food.level})${getFoodParams(item.food.params, item.food.hq)}`
              }}</span>
              <span class="food-name">{{ item.food.name }}</span>
              <i class="xiv hq" :class="{ invisible: !item.food.hq }" />
            </span>
            <span
              class="food-timer"
              :class="[item.food.durationSeconds <= 600 ? 'warning' : 'normal']"
            >
              {{ getMinutes(item.food.durationSeconds) }}
            </span>
          </template>
          <template v-else>
            <span class="food-name-wrapper" />
            <span class="food-timer no-food">无食物</span>
          </template>
        </span>
      </p>
      <span v-if="demo" class="demo-text">
        当前为演示数据，锁定后将显示真实数据（仅在小队人数>=6，且至少有1人吃食物时显示）
      </span>
    </div>
  </div>
</template>

<style>
body {
  background-color: transparent;
  margin: 0;
  padding: 2px;
  font-size: 12px;
  line-height: 1.2;
}

::-webkit-scrollbar {
  display: none;
}
</style>

<style scoped lang="scss">
@import url(../css/ffxiv-axis-font-icons.css);

.xiv,
.ffxiv {
  font-family: "FFXIV";
}

.container {
  font-family: "Microsoft YaHei", "Segoe UI", Tahoma, sans-serif;
  color: #e0e0e0;
  max-width: 6.5em;
  background-color: rgba(0, 0, 0, 0.01);
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
}

.container:hover,
.container.demo {
  max-width: min-content;
}

.party-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.party-member {
  margin: 0;
  padding: 1px 3px;
  display: flex;
  align-items: center;
  background-color: rgba(20, 20, 20, 0.8);
  border-radius: 2px;
  font-size: 11px;
  user-select: none;
  text-shadow: 1px 1px 1px #000;
}

.job-name {
  font-weight: bold;
  width: 2.5em;
  flex-shrink: 0;
}

.food-status {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.food-name-wrapper {
  transform-origin: right center;
  opacity: 0;
  visibility: hidden;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  position: relative;
  flex-shrink: 1;
  max-width: 8em;
  width: 8em;
}

.container:hover .food-name-wrapper,
.container.demo .food-name-wrapper {
  min-width: 7.5em;
  opacity: 1;
  visibility: visible;
}

.food-params,
.food-name {
  position: absolute;
  right: 1.4em;
  max-width: calc(100% - 1.4em);
  text-align: right;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.food-params {
  opacity: 1;
  transform: translateY(0);
}

.food-name {
  opacity: 0;
  transform: translateY(100%);
}

.food-name-wrapper:hover .food-params,
.food-name-wrapper.demo .food-params {
  opacity: 0;
  transform: translateY(-100%);
}

.food-name-wrapper:hover .food-name,
.food-name-wrapper.demo .food-name {
  opacity: 1;
  transform: translateY(0);
}

.xiv.hq {
  width: 1em;
  height: 1em;
  line-height: 1em;
  text-align: center;
  display: inline-block;
  text-shadow: 0 0 0.2em orange;
  flex-shrink: 0;
}

.invisible {
  opacity: 0;
}

.food-timer {
  flex-shrink: 0;
  width: 4em;
  text-align: right;

  &.normal {
    color: #6bff6b;
  }
  &.warning {
    color: #ffcc00;
  }
}

.no-food {
  color: #ff6b6b;
  font-style: italic;
  text-align: right;
  font-weight: bold;
}

.demo-text {
  position: fixed;
  top: 0;
  right: 0;
  font-size: 14px;
  width: 6.5em;
  text-shadow:
    1px 1px 1px #000,
    -1px -1px 1px #000,
    1px -1px 1px #000,
    -1px 1px 1px #000;
  opacity: 1;
  color: lightblue;
  background-color: rgba(20, 20, 20, 0.8);
}

@media (max-width: 8em), (max-height: 8em) {
  .demo-text {
    display: none;
  }
}
</style>
