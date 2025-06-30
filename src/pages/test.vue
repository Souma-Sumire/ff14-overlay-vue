<!-- eslint-disable no-console -->
<script setup lang="ts">
import type { EventMap } from '../../cactbot/types/event'
import { useWebSocket } from '@/utils/useWebSocket'
import NetRegexes from '../../cactbot/resources/netregexes'
import {
  addOverlayListener,
  callOverlayHandler,
} from '../../cactbot/resources/overlay_plugin_api'
import UserConfig from '../../cactbot/resources/user_config'

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

const events = ref({
  ChangePrimaryPlayer: {
    title: '当前角色',
    instruction: '切换角色以触发事件',
  },
  ChangeZone: {
    title: '当前区域',
    instruction: '移动一次区域以触发事件',
  },
  CombatData: {
    title: '战斗信息',
    instruction: '进入战斗以触发事件',
  },
  EnmityTargetData: {
    title: '目标信息',
    instruction: '选中一个目标以触发事件',
  },
  PartyChanged: {
    title: '队伍列表',
    instruction: '切换职业/组成小队以触发事件',
  },
  onGameExistsEvent: {
    title: '游戏存在',
    instruction: '打开游戏以触发事件',
  },
  onGameActiveChangedEvent: {
    title: '游戏活动状态',
    instruction: '操作游戏以触发事件',
  },
  onInCombatChangedEvent: {
    title: '战斗状态',
    instruction: '进入战斗以触发事件',
  },
  onZoneChangedEvent: {
    title: '区域变化',
    instruction: '移动一次区域以触发事件',
  },
  onPlayerDied: {
    title: '玩家死亡',
    instruction: '死一次以触发事件',
  },
  onPlayerChangedEvent: {
    title: '玩家变化',
    instruction: '移动角色以触发事件',
  },
})

UserConfig.getUserConfigLocation('soumatest', options, () => {
  userConfig.value.ParserLanguage = options.ParserLanguage!
  userConfig.value.DisplayLanguage = options.DisplayLanguage!
  userConfig.value.SystemInfo = options.SystemInfo!
  userConfig.value.CactbotUserDirectory = (
    UserConfig.savedConfig.general as { [key: string]: any }
  ).CactbotUserDirectory! as string
  userConfig.value.DefaultAlertOutput = (
    UserConfig.savedConfig.raidboss as { [key: string]: any }
  ).DefaultAlertOutput! as string
})

const eventEventRes: Ref<{ [key: string]: any }> = ref({})

function onEvent(ev: any) {
  if (ev.type === 'EnmityTargetData' && !ev.Target) {
    return
  }
  const { type, ...ev2 } = { ...ev }
  void type
  eventEventRes.value[ev.type] = ev2
}

const netRegexes = ref({
  changeZone: { title: 'Line 01 (0x01): ChangeZone', instruction: '切换地图', regex: NetRegexes.changeZone() },
  addedCombatant: { title: 'Line 03 (0x03): AddCombatant', instruction: '切换地图', regex: NetRegexes.addedCombatant() },
  removingCombatant: { title: 'Line 04 (0x04): RemoveCombatant', instruction: '切换地图', regex: NetRegexes.removingCombatant() },
  startsUsing: { title: 'Line 20 (0x14): NetworkStartsCasting', instruction: '读条技能', regex: NetRegexes.startsUsing() },
  ability: { title: 'Line 21 (0x15): NetworkAbility', instruction: '使用技能', regex: NetRegexes.ability() },
  networkDoT: { title: 'Line 24 (0x18): NetworkDoT', instruction: '获得 DoT/Hot 效果', regex: NetRegexes.networkDoT() },
  wasDefeated: { title: 'Line 25 (0x19): NetworkDeath', instruction: '被击倒', regex: NetRegexes.wasDefeated() },
  gainsEffect: { title: 'Line 26 (0x1A): NetworkBuff', instruction: '获得buff', regex: NetRegexes.gainsEffect() },
  headMarker: { title: 'Line 27 (0x1B): NetworkTargetIcon', instruction: '获得头顶点名（分摊/分散/死刑/麻将）', regex: NetRegexes.headMarker() },
  losesEffect: { title: 'Line 30 (0x1E): NetworkBuffRemove', instruction: '失去buff', regex: NetRegexes.losesEffect() },
  network6d: { title: 'Line 33 (0x21): Network6D', instruction: '打本触发（本越新越好）', regex: NetRegexes.network6d() },
  tether: { title: 'Line 35 (0x23): NetworkTether', instruction: '获得连线效果', regex: NetRegexes.tether() },
  map: { title: 'Line 40 (0x28): Map', instruction: '切换地图', regex: NetRegexes.map() },
  systemLogMessage: { title: 'Line 41 (0x29): SystemLogMessage', instruction: '系统日志信息', regex: NetRegexes.systemLogMessage() },
})

