<script setup lang="ts">
import ContentType from "../../cactbot/resources/content_type";
import ZoneInfo from "../resources/zoneInfo";
import UserConfig from "../../cactbot/resources/user_config";
import { commonNetRegex } from "../../cactbot/resources/netregexes";
import { LocaleNetRegex } from "../../cactbot/resources/translations";
import OBSWebSocket, { RequestBatchRequest } from "obs-websocket-js";
import { VXETable } from "vxe-table";

const defaultEntireForZones: number[] = [
  ContentType.DutyRoulette,
  ContentType.Dungeons,
  ContentType.DeepDungeons,
  ContentType.VCDungeonFinder,
  ContentType.Pvp,
  ContentType.Trials,
  ContentType.Raids,
  ContentType.UltimateRaids,
];

const ZoneType = {
  Default: "default",
  UltimateOrRaidOrTrials: "ultimateOrRaidOrTrials",
  VcOrDeepDungeons: "vcOrDeepDungeons",
  Pvp: "pvp",
};
const oldPw = JSON.parse(window.localStorage.getItem("obs2-data") ?? "{}")?.password;
const password = useStorage("obs-passwd", oldPw ?? "");
const config = useStorage("aster-obs-config", {
  host: "127.0.0.1:4455",
  greaterThan: 0,
  userRecFilePath: "",
  suffixByZone: true,
  inCombatStart: true,
  autoForZones: defaultEntireForZones,
  recFilePaths: Object.fromEntries(Object.values(ZoneType).map((i) => [i, ""])),
});
const data = {
  partyLength: 1,
  inACTCombat: false,
  zoneID: 0,
  zoneName: "Unknown",
  zoneType: ZoneType.Default,
  reason: "",
};
const status = reactive({
  connected: false,
  recording: false,
});
const obs = new OBSWebSocket();
const showHeader = ref(false);
const showSettings = ref(true);
const showMore = ref(false);
const options = { ...UserConfig.getDefaultBaseOptions() };
const MyLog = window.location.href.includes("?dev=1") ? console.log : () => {};
onMounted(async () => {
  obs.on("ExitStarted", onConnectionClosed);
  obs.on("ConnectionClosed", onConnectionClosed);
  obs.on("ConnectionError", onConnectionClosed);
  obs.on("RecordStateChanged", onRecordStateChanged);
  UserConfig.getUserConfigLocation("obs", options, () => {
    addOverlayListener("LogLine", handleLogLine);
    addOverlayListener("ChangeZone", handleChangeZone);
    addOverlayListener("onInCombatChangedEvent", handleInCombatChanged);
    addOverlayListener("PartyChanged", handlePartyChanged);
    startOverlayEvents();
  });
  if (password.value !== "") {
    await connect(true);
  } else {
    VXETable.modal.alert({ content: "先锁定悬浮窗，再填写端口与密码", title: "初次使用", width: "80%", size: "mini" });
  }
});
onUnmounted(() => {
  obs.off("ExitStarted", onConnectionClosed);
  obs.off("ConnectionClosed", onConnectionClosed);
  obs.off("ConnectionError", onConnectionClosed);
  obs.off("RecordStateChanged", onRecordStateChanged);
  removeOverlayListener("LogLine", handleLogLine);
  removeOverlayListener("ChangeZone", handleChangeZone);
  removeOverlayListener("onInCombatChangedEvent", handleInCombatChanged);
  removeOverlayListener("PartyChanged", handlePartyChanged);
  obs.disconnect();
});

async function connect(init = false) {
  return obs
    .connect(`ws://${config.value.host}`, password.value)
    .then((_v) => {
      if (!config.value.userRecFilePath) {
        getUserRecFilePath();
      }
      obs.call("GetRecordStatus").then((v) => (status.recording = v.outputActive));
      VXETable.modal.message({
        content: "连接成功",
        status: "success",
        width: "7rem",
        size: "mini",
        top: 8,
      });
      status.connected = true;
      showSettings.value = false;
      showHeader.value = true;
      return Promise.resolve(true);
    })
    .catch((_e) => {
      status.connected = false;
      if (init) {
        VXETable.modal.message({
          content: "连接失败",
          status: "error",
          width: "7rem",
          size: "mini",
          top: 8,
        });
      } else {
        showSettings.value = false;
      }
      return Promise.resolve(false);
    });
}

