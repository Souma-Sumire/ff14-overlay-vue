<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import type { RequestBatchRequest } from 'obs-websocket-js'
import type { Reactive } from 'vue'
import type { ContentUsedType } from '@/composables/useZone'
import OBSWebSocket from 'obs-websocket-js'
import { useI18n } from 'vue-i18n'
import { useDevMode } from '@/composables/useDevMode'
import { CONTENT_TYPES, useZone } from '@/composables/useZone'
import ZoneInfo from '@/resources/zoneInfo'
import logDefinitions from '../../cactbot/resources/netlog_defs'
import NetRegexes, { commonNetRegex } from '../../cactbot/resources/netregexes'
import {
  addOverlayListener,
  callOverlayHandler,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'

const { t } = useI18n()
interface Settings {
  type: ContentUsedType
  enter: boolean
  countdown: boolean
  countdownCancel: boolean
  combatStart: boolean
  combatEnd: boolean
  wipe: boolean
  partyLength: number
}
type ConditionType
  = | 'enter'
    | 'combatStart'
    | 'combatEnd'
    | 'countdown'
    | 'countdownCancel'
    | 'wipe'

const { zoneType } = useZone()

const userConfig = useStorage(
  'obs-user-config',
  { host: 4455, password: '', path: '', fileName: '' },
  localStorage,
  { writeDefaults: true },
)
const userContentSetting = useStorage(
  'obs-user-content-setting',
  [] as Settings[],
)
const isFirstTime = useStorage('obs-is-first-time', true)
const actReady = ref(false)
const dev = useDevMode()
const partyLength = ref(1)

function checkWebSocket(): Promise<void> {
  if (dev.value)
    return Promise.resolve()
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
  countdownCancel: NetRegexes.countdownCancel(),
  wipe: commonNetRegex.wipe,
} as const

const DEFAULT_ENABLE_SETTINGS = {
  enter: false,
  countdown: true,
  countdownCancel: true,
  combatStart: true,
  combatEnd: true,
  wipe: true,
  partyLength: 4,
}
const DEFAULT_DISABLE_SETTINGS = {
  enter: false,
  countdown: false,
  countdownCancel: false,
  combatStart: false,
  combatEnd: false,
  wipe: false,
  partyLength: 1,
}

function initializeContentSettings() {
  const defaultEnabled: ContentUsedType[] = [
    'Savage',
    'Extreme',
    'Ultimate',
    'Chaotic',
    'OccultCrescent',
    'Default',
  ]
  if (isFirstTime.value) {
    isFirstTime.value = false
    userContentSetting.value = [
      ...defaultEnabled.map(type => ({ type, ...DEFAULT_ENABLE_SETTINGS })),
      ...CONTENT_TYPES.filter(type => !defaultEnabled.includes(type)).map(
        type => ({ type, ...DEFAULT_DISABLE_SETTINGS }),
      ),
    ]
  }
  else {
    // 清理不存在的类型
    userContentSetting.value = userContentSetting.value.filter(item =>
      CONTENT_TYPES.includes(item.type),
    )
    // 加入缺少的类型
    const missingTypes = CONTENT_TYPES.filter(
      type =>
        !userContentSetting.value.some(item => item.type === type)
        && type !== 'Default',
    ).map((v) => {
      return defaultEnabled.includes(v)
        ? { type: v, ...DEFAULT_ENABLE_SETTINGS }
        : { type: v, ...DEFAULT_DISABLE_SETTINGS }
    })
    userContentSetting.value.push(...missingTypes)
  }
  userContentSetting.value.sort(
    (a, b) => CONTENT_TYPES.indexOf(a.type) - CONTENT_TYPES.indexOf(b.type),
  )
  // 补全可能因新增而缺失的设置项
  userContentSetting.value = userContentSetting.value.map(item => ({
    ...(defaultEnabled.includes(item.type)
      ? DEFAULT_ENABLE_SETTINGS
      : DEFAULT_DISABLE_SETTINGS),
    ...item,
  }))
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
    Log('OBS connection error')
    this.status.connecting = false
    this.status.connected = false
    this.status.recording = false
    this.status.outputActive = false
    this.status.outputPath = ''
    // VxeUI.modal.close()
    // VxeUI.modal.message({
    //   title: t('OBS Connection'),
    //   content: t('OBS Connection Error'),
    //   status: 'warning',
    //   duration: 2000,
    // })
  }

  handleConnectionClosed = () => {
    Log('OBS connection closed')
    this.status.connecting = false
    this.status.connected = false
    this.status.recording = false
    this.status.outputActive = false
    this.status.outputPath = ''
    // VxeUI.modal.close()
    // VxeUI.modal.message({
    //   title: t('OBS Connection'),
    //   content: t('OBS Connection Closed'),
    //   status: 'warning',
    //   duration: 2000,
    // })
  }

  handleRecordStateChanged = (e: {
    outputActive: boolean
    outputState: string
    outputPath: string
  }) => {
    this.status.connected = true
    this.status.recording = e.outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED'
    this.status.outputActive = e.outputActive
    this.status.outputPath = e.outputPath || ''
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
    this.ws.on('RecordStateChanged', this.handleRecordStateChanged)
  }

  connect(callback?: () => void) {
    Log('Attempting to connect to OBS')
    if (!(userConfig.value.host && userConfig.value.password)) {
      return
    }
    if (this.status.connecting) {
      return
    }
    this.status.connecting = true
    this.ws
      .connect(
        `ws://127.0.0.1:${userConfig.value.host}`,
        userConfig.value.password,
      )
      .then(() => {
        this.ws.call('GetRecordStatus').then((v) => {
          this.status.recording = v.outputActive
          this.status.outputActive = v.outputActive
        })
        this.status.connected = true
        // VxeUI.modal.close()
        // VxeUI.modal.message({
        //   title: t('OBS Connection'),
        //   content: t('OBS Connection Opened'),
        //   status: 'success',
        //   duration: 2000,
        // })
        if (callback) {
          callback()
        }
      })
      .finally(() => {
        this.status.connecting = false
        if (!userConfig.value.path && this.status.connected) {
          this.ws.call('GetRecordDirectory').then((v) => {
            if (v.recordDirectory) {
              userConfig.value.path = v.recordDirectory
            }
          })
        }
        if (!userConfig.value.fileName) {
          userConfig.value.fileName = '%CCYY-%MM-%DD %hh-%mm-%ss'
        }
      })
  }

  disconnect() {
    Log('Disconnecting from OBS')
    this.ws.disconnect()
  }

  async startRecord() {
    Log('Starting recording')
    await this.setProfileParameter()
    this.ws.call('StartRecord')
  }

  stopRecord() {
    Log('Stopping recording')
    this.ws.call('StopRecord')
  }

  splitRecord() {
    Log('Splitting recording')
    this.ws.call('StopRecord').finally(() => {
      setTimeout(() => {
        this.ws.call('StartRecord')
      }, 1000)
    })
  }

  async setProfileParameter() {
    const filePath = userConfig.value.path
    const fileName = userConfig.value.fileName
    const requests: RequestBatchRequest[] = []
    requests.push({
      requestType: 'SetProfileParameter',
      requestData: {
        parameterCategory: 'AdvOut',
        parameterName: 'RecFilePath',
        parameterValue: filePath,
      },
    })
    requests.push({
      requestType: 'SetProfileParameter',
      requestData: {
        parameterCategory: 'Output',
        parameterName: 'FilenameFormatting',
        parameterValue: fileName,
      },
    })
    userConfig.value.path = filePath
    userConfig.value.fileName = fileName
    return this.ws.callBatch(requests)
  }
}