const overlayPluginLogRegexes = ref({
  mapEffect: { title: 'Line 257 (0x101): MapEffect', instruction: '打本触发（本越新越好）', regex: NetRegexes.mapEffect() },
  inCombat: { title: 'Line 260 (0x104): InCombat', instruction: '进入战斗', regex: NetRegexes.inCombat() },
  combatantMemory: { title: 'Line 261 (0x105): CombatantMemory', instruction: '打本触发（本越新越好）', regex: NetRegexes.combatantMemory() },
  startsUsingExtra: { title: 'Line 263 (0x107): StartsUsingExtra', instruction: '读条技能', regex: NetRegexes.startsUsingExtra() },
  abilityExtra: { title: 'Line 264 (0x108): AbilityExtra', instruction: '使用技能', regex: NetRegexes.abilityExtra() },
  countdown: { title: 'Line 268 (0x10C): Countdown', instruction: '开启倒计时', regex: NetRegexes.countdown() },
  actorMove: { title: 'Line 270 (0x10E): ActorMove', instruction: '打本触发（本越新越好）', regex: NetRegexes.actorMove() },
  actorSetPos: { title: 'Line 271 (0x10F): ActorSetPos', instruction: '打本触发（本越新越好）', regex: NetRegexes.actorSetPos() },
  actorControlExtra: { title: 'Line 273 (0x111): ActorControlExtra', instruction: '打本触发（本越新越好）', regex: NetRegexes.actorControlExtra() },
})

