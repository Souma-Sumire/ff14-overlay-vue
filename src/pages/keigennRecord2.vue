<template>
  <div class="wrapper" :style="style">
    <header>
      <vxe-select v-show="!minimize" v-model="select" size="mini" class="select">
        <vxe-option
          v-for="i in data.length"
          :key="`${data[i - 1].key}-${data[i - 1].duration}-${data[i - 1].zoneName}`"
          :value="i - 1"
          :label="`${data[i - 1].duration} ${data[i - 1].zoneName}`"
        ></vxe-option>
      </vxe-select>
      <vxe-button
        class="minimize"
        :icon="minimize ? 'vxe-icon-fullscreen' : 'vxe-icon-minimize'"
        @click="clickMinimize"
        :style="{ opacity: minimize ? 0.5 : 1 }"
      ></vxe-button>
    </header>
    <main v-show="!minimize">
      <vxe-table
        ref="xTable"
        size="mini"
        class="vxe-table"
        show-overflow=""
        round
        height="100%"
        :scroll-y="{ enabled: true }"
        :show-header="userOptions.showHeader"
        :data="data[select].table"
        :row-config="{ isHover: true, height: config.line_height }"
        :header-cell-style="{
          padding: '0px',
        }"
        @cell-menu="cellContextMenuEvent"
        :menu-config="menuConfig"
        @menu-click="contextMenuClickEvent"
      >
        >
        <vxe-column :width="config.time" field="time" title="时间" align="center" />
        <vxe-column
          :width="config.action"
          :field="userOptions.actionCN ? 'actionCN' : 'action'"
          title="技能"
          :filters="actionOptions"
          :filter-multiple="false"
          :resizable="false"
          align="center"
        />
        <vxe-column
          :width="config.target"
          field="target"
          :title="userOptions.showName ? '目标' : '目'"
          :filters="targetOptions"
          :filter-multiple="false"
          :resizable="!userOptions.anonymous && !userOptions.abbrId"
          align="left"
          header-align="center"
        >
          <template #default="{ row }">
            <Target :row="row"></Target>
          </template>
        </vxe-column>
        <vxe-column :width="config.amount" title="伤害" align="right" header-align="center">
          <template #default="{ row }">
            <Amount :row="row"></Amount>
          </template>
        </vxe-column>
        <vxe-column title="减伤" align="left">
          <template #default="{ row }">
            <KeigennShow :row="row"></KeigennShow>
          </template>
        </vxe-column>
      </vxe-table>
    </main>
  </div>
  <div v-if="isDev" class="testLog">
    <testLog @before-handle="beforeHandle" @after-handle="afterHandle" @handle-line="handleLine"></testLog>
  </div>
</template>

<script setup lang="tsx">
import testLog from "@/components/testLog.vue";
import NetRegexes from "../../cactbot/resources/netregexes";
import logDefinitions from "../../cactbot/resources/netlog_defs";
import { DamageEffect, DamageType, processAbilityLine, processFlags, translationFlags } from "@/utils/flags";
import { Ref } from "vue";
import { VXETable, VxeTableEvents, VxeTableInstance, VxeTablePropTypes } from "vxe-table";
import Util from "@/utils/util";
import {
  Keigenn,
  PerformanceType,
  getKeigenn,
  loadKeigenn,
  multiplierEffect,
  universalVulnerableEnemy,
  universalVulnerableFriendly,
} from "@/resources/keigenn";
import { useUrlSearchParams } from "@vueuse/core";
import { getActionChinese } from "@/resources/actionChinese";
import { completeIcon, stackUrl } from "@/resources/status";
import { deepClone } from "@/utils/deepClone";

interface RowVO {
  timestamp: number;
  time: string;
  id?: string;
  actionCN: string;
  action: string;
  source: string;
  target: string;
  targetId: string;
  job: string;
  jobIcon: string;
  jobEnum: number;
  amount: number;
  keigenns: Status[];
  currentHp: number;
  maxHp: number;
  effect: DamageEffect;
  type: DamageType;
  shield: string;
  povId: string;
}

interface Status {
  name: string;
  count: number;
  effect: string;
  effectId: string;
  source: string;
  sourceId: string;
  target: string;
  targetId: string;
  expirationTimestamp: number;
  performance: PerformanceType;
  fullIcon: string;
  isPov: boolean;
  remainingDuration?: string;
}

interface Encounter {
  key: string;
  zoneName: string;
  duration: string;
  table: RowVO[];
}

const params = useUrlSearchParams("hash");
const isDev = ref(params.dev === "1" || (params.dev === undefined && !window.OverlayPluginApi && !params.OVERLAY_WS && !params.HOST_PORT));

if (isDev.value) {
  // 某些情况下OverlayPluginApi并不会立即被挂在到window上。用户上报，未复现。
  setTimeout(() => {
    isDev.value = params.dev === "1" || (params.dev === undefined && !window.OverlayPluginApi && !params.OVERLAY_WS && !params.HOST_PORT);
  }, 1000);
}

function parseParams<T>(v: string, def: T): T {
  if (typeof def === "boolean") {
    if (v === "0") return false as T;
    if (v === "1") return true as T;
    return def;
  }
  if (typeof def === "number") {
    return isNaN(+v) ? def : (+v as T);
  }
  return def;
}

