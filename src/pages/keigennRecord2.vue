<script setup lang="ts">
// 职业信息缓存
import type { FFIcon } from "@/types/fflogs";
import type {
  CombatDataEvent,
  Encounter,
  Keigenn,
  KeySkillSnapshot,
  PerformanceType,
  RowVO,
  Status,
} from "@/types/keigennRecord2";
import type { Player } from "@/types/partyPlayer";
import { Setting, UploadFilled, ZoomIn, ZoomOut } from "@element-plus/icons-vue";
import { useDark } from "@vueuse/core";
// TODO: 死亡回放：治疗栏目的状态追踪治疗有关的buff
import {
  computed,
  markRaw,
  nextTick,
  onUnmounted,
  ref,
  shallowReactive,
  shallowRef,
  triggerRef,
  watch,
  watchEffect,
} from "vue";
import { useDev } from "@/composables/useDev";
import { useIndexedDB } from "@/composables/useIndexedDB";
import { getCactbotLocaleMessage, useLang } from "@/composables/useLang";
import { getZoneType } from "@/composables/useZone";
import { JobResourceManager } from "@/modules/jobResourceTracker";
import { GLOBAL_SKILL_MAX_LEVEL } from "@/resources/globalSkills";
import { getJobResourceActionCost } from "@/resources/jobResourceActionCost";
import { DEFAULT_JOB_SORT_ORDER } from "@/resources/jobSortOrder";
import { keigennSkills } from "@/resources/keigennSkillResource";
import { getActionChinese } from "@/resources/logic/actionChinese";
import { completeIcon, stackUrl } from "@/resources/logic/status";
import { ZoneInfo } from "@/resources/zoneInfo";

import { useKeigennRecord2Store } from "@/store/keigennRecord2";
import { compareSame } from "@/utils/compareSaveAction";
import { calculateCharges } from "@/utils/cooldown";
import { idToSrc, parseDynamicValue } from "@/utils/dynamicValue";
import { processAbilityLine, processFlags } from "@/utils/flags";
import {
  getKeigenn,
  multiplierEffect,
  universalVulnerableEnemy,
  universalVulnerableFriendly,
} from "@/utils/keigenn";

import { formatTimeMs as formatTime } from "@/utils/time";
import { getJobIconUrl } from "@/utils/keigennRecord2";
import Util from "@/utils/util";
import { ensureIconCacheReady, getIconSrcByFullIcon, rerouteImgSrc } from "@/utils/xivapi";
import logDefinitions from "../../cactbot/resources/netlog_defs";

import NetRegexes from "../../cactbot/resources/netregexes";
import { addOverlayListener } from "../../cactbot/resources/overlay_plugin_api";
import { onBeforeUnmount, onMounted, toRaw } from "vue";
import { useRoute } from "vue-router";
import { useToggle } from "@vueuse/core";
import KeigennRecord2Table from "@/components/keigennRecord2/Table.vue";
import { copyToClipboard } from "@/utils/clipboard";
import { ElButton, ElIcon, ElLoading, ElMessage, ElOption, ElSelect } from "element-plus";

const dev = useDev();
const { t } = useLang();
const route = useRoute();

const store = useKeigennRecord2Store();
const userOptions = store.userOptions;
store.syncUrlOptions();
// 某些情况下OverlayPluginApi并不会立即被挂在到window上。用户上报，未复现。
store.checkIsBrowser();

watch(
  () => route.fullPath,
  () => {
    store.syncUrlOptions();
  },
);

watch(
  () => store.userOptions,
  () => {
    store.saveUserOptions();
  },
  { deep: true },
);
const isPush = computed(() => userOptions.order === "push");

const minimize = ref(userOptions.minimize);
const onlyDeath = ref(false);
const hideAA = ref(false);
const showHeals = ref(false);
const settingsOpen = ref(false);

const browserFileInputRef = ref<HTMLInputElement | null>(null);
const browserCombatSelectRef = ref<InstanceType<typeof ElSelect> | null>(null);
const actCombatSelectRef = ref<InstanceType<typeof ElSelect> | null>(null);
const isDragOverPage = ref(false);
let pageDragCounter = 0;

const actionKey = computed(() => (userOptions.actionCN ? "actionCN" : ("action" as const)));

const loading = ref(false);

const SCALE_CSS_VAR = "--keigenn-record2-scale";

const safeScale = computed(() => {
  const scaleValue = Number(userOptions.scale ?? 1);
  if (!Number.isFinite(scaleValue) || scaleValue <= 0) return 1;
  return scaleValue;
});

watchEffect(() => {
  document.documentElement.style.setProperty(SCALE_CSS_VAR, safeScale.value.toString());
});

onUnmounted(() => {
  document.documentElement.style.removeProperty(SCALE_CSS_VAR);
  combatSelectPopperObserver?.disconnect();
  clearScheduledStopCombatPersistence();
});

let combatSelectPopperObserver: MutationObserver | null = null;
let applyingCombatSelectScale = false;

function applyCombatSelectScale(popper: HTMLElement) {
  if (applyingCombatSelectScale) return;
  applyingCombatSelectScale = true;
  const scaleValue = safeScale.value;
  popper.style.transformOrigin = "top left";
  const baseTransform = popper.style.transform || "";
  const withoutScale = baseTransform.replace(/scale\([^)]+\)/g, "").trim();
  const nextTransform = `${withoutScale} scale(${scaleValue})`.trim();
  popper.style.transform = nextTransform;
  requestAnimationFrame(() => {
    applyingCombatSelectScale = false;
  });
}

function handleCombatSelectVisible(visible: boolean) {
  if (!visible) {
    combatSelectPopperObserver?.disconnect();
    combatSelectPopperObserver = null;
    return;
  }
  nextTick(() => {
    const popper = document.querySelector(".combat-select-popup");
    if (!popper) return;
    const popperEl = popper as HTMLElement;
    applyCombatSelectScale(popperEl);
    combatSelectPopperObserver?.disconnect();
    combatSelectPopperObserver = new MutationObserver(() => applyCombatSelectScale(popperEl));
    combatSelectPopperObserver.observe(popperEl, {
      attributes: true,
      attributeFilter: ["style"],
    });
  });
}

interface PlayerSP extends Player {
  timestamp: number;
}

// localStorage keys
const STORAGE_KEYS = {
  POV_ID: "keigenn-record-2-pov-id",
  PARTY_LIST: "keigenn-record-2-party-list",
  ENTITIES_MAP: "keigenn-record-2-job-map",
  PARTY_EVENT: "keigenn-record-2-party-event-party",
  RSV_DATA: "souma-keigenn-record-2-rsv-data",
  ZONE_NAME: "souma-keigenn-record-2-zone-name",
  VERSION: "keigenn-record-2-data-version",
  METADATA_LIST: "keigenn-record-2-metadata-list",
} as const;

const DATA_VERSION = "v20260131";
let isNewVersion = false;

// 这些数据不需要响应式，但需要持久化（通过手动保存/加载）
const tableRef = ref<any>(null);
let povId = "";
let partyLogList: string[] = [];
let entitiesMap: Record<string, { job: number; timestamp: number; name: string; level: number }> =
  {};
let partyEventParty: PlayerSP[] = [];
let rsvData: Record<number, string> = {};
let combatTimeStamp = 0;
let zoneName = "";
// 不能用useZone的zoneType,因为需要全日志驱动。而不依赖ACT事件。
let isPvP = false;
let rowCounter = 0;
let pendingRows: RowVO[] = [];
let batchTimer: number | null = null;
let stopCombatPersistenceTimer: number | null = null;
const pendingStopCombatEncounters = new Map<string, Encounter>();
const colorCache = new Map<number, string>();
const STOP_COMBAT_SAVE_DELAY = 500;
const processedEncounters = new WeakSet<Encounter>();

function loadStoredJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to parse persisted data for ${key}:`, error);
    localStorage.removeItem(key);
    return fallback;
  }
}

// 从 localStorage 加载持久化数据
function loadPersistentData() {
  try {
    // 自动清理可能已超限的旧缓存，恢复 localStorage 空间
    localStorage.removeItem(STORAGE_KEYS.METADATA_LIST);

    const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    if (savedVersion !== DATA_VERSION) {
      Object.values(STORAGE_KEYS).forEach((key) => {
        if (key !== STORAGE_KEYS.VERSION) localStorage.removeItem(key);
      });
      localStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
      isNewVersion = true;
      return;
    }

    const savedPovId = localStorage.getItem(STORAGE_KEYS.POV_ID);
    if (savedPovId) povId = savedPovId;

    partyLogList = loadStoredJson(STORAGE_KEYS.PARTY_LIST, [] as string[]);
    entitiesMap = loadStoredJson(
      STORAGE_KEYS.ENTITIES_MAP,
      {} as Record<string, { job: number; timestamp: number; name: string; level: number }>,
    );
    partyEventParty = loadStoredJson(STORAGE_KEYS.PARTY_EVENT, [] as PlayerSP[]);
    rsvData = loadStoredJson(STORAGE_KEYS.RSV_DATA, {} as Record<number, string>);

    const savedZoneName = localStorage.getItem(STORAGE_KEYS.ZONE_NAME);
    if (savedZoneName) zoneName = savedZoneName;
  } catch (e) {
    console.error("Failed to load persistent data:", e);
  }
}

// 保存持久化数据到 localStorage
function savePersistentData() {
  if (loading.value) return;
  try {
    localStorage.setItem(STORAGE_KEYS.POV_ID, povId);
    localStorage.setItem(STORAGE_KEYS.PARTY_LIST, JSON.stringify(partyLogList));
    localStorage.setItem(STORAGE_KEYS.ENTITIES_MAP, JSON.stringify(entitiesMap));
    localStorage.setItem(STORAGE_KEYS.PARTY_EVENT, JSON.stringify(partyEventParty));
    localStorage.setItem(STORAGE_KEYS.RSV_DATA, JSON.stringify(rsvData));
    localStorage.setItem(STORAGE_KEYS.ZONE_NAME, zoneName);
  } catch (e) {
    console.error("Failed to save persistent data:", e);
  }
}

function createEmptyEncounter(key = "init", timestamp = -1): Encounter {
  const encounter: Encounter = {
    zoneName: "",
    duration: "00:00",
    table: shallowReactive([]),
    key,
    timestamp,
  };
  // 实时创建的 encounter 的行已在 addRow 中通过 markRaw 处理，无需再延迟处理
  processedEncounters.add(encounter);
  return encounter;
}

const select = ref(0);
const data = shallowRef<Encounter[]>([createEmptyEncounter()]);
const rsvKeyPattern = /^_rsv_(\d+)_/;
const wipeRegex = NetRegexes.network6d({ command: ["40000003", "40000010", "4000000F"] });

// 延迟处理：仅在 encounter 被选中时才执行图片路由和 markRaw
function ensureEncounterProcessed(encounter: Encounter) {
  if (processedEncounters.has(encounter)) return;
  processedEncounters.add(encounter);
  for (const row of encounter.table) {
    if (row.preCalculated) {
      for (const k of row.preCalculated.keigenns) k.src = rerouteImgSrc(k.src);
      for (const s of row.preCalculated.sortedSkills ?? []) s.icon = rerouteImgSrc(s.icon);
    }
    markRaw(row);
  }
}

const selectedRows = computed(() => {
  const encounter = data.value[select.value];
  if (!encounter) return [];
  ensureEncounterProcessed(encounter);
  return encounter.table;
});

const STORAGE_KEY = "keigenn-record-2";

// 运行时缓存数据（不需要持久化，每次战斗会清空）
let shieldData: Record<string, string> = {};
let statusData: {
  friendly: { [id: string]: { [effectId: string]: Status } };
  enemy: { [name: string]: { [effectId: string]: Status } };
} = {
  friendly: {},
  enemy: {},
};
let cooldownTracker: Record<string, Record<number, number[]>> = {};
const skillMapCache = new Map<number, Map<number, (typeof trackedSkills)[0]>>();

const trackedSkills = keigennSkills;

const resourceManager = new JobResourceManager();

const db = useIndexedDB<Encounter>(STORAGE_KEY, { hasMetadataStore: true });

function getSkillMapForLevel(level: number) {
  let map = skillMapCache.get(level);
  if (!map) {
    map = new Map();
    for (const skill of trackedSkills) {
      if (skill.minLevel > level) continue;
      const id = parseDynamicValue(skill.id, level);
      map.set(id, skill);
      const groupId = compareSame(id);
      if (groupId !== id) {
        map.set(groupId, skill);
      }
    }
    skillMapCache.set(level, map);
  }
  return map;
}

function beforeHandle() {
  clearScheduledStopCombatPersistence();
  loading.value = true;
  combatTimeStamp = 0;
  cooldownTracker = {};
  select.value = 0;
  data.value.length = 0;
  data.value.push(createEmptyEncounter());
  // 清理各种数据
  shieldData = {};
  statusData = {
    friendly: {},
    enemy: {},
  };
  entitiesMap = {};
  partyEventParty = [];
  partyLogList = [];
  povId = "";
  rowCounter = 0;
  colorCache.clear();
  skillMapCache.clear();
  rsvData = {};
  resourceManager.clear();
  invalidateJobCache();
}

async function afterHandle() {
  loading.value = false;

  flushPendingRows(true);

  await saveAllEncounters();
  savePersistentData();
  triggerRef(data);
}

function getReductionColor(reduction: number) {
  const roundedReduction = Math.round(reduction * 100) / 100;
  if (colorCache.has(roundedReduction)) return colorCache.get(roundedReduction)!;

  const CURVE_CAP_PERCENTAGE = 0.5; // 封顶百分比 （也就是减伤达到50%时，颜色变为最亮）
  const CURVE_POWER = 0.8; // 曲率，值越小，颜色变化越大
  const GRAY_START = 132; // 起始颜色的灰度值
  const START_COLOR = [GRAY_START, GRAY_START, GRAY_START];
  const TARGET_COLOR = [50, 250, 200];
  const cappedReduction = Math.min(1, roundedReduction / CURVE_CAP_PERCENTAGE);
  const colorIndex = Math.min(9, Math.floor(cappedReduction * 10));
  const linearProgress = colorIndex / 9;
  const curvedProgress = linearProgress ** CURVE_POWER;
  const r = START_COLOR[0]! + (TARGET_COLOR[0]! - START_COLOR[0]!) * curvedProgress;
  const g = START_COLOR[1]! + (TARGET_COLOR[1]! - START_COLOR[1]!) * curvedProgress;
  const b = START_COLOR[2]! + (TARGET_COLOR[2]! - START_COLOR[2]!) * curvedProgress;

  const color = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 1)`;
  colorCache.set(roundedReduction, color);
  return color;
}

function prepareRowVO(row: Omit<RowVO, "preCalculated">): RowVO {
  const reductionColor = getReductionColor(row.reduction);
  const amountDisplay =
    row.amount > 999_999 ? `${(row.amount / 10_000).toFixed(0)}万` : row.amount.toLocaleString();
  const jobIconSrc = getJobIconUrl(row.jobIcon, userOptions.iconType);

  const { amount, maxHp, currentHp, shield, type, reduction } = row;
  const shieldValue = Math.round((maxHp * +shield) / 100);
  const hpPercent = Math.round((currentHp / maxHp) * 100);
  const originalDamage =
    (amount && reduction < 1 && Math.round((amount + shieldValue) / (1 - reduction))) || 0;
  const originalDamageDisplay = originalDamage.toLocaleString();

  const commonSkillSort = (a: KeySkillSnapshot, b: KeySkillSnapshot) => {
    const scopeOrder = { party: 0, other: 1, self: 2 } as const;
    if (a.scope !== b.scope) return scopeOrder[a.scope] - scopeOrder[b.scope];
    if (a.ownerJob !== b.ownerJob) {
      return (
        DEFAULT_JOB_SORT_ORDER.indexOf(a.ownerJob) - DEFAULT_JOB_SORT_ORDER.indexOf(b.ownerJob)
      );
    }
    if (a.recast1000ms !== b.recast1000ms) return b.recast1000ms - a.recast1000ms;
    return a.id - b.id;
  };

  return {
    ...row,
    preCalculated: {
      reductionColor,
      amountDisplay,
      damageTypeClass: row.effect === "heal" ? "is-heal" : type,
      jobIconSrc,
      keigenns: row.keigenns.map((v) => ({
        src: getIconSrcByFullIcon(v.fullIcon),
        usefulClass: multiplierEffect(v, type as any),
        title: `${userOptions.statusCN ? v.name : v.effect}(${v.source})`,
        duration: v.remainingDuration ?? "",
        isPov: v.isPov,
        effect: v.effect,
      })),
      originalDamageDisplay,
      hpPercent,
      sortedSkills: (row.keySkills ?? []).sort(commonSkillSort),
    },
  };
}

