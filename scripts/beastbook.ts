import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { csvPaths } from "./paths.js";

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
const addonMap = parseCsv("Addon.csv");
const xbmElementMap = parseCsv("XBMElement.csv");
const attackTypeMap = parseCsv("AttackType.csv");

interface BeastHabitat {
  Summary: string;
  Type: string;
  MapId?: number;
  Level?: string;
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
  Habitats: BeastHabitat[];
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

const beastbook: BeastEntry[] = [];

const petNumbers = [...xbmPetMap.keys()]
  .map(Number)
  .filter((n) => !Number.isNaN(n) && n > 0)
  .sort((a, b) => a - b);

for (const i of petNumbers) {
  const row = xbmPetMap.get(i.toString());
  if (!row) continue;

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
  let habitatLevel: string | undefined = undefined;

  if (locationKey === "0") {
    habitatSummary = "初始自带";
  } else if (locationKey === "1" && locationId && locationId !== "0") {
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
      const lvl = getCol(cfcRow, 17);
      if (lvl && lvl !== "0") {
        habitatLevel = lvl;
      }
    }
  }

  const habitat = cleanHex(getCol(row, 8).replace(/^"|"$/g, ""));
  const icon = getColInt(row, 4);

  const habitats: BeastHabitat[] = [
    {
      Summary: habitatSummary,
      Type: getHabitatType(locationKey),
      MapId: mapId,
      ...(habitatLevel ? { Level: habitatLevel } : {}),
    },
  ];

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
  });
}

const outputPath = path.resolve(__dirname, "../src/resources/generated/beastbook.json");
fs.writeFileSync(outputPath, JSON.stringify(beastbook, null, 2), "utf8");
// console.log("Successfully generated", beastbook.length, "entries to", outputPath);