const userOptions = {
  scale: parseParams(params.scale as string, 1), // 缩放倍率
  showHeader: parseParams(params.showHeader as string, true), // 显示表头
  showIcon: parseParams(params.showIcon as string, true), // 显示目标图标
  showName: parseParams(params.showName as string, false), // 显示目标ID
  abbrId: parseParams(params.abbrId as string, true), // 目标ID缩写
  anonymous: parseParams(params.anonymous as string, true), // 目标ID改为职业名
  replaceWithYou: parseParams(params.replaceWithYou as string, false), // 目标是玩家本人替换为YOU
  parseAA: parseParams(params.parseAA as string, true), // 解析自动攻击（旧结果不会跟随改变）
  parseDoT: parseParams(params.parseDoT as string, false), // 解析DoT（旧结果不会跟随改变）
  // pushMode: parseParams(params.pushMode as string, true), // 底部开始添加并自动向下滚动（低性能）
  minimize: parseParams(params.minimize as string, false), // 启动时迷你化
  actionCN: parseParams(params.actionCN as string, true), // action显示中文化
  statusCN: parseParams(params.statusCN as string, true), // status显示中文化
};

const actionKey = computed(() => (userOptions.actionCN ? "actionCN" : "action"));
const minimize = ref(userOptions.minimize);
const icon4k = userOptions.scale >= 2 || window.devicePixelRatio >= 2 ? "_hr1" : "";

const config = {
  line_height: 28 * userOptions.scale,
  time: 40 * userOptions.scale,
  action: 65 * userOptions.scale,
  target:
    ((userOptions.showIcon ? 24 : 0) + (userOptions.showName ? (userOptions.anonymous || (!userOptions.anonymous && userOptions.abbrId) ? 24 : 36) : 0) + 7) *
    userOptions.scale,
  source: 90 * userOptions.scale,
  amount: 47 * userOptions.scale,
};

const style = {
  "--vxe-font-size-mini": 12 * userOptions.scale + "px",
  "--vxe-table-row-line-height": 30 * userOptions.scale + "px",
  "--vxe-table-row-height-mini": 30 * userOptions.scale + "px",
  "--vxe-input-height-mini": 20 * userOptions.scale + "px",
  "--vxe-select-option-height-mini": 24 * userOptions.scale + "px",
};

const maxStorage = {
  runtime: 99,
  localStorage: 3,
};

// let lastPush: number = Date.now();
// let lastScroll: number = 0;

interface PlayerSP extends Player {
  timestamp: number;
}

const xTable = ref<VxeTableInstance>();
// const allowAutoScroll = ref(true);
const povName = useStorage("keigenn-record-2-pov-name", "");
const povId = useStorage("keigenn-record-2-pov-id", "");
const partyLogList = useStorage("keigenn-record-2-party-list", [] as string[]);
const jobMap = useStorage("keigenn-record-2-job-map", {} as Record<string, { job: number; timestamp: number }>);
const partyEventParty = useStorage("keigenn-record-2-party-event-party", [] as PlayerSP[]);
const select = ref(0);
const data = ref<Encounter[]>([{ zoneName: "", duration: "00:00", table: [], key: "init" }]);
const regexes: Record<string, RegExp> = {
  rsv: /^262\|(?<timestamp>[^|]*)\|[^|]*\|[^|]*\|_rsv_(?<id>\d*)[^|]*\|(?<real>[^|]*)\|/i,
  ability: NetRegexes.ability(),
  statusEffectExplicit: NetRegexes.statusEffectExplicit(),
  gainsEffect: NetRegexes.gainsEffect(),
  losesEffect: NetRegexes.losesEffect(),
  inCombat: /^260\|(?<timestamp>[^|]*)\|(?<inACTCombat>[^|]*)\|(?<inGameCombat>[^|]*)\|/i,
  changeZone: NetRegexes.changeZone(),
  partyList: /^11\|(?<timestamp>[^|]*)\|(?<partyCount>\d*)\|(?<list>(?:\w{8}\|){0,})\w{16}/i,
  primaryPlayer: /^02\|(?<timestamp>[^|]*)\|(?<id>[^|]*)\|(?<name>[^|]*)/,
  addCombatant: NetRegexes.addedCombatant(),
  removingCombatant: NetRegexes.removingCombatant(),
  networkDoT: NetRegexes.networkDoT(),
};

const STORAGE_KEY = "souma-keigenn-record-2";
const combatTimeStamp: Ref<number> = ref(0);
const zoneName = useStorage("souma-keigenn-record-2-zone-name", "" as string);
const rsvData = useStorage("souma-keigenn-record-2-rsv-data", {} as Record<number, string>);
const shieldData: Record<string, string> = {};
const statusData: { friendly: { [id: string]: { [effectId: string]: Status } }; enemy: { [name: string]: { [effectId: string]: Status } } } = {
  friendly: {},
  enemy: {},
};

const resetLine = (line: Encounter) => {
  line.table.length = 0;
  line.zoneName = "";
  line.duration = "00:00";
  line.key = "init";
};

const beforeHandle = () => {
  combatTimeStamp.value = 0;
  select.value = 0;
  data.value.length = 1;
  resetLine(data.value[0]);
};

const afterHandle = () => {
  saveStorage();
};

const handleLogLine = (e: { type: string; line: string[]; rawLine: string }) => {
  handleLine(e.rawLine);
};

