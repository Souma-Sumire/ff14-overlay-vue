<script setup lang="ts">
import type { EventMap, Party } from 'cactbot/types/event'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'
import { nameToJobEnum as Job } from '../utils/util'
import { completeIcon } from '@/resources/status'
import { handleImgError, site } from '@/utils/xivapi'

interface KeySkill {
  columns: number
  id: RegExp
  name: string
  tts: string | undefined
  duration: number
  cooldown: number
  job: number[]
  icon: number
  iconUrl: string
}

interface KeySkillTimerState extends KeySkill {
  lastUsageTime: number
  source: Party
}

const keySkill: KeySkill[] = [
  { columns: 1, id: /^30$/, name: '神圣领域', tts: undefined, duration: 10, cooldown: 420, job: [Job.PLD], icon: 2502, iconUrl: '' },
  { columns: 1, id: /^43$/, name: '死斗', tts: undefined, duration: 10, cooldown: 240, job: [Job.MRD, Job.WAR], icon: 266, iconUrl: '' },
  { columns: 1, id: /^3638$/, name: '行尸走肉', tts: undefined, duration: 10, cooldown: 300, job: [Job.DRK], icon: 3077, iconUrl: '' },
  { columns: 1, id: /^16152$/, name: '超火流星', tts: undefined, duration: 10, cooldown: 360, job: [Job.GNB], icon: 3416, iconUrl: '' },
  { columns: 1, id: /^140$/, name: '天赐祝福', tts: '天赐', duration: 0, cooldown: 180, job: [Job.WHM], icon: 2627, iconUrl: '' },
  { columns: 1, id: /^25862$/, name: '礼仪之铃', tts: '礼仪之铃', duration: 15, cooldown: 180, job: [Job.WHM], icon: 2649, iconUrl: '' },
  { columns: 1, id: /^25868$/, name: '疾风怒涛之策', tts: '跑快快', duration: 20, cooldown: 120, job: [Job.SCH], icon: 2878, iconUrl: '' },
  { columns: 1, id: /^25874$/, name: '大宇宙', tts: '大宇宙', duration: 15, cooldown: 180, job: [Job.AST], icon: 3562, iconUrl: '' },
  { columns: 1, id: /^24318$/, name: '魂灵风息', tts: '魂灵风息', duration: 0, cooldown: 120, job: [Job.SGE], icon: 3686, iconUrl: '' },
  { columns: 2, id: /^7549$/, name: '牵制', tts: '牵制', duration: 10, cooldown: 90, job: [Job.PGL, Job.LNC, Job.MNK, Job.DRG, Job.NIN, Job.SAM, Job.RPR], icon: 828, iconUrl: '' },
  { columns: 2, id: /^7560$/, name: '昏乱', tts: '昏乱', duration: 10, cooldown: 90, job: [Job.THM, Job.BLM, Job.ACN, Job.SMN, Job.RDM, Job.BLU], icon: 861, iconUrl: '' },
  { columns: 2, id: /^7535$/, name: '雪仇', tts: '雪愁', duration: 10, cooldown: 60, job: [Job.GLA, Job.MRD, Job.PLD, Job.WAR, Job.DRK, Job.GNB], icon: 806, iconUrl: '' },
  { columns: 2, id: /^3540$/, name: '圣光幕帘', tts: '幕帘', duration: 30, cooldown: 90, job: [Job.PLD], icon: 2508, iconUrl: '' },
  { columns: 2, id: /^7385$/, name: '武装戍卫', tts: '大翅膀', duration: 5, cooldown: 120, job: [Job.PLD], icon: 2515, iconUrl: '' },
  { columns: 2, id: /^7388$/, name: '摆脱', tts: '摆脱', duration: 15, cooldown: 90, job: [Job.WAR], icon: 2563, iconUrl: '' },
  { columns: 2, id: /^16471$/, name: '暗黑步道', tts: '布道', duration: 15, cooldown: 90, job: [Job.DRK], icon: 3087, iconUrl: '' },
  { columns: 2, id: /^16160$/, name: '光之心', tts: '光心', duration: 15, cooldown: 90, job: [Job.GNB], icon: 3424, iconUrl: '' },
  { columns: 2, id: /^16536$/, name: '节制', tts: '节制', duration: 20, cooldown: 120, job: [Job.WHM], icon: 2645, iconUrl: '' },
  { columns: 2, id: /^7405$/, name: '行吟', tts: '行吟', duration: 15, cooldown: 90, job: [Job.BRD], icon: 2612, iconUrl: '' },
  { columns: 2, id: /^16889$/, name: '策动', tts: '策动', duration: 15, cooldown: 90, job: [Job.MCH], icon: 3040, iconUrl: '' },
  { columns: 2, id: /^2887$/, name: '武装解除', tts: '武解', duration: 10, cooldown: 120, job: [Job.MCH], icon: 3011, iconUrl: '' },
  { columns: 2, id: /^16012$/, name: '防守之桑巴', tts: '桑巴', duration: 15, cooldown: 90, job: [Job.DNC], icon: 3469, iconUrl: '' },
  { columns: 2, id: /^25857$/, name: '抗死', tts: '抗死', duration: 10, cooldown: 120, job: [Job.RDM], icon: 3237, iconUrl: '' },
  { columns: 2, id: /^16014$/, name: '即兴表演', tts: '即兴', duration: 15, cooldown: 120, job: [Job.DNC], icon: 3477, iconUrl: '' },
  { columns: 3, id: /^118$/, name: '战斗之声', tts: '战歌', duration: 15, cooldown: 120, job: [Job.ARC, Job.BRD], icon: 2601, iconUrl: '' },
  { columns: 3, id: /^25785$/, name: '光明神的最终乐章', tts: '光神曲', duration: 15, cooldown: 110, job: [Job.ARC, Job.BRD], icon: 2622, iconUrl: '' },
  { columns: 3, id: /^2248$/, name: '夺取', tts: '背刺', duration: 20, cooldown: 120, job: [Job.ROG, Job.NIN], icon: 613, iconUrl: '' },
  { columns: 3, id: /^24405$/, name: '神秘环', tts: '神秘环', duration: 20, cooldown: 120, job: [Job.RPR], icon: 3633, iconUrl: '' },
  { columns: 3, id: /^3557$/, name: '战斗连祷', tts: '连祷', duration: 15, cooldown: 120, job: [Job.LNC, Job.DRG], icon: 2585, iconUrl: '' },
  { columns: 3, id: /^7398$/, name: '巨龙视线', tts: '龙肠', duration: 20, cooldown: 120, job: [Job.LNC, Job.DRG], icon: 2587, iconUrl: '' },
  { columns: 3, id: /^7396$/, name: '义结金兰', tts: '义结金兰', duration: 15, cooldown: 120, job: [Job.PGL, Job.MNK], icon: 2542, iconUrl: '' },
  { columns: 3, id: /^25801$/, name: '灼热之光', tts: '灼热之光', duration: 30, cooldown: 120, job: [Job.SMN], icon: 2780, iconUrl: '' },
  { columns: 3, id: /^7436$/, name: '连环计', tts: '连环计', duration: 15, cooldown: 120, job: [Job.SCH], icon: 2815, iconUrl: '' },
  { columns: 3, id: /^7520$/, name: '鼓励', tts: '鼓励', duration: 20, cooldown: 120, job: [Job.RDM], icon: 3218, iconUrl: '' },
  { columns: 3, id: /^1619[3-6]$/, name: '技巧舞步结束', tts: '技巧舞', duration: 20, cooldown: 120, job: [Job.DNC], icon: 3474, iconUrl: '' },
  { columns: 3, id: /^16011$/, name: '进攻之探戈', tts: '探戈', duration: 20, cooldown: 120, job: [Job.DNC], icon: 3471, iconUrl: '' },
  { columns: 3, id: /^16552$/, name: '占卜', tts: '占卜', duration: 15, cooldown: 120, job: [Job.AST], icon: 3553, iconUrl: '' },
].map((v) => {
  const url = completeIcon(v.icon)
  v.iconUrl = `${site.first}/i/${url}.png`
  return v
})

