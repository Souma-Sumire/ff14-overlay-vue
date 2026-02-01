<!-- eslint-disable no-console -->
<script setup lang="ts">
import type { EventMap } from '../../cactbot/types/event'
import { useLang } from '@/composables/useLang'
import { useWebSocket } from '@/composables/useWebSocket'
import NetRegexes from '../../cactbot/resources/netregexes'
import {
  addOverlayListener,
  callOverlayHandler,
} from '../../cactbot/resources/overlay_plugin_api'
import UserConfig from '../../cactbot/resources/user_config'

const { t } = useLang()

const { wsConnected } = useWebSocket({ addWsParam: true, allowClose: false })

interface Options {
  ParserLanguage: string
  ShortLocale: string
  DisplayLanguage: string
  TextAlertsEnabled: boolean
  SoundAlertsEnabled: boolean
  SpokenAlertsEnabled: boolean
  GroupSpokenAlertsEnabled: boolean
  SystemInfo: SystemInfo
  Debug: boolean
  Language: string
  SystemLocale: string
}

interface SystemInfo {
  cactbotVersion: string
  overlayPluginVersion: string
  ffxivPluginVersion: string
  actVersion: string
  gameRegion: string
}

const options = UserConfig.getDefaultBaseOptions()
const userConfig = ref<
  Options & { CactbotUserDirectory: string, DefaultAlertOutput: string }
>({
  ParserLanguage: '',
  ShortLocale: '',
  DisplayLanguage: '',
  TextAlertsEnabled: false,
  SoundAlertsEnabled: false,
  SpokenAlertsEnabled: false,
  GroupSpokenAlertsEnabled: false,
  SystemInfo: {
    cactbotVersion: '',
    overlayPluginVersion: '',
    ffxivPluginVersion: '',
    actVersion: '',
    gameRegion: '',
  },
  Debug: false,
  Language: '',
  SystemLocale: '',
  CactbotUserDirectory: '',
  DefaultAlertOutput: '',
})
const systemTime = ref('')

const updateTime = () => (systemTime.value = new Date().toLocaleString())
updateTime()
setInterval(updateTime, 1000)

function tts(text: string) {
  callOverlayHandler({
    call: 'cactbotSay',
    text,
  })
}

const events = computed(() => {
  return {
    ChangePrimaryPlayer: {
      title: t('actSelfTest.event.ChangePrimaryPlayer.title'),
      instruction: t('actSelfTest.event.ChangePrimaryPlayer.instruction'),
    },
    ChangeZone: {
      title: t('actSelfTest.event.ChangeZone.title'),
      instruction: t('actSelfTest.event.ChangeZone.instruction'),
    },
    CombatData: {
      title: t('actSelfTest.event.CombatData.title'),
      instruction: t('actSelfTest.event.CombatData.instruction'),
    },
    EnmityTargetData: {
      title: t('actSelfTest.event.EnmityTargetData.title'),
      instruction: t('actSelfTest.event.EnmityTargetData.instruction'),
    },
    PartyChanged: {
      title: t('actSelfTest.event.PartyChanged.title'),
      instruction: t('actSelfTest.event.PartyChanged.instruction'),
    },
    onGameExistsEvent: {
      title: t('actSelfTest.event.onGameExistsEvent.title'),
      instruction: t('actSelfTest.event.onGameExistsEvent.instruction'),
    },
    onGameActiveChangedEvent: {
      title: t('actSelfTest.event.onGameActiveChangedEvent.title'),
      instruction: t('actSelfTest.event.onGameActiveChangedEvent.instruction'),
    },
    onInCombatChangedEvent: {
      title: t('actSelfTest.event.onInCombatChangedEvent.title'),
      instruction: t('actSelfTest.event.onInCombatChangedEvent.instruction'),
    },
    onZoneChangedEvent: {
      title: t('actSelfTest.event.onZoneChangedEvent.title'),
      instruction: t('actSelfTest.event.onZoneChangedEvent.instruction'),
    },
    onPlayerDied: {
      title: t('actSelfTest.event.onPlayerDied.title'),
      instruction: t('actSelfTest.event.onPlayerDied.instruction'),
    },
    onPlayerChangedEvent: {
      title: t('actSelfTest.event.onPlayerChangedEvent.title'),
      instruction: t('actSelfTest.event.onPlayerChangedEvent.instruction'),
    },
  }
})