const handleLine = (line: string) => {
  for (const regexName in regexes) {
    const regex = regexes[regexName];
    const match = regex.exec(line);
    if (match) {
      const splitLine = line.split("|");
      switch (regexName) {
        case "statusEffectExplicit":
          if (match.groups!.targetId[0] === "1") {
            shieldData[match.groups!.targetId] = match.groups!.currentShield;
          }
          break;
        case "gainsEffect":
          {
            const effectId = splitLine[logDefinitions.GainsEffect.fields.effectId];
            const effect = splitLine[logDefinitions.GainsEffect.fields.effect];
            const target = splitLine[logDefinitions.GainsEffect.fields.target];
            const targetId = splitLine[logDefinitions.GainsEffect.fields.targetId];
            const count = Number(splitLine[logDefinitions.GainsEffect.fields.count]);
            let keigenn: Keigenn | undefined = getKeigenn(effectId);
            if (!keigenn) {
              const vulnerable =
                (targetId.startsWith("1") && universalVulnerableFriendly.get(parseInt(effectId, 16).toString())) ||
                (targetId.startsWith("4") && universalVulnerableEnemy.get(parseInt(effectId, 16).toString()));
              if (!vulnerable) return;
              const fullIcon = completeIcon(vulnerable.icon);
              const realIcon = count > 1 ? stackUrl(fullIcon, count) : fullIcon;
              keigenn = {
                type: "multiplier",
                performance: { physics: 1, magic: 1, darkness: 1 },
                id: parseInt(effectId, 16),
                icon: vulnerable.icon,
                fullIcon: realIcon,
                name: vulnerable.name,
                isFriendly: vulnerable.isFriendly,
              };
            }
            const duration = splitLine[logDefinitions.GainsEffect.fields.duration];
            const source = splitLine[logDefinitions.GainsEffect.fields.source];
            const sourceId = splitLine[logDefinitions.GainsEffect.fields.sourceId];
            const timestamp = new Date(splitLine[logDefinitions.GainsEffect.fields.timestamp]).getTime();
            const expirationTimestamp = timestamp + parseFloat(duration) * 1000;
            const status: Status = {
              name: keigenn.name,
              count,
              effect,
              effectId,
              source,
              sourceId,
              target,
              targetId,
              expirationTimestamp,
              performance: keigenn.performance,
              fullIcon: keigenn.fullIcon,
              isPov: povId.value === sourceId,
            };
            if (targetId[0] === "1" && keigenn.isFriendly) {
              (statusData.friendly[targetId] ??= {})[effectId] = status;
            } else if (targetId[0] === "4" && !keigenn.isFriendly) {
              (statusData.enemy[target] ??= {})[effectId] = status;
            }
          }
          break;
        case "losesEffect":
          {
            const target = splitLine[logDefinitions.LosesEffect.fields.target];
            const targetId = splitLine[logDefinitions.LosesEffect.fields.targetId];
            const effectId = splitLine[logDefinitions.LosesEffect.fields.effectId];
            if (targetId[0] === "1") {
              if (statusData.friendly[targetId]) {
                Reflect.deleteProperty(statusData.friendly[targetId], effectId);
              }
            } else {
              if (statusData.enemy[target]) {
                Reflect.deleteProperty(statusData.enemy[target], effectId);
              }
            }
          }
          break;
        case "addCombatant":
          if (splitLine[logDefinitions.AddedCombatant.fields.job] !== "00") {
            const job = splitLine[logDefinitions.AddedCombatant.fields.job];
            const timestamp = new Date(splitLine[logDefinitions.AddedCombatant.fields.timestamp]).getTime();
            jobMap.value[splitLine[logDefinitions.AddedCombatant.fields.id]] = { job: parseInt(job, 16), timestamp };
          }
          break;
        case "removingCombatant":
          Reflect.deleteProperty(jobMap.value, splitLine[logDefinitions.RemovedCombatant.fields.id]);
          break;
        case "primaryPlayer":
          povId.value = splitLine[logDefinitions.ChangedPlayer.fields.id];
          const _povName = splitLine[logDefinitions.ChangedPlayer.fields.name];
          if (povName.value === _povName) return;
          povName.value = _povName;
          initEnvironment(splitLine[logDefinitions.ChangedPlayer.fields.name]);
          break;
        case "partyList":
          partyLogList.value = match.groups!.list?.split("|") ?? [];
          break;
        case "changeZone":
          zoneName.value = splitLine[logDefinitions.ChangeZone.fields.name];
          stopCombat(new Date(splitLine[logDefinitions.ChangeZone.fields.timestamp]).getTime());
          break;
        case "inCombat":
          {
            const inACTCombat = splitLine[logDefinitions.InCombat.fields.inACTCombat] === "1";
            const inGameCombat = splitLine[logDefinitions.InCombat.fields.inGameCombat] === "1";
            const timeStamp = new Date(splitLine[logDefinitions.InCombat.fields.timestamp]).getTime();
            if (inACTCombat || inGameCombat) {
              // new combat
              if (combatTimeStamp.value > 0) return;
              if (data.value[0].table.length !== 0) {
                data.value[0] = markRaw(data.value[0]);
                data.value.unshift({ zoneName: "", duration: "00:00", table: [], key: splitLine[logDefinitions.InCombat.fields.timestamp] });
                if (data.value.length >= maxStorage.runtime) data.value.splice(data.value.length - 1, 1);
              }
              combatTimeStamp.value = timeStamp;
              data.value[0].zoneName = zoneName.value;
              select.value = 0;
              return;
            }
            if (!inACTCombat && !inGameCombat) {
              // stop combat
              stopCombat(timeStamp);
              return;
            }
          }
          break;
        case "rsv":
          {
            const id = Number(match.groups!.id as string);
            const real = splitLine[logDefinitions.RSVData.fields.value];
            rsvData.value[Number(id)] = real;
          }
          break;
        case "networkDoT":
          if (!userOptions.parseDoT) return;
          {
            const which = splitLine[logDefinitions.NetworkDoT.fields.which];
            const targetId = splitLine[logDefinitions.NetworkDoT.fields.id];
            if (
              which !== "DoT" ||
              targetId[0] === "4" ||
              !(targetId === povId.value || partyLogList.value.includes(targetId) || partyEventParty.value.find((v) => v.id === targetId))
            ) {
              return;
            }
            const target = splitLine[logDefinitions.NetworkDoT.fields.name];
            const damage = splitLine[logDefinitions.NetworkDoT.fields.damage];
            const amount = parseInt(damage, 16);
            const timestamp = new Date(splitLine[logDefinitions.Ability.fields.timestamp] ?? "???").getTime();
            const currentHp = Number(splitLine[logDefinitions.NetworkDoT.fields.currentHp]);
            const maxHp = Number(splitLine[logDefinitions.NetworkDoT.fields.maxHp]);
            const time = combatTimeStamp.value === 0 ? 0 : timestamp - combatTimeStamp.value;
            const formattedTime = formatTime(time);
            const targetJob = getJobById(targetId);
            // const targetJob = jobMap.value[targetId].job ?? target.substring(0, 2);
            const job = Util.nameToFullName(Util.jobEnumToJob(targetJob)).simple2;
            const jobEnum = targetJob;
            const jobIcon = Util.jobEnumToIcon(jobEnum).toLocaleLowerCase();
            // dot/hot日志的source不准确 故无法计算目标减
            addRow({
              timestamp,
              time: formattedTime,
              id: undefined,
              action: which,
              actionCN: which,
              source: "",
              target,
              targetId,
              job,
              jobIcon,
              jobEnum,
              amount,
              keigenns: [],
              currentHp,
              maxHp,
              effect: "damage done",
              type: "dot",
              shield: shieldData[targetId],
              povId: povId.value,
            });
          }
          break;
        case "ability":
          if (combatTimeStamp.value === 0) return;
          {
            const ability = processAbilityLine(splitLine);
            if (ability.isAttack && ability.amount >= 0) {
              const sourceId = splitLine[logDefinitions.Ability.fields.sourceId] ?? "???";
              const targetId = splitLine[logDefinitions.Ability.fields.targetId] ?? "???";
              if (!(sourceId[0] === "4" && targetId[0] === "1")) {
                return;
              }
              if (!(targetId === povId.value || partyLogList.value.includes(targetId) || partyEventParty.value.find((v) => v.id === targetId))) {
                return;
              }
              const timestamp = new Date(splitLine[logDefinitions.Ability.fields.timestamp] ?? "???").getTime();
              const rawAblityName = splitLine[logDefinitions.Ability.fields.ability];
              const rsvMatch = rawAblityName.match(/^_rsv_(?<id>\d+)_/);
              const id = splitLine[logDefinitions.Ability.fields.id] ?? "???";
              let action = rawAblityName;
              if (rsvMatch) {
                const id: number = Number(rsvMatch.groups!.id);
                action = rsvData.value[id] ?? rawAblityName.match(/^_(?<id>rsv_\d+)_/)!.groups!.id;
              } else {
                action = action.replace(/unknown_.*/, "攻击");
                if (userOptions.parseAA === false && /^攻击|攻撃|[Aa]ttack$/.test(action)) return;
              }
              const cn = getActionChinese(parseInt(id, 16));
              const actionCN = cn && cn !== "" ? cn : action;
              const currentHp = Number(splitLine[logDefinitions.Ability.fields.targetCurrentHp]) ?? "???";
              const maxHp = Number(splitLine[logDefinitions.Ability.fields.targetMaxHp]) ?? "???";
              const source = splitLine[logDefinitions.Ability.fields.source] ?? "???";
              const target = splitLine[logDefinitions.Ability.fields.target] ?? "???";
              const { effect, type } = processFlags(ability.flags);
              const time = combatTimeStamp.value === 0 ? 0 : timestamp - combatTimeStamp.value;
              const formattedTime = formatTime(time);
              const targetJob = getJobById(targetId);
              // const targetJob = jobMap.value[targetId].job ?? target.substring(0, 2);
              const job = Util.nameToFullName(Util.jobEnumToJob(targetJob)).cn.substring(0, 2);
              const jobEnum = targetJob;
              const jobIcon = Util.jobEnumToIcon(jobEnum).toLocaleLowerCase();
              const keigenns = deepClone(
                Object.values(statusData.friendly[targetId] ?? [])
                  .concat(Object.values(statusData.enemy[source] ?? []))
                  .filter((v) => {
                    const remain = Math.max(0, (v.expirationTimestamp - timestamp) / 1000);
                    v.remainingDuration = remain >= 999 ? "" : remain.toFixed(remain > 0.05 && remain < 0.95 ? 1 : 0);
                    // 有时会有过期很久的遗留的buff?
                    return Number(v.remainingDuration) > -3;
                  }),
              );
              addRow({
                timestamp,
                time: formattedTime,
                id,
                action,
                actionCN,
                source,
                target,
                targetId,
                job,
                jobIcon,
                jobEnum,
                amount: ability.amount,
                keigenns,
                currentHp,
                maxHp,
                effect,
                type,
                shield: shieldData[match.groups!.targetId],
                povId: povId.value,
              });
              data.value[0].duration = formatTime(new Date(splitLine[logDefinitions.Ability.fields.timestamp]).getTime() - combatTimeStamp.value);
            }
            break;
          }
        default:
          break;
      }
    }
  }
};

