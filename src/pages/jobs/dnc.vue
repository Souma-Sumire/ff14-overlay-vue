<template>
  <header v-show="showSettings" class="settings">
    <form>连击X: <el-input-number class="input input-number" v-model="settings.combo.left" size="small" /></form>
    <form>连击Y: <el-input-number class="input input-number" v-model="settings.combo.top" size="small" /></form>
    <form>触发3X: <el-input-number class="input input-number" v-model="settings.tr3.left" size="small" /></form>
    <form>触发3Y: <el-input-number class="input input-number" v-model="settings.tr3.top" size="small" /></form>
    <form>百花3X: <el-input-number class="input input-number" v-model="settings.fl3.left" size="small" /></form>
    <form>百花3Y: <el-input-number class="input input-number" v-model="settings.fl3.top" size="small" /></form>
    <form>触发4X: <el-input-number class="input input-number" v-model="settings.tr4.left" size="small" /></form>
    <form>触发4Y: <el-input-number class="input input-number" v-model="settings.tr4.top" size="small" /></form>
    <form>百花4X: <el-input-number class="input input-number" v-model="settings.fl4.left" size="small" /></form>
    <form>百花4Y: <el-input-number class="input input-number" v-model="settings.fl4.top" size="small" /></form>
    <form>剩余警告: <el-input-number class="input input-number" :min="-1" :max="30" v-model="settings.warn" size="small" /></form>
    <form>字体颜色: <el-input class="input input-string" v-model="settings.color" size="small" /></form>
    <form>阴影颜色: <el-input class="input input-string" v-model="settings.shadow" size="small" /></form>
    <form>警告颜色: <el-input class="input input-string" v-model="settings.warncolor" size="small" /></form>
    <form>警告阴影: <el-input class="input input-string" v-model="settings.warnshadow" size="small" /></form>
    <form>零值文本: <el-input class="input input-string" v-model="settings.zeroStr" size="small" /></form>
    <form>字号: <el-input-number class="input input-number" v-model="settings.size" size="small" /></form>
    <el-popconfirm @confirm="resetSettings" :teleported="false" title="确定要重置？">
      <template #reference>
        <el-button>Reset</el-button>
      </template>
    </el-popconfirm>
  </header>
  <main>
    <div v-for="item in data" :key="item.id">
      <span :class="item.cd <= settings.warn ? 'warning' : ''" :style="{ top: item.style.top + 'px', left: item.style.left + 'px' }">{{
        item.cd >= 0 ? item.cd : showSettings ? "0" : settings.zeroStr
      }}</span>
    </div>
  </main>
</template>

<script setup lang="ts">
import { RemovableRef } from "@vueuse/core";

let now = ref(0);
const game = reactive({
  playerId: "",
  lastCombo: 0,
  status: new Map([
    ["A85", 0], // 触发3
    ["A86", 0], // 触发4
    ["BC9", 0], // 百花3
    ["BCA", 0], // 百花4
  ]),
});
interface Settings {
  combo: { left: number; top: number };
  tr3: { left: number; top: number };
  tr4: { left: number; top: number };
  fl3: { left: number; top: number };
  fl4: { left: number; top: number };
  color: string;
  shadow: string;
  size: number;
  warncolor: string;
  warnshadow: string;
  zeroStr: string;
  warn: number;
}
const settings: RemovableRef<Settings> = useStorage(
  "jobs-dnc",
  {
    combo: { left: 10, top: -30 },
    tr3: { left: 46, top: -30 },
    tr4: { left: 82, top: -30 },
    fl3: { left: 46, top: -42 },
    fl4: { left: 82, top: -42 },
    color: "white",
    shadow: "black",
    size: 12,
    warncolor: "white",
    warnshadow: "red",
    zeroStr: "",
    warn: 5,
  },
  localStorage,
  { mergeDefaults: true },
);
const showSettings = ref(document.getElementById("unlocked")?.style?.display === "flex");
const data = reactive([
  {
    id: "combo",
    cd: computed(() => {
      return 30 - Math.floor((now.value - game.lastCombo) / 1000);
    }),
    style: {
      top: computed(() => settings.value.combo.top),
      left: computed(() => settings.value.combo.left),
    },
  },
  {
    id: "tr3",
    cd: computed(() => {
      return 30 - Math.floor((now.value - game.status.get("A85")!) / 1000);
    }),
    style: {
      top: computed(() => settings.value.tr3.top),
      left: computed(() => settings.value.tr3.left),
    },
  },
  {
    id: "tr4",
    cd: computed(() => {
      return 30 - Math.floor((now.value - game.status.get("A86")!) / 1000);
    }),
    style: {
      top: computed(() => settings.value.tr4.top),
      left: computed(() => settings.value.tr4.left),
    },
  },
  {
    id: "fl3",
    cd: computed(() => {
      return 30 - Math.floor((now.value - game.status.get("BC9")!) / 1000);
    }),
    style: {
      top: computed(() => settings.value.fl3.top),
      left: computed(() => settings.value.fl3.left),
    },
  },
  {
    id: "fl4",
    cd: computed(() => {
      return 30 - Math.floor((now.value - game.status.get("BCA")!) / 1000);
    }),
    style: {
      top: computed(() => settings.value.fl4.top),
      left: computed(() => settings.value.fl4.left),
    },
  },
]);
const color = computed(() => settings.value.color);
const shadow = computed(() => settings.value.shadow);
const warncolor = computed(() => settings.value.warncolor);
const warnshadow = computed(() => settings.value.warnshadow);
const size = computed(() => settings.value.size + "px");

