import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { csvPaths } from "./paths.js";
import type { BeastCoord } from "../src/resources/beastbook";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!fs.existsSync(csvPaths.cn)) {
  console.log("ℹ️ 数据挖掘目录不存在，跳过 beastbook 数据生成脚本。");
  process.exit(0);
}

const chsPath = csvPaths.cn;

function parseCsv(filename: string): Map<string, string[]> {
  const content = fs.readFileSync(path.join(chsPath, filename), "utf8");
  const result = new Map<string, string[]>();
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuote = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === "," && !inQuote) {
      row.push(cur);
      cur = "";
    } else if ((char === "\r" || char === "\n") && !inQuote) {
      if (char === "\r" && content[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
    } else {
      cur += char;
    }
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (r && r.length > 0 && r[0]) {
      result.set(r[0], r.slice(1));
    }
  }
  return result;
}

function getCol(row: string[] | undefined, index: number, fallback = ""): string {
  if (!row) return fallback;
  const val = row[index];
  return val !== undefined ? val : fallback;
}

function getColInt(row: string[] | undefined, index: number, fallback = 0): number {
  const val = getCol(row, index);
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? fallback : n;
}

const xbmPetMap = parseCsv("XBMPet.csv");
const petMap = parseCsv("Pet.csv");
const actionMap = parseCsv("Action.csv");
const placeNameMap = parseCsv("PlaceName.csv");
const mapMap = parseCsv("Map.csv");
const cfcMap = parseCsv("ContentFinderCondition.csv");
const actionTransientMap = parseCsv("ActionTransient.csv");
const territoryTypeMap = parseCsv("TerritoryType.csv");
const guildOrderMap = parseCsv("GuildOrder.csv");
const bnpcNameMap = parseCsv("BNpcName.csv");
const addonMap = parseCsv("Addon.csv");
const xbmElementMap = parseCsv("XBMElement.csv");
const attackTypeMap = parseCsv("AttackType.csv");

interface BeastCommunityHabitat {
  mapId?: number;
  summary?: string;
  coords?: BeastCoord[];
  level?: string;
  type?: "overworld" | "dungeon" | "special";
  mobName?: string;
}

interface BeastCommunityCoordEntry {
  coords?: BeastCoord[];
  level?: string;
  habitats?: BeastCommunityHabitat[];
}

interface SubstituteRuleFate {
  eventName: string;
  mobName: string;
  mapId: number;
  coords: BeastCoord[];
  level?: string;
  summary?: string;
}

interface SubstituteRuleLeve {
  eventName: string;
  mobName: string;
  mapId: number;
  coords: BeastCoord[];
  level?: string;
  summary?: string;
}

interface SubstituteRuleDungeon {
  summary: string;
  mobName: string;
  level?: string;
}

interface SubstituteRule {
  guildhests?: string[];
  fates?: SubstituteRuleFate[];
  leves?: SubstituteRuleLeve[];
  dungeons?: SubstituteRuleDungeon[];
  bnpcIds?: string[];
}