const getJobById = (targetId: string): number => {
  const fromJobMap = jobMap.value[targetId];
  const fromPartyEvent = partyEventParty.value.find((v) => v.id === targetId) ?? { job: 0, timestamp: 0 };
  return [fromJobMap, fromPartyEvent].sort((a, b) => b.timestamp - a.timestamp)[0].job;
};

const addRow = (row: RowVO) => {
  // if (userOptions.pushMode) {
  //   data.value[0].table.push(row);
  //   lastPush = Date.now();
  // } else {
  data.value[0].table.unshift(row);
  // }
};

const stopCombat = (timeStamp: number) => {
  if (combatTimeStamp.value === 0) return;
  data.value[0].duration = formatTime(timeStamp - combatTimeStamp.value);
  combatTimeStamp.value = 0;
  statusData.friendly = {};
  statusData.enemy = {};
  saveStorage();
};

const saveStorage = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data.value.slice(0, maxStorage.localStorage)));
};

const loadStorage = () => {
  const load = localStorage.getItem(STORAGE_KEY);
  if (load) {
    try {
      const loadData = JSON.parse(load);
      data.value.length = 0;
      data.value.push(...loadData);
    } catch (e) {
      console.error(e);
    }
  }
};

const formatTime = (time: number) => {
  const minute = Math.max(Math.floor(time / 60000), 0);
  const second = Math.max(Math.floor((time - minute * 60000) / 1000), 0);
  return `${minute < 10 ? "0" : ""}${minute}:${second < 10 ? "0" : ""}${second}`;
};

