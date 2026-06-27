<script setup lang="ts">
import { ref, computed } from "vue";
import {
  ElCard,
  ElButton,
  ElUpload,
  ElTable,
  ElTableColumn,
  ElRow,
  ElCol,
  ElProgress,
  ElSelect,
  ElOption,
  ElMessage,
  ElSwitch,
  ElAlert,
} from "element-plus";
import { Upload as IconUpload } from "@element-plus/icons-vue";

interface Pull {
  id: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  records: BlacksmithRecord[];
  zoneId: number;
}

interface BlacksmithRecord {
  timeStr: string; // HH:MM:SS.SSS
  timeOffset: string; // 战局相对时间 MM:SS
  source: string; // 玩家名字
  sourceId: string; // 玩家十六进制 ID
  ability: string; // 技能名
  actionId: string; // 技能ID
  targetName: string; // 目标Boss名字
  lostPotency: number; // 亏损的威力
  basePotency: number; // 技能原始基础威力
  decayPct: number; // 目标衰减保留百分比（0 表示无衰减）
  splashType: string; // 溅射判定类型
  logType: string; // 日志行类型：21=单体伤害，22=群体伤害
  rawLog: string; // 原始 ACT 日志行
  job: string; // 打铁当时的职业
}

import ALL_SKILLS_DATA from "../resources/generated/blacksmithSkills.json";
import blacksmithBlacklist from "../resources/generated/blacksmithBlacklist.json";

const skillsDict = ALL_SKILLS_DATA as Record<
  string,
  { base: number; pct?: number; splashType?: string }
>;

// 从 03 日志行解析的职业 ID → 中文名映射（十六进制 jobId）
const jobIdToName: Record<string, string> = {
  "13": "骑士",
  "1": "剑术师", // 01 -> 1
  "15": "战士",
  "3": "斧术师", // 03 -> 3
  "20": "暗黑骑士",
  "25": "绝枪战士",
  "18": "白魔法师",
  "6": "幻术师", // 06 -> 6
  "1C": "学者",
  "21": "占星术士",
  "28": "贤者",
  "14": "武僧",
  "2": "格斗家", // 02 -> 2
  "16": "龙骑士",
  "4": "枪术师", // 04 -> 4
  "1E": "忍者",
  "1D": "双剑师", // 1D
  "22": "武士",
  "27": "钐镰客",
  "29": "蝰蛇剑士",
  "17": "吟游诗人",
  "5": "弓箭手", // 05 -> 5
  "1F": "机工士",
  "26": "舞者",
  "19": "黑魔法师",
  "7": "咒术师", // 07 -> 7
  "1B": "召唤师",
  "1A": "秘术师", // 1A
  "23": "赤魔法师",
  "2A": "绘灵法师",
};

// 从日志中解析的 sourceId(16进制) → 职业名 映射
const playerJobMap = ref<Record<string, string>>({});

const unrecordedSkills = ref<Set<string>>(new Set());

// 估计打铁亏损的威力数额，若不在字典中直接报错
// pct 字段表示对副目标的威力衰减百分比（即副目标亏损 pct% 的威力）
// 亏损 = base × pct/100，即打错主目标时亏损的威力
function calculateRecordLostPotency(abilityName: string): number {
  const cleanName = (abilityName || "").trim();
  const skill = skillsDict[cleanName];
  if (skill) {
    if (skill.pct !== undefined && skill.pct > 0) {
      // 衰减技能：亏损 = 基础威力 × 衰减%/100
      return Math.round(skill.base * (skill.pct / 100));
    } else {
      // 无衰减技能（单体）：打错主目标亏损全额基础威力
      return skill.base;
    }
  } else {
    // 记录未录入的技能，不中断代码，亏损威力记为 0
    unrecordedSkills.value.add(cleanName);
    return 0;
  }
}

// 状态定义
const pulls = ref<Pull[]>([]);
const selectedPullId = ref<number | null>(null);
const fileList = ref<any[]>([]);
const isProcessing = ref(false);

// 黑名单：排除无法选定目标的场地/自身中心 AOE（法令、地星等），避免误统计
const blackList = blacksmithBlacklist;

const kShiftFlagValues = ["3E", "113", "213", "313"];
const kShiftFlagValues2 = ["A10", "E"];

