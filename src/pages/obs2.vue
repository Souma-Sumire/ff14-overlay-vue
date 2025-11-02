<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import type { RequestBatchRequest } from 'obs-websocket-js'
import type { Reactive } from 'vue'
import type { ContentUsedType } from '@/composables/useZone'
import OBSWebSocket from 'obs-websocket-js'
import { useDev } from '@/composables/useDev'
import { CONTENT_TYPES, useZone } from '@/composables/useZone'
import logDefinitions from '../../cactbot/resources/netlog_defs'
import NetRegexes, { commonNetRegex } from '../../cactbot/resources/netregexes'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'
import { ElMessage } from 'element-plus'
import { useLang } from '@/composables/useLang'

const { t } = useLang()

interface Settings {
  type: ContentUsedType
  enter: boolean
  countdown: boolean
  countdownCancel: boolean
  combatStart: boolean
  combatEnd: boolean
  wipe: boolean
  partyLength: number
  customPath: string
}
type ConditionType =
  | 'enter'
  | 'combatStart'
  | 'combatEnd'
  | 'countdown'
  | 'countdownCancel'
  | 'wipe'

const { zoneType } = useZone()
const zoneName = useStorage('obs-zone-name', '')

const userConfig = useStorage(
  'obs-user-config',
  {
    host: 4455,
    password: '',
    path: '',
    fileName: '%CCYY-%MM-%DD %hh-%mm-%ss',
    appendContentName: true,
  },
  localStorage,
  { mergeDefaults: true }
)
const userContentSetting = useStorage(
  'obs-user-content-setting',
  [] as Settings[]
)
const dev = useDev()
const partyLength = ref(1)

const REGEXES = {
  inCombat: NetRegexes.inCombat(),
  countdown: NetRegexes.countdown(),
  countdownCancel: NetRegexes.countdownCancel(),
  wipe: commonNetRegex.wipe,
} as const

const DEFAULT_ENABLE_SETTINGS: Omit<Settings, 'type'> = {
  enter: false,
  countdown: true,
  countdownCancel: true,
  combatStart: true,
  combatEnd: true,
  wipe: true,
  partyLength: 4,
  customPath: '',
}
const DEFAULT_DISABLE_SETTINGS: Omit<Settings, 'type'> = {
  enter: false,
  countdown: false,
  countdownCancel: false,
  combatStart: false,
  combatEnd: false,
  wipe: false,
  partyLength: 1,
  customPath: '',
}

