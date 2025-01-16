<script setup lang="ts">
import type { Party } from '../../cactbot/types/event'
import { jobEnumOrder } from '@/utils/util'
import NetRegexes from '../../cactbot/resources/netregexes'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'

const regexes: Record<string, RegExp> = {
  statusEffectExplicit: NetRegexes.statusEffectExplicit(),
}

interface PartyMember extends Party {
  barrierPercent: number
  barrierAmount: number
}
enum ShowType {
  PERCENT = '1',
  AMOUNT = '2',
  BOTH = '3',
}

let timer: NodeJS.Timeout | number = 0

const party = ref([] as PartyMember[])
const povId = ref('')
const url = ref(window.location.href)
const params = computed(() => new URLSearchParams(url.value.split('?')[1]))
const showSettings = computed(() => params.value.get('showSettings') === '1')
const lineHeight = computed(() => `${Number(params.value.get('lineHeight') || 1) * 40}px`)
const fontSize = computed(() => `${Number(params.value.get('fontSize') || 26)}px`)
const type = computed(() => (params.value.get('type') || ShowType.PERCENT) as ShowType)

function handleLine(line: string) {
  const regex = regexes.statusEffectExplicit
  const match = regex.exec(line)
  if (match?.groups?.targetId.startsWith('1')) {
    const p = party.value.find(p => p.id === match.groups?.targetId)
    if (p) {
      p.barrierPercent = Number(match.groups?.currentShield)
      p.barrierAmount = Math.round(Number(match.groups?.maxHp) * p.barrierPercent / 100)
    }
  }
}

const sortRules = useStorage('cactbotRuntime-sortArr', jobEnumOrder)

function updateSortArr(arr: number[]) {
  sortRules.value = arr
}

function handlePartyChanged() {
  party.value.sort((a, b) => {
    if (a.id === povId.value) {
      return -1
    }
    if (b.id === povId.value) {
      return 1
    }
    if (a.job === b.job) {
      return b.id.localeCompare(a.id)
    }
    return sortRules.value.indexOf(a.job) - sortRules.value.indexOf(b.job)
  })
}

function getString(p: PartyMember) {
  if (type.value === ShowType.PERCENT) {
    return `${p.barrierPercent}`
  }
  if (type.value === ShowType.AMOUNT) {
    return `${p.barrierAmount}`
  }
  return `${p.barrierPercent}%(${p.barrierAmount})`
}

onMounted(() => {
  addOverlayListener('LogLine', (e) => {
    handleLine(e.rawLine)
  })
  addOverlayListener('PartyChanged', (e) => {
    party.value = e.party.filter(v => v.inParty).map(v => ({ ...v, barrierPercent: 0, barrierAmount: 0 }))
  })
  addOverlayListener('ChangePrimaryPlayer', (e) => {
    povId.value = Number(e.charID).toString(16).toUpperCase()
  })
  watch([party, povId, sortRules], () => {
    clearInterval(timer)
    if (povId.value) {
      handlePartyChanged()
    }
    else {
      timer = setInterval(() => {
        if (povId.value) {
          handlePartyChanged()
          clearInterval(timer)
        }
      }, 100)
    }
  }, { immediate: true })
  window.addEventListener('hashchange', e => url.value = e.newURL)
})
</script>

<template>
  <div>
    <ul>
      <li v-for="p in party" :key="p.id">
        <span v-show="showSettings" m-r-2>{{ p.name }}</span><span
          :style="p.barrierPercent === 0 ? {
            opacity: 0.25,
            color: 'white',
          } : {
            opacity: 1,
            color: '#f5da3c',
          }"
        >{{ getString(p) }}</span>
      </li>
    </ul>
    <DragJob v-show="showSettings" style="z-index: 10000" :party="party" m-b-1 p-1 @update-sort-arr="updateSortArr" />
  </div>
</template>

<style>
html{
  user-select: none;
  overflow: hidden;
}
</style>

<style scoped lang='scss'>
li{
  line-height: v-bind(lineHeight);
  font-size: v-bind(fontSize);
  list-style: none;
  text-align: right;
  color:white;
  white-space: nowrap;
  display: flex;
  justify-content: flex-end;
  span{
    $color: rgba(0,0,0,0.8);
    text-shadow: 0 2px 2px $color,0 -2px 2px $color,2px 0 2px $color,-2px 0 2px $color;
  }
}
</style>
