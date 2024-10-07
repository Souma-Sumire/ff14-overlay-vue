<script setup lang="ts">
import OBSWebSocket from 'obs-websocket-js'
import { VxeUI } from 'vxe-table'
import type { Reactive } from 'vue'
import type { EventMap } from 'cactbot/types/event'
import { useI18n } from 'vue-i18n'
import ContentType from '../../cactbot/resources/content_type'
import { addOverlayListener, callOverlayHandler, removeOverlayListener } from '../../cactbot/resources/overlay_plugin_api'
import NetRegexes, { commonNetRegex } from '../../cactbot/resources/netregexes'
import logDefinitions from '../../cactbot/resources/netlog_defs'
import ZoneInfo from '@/resources/zoneInfo'

/*
  TODO:
  [ ] 设置录像文件名的格式
  [ ] 设置录像路径，不同区域录像文件分开存放
*/

const { t } = useI18n()
interface Settings { type: ContentUsedType, enter: boolean, countdown: boolean, combatStart: boolean, combatEnd: boolean, wipe: boolean }
type ConditionType = 'enter' | 'combatStart' | 'combatEnd' | 'countdown' | 'wipe'
type ContentUsedType = typeof CONTENT_TYPES[number]
const userConfig = useStorage('obs-user-config', { host: 4455, password: '' })
const userContentSetting = useStorage('obs-user-content-setting', [] as Settings[])
const isFirstTime = useStorage('obs-is-first-time', true)
const actReady = ref(false)
const debug = ref(false)
const playerZoneInfo = ref({} as typeof ZoneInfo[number])

function checkWebSocket(): Promise<void> {
  return new Promise((resolve) => {
    callOverlayHandler({ call: 'cactbotRequestState' }).then(() => {
      actReady.value = true
      resolve()
    })
    setTimeout(() => {
      if (!actReady.value) {
        checkWebSocket()
      }
    }, 3000)
  })
}

const REGEXES: Record<string, RegExp> = {
  inCombat: NetRegexes.inCombat(),
  countdown: NetRegexes.countdown(),
  wipe: commonNetRegex.wipe,
} as const

const CONTENT_TYPES = [
  'Savage', // 零式
  'Extreme', // 歼殛战
  'Ultimate', // 绝境战
  'Dungeons', // 四人副本
  'Raids', // 大型任务
  'Trials', // 讨伐任务
  'VCDungeonFinder', // 多变迷宫
  'DeepDungeons', // 深层迷宫
  'Guildhests', // 行会令
  'DisciplesOfTheLand', // 出海垂钓、云冠群岛
  'Eureka', // 尤雷卡
  'GrandCompany', // 金蝶游乐场
  'QuestBattles', // 任务剧情
  'TreasureHunt', // 挖宝
  'Pvp', // PVP
] as const

function initializeContentSettings() {
  const defaultEnabled: ContentUsedType[] = ['Savage', 'Extreme', 'Ultimate']
  if (isFirstTime.value) {
    isFirstTime.value = false
    // 大型任务、绝境战默认开启
    userContentSetting.value = [
      ...defaultEnabled.map(type => ({ type, enter: false, countdown: true, combatStart: false, combatEnd: true, wipe: true })),
      ...CONTENT_TYPES.filter(type => !defaultEnabled.includes(type)).map(type => ({ type, enter: false, countdown: false, combatStart: false, combatEnd: false, wipe: false })),
    ]
  }
  else {
    // 清理不存在的类型
    userContentSetting.value = userContentSetting.value.filter(item => CONTENT_TYPES.includes(item.type))
    // 加入缺少的类型
    const missingTypes = CONTENT_TYPES.filter(type => !userContentSetting.value.some(item => item.type === type)).map((v) => {
      return defaultEnabled.includes(v) ? { type: v, enter: false, countdown: true, combatStart: false, combatEnd: true, wipe: true } : { type: v, enter: false, countdown: false, combatStart: false, combatEnd: false, wipe: false }
    })
    userContentSetting.value.push(...missingTypes)
  }
  userContentSetting.value.sort((a, b) => CONTENT_TYPES.indexOf(a.type) - CONTENT_TYPES.indexOf(b.type))
}