function handleOnLogEvent(e: { line: string[] }) {
  if (e.line[5] === game.playerId && (e.line[0] === "26" || e.line[0] === "30") && game.status.has(e.line[2])) {
    game.status.set(e.line[2], e.line[0] === "26" ? Date.now() : 0);
  } else if (e.line[2] === game.playerId && (e.line[0] === "21" || e.line[0] === "22")) {
    if (e.line[4] === "3E79" || e.line[4] === "3E75") game.lastCombo = Date.now();
    else if (e.line[4] === "3E76" || e.line[4] === "3E7A") game.lastCombo = 0;
  }
}

function handlePlayerDied() {
  game.status.set("A85", 0);
  game.status.set("A86", 0);
  game.status.set("BC9", 0);
  game.status.set("BCA", 0);
  game.lastCombo = 0;
}

function handleChangePrimaryPlayer(e: { charID: number }) {
  game.playerId = e.charID.toString(16).toUpperCase();
}

function resetSettings() {
  localStorage.removeItem("jobs-dnc");
  location.reload();
}

onMounted(() => {
  addOverlayListener("onPlayerDied", handlePlayerDied);
  addOverlayListener("LogLine", handleOnLogEvent);
  addOverlayListener("ChangePrimaryPlayer", handleChangePrimaryPlayer);
  startOverlayEvents();
  document.addEventListener("onOverlayStateUpdate", (e: any) => {
    showSettings.value = e?.detail?.isLocked === false;
  });
});
onBeforeUnmount(() => {
  removeOverlayListener("onPlayerDied", handlePlayerDied);
  removeOverlayListener("LogLine", handleOnLogEvent);
  removeOverlayListener("ChangePrimaryPlayer", handleChangePrimaryPlayer);
});
requestAnimationFrame(function update() {
  now.value = Date.now();
  requestAnimationFrame(update);
});
</script>
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
  > form {
    white-space: nowrap;
    padding: 0px 3px;
    text-shadow: -1px 0 1px #000, 0 1px 1px #000, 1px 0 1px #000, 0 -1px 1px #000;
  }
  :deep(.input) {
    width: 7em;
    height: 1.3em;
  }
}
main {
  $shadow: v-bind(shadow);
  color: v-bind(color);
  font-size: v-bind(size);
  text-shadow: 1px 1px 1px $shadow, -1px -1px 1px $shadow, 1px -1px 1px $shadow, -1px 1px 1px $shadow;
  display: flex;
  align-items: flex-end;
  height: 100vh;
  > div {
    position: relative;
    > span {
      position: absolute;
      text-align: right;
      width: 1em;
      &.warning {
        color: v-bind(warncolor);
        $warnshadow: v-bind(warnshadow);
        text-shadow: 1px 1px 1px $warnshadow, -1px -1px 1px $warnshadow, 1px -1px 1px $warnshadow, -1px 1px 1px $warnshadow;
      }
    }
  }
}
</style>
