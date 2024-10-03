<script setup lang="ts">
import OBSWebSocket from 'obs-websocket-js'
import { VxeUI } from 'vxe-table'
import type { Reactive } from 'vue'
import type { EventMap } from 'cactbot/types/event'
import { useI18n } from 'vue-i18n'
import ContentType from '../../cactbot/resources/content_type'
import { addOverlayListener, removeOverlayListener } from '../../cactbot/resources/overlay_plugin_api'
import zoneInfo from '@/resources/zoneInfo'

/*
  TODO:
  [ ] 未检测到ACT环境（cactbotRequest）时，先让用户在ACT悬浮窗中添加本悬浮窗
  [ ] 设置录像文件名的格式
  [ ] 设置录像路径，不同区域录像文件分开存放
  [ ] 大型任务区分8人副本与24人副本
*/

const { t } = useI18n()
interface Settings { type: ContentUsedType, enter: boolean, countdown: boolean, combat: boolean, leave: boolean, wipe: boolean }
type ConditionType = 'enter' | 'leave' | 'countdown' | 'combat' | 'wipe'
type ContentUsedType = typeof contentUsed[number]
const userConfig = useStorage('obs-user-config', { host: 4455, password: '' })
const userContentSetting = useStorage('obs-user-content-setting', [] as Settings[])
const isFirstTime = useStorage('obs-is-first-time', true)

const contentUsed = [
  'Raids', // 大型任务
  'UltimateRaids', // 绝境战
  'Dungeons', // 地牢（四人副本）
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

function initialization() {
  const defaultEnabled: ContentUsedType[] = ['Raids', 'UltimateRaids']
  if (isFirstTime.value) {
    isFirstTime.value = false
    // 大型任务、绝境战默认开启
    userContentSetting.value = [
      ...defaultEnabled.map(type => ({ type, enter: false, countdown: true, combat: false, leave: true, wipe: true })),
      ...contentUsed.filter(type => !defaultEnabled.includes(type)).map(type => ({ type, enter: false, countdown: false, combat: false, leave: false, wipe: false })),
    ]
  }
  else {
    // 清理不存在的类型
    userContentSetting.value = userContentSetting.value.filter(item => contentUsed.includes(item.type))
    // 加入缺少的类型
    const missingTypes = contentUsed.filter(type => !userContentSetting.value.some(item => item.type === type)).map((v) => {
      return defaultEnabled.includes(v) ? { type: v, enter: false, countdown: true, combat: false, leave: true, wipe: true } : { type: v, enter: false, countdown: false, combat: false, leave: false, wipe: false }
    })
    userContentSetting.value.push(...missingTypes)
  }
  userContentSetting.value.sort((a, b) => contentUsed.indexOf(a.type) - contentUsed.indexOf(b.type))
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
  const contentType = zoneInfo[zoneID]?.contentType
  for (const key in ContentType) {
    if (Object.prototype.hasOwnProperty.call(ContentType, key)) {
      const element = ContentType[key as keyof typeof ContentType]
      if (element === contentType) {
        checkCondition(key as keyof typeof ContentType, 'enter')
        return
      }
    }
  }
}

function checkCondition(contentType: keyof typeof ContentType, condition: ConditionType) {
  const recording = obs.status.recording
  if (!userContentSetting.value.find(item => item.type === contentType && item[condition])) {
    return
  }
  switch (condition) {
    case 'enter':
    case 'countdown':
    case 'combat':
      if (!recording) {
        obs.startRecord()
      }
      else {
        obs.splitRecord()
      }
      return
    case 'leave':
    case 'wipe':
      if (recording) {
        obs.stopRecord()
      }
  }
}

onMounted(() => {
  obs.connect()
  addOverlayListener('ChangeZone', handleChangeZone)
  initialization()
})

onUnmounted(() => {
  obs.disconnect()
  removeOverlayListener('ChangeZone', handleChangeZone)
})
</script>

<template>
  <div class="obs-container">
    <header>
      <h1>{{ t('OBS Auto Record V2') }}</h1>
      <LanguageSwitcher />
    </header>

    <main>
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
              {{ obs.status.connecting ? t('Connecting...') : t('Connect') }}
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
        <el-card class="status-card">
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
        <el-alert
          class="instruction-alert"
          type="info"
          :description="t('hideTutorial')"
          :closable="false"
          show-icon
        />
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span>{{ t('User Content Settings') }}</span>
            </div>
          </template>
          <el-table :data="userContentSetting" style="width: 100%" :border="true" stripe>
            <el-table-column prop="type" :label="t('Type')" min-width="120">
              <template #default="scope">
                <span>{{ t(scope.row.type) }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="t('Start When')" align="center">
              <el-table-column prop="enter" :label="t('Enter Zone')" align="center" width="100">
                <template #default="scope">
                  <el-switch v-model="scope.row.enter" />
                </template>
              </el-table-column>
              <el-table-column prop="countdown" :label="t('CountDown')" align="center" width="100">
                <template #default="scope">
                  <el-switch v-model="scope.row.countdown" />
                </template>
              </el-table-column>
              <el-table-column prop="combat" :label="t('InCombat')" align="center" width="100">
                <template #default="scope">
                  <el-switch v-model="scope.row.combat" />
                </template>
              </el-table-column>
            </el-table-column>
            <el-table-column :label="t('End When')" align="center">
              <el-table-column prop="leave" :label="t('Leave Zone')" align="center" width="100">
                <template #default="scope">
                  <el-switch v-model="scope.row.leave" />
                </template>
              </el-table-column>
              <el-table-column prop="wipe" :label="t('Wipe')" align="center" width="100">
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

<style scoped>
.obs-container {
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

.connection-card {
  max-width: 500px;
  margin: 0 auto;
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

.button-container {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 10px;
}

.table-card {
  margin-top: 20px;
}

.disconnect-button {
  margin-left: 10px;
}

@media (max-width: 768px) {
  .obs-container {
    padding: 10px;
  }

  .connection-card {
    max-width: 100%;
  }
}
</style>