UserConfig.getUserConfigLocation('soumatest', options, () => {
  userConfig.value.ParserLanguage = options.ParserLanguage!
  userConfig.value.DisplayLanguage = options.DisplayLanguage!
  userConfig.value.SystemInfo = options.SystemInfo!
  userConfig.value.CactbotUserDirectory = (
    UserConfig.savedConfig.general as { [key: string]: unknown }
  ).CactbotUserDirectory! as string
  userConfig.value.DefaultAlertOutput = (
    UserConfig.savedConfig.raidboss as { [key: string]: unknown }
  ).DefaultAlertOutput! as string
})

const eventEventRes: Ref<{ [key: string]: unknown }> = ref({})

function onEvent(ev: any) {
  if (ev.type === 'EnmityTargetData' && !ev.Target) {
    return
  }
  const { type, ...ev2 } = { ...ev }
  void type
  eventEventRes.value[ev.type] = ev2
}

const netRegexes = computed(() => {
  return {
    changeZone: {
      title: 'Line 01 (0x01): ChangeZone',
      instruction: t('actSelfTest.logInstruction.changeZone'),
      regex: NetRegexes.changeZone(),
    },
    addedCombatant: {
      title: 'Line 03 (0x03): AddCombatant',
      instruction: t('actSelfTest.logInstruction.changeZone'),
      regex: NetRegexes.addedCombatant(),
    },
    removingCombatant: {
      title: 'Line 04 (0x04): RemoveCombatant',
      instruction: t('actSelfTest.logInstruction.changeZone'),
      regex: NetRegexes.removingCombatant(),
    },
    startsUsing: {
      title: 'Line 20 (0x14): NetworkStartsCasting',
      instruction: t('actSelfTest.logInstruction.startsUsing'),
      regex: NetRegexes.startsUsing(),
    },
    ability: {
      title: 'Line 21 (0x15): NetworkAbility',
      instruction: t('actSelfTest.logInstruction.ability'),
      regex: NetRegexes.ability(),
    },
    networkDoT: {
      title: 'Line 24 (0x18): NetworkDoT',
      instruction: t('actSelfTest.logInstruction.networkDoT'),
      regex: NetRegexes.networkDoT(),
    },
    wasDefeated: {
      title: 'Line 25 (0x19): NetworkDeath',
      instruction: t('actSelfTest.logInstruction.wasDefeated'),
      regex: NetRegexes.wasDefeated(),
    },
    gainsEffect: {
      title: 'Line 26 (0x1A): NetworkBuff',
      instruction: t('actSelfTest.logInstruction.gainsEffect'),
      regex: NetRegexes.gainsEffect(),
    },
    headMarker: {
      title: 'Line 27 (0x1B): NetworkTargetIcon',
      instruction: t('actSelfTest.logInstruction.headMarker'),
      regex: NetRegexes.headMarker(),
    },
    losesEffect: {
      title: 'Line 30 (0x1E): NetworkBuffRemove',
      instruction: t('actSelfTest.logInstruction.losesEffect'),
      regex: NetRegexes.losesEffect(),
    },
    network6d: {
      title: 'Line 33 (0x21): Network6D',
      instruction: t('actSelfTest.logInstruction.instanceTrigger'),
      regex: NetRegexes.network6d(),
    },
    tether: {
      title: 'Line 35 (0x23): NetworkTether',
      instruction: t('actSelfTest.logInstruction.tether'),
      regex: NetRegexes.tether(),
    },
    map: {
      title: 'Line 40 (0x28): Map',
      instruction: t('actSelfTest.logInstruction.changeZone'),
      regex: NetRegexes.map(),
    },
    systemLogMessage: {
      title: 'Line 41 (0x29): SystemLogMessage',
      instruction: t('actSelfTest.logInstruction.systemLogMessage'),
      regex: NetRegexes.systemLogMessage(),
    },
  }
})