async function getUserRecFilePath() {
  return obs.call("GetRecordDirectory").then((v) => {
    if (v && v.recordDirectory) {
      config.value.userRecFilePath = v.recordDirectory;
      if (config.value.recFilePaths.default === "") {
        config.value.recFilePaths.default = v.recordDirectory;
      }
    }
  });
}

async function setRecordingNameAndFolder(revert = false) {
  if (!status.connected && !(await connect())) {
    return Promise.resolve(false);
  }
  let recFilePath = config.value.userRecFilePath;
  let filenameFormatting = "";
  if (config.value.suffixByZone) {
    filenameFormatting = "%CCYY-%MM-%DD %hh-%mm-%ss";
  }
  if (!revert) {
    if (filenameFormatting) {
      filenameFormatting += " " + data.zoneName.replaceAll(":", "_");
    }
    if (!config.value.userRecFilePath) {
      await getUserRecFilePath();
    }
    recFilePath = config.value.recFilePaths[data.zoneType]?.trim();
    if (!recFilePath) {
      recFilePath = config.value.recFilePaths.default;
    }
  }
  const requests: RequestBatchRequest[] = [];
  if (recFilePath !== "") {
    MyLog("[setFolder] ", { revert, recFilePath });
    requests.push({
      requestType: "SetProfileParameter",
      requestData: {
        parameterCategory: "SimpleOutput",
        parameterName: "FilePath",
        parameterValue: recFilePath,
      },
    });
    requests.push({
      requestType: "SetProfileParameter",
      requestData: {
        parameterCategory: "AdvOut",
        parameterName: "RecFilePath",
        parameterValue: recFilePath,
      },
    });
  }
  if (filenameFormatting !== "") {
    MyLog("[setName] ", { revert, filenameFormatting });
    requests.push({
      requestType: "SetProfileParameter",
      requestData: {
        parameterCategory: "Output",
        parameterName: "FilenameFormatting",
        parameterValue: filenameFormatting,
      },
    });
  }
  if (requests.length > 0) {
    return obs.callBatch(requests);
  }
  return Promise.resolve(true);
}
async function start(reason: string, restart = true, justDoIt = false) {
  MyLog("[obs_start_prepare] ", { recording: status.recording, data, reason, restart, justDoIt });
  try {
    if (data.reason === "countDown") data.reason = reason;
    if (!justDoIt && data.partyLength <= config.value.greaterThan) return Promise.resolve(true);
    if (!status.connected && !(await connect())) return Promise.resolve(false);
    if (status.recording && !restart) return Promise.resolve(true);
    data.reason = reason;
    if (status.recording && restart) {
      await obs.call("StopRecord");
      await new Promise((res) => setTimeout(res, 2000));
    }
    if ((await setRecordingNameAndFolder(false)) !== false) {
      await new Promise((res) => setTimeout(res, 500));
      MyLog("[obs_start] ", { recording: status.recording, data, reason, restart, justDoIt });
      return obs.call("StartRecord").then((_) => setTimeout((_) => setRecordingNameAndFolder(true), 2000));
    }
  } catch (error) {
    console.warn(["obs_start_error"], error);
  }
  return Promise.resolve(false);
}

async function stop(reason = "") {
  MyLog("[obs_stop] ", { recording: status.recording, data, reason });
  return status.recording ? obs.call("StopRecord") : Promise.resolve(true);
}