// 日志解析核心逻辑
function processLogData(logText: string) {
  isProcessing.value = true;
  pulls.value = [];
  selectedPullId.value = null;
  unrecordedSkills.value.clear();
  playerJobMap.value = {};

  try {
    const lines = logText.split(/\r?\n/);
    const parsedPulls: Pull[] = [];
    let currentPull: Pull | null = null;
    let currentZoneId = 0;

    // 第一遍：快速扫描是否包含 260 战斗事件
    let hasCombatEvents = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.startsWith("260|")) {
        hasCombatEvents = true;
        break;
      }
    }

    const parseTimestamp = (timeStr: string): number => {
      try {
        return new Date(timeStr).getTime();
      } catch {
        return 0;
      }
    };

    const formatOffset = (ms: number): string => {
      const totalSecs = Math.floor(ms / 1000);
      const m = Math.floor(totalSecs / 60)
        .toString()
        .padStart(2, "0");
      const s = (totalSecs % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // 03 行实时更新玩家职业映射，确保拿到打本当时的职业
      if (line.startsWith("03|")) {
        // 仅在绝妖星本内（TerritoryType ID = 1363）才收集职业，防止本外换职业污染映射
        if (currentZoneId === 1363) {
          const parts = line.split("|");
          if (parts.length >= 5) {
            const sourceId = parts[2] ?? "";
            let jobId = (parts[4] ?? "").toUpperCase();
            if (jobId.startsWith("0X")) {
              jobId = jobId.substring(2);
            }
            jobId = jobId.replace(/^0+/, "");
            if (sourceId && jobId) {
              const jobName = jobIdToName[jobId];
              if (jobName) {
                playerJobMap.value[sourceId.toUpperCase()] = jobName;
              }
            }
          }
        }
        continue;
      }

      // 01 地图切换事件
      if (line.startsWith("01|")) {
        const parts = line.split("|");
        const zoneHex = parts[2] ?? "";
        currentZoneId = parseInt(zoneHex, 16) || parseInt(zoneHex, 10) || 0;
        if (currentPull) {
          if (currentPull.durationMs > 5000 || currentPull.records.length > 0) {
            parsedPulls.push(currentPull);
          }
          currentPull = null;
        }
        continue;
      }

      const parts = line.split("|");
      if (parts.length < 2) continue;

      const type = parts[0];
      const timestampStr = parts[1] ?? "";
      if (!timestampStr) continue;
      const logTime = parseTimestamp(timestampStr);

      // 260 进入战斗
      if (type === "260" && parts[2] === "1") {
        if (currentPull) {
          if (currentPull.durationMs > 5000 || currentPull.records.length > 0) {
            parsedPulls.push(currentPull);
          }
        }
        currentPull = {
          id: parsedPulls.length + 1,
          startTime: timestampStr,
          endTime: timestampStr,
          durationMs: 0,
          records: [],
          zoneId: currentZoneId,
        };
        continue;
      }

      // 260 离开战斗
      if (type === "260" && parts[2] === "0") {
        if (currentPull) {
          currentPull.endTime = timestampStr;
          currentPull.durationMs = logTime - parseTimestamp(currentPull.startTime);
          if (currentPull.durationMs > 5000 || currentPull.records.length > 0) {
            parsedPulls.push(currentPull);
          }
          currentPull = null;
        }
        continue;
      }

      // 无 260 日志，则通过伤害行为自动切分
      if (!hasCombatEvents && currentPull === null && (type === "21" || type === "22")) {
        currentPull = {
          id: parsedPulls.length + 1,
          startTime: timestampStr,
          endTime: timestampStr,
          durationMs: 0,
          records: [],
          zoneId: currentZoneId,
        };
      }

      const activePull = currentPull;
      if (activePull) {
        if (logTime > 0) {
          activePull.endTime = timestampStr;
          activePull.durationMs = logTime - parseTimestamp(activePull.startTime);
        }

        // 免疫/打铁核心过滤
        if ((type === "21" || type === "22") && parts.length >= 10) {
          const sourceId = parts[2] ?? "";
          const sourceName = parts[3] ?? "";
          const actionId = parts[4] ?? "";
          const abilityName = parts[5] ?? "";
          const targetId = parts[6] ?? "";
          const targetName = parts[7] ?? "";

          // 目标是怪 且 来源是玩家 且 非自动攻击
          if (
            targetId.startsWith("4") &&
            sourceId.startsWith("1") &&
            actionId !== "07" &&
            actionId !== "08"
          ) {
            if (!(actionId.toUpperCase() in blackList)) {
              // 偏移位移检测
              let offset = 0;
              let flags = parts[8] ?? "";
              let damage = parts[9] ?? "";
              if (kShiftFlagValues.includes(flags)) {
                offset += 2;
                flags = parts[8 + offset] ?? flags;
                damage = parts[9 + offset] ?? damage;
              }
              if (kShiftFlagValues2.includes(flags)) {
                offset += 2;
                flags = parts[8 + offset] ?? flags;
                damage = parts[9 + offset] ?? damage;
              }

              const targetIndex = parts[45 + offset];

              // 过滤非主目标
              if (targetIndex === "0") {
                // 过滤非伤害性效果
                const damageVal = parseInt(damage || "0", 16);
                if (damageVal === 0) {
                  const flagVal = parseInt(flags || "0", 16);
                  // 判断最低字节是否为 7 (代表被防火墙免疫/无效伤害)
                  if ((flagVal & 0xff) === 7) {
                    const elapsedMs = logTime - parseTimestamp(activePull.startTime);
                    const skillData = skillsDict[abilityName.trim()];

                    // 群体伤害(22)仅统计带目标衰减数据的技能
                    if (type === "22" && (!skillData || skillData.pct == null)) {
                      continue;
                    }

                    const lost = calculateRecordLostPotency(abilityName);

                    // 收集关联日志行：当前免疫行 + 所有后续副目标命中行（仅怪物目标）
                    let rawLines = line;
                    let shouldSkipRecord = false;
                    // sequence 字段是同一次技能释放的唯一标识（LogGuide index 42，network log parts[44+offset]）
                    const mainSequence = parts[44 + offset];
                    for (let nextIdx = i + 1; nextIdx < lines.length; nextIdx++) {
                      const nextLine = lines[nextIdx];
                      if (!nextLine) break;
                      const np = nextLine.split("|");
                      // 先做类型粗筛，再计算 nOffset，再用 sequence 精确判断是否同一次技能
                      if (np[0] !== type) break;
                      let nOffset = 0;
                      let nFlags = np[8] ?? "";
                      if (kShiftFlagValues.includes(nFlags)) {
                        nOffset += 2;
                        nFlags = np[8 + nOffset] ?? nFlags;
                      }
                      if (kShiftFlagValues2.includes(nFlags)) {
                        nOffset += 2;
                        nFlags = np[8 + nOffset] ?? nFlags;
                      }
                      // 用 sequence 字段判断：同一次技能的所有行 sequence 相同
                      const nSeq = np[44 + nOffset];
                      if (mainSequence ? nSeq !== mainSequence : (np[4] !== actionId || np[2] !== sourceId || np[1] !== parts[1])) {
                        break;
                      }
                      const nTargetIdx = parseInt(np[45 + nOffset] ?? "0", 10);
                      const nTargetCount = parseInt(np[46 + nOffset] ?? "0", 10);
                      if (nTargetIdx !== 0) {
                        // selfArea（对自身周围）：命中纯按施法者距离，先无效必为打铁，不跳过。
                        // directional（向目标方向）及普通目标AOE：无法区分Case②③，保守跳过。
                        const nFlagVal = parseInt(nFlags, 16);
                        const splashType = skillData?.splashType;
                        if ((nFlagVal & 0xff) !== 7 && splashType !== "selfArea") {
                          shouldSkipRecord = true;
                          break;
                        }
                        // 仅收集怪物目标行，过滤玩家自身等非怪物目标
                        const nTargetId = np[6] ?? "";
                        if (nTargetId.startsWith("4")) {
                          rawLines += "\n" + nextLine;
                        }
                      }
                      // 已处理完最后一个目标，提前退出（targetCount - 1 == targetIndex）
                      if (nTargetCount > 0 && nTargetIdx === nTargetCount - 1) {
                        break;
                      }
                    }
                    if (shouldSkipRecord) {
                      continue;
                    }

                    activePull.records.push({
                      timeStr: timestampStr.substring(11, 23),
                      timeOffset: formatOffset(elapsedMs),
                      source: sourceName,
                      sourceId: sourceId,
                      ability: abilityName,
                      actionId: actionId.toUpperCase(),
                      targetName: targetName,
                      lostPotency: lost,
                      basePotency: skillData?.base ?? 0,
                      decayPct: skillData?.pct ?? 0,
                      logType: type,
                      splashType: skillData?.splashType ?? "",
                      rawLog: rawLines,
                      job: playerJobMap.value[sourceId.toUpperCase()] || "未知", // 记录打本当时的职业
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    if (currentPull) {
      if (currentPull.durationMs > 5000 || currentPull.records.length > 0) {
        parsedPulls.push(currentPull);
      }
    }

    // 对解析出的战局进行合并，处理因 ACT 误判而在极短时间内发生“脱战又立即进战”的切裂情况
    const mergedPulls: Pull[] = [];
    for (let i = 0; i < parsedPulls.length; i++) {
      const current = parsedPulls[i];
      if (!current) continue;

      if (mergedPulls.length > 0) {
        const last = mergedPulls[mergedPulls.length - 1]!;
        const lastEndTime = parseTimestamp(last.endTime);
        const currentStartTime = parseTimestamp(current.startTime);

        // 如果两场战斗的间隔小于等于 5 秒，视为同一次战斗误切分裂，进行合并
        if (currentStartTime - lastEndTime <= 5000) {
          last.endTime = current.endTime;
          last.durationMs = parseTimestamp(current.endTime) - parseTimestamp(last.startTime);
          last.records.push(...current.records);
          continue;
        }
      }
      mergedPulls.push(current);
    }

    // 重新分配连续自增的 Pull ID
    mergedPulls.forEach((p, idx) => {
      p.id = idx + 1;
    });

    pulls.value = mergedPulls;

    // 日志解析成功后，默认选中全局汇总 (ALL)
    if (visiblePulls.value.length > 0) {
      selectedPullId.value = -1;
    }
    if (selectedPullId.value) {
      const msg =
        displayPulls.value.filter((p) => p.records.length === 0).length > 0
          ? `解析成功，${displayPulls.value.length} 场 P3 中 ${displayPulls.value.filter((p) => p.records.length > 0).length} 场有打铁记录`
          : `解析成功，共找到 ${displayPulls.value.length} 个绝妖星 P3 战局！`;
      ElMessage.success(msg);
    } else if (displayPulls.value.length > 0) {
      ElMessage.warning(`找到 ${displayPulls.value.length} 场 P3 战局，但均无打铁记录。`);
    } else {
      ElMessage.warning("未在此日志中发现持续时间 > 7分30秒 且地图ID为 1363 的绝妖星战斗记录。");
    }

    if (unrecordedSkills.value.size > 0) {
      const skillList = Array.from(unrecordedSkills.value).join(", ");
      ElMessage.warning({
        message: `发现未录入威力的打铁技能：[${skillList}]，已将其亏损威力记为 0，不影响其余战局统计。`,
        duration: 8000,
        showClose: true,
      });
    }
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error.message || "日志解析时遇到异常，请检查文件格式是否正确。");
    resetData();
  } finally {
    isProcessing.value = false;
  }
}

// 模拟读取上传文件
function handleFileChange(file: any) {
  const reader = new FileReader();
  isProcessing.value = true;
  reader.onload = (e) => {
    const text = e.target?.result as string;
    processLogData(text);
  };
  reader.onerror = () => {
    ElMessage.error("读取文件失败");
    isProcessing.value = false;
  };
  reader.readAsText(file.raw);
}

// 重新上传清空状态
function resetData() {
  pulls.value = [];
  selectedPullId.value = null;
  fileList.value = [];
}

// 只显示绝妖星(ZoneID = 1363) 且 持续时间大于 7分30秒(450,000ms) 的战局
const displayPulls = computed(() => {
  return pulls.value.filter((p) => p.zoneId === 1363 && p.durationMs >= 450000);
});

const visiblePulls = computed(() => {
  return displayPulls.value;
});

// 当前选中的战斗回合
const selectedPull = computed(() => {
  if (selectedPullId.value === null) return null;
  if (selectedPullId.value === -1) {
    // 构造一个虚拟的“全局汇总” Pull
    const allRecords: BlacksmithRecord[] = [];
    displayPulls.value.forEach((p) => {
      p.records.forEach((r) => {
        allRecords.push({
          ...r,
          timeOffset: `P#${p.id} ${r.timeOffset}`, // 带上 P# 序号以便在时间线上做识别
        });
      });
    });
    return {
      id: -1,
      startTime: displayPulls.value[0]?.startTime || "",
      endTime: displayPulls.value[displayPulls.value.length - 1]?.endTime || "",
      durationMs: displayPulls.value.reduce((sum, p) => sum + p.durationMs, 0),
      records: allRecords,
      zoneId: 1363,
    };
  }
  return (
    visiblePulls.value.find((p) => p.id === selectedPullId.value) || visiblePulls.value[0] || null
  );
});

// 视角筛选玩家名字
const filterPlayerName = ref<string>("");

// 匿名模式：用职业名替代玩家名
const anonymousMode = ref(false);

function jobFromRecord(r: BlacksmithRecord): string {
  return playerJobMap.value[r.sourceId.toUpperCase()] || "未知";
}

// 统一处理玩家名字的匿名映射，并为队里的相同职业进行编号区分
const playerDisplayNameMap = computed(() => {
  const nameMap: Record<string, string> = {};
  if (!selectedPull.value) return nameMap;

  // 收集当前局内出现的所有玩家以及其职业
  const playerJobs: Record<string, string> = {};
  selectedPull.value.records.forEach((r) => {
    if (r.source) {
      playerJobs[r.source] = jobFromRecord(r);
    }
  });

  const sortedNames = Object.keys(playerJobs).sort();

  if (anonymousMode.value) {
    // 统计每个职业的人数
    const jobTotalPlayers: Record<string, number> = {};
    sortedNames.forEach((name) => {
      const job = playerJobs[name]!;
      jobTotalPlayers[job] = (jobTotalPlayers[job] || 0) + 1;
    });

    const jobCounts: Record<string, number> = {};
    sortedNames.forEach((name) => {
      const job = playerJobs[name]!;
      // 如果队伍里有同职业（该职业人数 > 1），则加上序号编号（例如 绘灵法师 1, 绘灵法师 2）
      if ((jobTotalPlayers[job] ?? 0) > 1) {
        jobCounts[job] = (jobCounts[job] || 0) + 1;
        nameMap[name] = `${job} ${jobCounts[job]}`;
      } else {
        nameMap[name] = job;
      }
    });
  } else {
    // 未开启匿名时，保持原玩家姓名
    sortedNames.forEach((name) => {
      nameMap[name] = name;
    });
  }

  return nameMap;
});

// 获取显示用的名称
function displayName(r: BlacksmithRecord): string {
  return playerDisplayNameMap.value[r.source] || r.source;
}

// 全局玩家名→展示名映射（跨所有展示战局），供视角筛选使用
const globalPlayerDisplayNameMap = computed(() => {
  const nameMap: Record<string, string> = {};
  const playerJobs: Record<string, string> = {};
  displayPulls.value.forEach((p) => {
    p.records.forEach((r) => {
      if (r.source) {
        playerJobs[r.source] = jobFromRecord(r);
      }
    });
  });

  const sortedNames = Object.keys(playerJobs).sort();

  if (anonymousMode.value) {
    const jobTotalPlayers: Record<string, number> = {};
    sortedNames.forEach((name) => {
      const job = playerJobs[name]!;
      jobTotalPlayers[job] = (jobTotalPlayers[job] || 0) + 1;
    });

    const jobCounts: Record<string, number> = {};
    sortedNames.forEach((name) => {
      const job = playerJobs[name]!;
      if ((jobTotalPlayers[job] ?? 0) > 1) {
        jobCounts[job] = (jobCounts[job] || 0) + 1;
        nameMap[name] = `${job} ${jobCounts[job]}`;
      } else {
        nameMap[name] = job;
      }
    });
  } else {
    sortedNames.forEach((name) => {
      nameMap[name] = name;
    });
  }

  return nameMap;
});

// 全局视角筛选：按展示名过滤记录列表
function filterRecordsByPlayer(records: BlacksmithRecord[]): BlacksmithRecord[] {
  if (!filterPlayerName.value) return records;
  return records.filter((r) => {
    const dName = globalPlayerDisplayNameMap.value[r.source] || r.source;
    return dName === filterPlayerName.value;
  });
}

// 全局视角可用玩家列表（去重、排序）
const globalPlayerOptions = computed(() => {
  const seen = new Set<string>();
  const result: string[] = [];
  displayPulls.value.forEach((p) => {
    p.records.forEach((r) => {
      const dName = globalPlayerDisplayNameMap.value[r.source] || r.source;
      if (!seen.has(dName)) {
        seen.add(dName);
        result.push(dName);
      }
    });
  });
  return result.sort();
});

// 过滤后的记录列表 (依据当前选中的 Pull)
const currentRecords = computed(() => {
  if (!selectedPull.value) return [];
  return filterRecordsByPlayer(selectedPull.value.records);
});

// 统计本局内个人打铁及威力亏损数据
const playerStats = computed(() => {
  if (!selectedPull.value) return [];

  const statsMap: Record<string, { total: number; lostPotency: number }> = {};

  filterRecordsByPlayer(selectedPull.value.records).forEach((r) => {
    const key = r.source; // 始终以玩家真实名字为 Key 进行聚合，确保多名同职业玩家不会被错误合并
    let stat = statsMap[key];
    if (!stat) {
      stat = { total: 0, lostPotency: 0 };
      statsMap[key] = stat;
    }
    stat.total++;
    stat.lostPotency += r.lostPotency || 0;
  });

  const pullCount = displayPulls.value.length || 1;

  return Object.entries(statsMap)
    .map(([name, counts]) => {
      const isGlobal = selectedPull.value?.id === -1;
      return {
        name: playerDisplayNameMap.value[name] || name, // 转换为可能带有编号的展示名
        total: counts.total,
        lostPotency: counts.lostPotency,
        // 全局模式下计算场均亏损，否则显示单局总亏损
        averageLost: isGlobal ? Math.round(counts.lostPotency / pullCount) : counts.lostPotency,
      };
    })
    .sort((a, b) => b.lostPotency - a.lostPotency);
});

// 获取全局有效战局的实际开始到结束的时间范围（例如 "06/21 15:07 - 17:13"）
const globalTimeRange = computed(() => {
  if (displayPulls.value.length === 0) return "";
  const first = displayPulls.value[0]!;
  const last = displayPulls.value[displayPulls.value.length - 1]!;

  const formatTimeHM = (isoStr: string) => {
    try {
      const t = new Date(isoStr);
      if (isNaN(t.getTime())) return "";
      const h = t.getHours().toString().padStart(2, "0");
      const m = t.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    } catch {
      return "";
    }
  };

  const formatDateMD = (isoStr: string) => {
    try {
      const t = new Date(isoStr);
      if (isNaN(t.getTime())) return "";
      const m = (t.getMonth() + 1).toString().padStart(2, "0");
      const d = t.getDate().toString().padStart(2, "0");
      return `${m}/${d}`;
    } catch {
      return "";
    }
  };

  const dateStr = formatDateMD(first.startTime);
  const startStr = formatTimeHM(first.startTime);
  const endStr = formatTimeHM(last.endTime);
  if (dateStr && startStr && endStr) {
    return `${dateStr} ${startStr} - ${endStr}`;
  }
  return "";
});

// 统计整个日志中被最频繁打铁打出的前 10 个技能
const globalSkillStats = computed(() => {
  if (displayPulls.value.length === 0) return [];
  const stats: Record<
    string,
    {
      total: number;
      lostPotency: number;
      playerCounts: Record<string, number>;
      job: string;
    }
  > = {};

  displayPulls.value.forEach((p) => {
    filterRecordsByPlayer(p.records).forEach((r) => {
      const key = r.ability;
      let stat = stats[key];
      if (!stat) {
        stat = { total: 0, lostPotency: 0, playerCounts: {}, job: jobFromRecord(r) };
        stats[key] = stat;
      }
      stat.total++;
      stat.lostPotency += r.lostPotency || 0;
      stat.playerCounts[r.source] = (stat.playerCounts[r.source] || 0) + 1;
    });
  });

  return Object.entries(stats)
    .map(([ability, data]) => {
      // 找出打铁该技能次数最多的玩家
      let topPlayerName = "";
      let maxCount = 0;
      Object.entries(data.playerCounts).forEach(([name, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topPlayerName = name;
        }
      });

      // 匿名下显示职业名，非匿名下显示真实玩家名
      const displayName = anonymousMode.value
        ? data.job
        : globalPlayerDisplayNameMap.value[topPlayerName] || topPlayerName;

      return {
        ability,
        displayName,
        total: data.total,
        lostPotency: data.lostPotency,
      };
    })
    .sort((a, b) => b.lostPotency - a.lostPotency);
});

const formattedDuration = computed(() => {
  return (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}分${s % 60}秒`;
  };
});

// 格式化 ISO 时间戳为 MM/DD HH:MM:SS
function formatStartTime(isoStr: string): string {
  try {
    const t = new Date(isoStr);
    if (isNaN(t.getTime())) return "--/-- --:--:--";
    const m = (t.getMonth() + 1).toString().padStart(2, "0");
    const d = t.getDate().toString().padStart(2, "0");
    const time = t.toLocaleTimeString("zh-CN", { hour12: false });
    return `${m}/${d} ${time}`;
  } catch {
    return "--/-- --:--:--";
  }
}

const selectedPullTotalLostPotency = computed(() => {
  if (!selectedPull.value) return 0;
  return filterRecordsByPlayer(selectedPull.value.records).reduce(
    (sum, r) => sum + r.lostPotency,
    0,
  );
});

const selectedPullTotalRecordsCount = computed(() => {
  if (!selectedPull.value) return 0;
  return filterRecordsByPlayer(selectedPull.value.records).length;
});
</script>

<template>
  <div class="blacksmith-container">
    <div class="header-container">
      <h1 class="main-title">绝妖星 P3 打铁警察（不保证准确）</h1>
      <label class="anon-toggle">
        <span class="anon-label">匿名</span>
        <ElSwitch v-model="anonymousMode" size="small" />
      </label>
    </div>

    <!-- 已知缺陷提示 -->
    <ElAlert type="warning" :closable="false" show-icon class="limitation-notice">
      <template #title>
        <span class="notice-title">已知局限性</span>
      </template>
      <p class="notice-text">
        对于<b>向目标方向</b>发动+对于副目标存在伤害衰减（如死者之岸、决断）等技能，
        我们无法判断玩家是【选了正确的BOSS但技能先判定了错误的BOSS】还是【选了错误的BOSS但技能先判定了正确的BOSS】，故这种情况不参与统计。
      </p>
    </ElAlert>

    <!-- 1. 日志上传面板 (当没有符合条件的绝妖星P3回合时显示) -->
    <ElCard v-if="displayPulls.length === 0" class="glass-card upload-panel">
      <div v-if="isProcessing" class="upload-overlay">
        <div class="spinner"></div>
        <p class="overlay-text">正在解析日志，请稍候...</p>
      </div>
      <ElUpload
        v-else
        drag
        action=""
        :auto-upload="false"
        :show-file-list="false"
        :file-list="fileList"
        :on-change="handleFileChange"
        accept=".log"
        class="custom-drag"
      >
        <div class="upload-inner">
          <IconUpload class="upload-icon" />
          <div class="el-upload__text">将 ACT 副本日志 (.log) 拖拽到此处，或<em>点击上传</em></div>
        </div>
      </ElUpload>
    </ElCard>

    <!-- 2. 左右分栏数据展示 (当存在绝妖星P3回合时显示) -->
    <ElRow v-else :gutter="16" class="content-layout">
      <!-- 左侧：战局列表 -->
      <ElCol :xs="24" :sm="6">
        <ElCard class="glass-card left-list-card">
          <template #header>
            <div class="card-header">
              <span class="header-title">战斗记录</span>
              <ElButton type="info" size="small" @click="resetData" plain>重新上传</ElButton>
            </div>
            <div class="global-filter-bar">
              <span class="filter-label">视角筛选:</span>
              <ElSelect
                v-model="filterPlayerName"
                placeholder="全队视角"
                size="small"
                style="width: 100%"
                clearable
              >
                <ElOption label="全队视角" value="" />
                <ElOption
                  v-for="name in globalPlayerOptions"
                  :key="name"
                  :label="name"
                  :value="name"
                />
              </ElSelect>
            </div>
          </template>
          <div class="pull-list">
            <!-- 全局汇总独立大入口 -->
            <div
              class="global-summary-btn"
              :class="{ active: selectedPullId === -1 }"
              @click="selectedPullId = -1"
            >
              <div class="btn-main-row">
                <span class="btn-title">汇总统计</span>
                <span class="btn-badge">共 {{ displayPulls.length }} 局</span>
              </div>
              <div class="btn-sub-row">
                <span
                  >总打铁:
                  <b>{{
                    displayPulls.reduce(
                      (sum, p) => sum + filterRecordsByPlayer(p.records).length,
                      0,
                    )
                  }}</b>
                  次</span
                >
                <span
                  >总亏损:
                  <b>{{
                    displayPulls.reduce(
                      (sum, p) =>
                        sum +
                        filterRecordsByPlayer(p.records).reduce((s, r) => s + r.lostPotency, 0),
                      0,
                    )
                  }}</b>
                  威力</span
                >
              </div>
            </div>

            <!-- 分割线 -->
            <div class="list-divider">
              <span class="divider-text">单局战局列表</span>
            </div>

            <div
              v-for="p in visiblePulls"
              :key="p.id"
              class="pull-item"
              :class="{
                active: selectedPullId === p.id,
                'no-records': filterRecordsByPlayer(p.records).length === 0,
              }"
              @click="selectedPullId = p.id"
            >
              <div class="pull-item-row">
                <span class="pull-index">#{{ p.id }}</span>
                <span class="pull-time">{{ formatStartTime(p.startTime) }}</span>
                <span class="pull-dur">{{ formattedDuration(p.durationMs) }}</span>
              </div>
              <div class="pull-item-row pull-item-stats">
                <span
                  >打铁
                  <b class="highlight-red">{{ filterRecordsByPlayer(p.records).length }}</b>
                  次</span
                >
                <span class="pull-loss"
                  >亏损
                  <b class="highlight-orange">{{
                    filterRecordsByPlayer(p.records).reduce((sum, r) => sum + r.lostPotency, 0)
                  }}</b></span
                >
              </div>
            </div>
          </div>
        </ElCard>
      </ElCol>

      <!-- 右侧：详情面板 -->
      <ElCol :xs="24" :sm="18">
        <div v-if="!selectedPull" class="right-empty">
          <span class="empty-hint">← 从左侧列表选择一个战局查看详情</span>
        </div>
        <div v-else class="right-details-layout">
          <!-- 局内数据概览 -->
          <ElRow :gutter="12" class="overview-grid">
            <ElCol :span="8">
              <ElCard class="glass-card mini-metric-card">
                <div class="metric-content">
                  <div class="label">
                    {{ selectedPull.id === -1 ? "总战斗时长" : "战局持续时间" }}
                  </div>
                  <div class="value">{{ formattedDuration(selectedPull.durationMs) }}</div>
                </div>
              </ElCard>
            </ElCol>
            <ElCol :span="8">
              <ElCard class="glass-card mini-metric-card">
                <div class="metric-content">
                  <div class="label">
                    {{ selectedPull.id === -1 ? "共计打铁总次数" : "本局打铁总次数" }}
                  </div>
                  <div class="value red-text">{{ selectedPullTotalRecordsCount }} 次</div>
                </div>
              </ElCard>
            </ElCol>
            <ElCol :span="8">
              <ElCard class="glass-card mini-metric-card">
                <div class="metric-content">
                  <div class="label">
                    {{ selectedPull.id === -1 ? "共计亏损总威力" : "本局亏损总威力" }}
                  </div>
                  <div class="value orange-text">
                    {{ selectedPullTotalLostPotency }}
                  </div>
                </div>
              </ElCard>
            </ElCol>
          </ElRow>

          <!-- 个人打铁威力亏损排行 -->
          <ElCard class="glass-card details-card">
            <template #header>
              <span class="header-title">{{
                selectedPull.id === -1
                  ? globalTimeRange
                    ? `${globalTimeRange} 个人威力亏损排行`
                    : "共计个人威力亏损排行"
                  : "本局个人威力亏损排行"
              }}</span>
            </template>
            <ElTable :data="playerStats" style="width: 100%" class="custom-table" dark>
              <template #empty>
                <span class="table-empty-text">{{
                  selectedPull.id === -1 ? "共计暂无打铁记录" : "本局暂无打铁记录"
                }}</span>
              </template>
              <ElTableColumn type="index" label="排名" width="60" align="center" />
              <ElTableColumn prop="name" label="角色" min-width="140" />
              <ElTableColumn prop="total" label="总打铁次数" width="150" align="center" />
              <ElTableColumn
                prop="lostPotency"
                :label="selectedPull.id === -1 ? '场均亏损威力' : '亏损总威力'"
                width="150"
                align="center"
              >
                <template #default="{ row }">
                  <span class="lost-potency-text">{{
                    selectedPull.id === -1 ? row.averageLost : row.lostPotency
                  }}</span>
                </template>
              </ElTableColumn>
              <ElTableColumn label="亏损威力占比" min-width="140">
                <template #default="{ row }">
                  <ElProgress
                    :percentage="
                      selectedPullTotalLostPotency > 0
                        ? Math.round((row.lostPotency / selectedPullTotalLostPotency) * 100)
                        : 0
                    "
                    color="#ff7875"
                    :show-text="true"
                    :stroke-width="8"
                  />
                </template>
              </ElTableColumn>
            </ElTable>
          </ElCard>

          <!-- 全局模式下展示：最常打铁技能排行 -->
          <ElCard v-if="selectedPullId === -1" class="glass-card details-card">
            <template #header>
              <span class="header-title">{{
                globalTimeRange ? `${globalTimeRange} 最多亏损威力排行` : "最多亏损威力排行"
              }}</span>
            </template>
            <ElTable :data="globalSkillStats" style="width: 100%" class="custom-table" dark>
              <template #empty>
                <span class="table-empty-text">共计暂无打铁记录</span>
              </template>
              <ElTableColumn type="index" label="排名" width="60" align="center" />
              <ElTableColumn prop="ability" label="技能名称" min-width="140" />
              <ElTableColumn
                prop="displayName"
                :label="anonymousMode ? '对应职业' : '对应玩家'"
                width="150"
                align="center"
              />
              <ElTableColumn prop="total" label="总打铁次数" width="150" align="center" />
              <ElTableColumn prop="lostPotency" label="累计亏损威力" width="150" align="center">
                <template #default="{ row }">
                  <span class="lost-potency-text">{{ row.lostPotency }}</span>
                </template>
              </ElTableColumn>
            </ElTable>
          </ElCard>

          <!-- 直观的时间线打铁明细（全局/单局均可用视角筛选） -->
          <ElCard class="glass-card details-card">
            <template #header>
              <div class="timeline-card-header">
                <span class="header-title">{{
                  selectedPull.id === -1 ? "共计打铁时间线明细" : "打铁时间线明细"
                }}</span>
                <span v-if="filterPlayerName" class="active-filter-badge"
                  >当前视角：{{ filterPlayerName }}</span
                >
              </div>
            </template>
            <ElTable :data="currentRecords" style="width: 100%" class="custom-table" dark>
              <ElTableColumn type="expand" width="36">
                <template #default="{ row }">
                  <pre class="raw-log">{{ row.rawLog }}</pre>
                </template>
              </ElTableColumn>
              <template #empty>
                <span class="table-empty-text">{{
                  filterPlayerName ? "该玩家当前视角下无打铁记录" : "当前暂无打铁记录"
                }}</span>
              </template>
              <ElTableColumn label="相对时间" width="120" align="center">
                <template #default="{ row }">
                  <span class="timeline-time">{{ row.timeOffset }}</span>
                </template>
              </ElTableColumn>
              <ElTableColumn label="玩家" min-width="140">
                <template #default="{ row }">
                  {{ displayName(row as BlacksmithRecord) }}
                </template>
              </ElTableColumn>
              <ElTableColumn prop="ability" label="发动技能" min-width="130" />
              <ElTableColumn label="类型" width="65" align="center">
                <template #default="{ row }">
                  <span
                    class="type-tag"
                    :class="row.logType === '22' ? 'type-tag--aoe' : 'type-tag--single'"
                    >{{ row.logType === "22" ? "群体" : "单体" }}</span
                  >
                </template>
              </ElTableColumn>
              <ElTableColumn label="基础威力" width="85" align="center">
                <template #default="{ row }">
                  <span class="cell-mono">{{ row.basePotency > 0 ? row.basePotency : "-" }}</span>
                </template>
              </ElTableColumn>
              <ElTableColumn label="衰减" width="70" align="center">
                <template #default="{ row }">
                  <span class="cell-mono">{{ row.decayPct > 0 ? row.decayPct + "%" : "-" }}</span>
                </template>
              </ElTableColumn>
              <ElTableColumn label="判定" width="80" align="center">
                <template #default="{ row }">
                  <span
                    class="type-tag"
                    :class="{
                      'type-tag--self': row.splashType === 'selfArea',
                      'type-tag--dir': row.splashType === 'directional',
                      'type-tag--target': row.splashType === 'target',
                    }"
                  >
                    {{
                      row.splashType === "selfArea"
                        ? "自身"
                        : row.splashType === "directional"
                          ? "方向"
                          : row.splashType === "target"
                            ? "目标"
                            : ""
                    }}
                  </span>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="lostPotency" label="亏损威力" width="90" align="center">
                <template #default="{ row }">
                  <span class="lost-potency-text-small">-{{ row.lostPotency }}</span>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="targetName" label="主目标" min-width="140" />
              <ElTableColumn prop="timeStr" label="绝对时间" width="150" align="center" />
            </ElTable>
          </ElCard>
        </div>
      </ElCol>
    </ElRow>
  </div>
</template>

<style lang="scss" scoped>
.blacksmith-container {
  box-sizing: border-box;
  padding: 16px;
  min-height: 100vh;
  background-color: #121214;
  color: #e0e0e0;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  // 强制 Element Plus 暗色变量，防止组件内部出现白色背景
  --el-bg-color: #121214;
  --el-bg-color-overlay: #1a1a22;
  --el-fill-color-blank: #1a1a22;
  --el-fill-color: #1a1a22;
  --el-border-color: rgba(255, 255, 255, 0.06);
  --el-text-color-primary: #d4d4dc;
  --el-text-color-regular: #b0b0ba;
  --el-text-color-secondary: #8888a0;
  --el-text-color-placeholder: #5c5c72;
  --el-color-info: #6c6c7a;
}

// 磨砂玻璃质感通用卡片
.glass-card {
  --el-card-bg-color: transparent;
  background: rgba(28, 28, 34, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  margin-bottom: 16px;
  color: #d4d4dc;

  &:last-child {
    margin-bottom: 0;
  }

  :deep(.el-card__body) {
    background: transparent;
    color: #d4d4dc;
  }
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  .main-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
    background: linear-gradient(135deg, #ffffff 0%, #a5a5a5 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}

// 已知局限性提示
.limitation-notice {
  margin-bottom: 16px;
  background: rgba(230, 162, 60, 0.08);
  border: 1px solid rgba(230, 162, 60, 0.25);
  border-radius: 8px;

  :deep(.el-alert__icon) {
    color: #e6a23c;
  }
  .notice-title {
    font-size: 14px;
    font-weight: 600;
    color: #e6a23c;
  }
  .notice-text {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.6;
    color: #c0a060;
    b {
      color: #e0c080;
    }
  }
}

.anon-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  .anon-label {
    font-size: 12px;
    color: #8888a0;
    user-select: none;
  }
}

// 拖拽上传区
.upload-panel {
  padding: 0;
  overflow: hidden;

  :deep(.el-card__body) {
    background: transparent;
  }

  .custom-drag {
    width: 100%;
    :deep(.el-upload-dragger) {
      background: rgba(20, 20, 25, 0.4);
      border: 1.5px dashed rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 60px 20px;
      transition: all 0.25s ease;

      &:hover {
        border-color: #3b8cff;
        background: rgba(59, 140, 255, 0.02);
      }

      &.is-dragover {
        border-color: #3b8cff;
        background: rgba(59, 140, 255, 0.06);
        box-shadow: inset 0 0 40px rgba(59, 140, 255, 0.06);

        .upload-icon {
          color: #3b8cff;
          transform: scale(1.1);
        }

        .el-upload__text {
          color: #aaa;
          em {
            color: #3b8cff;
          }
        }
      }
    }
  }
  .upload-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    .upload-icon {
      width: 48px;
      height: 48px;
      color: #8888a0;
      margin-bottom: 16px;
      transition:
        color 0.25s,
        transform 0.25s;
    }
    .el-upload__text {
      color: #8888a0;
      font-size: 14px;
      em {
        color: #3b8cff;
        font-style: normal;
        font-weight: 500;
      }
    }
  }
}

// 上传处理中遮罩（覆盖上传区域）
.upload-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;

  .spinner {
    width: 28px;
    height: 28px;
    border: 2px solid rgba(59, 140, 255, 0.2);
    border-top-color: #3b8cff;
    border-radius: 50%;
    animation: rotate 0.8s linear infinite;
  }

  .overlay-text {
    font-size: 14px;
    color: #3b8cff;
    margin: 0;
  }
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

// 左右分布的战局列表
.left-list-card {
  position: sticky;
  top: 16px;

  :deep(.el-card__header) {
    background-color: rgba(0, 0, 0, 0.2) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    padding: 12px 16px;
  }
  :deep(.el-card__body) {
    background: transparent;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-title {
    font-size: 13px;
    font-weight: 600;
    color: #d4d4dc;
  }

  .global-filter-bar {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);

    .filter-label {
      font-size: 11px;
      color: #6c6c7a;
      font-weight: 500;
    }
  }
}

.pull-list {
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
  }
}

.pull-item {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(59, 140, 255, 0.04);
    border-color: rgba(59, 140, 255, 0.2);
  }

  &.active {
    background: rgba(59, 140, 255, 0.1) !important;
    border-color: #3b8cff !important;
    .pull-index {
      background: #3b8cff;
      color: #fff;
    }
    .pull-time {
      color: #aaa;
    }
  }

  // 零打铁记录：布局不变，仅低饱和配色
  &.no-records {
    .pull-index {
      background: rgba(255, 255, 255, 0.04);
      color: #5a5a6a;
    }
    .pull-time,
    .pull-dur {
      color: #5a5a6a;
    }
    .pull-item-stats {
      color: #4a4a58;
      .highlight-red,
      .highlight-orange {
        color: #5a5a6a;
      }
    }

    &.active {
      .pull-index {
        background: rgba(255, 255, 255, 0.08);
        color: #808090;
      }
      .pull-time,
      .pull-dur {
        color: #808090;
      }
      .pull-item-stats {
        color: #6c6c7c;
        .highlight-red,
        .highlight-orange {
          color: #808090;
        }
      }
    }
  }
}

.pull-item-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pull-item-stats {
  margin-top: 4px;
  font-size: 12px;
  color: #8888a0;
}

.pull-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 11px;
  font-weight: 700;
  color: #aaa;
  transition:
    background 0.15s,
    color 0.15s;
}

.pull-time {
  font-size: 11px;
  color: #6c6c7a;
  font-family: monospace;
  flex: 1;
}

.pull-dur {
  font-size: 11px;
  color: #8888a0;
  flex-shrink: 0;
}

.pull-loss {
  margin-left: auto;
}

.highlight-red {
  color: #ff4d4f;
  font-weight: 600;
}

.highlight-orange {
  color: #ffa39e;
  font-weight: 600;
}

// 右侧详情
.overview-grid {
  margin-bottom: 16px;

  // 三张指标卡片左侧彩色边框
  :deep(.el-col:nth-child(1)) .glass-card {
    border-left: 2px solid rgba(59, 140, 255, 0.5);
  }
  :deep(.el-col:nth-child(2)) .glass-card {
    border-left: 2px solid rgba(255, 77, 79, 0.5);
  }
  :deep(.el-col:nth-child(3)) .glass-card {
    border-left: 2px solid rgba(255, 120, 117, 0.5);
  }
}

// 右侧空态
.right-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  .empty-hint {
    font-size: 14px;
    color: #6c6c7a;
    letter-spacing: 0.5px;
  }
}

.mini-metric-card {
  margin-bottom: 0 !important;
  transition: border-color 0.25s;

  .metric-content {
    padding: 8px;
    .label {
      font-size: 12px;
      color: #8888a0;
      margin-bottom: 4px;
    }
    .value {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;

      &.red-text {
        color: #ff4d4f;
      }

      &.orange-text {
        color: #ff7875;
      }
    }
  }
}

.details-card {
  :deep(.el-card__header) {
    background-color: rgba(0, 0, 0, 0.2) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    padding: 10px 16px;
  }
  :deep(.el-card__body) {
    background: transparent;
  }
}

// 自定义暗色表格
.custom-table {
  background: transparent !important;
  --el-table-bg-color: transparent !important;
  --el-table-tr-bg-color: transparent !important;
  --el-table-header-bg-color: rgba(0, 0, 0, 0.25) !important;
  --el-table-header-text-color: #8888a0 !important;
  --el-table-border-color: rgba(255, 255, 255, 0.05) !important;
  --el-table-text-color: #e0e0e0 !important;
  --el-table-row-hover-bg-color: rgba(255, 255, 255, 0.02) !important;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);

  :deep(.el-table__inner-wrapper),
  :deep(.el-scrollbar__wrap),
  :deep(.el-scrollbar__view) {
    background: transparent;
  }

  :deep(th) {
    font-size: 12px;
    font-weight: 600;
    padding: 6px 0;
  }
  :deep(td) {
    font-size: 13px;
    padding: 6px 0;
  }

  // 进度条百分比文字
  :deep(.el-progress__text) {
    font-size: 12px !important;
    font-weight: 600 !important;
    color: #ff7875 !important;
  }

  :deep(.el-progress-bar__outer) {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 3px;
  }
}

.table-empty-text {
  color: #6c6c7a;
  font-size: 13px;
}

.lost-potency-text {
  color: #ff7875;
  font-weight: bold;
}

.lost-potency-text-small {
  color: #ffa39e;
}

.cell-mono {
  font-size: 12px;
  color: #8888a0;
  font-family: monospace;
}

.type-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.6;

  &--single {
    background: rgba(255, 169, 77, 0.12);
    color: #ffa94d;
  }

  &--aoe {
    background: rgba(59, 140, 255, 0.12);
    color: #5b9cf5;
  }

  &--self {
    background: rgba(140, 158, 224, 0.14);
    color: #a0b0f0;
  }

  &--dir {
    background: rgba(112, 182, 182, 0.14);
    color: #7cc8c8;
  }

  &--target {
    background: rgba(130, 180, 140, 0.14);
    color: #8cc498;
  }
}

.timeline-time {
  background: rgba(59, 140, 255, 0.1);
  border: 1px solid rgba(59, 140, 255, 0.25);
  color: #3b8cff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-weight: 600;
}

.timeline-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.active-filter-badge {
  font-size: 11px;
  color: #7cc8c8;
  background: rgba(112, 182, 182, 0.12);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.filter-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  .filter-label {
    font-size: 12px;
    color: #8888a0;
    font-weight: 500;
  }
}

// 展开行中的原始 ACT 日志（不换行，横向滚动）
.raw-log {
  margin: 0;
  padding: 6px 12px;
  font-size: 11px;
  font-family: "JetBrains Mono", "SF Mono", "Cascadia Code", monospace;
  color: #7c7c8a;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  white-space: pre;
  overflow-x: auto;
  line-height: 1.5;
}

.global-summary-btn {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }

  &.active {
    background: rgba(59, 140, 255, 0.06);
    border-color: rgba(59, 140, 255, 0.35);
    box-shadow: inset 0 0 10px rgba(59, 140, 255, 0.1);

    .btn-title {
      color: #3b8cff;
    }
  }

  .btn-main-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .btn-title {
    font-size: 13px;
    font-weight: 600;
    color: #e3e3e9;
    transition: color 0.2s ease;
  }

  .btn-badge {
    background: rgba(255, 255, 255, 0.06);
    color: #8888a0;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 600;
  }

  .btn-sub-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #8888a0;

    b {
      font-family: Consolas, monospace;
    }
  }
}

.list-divider {
  display: flex;
  align-items: center;
  margin: 12px 0 12px 0;

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
  }

  .divider-text {
    padding: 0 8px;
    font-size: 10px;
    color: #555562;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
}
</style>