function handleLine(line: string) {
  const type = line.substring(0, line.indexOf("|"));
  if (!type) return;
  const splitLine = line.split("|");

  resourceManager.processLine(type, splitLine, cooldownTracker);

  switch (type) {
    case "26": // GainsEffect
      {
        if (!splitLine[logDefinitions.GainsEffect.fields.effectId]) return;
        const effectId = splitLine[logDefinitions.GainsEffect.fields.effectId]!;
        const effect = splitLine[logDefinitions.GainsEffect.fields.effect]!;
        const target = splitLine[logDefinitions.GainsEffect.fields.target]!;
        const targetId = splitLine[logDefinitions.GainsEffect.fields.targetId]!;
        const count = Number.parseInt(splitLine[logDefinitions.GainsEffect.fields.count]!, 16);
        let keigenn: Keigenn | undefined = getKeigenn(effectId);
        if (!keigenn) {
          const vulnerable =
            (targetId.startsWith("1") &&
              universalVulnerableFriendly.get(Number.parseInt(effectId, 16).toString())) ||
            (targetId.startsWith("4") &&
              universalVulnerableEnemy.get(Number.parseInt(effectId, 16).toString()));
          if (!vulnerable) return;
          const fullIcon = completeIcon(vulnerable.icon);
          const realIcon = count > 1 ? stackUrl(fullIcon, count) : fullIcon;
          keigenn = {
            type: "multiplier",
            performance: { physics: 1, magic: 1, darkness: 1 },
            id: Number.parseInt(effectId, 16),
            fullIcon: realIcon,
            name: vulnerable.name,
            isFriendly: vulnerable.isFriendly,
            canStack: true,
          };
        } else if (isPvP && keigenn && count > 1 && count <= 16) {
          keigenn.fullIcon = stackUrl(keigenn.fullIcon, count);
        }
        const duration = splitLine[logDefinitions.GainsEffect.fields.duration]!;
        const source = splitLine[logDefinitions.GainsEffect.fields.source]!;
        const sourceId = splitLine[logDefinitions.GainsEffect.fields.sourceId]!;
        const timestamp = new Date(
          splitLine[logDefinitions.GainsEffect.fields.timestamp]!,
        ).getTime();
        const expirationTimestamp = timestamp + Number.parseFloat(duration) * 1000;
        const status: Status = {
          name: keigenn.name,
          type: keigenn.type,
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
          isPov: povId === sourceId,
          canStack: keigenn.canStack,
        };
        if (targetId.startsWith("1") && keigenn.isFriendly) {
          if (statusData.friendly[targetId] === undefined) statusData.friendly[targetId] = {};
          statusData.friendly[targetId][effectId] = status;
        } else if (targetId.startsWith("4") && !keigenn.isFriendly) {
          if (statusData.enemy[target] === undefined) statusData.enemy[target] = {};
          statusData.enemy[target][effectId] = status;
        }
      }
      break;

    case "30": // LosesEffect
      {
        const target = splitLine[logDefinitions.LosesEffect.fields.target]!;
        const targetId = splitLine[logDefinitions.LosesEffect.fields.targetId]!;
        const effectId = splitLine[logDefinitions.LosesEffect.fields.effectId]!;
        if (targetId.startsWith("1")) {
          if (statusData.friendly[targetId])
            Reflect.deleteProperty(statusData.friendly[targetId], effectId);
        } else {
          if (statusData.enemy[target]) Reflect.deleteProperty(statusData.enemy[target], effectId);
        }
      }
      break;

    case "21":
    case "22": // Ability
      {
        if (combatTimeStamp === 0) return;
        const sourceId = splitLine[logDefinitions.Ability.fields.sourceId] ?? "???";
        const id = splitLine[logDefinitions.Ability.fields.id] ?? "???";
        const timestamp = new Date(
          splitLine[logDefinitions.Ability.fields.timestamp] ?? "???",
        ).getTime();

        if (sourceId.startsWith("1")) {
          const abilityIdDecimal = Number.parseInt(id, 16);
          const level = entitiesMap[sourceId]?.level ?? 999;

          const skillMap = getSkillMapForLevel(level);
          const groupAbilityId = compareSame(abilityIdDecimal);
          const trackedSkill = skillMap.get(abilityIdDecimal) || skillMap.get(groupAbilityId);

          if (trackedSkill) {
            if (!cooldownTracker[sourceId]) {
              cooldownTracker[sourceId] = {};
            }
            if (!cooldownTracker[sourceId][groupAbilityId]) {
              cooldownTracker[sourceId][groupAbilityId] = [];
            }
            const history = cooldownTracker[sourceId][groupAbilityId]!;
            history.push(timestamp);
            const maxCharges = parseDynamicValue(trackedSkill.maxCharges || 1, level) || 1;
            if (history.length > maxCharges) {
              history.shift();
            }
          }
        }

        const ability = processAbilityLine(splitLine);
        const targetId = splitLine[logDefinitions.Ability.fields.targetId] ?? "???";
        const isHeal = ability.isHeal && ability.amount > 0 && targetId.startsWith("1");
        const isDamage =
          ability.isAttack &&
          ability.amount >= 0 &&
          (isPvP || sourceId.startsWith("4")) &&
          targetId.startsWith("1");

        if (isHeal || isDamage) {
          if (
            !(
              targetId === povId ||
              partyLogList.includes(targetId) ||
              partyEventParty.some((v) => v.id === targetId)
            )
          ) {
            return;
          }

          const rawAblityName = splitLine[logDefinitions.Ability.fields.ability]!;
          const rsvMatch = rawAblityName.match(/^_rsv_(?<id>\d+)_/);
          let action = rawAblityName;
          if (rsvMatch) {
            const id: number = Number(rsvMatch.groups?.id);
            action = (rsvData[id] ?? rawAblityName.match(/^_(?<id>rsv_\d+)_/)?.groups?.id)!;
          } else {
            action = action.replace(/unknown_.*/, "攻击");
            if (userOptions.parseAA === false && /^攻击|攻撃|[Aa]ttack$/.test(action)) {
              return;
            }
          }
          const cn = getActionChinese(Number.parseInt(id, 16));
          const actionCN = cn && cn !== "" ? cn : action;
          const currentHp = Number(splitLine[logDefinitions.Ability.fields.targetCurrentHp]);
          const maxHp = Number(splitLine[logDefinitions.Ability.fields.targetMaxHp]);
          const source = splitLine[logDefinitions.Ability.fields.source] ?? "???";
          const target = splitLine[logDefinitions.Ability.fields.target] ?? "???";
          const { effect, type } = processFlags(ability.flags);
          const time = combatTimeStamp === 0 ? 0 : timestamp - combatTimeStamp;
          const formattedTime = formatTime(time);

          // 使用缓存的职业信息
          const { jobEnum, job, jobIcon, hasDuplicate } = getCachedJobInfo(targetId);

          // 浅拷贝快照
          const keigenns = [
            ...Object.values(statusData.friendly[targetId] ?? []),
            ...Object.values(statusData.enemy[source] ?? []),
          ]
            .map((v) => {
              const remain = (v.expirationTimestamp - timestamp) / 1000;
              return {
                ...v,
                remain,
              };
            })
            .filter((v) => v.remain > -3)
            .map((v) => {
              const displayRemain = Math.max(0, v.remain);
              const { remain, ...rest } = v;
              // 返回新对象，避免修改原始 statusData
              return {
                ...rest,
                remainingDuration:
                  displayRemain >= 999
                    ? ""
                    : displayRemain.toFixed(displayRemain > 0.05 && displayRemain < 0.95 ? 1 : 0),
              };
            });

          const shield = shieldData[targetId] ?? "0";
          const amount = ability.amount;
          const targetIndex = Number(splitLine[logDefinitions.Ability.fields.targetIndex!]!) + 1; // 0开始的，加一方便计算
          const targetCount = Number(splitLine[logDefinitions.Ability.fields.targetCount!]!); // 1开始的，不要加一
          let reduction = 0;
          // 即死、闪避、治疗
          if (!isHeal && effect !== "instant death" && effect !== "dodge") {
            let flagMultiplier = 1;
            // 格挡20%
            if (effect === "blocked damage") flagMultiplier = 0.8;
            // 招架15%
            else if (effect === "parried damage") flagMultiplier = 0.85;

            let reductionMultiplier = 1;
            for (const k of keigenns) {
              if (k.type !== "absorbed") {
                const performance = k.performance[type as keyof PerformanceType] ?? 1;
                const stackCount = k.canStack && k.count >= 1 && k.count <= 16 ? k.count : 1;
                const stackedPerformance = 1 - (1 - performance) * stackCount;
                reductionMultiplier *= stackedPerformance;
              }
            }
            reduction = 1 - reductionMultiplier * flagMultiplier;
          }

          addRow(
            prepareRowVO({
              key: (rowCounter++).toString(),
              time: formattedTime,
              timestamp,
              id,
              action,
              actionCN,
              source,
              target,
              targetId,
              targetIndex,
              targetCount,
              job,
              jobIcon,
              jobEnum,
              hasDuplicate,
              amount,
              keigenns,
              currentHp,
              maxHp,
              effect,
              type,
              shield,
              povId,
              reduction,
              isPvP,
              keySkills: getKeySkillSnapshot(timestamp, targetId),
            }),
          );
          data.value[0]!.duration = formatTime(
            new Date(splitLine[logDefinitions.Ability.fields.timestamp]!).getTime() -
              combatTimeStamp,
          );
        }
      }
      break;

    case "25": // Death
      {
        const targetId = splitLine[logDefinitions.WasDefeated.fields.targetId]!;
        const target = splitLine[logDefinitions.WasDefeated.fields.target]!;
        const sourceId = splitLine[logDefinitions.WasDefeated.fields.sourceId]!;
        const source =
          sourceId === "E0000000" ? "地形杀" : splitLine[logDefinitions.WasDefeated.fields.source]!;

        if (combatTimeStamp === 0) return;

        if (
          !(
            targetId === povId ||
            partyLogList.includes(targetId) ||
            partyEventParty.some((v) => v.id === targetId)
          )
        ) {
          return;
        }

        const timestamp = new Date(
          splitLine[logDefinitions.WasDefeated.fields.timestamp]!,
        ).getTime();
        const time = timestamp - combatTimeStamp;
        const formattedTime = formatTime(time);

        const { jobEnum, job, jobIcon, hasDuplicate } = getCachedJobInfo(targetId);

        addRow(
          prepareRowVO({
            key: (rowCounter++).toString(),
            time: formattedTime,
            timestamp,
            id: "",
            action: "Death",
            actionCN: sourceId === "E0000000" ? "地形杀" : "死亡",
            source,
            target,
            targetId,
            job,
            jobIcon,
            jobEnum,
            hasDuplicate,
            amount: 0,
            keigenns: [],
            currentHp: 0,
            maxHp: 0,
            effect: "death",
            type: "death",
            shield: "0",
            povId,
            reduction: 0,
            isPvP,
            keySkills: getKeySkillSnapshot(timestamp, targetId),
          }),
        );
      }
      break;

    case "38": // StatusEffect (Shields)
      {
        const shieldTargetId = splitLine[logDefinitions.StatusEffect.fields.targetId];
        if (shieldTargetId?.startsWith("1")) {
          shieldData[shieldTargetId] = splitLine[logDefinitions.StatusEffect.fields.currentShield]!;
        }
      }
      break;

    case "260": // InCombat
      {
        const inACTCombat = splitLine[logDefinitions.InCombat.fields.inACTCombat] === "1";
        const inGameCombat = splitLine[logDefinitions.InCombat.fields.inGameCombat] === "1";
        const timeStamp = new Date(splitLine[logDefinitions.InCombat.fields.timestamp]!).getTime();
        if (inACTCombat || inGameCombat) {
          const key = splitLine[logDefinitions.InCombat.fields.timestamp]!;
          // new combat
          if (combatTimeStamp > 0) {
            return;
          }
          if (data.value[0]!.table.length !== 0 || pendingRows.length !== 0) {
            flushPendingRows();
            data.value.unshift(createEmptyEncounter(key, timeStamp));
            triggerRef(data);
          }
          combatTimeStamp = timeStamp;
          data.value[0]!.zoneName = zoneName;
          data.value[0]!.timestamp = timeStamp;
          data.value[0]!.key = key;
          select.value = 0;
          return;
        }
        if (!inACTCombat && !inGameCombat) {
          // stop combat
          stopCombat(timeStamp);
        }
      }
      break;

    case "01": // ChangeZone
      {
        const zoneId = Number.parseInt(splitLine[logDefinitions.ChangeZone.fields.id]!, 16);
        zoneName = splitLine[logDefinitions.ChangeZone.fields.name]!;
        if (ZoneInfo[zoneId]?.name) {
          const useLangZoneName = getCactbotLocaleMessage(ZoneInfo[zoneId]?.name);
          if (useLangZoneName && useLangZoneName !== "Unknown") zoneName = useLangZoneName;
        }
        const zoneInfo = ZoneInfo[zoneId];
        isPvP = !!zoneInfo && getZoneType(zoneInfo) === "Pvp";
        cooldownTracker = {};
        resourceManager.clear();
        stopCombat(new Date(splitLine[logDefinitions.ChangeZone.fields.timestamp]!).getTime());
      }
      break;

    case "11": // PartyList
      {
        const partyCount = Number(splitLine[logDefinitions.PartyList.fields.partyCount]) || 0;
        const ids: string[] = [];
        for (let i = 0; i < partyCount; i++) {
          const id = splitLine[logDefinitions.PartyList.fields.id0 + i];
          if (id) ids.push(id);
        }
        partyLogList = ids;
        invalidateJobCache();
      }
      break;

    case "02": // PrimaryPlayer
      povId = splitLine[logDefinitions.ChangedPlayer.fields.id]!;
      invalidateJobCache();
      break;

    case "03": // AddCombatant
      if (splitLine[logDefinitions.AddedCombatant.fields.job] !== "00") {
        const job = splitLine[logDefinitions.AddedCombatant.fields.job]!;
        const name = splitLine[logDefinitions.AddedCombatant.fields.name]!;
        const timestamp = new Date(
          splitLine[logDefinitions.AddedCombatant.fields.timestamp]!,
        ).getTime();
        const level = Number.parseInt(splitLine[logDefinitions.AddedCombatant.fields.level]!, 16);
        entitiesMap[splitLine[logDefinitions.AddedCombatant.fields.id]!] = {
          job: Number.parseInt(job, 16),
          timestamp,
          name,
          level,
        };
        invalidateJobCache();
      }
      break;

    case "04": // RemovingCombatant
      Reflect.deleteProperty(entitiesMap, splitLine[logDefinitions.RemovedCombatant.fields.id]!);
      Reflect.deleteProperty(
        statusData.friendly,
        splitLine[logDefinitions.RemovedCombatant.fields.id]!,
      );
      Reflect.deleteProperty(
        statusData.enemy,
        splitLine[logDefinitions.RemovedCombatant.fields.id]!,
      );
      invalidateJobCache();
      break;

    case "262": // RSV
      {
        const rsvKey = splitLine[logDefinitions.RSVData.fields.key];
        const rsvValue = splitLine[logDefinitions.RSVData.fields.value];
        if (rsvKey && rsvValue) {
          const rsvIdMatch = rsvKeyPattern.exec(rsvKey);
          if (rsvIdMatch) rsvData[Number(rsvIdMatch[1])] = rsvValue;
        }
      }
      break;

    case "24": // NetworkDoT / HoT
      {
        const which = splitLine[logDefinitions.NetworkDoT.fields.which]!;
        const effectId = splitLine[logDefinitions.NetworkDoT.fields.effectId]!;
        const effectIdNum = Number.parseInt(effectId, 16);
        const isHoT = which === "HoT";
        const isMicrocosmos = isHoT && effectIdNum === 0xa9e;
        if (!isHoT && !userOptions.parseDoT) return;

        const targetId = splitLine[logDefinitions.NetworkDoT.fields.id]!;
        if (
          (which !== "DoT" && which !== "HoT") ||
          targetId.startsWith("4") ||
          !(
            targetId === povId ||
            partyLogList.includes(targetId) ||
            partyEventParty.some((v) => v.id === targetId)
          )
        ) {
          return;
        }

        const target = splitLine[logDefinitions.NetworkDoT.fields.name]!;
        const damage = splitLine[logDefinitions.NetworkDoT.fields.damage]!;
        const amount = Number.parseInt(damage, 16);

        let actionDisplay = which;
        if (isMicrocosmos) {
          actionDisplay = userOptions.actionCN ? "小宇宙" : "Microcosmos";
        }
        const timestamp = new Date(
          splitLine[logDefinitions.Ability.fields.timestamp] ?? "???",
        ).getTime();
        const currentHp = Number(splitLine[logDefinitions.NetworkDoT.fields.currentHp]);
        const maxHp = Number(splitLine[logDefinitions.NetworkDoT.fields.maxHp]);
        const time = combatTimeStamp === 0 ? 0 : timestamp - combatTimeStamp;
        const formattedTime = formatTime(time);

        // 使用缓存的职业信息
        const { jobEnum, job, jobIcon, hasDuplicate } = getCachedJobInfo(targetId);

        // HoT/DoT日志的source不准确 故无法计算目标减伤
        addRow(
          prepareRowVO({
            key: (rowCounter++).toString(),
            time: formattedTime,
            timestamp,
            id: "",
            action: actionDisplay,
            actionCN: actionDisplay,
            source: "",
            target,
            targetId,
            job,
            jobIcon,
            jobEnum,
            hasDuplicate,
            amount,
            keigenns: [],
            currentHp,
            maxHp,
            effect: isHoT ? "heal" : "damage done",
            type: isHoT ? "heal" : "dot",
            shield: shieldData[targetId] ?? "0",
            povId,
            reduction: 0,
            isPvP,
            keySkills: [],
          }),
        );
      }
      break;

    case "33": // ActorControl (including Wipe)
      if (wipeRegex.exec(line)) {
        resourceManager.reset();
        cooldownTracker = {};
        shieldData = {};
        statusData.friendly = {};
        statusData.enemy = {};
      }
      break;
  }
}

