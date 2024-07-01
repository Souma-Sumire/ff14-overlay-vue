<script setup lang="ts">
import NetRegexes from '../../cactbot/resources/netregexes'
import { addOverlayListener, callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'

type Lang = 'cn' | 'en' | 'ja'

let lastWeaponskill: string = ''
let currentEffect: string = ''
let playerJob = ''
let playerID: number = 0
let timer: number = 0

const actions = {
  SteelFangs: '872E',
  DreadFangs: '872F',
  HuntersSting: '8730',
  SwiftskinSting: '8731',
  FlankstungVenom: '8732', // 鋭牙【側撃】
  FlanksbaneVenom: '8733', // 鋭牙【側裂】
  HindstungVenom: '8734', // 鋭牙【背撃】
  HindsbaneVenom: '8735', // 鋭牙【背裂】
}

const effects = {
  FlankstungVenom: 'E3D', // 鋭牙【側撃】
  FlanksbaneVenom: 'E3E', // 鋭牙【側裂】
  HindstungVenom: 'E3F', // 鋭牙【背撃】
  HindsbaneVenom: 'E40', // 鋭牙【背裂】
}

const step: Record<Lang, string[]> = {
  cn: ['壹之牙·咬创', '壹之牙·惨毒'],
  en: ['Steel Fangs', 'Dread Fangs'],
  ja: ['壱の牙【咬創】', '壱の牙【惨毒】'],
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

function doTextCommand(v: string) {
  callOverlayHandler({ call: 'PostNamazu', c: 'DoTextCommand', p: v })
}
function resetHotbar() {
  if (playerJob === 'VPR' || playerJob === '41') {
    const skill1 = step[config.value.lang as keyof typeof step][0]
    const skill2 = step[config.value.lang as keyof typeof step][1]
    const skill1Hotbar = config.value.hotbar.standard.join(' ')
    const skill2Hotbar = config.value.hotbar.technical.join(' ')

    if (lastWeaponskill === actions.SteelFangs || lastWeaponskill === actions.DreadFangs) {
      if ([effects.FlankstungVenom, effects.FlanksbaneVenom].includes(currentEffect)) {
        doTextCommand(`/hotbar set ${skill1} ${skill1Hotbar}`)
        doTextCommand(`/hotbar set ${skill1} ${skill2Hotbar}`)
      }
      else if ([effects.HindstungVenom, effects.HindsbaneVenom].includes(currentEffect)) {
        doTextCommand(`/hotbar set ${skill2} ${skill1Hotbar}`)
        doTextCommand(`/hotbar set ${skill2} ${skill2Hotbar}`)
      }
    }
    else if (lastWeaponskill === actions.HuntersSting || lastWeaponskill === actions.SwiftskinSting) {
      if ([effects.FlankstungVenom, effects.HindstungVenom].includes(currentEffect)) {
        doTextCommand(`/hotbar set ${skill1} ${skill1Hotbar}`)
        doTextCommand(`/hotbar set ${skill1} ${skill2Hotbar}`)
      }
      else if ([effects.FlanksbaneVenom, effects.HindsbaneVenom].includes(currentEffect)) {
        doTextCommand(`/hotbar set ${skill2} ${skill1Hotbar}`)
        doTextCommand(`/hotbar set ${skill2} ${skill2Hotbar}`)
      }
    }
    else {
      doTextCommand(`/hotbar set ${skill1} ${skill1Hotbar}`)
      doTextCommand(`/hotbar set ${skill2} ${skill2Hotbar}`)
    }
  }
}

const netRegex = {
  countdown: NetRegexes.countdown(),
  gainsEffect: NetRegexes.gainsEffect(),
  losesEffect: NetRegexes.losesEffect(),
  ability: NetRegexes.ability(),
  changeZone: NetRegexes.changeZone(),
  wipe: NetRegexes.network6d({ command: ['40000010', '4000000F'] }),
}

const eventHandlers = {
  countdown: () => {
  },
  gainsEffect: () => {
    resetHotbar()
  },
  losesEffect: () => {
    resetHotbar()
  },
  ability: () => {
    resetHotbar()
  },
  changeZone: () => {
    resetHotbar()
  },
  playerDied: () => {
    resetHotbar()
  },
  wipe: () => {
    resetHotbar()
  },
}
onMounted(() => {
  addOverlayListener('onPlayerChangedEvent', (e) => {
    playerJob = e.detail.job
    if (playerID !== e.detail.id) {
      playerID = e.detail.id
      netRegex.gainsEffect = NetRegexes.gainsEffect({ targetId: playerID.toString(16).toUpperCase() })
      netRegex.losesEffect = NetRegexes.losesEffect({ targetId: playerID.toString(16).toUpperCase() })
      netRegex.ability = NetRegexes.ability({ sourceId: playerID.toString(16).toUpperCase() })
    }
  })

  addOverlayListener('onPlayerDied', () => {
    eventHandlers.playerDied()
  })

  addOverlayListener('LogLine', (e) => {
    if (netRegex.gainsEffect.test(e.rawLine)) {
      if (Object.values(effects).includes(e.line[2])) {
        currentEffect = e.line[2]
        eventHandlers.gainsEffect()
      }
    }
    else if (netRegex.losesEffect.test(e.rawLine)) {
      if (Object.values(effects).includes(e.line[2])) {
        currentEffect = ''
        eventHandlers.losesEffect()
      }
    }
    else if (netRegex.ability.test(e.rawLine)) {
      if (Object.values(actions).includes(e.line[4])) {
        lastWeaponskill = e.line[4]
        if (timer) {
          clearTimeout(timer)
        }
        timer = setTimeout(() => {
          lastWeaponskill = ''
          eventHandlers.ability()
        }, 30000) as unknown as number
        eventHandlers.ability()
      }
    }
    else if (netRegex.changeZone.test(e.rawLine)) {
      currentEffect = ''
      lastWeaponskill = ''
      eventHandlers.changeZone()
    }
    else if (netRegex.wipe.test(e.rawLine)) {
      currentEffect = ''
      lastWeaponskill = ''
      eventHandlers.wipe()
    }
  })
})
</script>

<template>
  <div bg-white p-l-3>
    <el-form label-width="9rem" style="max-width: 300px">
      <el-form-item label="Action语言" style="width:14em">
        <el-select v-model="config.lang" size="small">
          <el-option value="cn" label="中文" />
          <el-option value="en" label="English" />
          <el-option value="ja" label="日本語" />
        </el-select>
      </el-form-item>

      <el-form-item label="壹之牙·咬创热键栏">
        <el-input
          v-model="config.hotbar.standard[0]" type="number" style="width:2.5rem" min="1" max="10"
          size="small"
        />
        <el-input
          v-model="config.hotbar.standard[1]" type="number" style="width:2.5rem" min="1" max="12"
          size="small"
        />
        <el-popover trigger="hover" content="壹之牙·咬创的热键栏位置，例如2-1，代表热键栏2的编号1位置。">
          <template #reference>
            <svg
              t="1717309838763" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
              p-id="1460" width="16" height="16" flex
            >
              <path
                d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"
                p-id="1461"
              />
              <path
                d="M623.6 316.7C593.6 290.4 554 276 512 276s-81.6 14.5-111.6 40.7C369.2 344 352 380.7 352 420v7.6c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V420c0-44.1 43.1-80 96-80s96 35.9 96 80c0 31.1-22 59.6-56.1 72.7-21.2 8.1-39.2 22.3-52.1 40.9-13.1 19-19.9 41.8-19.9 64.9V620c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8v-22.7c0-19.7 12.4-37.7 30.9-44.8 59-22.7 97.1-74.7 97.1-132.5 0.1-39.3-17.1-76-48.3-103.3z"
                p-id="1462"
              />
              <path d="M512 732m-40 0a40 40 0 1 0 80 0 40 40 0 1 0-80 0Z" p-id="1463" />
            </svg>
          </template>
        </el-popover>
      </el-form-item>
      <el-form-item label="壹之牙·惨毒热键栏">
        <el-input
          v-model="config.hotbar.technical[0]" type="number" style="width:2.5rem" min="1" max="10"
          size="small"
        />
        <el-input
          v-model="config.hotbar.technical[1]" type="number" style="width:2.5rem" min="1" max="12"
          size="small"
        />
        <el-popover trigger="hover" content="壹之牙·惨毒的热键栏位置，例如2-2，代表热键栏2的编号2位置。">
          <template #reference>
            <svg
              t="1717309838763" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
              p-id="1460" width="16" height="16" flex
            >
              <path
                d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"
                p-id="1461"
              />
              <path
                d="M623.6 316.7C593.6 290.4 554 276 512 276s-81.6 14.5-111.6 40.7C369.2 344 352 380.7 352 420v7.6c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V420c0-44.1 43.1-80 96-80s96 35.9 96 80c0 31.1-22 59.6-56.1 72.7-21.2 8.1-39.2 22.3-52.1 40.9-13.1 19-19.9 41.8-19.9 64.9V620c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8v-22.7c0-19.7 12.4-37.7 30.9-44.8 59-22.7 97.1-74.7 97.1-132.5 0.1-39.3-17.1-76-48.3-103.3z"
                p-id="1462"
              />
              <path d="M512 732m-40 0a40 40 0 1 0 80 0 40 40 0 1 0-80 0Z" p-id="1463" />
            </svg>
          </template>
        </el-popover>
      </el-form-item>
    </el-form>
    作者：<a href="https://github.com/GooeyNyan" target="_blank">GooeyNyan</a>
  </div>
</template>

<style scoped lang='scss'></style>