const communityCoords: Record<number, BeastCommunityCoordEntry> = {
  2: {
    coords: [{ x: 23.1, y: 17 }],
    level: "1~2",
  },
  3: {
    coords: [{ x: 23.8, y: 25.6 }],
    level: "3~4",
  },
  4: {
    coords: [
      { x: 22, y: 22 },
      { x: 20, y: 18 },
    ],
    level: "4~6",
  },
  5: {
    coords: [{ x: 28.5, y: 24.3 }],
    level: "5~9",
  },
  6: {
    coords: [{ x: 30.9, y: 18.2 }],
    level: "4~9",
  },
  7: {
    coords: [{ x: 20.3, y: 28.6 }],
    level: "6~8",
  },
  8: {
    coords: [{ x: 19, y: 19 }],
    level: "10",
  },
  9: {
    coords: [{ x: 15.3, y: 14.3 }],
    level: "10~13",
  },
  10: {
    level: "1~4 / 10~13",
    habitats: [
      {
        mapId: 21,
        coords: [{ x: 22, y: 30 }],
        level: "1~4",
      },
      {
        mapId: 15,
        coords: [{ x: 16, y: 12.5 }],
        level: "10~13",
      },
    ],
  },
  11: {
    coords: [{ x: 21, y: 26 }],
    level: "6",
  },
  12: {
    coords: [{ x: 21.4, y: 16.3 }],
    level: "5~7",
  },
  13: {
    coords: [
      { x: 18.5, y: 28.3 },
      { x: 19.6, y: 27.6 },
    ],
    level: "14",
  },
  14: {
    coords: [{ x: 20.5, y: 18.5 }],
    level: "4~8",
  },
  15: {
    coords: [{ x: 16.5, y: 16.5 }],
    level: "13",
  },
  16: {
    coords: [
      { x: 21, y: 23 },
      { x: 22.8, y: 20.8 },
    ],
    level: "16",
  },
  17: {
    level: "17 / 38",
    habitats: [
      {
        summary: "封锁坑道铜铃铜山",
        type: "dungeon",
        level: "17",
      },
      {
        summary: "流沙迷宫樵鸣洞",
        type: "dungeon",
        mobName: "滑沙",
        level: "38",
      },
    ],
  },
  19: {
    coords: [{ x: 26.5, y: 15.9 }],
    level: "7",
  },
  20: {
    coords: [{ x: 23, y: 26 }],
    level: "10",
  },
  21: {
    coords: [{ x: 24.1, y: 23.6 }],
    level: "16",
  },
  22: {
    coords: [{ x: 27, y: 25 }],
    level: "3~4",
  },
  23: {
    coords: [{ x: 24, y: 12.3 }],
    level: "29",
  },
  24: {
    coords: [{ x: 28.8, y: 36.7 }],
    level: "30",
  },
  25: {
    coords: [{ x: 22, y: 30 }],
    level: "12",
  },
  26: {
    coords: [{ x: 18.5, y: 17.5 }],
    level: "8",
  },
  27: {
    coords: [{ x: 16.8, y: 14.5 }],
    level: "14",
  },
  28: {
    coords: [{ x: 15.2, y: 37.5 }],
    level: "31",
  },
  29: {
    coords: [{ x: 17.4, y: 23.7 }],
    level: "7",
  },
  30: {
    coords: [{ x: 25.2, y: 24.5 }],
    level: "12",
  },
  31: {
    level: "4 / 9 / 33",
    habitats: [
      {
        mapId: 16,
        coords: [{ x: 24.6, y: 23 }],
        level: "4",
      },
      {
        mapId: 20,
        coords: [{ x: 23, y: 23 }],
        level: "9",
      },
      {
        mapId: 17,
        coords: [{ x: 17, y: 26 }],
        level: "33",
      },
    ],
  },
  32: {
    coords: [{ x: 30.6, y: 24 }],
    level: "33",
  },
  33: {
    coords: [{ x: 15.3, y: 14.7 }],
    level: "34",
  },
  34: {
    coords: [{ x: 31.2, y: 20.3 }],
    level: "9",
  },
  35: {
    coords: [{ x: 25, y: 39 }],
    level: "32",
  },
  36: {
    coords: [{ x: 27, y: 15 }],
    level: "12~17",
  },
  39: {
    coords: [{ x: 13.5, y: 22.3 }],
    level: "31",
  },
  40: {
    coords: [{ x: 20.2, y: 18.4 }],
    level: "7",
  },
  41: {
    coords: [
      { x: 26.5, y: 18.9 },
      { x: 26.1, y: 21.2 },
    ],
    level: "6",
  },
  42: {
    coords: [{ x: 26.3, y: 12.9 }],
    level: "45",
  },
  47: {
    level: "50",
    habitats: [
      {
        summary: "凛冽洞天披雪大冰壁",
        type: "dungeon",
        level: "50",
      },
      {
        summary: "希瓦歼灭战",
        type: "dungeon",
        level: "50",
      },
    ],
  },
};

