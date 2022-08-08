<template>
  <form>
    地址<input type="text" v-model="data.ip" />
    <br />
    端口<input type="text" v-model="data.port" />
    <br />
    密码<input type="password" v-model="data.password" autocomplete="on" />
    <br />
    <label style="user-select: none" for="auto"> <input type="checkbox" id="auto" v-model="data.autoConnect" /> 自动连接 </label>
    <label style="user-select: none" for="partyLength">
      <input type="checkbox" id="partyLength" v-model="data.partyLength" /> 仅在小队人数在5~8人时录制
    </label>
    <br />
    <button @click="handleClickToSave">保存设置</button>
  </form>
  <br />
  <p>连接状态：{{ data.status }}</p>
  <button :disabled="data.connect" @click="handleClickToConnect">连接</button>
  <button :disabled="!data.connect" @click="handleClickToDisconnect">断开</button>
</template>

<script lang="ts" setup>
import OBSWebSocket from "obs-websocket-js";
import { reactive } from "vue";
import "../common/hasOverlayPluginApi";
type Data = { ip: string; port: string; password: string; connect: boolean; status: string; autoConnect: boolean; partyLength: boolean };
let inACTCombat = false;
const data: Data = reactive({
  ip: "127.0.0.1",
  port: "4455",
  password: "Yim1psOoJJ8s96Lc",
  autoConnect: false,
  partyLength: true,
  connect: false,
  status: "空闲",
});
const partyData = { party: [] };
loadSettings();
const obs = new OBSWebSocket();
obs.on("ExitStarted", onConnectionClosed);
obs.on("ConnectionClosed", onConnectionClosed);
obs.on("ConnectionError", onConnectionClosed);
addOverlayListener("onLogEvent", handleLogEvent);
addOverlayListener("onInCombatChangedEvent", handleInCombatChanged);
addOverlayListener("PartyChanged", handlePartyChanged);
startOverlayEvents();
setTimeout(async () => {
  if (data.autoConnect) await ObsConnect();
}, 1000);
function loadSettings() {
  const p = JSON.parse(localStorage.getItem("ObsData") ?? "{}");
  data.ip = p?.ip ?? data.ip;
  data.port = p?.port ?? data.port;
  data.password = p?.password ?? data.password;
  data.autoConnect = p?.autoConnect ?? data.autoConnect;
}
function handleClickToSave() {
  localStorage.setItem(
    "ObsData",
    JSON.stringify({ ip: data.ip, port: data.port, password: data.password, autoConnect: data.autoConnect, partyLength: data.partyLength })
  );
}
function onConnectionClosed() {
  data.status = "closed";
  data.connect = false;
}
async function ObsConnect() {
  try {
    const { obsWebSocketVersion, negotiatedRpcVersion } = await obs.connect(`ws://127.0.0.1:${data.port}`, data.password, {
      rpcVersion: 1,
    });
    data.status = `成功 ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`;
    data.connect = true;
  } catch (error: any) {
    data.status = `失败 ${error.code} ${error.message}`;
    data.connect = false;
  }
}
async function handleClickToConnect() {
  await ObsConnect();
}
async function handleClickToDisconnect() {
  await obs.disconnect();
}
async function startRecord() {
  if (data.partyLength && partyData.party.length <= 8 && partyData.party.length >= 5) await obs.call("StartRecord");
}
async function stopRecord() {
  await obs.call("StopRecord");
}
async function restartRecord() {
  await stopRecord();
  await startRecord();
}
function handleInCombatChanged(ev: any) {
  if (!inACTCombat && ev.detail.inACTCombat) restartRecord();
  if (inACTCombat && !ev.detail.inACTCombat) stopRecord();
  inACTCombat = ev.detail.inACTCombat;
}
function handleLogEvent(e: any) {
  for (const log of e.detail.logs) {
    if (/^.{14} \w+ 00:(?:00b9|0139)::?(?:距离战斗开始还有|Battle commencing in |戦闘開始まで)\d+[^（(]+[（(]/.test(log)) restartRecord();
    else if (/^.{14} (?:Director |)21:.{8}:4000001[026]/.test(log) || /^.{14} ChatLog 00:0038::end$/.test(log)) stopRecord();
  }
}
function handlePartyChanged(e: any) {
  partyData.party = e?.party ?? [];
}
</script>

<style lang="scss" scoped></style>