const actionOptions = computed(() => {
  const result = new Set(data.value[select.value].table.map((v) => (userOptions.actionCN ? v.actionCN : v.action)));
  return Array.from(result).map((v) => ({ label: v, value: v }));
});

const targetOptions = computed(() => {
  const targetToJob: Record<string, string> = {};
  const result = new Set(
    data.value[select.value].table
      .slice()
      .sort((a, b) => Util.enumSortMethod(a.jobEnum, b.jobEnum))
      .map((item) => {
        targetToJob[item.target] = item.job;
        return item.target;
      }),
  );
  return Array.from(result).map((item) => ({ label: `${targetToJob[item]}（${item}）`, value: item }));
});

let formatterName: (v: string) => string = (v) => v;

const initEnvironment = (name: string) => {
  if (/^([A-Z])\S+ ([A-Z])\S+$/.test(name)) {
    // 国际服
    if (userOptions.abbrId) formatterName = (v: string) => v.replace(/^([A-Z])\S+ ([A-Z])\S+$/, "$1.$2.");
    loadKeigenn("Global");
  } else {
    // 国服
    if (userOptions.abbrId) formatterName = (v: string) => v.substring(0, 2);
    loadKeigenn("Chinese");
  }
};

initEnvironment(povName.value);

const handleImgError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target.src.includes("cafemaker.wakingsands.com")) {
    target.src = target.src.replace("cafemaker.wakingsands.com", "xivapi.com");
  } else if (target.src.includes("xivapi.com")) {
    target.src = "";
  }
};

// const autoScroll = () => {
//   if (!userOptions.pushMode) {
//     return;
//   }
//   if (allowAutoScroll.value && Date.now() - lastPush < 2000 && Date.now() - lastScroll > 100) {
//     scroll();
//   }
//   requestAnimationFrame(() => {
//     autoScroll();
//   });
// };

// const scroll = () => {
//   xTable.value?.scrollTo(0, Number.MAX_SAFE_INTEGER);
//   lastScroll = Date.now();
// };

// const handleWhell = (event: WheelEvent) => {
//   if (!xTable.value) return;
//   if (select.value !== 0 || event.deltaY < 0) {
//     allowAutoScroll.value = false;
//   } else {
//     const lineHeight = parseInt(style["--vxe-table-row-height-mini"]);
//     const tableData = xTable.value.getData();
//     const lineLength = tableData.length;
//     const scroll = xTable.value.getScroll();
//     const contentHeight = lineHeight * lineLength;
//     const clientHeight = document.body.clientHeight;
//     const selectHeight = parseInt(style["--vxe-input-height-mini"]);
//     const headerHeight = lineHeight;
//     const diff = 100;
//     const isBottom = contentHeight - (scroll.scrollTop + clientHeight) + selectHeight + headerHeight <= diff;
//     allowAutoScroll.value = isBottom;
//   }
// };

// watch(
//   () => userOptions.pushMode,
//   () => {
//     if (userOptions.pushMode) {
//       document.addEventListener("wheel", handleWhell);
//       autoScroll();
//     } else {
//       document.removeEventListener("wheel", handleWhell);
//     }
//   },
//   { immediate: true },
// );

const handleChangePrimaryPlayer = (event: { charID: number; charName: string }): void => {
  povName.value = event.charName;
  povId.value = event.charID.toString(16).toUpperCase();
};

const handlePartyChanged = (e: { party: { id: string; name: string; inParty: boolean; job: number }[] }): void => {
  partyEventParty.value = e.party.map((v) => ({ ...v, timestamp: Date.now() }));
};

onMounted(() => {
  for (const id in jobMap.value) {
    const element = jobMap.value[id];
    if (Date.now() - element.timestamp > 1000 * 60 * 60 * 24 * 1) {
      Reflect.deleteProperty(jobMap.value, id);
    }
  }
  loadStorage();
  addOverlayListener("LogLine", handleLogLine);
  addOverlayListener("PartyChanged", handlePartyChanged);
  addOverlayListener("ChangePrimaryPlayer", handleChangePrimaryPlayer);
  startOverlayEvents();
});

onUnmounted(() => {
  removeOverlayListener("LogLine", handleLogLine);
});

const Target = ({ row }: { row: RowVO }) => {
  return (
    <div>
      <span class="target">
        {userOptions.showIcon && (
          <img class="jobIcon" src={`//cafemaker.wakingsands.com/cj/companion/${row.jobIcon}.png`} alt="" onError={handleImgError} loading="lazy" />
        )}
        {userOptions.showName && (
          <span
            class={`job ${row.jobIcon} ${row.targetId === row.povId ? "YOU" : ""}`}
            style={!userOptions.abbrId && userOptions.showName ? { overflow: "hidden", textOverflow: "ellipsis" } : {}}
          >
            {row.targetId === row.povId && userOptions.replaceWithYou ? "YOU" : userOptions.anonymous ? row.job : formatterName(row.target)}
          </span>
        )}
      </span>
    </div>
  );
};