const substituteRules: Record<number, SubstituteRule> = {
  10: {
    fates: [
      {
        eventName: "大胡蜂和黄衫队",
        mobName: "胡蜂王",
        mapId: 15,
        coords: [{ x: 14.0, y: 15.0 }],
        level: "13",
      },
    ],
    bnpcIds: ["893", "953", "1983", "641"],
  },
  18: {
    guildhests: ["2"],
    fates: [
      {
        eventName: "无头骑士——波克曼",
        mobName: "波克曼",
        mapId: 5,
        coords: [{ x: 27.3, y: 22.1 }],
        level: "20",
      },
    ],
  },
  25: {
    guildhests: ["4"],
  },
  31: {
    guildhests: ["3"],
  },
  38: {
    fates: [
      {
        eventName: "狂暴巨兽——强化奇美拉",
        mobName: "强化奇美拉",
        mapId: 53,
        coords: [{ x: 31.4, y: 7.3 }],
        level: "49",
      },
    ],
  },
  39: {
    guildhests: ["9"],
  },
  40: {
    guildhests: ["10"],
  },
  47: {
    fates: [
      {
        eventName: "指挥官",
        mobName: "寒冰指挥官",
        mapId: 211,
        coords: [{ x: 16.5, y: 13.6 }],
        level: "48",
      },
    ],
  },
  50: {
    fates: [
      {
        eventName: "传说的魔兽——贝希摩斯",
        mobName: "贝希摩斯王",
        mapId: 25,
        coords: [{ x: 33.1, y: 16.2 }],
        level: "50",
      },
    ],
  },
};

interface BeastHabitat {
  Summary: string;
  Type: string;
  MapId?: number;
  Coords?: BeastCoord[];
  Level?: string;
  Tag?: string;
  EventName?: string;
  MobName?: string;
  IsSubstitute?: boolean;
  CoordsNote?: string;
}

interface BeastEntry {
  Number: number;
  Name: string;
  Taxonomy: string;
  AutoAttackType: string;
  BorrowName: string;
  BorrowIcon: number;
  BorrowDescription: string;
  ReleaseName: string;
  ReleaseDescription: string;
  ReleaseRange: string;
  ReleaseIcon: number;
  OrderName: string;
  OrderDescription: string;
  OrderRange: string;
  OrderIcon: number;
  Habitat: string;
  Icon: number;
  Habitats?: BeastHabitat[];
  Substitutes?: string[];
  SubstituteHabitats?: BeastHabitat[];
}

function cleanHex(str: string): string {
  if (!str) return "";
  return str
    .replace(/<hex:024804F201F803><hex:024904F201F903>/g, '<span style="color:#00cc22;">')
    .replace(/<hex:024804F201F403><hex:024904F201F503>/g, '<span style="color:#ff7b1a;">')
    .replace(/<hex:024804F201FA03><hex:024904F201FB03>/g, '<span style="color:#888888;">')
    .replace(/<hex:0249020103><hex:0248020103>/g, "</span>")
    .replace(/<hex:02100103>/g, "\n")
    .replace(/<hex:[0-9A-Fa-f]+>/g, "")
    .replace(/^"|"$/g, "")
    .trim();
}

function getPlaceName(pId?: string): string {
  if (!pId) return "";
  const r = placeNameMap.get(pId);
  return r && r[0] ? r[0].replace(/^"|"$/g, "") : "";
}

function getPlaceNameByMapId(mId?: number | string): string {
  if (!mId) return "";
  const mMap = mapMap.get(mId.toString());
  if (!mMap) return "";
  const placeId = mMap[11];
  return getPlaceName(placeId);
}

