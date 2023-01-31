<script setup lang="ts">
import OBSWebSocket from "obs-websocket-js";
import { VXETable } from "vxe-table";
const oldPw = JSON.parse(window.localStorage.getItem("obs-data") ?? "{}")?.password;
const data = useStorage("obs2-data", {
  port: "4455",
  password: oldPw ?? "",
  greaterThanOrEqualTo: 4,
  partyLength: 1,
});
const status = reactive({
  connecting: false,
  recording: false,
  inACTCombat: false,
});
const obs = new OBSWebSocket();
const showSettings = ref(true);
const hideUntilConnection = ref(false);
onMounted(async () => {
  obs.on("ExitStarted", onConnectionClosed);
  obs.on("ConnectionClosed", onConnectionClosed);
  obs.on("ConnectionError", onConnectionClosed);
  obs.on("RecordStateChanged", onRecordStateChanged);
  addOverlayListener("onLogEvent", handleLogEvent);
  addOverlayListener("onInCombatChangedEvent", handleInCombatChanged);
  addOverlayListener("PartyChanged", handlePartyChanged);
  startOverlayEvents();
  if (data.value.password !== "") {
    await connect();
    obs.call("GetRecordStatus").then((v) => (status.recording = v.outputActive));
  } else {
    VXETable.modal.alert({ content: "先锁定悬浮窗，再填写端口与密码", title: "初次使用", width: "80%", size: "mini" });
  }
});
onUnmounted(() => {
  obs.off("ExitStarted", onConnectionClosed);
  obs.off("ConnectionClosed", onConnectionClosed);
  obs.off("ConnectionError", onConnectionClosed);
  removeOverlayListener("onLogEvent", handleLogEvent);
  removeOverlayListener("onInCombatChangedEvent", handleInCombatChanged);
  removeOverlayListener("PartyChanged", handlePartyChanged);
  obs.disconnect();
});
async function connect() {
  return obs
    .connect(`ws://127.0.0.1:${data.value.port}`, data.value.password)
    .then((_v) => {
      VXETable.modal.message({
        content: "连接成功",
        status: "success",
        width: "7rem",
        size: "mini",
        top: 8,
      });
      status.connecting = true;
      showSettings.value = false;
      hideUntilConnection.value = false;
    })
    .catch((e) => {
      VXETable.modal.message({
        content: "连接失败",
        status: "error",
        width: "7rem",
        size: "mini",
        top: 8,
      });
      status.connecting = false;
    });
}
async function restart(clickManually: boolean = false) {
  if (!clickManually && data.value.partyLength < data.value.greaterThanOrEqualTo) return Promise.resolve();
  if (!status.connecting) await connect();
  else if (status.recording) {
    obs.call("StopRecord").then(() => setTimeout(() => obs.call("StartRecord"), 1500));
  } else obs.call("StartRecord");
}
async function stop() {
  if (status.recording) return obs.call("StopRecord");
  return Promise.resolve();
}
function onConnectionClosed() {
  status.connecting = false;
}
function onRecordStateChanged(e: { outputActive: boolean; outputState: string }) {
  switch (e.outputState) {
    case "OBS_WEBSOCKET_OUTPUT_STARTED":
      status.recording = true;
      return;
    case "OBS_WEBSOCKET_OUTPUT_STOPPED":
      status.recording = false;
      return;
  }
}
async function handleLogEvent(e: { detail: { logs: string[] } }) {
  for (const log of e.detail.logs) {
    if (
      /^.{14} \w+ 00:(?:00B9|0[12]39)::?(?:距离战斗开始还有|Battle commencing in |戦闘開始まで)\d+[^（(]+[（(]/i.test(
        log,
      )
    )
      restart();
    else if (/^.{14} (Director 21:.{8}:4000000F|Territory 01:|ChatLog 00:0038::end$)/i.test(log)) stop();
  }
}
async function handleInCombatChanged(ev: any) {
  if (!status.inACTCombat && ev.detail.inACTCombat) restart();
  if (status.inACTCombat && !ev.detail.inACTCombat) stop();
  status.inACTCombat = ev.detail.inACTCombat;
}
function handlePartyChanged(e: { party: any[] }) {
  data.value.partyLength = Math.max(e.party.length, 1);
}
</script>

<template>
  <header v-show="!hideUntilConnection">
    <div v-show="status.connecting">
      <i
        class="vxe-icon-dot icon"
        :style="{ color: status.recording ? 'red' : 'gray', textShadow: '0px  0px 3px black' }"
      ></i>
      <vxe-button
        class="btns"
        icon="vxe-icon-caret-right"
        v-show="!status.recording"
        @click="restart(true)"
      ></vxe-button>
      <vxe-button class="btns" icon="vxe-icon-close" v-show="status.recording" @click="stop" size="mini"></vxe-button>
      <vxe-button
        class="btns"
        icon="vxe-icon-cut"
        v-show="status.recording"
        @click="restart(true)"
        size="mini"
      ></vxe-button>
      <vxe-button
        class="btns settings"
        icon="vxe-icon-setting"
        @click="showSettings = !showSettings"
        size="mini"
      ></vxe-button>
    </div>
    <div v-show="!status.connecting">
      <vxe-button
        class="btns"
        style="width: auto !important"
        size="medium"
        icon="vxe-icon-eye-fill-close"
        @click="hideUntilConnection = true"
        >隐藏页面</vxe-button
      >
    </div>
  </header>
  <main p-b-2 v-show="!hideUntilConnection && (!status.connecting || showSettings)">
    <vxe-form :data="data">
      <vxe-form-item span="24">
        <template #default="{ data }">
          自动录制最少小队人数
          <vxe-input
            v-model="data.greaterThanOrEqualTo"
            size="small"
            type="integer"
            min="1"
            max="8"
            style="width: 3rem; margin-right: 5px"
          ></vxe-input>
        </template>
      </vxe-form-item>
      <vxe-form-item span="24">
        <template #default="{ data }">
          端口
          <vxe-input
            v-model="data.port"
            size="small"
            placeholder="端口号"
            style="width: 4rem; margin-right: 5px"
          ></vxe-input>
        </template>
      </vxe-form-item>
      <vxe-form-item span="24">
        <template #default="{ data }">
          密码
          <vxe-input
            v-model="data.password"
            size="small"
            placeholder="密码"
            type="password"
            style="width: 12rem"
          ></vxe-input>
          <vxe-button
            content="无法输入"
            size="mini"
            icon="vxe-icon-question"
            type="text"
            status="info"
            @click="VXETable.modal.message({ content: '先点击ACT，再点击悬浮窗，即可正常输入' })"
          ></vxe-button>
        </template>
      </vxe-form-item>
    </vxe-form>
    <vxe-button size="mini" :status="'primary'" icon="vxe-icon-swap" content="连接" @click="connect"></vxe-button>
    <vxe-button
      type="text"
      status="info"
      size="mini"
      icon="vxe-icon-warning-circle"
      content="未连接到OBS"
      :disabled="true"
    ></vxe-button>
  </main>
</template>
<style lang="scss">
body {
  padding: 0;
  margin: 0.3rem 0;
  overflow-x: hidden;
}
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
::-webkit-scrollbar-track {
  background-color: rgba(51, 51, 51, 1);
}
::-webkit-scrollbar-thumb {
  height: 30px;
  border-radius: 5px;
  background-color: rgba(216, 216, 216, 0.4);
}
::-webkit-scrollbar-thumb:active {
  background-color: rgba(160, 160, 160, 1);
}
header {
  > div {
    position: relative;
    top: 0.25rem;
    left: 0.25rem;
    .icon {
      float: left;
    }
    .btns {
      float: left;
      padding: 0.1rem 0rem 1rem 0.1rem !important;
      margin: 0rem 0.2rem 0rem 0rem !important;
      height: 1rem !important;
      width: 1.25rem !important;
    }
  }
}
main {
  border-radius: 0.3rem;
  background-color: white;
  padding: 1rem;
  padding-top: 1.5rem;
  margin: 0;
}
</style>
