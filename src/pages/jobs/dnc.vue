<script setup lang="ts">
import type { RemovableRef } from '@vueuse/core'
import type { EventMap } from '../../../cactbot/types/event'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../../cactbot/resources/overlay_plugin_api'

const now = ref(0)
const game = reactive({
  playerId: '',
  lastCombo: 0,
  status: new Map([
    ['A85', 0], // 触发3
    ['A86', 0], // 触发4
    ['BC9', 0], // 百花3
    ['BCA', 0], // 百花4
  ]),
})
interface Settings {
  combo: { left: number, top: number }
  tr3: { left: number, top: number }
  tr4: { left: number, top: number }
  fl: { left: number, top: number }
  color: string
  shadow: string
  size: number
  warncolor: string
  warnshadow: string
  zeroStr: string
  warn: number
  fontFamily: string
  fontWeight: boolean
  userCss: string
}
const settings: RemovableRef<Settings> = useStorage(
  'jobs-dnc',
  {
    combo: { left: 10, top: -30 },
    tr3: { left: 46, top: -22 },
    tr4: { left: 82, top: -22 },
    fl: { left: 0, top: -15 },
    color: 'rgb(255,255,255)',
    shadow: 'rgb(0,0,0)',
    size: 14,
    warncolor: 'rgb(255,255,255)',
    warnshadow: 'rgb(255,0,0)',
    zeroStr: '',
    fontFamily: '微软雅黑',
    fontWeight: false,
    warn: 5,
    userCss: '',
  },
  localStorage,
  { mergeDefaults: true },
)
const showSettings = ref(
  document.getElementById('unlocked')?.style?.display === 'flex',
)
const data = reactive([
  {
    id: 'combo',
    cd: computed(() => {
      return 30 - Math.floor((now.value - game.lastCombo) / 1000)
    }),
    style: {
      top: computed(() => `${settings.value.combo.top}px`),
      left: computed(() => `${settings.value.combo.left}px`),
    },
  },
  {
    id: 'tr3',
    cd: computed(() => {
      return (
        30 - Math.floor((now.value - (game.status.get('A85') ?? 0)) / 1000)
      )
    }),
    style: {
      top: computed(() => `${settings.value.tr3.top}px`),
      left: computed(() => `${settings.value.tr3.left}px`),
    },
  },
  {
    id: 'tr4',
    cd: computed(() => {
      return (
        30 - Math.floor((now.value - (game.status.get('A86') ?? 0)) / 1000)
      )
    }),
    style: {
      top: computed(() => `${settings.value.tr4.top}px`),
      left: computed(() => `${settings.value.tr4.left}px`),
    },
  },
  {
    id: 'fl3',
    cd: computed(() => {
      return (
        30 - Math.floor((now.value - (game.status.get('BC9') ?? 0)) / 1000)
      )
    }),
    style: {
      top: computed(
        () => `${settings.value.tr3.top + settings.value.fl.top}px`,
      ),
      left: computed(
        () => `${settings.value.tr3.left + settings.value.fl.left}px`,
      ),
    },
  },
  {
    id: 'fl4',
    cd: computed(() => {
      return (
        30 - Math.floor((now.value - (game.status.get('BCA') ?? 0)) / 1000)
      )
    }),
    style: {
      top: computed(
        () => `${settings.value.tr4.top + settings.value.fl.top}px`,
      ),
      left: computed(
        () => `${settings.value.tr4.left + settings.value.fl.left}px`,
      ),
    },
  },
])
const color = computed(() => settings.value.color)
const shadow = computed(() => settings.value.shadow)
const warncolor = computed(() => settings.value.warncolor)
const warnshadow = computed(() => settings.value.warnshadow)
const fontFamily = computed(() => settings.value.fontFamily)
const size = computed(() => `${settings.value.size}px`)
const fontWeight = computed(() =>
  settings.value.fontWeight ? 'bold' : 'none',
)
const userCss = computed(() => settings.value.userCss)

const handleOnLogEvent: EventMap['LogLine'] = (e) => {
  if (
    e.line[5] === game.playerId
    && (e.line[0] === '26' || e.line[0] === '30')
    && game.status.has(e.line[2])
  ) {
    game.status.set(e.line[2], e.line[0] === '26' ? Date.now() : 0)
  }
  else if (
    e.line[2] === game.playerId
    && (e.line[0] === '21' || e.line[0] === '22')
  ) {
    if (
      (e.line[4] === '3E79' && e.line[0] === '22')
      || (e.line[4] === '3E75' && e.line[0] === '21')
    ) {
      game.lastCombo = Date.now()
    }
    else if (
      e.line[4] === '3E76'
      || e.line[4] === '3E7A'
      || (e.line[0] === '21' && e.line[4] === '3E79')
    ) {
      game.lastCombo = 0
    }
  }
}

function handlePlayerDied() {
  game.status.set('A85', 0)
  game.status.set('A86', 0)
  game.status.set('BC9', 0)
  game.status.set('BCA', 0)
  game.lastCombo = 0
}

const handleChangePrimaryPlayer: EventMap['ChangePrimaryPlayer'] = (e) => {
  game.playerId = Number(e.charID).toString(16).toUpperCase()
}

function resetSettings() {
  localStorage.removeItem('jobs-dnc')
  location.reload()
}