function getTaxonomyName(code: number): string {
  if (!code) return "";
  const r = addonMap.get((17740 + code).toString());
  return r && r[0] ? cleanHex(r[0]) : "";
}

function getBorrowSkill(taxonomyCode: number): {
  name: string;
  icon: number;
  actionId: number;
  description: string;
} {
  const actionId = 44895 + (taxonomyCode || 0);
  const aRow = actionMap.get(actionId.toString());
  const atRow = actionTransientMap.get(actionId.toString());
  return {
    name: aRow ? getCol(aRow, 0).replace(/^"|"$/g, "") : "",
    icon: aRow ? getColInt(aRow, 2) : 0,
    actionId,
    description: atRow ? cleanHex(getCol(atRow, 0)) : "",
  };
}

const RANGE_SINGLE = cleanHex(getCol(addonMap.get("17751"), 0)) || "单体攻击";
const RANGE_AOE = cleanHex(getCol(addonMap.get("17752"), 0)) || "范围攻击";

const CAST_TYPE_RANGE_MAP = new Map<number, string>([
  [1, RANGE_SINGLE],
  [2, RANGE_AOE],
  [3, RANGE_AOE],
  [4, RANGE_AOE],
  [12, RANGE_AOE],
  [13, RANGE_AOE],
]);

function getActionRange(actionRow?: string[]): string {
  if (!actionRow) return "";
  const castType = getColInt(actionRow, 28);
  if (CAST_TYPE_RANGE_MAP.has(castType)) {
    return CAST_TYPE_RANGE_MAP.get(castType) || RANGE_SINGLE;
  }
  const effectRange = getColInt(actionRow, 29);
  if (effectRange > 0) return RANGE_AOE;
  return RANGE_SINGLE;
}

const PHYSICAL_ATTACK_TO_XBM = new Map<number, string>([
  [1, "9"],
  [2, "8"],
  [3, "7"],
]);

function getAutoAttackType(attackType: number, aspect: number): string {
  if (aspect > 0 && aspect <= 6) {
    const elemRow = xbmElementMap.get(aspect.toString());
    if (elemRow && elemRow[0]) return cleanHex(elemRow[0]);
  }
  if (PHYSICAL_ATTACK_TO_XBM.has(attackType)) {
    const xbmId = PHYSICAL_ATTACK_TO_XBM.get(attackType);
    if (xbmId) {
      const elemRow = xbmElementMap.get(xbmId);
      if (elemRow && elemRow[0]) return cleanHex(elemRow[0]);
    }
  }
  const atkRow = attackTypeMap.get(attackType.toString());
  if (atkRow && atkRow[0]) return cleanHex(atkRow[0]);
  return "";
}

const HABITAT_TYPE_MAP = new Map<string, string>([
  ["0", "special"],
  ["1", "overworld"],
  ["2", "dungeon"],
]);

function getHabitatType(locationKey?: string): string {
  return HABITAT_TYPE_MAP.get(locationKey ? locationKey.toString() : "") || "overworld";
}

const bnpcNames = [...bnpcNameMap.values()]
  .map((r) => (r && r[0] ? r[0].replace(/^"|"$/g, "").trim() : ""))
  .filter((n) => n.length >= 2)
  .sort((a, b) => b.length - a.length);

function getGuildhestSub(goId: string): BeastHabitat | null {
  const goRow = guildOrderMap.get(goId);
  if (!goRow) return null;
  const title = getCol(goRow, 1).replace(/^"|"$/g, "");
  const targetContent = (10000 + parseInt(goId, 10)).toString();
  let cfcLevel = "-";
  for (const cfcRow of cfcMap.values()) {
    if (cfcRow[3] === targetContent) {
      cfcLevel = cfcRow[18] || "-";
      break;
    }
  }

  let mobName = "";
  for (const name of bnpcNames) {
    if (title.includes(name)) {
      mobName = name;
      break;
    }
  }

  return {
    Summary: `行会令：${title}`,
    Type: "dungeon",
    Tag: "行会令",
    EventName: title,
    MobName: mobName,
    IsSubstitute: true,
    Level: cfcLevel,
  };
}

