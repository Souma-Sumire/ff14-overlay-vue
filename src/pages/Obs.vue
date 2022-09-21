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
        <input type="checkbox" id="partyLength" v-model="data.partyLength" /> 仅在小队人数在5~8人时录制
      </label>
      <br />
      <button @click="handleClickToSave">保存设置</button>
    </form>
    <br />
    <p>连接状态：{{ data.status }}</p>
    <button :disabled="data.connect" @click="handleClickToConnect">连接</button>
    <button :disabled="!data.connect" @click="handleClickToDisconnect">断开</button>
    <!-- <button :disabled="!data.connect" @click="restartRecord">手动开始录制</button> -->
  </div>
</template>

<script lang="ts" setup>
import OBSWebSocket from "obs-websocket-js";
import { reactive } from "vue";
// import "../common/hasOverlayPluginApi";
type Data = {
  ip: string;
  port: string;
  password: string;
  connect: boolean;
  status: string;
  autoConnect: boolean;
  partyLength: boolean;
  passowrdShow: boolean;
};
let inACTCombat = false;
const data: Data = reactive({
  ip: "127.0.0.1",
  port: "4455",
  password: "",
  autoConnect: true,
  partyLength: true,
  connect: false,
  status: "空闲",
  passowrdShow: false,
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
  data.partyLength = p?.partyLength ?? data.partyLength;
}
function handleClickToSave() {
  localStorage.setItem(
    "ObsData",
    JSON.stringify({
      ip: data.ip,
      port: data.port,
      password: data.password,
      autoConnect: data.autoConnect,
      partyLength: data.partyLength,
    }),
  );
}
function onConnectionClosed() {
  data.status = "closed";
  data.connect = false;
}
async function ObsConnect() {
  try {
    const { obsWebSocketVersion, negotiatedRpcVersion } = await obs.connect(
      `ws://127.0.0.1:${data.port}`,
      data.password,
      {
        rpcVersion: 1,
      },
    );
    data.status = `成功 ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`;
    data.connect = true;
    Promise.resolve();
  } catch (error: any) {
    data.status = `失败 ${error.code} ${error.message}`;
    data.connect = false;
    Promise.reject(error.code);
  }
}
async function handleClickToConnect() {
  await ObsConnect();
}
async function handleClickToDisconnect() {
  await obs.disconnect();
}
function startRecord() {
  if (!data.connect) {
    ObsConnect()
      .then(() => {
        if (data.partyLength && partyData.party.length <= 8 && partyData.party.length >= 5)
          obs.call("StartRecord").catch(() => {});
        else if (!data.partyLength) obs.call("StartRecord").catch(() => {});
      })
      .catch(() => {
        setTimeout(() => {
          startRecord();
        }, 3000);
      });
  } else {
    if (data.partyLength && partyData.party.length <= 8 && partyData.party.length >= 5)
      obs.call("StartRecord").catch(() => {});
    else if (!data.partyLength) obs.call("StartRecord").catch(() => {});
  }
}
async function stopRecord() {
  await obs.call("StopRecord").catch(() => {});
}
function restartRecord() {
  obs
    .call("GetRecordStatus")
    .then(async (v) => {
      if (v.outputActive)
        await stopRecord()
          .then(() => setTimeout(() => restartRecord(), 1000))
          .catch(() => {});
      else startRecord();
    })
    .catch(() => {});
}
async function handleInCombatChanged(ev: any) {
  if (!inACTCombat && ev.detail.inACTCombat) restartRecord();
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