const Amount = ({ row }: { row: RowVO }) => {
  const slot = {
    reference: () => <span class={`damage ${row.type} ${isLethal(row) ? "lethal" : ""} `}>{row.amount.toLocaleString().padStart(3, "　")}</span>,
  };
  return (
    <el-popover
      append-to=".wrapper"
      effect="dark"
      placement="right-start"
      title=""
      trigger="hover"
      enterable={false}
      hide-after={0}
      popper-class="my-el-popover"
      v-slots={slot}
    >
      <AmountDetails row={row}></AmountDetails>
    </el-popover>
  );
};

const AmountDetails = ({ row }: { row: RowVO }) => {
  return (
    <div>
      <span>
        盾:{Math.round((row.maxHp * +row.shield) / 100)} ({row.shield}%)
      </span>
      <br />
      <span>
        HP:{row.currentHp}/{row.maxHp} ({Math.round((row.currentHp / row.maxHp) * 100)}%)
      </span>
      <br />
      <span>来源:{row.source}</span>
      <br />
      <span>受到伤害:{row.amount}</span>
      <br />
      <span>
        剩余HP:{row.currentHp - row.amount} ({Math.round(((row.currentHp - row.amount) / row.maxHp) * 100)}%)
      </span>
    </div>
  );
};

const invincibleEffect = [
  Number(409).toString(16).toUpperCase(), // 死斗
  Number(810).toString(16).toUpperCase(), // 行尸走肉
  Number(811).toString(16).toUpperCase(), // 死而不僵
  Number(1836).toString(16).toUpperCase(), // 超火流星
];

const isLethal = (row: RowVO): boolean => {
  return row.currentHp - row.amount < 0 && !row.keigenns.find((k) => invincibleEffect.includes(k.effectId));
};

const KeigennShow = ({ row }: { row: RowVO }) => {
  return (
    <>
      {row.type === "dot"
        ? "（不支持）"
        : row.keigenns.map((keigenn) => {
            return (
              <span class="status" title={`${keigenn.name}(${keigenn.source})`} data-duration={keigenn.remainingDuration} data-sourcePov={keigenn.isPov}>
                <img
                  class={`statusIcon ${multiplierEffect(keigenn.performance[row.type as keyof PerformanceType])}`}
                  src={`//cafemaker.wakingsands.com/i/${keigenn.fullIcon}${icon4k}.png`}
                  alt={keigenn.effect}
                  onError={handleImgError}
                  loading="lazy"
                ></img>
              </span>
            );
          })}
      <span>{row.effect === "damage done" ? "" : translationFlags(row.effect)}</span>
    </>
  );
};

const doCopy = (row: RowVO) => {
  const { action, actionCN, amount, job, keigenns, source, target, time, type } = row;
  const sp = row.effect === "damage done" ? "" : "," + translationFlags(row.effect);
  const result = `${time} [${job}]${target} HP:${row.currentHp}/${row.maxHp}(${Math.round((row.currentHp / row.maxHp) * 100)}%) + 护盾:${Math.round(
    (row.maxHp * +row.shield) / 100,
  )}(${row.shield}%) 受到${source}“${action}${actionCN !== action ? "(" + actionCN + ")" : ""}”的${amount.toLocaleString()}点${translationFlags(
    type,
  )}伤害。剩余HP:${row.currentHp - row.amount}(${Math.round(((row.currentHp - row.amount) / row.maxHp) * 100)}%)。减伤：${
    keigenns.length === 0 && sp === "" ? "无" : keigenns.map((k) => (userOptions.statusCN ? k.name : k.effect)).join(",") + sp
  }。`;
  copyText(result);
};

const copyText = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => {
    const input = document.createElement("input");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  });
  VXETable.modal.message({ content: "已复制到剪贴板", status: "success" });
};

const focusing = ref({ target: false, action: false });
const focusRow: Ref<RowVO | undefined> = ref();

const menuConfig = reactive<VxeTablePropTypes.MenuConfig<RowVO>>({
  className: "my-menus",
  body: {
    options: [],
  },
});

watchEffect(() => {
  if (menuConfig.body && menuConfig.body.options && xTable.value) {
    menuConfig.body.options[0] = [
      { code: "copy", name: "复制详情", prefixIcon: "vxe-icon-copy", className: "my-copy-item" },
      {
        code: "clearFilterAction",
        name: "取消技能筛选",
        prefixIcon: "vxe-icon-funnel-clear",
        className: "my-clear-filter",
        visible: focusing.value.action,
        disabled: false,
      },
      {
        code: "filterSelectAction",
        name: focusRow.value?.[actionKey.value] ? `只看 ${focusRow.value?.[actionKey.value]}` : "只看该技能",
        prefixIcon: "vxe-icon-info-circle",
        visible: !focusing.value.action,
        disabled: false,
      },
      {
        code: "clearFilterTarget",
        name: "取消玩家筛选",
        prefixIcon: "vxe-icon-funnel-clear",
        visible: focusing.value.target,
        disabled: false,
      },
      {
        code: "filterSelectTarget",
        name: focusRow.value?.target ? `只看[${focusRow.value.job}] ${focusRow.value.target}` : "只看该玩家",
        prefixIcon: "vxe-icon-user-fill",
        visible: !focusing.value.target,
        disabled: false,
      },
    ];
  }
});