class Obs {
  ws: OBSWebSocket
  status: Reactive<{
    connecting: boolean
    connected: boolean
    recording: boolean
    outputActive: boolean
    outputPath: string
  }>

  handleConnectionError = () => {
    this.status.connecting = false
    this.status.connected = false
    this.status.recording = false
    this.status.outputActive = false
    this.status.outputPath = ''
    VxeUI.modal.close()
    VxeUI.modal.message({
      title: t('OBS Connection'),
      content: t('OBS Connection Error'),
      status: 'warning',
      duration: 2000,
    })
  }

  handleConnectionClosed = () => {
    this.status.connecting = false
    this.status.connected = false
    this.status.recording = false
    this.status.outputActive = false
    this.status.outputPath = ''
    VxeUI.modal.close()
    VxeUI.modal.message({
      title: t('OBS Connection'),
      content: t('OBS Connection Closed'),
      status: 'warning',
      duration: 2000,
    })
  }

  constructor() {
    this.ws = new OBSWebSocket()
    this.status = reactive({
      connecting: false,
      connected: false,
      recording: false,
      outputActive: false,
      outputPath: '',
    })
    this.ws.on('ConnectionClosed', this.handleConnectionClosed)
    this.ws.on('ConnectionError', this.handleConnectionError)
    this.ws.on('RecordStateChanged', (e) => {
      this.status.connected = true
      this.status.recording = e.outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED'
      this.status.outputActive = e.outputActive
      this.status.outputPath = e.outputPath
    })
  }

  connect() {
    if (!(userConfig.value.host && userConfig.value.password)) {
      return
    }
    this.status.connecting = true
    this.ws.connect(`ws://127.0.0.1:${userConfig.value.host}`, userConfig.value.password).then(() => {
      this.ws.call('GetRecordStatus').then((v) => {
        this.status.recording = v.outputActive
        this.status.outputActive = v.outputActive
      })
      this.status.connected = true
      VxeUI.modal.close()
      VxeUI.modal.message({
        title: t('OBS Connection'),
        content: t('OBS Connection Opened'),
        status: 'success',
        duration: 2000,
      })
    }).finally(() => {
      this.status.connecting = false
    })
  }

  disconnect() {
    this.ws.disconnect()
  }

  startRecord() {
    this.ws.call('StartRecord')
  }

  stopRecord() {
    this.ws.call('StopRecord')
  }

  splitRecord() {
    this.ws.call('StopRecord').finally(() => {
      setTimeout(() => {
        this.ws.call('StartRecord')
      }, 1000)
    })
  }

  // setPath(path: string) {
  //   this.ws.call('SetProfileParameter')
  // }
}

const obs = new Obs()

const handleChangeZone: EventMap['ChangeZone'] = (e) => {
  const zoneID = e.zoneID
  const zoneInfo = ZoneInfo[zoneID]
  playerZoneInfo.value = zoneInfo
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  const line = e.rawLine
  for (const regexName in REGEXES) {
    const regex = REGEXES[regexName]
    const match = regex.exec(line)
    if (match) {
      const splitLine = line.split('|')
      switch (regexName) {
        case 'inCombat':
        {
          const inACTCombat = splitLine[logDefinitions.InCombat.fields.inACTCombat] === '1'
          const inGameCombat = splitLine[logDefinitions.InCombat.fields.inGameCombat] === '1'
          if (inACTCombat && inGameCombat) {
            checkCondition('combatStart')
            return
          }
          if (!inACTCombat && !inGameCombat) {
            checkCondition('combatEnd')
            return
          }
          break
        }
        case 'countdown':
        {
          checkCondition('countdown')
          break
        }
        case 'wipe':
        {
          checkCondition('wipe')
          break
        }
        default:
          break
      }
    }
  }
}