interface JobInfo {
  jobEnum: number;
  job: string;
  jobIcon: FFIcon;
  hasDuplicate: boolean;
}

const jobInfoCache = new Map<string, JobInfo>();
let skillSnapshotSkeletonCache: Omit<KeySkillSnapshot, "ready" | "recastLeft">[] | null = null;

function invalidateJobCache() {
  jobInfoCache.clear();
  skillSnapshotSkeletonCache = null;
  updateResourceManagerJobs();
}

function updateResourceManagerJobs() {
  const partyInfo = new Map<number, string[]>();
  const add = (job: number, id: string) => {
    if (!job || !id) return;
    if (!partyInfo.has(job)) partyInfo.set(job, []);
    partyInfo.get(job)!.push(id);
  };

  partyEventParty.forEach((p) => add(p.job, p.id));
  if (povId) {
    const pov = partyEventParty.find((p) => p.id === povId) || entitiesMap[povId];
    if (pov) add(pov.job, povId);
  }
  partyLogList.forEach((id) => {
    const info = entitiesMap[id];
    if (info) add(info.job, id);
  });
  resourceManager.updateParty(partyInfo);
}

function getJobById(targetId: string) {
  const fromJobMap = entitiesMap[targetId];
  const fromPartyEvent = partyEventParty.find((v) => v.id === targetId) ?? { job: 0, timestamp: 0 };
  const need =
    (fromJobMap?.timestamp ?? 0) > fromPartyEvent.timestamp ? fromJobMap : fromPartyEvent;

  const hasDuplicate =
    need === fromJobMap
      ? Object.entries(entitiesMap).some(
          ([id, job]) => id !== targetId && job.job === need?.job && partyLogList.includes(id),
        )
      : partyEventParty.some((v) => v.id !== targetId && v.job === need?.job);
  return { job: need?.job ?? 0, hasDuplicate };
}

function getCachedJobInfo(targetId: string): JobInfo {
  // 检查缓存
  const cached = jobInfoCache.get(targetId);
  if (cached) {
    return cached;
  }

  // 计算职业信息
  const { job: targetJob, hasDuplicate } = getJobById(targetId);
  const jobEnum = targetJob;
  const job = Util.jobToFullName(Util.jobEnumToJob(jobEnum)).simple2;
  const jobIcon = Util.jobEnumToIcon(jobEnum);

  const jobInfo: JobInfo = {
    jobEnum,
    job,
    jobIcon,
    hasDuplicate,
  };

  // 缓存结果
  jobInfoCache.set(targetId, jobInfo);

  return jobInfo;
}

function addRow(row: RowVO) {
  pendingRows.push(markRaw(row));
  if (batchTimer === null) {
    batchTimer = requestAnimationFrame(() => {
      appendPendingRows(!loading.value);
      batchTimer = null;
    });
  }
}