const clickMinimize = () => {
  minimize.value = !minimize.value;
  // if (minimize.value === false && userOptions.pushMode) {
  //   lastPush = Date.now();
  //   requestAnimationFrame(() => scroll());
  // }
};

const cellContextMenuEvent: VxeTableEvents.CellMenu<RowVO> = ({ row }) => {
  const $table = xTable.value;
  if ($table) {
    $table.setCurrentRow(row);
    focusRow.value = row;
  }
};

const contextMenuClickEvent: VxeTableEvents.MenuClick<RowVO> = ({ menu, row, column }) => {
  const $table = xTable.value;

  switch (menu.code) {
    case "copy":
      if (!row) {
        VXETable.modal.message({ content: "未选中有效数据行", status: "error" });
        return;
      }
      doCopy(row);
      break;
    case "clearFilterTarget":
      if ($table) {
        $table.clearFilter($table.getColumnByField("target"));
        focusing.value.target = false;
      }
      break;
    case "clearFilterAction":
      if ($table) {
        $table.clearFilter($table.getColumnByField(actionKey.value));
        focusing.value.action = false;
      }
      break;
    case "filterSelectTarget":
      if ($table) {
        const col = $table.getColumnByField("target");
        if (col) {
          const option = col.filters.find((v) => v.value === row.target);
          if (!option) {
            return;
          }
          option.checked = true;
          $table.updateData().then(() => {
            $table.scrollToRow(row);
            focusing.value.target = true;
          });
        }
      }
      break;
    case "filterSelectAction":
      if ($table) {
        const col = $table.getColumnByField(actionKey.value);
        if (col) {
          const option = col.filters.find((v) => v.value === row[actionKey.value]);
          if (!option) {
            return;
          }
          option.checked = true;
          $table.updateData().then(() => {
            $table.scrollToRow(row);
            focusing.value.action = true;
          });
        }
      }
      break;
    default:
      break;
  }
};
</script>