interface BnpcSpawnInfo {
  mapId: number;
  place: string;
  x: number;
  y: number;
  territoryId: string;
}

const levelLines = fs.readFileSync(path.join(chsPath, "Level.csv"), "utf8").split(/\r?\n/);
const bnpcSpawnsMap = new Map<string, BnpcSpawnInfo[]>();

for (let i = 3; i < levelLines.length; i++) {
  const l = levelLines[i];
  if (!l) continue;
  const p = l.split(",");
  if (p.length < 11) continue;
  if (p[6] === "9") {
    const bnpcId = p[7];
    const mapIdStr = p[8];
    const rawXStr = p[1];
    const rawZStr = p[3];
    const tId = p[10];
    if (!bnpcId || !mapIdStr || !tId || rawXStr === undefined || rawZStr === undefined) continue;

    const tRow = territoryTypeMap.get(tId);
    if (!tRow) continue;
    const intendedUse = getColInt(tRow, 10);
    if (intendedUse === 9) continue;

    const mMap = mapMap.get(mapIdStr);
    if (!mMap) continue;

    const scale = getColInt(mMap, 7) / 100;
    const offsetX = getColInt(mMap, 8);
    const offsetY = getColInt(mMap, 9);
    const rawX = parseFloat(rawXStr);
    const rawZ = parseFloat(rawZStr);

    const x = parseFloat(
      ((((rawX + offsetX) * scale + 1024) / 2048) * (41 / scale) + 1).toFixed(1),
    );
    const y = parseFloat(
      ((((rawZ + offsetY) * scale + 1024) / 2048) * (41 / scale) + 1).toFixed(1),
    );

    if (Number.isNaN(x) || Number.isNaN(y)) continue;

    const pId = tRow[5] || tRow[4] || mMap[11];
    const place = getPlaceName(pId);
    if (!place) continue;

    if (!bnpcSpawnsMap.has(bnpcId)) bnpcSpawnsMap.set(bnpcId, []);
    const list = bnpcSpawnsMap.get(bnpcId);
    if (
      list &&
      !list.some((s) => s.place === place && Math.abs(s.x - x) < 0.5 && Math.abs(s.y - y) < 0.5)
    ) {
      list.push({
        mapId: parseInt(mapIdStr, 10),
        place,
        x,
        y,
        territoryId: tId,
      });
    }
  }
}

const currentJsonPath = path.resolve(__dirname, "../src/resources/generated/beastbook.json");
const existingBeastMap = new Map<number, BeastEntry>();
if (fs.existsSync(currentJsonPath)) {
  try {
    const existingList: BeastEntry[] = JSON.parse(fs.readFileSync(currentJsonPath, "utf8"));
    existingList.forEach((item) => {
      if (item && item.Number) {
        existingBeastMap.set(item.Number, item);
      }
    });
  } catch {}
}

const beastbook: BeastEntry[] = [];

const petNumbers = [...xbmPetMap.keys()]
  .map(Number)
  .filter((n) => !Number.isNaN(n) && n > 0)
  .sort((a, b) => a - b);