function appendPendingRows(shouldScrollToBottom = false) {
  if (pendingRows.length === 0) return;
  if (isPush.value) {
    data.value[0]!.table.push(...pendingRows);
    if (shouldScrollToBottom) {
      nextTick(() => tableRef.value?.scrollToBottom());
    }
  } else {
    data.value[0]!.table.unshift(...pendingRows.reverse());
  }
  pendingRows = [];
}

function flushPendingRows(shouldScrollToBottom = false) {
  if (batchTimer !== null) {
    cancelAnimationFrame(batchTimer);
    batchTimer = null;
  }
  appendPendingRows(shouldScrollToBottom);
}

function stopCombat(timeStamp: number) {
  if (combatTimeStamp === 0) return;
  flushPendingRows(!loading.value);
  data.value[0]!.duration = formatTime(timeStamp - combatTimeStamp);
  data.value[0] = markRaw(data.value[0]!);
  combatTimeStamp = 0;
  statusData.friendly = {};
  statusData.enemy = {};
  shieldData = {};
  invalidateJobCache();
  triggerRef(data);
  scheduleStopCombatPersistence(data.value[0]!);
}

function getKeySkillSnapshot(timestamp: number, targetId: string): KeySkillSnapshot[] {
  if (!skillSnapshotSkeletonCache) {
    const candidateIds = new Set<string>();
    partyEventParty.forEach((p) => candidateIds.add(p.id));
    partyLogList.forEach((id) => candidateIds.add(id));
    if (povId) candidateIds.add(povId);

    const players: { id: string; job: number; name: string; level: number }[] = [];
    for (const id of candidateIds) {
      const p = partyEventParty.find((v) => v.id === id);
      if (p) {
        players.push({ id: p.id, job: p.job, name: p.name, level: p.level });
        continue;
      }
      const info = entitiesMap[id];
      if (info) {
        players.push({
          id,
          job: info.job,
          name: info.name ?? "Unknown",
          level: info.level,
        });
      }
    }

    skillSnapshotSkeletonCache = players.flatMap((player) => {
      const level = player.level || GLOBAL_SKILL_MAX_LEVEL;
      return trackedSkills
        .filter((skill) => skill.job.includes(player.job) && skill.minLevel <= level)
        .map((skill) => {
          const id = parseDynamicValue(skill.id, level);
          const recast = parseDynamicValue(skill.recast1000ms, level);
          return {
            id,
            name: getActionChinese(id) || "Unknown",
            icon: idToSrc(id),
            recast1000ms: recast,
            ownerId: player.id,
            ownerName: player.name,
            ownerJob: player.job,
            ownerJobName: Util.jobToFullName(Util.jobEnumToJob(player.job)).simple2!,
            maxCharges: parseDynamicValue(skill.maxCharges || 1, level) || 1,
            scope: skill.scope,
            resourceCost: getJobResourceActionCost(id),
          };
        });
    });
  }

  if (!skillSnapshotSkeletonCache) return [];

  return skillSnapshotSkeletonCache
    .filter((v) => {
      if (v.scope === "party") return true;
      if (v.scope === "self") return v.ownerId === targetId;
      if (v.scope === "other") return v.ownerId !== targetId;
      return false;
    })
    .map((item) => {
      const history = cooldownTracker[item.ownerId]?.[compareSame(item.id)] ?? [];
      const { charges: chargesReady, recastLeft: recastLeftMs } = calculateCharges(
        history,
        timestamp,
        item.maxCharges || 1,
        item.recast1000ms * 1000,
      );
      const recastLeft = Math.ceil(recastLeftMs / 1000);

      const jobResource =
        item.resourceCost === undefined
          ? undefined
          : resourceManager.getResource(item.ownerJob, item.ownerId);
      const isResourceReady =
        item.resourceCost === undefined
          ? true
          : resourceManager.isResourceReady(
              item.ownerJob,
              item.ownerId,
              item.id,
              item.resourceCost,
            );

      const ready = chargesReady > 0 && isResourceReady;

      const extraText = resourceManager.getExtraText(
        item.ownerJob,
        item.ownerId,
        item.id,
        timestamp,
        cooldownTracker[item.ownerId] || {},
      );

      return {
        ...item,
        jobResource,
        recastLeft,
        ready,
        chargesReady,
        extraText,
      };
    });
}

function isStorableEncounter(encounter: Encounter) {
  return encounter.key !== "init" && encounter.timestamp > 0 && encounter.table.length > 0;
}

function toStoredEncounter(encounter: Encounter): Encounter {
  return {
    ...toRaw(encounter),
    table: toRaw(encounter.table),
  };
}

function getStorableEncounters(encounters: Encounter[]): Encounter[] {
  return encounters.filter(isStorableEncounter).map(toStoredEncounter);
}

async function saveAllEncounters() {
  if (loading.value) return;
  const toSaveList: Encounter[] = [];
  for (const encounter of data.value) {
    if (!isStorableEncounter(encounter)) continue;
    if (!encounter.table || encounter.table.length === 0) {
      const detail = await db.get(encounter.key);
      if (detail) {
        toSaveList.push(detail);
      }
    } else {
      toSaveList.push(toStoredEncounter(encounter));
    }
  }
  await db.replaceAll(toSaveList);
}

function scheduleStopCombatPersistence(encounter: Encounter) {
  if (loading.value) return;
  pendingStopCombatEncounters.set(encounter.key, encounter);
  if (stopCombatPersistenceTimer !== null) {
    window.clearTimeout(stopCombatPersistenceTimer);
  }
  stopCombatPersistenceTimer = window.setTimeout(() => {
    stopCombatPersistenceTimer = null;
    if (loading.value) {
      // loading 期间重新调度
      scheduleStopCombatPersistence(encounter);
      return;
    }
    const toSave = getStorableEncounters(Array.from(pendingStopCombatEncounters.values()));
    pendingStopCombatEncounters.clear();
    if (toSave.length === 0) return;
    savePersistentData();
    const savePromise = toSave.length === 1 ? db.set(toSave[0]!) : db.bulkSet(toSave);
    void savePromise.catch((error) => {
      console.error("Failed to save combat data:", error);
    });
  }, STOP_COMBAT_SAVE_DELAY);
}

function clearScheduledStopCombatPersistence() {
  if (stopCombatPersistenceTimer !== null) {
    window.clearTimeout(stopCombatPersistenceTimer);
    stopCombatPersistenceTimer = null;
  }
  pendingStopCombatEncounters.clear();
}

async function loadEncounterDetail(index: number) {
  const encounter = data.value[index];
  if (!encounter || encounter.key === "init") return;

  // 如果已经有战斗日志了，就不需要再去加载了
  if (encounter.table && encounter.table.length > 0) return;

  loading.value = true;
  try {
    const detail = await db.get(encounter.key);
    if (detail && detail.table) {
      encounter.table = shallowReactive(detail.table);
      ensureEncounterProcessed(encounter);
      triggerRef(data);
    }
  } catch (e) {
    console.error("Failed to load encounter details for key " + encounter.key, e);
  } finally {
    loading.value = false;
  }
}

watch(select, async (newVal) => {
  await loadEncounterDetail(newVal);
});

watch(
  () => userOptions.order,
  () => {
    const currentKey = data.value[select.value]?.key;
    for (const encounter of data.value) {
      if (encounter.table && encounter.table.length > 1) {
        encounter.table.reverse();
      }
    }
    if (data.value.length > 1) {
      data.value.reverse();
      if (currentKey) {
        const nextIndex = data.value.findIndex((e) => e.key === currentKey);
        if (nextIndex !== -1) select.value = nextIndex;
      }
    }
    triggerRef(data);
  },
);

async function loadStorage() {
  select.value = 0;
  try {
    if (isNewVersion) {
      await db.replaceAll([]);
      data.value.length = 0;
    } else {
      const [loadData] = await Promise.all([db.getAllMetadata(), ensureIconCacheReady()]);

      if (loadData && loadData.length) {
        data.value.length = 0;
        const now = Date.now();
        const expiryThreshold = now - 1000 * 60 * 60 * 24 * 3;
        const expiredKeys: string[] = [];

        const filtered = loadData.filter((v) => {
          if (canImportLog.value || v.timestamp > expiryThreshold) return true;
          expiredKeys.push(v.key);
          return false;
        });

        // 按 key 逐条删除过期记录
        if (expiredKeys.length > 0) {
          void Promise.all(expiredKeys.map((key) => db.remove(key)));
        }

        let result = filtered.sort((a, b) => a.timestamp - b.timestamp);

        if (!isPush.value) {
          result = result.reverse();
        }

        for (const v of result) {
          // 初始化 table 为空，防止 Vue 对其进行深度响应式递归和全量生成 DOM 节点卡死
          v.table = shallowReactive([]);
          data.value.push(v);
        }

        // 仅处理并懒加载当前选中的最新战斗
        if (data.value.length > 0) {
          await loadEncounterDetail(0);
        }
      }
    }

    if (data.value.length === 0) {
      data.value.push(createEmptyEncounter());
    }
    triggerRef(data);
  } catch (e) {
    console.error(e);
    data.value.length = 0;
    throw e;
  }
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && settingsOpen.value) {
    settingsOpen.value = false;
  }
}

function handleWindowDismiss() {
  browserCombatSelectRef.value?.blur();
  actCombatSelectRef.value?.blur();
}