const fakeParty: Party[] = [
  { id: '1', name: '虚构骑士', job: 19, inParty: true, worldId: 0 },
  { id: '2', name: '虚构武僧', job: 20, inParty: true, worldId: 0 },
  { id: '3', name: '虚构战士', job: 21, inParty: true, worldId: 0 },
  { id: '4', name: '虚构龙骑', job: 22, inParty: true, worldId: 0 },
  { id: '5', name: '虚构诗人', job: 23, inParty: true, worldId: 0 },
  { id: '6', name: '虚构白魔', job: 24, inParty: true, worldId: 0 },
  { id: '7', name: '虚构黑魔', job: 25, inParty: true, worldId: 0 },
  { id: '8', name: '虚构召唤', job: 27, inParty: true, worldId: 0 },
  { id: '9', name: '虚构学者', job: 28, inParty: true, worldId: 0 },
  { id: '10', name: '虚构忍者', job: 30, inParty: true, worldId: 0 },
  { id: '11', name: '虚构机工', job: 31, inParty: true, worldId: 0 },
  { id: '12', name: '虚构暗骑', job: 32, inParty: true, worldId: 0 },
  { id: '13', name: '虚构占星', job: 33, inParty: true, worldId: 0 },
  { id: '14', name: '虚构武士', job: 34, inParty: true, worldId: 0 },
  { id: '15', name: '虚构赤魔', job: 35, inParty: true, worldId: 0 },
  { id: '16', name: '虚构青魔', job: 36, inParty: true, worldId: 0 },
  { id: '17', name: '虚构绝枪', job: 37, inParty: true, worldId: 0 },
  { id: '18', name: '虚构舞者', job: 38, inParty: true, worldId: 0 },
  { id: '19', name: '虚构钐镰', job: 39, inParty: true, worldId: 0 },
  { id: '20', name: '虚构贤者', job: 40, inParty: true, worldId: 0 },
]

