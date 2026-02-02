<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import type { RequestBatchRequest } from 'obs-websocket-js'
import type { Reactive } from 'vue'
import type { ContentUsedType } from '@/composables/useZone'
import { ElMessage } from 'element-plus'
import OBSWebSocket from 'obs-websocket-js'
import { useDev } from '@/composables/useDev'
import { useLang } from '@/composables/useLang'
import { CONTENT_TYPES, useZone } from '@/composables/useZone'
import logDefinitions from '../../cactbot/resources/netlog_defs'
import NetRegexes, { commonNetRegex } from '../../cactbot/resources/netregexes'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'

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
type ConditionType
  = | 'enter'
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
  { mergeDefaults: true },
)
const userContentSetting = useStorage(
  'obs-user-content-setting',
  [] as Settings[],
)
const dev = useDev()
const partyLength = ref(1)

const hasUsedBefore = useStorage('obs-has-used-before', false)
const isMiniMode = ref(hasUsedBefore.value)

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
  partyLength: 1,
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
      ...defaultEnabled.map(type => ({ type, ...DEFAULT_ENABLE_SETTINGS })),
      ...CONTENT_TYPES.filter(type => !defaultEnabled.includes(type)).map(
        type => ({ type, ...DEFAULT_DISABLE_SETTINGS }),
      ),
    ]
    const occ = userContentSetting.value.find(
      v => v.type === 'OccultCrescent',
    )
    if (occ) {
      occ.partyLength = 40
    }
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

  connectingPromise: Promise<void> | null = null

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

  async connect(): Promise<void> {
    if (this.status.connected)
      return Promise.resolve()
    if (this.connectingPromise)
      return this.connectingPromise

    this.connectingPromise = (async () => {
      Log('Connecting to OBS')
      if (!userConfig.value.host) {
        ElMessage({
          type: 'error',
          message: t('obs2.host required'),
          duration: 1000,
        })
        return
      }

      this.status.connecting = true
      try {
        await this.ws.connect(
          `ws://127.0.0.1:${userConfig.value.host}`,
          userConfig.value.password,
        )
        Log('Connected to OBS')
        const recordStatus = await this.ws.call('GetRecordStatus')
        this.status.recording = recordStatus.outputActive
        this.status.outputActive = recordStatus.outputActive
        this.status.connected = true

        if (!userConfig.value.path) {
          const v = await this.ws.call('GetRecordDirectory')
          if (v.recordDirectory) {
            userConfig.value.path = v.recordDirectory
            userContentSetting.value.forEach((item) => {
              if (item.customPath === '') {
                item.customPath = v.recordDirectory
              }
            })
          }
        }
        if (!userConfig.value.fileName) {
          userConfig.value.fileName = '%CCYY-%MM-%DD %hh-%mm-%ss'
        }
        hasUsedBefore.value = true
      }
      catch (e) {
        Log('OBS connection failed', e)
        ElMessage({
          type: 'error',
          message: t('obs2.connection failed'),
          duration: 1000,
        })
      }
      finally {
        this.status.connecting = false
        this.connectingPromise = null
      }
    })()

    return this.connectingPromise
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
    const filePath
      = cause === 'stop'
        ? userConfig.value.path
        : userContentSetting.value.find(item => item.type === zoneType.value)
          ?.customPath || userConfig.value.path
    const fileName
      = cause === 'stop'
        ? userConfig.value.fileName
        : userConfig.value.fileName
          + (userConfig.value.appendContentName ? ` - ${zoneName.value}` : '')

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

function Log(...args: unknown[]) {
  if (dev.value) {
    console.log('[OBS Auto Record]', ...args)
  }
}

function checkCondition(condition: ConditionType) {
  Log('checkCondition', condition)

  const rule = userContentSetting.value.find(
    item => item.type === zoneType.value,
  )

  if (!rule) {
    throw new Error(`Rule not found for zone type:${zoneType.value}`)
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

// 获取当前区域类型对应的规则
const currentRule = computed(() => {
  return userContentSetting.value.find(item => item.type === zoneType.value)
})

// 表格行类名方法 - 高亮当前类型
function tableRowClassName({ row }: { row: Settings }) {
  return row.type === zoneType.value ? 'current-zone-row' : ''
}
</script>

<template>
  <CommonActWrapper>
    <!-- 迷你模式 -->
    <div v-if="isMiniMode" class="mini-mode">
      <template v-if="obs.status.connected">
        <!-- 录像状态红点 -->
        <div
          class="recording-dot"
          :class="{ 'is-recording': obs.status.recording }"
        />

        <!-- 区域名称 -->
        <div class="zone-info">
          <div class="zone-name-wrapper">
            <div class="zone-name">
              {{ zoneName || t('obs2.Unknown') }}
            </div>
          </div>
        </div>

        <!-- 规则状态 -->
        <div class="rules-status">
          <span
            class="rule-item"
            :class="{ active: currentRule?.enter }"
            :title="t('obs2.Enter Zone')"
          >
            {{ t('obs2.EnterShort') }}
          </span>
          <span
            class="rule-item"
            :class="{ active: currentRule?.countdown }"
            :title="t('obs2.CountDown')"
          >
            {{ t('obs2.CountdownShort') }}
          </span>
          <span
            class="rule-item"
            :class="{ active: currentRule?.combatStart }"
            :title="t('obs2.CombatStart')"
          >
            {{ t('obs2.CombatStartShort') }}
          </span>
          <span
            class="rule-item"
            :class="{ active: currentRule?.combatEnd }"
            :title="t('obs2.CombatEnd')"
          >
            {{ t('obs2.CombatEndShort') }}
          </span>
          <span
            class="rule-item"
            :class="{ active: currentRule?.wipe }"
            :title="t('obs2.Wipe')"
          >
            {{ t('obs2.WipeShort') }}
          </span>
        </div>
      </template>
      <div v-else class="obs-status-text">
        {{ t('obs2.OBS Not Connected') }}
      </div>

      <!-- 设置按钮 -->
      <button class="settings-btn" title="展开详情" @click="isMiniMode = false">
        ⚙
      </button>
    </div>

    <!-- 详情模式 -->
    <template v-else>
      <div class="mode-switch-container">
        <!-- 占位符：镜像迷你模式的内容以实现按钮对齐 -->
        <div class="mini-mode-placeholder" style="visibility: hidden; pointer-events: none;">
          <template v-if="obs.status.connected">
            <div class="recording-dot" />
            <div class="zone-info">
              <div class="zone-name-wrapper">
                <div class="zone-name">
                  {{ zoneName || t('obs2.Unknown') }}
                </div>
              </div>
              <div class="zone-type">
                {{ zoneType ? `（${t(`obs2.${zoneType}`)}）` : '' }}
              </div>
            </div>
            <div class="rules-status">
              <span class="rule-item">{{ t('obs2.EnterShort') }}</span>
              <span class="rule-item">{{ t('obs2.CountdownShort') }}</span>
              <span class="rule-item">{{ t('obs2.CombatStartShort') }}</span>
              <span class="rule-item">{{ t('obs2.CombatEndShort') }}</span>
              <span class="rule-item">{{ t('obs2.WipeShort') }}</span>
            </div>
          </template>
          <div v-else class="obs-status-text">
            {{ t('obs2.OBS Not Connected') }}
          </div>
        </div>

        <el-button size="small" class="mini-toggle-btn" @click="isMiniMode = true">
          {{ t('obs2.Mini Mode') }}
        </el-button>
      </div>

      <el-alert
        :title="t('obs2.size warning')"
        type="warning"
        center
        show-icon
        :closable="false"
        class="window-size-warning"
      />
      <el-card class="obs-container">
        <el-main>
          <!-- 连接表单 -->
          <el-card v-if="!obs.status.connected" class="connection-card">
            <template #header>
              <div class="card-header">
                <span>{{ t('obs2.Connect to OBS') }}</span>
                <div class="header-actions">
                  <CommonThemeToggle storage-key="obs-2-theme" />
                  <CommonLanguageSwitcher />
                </div>
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
                  <div class="header-actions">
                    <CommonThemeToggle storage-key="obs-2-theme" />
                    <CommonLanguageSwitcher />
                  </div>
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
                  <div class="header-actions">
                    <CommonThemeToggle storage-key="obs-2-theme" />
                    <CommonLanguageSwitcher />
                  </div>
                </div>
              </template>
              <el-table
                :data="userContentSetting"
                :border="true"
                stripe
                :row-class-name="tableRowClassName"
              >
                <el-table-column
                  prop="type"
                  :label="t('obs2.Type')"
                  width="100"
                  fixed
                  align="center"
                >
                  <template #default="scope">
                    <span
                      v-if="zoneType === scope.row.type"
                      class="current-type"
                    >{{ t('obs2.Current') }}<br></span>

                    <span>{{
                      scope.row.type ? t(`obs2.${scope.row.type}`) : ''
                    }}</span>
                  </template>
                </el-table-column>
                <el-table-column :label="t('obs2.Start When')" align="center">
                  <el-table-column
                    :label="t('obs2.When Party')"
                    align="center"
                    width="70"
                  >
                    <template #default="scope">
                      <el-input-number
                        v-model="scope.row.partyLength"
                        :min="1"
                        :max="48"
                        style="width: 40px"
                        size="small"
                        :controls="false"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="enter"
                    :label="t('obs2.Enter Zone')"
                    align="center"
                    width="50"
                  >
                    <template #default="scope">
                      <el-checkbox v-model="scope.row.enter" />
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="countdown"
                    :label="t('obs2.CountDown')"
                    align="center"
                    width="55"
                  >
                    <template #default="scope">
                      <el-checkbox v-model="scope.row.countdown" />
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="combatStart"
                    :label="t('obs2.CombatStart')"
                    align="center"
                    width="55"
                  >
                    <template #default="scope">
                      <el-checkbox v-model="scope.row.combatStart" />
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
                      <el-checkbox v-model="scope.row.combatEnd" />
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="wipe"
                    :label="t('obs2.Wipe')"
                    align="center"
                    width="50"
                  >
                    <template #default="scope">
                      <el-checkbox v-model="scope.row.wipe" />
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="countdown"
                    :label="t('obs2.CountDownCancel')"
                    align="center"
                    width="60"
                  >
                    <template #default="scope">
                      <el-checkbox v-model="scope.row.countdownCancel" />
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
          </div>
        </el-main>
      </el-card>
    </template>
  </CommonActWrapper>
</template>

<style scoped lang="scss">
// 迷你模式
.mini-mode,
.mini-mode-placeholder {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: transparent;
  height: auto;
  min-height: 24px;
  font-size: 13px;
  user-select: none;
  overflow: visible;
  color: #fff;
  text-shadow: -1px 0 2px #000, 0 1px 2px #000, 1px 0 2px #000;

  // 横向居中
  width: fit-content;
}

.mini-mode {
  margin: 0 auto;
}

.mini-mode-placeholder {
  // 占位符不需要 margin auto，它靠 container 居中
  padding-right: 0; // 移除右侧 padding 以抵消设置按钮的紧凑感
}

// 录像状态红点
.recording-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #666;
  flex-shrink: 0;
  align-self: center;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.9), 0 0 3px rgba(0, 0, 0, 0.7);

  &.is-recording {
    background-color: #ff3333;
    box-shadow: 0 0 4px rgba(255, 50, 50, 1), 0 0 6px rgba(255, 0, 0, 0.8),
      0 0 2px rgba(0, 0, 0, 0.9);
  }
}

// 区域信息容器
.zone-info {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  overflow: visible;
}

// 区域名称包装器
.zone-name-wrapper {
  max-width: 140px;
  overflow: hidden;
}

.zone-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

// 区域类型
.zone-type {
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: bold;
}

// 规则状态容器
.rules-status {
  display: flex;
  gap: 0;
  flex-shrink: 0;
  margin-left: 1px;
}

// 规则项
.rule-item {
  display: inline-block;
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  font-size: 12px;
  cursor: default;

  // 未开启
  color: rgba(255, 255, 255, 0.35);
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.9), 1px 1px 1px rgba(0, 0, 0, 0.7);

  // 激活状态
  &.active {
    color: #fff;
    font-weight: 500;
    text-shadow: 0 0 3px rgba(255, 235, 0, 1), 0 0 5px rgba(255, 210, 0, 1),
      0 0 7px rgba(255, 180, 0, 0.8), 0 0 1px rgba(0, 0, 0, 1);
  }
}