function getZoneType(zoneInfo: (typeof ZoneInfo)[number]): typeof CONTENT_TYPES[number] {
  switch (zoneInfo.contentType) {
    case ContentType.UltimateRaids:
      return 'Ultimate'
    case ContentType.Pvp:
      return 'Pvp'
    case ContentType.DeepDungeons:
      return 'DeepDungeons'
    case ContentType.VCDungeonFinder:
      return 'VCDungeonFinder'
    case ContentType.Trials:
      if (zoneInfo.name.fr?.includes('(extrême)'))
        return 'Extreme'
      return 'Trials'
    case ContentType.Raids:
      if (zoneInfo.name.en?.includes('(Savage)'))
        return 'Savage'
      return 'Raids'
    case ContentType.DisciplesOfTheLand:
      return 'DisciplesOfTheLand'
    case ContentType.Eureka:
      return 'Eureka'
    case ContentType.GrandCompany:
      return 'GrandCompany'
    case ContentType.QuestBattles:
      return 'QuestBattles'
    case ContentType.TreasureHunt:
      return 'TreasureHunt'
    default:
      throw new Error(`Unknown content type: ${zoneInfo.contentType}`)
  }
}

function checkCondition(condition: ConditionType) {
  const recording = obs.status.recording
  const zoneType = getZoneType(playerZoneInfo.value)
  if (!userContentSetting.value.find(item => item.type === zoneType && item[condition])) {
    return
  }
  switch (condition) {
    case 'enter':
    case 'countdown':
    case 'combatStart':
      if (!recording) {
        obs.startRecord()
      }
      else {
        obs.splitRecord()
      }
      return
    case 'combatEnd':
    case 'wipe':
      if (recording) {
        obs.stopRecord()
      }
  }
}

onMounted(async () => {
  await checkWebSocket()
  obs.connect()
  addOverlayListener('ChangeZone', handleChangeZone)
  addOverlayListener('LogLine', handleLogLine)
  initializeContentSettings()
})

onUnmounted(() => {
  obs.disconnect()
  removeOverlayListener('ChangeZone', handleChangeZone)
  removeOverlayListener('LogLine', handleLogLine)
})
</script>

