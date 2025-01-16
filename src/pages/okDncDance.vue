<script setup lang="ts">
import type { QueueArr } from '@/types/PostNamazu'
import { doQueueActions } from '@/utils/postNamazu'
import NetRegexes from '../../cactbot/resources/netregexes'
import { addOverlayListener, callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'

type Lang = 'cn' | 'en' | 'ja'

let lastStep = -1
let playerJob = ''
let playerID: number = 0

const step: Record<Lang, string[]> = {
  cn: ['瀑泻', '喷泉', '逆瀑泻', '坠喷泉'],
  en: ['Cascade', 'Fountain', 'Reverse Cascade', 'Fountainfall'],
  ja: ['カスケード', 'ファウンテン', 'リバースカスケー', 'ファウンテンフォール'],
}

const ending: Record<Lang, Record<string, string>> = {
  cn: { standard: '标准舞步', technical: '技巧舞步' },
  en: { standard: 'Standard Step', technical: 'Technical Step' },
  ja: { standard: 'スタンダードステップ', technical: 'テクニカルステップ' },
}

const combatState: {
  inACTCombat: boolean
  inGameCombat: boolean
} = {
  inACTCombat: false,
  inGameCombat: false,
}

const config = useStorage('okDncDanceSettings', {
  lang: 'cn' as Lang,
  hotbar: {
    standard: [2, 1],
    technical: [2, 2],
  },
  cdDancingStart: true,
  cdDancingEnd: true,
  autoDance: false,
})

const doTextCommand = (v: string) => callOverlayHandler({ call: 'PostNamazu', c: 'DoTextCommand', p: v })

function resetHotbar(standard: boolean, technical: boolean) {
  if (playerJob === 'DNC') {
    if (standard)
      doTextCommand(`/hotbar set ${ending[config.value.lang].standard} ${config.value.hotbar.standard.join(' ')}`)
    if (technical)
      doTextCommand(`/hotbar set ${ending[config.value.lang].technical} ${config.value.hotbar.technical.join(' ')}`)
    lastStep = -1
  }
}

const netRegex = {
  countdown: NetRegexes.countdown(),
  countdownCancel: NetRegexes.countdownCancel(),
  losesEffect: NetRegexes.losesEffect(),
  changeZone: NetRegexes.changeZone(),
  wipe: NetRegexes.network6d({ command: ['40000010', '4000000F'] }),
}

const eventHandlers = {
  countdown: (time: number) => {
    if (playerJob !== 'DNC') {
      return
    }
    if (config.value.cdDancingStart) {
      doQueueActions([
        { c: 'stop', p: 'okDncDance-start' },
        { c: 'qid', p: 'okDncDance-start' },
        { c: 'DoTextCommand', p: `/ac ${ending[config.value.lang].standard}`, d: Math.max(0, (time - 15) * 1000) },
      ])
    }
    if (config.value.cdDancingEnd) {
      doQueueActions([
        { c: 'stop', p: 'okDncDance-end' },
        { c: 'qid', p: 'okDncDance-end' },
        { c: 'DoTextCommand', p: `/ac ${ending[config.value.lang].standard}`, d: time * 1000 - 300 },
      ],
      )
    }
  },
  countdownCancel: () => {
    if (playerJob !== 'DNC') {
      return
    }
    doQueueActions([{ c: 'stop', p: 'okDncDance-(?:start|end|auto)' }])
  },
  losesEffect: () => {
    resetHotbar(true, true)
  },
  changeZone: () => {
    resetHotbar(true, true)
  },
  playerDied: () => {
    resetHotbar(true, true)
  },
  wipe: () => {
    resetHotbar(true, true)
  },
}

onMounted(() => {
  addOverlayListener('onPlayerChangedEvent', (e) => {
    playerJob = e.detail.job
    if (playerID !== e.detail.id) {
      playerID = e.detail.id
      netRegex.losesEffect = NetRegexes.losesEffect({ targetId: playerID.toString(16).toUpperCase(), effectId: '71[AB]' })
    }
    if (!(e.detail.job === 'DNC'))
      return
    const curStep = e.detail.jobDetail?.currentStep
    const needsSteps = e.detail.jobDetail?.steps
    if (curStep === undefined || needsSteps === undefined || curStep === lastStep)
      return

    if (needsSteps.length && curStep < needsSteps.length) {
      const stepAction = step[config.value.lang][['Emboite', 'Entrechat', 'Jete', 'Pirouette'].indexOf(needsSteps[curStep])]
      doTextCommand(`/hotbar set ${stepAction} ${config.value.hotbar[needsSteps.length === 2 ? 'standard' : 'technical'].join(' ')}`)
      const currentStep = e.detail.jobDetail?.currentStep
      if (combatState.inGameCombat === false && combatState && currentStep !== undefined && config.value.autoDance) {
        const queue: QueueArr = [
          { c: 'DoTextCommand', p: `/ac ${stepAction}`, d: (currentStep === 0 ? 1460 : 960) },
          ...(Array.from({ length: 4 }).map(() => ({ c: 'DoTextCommand', p: `/ac ${stepAction}`, d: 20 }))) as QueueArr,
        ]
        doQueueActions(queue)
      }
    }
    else if (curStep === needsSteps.length) {
      resetHotbar(needsSteps.length === 2, needsSteps.length === 4)
    }

    if (needsSteps.length)
      lastStep = curStep
  })
  addOverlayListener('onPlayerDied', () => {
    eventHandlers.playerDied()
  })
  addOverlayListener('LogLine', (e) => {
    const countdown = netRegex.countdown.exec(e.rawLine)?.groups?.countdownTime
    if (countdown !== undefined) {
      eventHandlers.countdown(Number.parseInt(countdown))
    }
    else if (netRegex.countdownCancel.test(e.rawLine)) {
      eventHandlers.countdownCancel()
    }
    else if (netRegex.losesEffect.test(e.rawLine)) {
      eventHandlers.losesEffect()
    }
    else if (netRegex.changeZone.test(e.rawLine)) {
      eventHandlers.changeZone()
    }
    else if (netRegex.wipe.test(e.rawLine)) {
      eventHandlers.wipe()
    }
  })
  addOverlayListener('onInCombatChangedEvent', (e) => {
    combatState.inACTCombat = e.detail.inACTCombat
    combatState.inGameCombat = e.detail.inGameCombat
  })
})
</script>

<template>
  <div p-l-3 bg-white>
    <el-form label-width="9rem" style="max-width: 300px">
      <el-form-item label="Action语言" style="width:14em">
        <el-select v-model="config.lang" size="small">
          <el-option value="cn" label="中文" />
          <el-option value="en" label="English" />
          <el-option value="ja" label="日本語" />
        </el-select>
      </el-form-item>

      <el-form-item label="标准舞步热键栏">
        <el-input v-model="config.hotbar.standard[0]" type="number" style="width:2.5rem" min="1" max="10" size="small" />
        <el-input v-model="config.hotbar.standard[1]" type="number" style="width:2.5rem" min="1" max="12" size="small" />
        <el-popover trigger="hover" content="标准舞步的热键栏位置，例如2-1，代表热键栏2的编号1位置。">
          <template #reference>
            <svg t="1717309838763" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1460" width="16" height="16" flex><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" p-id="1461" /><path d="M623.6 316.7C593.6 290.4 554 276 512 276s-81.6 14.5-111.6 40.7C369.2 344 352 380.7 352 420v7.6c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V420c0-44.1 43.1-80 96-80s96 35.9 96 80c0 31.1-22 59.6-56.1 72.7-21.2 8.1-39.2 22.3-52.1 40.9-13.1 19-19.9 41.8-19.9 64.9V620c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8v-22.7c0-19.7 12.4-37.7 30.9-44.8 59-22.7 97.1-74.7 97.1-132.5 0.1-39.3-17.1-76-48.3-103.3z" p-id="1462" /><path d="M512 732m-40 0a40 40 0 1 0 80 0 40 40 0 1 0-80 0Z" p-id="1463" /></svg>
          </template>
        </el-popover>
      </el-form-item>
      <el-form-item label="技巧舞步热键栏">
        <el-input v-model="config.hotbar.technical[0]" type="number" style="width:2.5rem" min="1" max="10" size="small" />
        <el-input v-model="config.hotbar.technical[1]" type="number" style="width:2.5rem" min="1" max="12" size="small" />
        <el-popover trigger="hover" content="技巧舞步的热键栏位置，例如2-2，代表热键栏2的编号2位置。">
          <template #reference>
            <svg t="1717309838763" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1460" width="16" height="16" flex><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" p-id="1461" /><path d="M623.6 316.7C593.6 290.4 554 276 512 276s-81.6 14.5-111.6 40.7C369.2 344 352 380.7 352 420v7.6c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V420c0-44.1 43.1-80 96-80s96 35.9 96 80c0 31.1-22 59.6-56.1 72.7-21.2 8.1-39.2 22.3-52.1 40.9-13.1 19-19.9 41.8-19.9 64.9V620c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8v-22.7c0-19.7 12.4-37.7 30.9-44.8 59-22.7 97.1-74.7 97.1-132.5 0.1-39.3-17.1-76-48.3-103.3z" p-id="1462" /><path d="M512 732m-40 0a40 40 0 1 0 80 0 40 40 0 1 0-80 0Z" p-id="1463" /></svg>
          </template>
        </el-popover>
      </el-form-item>

      <el-form-item label="倒计时15秒小舞">
        <el-switch v-model="config.cdDancingStart" size="small" />
      </el-form-item>
      <el-form-item label="倒计时0秒小舞">
        <el-switch v-model="config.cdDancingEnd" size="small" />
      </el-form-item>
      <el-form-item label="自动舞步(仅脱战时)">
        <el-switch v-model="config.autoDance" size="small" />
        <el-popover trigger="hover" content="仅在非战斗状态下生效，只跳颜色，不自动终结">
          <template #reference>
            <svg t="1717309838763" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1460" width="16" height="16" flex><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" p-id="1461" /><path d="M623.6 316.7C593.6 290.4 554 276 512 276s-81.6 14.5-111.6 40.7C369.2 344 352 380.7 352 420v7.6c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V420c0-44.1 43.1-80 96-80s96 35.9 96 80c0 31.1-22 59.6-56.1 72.7-21.2 8.1-39.2 22.3-52.1 40.9-13.1 19-19.9 41.8-19.9 64.9V620c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8v-22.7c0-19.7 12.4-37.7 30.9-44.8 59-22.7 97.1-74.7 97.1-132.5 0.1-39.3-17.1-76-48.3-103.3z" p-id="1462" /><path d="M512 732m-40 0a40 40 0 1 0 80 0 40 40 0 1 0-80 0Z" p-id="1463" /></svg>
          </template>
        </el-popover>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped lang='scss'>

</style>