<style lang="scss">
$base-bg: lighten(#151515, 0%);
$bg-color: rgba($base-bg, 0.7);
$tooltip-bg-color: lighten(#303133, 0%);
$text-color: lighten(#c9d1d9, 50%);
$border-color: lighten(#4e4a4a, 0%);
$selected-bg-color: lighten(#262626, 0%);
$striped-bg-color: lighten(#2b2929, 0%);
$primary-color-hover: lighten(white, 0%);
$warning-color-active: lighten(orange, 0%);
$vxe-form-background-color: $bg-color;
$vxe-pager-background-color: $bg-color;
$vxe-button-default-background-color: lighten($bg-color, 15%);
$vxe-table-header-background-color: transparent;
$vxe-font-color: darken($text-color, 12%);
$vxe-table-header-font-color: $text-color;
$vxe-table-footer-font-color: $text-color;
$vxe-table-body-background-color: transparent;
$vxe-table-row-striped-background-color: $striped-bg-color;
$vxe-table-border-color: $border-color;
$vxe-table-row-hover-background-color: darken($primary-color-hover, 50%);
$vxe-table-row-hover-striped-background-color: lighten($striped-bg-color, 10%);
$vxe-table-row-current-background-color: fade($primary-color-hover, 20%);
$vxe-table-row-hover-current-background-color: fade($primary-color-hover, 20%);
$vxe-table-column-hover-background-color: fade($primary-color-hover, 20%);
$vxe-table-column-current-background-color: fade($primary-color-hover, 20%);
$vxe-table-row-checkbox-checked-background-color: fade($warning-color-active, 15%);
$vxe-table-row-hover-checkbox-checked-background-color: fade($warning-color-active, 20%);
$vxe-table-menu-background-color: lighten($tooltip-bg-color, 10%);
$vxe-table-filter-panel-background-color: rgba($base-bg, 75%);
$vxe-grid-maximize-background-color: $bg-color;
$vxe-pager-perfect-background-color: $bg-color;
$vxe-pager-perfect-button-background-color: lighten($bg-color, 15%);
$vxe-input-background-color: $bg-color;
$vxe-input-border-color: $border-color;
$vxe-select-panel-background-color: $bg-color;
$vxe-table-popup-border-color: $border-color;
$vxe-select-option-hover-background-color: lighten($selected-bg-color, 15%);
$vxe-pulldown-panel-background-color: $bg-color;
$vxe-table-fixed-left-scrolling-box-shadow: 8px 0px 10px -5px rgba(255, 255, 255, 0.12);
$vxe-table-fixed-right-scrolling-box-shadow: -8px 0px 10px -5px rgba(255, 255, 255, 0.12);
$vxe-loading-background-color: rgba(0, 0, 0, 0.5);
$vxe-tooltip-dark-background-color: lighten($tooltip-bg-color, 25%);
$vxe-modal-header-background-color: $selected-bg-color;
$vxe-modal-body-background-color: $tooltip-bg-color;
$vxe-modal-border-color: $border-color;
$vxe-toolbar-panel-background-color: $bg-color;
$vxe-input-disabled-color: lighten($striped-bg-color, 20%);
$vxe-input-disabled-background-color: lighten($striped-bg-color, 25%);
$vxe-checkbox-icon-background-color: lighten($selected-bg-color, 15%);
$vxe-checkbox-checked-icon-border-color: $border-color;
$vxe-checkbox-indeterminate-icon-background-color: lighten($selected-bg-color, 15%);
$vxe-border-radius: 0px;
$vxe-select-panel-background-color: rgba(21, 21, 21, 0.8);

.vxe-header--column {
  line-height: 1.75em !important;
  // 不换行
  .vxe-cell {
    white-space: nowrap !important;
  }
}

body,
html {
  padding: 0;
  margin: 0;
  overflow: hidden;
}

* {
  user-select: none;
}
.vxe-table--main-wrapper {
  background-color: rgba($bg-color, 0.8);
}

.vxe-body--row {
  &:hover {
    cursor: pointer;
  }
}
img[src=""],
img:not([src]) {
  opacity: 0;
  display: none;
}
.vxe-cell {
  padding-left: 3px !important;
  padding-right: 3px !important;
  overflow: visible !important;
}
.minimize {
  padding: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  margin-left: auto !important;
  margin-right: 0 !important;
  border: none !important;
  width: var(--vxe-input-height-mini) !important;
  height: var(--vxe-input-height-mini) !important;
  z-index: 13;
}

.vxe-select-option {
  max-width: calc(100% - 2px) !important;
}
.vxe-table--filter-wrapper:not(.is--multiple) {
  text-align: left !important;
}

@import "vxe-table/styles/index.scss";

::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}
::-webkit-scrollbar-track {
  background-color: rgba(51, 51, 51, 1);
}
::-webkit-scrollbar-thumb {
  height: 30px;
  border-radius: 4px;
  background-color: rgba(180, 180, 180, 0.75);
}
::-webkit-scrollbar-thumb:active {
  background-color: rgba(160, 160, 160, 1);
}
.el-popper {
  min-width: 0 !important;
  width: auto !important;
}
.my-el-popover {
  & > div[role="title"] {
    font-size: calc(var(--vxe-font-size-mini) * 1.2) !important;
    font-weight: bold;
    margin-bottom: 0.2em !important;
  }
  font-size: var(--vxe-font-size-mini) !important;
  padding: 0.5em !important;
  white-space: nowrap;
}
.target {
  display: flex;
  flex-direction: row;
  align-items: center;
}
// .target-extra {
//   position: relative;
//   display: inline-flex;
//   flex-direction: column;
//   height: var(--vxe-input-height-mini);
//   p {
//     position: absolute;
//     margin: 0;
//     padding: 0;
//     transform-origin: center left;
//   }
//   .hp,
//   .shiled {
//     width: 3.7em;
//     display: flex;
//     justify-content: space-between;
//   }
//   $s: 0.8;
//   $y: 0.6em;
//   .shiled {
//     transform: scale($s) translateY(-$y) translateX(0.25em);
//   }
//   .hp {
//     transform: scale($s) translateY($y) translateX(0.25em);
//   }
// }
.wrapper {
  padding: 0;
  margin: 0;
  height: calc(100vh);
  width: 100%;
  position: relative;
}
header {
  height: var(--vxe-input-height-mini);
  width: 100%;
  display: flex;
  .select {
    &:hover {
      width: calc(100% - var(--vxe-input-height-mini));
    }
    transition: width 0.2s ease-in-out;
    width: 5.25em;
    z-index: 15;
    position: absolute;
    right: var(--vxe-input-height-mini);
    background-color: lighten(#151515, 0%);
  }
}
main {
  position: absolute;
  top: 0px;
  bottom: 0px;
  width: 100%;
}
.vxe-table {
  $text-color: rgba(#444, 0.5);
  text-shadow: 1px 1px 1px $text-color, -1px -1px 1px $text-color, 1px -1px 1px $text-color, -1px 1px 1px $text-color;
}
.jobIcon {
  width: 2em;
  object-fit: cover;
  vertical-align: middle;
}
.status {
  position: relative;
  top: -0.4em;
  object-fit: cover;
}
.statusIcon {
  width: 1.6em;
  object-fit: cover;
  vertical-align: middle;
}
.status::before {
  content: attr(data-duration);
  // vertical-align: bottom;
  height: 1em;
  line-height: 1em;
  z-index: 1;
  position: absolute;
  text-align: center;
  left: 50%;
  bottom: -1.1em;
  transform: translateX(-50%) scale(0.725);
  transform-origin: top center;
  font-size: calc(var(--vxe-font-size-mini));
  font-family: emoji;
}
.status[data-sourcePov="true"]::before {
  color: aquamarine;
}

.physics {
  color: rgb(255, 100, 100);
}
.magic {
  color: rgb(100, 200, 255);
}
.darkness {
  color: rgb(255, 100, 255);
}

.unuseful {
  filter: grayscale(100%);
}
.half-useful {
  filter: grayscale(50%);
}
.useful {
  filter: grayscale(0%);
}

.lethal {
  // 红色下划线
  border-bottom: 1px dashed red;
}

.vxe-table--header-wrapper {
  background-color: #222;
  color: #fff;
}
.vxe-table--header-wrapper .vxe-header--column {
  color: #fff;
}
.vxe-context-menu--option-wrapper,
.vxe-table--context-menu-clild-wrapper {
  border: none;
}
.testLog {
  position: fixed;
  opacity: 0.8;
  right: 0;
  z-index: 10;
  transition: all 0.2s ease-in-out;
  bottom: 0;
  &:hover {
    opacity: 1;
  }
}
.YOU {
  font-weight: bolder;
  $color: rgba(3, 169, 244, 0.4);
  text-shadow: -1px 0 3px $color, 0 1px 3px $color, 1px 0 3px $color, 0 -1px 3px $color;
}
.my-menus {
  background-color: #252525;
  overflow: hidden;
}
.my-menus .vxe-ctxmenu--link {
  width: 200px;
}
.my-menus .vxe-context-menu--link {
  padding-right: 0.2em;
}
.my-copy-item {
  font-weight: 700;
}
.my-clear-filter {
  font-style: oblique;
}
</style>