function onConnectionClosed() {
  status.connected = false;
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

const isWipe = (line: string): boolean => {
  return commonNetRegex.wipe.test(line) || /^41\|[^|]*\|[^|]*\|7DE\|/.test(line);
};
const isCountDownStart = (line: string): boolean => {
  return LocaleNetRegex.countdownStart[options.ParserLanguage].test(line);
};
const isCountDownCancel = (line: string): boolean => {
  return LocaleNetRegex.countdownCancel[options.ParserLanguage].test(line);
};

async function handleLogLine(ev: { line: string[]; rawLine: string; type: string }) {
  if (status.recording) {
    if (isWipe(ev.rawLine)) return stop("wipe");
    if (data.reason === "countDown" && isCountDownCancel(ev.rawLine)) return stop("countDown");
  } else if (isCountDownStart(ev.rawLine)) {
    return start("countDown", false);
  }
  return Promise.resolve();
}

async function handleChangeZone(ev: any) {
  if (data.zoneID === ev.zoneID) return Promise.resolve();
  data.zoneID = ev.zoneID;
  data.zoneName = ev.zoneName;
  data.zoneType = ZoneType.Default;
  const zoneInfo = ZoneInfo[ev.zoneID];
  if (!zoneInfo || !zoneInfo.contentType) {
    MyLog(["changeZone"], { data, ev });
    return stop("changeZone");
  }
  data.zoneName = zoneInfo.name[options.ParserLanguage] ?? ev.zoneName;
  data.zoneType = getZoneType(zoneInfo);
  MyLog(["changeZone"], { data, ev });
  if (config.value.autoForZones.includes(zoneInfo.contentType)) return start("changeZone", false);
  return stop("changeZone");
}

function getZoneType(zoneInfo: any) {
  switch (zoneInfo.contentType) {
    case ContentType.UltimateRaids:
      return ZoneType.UltimateOrRaidOrTrials;
    case ContentType.Pvp:
      return ZoneType.Pvp;
    case ContentType.DeepDungeons:
    case ContentType.VCDungeonFinder:
      return ZoneType.VcOrDeepDungeons;
    case ContentType.Trials:
      if (zoneInfo.name["fr"]?.includes("(extrême)")) return ZoneType.UltimateOrRaidOrTrials;
      break;
    case ContentType.Raids:
      if (zoneInfo.name["en"]?.includes("(Savage)")) return ZoneType.UltimateOrRaidOrTrials;
      break;
  }
  return ZoneType.Default;
}

async function handleInCombatChanged(ev: any) {
  if (!config.value.inCombatStart) {
    return Promise.resolve();
  }
  const prev = data.inACTCombat;
  data.inACTCombat = ev.detail.inACTCombat;
  MyLog(["InCombatChanged"], { now: ev.detail.inACTCombat, prev, zoneName: data.zoneName, recording: status.recording });

  await new Promise((res) => setTimeout(res, 500));

  if (!prev && ev.detail.inACTCombat) {
    return start("inCombat", false);
  }

  const zoneInfo = ZoneInfo[data.zoneID];
  const autoForZone = config.value.autoForZones.includes(zoneInfo?.contentType ?? 0);

  if (prev && !ev.detail.inACTCombat && data.reason === "inCombat" && !autoForZone) {
    return stop("inCombat");
  }

  return Promise.resolve();
}

function handlePartyChanged(e: { party: any[] }) {
  data.partyLength = e.party?.length || 1;
}

function toggleWindow(window: string) {
  showHeader.value = window !== "settings";
  showSettings.value = window === "settings";
}
</script>

<template>
  <header v-show="showHeader">
    <div>
      <i
        v-show="status.connected"
        class="vxe-icon-dot icon"
        :style="{ color: status.recording ? 'red' : 'gray', textShadow: '0px  0px 3px black', margin: '1px' }"
      ></i>
      <vxe-button class="btns" icon="vxe-icon-caret-right" v-show="status.connected && !status.recording" @click="start('manual', false, true)"></vxe-button>
      <vxe-button class="btns" icon="vxe-icon-close" v-show="status.connected && status.recording" @click="stop('manual')" size="mini"></vxe-button>
      <vxe-button class="btns" icon="vxe-icon-cut" v-show="status.connected && status.recording" @click="start('manual', true, true)" size="mini"></vxe-button>
      <vxe-button class="btns settings" icon="vxe-icon-setting" @click="toggleWindow('settings')" size="mini"></vxe-button>
    </div>
  </header>
  <main v-show="showSettings">
    <vxe-form :data="config" :collapseStatus="!showMore" custom-layout size="mini">
      <vxe-form-item span="24" v-show="showSettings" class-name="hidePageBtn">
        <vxe-button size="mini" content="隐藏页面" icon="vxe-icon-eye-fill-close" @click="toggleWindow('header')"></vxe-button>
      </vxe-form-item>
      <vxe-form-item span="24" field="host" title="主机">
        <vxe-input v-model="config.host" size="small" placeholder="127.0.0.1:4455" style="width: 70%; margin-right: -5px"></vxe-input>
        <vxe-button
          content="帮助"
          size="mini"
          icon="vxe-icon-question"
          type="text"
          status="info"
          @click="VXETable.modal.message({ content: '先点击ACT，再点击悬浮窗，即可正常输入' })"
        ></vxe-button>
      </vxe-form-item>
      <vxe-form-item span="24" field="password" title="密码">
        <vxe-input v-model="password" size="small" placeholder="密码" type="password"></vxe-input>
      </vxe-form-item>
      <vxe-form-item span="24" field="inCombatStart" title="进入战斗自动录制">
        <vxe-switch v-model="config.inCombatStart" open-label="是" close-label="否"></vxe-switch>
      </vxe-form-item>
      <vxe-form-item span="24" field="suffixByZone" title="录像文件名添加副本名后缀">
        <vxe-switch v-model="config.suffixByZone" open-label="是" close-label="否"></vxe-switch>
      </vxe-form-item>
      <vxe-form-item span="24" field="greaterThan" title="小队多于">
        <vxe-input v-model="config.greaterThan" size="small" type="integer" min="0" max="8" style="width: 3rem"></vxe-input>
        人自动录制（8:永不自动）
      </vxe-form-item>
      <vxe-form-item span="24" field="autoForZones" title="进入区域自动录制" class-name="zoneAuto" folding title-overflow>
        <vxe-checkbox-group v-model="config.autoForZones">
          <vxe-checkbox :label="ContentType.UltimateRaids" content="绝境战"></vxe-checkbox>
          <vxe-checkbox :label="ContentType.Raids" content="大型Raid"></vxe-checkbox>
          <vxe-checkbox :label="ContentType.Trials" content="讨伐战"></vxe-checkbox>
          <vxe-checkbox :label="ContentType.VCDungeonFinder" content="异闻迷宫"></vxe-checkbox>
          <vxe-checkbox :label="ContentType.DeepDungeons" content="深层迷宫"></vxe-checkbox>
          <vxe-checkbox :label="ContentType.Dungeons" content="4人迷宫"></vxe-checkbox>
          <vxe-checkbox :label="ContentType.Pvp" content="PVP"></vxe-checkbox>
        </vxe-checkbox-group>
      </vxe-form-item>
      <vxe-form-item span="24" title="录像目录（须保证目录存在，可留空）" folding></vxe-form-item>
      <vxe-form-item span="24" title="默认" folding class-name="recPaths">
        <vxe-input v-model="config.recFilePaths.default" size="small" placeholder="留空则使用OBS录像目录" spellcheck="false"></vxe-input>
      </vxe-form-item>
      <vxe-form-item span="24" title="高难" folding class-name="recPaths">
        <vxe-input v-model="config.recFilePaths.ultimateOrRaidOrTrials" size="small" placeholder="绝&零式&极神" spellcheck="false"></vxe-input>
      </vxe-form-item>
      <vxe-form-item span="24" title="深层" folding class-name="recPaths">
        <vxe-input v-model="config.recFilePaths.vcOrDeepDungeons" size="small" placeholder="深层&异闻迷宫" spellcheck="false"></vxe-input>
      </vxe-form-item>
      <vxe-form-item span="24" title="PVP" folding class-name="recPaths">
        <vxe-input v-model="config.recFilePaths.pvp" size="small" placeholder="玩家对战" spellcheck="false"></vxe-input>
      </vxe-form-item>
      <vxe-form-item span="24" collapse-node>
        <vxe-button size="mini" :status="'primary'" icon="vxe-icon-swap" content="连接" @click="connect(true)"></vxe-button>
        <!-- <vxe-button v-show="!status.connected" type="text" status="danger" size="mini" icon="vxe-icon-warning-circle" content="未连接"></vxe-button>
        <vxe-button v-show="status.connected" type="text" status="success" size="mini" icon="vxe-icon-success-circle" content="已连接"></vxe-button> -->
      </vxe-form-item>
    </vxe-form>
  </main>
</template>
<style lang="scss">
body {
  padding: 0;
  margin: 0;
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
      background-color: white;
      float: left;
      padding: 0.1rem 0rem 1rem 0.1rem !important;
      margin: 0rem 0.2rem 0rem 0rem !important;
      height: 1rem !important;
      width: 1.25rem !important;
    }
  }
}

.recPaths.vxe-form--item {
  padding: 0 0 5px 0;
}

.zoneAuto .vxe-checkbox {
  margin-left: 0;
  margin-right: 5px;
  width: 4.65rem;
}

.hidePageBtn.vxe-form--item {
  padding: 5px 0 10px 0;
  margin-top: -10px;
}

main {
  border-radius: 0.3rem;
  background-color: white;
  padding: 1rem;
  margin: 0;
}
</style>