const onLogLine: EventMap['LogLine'] = (ev) => {
  for (const key in netRegexes.value) {
    const regex = netRegexes.value[key as keyof typeof netRegexes.value].regex
    if (regex.test(ev.rawLine)) {
      eventEventRes.value[key as keyof typeof netRegexes.value] = true
    }
  }
  for (const key in overlayPluginLogRegexes.value) {
    const regex = overlayPluginLogRegexes.value[key as keyof typeof overlayPluginLogRegexes.value].regex
    if (regex.test(ev.rawLine)) {
      eventEventRes.value[key as keyof typeof overlayPluginLogRegexes.value] = true
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
            自助测试页
          </h1>
        </div>
        <div style="text-align: right">
          <p style="margin: 0; font-size: 15px">
            <i class="el-icon-time" /> 系统时间: {{ systemTime || "无数据" }}
          </p>
          <el-button type="primary" size="small" @click="tts(`测试TTS${new Date().getTime().toString().slice(-4)}`)">
            <i class="el-icon-microphone" /> 测试TTS
          </el-button>
        </div>
      </div>

      <!-- 用户配置 -->
      <div class="section">
        <div class="section-title">
          <i class="el-icon-setting" /> 用户配置信息
        </div>
        <el-row :gutter="12">
          <el-col :span="24">
            <el-card shadow="hover">
              <div class="info-table">
                <div
                  v-for="(value, label) in {
                    'ACT版本': userConfig.SystemInfo.actVersion,
                    '解析插件版本': userConfig.SystemInfo.ffxivPluginVersion,
                    'OverlayPlugin版本': userConfig.SystemInfo.overlayPluginVersion,
                    'Cactbot版本': userConfig.SystemInfo.cactbotVersion,
                    '解析语言': userConfig.ParserLanguage,
                    'Cactbot 显示语言': userConfig.DisplayLanguage,
                    '游戏区域': userConfig.SystemInfo.gameRegion,
                    'Raidboss 默认输出': userConfig.DefaultAlertOutput,
                    '用户文件夹': userConfig.CactbotUserDirectory,
                  }" :key="label" class="info-row"
                >
                  <div class="info-key">
                    {{ label }}
                  </div>
                  <div class="info-val" :class="{ 'no-data': !value }">
                    {{ value || '无数据' }}
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- ACT 网络日志测试 -->
      <div class="section">
        <div class="section-title">
          <i class="el-icon-document" /> ACT 网络日志测试（常用部分）
        </div>
        <div class="header-tip">
          如果无法触发这部分事件，说明你需要更新解析插件。
        </div>
        <el-row :gutter="12">
          <el-col v-for="(event, key) in netRegexes" :key="key" :xs="24" :sm="12" :md="8" :lg="6">
            <el-card class="event-card" :class="eventEventRes[key] ? 'success' : 'danger'">
              <div class="card-title">
                {{ netRegexes[key].title }}
                <el-tag :type="eventEventRes[key] ? 'success' : 'danger'" size="small">
                  {{ eventEventRes[key] ? '成功' : '未触发' }}
                </el-tag>
              </div>
              <div class="event-content">
                {{ eventEventRes[key] ? '' : '请尝试：' }}{{ event.instruction }}
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- OverlayPlugin事件 -->
      <div class="section">
        <div class="section-title">
          <i class="el-icon-s-data" /> OverlayPlugin 事件测试（常用部分）
        </div>
        <div class="header-tip">
          如果无法触发这部分事件，说明你需要更新 OverlayPlugin 插件。
        </div>
        <el-row :gutter="12">
          <el-col v-for="(event, key) in events" :key="key" :xs="24" :sm="12" :md="8" :lg="6">
            <el-card class="event-card" :class="eventEventRes[key] ? 'success' : 'danger'">
              <div class="card-title">
                {{ event.title }}（{{ key }}）
                <el-tag :type="eventEventRes[key] ? 'success' : 'danger'" size="small">
                  {{ eventEventRes[key] ? '成功' : '未触发' }}
                </el-tag>
              </div>
              <div class="event-content">
                {{ eventEventRes[key] ? '' : '请尝试：' }}{{ event.instruction }}
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- OverlayPlugin 日志测试 -->
      <div class="section">
        <div class="section-title">
          <i class="el-icon-cpu" /> OverlayPlugin 日志测试（常用部分）
        </div>
        <div class="header-tip">
          如果无法触发这部分事件，说明你需要更新 OverlayPlugin插件。
        </div>
        <el-row :gutter="12">
          <el-col v-for="(event, key) in overlayPluginLogRegexes" :key="key" :xs="24" :sm="12" :md="8" :lg="6">
            <el-card class="event-card" :class="eventEventRes[key] ? 'success' : 'danger'">
              <div class="card-title">
                {{ overlayPluginLogRegexes[key].title }}
                <el-tag :type="eventEventRes[key] ? 'success' : 'danger'" size="small">
                  {{ eventEventRes[key] ? '成功' : '未触发' }}
                </el-tag>
              </div>
              <div class="event-content">
                {{ eventEventRes[key] ? '' : '请尝试：' }}{{ event.instruction }}
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>
    <div v-else>
      <p>等待 WebSocket 连接...</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
body {
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  background-color: #f5f7fa;
  margin: 0;
  padding: 20px;
  color: #333;
}

.container {
  max-width: 1280px;
  margin: auto;
  background: white;
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
  background-color: #f0fff4;
}

.event-card.danger {
  border-left: 3px solid #f56c6c;
  background-color: #fff0f0;
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
  background: #f8f8f8;
  border-radius: 4px;
  border-left: 4px solid #409eff;
}

.info-key {
  font-weight: 500;
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.info-val {
  font-size: 13px;
  color: #303133;
  font-family: monospace;
  word-break: break-all;
  text-align: right;
}

.info-val.no-data {
  color: #f56c6c;
  font-style: italic;
}
</style>