const obs = new Obs()

const handleChangeZone: EventMap['ChangeZone'] = (e) => {
  Log('Zone changed:', e)
  const zoneID = e.zoneID
  const zoneInfo = ZoneInfo[zoneID]
  if (zoneInfo === undefined) {
    return
  }
  checkCondition('enter')
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  const line = e.rawLine
  for (const regexName in REGEXES) {
    const regex = REGEXES[regexName]
    const match = regex.exec(line)
    if (match) {
      const splitLine = line.split('|')
      switch (regexName) {
        case 'inCombat': {
          const inACTCombat
            = splitLine[logDefinitions.InCombat.fields.inACTCombat] === '1'
          const inGameCombat
            = splitLine[logDefinitions.InCombat.fields.inGameCombat] === '1'
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
        case 'countdown': {
          checkCondition('countdown')
          break
        }
        case 'countdownCancel': {
          checkCondition('countdownCancel')
          break
        }
        case 'wipe': {
          checkCondition('wipe')
          break
        }
        default:
          break
      }
    }
  }
}

function Log(...args: any[]) {
  if (dev.value) {
    // eslint-disable-next-line no-console
    console.log('[OBS Auto Record]', ...args)
  }
}

function checkCondition(condition: ConditionType) {
  Log('checkCondition', condition)

  const rule = userContentSetting.value.find(item => item.type === zoneType.value)

  if (!rule) {
    console.error('Rule not found for zone type:', zoneType.value)
    return
  }

  if (!rule[condition]) {
    // 如果当前条件不满足，则不进行录制
    Log('Condition not met:', condition)
    return
  }
  Log('Condition met:', condition, 'for zone type:', zoneType.value)

  if (rule.enter === false && condition === 'enter' && obs.status.recording) {
    // 上一次录制战斗通关，则这次切换场地（且不需要切割）时结束录制。
    obs.stopRecord()
    return
  }

  switch (condition) {
    case 'enter':
    case 'countdown':
    case 'combatStart':
      if (partyLength.value < rule.partyLength) {
        // 如果当前玩家人数小于设置的最小人数，则不进行录制。
        return
      }
      if (!obs.status.connected) {
        obs.connect(() => {
          obs.startRecord()
        })
        return
      }

      // 未录制，则开始录制
      if (obs.status.recording === false) {
        obs.startRecord()
        return
      }

      // 已在录制，则切割录制
      // 但排除combatStart，因为如果战斗开始时已经在录制了，表明目前处于由倒计时发起的录制动作中，我们不希望倒计时过程会单独被分割出来。
      if (obs.status.recording === true && condition !== 'combatStart') {
        obs.splitRecord()
      }
      return
    case 'countdownCancel':
    case 'combatEnd':
    case 'wipe':
      if (obs.status.recording) {
        obs.stopRecord()
      }
  }
}

const handlePartyChanged: EventMap['PartyChanged'] = (ev) => {
  Log('Party changed:', ev)
  partyLength.value = ev.party.map(v => v.inParty)?.length || 1
}

onMounted(async () => {
  await checkWebSocket()
  obs.connect()
  addOverlayListener('ChangeZone', handleChangeZone)
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('PartyChanged', handlePartyChanged)
  initializeContentSettings()
})

onUnmounted(() => {
  obs.disconnect()
  removeOverlayListener('ChangeZone', handleChangeZone)
  removeOverlayListener('LogLine', handleLogLine)
})
</script>

<template>
  <CommonActWrapper>
    <div class="obs-container">
      <header>
        <h1>{{ t("OBS Auto Record V2") }}</h1>
        <CommonLanguageSwitcher />
      </header>
      <el-card v-if="!actReady || dev" class="act-not-ready-card">
        <template #header>
          <div class="card-header">
            <span>{{ t("ACT Not Ready") }}</span>
          </div>
        </template>
        <div class="act-not-ready-content">
          <p>{{ t("overlayTutorial") }}</p>
        </div>
      </el-card>

      <main v-if="actReady || dev">
        <!-- 连接表单 -->
        <el-card v-if="!obs.status.connected && !dev" class="connection-card">
          <template #header>
            <div class="card-header">
              <span>{{ t("Connect to OBS") }}</span>
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
                type="primary" class="connect-button" :loading="obs.status.connecting"
                :disabled="obs.status.connecting || !userConfig.host" @click="obs.connect()"
              >
                {{ obs.status.connecting ? t("Connecting") : t("Connect") }}
              </el-button>
            </el-form-item>
          </el-form>
          <el-divider>{{ t("Instructions") }}</el-divider>
          <el-alert class="instruction-alert" type="info" :description="t('obsTutorial')" :closable="false" show-icon />
          <el-alert class="instruction-alert" type="info" :description="t('inputTutorial')" :closable="false" show-icon />
          <el-alert
            class="instruction-alert" type="info" :description="t('firewallTutorial')" :closable="false"
            show-icon
          />
        </el-card>

        <!-- 已连接状态 -->
        <div v-else>
          <el-alert class="instruction-alert" type="info" :description="t('hideTutorial')" :closable="false" show-icon />
          <el-card v-if="dev" class="status-card">
            <template #header>
              <div class="card-header">
                <span>{{ t("Connection Status") }}</span>
                <el-button type="danger" size="small" class="disconnect-button" @click="obs.disconnect()">
                  {{ t("Disconnect") }}
                </el-button>
              </div>
            </template>
            <div class="status-info">
              <el-descriptions direction="vertical" :column="1" border>
                <el-descriptions-item :label="t('Recording')">
                  {{ obs.status.recording ? t("Yes") : t("No") }}
                </el-descriptions-item>
                <el-descriptions-item :label="t('Output Path')">
                  {{ obs.status.outputPath || t("None") }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
            <div class="button-container">
              <el-button
                :disabled="!obs.status.connected || obs.status.recording" type="primary"
                @click="obs.startRecord()"
              >
                {{ t("Start Record") }}
              </el-button>
              <el-button
                :disabled="!obs.status.connected || !obs.status.recording" type="danger"
                @click="obs.stopRecord()"
              >
                {{ t("Stop Record") }}
              </el-button>
              <el-button
                :disabled="!obs.status.connected || !obs.status.recording" type="warning"
                @click="obs.splitRecord()"
              >
                {{ t("Split Record") }}
              </el-button>
              <el-button type="primary" @click="obs.setProfileParameter()">
                {{ t("Set Recording Name") }}
              </el-button>
            </div>
          </el-card>
          <el-card class="profile-card">
            <template #header>
              <div class="card-header">
                <span>{{ t("Recording Profile") }}</span>
              </div>
            </template>
            <div class="profile-info">
              <el-form label-position="top" class="content-form">
                <el-form-item :label="t('Record Path')">
                  <el-input v-model="userConfig.path" :placeholder="t('recordPathPlaceholder')" />
                  <div class="file-path-explanation">
                    {{ t("filePathExplanation") }}
                  </div>
                </el-form-item>
                <el-form-item :label="t('Record File Name')">
                  <el-input v-model="userConfig.fileName" :placeholder="t('recordFileNamePlaceholder')" />
                  <div class="file-name-explanation">
                    {{ t("fileNameExplanation") }}
                  </div>
                </el-form-item>
              </el-form>
            </div>
          </el-card>
          <el-card class="table-card">
            <template #header>
              <div class="card-header">
                <span>{{ t("User Content Settings") }}</span>
              </div>
            </template>
            <el-table :data="userContentSetting" style="width: 100%" :border="true" stripe>
              <el-table-column prop="type" :label="t('Type')" min-width="120" fixed>
                <template #default="scope">
                  <span>{{ t(scope.row.type) }}</span>
                </template>
              </el-table-column>
              <el-table-column :label="t('Start When')" align="center">
                <el-table-column :label="t('When Party')" align="center" min-width="110">
                  <template #default="scope">
                    <el-input-number
                      v-model="scope.row.partyLength" :min="1" :max="8" style="width: 85px" size="small"
                      class="party-length-input"
                    />
                  </template>
                </el-table-column>
                <el-table-column prop="enter" :label="t('Enter Zone')" align="center" min-width="95">
                  <template #default="scope">
                    <el-switch v-model="scope.row.enter" />
                  </template>
                </el-table-column>
                <el-table-column prop="countdown" :label="t('CountDown')" align="center" min-width="95">
                  <template #default="scope">
                    <el-switch v-model="scope.row.countdown" />
                  </template>
                </el-table-column>
                <el-table-column prop="combatStart" :label="t('CombatStart')" align="center" min-width="95">
                  <template #default="scope">
                    <el-switch v-model="scope.row.combatStart" />
                  </template>
                </el-table-column>
              </el-table-column>
              <el-table-column :label="t('End When')" align="center">
                <el-table-column prop="combatEnd" :label="t('CombatEnd')" align="center" min-width="95">
                  <template #default="scope">
                    <el-switch v-model="scope.row.combatEnd" />
                  </template>
                </el-table-column>
                <el-table-column prop="wipe" :label="t('Wipe')" align="center" min-width="95">
                  <template #default="scope">
                    <el-switch v-model="scope.row.wipe" />
                  </template>
                </el-table-column>
                <el-table-column prop="countdown" :label="t('CountDownCancel')" align="center" min-width="95">
                  <template #default="scope">
                    <el-switch v-model="scope.row.countdownCancel" />
                  </template>
                </el-table-column>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </main>
    </div>
  </CommonActwrapper>
</template>

<style scoped lang="scss">
:global(:-webkit-scrollbar) {
  display: none;
}

.obs-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #dcdfe6;
}

h1 {
  font-size: 24px;
  color: #303133;
}

.act-not-ready-card,
.connection-card,
.status-card,
.table-card,
.profile-card {
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.connection-form {
  padding: 5px;
}

.connect-button {
  width: 100%;
  margin-top: 10px;
}

.card-header {
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.instruction-alert {
  margin-top: 15px;
  margin-bottom: 15px;
}

.status-info {
  margin-bottom: 20px;
}

.status-card {
  margin-top: 20px;
}

.button-container {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.button-container .el-button:first-child {
  margin-left: 12.5px;
}

.button-container .el-button {
  flex: 1;
  min-width: 120px;
}

.file-path-explanation,
.file-name-explanation {
  font-size: 12px;
  color: #909399;
}

.act-not-ready-card,
.connection-card {
  max-width: 100%;
}
</style>