// 國際化 overlayPluginLogRegexes 對象
const overlayPluginLogRegexes = computed(() => {
  return {
    mapEffect: {
      title: 'Line 257 (0x101): MapEffect',
      instruction: t('actSelfTest.logInstruction.instanceTrigger'),
      regex: NetRegexes.mapEffect(),
    },
    inCombat: {
      title: 'Line 260 (0x104): InCombat',
      instruction: t('actSelfTest.logInstruction.inCombat'),
      regex: NetRegexes.inCombat(),
    },
    combatantMemory: {
      title: 'Line 261 (0x105): CombatantMemory',
      instruction: t('actSelfTest.logInstruction.instanceTrigger'),
      regex: NetRegexes.combatantMemory(),
    },
    startsUsingExtra: {
      title: 'Line 263 (0x107): StartsUsingExtra',
      instruction: t('actSelfTest.logInstruction.startsUsing'),
      regex: NetRegexes.startsUsingExtra(),
    },
    abilityExtra: {
      title: 'Line 264 (0x108): AbilityExtra',
      instruction: t('actSelfTest.logInstruction.ability'),
      regex: NetRegexes.abilityExtra(),
    },
    countdown: {
      title: 'Line 268 (0x10C): Countdown',
      instruction: t('actSelfTest.logInstruction.countdown'),
      regex: NetRegexes.countdown(),
    },
    actorMove: {
      title: 'Line 270 (0x10E): ActorMove',
      instruction: t('actSelfTest.logInstruction.instanceTrigger'),
      regex: NetRegexes.actorMove(),
    },
    actorSetPos: {
      title: 'Line 271 (0x10F): ActorSetPos',
      instruction: t('actSelfTest.logInstruction.instanceTrigger'),
      regex: NetRegexes.actorSetPos(),
    },
    actorControlExtra: {
      title: 'Line 273 (0x111): ActorControlExtra',
      instruction: t('actSelfTest.logInstruction.instanceTrigger'),
      regex: NetRegexes.actorControlExtra(),
    },
  }
})

const onLogLine: EventMap['LogLine'] = (ev) => {
  for (const key in netRegexes.value) {
    const regex = netRegexes.value[key as keyof typeof netRegexes.value].regex
    if (regex.test(ev.rawLine)) {
      eventEventRes.value[key as keyof typeof netRegexes.value] = true
    }
  }
  for (const key in overlayPluginLogRegexes.value) {
    const regex
      = overlayPluginLogRegexes.value[
        key as keyof typeof overlayPluginLogRegexes.value
      ].regex
    if (regex.test(ev.rawLine)) {
      eventEventRes.value[key as keyof typeof overlayPluginLogRegexes.value]
        = true
    }
  }
}

addOverlayListener('ChangePrimaryPlayer', onEvent)
addOverlayListener('ChangeZone', onEvent)
addOverlayListener('CombatData', onEvent)
addOverlayListener('EnmityTargetData', onEvent)
addOverlayListener('PartyChanged', onEvent)
addOverlayListener('onGameExistsEvent', onEvent)
addOverlayListener('onGameActiveChangedEvent', onEvent)
addOverlayListener('onInCombatChangedEvent', onEvent)
addOverlayListener('onZoneChangedEvent', onEvent)
addOverlayListener('onPlayerDied', onEvent)
addOverlayListener('onPlayerChangedEvent', onEvent)
addOverlayListener('LogLine', onLogLine)
</script>