const party = ref<Party[]>([])
const partySkill = ref<KeySkillTimerState[][]>([])

const handlePartyChanged: EventMap['PartyChanged'] = (e) => {
  party.value = e.party
  const skills = party.value.filter(p => p.inParty).map((p) => {
    return keySkill.filter(ks => ks.job.includes(p.job)).map(ks => ({ ...ks, source: p, lastUsageTime: 0 }))
  }).flat().sort((a, b) => keySkill.findIndex(k => k.id === a.id) - keySkill.findIndex(k => k.id === b.id))
  partySkill.value[0] = skills.filter(v => v.columns === 1)
  partySkill.value[1] = skills.filter(v => v.columns === 2)
  partySkill.value[2] = skills.filter(v => v.columns === 3)
}

onMounted(() => {
  addOverlayListener('PartyChanged', handlePartyChanged)
  handlePartyChanged({ party: fakeParty, type: 'PartyChanged' })
})
</script>

<template>
  <div flex="~ col" gap-1>
    <div v-for="(skills, index) in partySkill" :key="index" flex="~ row" gap-1>
      <div v-for="skill in skills" :key="`${skill.source.id}/${skill.id}`">
        <img
          :src="skill.iconUrl" :alt="skill.name" class="border-rounded-50%" style="filter: drop-shadow(1px 2px 2px #000);
    box-shadow: 0 0 1px 1px black;" @error="handleImgError"
        >
      </div>
    </div>
  </div>
</template>

<style scoped lang='scss'>

</style>