function initializeContentSettings() {
  const defaultEnabled: ContentUsedType[] = [
    'Savage',
    'Extreme',
    'Ultimate',
    'Chaotic',
    'OccultCrescent',
    'DeepDungeonExtras',
    'Default',
  ]
  if (userContentSetting.value.length === 0) {
    userContentSetting.value = [
      ...defaultEnabled.map((type) => ({ type, ...DEFAULT_ENABLE_SETTINGS })),
      ...CONTENT_TYPES.filter((type) => !defaultEnabled.includes(type)).map(
        (type) => ({ type, ...DEFAULT_DISABLE_SETTINGS })
      ),
    ]
    const occ = userContentSetting.value.find(
      (v) => v.type === 'OccultCrescent'
    )
    if (occ) {
      occ.partyLength = 40
    }
  } else {
    // 清理不存在的类型
    userContentSetting.value = userContentSetting.value.filter((item) =>
      CONTENT_TYPES.includes(item.type)
    )
    // 加入缺少的类型
    const missingTypes = CONTENT_TYPES.filter(
      (type) =>
        !userContentSetting.value.some((item) => item.type === type) &&
        type !== 'Default'
    ).map((v) => {
      return defaultEnabled.includes(v)
        ? { type: v, ...DEFAULT_ENABLE_SETTINGS }
        : { type: v, ...DEFAULT_DISABLE_SETTINGS }
    })
    userContentSetting.value.push(...missingTypes)
  }
  userContentSetting.value.sort(
    (a, b) => CONTENT_TYPES.indexOf(a.type) - CONTENT_TYPES.indexOf(b.type)
  )
  // 补全可能因新增而缺失的设置项
  userContentSetting.value = userContentSetting.value.map((item) => ({
    ...(defaultEnabled.includes(item.type)
      ? DEFAULT_ENABLE_SETTINGS
      : DEFAULT_DISABLE_SETTINGS),
    ...item,
  }))
  // custom path
  if (userConfig.value.path) {
    userContentSetting.value.forEach((item) => {
      if (item.customPath === '') {
        item.customPath = userConfig.value.path
      }
    })
  }
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
  }

  handleConnectionClosed = () => {
    Log('OBS connection closed')
    this.status.connecting = false
    this.status.connected = false
    this.status.recording = false
    this.status.outputActive = false
    this.status.outputPath = ''
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

  async connect() {
    Log('Connecting to OBS')
    if (!userConfig.value.host) {
      ElMessage({
        type: 'error',
        message: t('obs2.host required'),
      })
      return
    }
    if (this.status.connecting) {
      return
    }
    this.status.connecting = true
    return this.ws
      .connect(
        `ws://127.0.0.1:${userConfig.value.host}`,
        userConfig.value.password
      )
      .then(() => {
        Log('Connected to OBS')
        this.ws.call('GetRecordStatus').then((v) => {
          this.status.recording = v.outputActive
          this.status.outputActive = v.outputActive
        })
        this.status.connected = true
        if (!userConfig.value.path) {
          this.ws.call('GetRecordDirectory').then((v) => {
            if (v.recordDirectory) {
              userConfig.value.path = v.recordDirectory
              userContentSetting.value.forEach((item) => {
                if (item.customPath === '') {
                  item.customPath = v.recordDirectory
                }
              })
            }
          })
        }
        if (!userConfig.value.fileName) {
          userConfig.value.fileName = '%CCYY-%MM-%DD %hh-%mm-%ss'
        }
      })
      .finally(() => {
        this.status.connecting = false
      })
  }

  disconnect() {
    Log('Disconnecting from OBS')
    this.ws.disconnect()
  }

  async startRecord() {
    Log('Starting recording')
    await this.setProfileParameter('start')
    this.ws.call('StartRecord')
  }

  async stopRecord() {
    Log('Stopping recording')
    await this.setProfileParameter('stop')
    return this.ws.call('StopRecord')
  }

  async splitRecord() {
    Log('Splitting recording')
    await this.setProfileParameter('split')
    await this.ws.call('StopRecord')
    setTimeout(() => {
      this.startRecord()
    }, 1000)
  }

  async setProfileParameter(cause: 'start' | 'stop' | 'split') {
    const filePath =
      cause === 'stop'
        ? userConfig.value.path
        : userContentSetting.value.find((item) => item.type === zoneType.value)
            ?.customPath || userConfig.value.path
    const fileName =
      cause === 'stop'
        ? userConfig.value.fileName
        : userConfig.value.fileName +
          (userConfig.value.appendContentName ? ` - ${zoneName.value}` : '')

    const requests: RequestBatchRequest[] = [
      {
        requestType: 'SetProfileParameter',
        requestData: {
          parameterCategory: 'AdvOut',
          parameterName: 'RecFilePath',
          parameterValue: filePath,
        },
      },
      {
        requestType: 'SetProfileParameter',
        requestData: {
          parameterCategory: 'Output',
          parameterName: 'FilenameFormatting',
          parameterValue: fileName,
        },
      },
    ]
    return this.ws.callBatch(requests)
  }
}

const obs = new Obs()

const handleChangeZone: EventMap['ChangeZone'] = (e) => {
  Log('ChangeZone:', e)
  zoneName.value = e.zoneName
  checkCondition('enter')
}