onMounted(async () => {
  window.addEventListener("keydown", handleGlobalKeydown);
  window.addEventListener("blur", handleWindowDismiss);
  document.documentElement.addEventListener("mouseleave", handleWindowDismiss);
  // 加载持久化数据
  loadPersistentData();

  const isDark = useDark({ storageKey: "keigenn-record-2-theme" });
  const toggleDark = useToggle(isDark);
  if (isDark.value === false) {
    // 固定使用深色主题
    toggleDark();
  }
  for (const id in entitiesMap) {
    const element = entitiesMap[id]!;
    if (Date.now() - element.timestamp > 1000 * 60 * 60 * 24 * 1)
      Reflect.deleteProperty(entitiesMap, id);
  }
  loadStorage();

  addOverlayListener("LogLine", (e) => {
    handleLine(e.rawLine);
  });
  addOverlayListener("PartyChanged", (e) => {
    partyEventParty = e.party.map((v) => ({
      ...v,
      timestamp: Date.now(),
    }));
    invalidateJobCache();
  });
  addOverlayListener("ChangePrimaryPlayer", (e) => {
    povId = Number(e.charID).toString(16).toUpperCase();
    invalidateJobCache();
  });
  addOverlayListener("CombatData", ((e: CombatDataEvent) => {
    if (combatTimeStamp > 0) return;
    if (e.isActive === "true") {
      if (e.Encounter?.CurrentZoneName) {
        zoneName = e.Encounter.CurrentZoneName;
      }

      const durationStr = e.Encounter?.duration || "00:00";
      const parts = durationStr.split(":").map(Number);
      let durationMs = 0;
      if (parts.length === 3) {
        durationMs = (parts[0]! * 3600 + parts[1]! * 60 + parts[2]!) * 1000;
      } else if (parts.length === 2) {
        durationMs = (parts[0]! * 60 + parts[1]!) * 1000;
      }

      const now = Date.now();
      const startTime = now - durationMs;

      if (data.value[0]!.table.length !== 0) {
        data.value.unshift(createEmptyEncounter(String(startTime), startTime));
        triggerRef(data);
      }

      data.value[0]!.zoneName = zoneName;
      combatTimeStamp = startTime;
      data.value[0]!.timestamp = startTime;
      data.value[0]!.key = String(startTime);
      select.value = 0;
    }
  }) as any);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown);
  window.removeEventListener("blur", handleWindowDismiss);
  document.documentElement.removeEventListener("mouseleave", handleWindowDismiss);
});

function clickMinimize() {
  minimize.value = !minimize.value;
}

function test() {
  if (data.value[0]?.key === "init" || data.value[0] === undefined) {
    data.value.unshift(createEmptyEncounter("test", Date.now()));
    triggerRef(data);
    select.value = 0;
  }
  addRow(
    prepareRowVO({
      key: (rowCounter++).toString(),
      time: formatTime(Date.now() - (combatTimeStamp || Date.now())),
      timestamp: Date.now(),
      id: "unknown",
      action: "test",
      actionCN: "测试技能",
      source: "环境伤害",
      target: "测试角色",
      targetId: "test-id",
      job: "测试职业",
      jobIcon: Util.jobEnumToIcon(19),
      jobEnum: 19,
      hasDuplicate: false,
      amount: 12345,
      keigenns: [],
      currentHp: 50000,
      maxHp: 100000,
      effect: "damage done",
      type: "physics",
      shield: "10",
      povId: "test-id",
      reduction: 0.1,
      isPvP,
      keySkills: [],
    }),
  );
}

function formatTimestamp(ms: number): string {
  const date = new Date(ms);

  const h = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  const ss = date.getSeconds().toString().padStart(2, "0");

  return `${h}:${mm}:${ss}`;
}

function getEncounterLabel(encounter: Encounter): string {
  if (!encounter.zoneName) return "";
  return `${encounter.zoneName} - [${encounter.duration}] ${formatTimestamp(encounter.timestamp)}`;
}

const hasAnyEncounterData = computed(() =>
  data.value.some((e) => e.key !== "init" || e.table.length > 0),
);
const canImportLog = computed(() => store.isBrowser || dev.value);

const hasAnyFilter = computed(() => {
  return Boolean(
    onlyDeath.value || hideAA.value || showHeals.value || tableRef.value?.hasColumnFilters,
  );
});

function clearAllFilters() {
  onlyDeath.value = false;
  hideAA.value = false;
  showHeals.value = false;
  tableRef.value?.clearFilters?.();
}

async function clearAllEncounters() {
  clearAllFilters();
  beforeHandle();
  loading.value = false;
  try {
    await db.clear();
  } catch (e) {
    console.error("Failed to clear IndexedDB:", e);
  }
  Object.values(STORAGE_KEYS).forEach((key) => {
    if (key !== STORAGE_KEYS.VERSION) localStorage.removeItem(key);
  });
  triggerRef(data);
  ElMessage.success({ message: t("keigennRecord.settings.clearedRecords"), duration: 1200 });
}

function resetOptions() {
  store.resetUserOptions();
}

async function processLogFiles(files: FileList | null) {
  if (!files || files.length === 0) return;

  beforeHandle();
  const instance = ElLoading.service({
    fullscreen: true,
    text: t("testLog.loading"),
    lock: true,
    background: "rgba(0, 0, 0, 0.7)",
  });

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const text = await file.text();
      const lines = text.split("\n");
      for (const line of lines) {
        handleLine(line);
      }
    }
  } finally {
    instance.close();
    await afterHandle();
    if (browserFileInputRef.value) browserFileInputRef.value.value = "";
  }
}

function openLogPicker() {
  browserFileInputRef.value?.click();
}

function handleFileInputChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  void processLogFiles(files);
}

function handlePageDragEnter(e: DragEvent) {
  if (!canImportLog.value) return;
  if (!e.dataTransfer?.types.includes("Files")) return;
  e.preventDefault();
  pageDragCounter++;
  isDragOverPage.value = true;
}

function handlePageDragOver(e: DragEvent) {
  if (!canImportLog.value) return;
  if (!e.dataTransfer?.types.includes("Files")) return;
  e.preventDefault();
}

function handlePageDragLeave(e: DragEvent) {
  if (!canImportLog.value) return;
  e.preventDefault();
  pageDragCounter = Math.max(0, pageDragCounter - 1);
  if (pageDragCounter === 0) {
    isDragOverPage.value = false;
  }
}

function handlePageDrop(e: DragEvent) {
  if (!canImportLog.value) return;
  e.preventDefault();
  pageDragCounter = 0;
  isDragOverPage.value = false;
  const files = e.dataTransfer?.files || null;
  void processLogFiles(files);
}

function buildActUrl(): string {
  const base = `${window.location.origin}${window.location.pathname}#/keigennRecord2`;
  const q = new URLSearchParams();
  if (userOptions.scale !== 1) q.set("scale", String(userOptions.scale));
  if (userOptions.opacity !== 0.9) q.set("opacity", String(userOptions.opacity));
  if (userOptions.iconType !== 2) q.set("iconType", String(userOptions.iconType));
  if (userOptions.parseAA !== true) q.set("parseAA", "0");
  if (userOptions.parseDoT !== false) q.set("parseDoT", "1");
  if (userOptions.minimize !== false) q.set("minimize", "1");
  if (userOptions.minimizeStyle !== "icon") q.set("minimizeStyle", userOptions.minimizeStyle);
  if (userOptions.actionCN !== true) q.set("actionCN", "0");
  if (userOptions.statusCN !== true) q.set("statusCN", "0");
  if (userOptions.order !== "unshift") q.set("order", userOptions.order);
  if (userOptions.anonymous) q.set("anonymous", "1");
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}

function copyActUrl() {
  copyToClipboard(buildActUrl())
    .then(() =>
      ElMessage.success({ message: t("keigennRecord.settings.copyActSuccess"), duration: 1200 }),
    )
    .catch(() => ElMessage.error(t("keigennRecord.copyFailed")));
}
</script>