<template>
  <div class="obs-container">
    <header>
      <h1>{{ t('OBS Auto Record V2') }}</h1>
      <LanguageSwitcher />
    </header>
    <el-card v-if="!actReady" class="act-not-ready-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('ACT Not Ready') }}</span>
        </div>
      </template>
      <div class="act-not-ready-content">
        <p>{{ t('overlayTutorial') }}</p>
      </div>
    </el-card>

    <main v-if="actReady">
      <!-- 连接表单 -->
      <el-card v-if="!obs.status.connected" class="connection-card">
        <template #header>
          <div class="card-header">
            <span>{{ t('Connect to OBS') }}</span>
          </div>
        </template>
        <el-form label-position="top" class="connection-form">
          <el-form-item :label="t('Port')">
            <el-input v-model="userConfig.host" :placeholder="t('portPlaceholder')" />
          </el-form-item>
          <el-form-item :label="t('Password')">
            <el-input v-model="userConfig.password" :placeholder="t('passwordPlaceholder')" type="password" />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              class="connect-button"
              :loading="obs.status.connecting"
              :disabled="obs.status.connecting || !userConfig.host || !userConfig.password"
              @click="obs.connect()"
            >
              {{ obs.status.connecting ? t('Connecting') : t('Connect') }}
            </el-button>
          </el-form-item>
        </el-form>
        <el-divider>{{ t('Instructions') }}</el-divider>
        <el-alert
          class="instruction-alert"
          type="info"
          :description="t('obsTutorial')"
          :closable="false"
          show-icon
        />
        <el-alert
          class="instruction-alert"
          type="info"
          :description="t('inputTutorial')"
          :closable="false"
          show-icon
        />
      </el-card>

      <!-- 已连接状态 -->
      <div v-else>
        <el-alert
          class="instruction-alert"
          type="info"
          :description="t('hideTutorial')"
          :closable="false"
          show-icon
        />
        <el-card v-if="debug" class="status-card">
          <template #header>
            <div class="card-header">
              <span>{{ t('Connection Status') }}</span>
              <el-button type="danger" size="small" class="disconnect-button" @click="obs.disconnect()">
                {{ t('Disconnect') }}
              </el-button>
            </div>
          </template>
          <div class="status-info">
            <el-descriptions direction="vertical" :column="1" border>
              <el-descriptions-item :label="t('Recording')">
                {{ obs.status.recording ? t('Yes') : t('No') }}
              </el-descriptions-item>
              <el-descriptions-item :label="t('Output Path')">
                {{ obs.status.outputPath || t('None') }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
          <div class="button-container">
            <el-button
              :disabled="!obs.status.connected || obs.status.recording"
              type="primary"
              @click="obs.startRecord()"
            >
              {{ t('Start Record') }}
            </el-button>
            <el-button
              :disabled="!obs.status.connected || !obs.status.recording"
              type="danger"
              @click="obs.stopRecord()"
            >
              {{ t('Stop Record') }}
            </el-button>
            <el-button
              :disabled="!obs.status.connected || !obs.status.recording"
              type="warning"
              @click="obs.splitRecord()"
            >
              {{ t('Split Record') }}
            </el-button>
          </div>
        </el-card>
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span>{{ t('User Content Settings') }}</span>
            </div>
          </template>
          <el-table :data="userContentSetting" style="width: 100%" :border="true" stripe>
            <el-table-column prop="type" :label="t('Type')" min-width="130">
              <template #default="scope">
                <span>{{ t(scope.row.type) }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="t('Start When')" align="center">
              <el-table-column prop="enter" :label="t('Enter Zone')" align="center" min-width="100">
                <template #default="scope">
                  <el-switch v-model="scope.row.enter" />
                </template>
              </el-table-column>
              <el-table-column prop="countdown" :label="t('CountDown')" align="center" min-width="100">
                <template #default="scope">
                  <el-switch v-model="scope.row.countdown" />
                </template>
              </el-table-column>
              <el-table-column prop="combatStart" :label="t('CombatStart')" align="center" min-width="100">
                <template #default="scope">
                  <el-switch v-model="scope.row.combatStart" />
                </template>
              </el-table-column>
            </el-table-column>
            <el-table-column :label="t('End When')" align="center">
              <el-table-column prop="combatEnd" :label="t('CombatEnd')" align="center" min-width="100">
                <template #default="scope">
                  <el-switch v-model="scope.row.combatEnd" />
                </template>
              </el-table-column>
              <el-table-column prop="wipe" :label="t('Wipe')" align="center" min-width="100">
                <template #default="scope">
                  <el-switch v-model="scope.row.wipe" />
                </template>
              </el-table-column>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </main>
  </div>
</template>

<style>
::-webkit-scrollbar {
  display: none;
}
</style>

<style scoped>
h1{
  padding: 0;
  margin: 0;
}

.obs-container {
  background-color: white;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.act-not-ready-card,
.connection-card {
  max-width: 500px;
  margin: 0 auto 20px;
}

.connection-form {
  margin-bottom: 20px;
}

.connect-button {
  width: 100%;
}

.card-header {
  font-size: 18px;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.instruction-alert {
  margin-top: 10px;
}
.status-card {
  margin-bottom: 20px;
}

.status-info {
  margin-bottom: 20px;
}

.table-card {
  margin-top: 20px;
}

.obs-container {
  padding: 10px;
}

.act-not-ready-card,
.connection-card {
  max-width: 100%;
}
</style>