for (const i of petNumbers) {
  const row = xbmPetMap.get(i.toString());
  if (!row) continue;

  const existing = existingBeastMap.get(i);

  const petId = getCol(row, 0);
  const petRow = petMap.get(petId);
  const rawName = petRow ? getCol(petRow, 0).replace(/^"|"$/g, "") : "";
  const name = rawName ? `${rawName}种` : "";

  const taxonomyCode = getColInt(row, 1);
  const taxonomy = getTaxonomyName(taxonomyCode);
  const borrow = getBorrowSkill(taxonomyCode);

  const autoAttackActionId = getCol(row, 5);
  const aaRow = actionMap.get(autoAttackActionId);
  const autoAttackType = aaRow ? getAutoAttackType(getColInt(aaRow, 44), getColInt(aaRow, 45)) : "";

  const orderActionId = petRow ? getCol(petRow, 1) : "";
  const releaseActionId = petRow ? getCol(petRow, 2) : "";

  const orderRow = actionMap.get(orderActionId);
  const releaseRow = actionMap.get(releaseActionId);

  const orderName = orderRow ? getCol(orderRow, 0).replace(/^"|"$/g, "") : "";
  const orderIcon = orderRow ? getColInt(orderRow, 2) : 0;
  const orderRange = getActionRange(orderRow);
  const orderDescription = cleanHex(getCol(row, 9).replace(/^"|"$/g, ""));

  const releaseName = releaseRow ? getCol(releaseRow, 0).replace(/^"|"$/g, "") : "";
  const releaseIcon = releaseRow ? getColInt(releaseRow, 2) : 0;
  const releaseRange = getActionRange(releaseRow);
  const releaseDescription = cleanHex(getCol(row, 10).replace(/^"|"$/g, ""));

  const locationKey = getCol(row, 6);
  const locationId = getCol(row, 7);
  let habitatSummary = "--";
  let mapId: number | undefined = undefined;

  if (locationKey === "1" && locationId && locationId !== "0") {
    const pRow = placeNameMap.get(locationId);
    if (pRow) {
      habitatSummary = getCol(pRow, 0).replace(/^"|"$/g, "");
    }
    for (const [mId, mRow] of mapMap.entries()) {
      if (
        mRow[11] === locationId &&
        (!mRow[12] || mRow[12] === "0" || mRow[12] === '""') &&
        mRow[3] === "0"
      ) {
        mapId = parseInt(mId, 10);
        break;
      }
    }
  } else if (locationKey === "2" && locationId && locationId !== "0") {
    const cfcRow = cfcMap.get(locationId);
    if (cfcRow) {
      habitatSummary = getCol(cfcRow, 43).replace(/^"|"$/g, "") || "--";
    }
  }

  const habitat = cleanHex(getCol(row, 8).replace(/^"|"$/g, ""));
  const icon = getColInt(row, 4);

  const comm = communityCoords[i];
  let habitats: BeastHabitat[] = [];
  if (comm) {
    if (comm.habitats && comm.habitats.length > 0) {
      habitats = comm.habitats.map((h) => {
        const hMapId = h.mapId ?? mapId;
        const hSummary = h.summary || getPlaceNameByMapId(hMapId) || habitatSummary;
        return {
          Summary: hSummary,
          Type: h.type || getHabitatType(locationKey),
          MapId: hMapId,
          Coords: h.coords,
          Level: h.level || comm.level || existing?.Habitats?.[0]?.Level || "-",
          MobName: h.mobName,
        };
      });
    } else {
      habitats = [
        {
          Summary: habitatSummary,
          Type: getHabitatType(locationKey),
          MapId: mapId,
          Coords: comm.coords,
          Level: comm.level || existing?.Habitats?.[0]?.Level || "-",
        },
      ];
    }
  } else if (existing && existing.Habitats && existing.Habitats.length > 0) {
    habitats = existing.Habitats.filter((h) => !h.IsSubstitute);
  } else {
    habitats = [
      {
        Summary: habitatSummary,
        Type: getHabitatType(locationKey),
        MapId: mapId,
        Coords: existing?.Habitats?.[0]?.Coords,
        Level: existing?.Habitats?.[0]?.Level || "-",
      },
    ];
  }

  const rule = substituteRules[i];
  const substitutesSet = new Set<string>();
  const substituteHabitats: BeastHabitat[] = [];

  if (rule) {
    if (rule.guildhests) {
      rule.guildhests.forEach((goId) => {
        const goSub = getGuildhestSub(goId);
        if (goSub) {
          if (goSub.MobName) substitutesSet.add(goSub.MobName);
          if (
            !substituteHabitats.some(
              (h) => h.Summary === goSub.Summary && h.MobName === goSub.MobName,
            )
          ) {
            substituteHabitats.push(goSub);
          }
        }
      });
    }

    if (rule.fates) {
      rule.fates.forEach((f) => {
        substitutesSet.add(f.mobName);
        substituteHabitats.push({
          Summary: f.summary || getPlaceNameByMapId(f.mapId),
          Type: "overworld",
          Tag: "FATE",
          EventName: f.eventName,
          MapId: f.mapId,
          Coords: f.coords,
          MobName: f.mobName,
          IsSubstitute: true,
          Level: f.level,
        });
      });
    }

    if (rule.leves) {
      rule.leves.forEach((l) => {
        substitutesSet.add(l.mobName);
        substituteHabitats.push({
          Summary: l.summary || getPlaceNameByMapId(l.mapId),
          Type: "overworld",
          Tag: "理符",
          EventName: l.eventName,
          MapId: l.mapId,
          Coords: l.coords,
          MobName: l.mobName,
          IsSubstitute: true,
          Level: l.level,
        });
      });
    }

    if (rule.dungeons) {
      rule.dungeons.forEach((d) => {
        substitutesSet.add(d.mobName);
        substituteHabitats.push({
          Summary: d.summary,
          Type: "dungeon",
          MobName: d.mobName,
          IsSubstitute: true,
          Level: d.level,
        });
      });
    }

    if (rule.bnpcIds) {
      rule.bnpcIds.forEach((bId) => {
        const nameRow = bnpcNameMap.get(bId);
        const mobName = nameRow ? getCol(nameRow, 0).replace(/^"|"$/g, "") : "";
        if (mobName) substitutesSet.add(mobName);

        const spawns = bnpcSpawnsMap.get(bId) || [];
        const groupedByPlace = new Map<string, BnpcSpawnInfo[]>();
        spawns.forEach((s) => {
          if (!groupedByPlace.has(s.place)) groupedByPlace.set(s.place, []);
          groupedByPlace.get(s.place)?.push(s);
        });

        for (const [place, list] of groupedByPlace.entries()) {
          const first = list[0];
          if (!first) continue;
          const coords = list.slice(0, 3).map((pt) => ({ x: pt.x, y: pt.y }));
          const exists = substituteHabitats.some(
            (h) => h.Summary === place && h.MobName === mobName,
          );
          if (!exists) {
            substituteHabitats.push({
              Summary: place,
              Type: "overworld",
              MapId: first.mapId,
              Coords: coords,
              Level: existing?.Habitats?.[0]?.Level,
              MobName: mobName,
              IsSubstitute: true,
            });
          }
        }
      });
    }
  }

  const substitutes = substitutesSet.size > 0 ? [...substitutesSet] : undefined;

  beastbook.push({
    Number: i,
    Name: name,
    Taxonomy: taxonomy,
    AutoAttackType: autoAttackType,
    BorrowName: borrow.name,
    BorrowIcon: borrow.icon,
    BorrowDescription: borrow.description,
    ReleaseName: releaseName,
    ReleaseDescription: releaseDescription,
    ReleaseRange: releaseRange,
    ReleaseIcon: releaseIcon,
    OrderName: orderName,
    OrderDescription: orderDescription,
    OrderRange: orderRange,
    OrderIcon: orderIcon,
    Habitat: habitat,
    Icon: icon,
    Habitats: habitats,
    Substitutes: substitutes,
    SubstituteHabitats: substituteHabitats.length > 0 ? substituteHabitats : undefined,
  });
}

const outputPath = path.resolve(__dirname, "../src/resources/generated/beastbook.json");
fs.writeFileSync(outputPath, JSON.stringify(beastbook, null, 2), "utf8");
console.log("Successfully generated", beastbook.length, "entries to", outputPath);
