<template>
  <div id="container">
    <form>
      地址<input type="text" v-model="data.ip" />
      <br />
      端口<input type="text" v-model="data.port" />
      <br />
      密码<input :type="data.passowrdShow ? 'text' : 'password'" v-model="data.password" autocomplete="on" /><button
        @click="data.passowrdShow = !data.passowrdShow"
      >
        👀
      </button>
      <br />
      <label style="user-select: none" for="auto">
        <input type="checkbox" id="auto" v-model="data.autoConnect" /> 自动连接
      </label>
      <label style="user-select: none" for="partyLength">
        <input type="checkbox" id="partyLength" v-model="data.partyLength" /> 仅5~8人时录制
      </label>
    </form>
    <br />
    <p>状态：{{ data.status }}</p>
    <button :disabled="data.connect" @click="handleClickToConnect">连接</button>
    <button :disabled="!data.connect" @click="handleClickToDisconnect">断开</button>
    <!-- <button :disabled="!data.connect" @click="restartRecord">手动开始录制</button> -->
  </div>
</template>

<script lang="ts" setup>
import OBSWebSocket from "obs-websocket-js";
// import "../common/hasOverlayPluginApi";
let inACTCombat = false;
const data = useStorage(
  "obs-data",
  reactive({
    ip: "127.0.0.1",
    port: "4455",
    password: "",
    autoConnect: true,
    partyLength: true,
    connect: false,
    status: "空闲",
    passowrdShow: false,
  }),
);
const partyData = { party: [] };
const obs = new OBSWebSocket();
obs.on("ExitStarted", onConnectionClosed);
obs.on("ConnectionClosed", onConnectionClosed);
obs.on("ConnectionError", onConnectionClosed);
addOverlayListener("onLogEvent", handleLogEvent);
addOverlayListener("onInCombatChangedEvent", handleInCombatChanged);
addOverlayListener("PartyChanged", handlePartyChanged);
startOverlayEvents();
setTimeout(async () => {
  if (data.value.autoConnect) await ObsConnect();
}, 1000);
function onConnectionClosed() {
  data.value.status = "closed";
  data.value.connect = false;
}
async function ObsConnect() {
  try {
    const { obsWebSocketVersion, negotiatedRpcVersion } = await obs.connect(
      `ws://127.0.0.1:${data.value.port}`,
      data.value.password,
      {
        rpcVersion: 1,
      },
    );
    data.value.status = `成功 ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`;
    data.value.connect = true;
    Promise.resolve();
  } catch (error: any) {
    data.value.status = `失败 ${error.code} ${error.message}`;
    data.value.connect = false;
    Promise.reject(error.code);
  }
}
async function handleClickToConnect() {
  await ObsConnect();
}
async function handleClickToDisconnect() {
  await obs.disconnect();
}
async function startRecord() {
  if (!data.value.connect) await ObsConnect().then(() => obs.call("StartRecord"));
  else {
    if (data.value.partyLength) {
      if (partyData.party.length <= 8 && partyData.party.length >= 5) obs.call("StartRecord");
    } else obs.call("StartRecord");
  }
}
async function stopRecord() {
  await obs.call("StopRecord");
}
function restartRecord() {
  obs.call("GetRecordStatus").then(async (v) => {
    if (v.outputActive) await stopRecord().then(() => setTimeout(() => restartRecord(), 1000));
    else startRecord();
  });
}
async function handleInCombatChanged(ev: any) {
  if (!inACTCombat && ev.detail.inACTCombat) startRecord();
  if (inACTCombat && !ev.detail.inACTCombat) stopRecord();
  inACTCombat = ev.detail.inACTCombat;
}
async function handleLogEvent(e: any) {
  for (const log of e.detail.logs) {
    if (
      /^.{14} \w+ 00:(?:00B9|0139)::?(?:距离战斗开始还有|Battle commencing in |戦闘開始まで)\d+[^（(]+[（(]/i.test(log)
    )
      restartRecord();
    else if (/^.{14} (?:Director |)21:.{8}:400000(?:0F|10)/.test(log) || /^.{14} ChatLog 00:0038::end$/i.test(log))
      stopRecord();
  }
}
function handlePartyChanged(e: any) {
  partyData.party = e?.party ?? [];
}
window.onunload = async () => {
  await obs.disconnect();
};
</script>

<style lang="scss" scoped>
#container {
  background-color: white;
}
</style>