const handleLogLine: EventMap['LogLine'] = (e) => {
  const line = e.rawLine
  for (const regexName in REGEXES) {
    const regex = REGEXES[regexName as keyof typeof REGEXES]
    const match = regex.exec(line)
    if (match) {
      const splitLine = line.split('obs2.|')
      switch (regexName) {
        case 'inCombat': {
          const inACTCombat =
            splitLine[logDefinitions.InCombat.fields.inACTCombat] === '1'
          const inGameCombat =
            splitLine[logDefinitions.InCombat.fields.inGameCombat] === '1'
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

function Log(...args: unknown[]) {
  if (dev.value) {
    console.log('[OBS Auto Record]', ...args)
  }
}

function checkCondition(condition: ConditionType) {
  Log('checkCondition', condition)

  const rule = userContentSetting.value.find(
    (item) => item.type === zoneType.value
  )

  if (!rule) {
    throw new Error('Rule not found for zone type:' + zoneType.value)
  }

  if (rule.enter === false && condition === 'enter' && obs.status.recording) {
    // 上一次录制战斗通关，则这次切换场地（且不需要切割）时结束录制。
    obs.stopRecord()
    return
  }

  if (!rule[condition]) {
    // 如果当前条件不满足，则不进行录制
    Log('Condition not met:', condition)
    return
  }
  Log('Condition met:', condition, 'for zone type:', zoneType.value)

  switch (condition) {
    case 'enter':
    case 'countdown':
    case 'combatStart':
      if (partyLength.value < rule.partyLength) {
        // 如果当前玩家人数小于设置的最小人数，则不进行录制。
        return
      }

      if (!obs.status.connected) {
        obs.connect()?.then(() => {
          if (obs.status.connected) {
            obs.startRecord()
          }
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
        return
      }
      break
    case 'countdownCancel':
    case 'combatEnd':
    case 'wipe':
      if (obs.status.recording) {
        obs.stopRecord()
      }
      break
  }
}

const handlePartyChanged: EventMap['PartyChanged'] = (ev) => {
  Log('Party changed:', ev)
  partyLength.value = ev.party.length || 1
}

onMounted(() => {
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
    <el-alert
      :title="t('obs2.size warning')"
      type="warning"
      center
      show-icon
      :closable="false"
      class="window-size-warning"
    />
    <el-card class="obs-container">
      <el-header>
        <h1>{{ t('obs2.OBS Auto Record V2') }}</h1>
        <div class="button-container">
          <CommonThemeToggle storage-key="obs-2-theme" />
          <CommonLanguageSwitcher />
        </div>
      </el-header>

      <el-main>
        <!-- 连接表单 -->
        <el-card v-if="!obs.status.connected" class="connection-card">
          <template #header>
            <div class="card-header">
              <span>{{ t('obs2.Connect to OBS') }}</span>
            </div>
          </template>
          <el-form label-position="top" class="connection-form">
            <el-form-item :label="t('obs2.Port')">
              <el-input
                v-model="userConfig.host"
                :placeholder="t('obs2.portPlaceholder')"
              />
            </el-form-item>
            <el-form-item :label="t('obs2.Password')">
              <el-input
                v-model="userConfig.password"
                :placeholder="t('obs2.passwordPlaceholder')"
                type="password"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                class="connect-button"
                :loading="obs.status.connecting"
                :disabled="obs.status.connecting || !userConfig.host"
                @click="obs.connect()"
              >
                {{
                  obs.status.connecting
                    ? t('obs2.Connecting')
                    : t('obs2.Connect')
                }}
              </el-button>
            </el-form-item>
          </el-form>
          <el-divider>{{ t('obs2.Instructions') }}</el-divider>
          <el-alert
            class="instruction-alert"
            type="info"
            :description="t('obs2.obsTutorial')"
            :closable="false"
            show-icon
          />
          <el-alert
            class="instruction-alert"
            type="info"
            :description="t('obs2.inputTutorial')"
            :closable="false"
            show-icon
          />
          <el-alert
            class="instruction-alert"
            type="info"
            :description="t('obs2.firewallTutorial')"
            :closable="false"
            show-icon
          />
        </el-card>

        <!-- 已连接状态 -->
        <div v-else>
          <el-alert
            class="instruction-alert"
            type="info"
            :description="t('obs2.hideTutorial')"
            :closable="false"
            show-icon
          />
          <el-card v-if="dev" class="status-card">
            <template #header>
              <div class="card-header">
                <span>{{ t('obs2.Connection Status') }}</span>
                <el-button
                  type="danger"
                  size="small"
                  class="disconnect-button"
                  @click="obs.disconnect()"
                >
                  {{ t('obs2.Disconnect') }}
                </el-button>
              </div>
            </template>
            <div class="status-info">
              <el-descriptions direction="vertical" :column="1" border>
                <el-descriptions-item :label="t('obs2.Recording')">
                  {{ obs.status.recording ? t('obs2.Yes') : t('obs2.No') }}
                </el-descriptions-item>
                <el-descriptions-item :label="t('obs2.Output Path')">
                  {{ obs.status.outputPath || t('obs2.None') }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
            <div class="button-container">
              <el-button
                :disabled="!obs.status.connected || obs.status.recording"
                type="primary"
                @click="obs.startRecord()"
              >
                {{ t('obs2.Start Record') }}
              </el-button>
              <el-button
                :disabled="!obs.status.connected || !obs.status.recording"
                type="danger"
                @click="obs.stopRecord()"
              >
                {{ t('obs2.Stop Record') }}
              </el-button>
              <el-button
                :disabled="!obs.status.connected || !obs.status.recording"
                type="warning"
                @click="obs.splitRecord()"
              >
                {{ t('obs2.Split Record') }}
              </el-button>
              <el-button
                type="primary"
                @click="obs.setProfileParameter('stop')"
              >
                {{ t('obs2.Set Recording Name') }}
              </el-button>
            </div>
          </el-card>
          <el-card class="profile-card">
            <template #header>
              <div class="card-header">
                <span>{{ t('obs2.Recording Profile') }}</span>
              </div>
            </template>
            <div class="profile-info">
              <el-form label-position="top" class="content-form">
                <el-form-item :label="t('obs2.Record Default Path')">
                  <el-input
                    v-model="userConfig.path"
                    :placeholder="t('obs2.recordPathPlaceholder')"
                  />
                  <el-alert
                    :description="t('obs2.filePathExplanation')"
                    type="info"
                    show-icon
                    :closable="false"
                  />
                </el-form-item>

                <el-form-item :label="t('obs2.Record File Name')">
                  <el-input
                    v-model="userConfig.fileName"
                    :placeholder="t('obs2.recordFileNamePlaceholder')"
                  />
                  <el-alert
                    :description="t('obs2.fileNameExplanation')"
                    type="info"
                    show-icon
                    :closable="false"
                  />
                </el-form-item>

                <el-form-item>
                  <div class="append-content-toggle">
                    <span>{{ t('obs2.Append Content Name') }}</span>
                    <el-switch v-model="userConfig.appendContentName" />
                  </div>
                </el-form-item>
              </el-form>
            </div>
          </el-card>
          <el-alert
            class="instruction-alert"
            type="info"
            :description="t('obs2.IMETutorial')"
            :closable="false"
            show-icon
          />
          <el-card class="table-card">
            <template #header>
              <div class="card-header">
                <span>{{ t('obs2.User Content Settings') }}</span>
              </div>
            </template>
            <el-table
              :data="userContentSetting"
              style="width: 100%"
              :border="true"
              stripe
            >
              <el-table-column
                prop="type"
                :label="t('obs2.Type')"
                width="110"
                fixed
                align="center"
              >
                <template #default="scope">
                  <span class="current-type" v-if="zoneType === scope.row.type"
                    >{{ t('obs2.Current') }}<br
                  /></span>

                  <span>{{ t(scope.row.type) }}</span>
                </template>
              </el-table-column>
              <el-table-column :label="t('obs2.Start When')" align="center">
                <el-table-column
                  :label="t('obs2.When Party')"
                  align="center"
                  width="95"
                >
                  <template #default="scope">
                    <el-input-number
                      v-model="scope.row.partyLength"
                      :min="1"
                      :max="48"
                      style="width: 65px"
                      size="small"
                      controls-position="right"
                    />
                  </template>
                </el-table-column>
                <el-table-column
                  prop="enter"
                  :label="t('obs2.Enter Zone')"
                  align="center"
                  width="55"
                >
                  <template #default="scope">
                    <el-switch v-model="scope.row.enter" size="small" />
                  </template>
                </el-table-column>
                <el-table-column
                  prop="countdown"
                  :label="t('obs2.CountDown')"
                  align="center"
                  width="55"
                >
                  <template #default="scope">
                    <el-switch v-model="scope.row.countdown" size="small" />
                  </template>
                </el-table-column>
                <el-table-column
                  prop="combatStart"
                  :label="t('obs2.CombatStart')"
                  align="center"
                  width="55"
                >
                  <template #default="scope">
                    <el-switch v-model="scope.row.combatStart" size="small" />
                  </template>
                </el-table-column>
              </el-table-column>
              <el-table-column :label="t('obs2.End When')" align="center">
                <el-table-column
                  prop="combatEnd"
                  :label="t('obs2.CombatEnd')"
                  align="center"
                  width="55"
                >
                  <template #default="scope">
                    <el-switch v-model="scope.row.combatEnd" size="small" />
                  </template>
                </el-table-column>
                <el-table-column
                  prop="wipe"
                  :label="t('obs2.Wipe')"
                  align="center"
                  width="55"
                >
                  <template #default="scope">
                    <el-switch v-model="scope.row.wipe" size="small" />
                  </template>
                </el-table-column>
                <el-table-column
                  prop="countdown"
                  :label="t('obs2.CountDownCancel')"
                  align="center"
                  width="55"
                >
                  <template #default="scope">
                    <el-switch
                      v-model="scope.row.countdownCancel"
                      size="small"
                    />
                  </template>
                </el-table-column>
              </el-table-column>
              <el-table-column
                :label="t('obs2.Custom Path')"
                align="left"
                min-width="200"
              >
                <template #default="scope">
                  <el-input
                    v-model="scope.row.customPath"
                    style="width: 100%"
                  />
                </template>
              </el-table-column>
            </el-table>
          </el-card>
          <el-alert
            class="instruction-alert"
            type="info"
            :description="t('obs2.hideTutorial')"
            :closable="false"
            show-icon
          />
        </div>
      </el-main>
    </el-card>
  </CommonActWrapper>
</template>

<style scoped lang="scss">
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  width: 120px;
}

.file-path-explanation,
.file-name-explanation {
  font-size: 12px;
}

.act-not-ready-card,
.connection-card {
  max-width: 100%;
}

:deep(.el-table__body .el-input__inner) {
  transform: translateX(-4px);
}
:deep(table > thead > tr > th > div) {
  font-size: 12px;
  padding: 0 4px !important;
  line-height: 1.5 !important;
}
.window-size-warning {
  display: none;
  text-align: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  font-size: 36px;
  font-weight: bold;
}
.obs-container {
  display: block;
}

@media (max-width: 600px), (max-height: 300px) {
  .window-size-warning {
    display: flex;
  }
  .obs-container {
    display: none;
  }
}
.current-type {
  color: red;
  font-weight: bold;
}
</style>