// OBS 状态文字
.obs-status-text {
  font-size: 12px;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

// 设置按钮
.settings-btn {
  width: 22px;
  height: 22px;
  padding: 0;
  margin: 0 0 0 1px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(90, 90, 90, 0.7);
  backdrop-filter: blur(4px);
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(110, 110, 110, 0.8);
    border-color: rgba(255, 255, 255, 0.5);
  }

  &:active {
    transform: scale(0.95);
  }
}

// 详情模式控制条
.mode-switch-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

:deep(.el-main) {
  padding: 0 !important;
}

:deep(.el-card) {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.obs-container {
  margin: 0 !important;
}

.mini-toggle-btn {
  padding: 0 12px;
  height: 24px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(80, 80, 80, 0.7);
  backdrop-filter: blur(4px);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  // 添加阴影
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);

  &:hover {
    background: rgba(100, 100, 100, 0.8);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  }

  &:active {
    transform: scale(0.95);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
}

.act-not-ready-card,
.connection-card,
.status-card,
.table-card,
.profile-card {
  margin-bottom: 6px;
  border-radius: 6px;
  box-shadow: 0 1px 8px 0 rgba(0, 0, 0, 0.1);
}

.connection-form {
  padding: 0;
}

.connect-button {
  width: 100%;
  margin-top: 5px;
}

.card-header {
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.instruction-alert {
  margin-top: 8px;
  margin-bottom: 8px;
}

.status-info {
  margin-bottom: 6px;
}

.status-card {
  margin-top: 6px;
}

.button-container {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.button-container .el-button:first-child {
  margin-left: 8px;
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
  padding: 2px 4px !important;
  line-height: 1.2 !important;
}

:deep(.el-table) {
  font-size: 12px;
}

:deep(.el-table th.el-table__cell) {
  padding: 2px 0;
}

:deep(.el-table td.el-table__cell) {
  padding: 2px 0;
}

:deep(.el-table .cell) {
  padding: 0 4px;
  line-height: 1.3;
}

:deep(.el-checkbox) {
  height: 18px;

  .el-checkbox__inner {
    width: 14px;
    height: 14px;
  }

  .el-checkbox__label {
    display: none;
  }
}

:deep(.el-input-number) {
  line-height: 1.2;
}

:deep(.el-input-number__inner) {
  height: 26px;
  line-height: 26px;
}

.table-card {
  max-height: 450px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.table-card :deep(.el-card__body) {
  overflow: auto;
  flex: 1;
  min-height: 0;
}

:deep(.el-table__body-wrapper) {
  overflow: auto !important;
}

// 美化滚动条
.table-card,
.table-card :deep(.el-card__body),
:deep(.el-table__body-wrapper) {
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(100, 100, 100, 0.6);
    border-radius: 4px;

    &:hover {
      background: rgba(120, 120, 120, 0.8);
    }

    &:active {
      background: rgba(140, 140, 140, 0.9);
    }
  }

  scrollbar-width: thin;
  scrollbar-color: rgba(100, 100, 100, 0.6) rgba(0, 0, 0, 0.1);
}

:deep(.el-card__body) {
  padding: 8px;
}

:deep(.el-card__header) {
  padding: 6px 8px;
}

:deep(.el-form-item) {
  margin-bottom: 8px;
}

:deep(.el-alert) {
  padding: 4px 8px;
}

:deep(.el-divider) {
  margin: 8px 0;
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

:deep(.current-zone-row) {
  background-color: rgba(64, 158, 255, 0.08) !important;

  &:hover > td {
    background-color: rgba(64, 158, 255, 0.12) !important;
  }
}

:deep(.el-input-number.is-without-controls) {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  .el-input {
    width: 100%;
  }

  .el-input__wrapper {
    padding: 0 !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
  }

  .el-input__inner {
    padding: 0 !important;
    text-align: center !important;
    width: 100% !important;
    display: block !important;
    appearance: none;
    -moz-appearance: textfield;

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
}

:deep(.el-table .cell .el-checkbox) {
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>