<template>
  <div
    class="wrapper"
    :class="{ 'is-browser': store.isBrowser }"
    :style="{ '--scale': userOptions.scale, '--opacity': userOptions.opacity }"
    @contextmenu.prevent
    @dragenter="handlePageDragEnter"
    @dragover="handlePageDragOver"
    @dragleave="handlePageDragLeave"
    @drop="handlePageDrop"
  >
    <input
      v-if="canImportLog"
      ref="browserFileInputRef"
      type="file"
      multiple
      accept=".log,.txt"
      class="hidden-file-input"
      @change="handleFileInputChange"
    />

    <div v-if="store.isBrowser && hasAnyEncounterData" class="browser-toolbar">
      <el-select
        ref="browserCombatSelectRef"
        v-model="select"
        size="small"
        class="combat-select browser"
        popper-class="combat-select-popup is-browser-popup"
        :offset="4"
        :show-arrow="false"
        :placeholder="$t('keigennRecord.toolbar.noEncounters')"
        @visible-change="handleCombatSelectVisible"
      >
        <el-option
          v-for="i in data.length"
          :key="`${data[i - 1]!.key}-${data[i - 1]!.duration}-${data[i - 1]!.zoneName}`"
          :value="i - 1"
          :label="getEncounterLabel(data[i - 1]!)"
        />
      </el-select>

      <div class="toolbar-divider" />

      <div class="toolbar-toggles">
        <button
          type="button"
          class="toolbar-btn"
          :class="{ 'is-active': onlyDeath }"
          @click="onlyDeath = !onlyDeath"
        >
          {{ $t("keigennRecord.toolbar.onlyDeath") }}
        </button>
        <button
          type="button"
          class="toolbar-btn"
          :class="{ 'is-active': hideAA }"
          @click="hideAA = !hideAA"
        >
          {{ $t("keigennRecord.toolbar.hideAA") }}
        </button>
        <button
          type="button"
          class="toolbar-btn"
          :class="{ 'is-active': showHeals }"
          @click="showHeals = !showHeals"
        >
          {{ $t("keigennRecord.toolbar.showHeals") }}
        </button>
        <button
          type="button"
          class="toolbar-btn"
          :class="{ 'is-active': userOptions.anonymous }"
          @click="userOptions.anonymous = !userOptions.anonymous"
        >
          {{ $t("keigennRecord.toolbar.anonymous") }}
        </button>
        <button
          v-if="hasAnyFilter"
          type="button"
          class="toolbar-btn toolbar-btn-reset"
          @click="clearAllFilters"
        >
          {{ $t("keigennRecord.toolbar.clearFilters") }}
        </button>
      </div>

      <div class="toolbar-actions">
        <button v-if="dev" type="button" class="toolbar-btn" @click="test">
          {{ $t("keigennRecord.toolbar.test") }}
        </button>
        <button type="button" class="toolbar-btn toolbar-btn-reset" @click="clearAllEncounters">
          {{ $t("keigennRecord.toolbar.clearRecords") }}
        </button>
        <button
          type="button"
          class="toolbar-btn"
          :class="{ 'is-active': settingsOpen }"
          @click="settingsOpen = !settingsOpen"
        >
          {{ $t("keigennRecord.toolbar.settings") }}
        </button>
        <button type="button" class="toolbar-btn toolbar-btn-primary" @click="openLogPicker">
          {{ $t("keigennRecord.toolbar.importLog") }}
        </button>
      </div>
    </div>

    <div v-if="store.isBrowser && !hasAnyEncounterData" class="browser-landing">
      <div class="landing-inner">
        <h1 class="landing-title">{{ $t("keigennRecord.landing.title") }}</h1>
        <p class="landing-desc">{{ $t("keigennRecord.landing.desc") }}</p>
        <div class="landing-actions">
          <button type="button" class="landing-btn landing-btn-primary" @click="openLogPicker">
            {{ $t("keigennRecord.landing.selectFile") }}
          </button>
          <button type="button" class="landing-btn" @click="settingsOpen = !settingsOpen">
            {{ $t("keigennRecord.toolbar.settings") }}
          </button>
          <button v-if="dev" type="button" class="landing-btn" @click="test">
            {{ $t("keigennRecord.toolbar.test") }}
          </button>
        </div>
        <p class="landing-note">{{ $t("keigennRecord.actTip") }}</p>
      </div>
    </div>

    <div v-else class="table-stage">
      <div class="wrapper-scale" :class="{ 'is-scaled': safeScale !== 1 }">
        <header v-if="!store.isBrowser">
          <div class="header-select">
            <el-select
              v-show="!minimize"
              ref="actCombatSelectRef"
              v-model="select"
              size="small"
              class="combat-select act"
              popper-class="combat-select-popup is-act-popup"
              :offset="2"
              placement="bottom-end"
              :show-arrow="false"
              @visible-change="handleCombatSelectVisible"
            >
              <el-option
                v-for="i in data.length"
                :key="`${data[i - 1]!.key}-${data[i - 1]!.duration}-${data[i - 1]!.zoneName}`"
                :value="i - 1"
                :label="getEncounterLabel(data[i - 1]!)"
              />
            </el-select>
          </div>
          <button
            v-show="!minimize"
            type="button"
            class="act-settings-btn"
            @click="settingsOpen = !settingsOpen"
          >
            <ElIcon :size="12">
              <Setting />
            </ElIcon>
          </button>
          <el-button
            class="minimize"
            :class="[
              minimize ? 'in-minimize' : 'not-minimize',
              { 'is-icon-only': minimize && userOptions.minimizeStyle === 'icon' },
            ]"
            :icon="minimize ? ZoomIn : ZoomOut"
            :circle="!minimize || userOptions.minimizeStyle === 'icon'"
            :style="{
              opacity: minimize ? (userOptions.minimizeStyle === 'icon' ? 0.5 : 0.85) : 1,
            }"
            @click="clickMinimize"
          >
            <template v-if="minimize && userOptions.minimizeStyle !== 'icon'">
              {{ $t("keigennRecord.minimizeLabel") }}
            </template>
          </el-button>
        </header>
        <main v-show="!minimize" style="height: 100%">
          <KeigennRecord2Table
            ref="tableRef"
            :rows="selectedRows"
            :action-key="actionKey"
            :only-death="onlyDeath"
            :hide-auto-attack="hideAA"
            :show-heals="showHeals"
          >
            <template v-if="store.isBrowser" #empty>
              <div class="browser-empty-guide">
                <p class="empty-tip">{{ $t("keigennRecord.landing.emptyFiltered") }}</p>
                <button
                  type="button"
                  class="toolbar-btn toolbar-btn-reset"
                  @click="clearAllFilters"
                >
                  {{ $t("keigennRecord.toolbar.clearFilters") }}
                </button>
              </div>
            </template>
          </KeigennRecord2Table>
        </main>
      </div>
    </div>

    <div v-if="!store.isBrowser && dev" class="dev-act-test">
      <el-button v-if="hasAnyEncounterData" size="small" @click="clearAllEncounters">
        {{ $t("keigennRecord.toolbar.clearRecords") }}
      </el-button>
      <el-button size="small" @click="openLogPicker">
        {{ $t("keigennRecord.toolbar.importLog") }}
      </el-button>
      <el-button size="small" @click="test">{{ $t("keigennRecord.toolbar.test") }}</el-button>
    </div>

    <div v-if="canImportLog && isDragOverPage" class="drag-overlay">
      <div class="drag-overlay-box">
        <ElIcon :size="28">
          <UploadFilled />
        </ElIcon>
        <span>{{ $t("keigennRecord.landing.dragDrop") }}</span>
      </div>
    </div>

    <div v-if="settingsOpen" class="settings-backdrop" @click.self="settingsOpen = false">
      <div class="settings-panel">
        <div class="settings-header">
          <span class="settings-title">{{ $t("keigennRecord.settings.title") }}</span>
          <button type="button" class="toolbar-btn" @click="settingsOpen = false">
            {{ $t("keigennRecord.settings.close") }}
          </button>
        </div>
        <div class="settings-body">
          <label class="setting-row">
            <span>{{ $t("keigennRecord.settings.scale") }}</span>
            <span class="setting-ctrl">
              <input
                v-model.number="userOptions.scale"
                type="range"
                min="0.6"
                max="2"
                step="0.05"
              />
              <span class="setting-val">{{ Number(userOptions.scale).toFixed(2) }}</span>
            </span>
          </label>
          <label class="setting-row">
            <span>{{ $t("keigennRecord.settings.opacity") }}</span>
            <span class="setting-ctrl">
              <input
                v-model.number="userOptions.opacity"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
              />
              <span class="setting-val">{{ Number(userOptions.opacity).toFixed(2) }}</span>
            </span>
          </label>
          <label class="setting-row">
            <span>{{ $t("keigennRecord.settings.anonymous") }}</span>
            <input v-model="userOptions.anonymous" type="checkbox" />
          </label>
          <label class="setting-row">
            <span>{{ $t("keigennRecord.settings.actionCN") }}</span>
            <input v-model="userOptions.actionCN" type="checkbox" />
          </label>
          <label class="setting-row">
            <span>{{ $t("keigennRecord.settings.statusCN") }}</span>
            <input v-model="userOptions.statusCN" type="checkbox" />
          </label>
          <label class="setting-row">
            <span class="setting-label"
              >{{ $t("keigennRecord.settings.parseAA")
              }}<span class="setting-hint">{{
                $t("keigennRecord.settings.newRecordsOnly")
              }}</span></span
            >
            <input v-model="userOptions.parseAA" type="checkbox" />
          </label>
          <label class="setting-row">
            <span class="setting-label"
              >{{ $t("keigennRecord.settings.parseDoT")
              }}<span class="setting-hint">{{
                $t("keigennRecord.settings.newRecordsOnly")
              }}</span></span
            >
            <input v-model="userOptions.parseDoT" type="checkbox" />
          </label>
          <label class="setting-row">
            <span>{{ $t("keigennRecord.settings.orderTop") }}</span>
            <input
              type="checkbox"
              :checked="userOptions.order === 'unshift'"
              @change="
                userOptions.order = ($event.target as HTMLInputElement).checked ? 'unshift' : 'push'
              "
            />
          </label>
          <div class="setting-row">
            <span>{{ $t("keigennRecord.settings.iconType") }}</span>
            <div class="icon-type-group">
              <button
                v-for="val in [1, 2, 3, 4]"
                :key="val"
                type="button"
                class="toolbar-btn icon-type-btn"
                :class="{ 'is-active': userOptions.iconType === val }"
                @click="userOptions.iconType = val"
              >
                {{ val }}
              </button>
            </div>
          </div>
          <div class="setting-row">
            <span>{{ $t("keigennRecord.settings.minimizeStyle") }}</span>
            <div class="icon-type-group">
              <button
                type="button"
                class="toolbar-btn icon-type-btn"
                :class="{ 'is-active': userOptions.minimizeStyle === 'text' }"
                @click="userOptions.minimizeStyle = 'text'"
              >
                {{ $t("keigennRecord.settings.minimizeStyleText") }}
              </button>
              <button
                type="button"
                class="toolbar-btn icon-type-btn"
                :class="{ 'is-active': userOptions.minimizeStyle === 'icon' }"
                @click="userOptions.minimizeStyle = 'icon'"
              >
                {{ $t("keigennRecord.settings.minimizeStyleIcon") }}
              </button>
            </div>
          </div>
        </div>
        <div class="settings-footer">
          <button type="button" class="toolbar-btn" @click="resetOptions">
            {{ $t("keigennRecord.settings.resetDefaults") }}
          </button>
          <button
            v-if="store.isBrowser"
            type="button"
            class="toolbar-btn toolbar-btn-primary"
            @click="copyActUrl"
          >
            {{ $t("keigennRecord.settings.copyActUrl") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
:global(html[data-route="keigennRecord2"] body) {
  background: transparent;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

* {
  user-select: none;
}

// 仅在 ACT 窄选择框内压缩下拉箭头间距
.combat-select.act :deep(.el-select__suffix) {
  position: relative;
  width: 14px;
  right: 7px;
}

:deep(.col-target-select .el-select__placeholder) {
  overflow: hidden;
  text-overflow: clip;
  width: 2em;
}

img[src=""],
img:not([src]) {
  &::after {
    content: attr(data-job);
  }
}

header {
  width: 100%;
  display: flex;
}

main {
  position: absolute;
  top: 0px;
  bottom: 0px;
  width: 100%;
}

.wrapper {
  padding: 0;
  margin: 0;
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;

  &.is-browser {
    display: flex;
    flex-direction: column;
    background-color: #141518;
  }
}

.browser-toolbar {
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background-color: #1b1d22;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  background-color: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

.toolbar-toggles,
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.toolbar-actions {
  margin-left: auto;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 9px;
  font-size: 12px;
  line-height: 1;
  color: #c5ccd6;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 2px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;

  &:hover {
    color: #ffffff;
    background-color: rgba(255, 255, 255, 0.11);
    border-color: rgba(255, 255, 255, 0.3);
  }

  &.is-active {
    color: #ffffff;
    background-color: rgba(64, 158, 255, 0.24);
    border-color: rgba(64, 158, 255, 0.72);
  }

  &.toolbar-btn-primary {
    color: #ffffff;
    background-color: #2f6fd6;
    border-color: #4683e6;

    &:hover {
      background-color: #3b7be0;
      border-color: #6298ee;
    }
  }

  &.toolbar-btn-reset {
    color: #ffd3d3;
    background-color: rgba(255, 82, 82, 0.14);
    border-color: rgba(255, 82, 82, 0.4);

    &:hover {
      color: #ffffff;
      background-color: rgba(255, 82, 82, 0.28);
      border-color: rgba(255, 82, 82, 0.7);
    }
  }
}

.hidden-file-input {
  display: none;
}

.table-stage {
  position: relative;
  width: 100%;
  height: 100%;

  .is-browser & {
    flex: 1;
    min-height: 0;
    height: auto;
  }
}

.wrapper-scale {
  width: 100%;
  height: 100%;
  position: relative;

  &.is-scaled {
    width: calc(100% / var(--scale, 1));
    height: calc(100% / var(--scale, 1));
    transform: scale(var(--scale, 1));
    transform-origin: top left;
  }
}

.minimize {
  padding: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  margin-left: auto !important;
  margin-right: 0 !important;
  z-index: 13;

  i {
    margin: auto !important;
  }
}

.not-minimize {
  border: none !important;
  width: 22px !important;
  height: 22px !important;
  background-color: rgba(20, 20, 20, 0.45);
}

.in-minimize {
  height: 22px !important;
  padding: 0 7px !important;
  border-radius: 2px !important;
  font-size: 11px !important;
  color: #e6ebf2 !important;
  background-color: rgba(20, 20, 20, 0.92) !important;
  border: 1px solid rgba(255, 255, 255, 0.22) !important;
  gap: 3px;

  &.is-icon-only {
    width: 22px !important;
    padding: 0 !important;
    border: none !important;
    border-radius: 50% !important;
    background-color: rgba(20, 20, 20, 1) !important;
    gap: 0;
  }
}

/* ===== 表格穿透样式 ===== */
:deep(.keigenn-table) {
  background-color: rgba(20, 20, 20, var(--opacity));
  border-radius: 6px;
}

.is-browser :deep(.keigenn-table) {
  border-radius: 0;
  background-color: #141518;
}

:deep(.keigenn-row-cell) {
  padding: 0 2px;
}

:deep(.keigenn-table-row) {
  cursor: pointer;
}

:deep(.el-select__wrapper) {
  box-shadow: none !important;
}

:deep(.el-select__placeholder) {
  color: var(--el-color-primary) !important;
}

:deep(.el-select__placeholder.is-transparent) {
  color: unset !important;
}

.combat-select.browser :deep(.el-select__wrapper) {
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.combat-select.browser :deep(.el-select__placeholder) {
  color: #e6ebf2 !important;
}

/* ===== 战斗记录选择器 ===== */
.act-settings-btn {
  position: absolute;
  top: 1px;
  right: 52px;
  width: 22px;
  height: 21px;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 15;
  border-radius: 2px;
  color: #c5ccd6;
  background-color: rgba(20, 20, 20, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.16);
  cursor: pointer;
  transition: background-color 0.12s ease;

  &:hover {
    color: #ffffff;
    background-color: rgba(45, 48, 56, 0.85);
    border-color: rgba(255, 255, 255, 0.3);
  }
}

.combat-select.act {
  height: 21px;
  position: absolute;
  top: 1px;
  width: 24px;
  right: 26px;
  z-index: 15;
  border-radius: 3px;
  background-color: rgba(20, 20, 20, 0.55);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16);
  transition: background-color 0.12s ease;

  &:hover {
    background-color: rgba(45, 48, 56, 0.85);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3);
  }
}

.combat-select.browser {
  width: clamp(200px, 36vw, 440px);
  flex-shrink: 1;
}

@media (max-width: 520px) {
  .browser-toolbar {
    gap: 3px;
    padding: 0 5px;
  }

  .toolbar-divider {
    display: none;
  }

  .toolbar-toggles,
  .toolbar-actions {
    gap: 3px;
  }

  .combat-select.browser {
    width: 68px;
  }

  .toolbar-btn {
    height: 22px;
    padding: 0 4px;
    font-size: 11px;
  }
}

.browser-landing {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;

  .landing-inner {
    width: 100%;
    max-width: 440px;
    padding-left: 16px;
    border-left: 2px solid #3b7be0;
  }

  .landing-title {
    margin: 0;
    font-size: clamp(18px, 3vw, 24px);
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #eef2f7;
    line-height: 1.25;
  }

  .landing-desc {
    margin: 8px 0 0;
    font-size: 13px;
    color: #aab3c2;
    line-height: 1.5;
  }

  .landing-actions {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .landing-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 16px;
    font-size: 13px;
    font-weight: 500;
    color: #d6dbe3;
    background-color: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 2px;
    cursor: pointer;
    transition:
      background-color 0.12s ease,
      border-color 0.12s ease,
      color 0.12s ease;

    &:hover {
      color: #ffffff;
      background-color: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.34);
    }

    &.landing-btn-primary {
      color: #ffffff;
      background-color: #2f6fd6;
      border-color: #4683e6;

      &:hover {
        background-color: #3b7be0;
        border-color: #6298ee;
      }
    }
  }

  .landing-note {
    margin: 14px 0 0;
    font-size: 12px;
    color: #747d8c;
    line-height: 1.5;
  }
}

.browser-empty-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  max-width: 100%;
  box-sizing: border-box;

  .empty-tip {
    margin: 0;
    font-size: 12px;
    color: #9ba4b2;
    text-align: center;
    max-width: 360px;
    line-height: 1.5;
  }
}

.dev-act-test {
  position: fixed;
  right: 6px;
  bottom: 6px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.55;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }

  &:hover {
    opacity: 1;
  }
}

.drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  background: rgba(16, 18, 22, 0.84);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  pointer-events: none;

  .drag-overlay-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 28px;
    border-radius: 2px;
    border: 1px dashed var(--el-color-primary);
    background: rgba(64, 158, 255, 0.1);
    color: #e6ebf2;
    font-size: 13px;
  }
}

.settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3500;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.settings-panel {
  width: 100%;
  max-width: 340px;
  max-height: calc(100vh - 16px);
  display: flex;
  flex-direction: column;
  background: #1b1d22;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 2px;
  color: #e6ebf2;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .settings-title {
    font-size: 13px;
    font-weight: 600;
  }
}

.settings-body {
  padding: 8px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #c5ccd6;
  cursor: pointer;

  input[type="checkbox"] {
    accent-color: #3b7be0;
    cursor: pointer;
  }

  .setting-label {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
  }

  .setting-hint {
    font-size: 10.5px;
    color: #828b99;
  }
}

.setting-ctrl {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  input[type="range"] {
    width: 100px;
    accent-color: #3b7be0;
  }

  .setting-val {
    width: 32px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #e6ebf2;
  }
}

.icon-type-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.icon-type-btn {
  height: 22px;
  padding: 0 6px;
  font-size: 11px;
}

.settings-footer {
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

:deep(.el-select--small .el-select__wrapper) {
  padding: 0 8px;
  min-height: 22px;
}
</style>

<style lang="scss">
@use "@/styles/compact-select.scss";
</style>