onMounted(() => {
  addOverlayListener('onPlayerDied', handlePlayerDied)
  addOverlayListener('LogLine', handleOnLogEvent)
  addOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  // startOverlayEvents();
  document.addEventListener('onOverlayStateUpdate', (e) => {
    showSettings.value = e?.detail?.isLocked === false
  })
})
onBeforeUnmount(() => {
  removeOverlayListener('onPlayerDied', handlePlayerDied)
  removeOverlayListener('LogLine', handleOnLogEvent)
  removeOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
})
requestAnimationFrame(function update() {
  now.value = Date.now()
  requestAnimationFrame(update)
})
const type = 'style'
</script>

<template>
  <div class="dnc-overlay">
    <header v-show="showSettings" class="settings">
      <form>
        连击X:
        <el-input-number
          v-model="settings.combo.left"
          class="input input-number"
          size="small"
        />
      </form>
      <form>
        连击Y:
        <el-input-number
          v-model="settings.combo.top"
          class="input input-number"
          size="small"
        />
      </form>
      <form>
        触发3X:
        <el-input-number
          v-model="settings.tr3.left"
          class="input input-number"
          size="small"
        />
      </form>
      <form>
        触发3Y:
        <el-input-number
          v-model="settings.tr3.top"
          class="input input-number"
          size="small"
        />
      </form>
      <form>
        触发4X:
        <el-input-number
          v-model="settings.tr4.left"
          class="input input-number"
          size="small"
        />
      </form>
      <form>
        触发4Y:
        <el-input-number
          v-model="settings.tr4.top"
          class="input input-number"
          size="small"
        />
      </form>
      <form>
        百花X:
        <el-input-number
          v-model="settings.fl.left"
          class="input input-number"
          size="small"
        />
      </form>
      <form>
        百花Y:
        <el-input-number
          v-model="settings.fl.top"
          class="input input-number"
          size="small"
        />
      </form>
      <form>
        剩余警告:
        <el-input-number
          v-model="settings.warn"
          class="input input-number"
          :min="-1"
          :max="30"
          size="small"
        />
      </form>
      <form>
        常规颜色:
        <el-input
          v-model="settings.color"
          class="input input-string"
          size="small"
        />
      </form>
      <form>
        常规阴影:
        <el-input
          v-model="settings.shadow"
          class="input input-string"
          size="small"
        />
      </form>
      <form>
        警告颜色:
        <el-input
          v-model="settings.warncolor"
          class="input input-string"
          size="small"
        />
      </form>
      <form>
        警告阴影:
        <el-input
          v-model="settings.warnshadow"
          class="input input-string"
          size="small"
        />
      </form>
      <form>
        零值文本:
        <el-input
          v-model="settings.zeroStr"
          class="input input-string"
          size="small"
        />
      </form>
      <form>
        字号:
        <el-input-number
          v-model="settings.size"
          class="input input-number"
          size="small"
        />
      </form>
      <form>
        字体:
        <el-input
          v-model="settings.fontFamily"
          class="input input-string"
          size="small"
        />
      </form>
      <form>
        粗体：<el-switch v-model="settings.fontWeight" size="small" />
      </form>
      <form>
        自定义CSS： <br><el-input
          v-model="settings.userCss"
          autosize
          type="textarea"
          placeholder=""
        />
      </form>
      <br>
      <form>
        <el-popconfirm
          :teleported="false"
          title="确定要重置？"
          @confirm="resetSettings"
        >
          <template #reference>
            <el-button>重置全部用户设置</el-button>
          </template>
        </el-popconfirm>
      </form>
    </header>
    <main>
      <div v-for="item in data" :key="item.id">
        <span
          :class="item.cd <= settings.warn && !showSettings ? 'warning' : ''"
          :style="item.style"
        >
          {{ item.cd >= 0 ? item.cd : showSettings ? "30" : settings.zeroStr }}
        </span>
      </div>
    </main>
  </div>
  <component :is="type">
    {{ userCss }}
  </component>
</template>

<style>
body {
  padding: 0;
  margin: 0;
}
</style>

<style scoped lang="scss">
* {
  user-select: none !important;
}

.dnc-overlay {
  font-family: v-bind(fontFamily);
  font-weight: v-bind(fontWeight);
}

.settings {
  overflow: visible;
  position: fixed;
  right: 3em;
  z-index: 999999;
  height: 80vh;
  color: white;
  font-weight: bold;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  align-content: flex-end;
  font-size: 14px;

  >form:not(:last-child) {
    white-space: nowrap;
    padding: 0px 3px;
    text-shadow: -1px 0 1px #000, 0 1px 1px #000, 1px 0 1px #000,
      0 -1px 1px #000;
  }

  :deep(.input-number) {
    width: 8em;
    height: 1.15em;
  }

  :deep(.input-string) {
    width: 9em;
    height: 1.35em;
  }
}

main {
  display: flex;
  align-items: flex-end;
  height: 100vh;

  >div {
    position: relative;

    >span {
      position: absolute;
      text-align: right;
      width: 1em;
      color: v-bind(color);
      $shadow: v-bind(shadow);
      font-size: v-bind(size);
      text-shadow: 1px 1px 1px $shadow, -1px -1px 1px $shadow,
        1px -1px 1px $shadow, -1px 1px 1px $shadow;
      transform: translateX(-50%) translateY(-50%);

      &.warning {
        color: v-bind(warncolor);
        $warnshadow: v-bind(warnshadow);
        text-shadow: 1px 1px 1px $warnshadow, -1px -1px 1px $warnshadow,
          1px -1px 1px $warnshadow, -1px 1px 1px $warnshadow;
      }
    }
  }
}
</style>
