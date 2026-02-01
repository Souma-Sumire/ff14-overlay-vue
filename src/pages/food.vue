<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import type { Food, Players } from '@/types/food'
import { useDemo } from '@/composables/useDemo'
import { useDev } from '@/composables/useDev'
import { useLang } from '@/composables/useLang'
import { useZone } from '@/composables/useZone'
import { demoFoodData } from '@/mock/demoFoodData'
import Util from '@/utils/util'
import NetRegexes from '../../cactbot/resources/netregexes'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'
import meals from '../resources/meals.json'

const { t } = useLang()
const { zoneType } = useZone()
const party: Ref<{ id: string, name: string, jobName: string }[]> = ref([])
const effectData = new Map<string, Food>()
const uiData: Ref<Players[]> = useStorage('souma-food-ui-data', [])
const demo = useDemo()
const dev = useDev()
const orderedUiData = computed(() =>
  demo.value || dev.value
    ? demoFoodData
    : uiData.value.slice().sort((a, b) => getOrder(a) - getOrder(b)),
)
const display = computed(
  () =>
    (zoneType.value !== 'Pvp'
      && party.value.length >= 6
      && uiData.value.filter(v => v.food).length >= uiData.value.length * 0.5)
    || demo.value,
)

watch(demo, () => {
  fullUpdateFriendlyCombatants()
})

const netRegexs = {
  gainsEffect: NetRegexes.gainsEffect({ effectId: '30' }),
  losesEffect: NetRegexes.losesEffect({ effectId: '30' }),
}

function fullUpdateFriendlyCombatants() {
  uiData.value = party.value.map(v => ({ ...v, food: effectData.get(v.id) }))
}

function tickUpdateDuration() {
  const now = Date.now()
  let needUpdate = false

  for (const [key, food] of effectData) {
    const remaining = Math.floor((food.expiredMillisecond - now) / 1000)
    if (remaining < 0) {
      // 食物过期了，但由于某种情况没有收到losesEffect，手动删除
      effectData.delete(key)
      needUpdate = true
    }
    else if (food.durationSeconds !== remaining) {
      food.durationSeconds = remaining
      needUpdate = true
    }
  }

  if (needUpdate) {
    fullUpdateFriendlyCombatants()
  }
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  if (e.line[0] === '26') {
    const matches = netRegexs.gainsEffect.exec(e.rawLine)
    if (matches && matches.groups) {
      const count = matches.groups.count
      const id = Number.parseInt(count, 16)
      const key = (id >= 10000 ? id - 10000 : id).toString()
      const data0 = meals[key as keyof typeof meals]
      effectData.set(matches.groups.targetId, {
        durationSeconds: Number.parseFloat(matches.groups.duration),
        expiredMillisecond:
          Date.now() + Number.parseFloat(matches.groups.duration) * 1000,
        name: data0.Name,
        params: data0.ParamsValues,
        hq: id >= 10000,
        level: Number(data0.Level),
      })

      fullUpdateFriendlyCombatants()
    }
  }
  else if (e.line[0] === '30') {
    const matches = netRegexs.losesEffect.exec(e.rawLine)
    if (matches && matches.groups) {
      effectData.delete(matches.groups.targetId)
      fullUpdateFriendlyCombatants()
    }
  }
}

const handlePartyChanged: EventMap['PartyChanged'] = (e) => {
  party.value = e.party
    .filter(v => v.inParty)
    .map((v) => {
      return {
        id: v.id,
        name: v.name,
        jobName: Util.jobToFullName(Util.jobEnumToJob(v.job)).simple2,
      }
    })
  fullUpdateFriendlyCombatants()
}

function getFoodParams(params: Food['params'], hq: boolean): string {
  const p = params
    .filter(v => v.Params !== 'Vitality' && v.Params)
    .sort((a, b) => {
      const aV = hq ? a['Max{HQ}'] : a.Max
      const bV = hq ? b['Max{HQ}'] : b.Max
      return Number.parseInt(aV, 10) - Number.parseInt(bV, 10)
    })
    .map(v => t(`food.${v.Params}`))
    .join('>')

  return p
}

function getText(seconds: number): string {
  if (seconds < 60)
    return t('food.seconds', [seconds])
  const m = Math.floor(seconds / 60)
  return m >= 60 ? t('food.>1hour') : t('food.minutes', [m])
}

function getOrder(item: Players) {
  if (!item.food)
    return -9999
  return item.food.durationSeconds
}

onMounted(() => {
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('PartyChanged', handlePartyChanged)

  fullUpdateFriendlyCombatants()

  setInterval(() => {
    if (!demo.value)
      tickUpdateDuration()
  }, 1_000)
})

onUnmounted(() => {
  removeOverlayListener('LogLine', handleLogLine)
  removeOverlayListener('PartyChanged', handlePartyChanged)
})
</script>

<template>
  <CommonActWrapper>
    <template #readme>
      <span class="demo-text">
        {{ $t('food.demo-text') }}
      </span>
    </template>
    <div class="container" :class="{ demo }">
      <div v-if="display" class="party-list">
        <p
          v-for="item in orderedUiData"
          :key="item.id"
          class="party-member"
          :style="{ order: getOrder(item) }"
        >
          <span class="job-name">{{ item.jobName }}</span>

          <span class="food-status">
            <template v-if="item.food">
              <span class="food-name-wrapper">
                <span class="food-params">{{
                  `(${item.food.level})${getFoodParams(
                    item.food.params,
                    item.food.hq,
                  )}`
                }}</span>
                <span class="food-name">{{ item.food.name }}</span>
                <i class="xiv hq" :class="{ invisible: !item.food.hq }" />
              </span>
              <span
                class="food-timer"
                :class="[
                  item.food.durationSeconds <= 60
                    ? 'danger'
                    : item.food.durationSeconds <= 600
                      ? 'warning'
                      : 'normal',
                ]"
              >
                {{ getText(item.food.durationSeconds) }}
              </span>
            </template>
            <template v-else>
              <span class="food-name-wrapper" />
              <span class="food-timer no-food">{{ $t('food.no-food') }}</span>
            </template>
          </span>
        </p>
      </div>
    </div>
  </CommonActWrapper>
</template>

<style scoped lang="scss">
@import url(../css/ffxiv-axis-font-icons.css);

.xiv,
.ffxiv {
  font-family: 'FFXIV';
}

:global(body) {
  background-color: transparent;
  margin: 0;
  padding: 2px;
  font-size: 12px;
  line-height: 1.2;
}

:global(::-webkit-scrollbar) {
  display: none;
}

.container {
  font-family: 'Microsoft YaHei', 'Segoe UI', Tahoma, sans-serif;
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
  transition: transform 0.2s ease, opacity 0.2s ease;
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
  right: 1.0em;
  max-width: calc(100% - 1.0em);
  text-align: right;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  transition: opacity 0.2s ease, transform 0.2s ease;
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

  &.danger {
    color: #ff6b6b;
  }
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
  text-shadow: 1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000,
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
.act-not-ready {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  border: 1px solid #444;
  h1 {
    color: #eee;
    font-size: 1.2rem;
    margin: 0;
  }
}
</style>