<template>
  <div id="app">
    <div v-if="wsConnected" class="container">
      <div class="header">
        <div>
          <h1 style="color: #409eff; margin: 0">
            {{ t('actSelfTest.title') }}
          </h1>
        </div>
        <div style="text-align: right" flex="~ gap-2">
          <i class="el-icon-time" /> {{ t('actSelfTest.systemTime') }}:
          {{ systemTime || t('actSelfTest.noData') }}
          <el-button
            type="primary"
            size="small"
            @click="
              tts(
                t('actSelfTest.ttsText', {
                  time: new Date().getTime().toString().slice(-4),
                }),
              )
            "
          >
            {{ t('actSelfTest.testTtsBtn') }}
          </el-button>
          <CommonThemeToggle storage-key="test-theme" />
          <CommonLanguageSwitcher />
        </div>
      </div>

      <div class="section">
        <div class="section-title">
          <i class="el-icon-setting" />
          {{ t('actSelfTest.configSection.title') }}
        </div>
        <el-row :gutter="12">
          <el-col :span="24">
            <el-card shadow="hover">
              <div class="info-table">
                <div
                  v-for="(value, label) in {
                    [t('actSelfTest.configSection.actVersion')]:
                      userConfig.SystemInfo.actVersion,
                    [t('actSelfTest.configSection.ffxivPluginVersion')]:
                      userConfig.SystemInfo.ffxivPluginVersion,
                    [t('actSelfTest.configSection.overlayPluginVersion')]:
                      userConfig.SystemInfo.overlayPluginVersion,
                    [t('actSelfTest.configSection.cactbotVersion')]:
                      userConfig.SystemInfo.cactbotVersion,
                    [t('actSelfTest.configSection.parserLanguage')]:
                      userConfig.ParserLanguage,
                    [t('actSelfTest.configSection.displayLanguage')]:
                      userConfig.DisplayLanguage,
                    [t('actSelfTest.configSection.gameRegion')]:
                      userConfig.SystemInfo.gameRegion,
                    [t('actSelfTest.configSection.defaultAlertOutput')]:
                      userConfig.DefaultAlertOutput,
                    [t('actSelfTest.configSection.userDirectory')]:
                      userConfig.CactbotUserDirectory,
                  }"
                  :key="label"
                  class="info-row"
                >
                  <div class="info-key">
                    {{ label }}
                  </div>
                  <div class="info-val" :class="{ 'no-data': !value }">
                    {{ value || t('actSelfTest.noData') }}
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <div class="section">
        <div class="section-title">
          <i class="el-icon-document" />
          {{ t('actSelfTest.netLogSection.title') }}
        </div>
        <div class="header-tip">
          {{ t('actSelfTest.netLogSection.tip') }}
        </div>
        <el-row :gutter="12">
          <el-col
            v-for="(event, key) in netRegexes"
            :key="key"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <el-card
              class="event-card"
              :class="eventEventRes[key] ? 'success' : 'danger'"
            >
              <div class="card-title">
                {{ event.title }}
                <el-tag
                  :type="eventEventRes[key] ? 'success' : 'danger'"
                  size="small"
                >
                  {{
                    eventEventRes[key]
                      ? t('actSelfTest.success')
                      : t('actSelfTest.untriggered')
                  }}
                </el-tag>
              </div>
              <div class="event-content">
                {{ eventEventRes[key] ? '' : t('actSelfTest.try') }}
                {{ event.instruction }}
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <div class="section">
        <div class="section-title">
          <i class="el-icon-s-data" />
          {{ t('actSelfTest.opEventSection.title') }}
        </div>
        <div class="header-tip">
          {{ t('actSelfTest.opEventSection.tip') }}
        </div>
        <el-row :gutter="12">
          <el-col
            v-for="(event, key) in events"
            :key="key"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <el-card
              class="event-card"
              :class="eventEventRes[key] ? 'success' : 'danger'"
            >
              <div class="card-title">
                {{ event.title }}（{{ key }}）
                <el-tag
                  :type="eventEventRes[key] ? 'success' : 'danger'"
                  size="small"
                >
                  {{
                    eventEventRes[key]
                      ? t('actSelfTest.success')
                      : t('actSelfTest.untriggered')
                  }}
                </el-tag>
              </div>
              <div class="event-content">
                {{ eventEventRes[key] ? '' : t('actSelfTest.try') }}
                {{ event.instruction }}
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <div class="section">
        <div class="section-title">
          <i class="el-icon-cpu" /> {{ t('actSelfTest.opLogSection.title') }}
        </div>
        <div class="header-tip">
          {{ t('actSelfTest.opLogSection.tip') }}
        </div>
        <el-row :gutter="12">
          <el-col
            v-for="(event, key) in overlayPluginLogRegexes"
            :key="key"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <el-card
              class="event-card"
              :class="eventEventRes[key] ? 'success' : 'danger'"
            >
              <div class="card-title">
                {{ overlayPluginLogRegexes[key].title }}
                <el-tag
                  :type="eventEventRes[key] ? 'success' : 'danger'"
                  size="small"
                >
                  {{
                    eventEventRes[key]
                      ? t('actSelfTest.success')
                      : t('actSelfTest.untriggered')
                  }}
                </el-tag>
              </div>
              <div class="event-content">
                {{ eventEventRes[key] ? '' : t('actSelfTest.try') }}
                {{ event.instruction }}
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>
    <div v-else>
      <p>{{ t('actSelfTest.wsWaiting') }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
body {
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  margin: 0;
  padding: 20px;
  color: #333;
}

.container {
  max-width: 1280px;
  margin: auto;
  border-radius: 8px;
  padding: 16px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section {
  margin-top: 24px;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.section-title i {
  margin-right: 6px;
}

.event-card {
  margin-bottom: 10px;
}

.event-card.success {
  border-left: 3px solid #67c23a;
}

.event-card.danger {
  border-left: 3px solid #f56c6c;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.event-content {
  font-size: 13px;
  line-height: 1.5;
}

.all-passed {
  color: #67c23a;
  font-weight: bold;
  margin-bottom: 8px;
}

.header-tip {
  margin-top: 10px;
  color: #999;
  font-size: 13px;
  font-style: italic;
}

.info-table {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  row-gap: 8px;
  column-gap: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-radius: 4px;
  border-left: 4px solid #409eff;
}

.info-key {
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
}

.info-val {
  font-size: 13px;
  font-family: monospace;
  word-break: break-all;
  text-align: right;
}

.info-val.no-data {
  color: #f56c6c;
  font-style: italic;
}
</style>
