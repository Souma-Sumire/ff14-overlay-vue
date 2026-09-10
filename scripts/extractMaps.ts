import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { csvPaths } from "./paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvDir = csvPaths.cn;

if (!fs.existsSync(csvDir)) {
  console.log("ℹ️ 数据挖掘目录不存在，跳过地图映射生成脚本。");
  process.exit(0);
}

function parseCsv(filename: string): Map<string, string[]> {
  const filePath = path.join(csvDir, filename);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);
  const map = new Map<string, string[]>();

  for (let i = 3; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const tokens: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
        cur += char;
      } else if (char === "," && !inQuotes) {
        tokens.push(cur);
        cur = "";
      } else {
        cur += char;
      }
    }
    tokens.push(cur);

    const key = tokens[0]?.replace(/^"|"$/g, "");
    if (key) {
      map.set(key, tokens.slice(1));
    }
  }
  return map;
}

function getCol(row: string[] | undefined, index: number): string {
  if (!row || index < 0 || index >= row.length) return "";
  return row[index]?.trim() || "";
}

const placeNameMap = parseCsv("PlaceName.csv");
const mapMap = parseCsv("Map.csv");
const territoryTypeMap = parseCsv("TerritoryType.csv");

const mapNameToId: Record<string, number> = {};

for (const [_tId, row] of territoryTypeMap.entries()) {
  const intendedUse = getCol(row, 9);
  const mapIdStr = getCol(row, 6);
  const placeId = getCol(row, 5);
  const pRow = placeNameMap.get(placeId);
  const placeName = pRow ? getCol(pRow, 0).replace(/^"|"$/g, "") : "";
  if (intendedUse === "1" && mapIdStr && mapIdStr !== "0" && placeName) {
    const mapId = parseInt(mapIdStr, 10);
    if (!mapNameToId[placeName]) {
      mapNameToId[placeName] = mapId;
    }
  }
}

const fieldRegex = /^[a-z]\d+f\d+\/\d+$/;
for (const [mId, r] of mapMap.entries()) {
  const pathVal = getCol(r, 6).replace(/^"|"$/g, "");
  if (!fieldRegex.test(pathVal)) continue;

  const subId = getCol(r, 11);
  const mainId = getCol(r, 10);
  const subRow = subId && subId !== "0" ? placeNameMap.get(subId) : undefined;
  const mainRow = mainId && mainId !== "0" ? placeNameMap.get(mainId) : undefined;
  const name = subRow
    ? getCol(subRow, 0).replace(/^"|"$/g, "")
    : mainRow
      ? getCol(mainRow, 0).replace(/^"|"$/g, "")
      : "";
  if (name && !mapNameToId[name]) {
    mapNameToId[name] = parseInt(mId, 10);
  }
}

const mapsOutputPath = path.resolve(__dirname, "../src/resources/generated/maps.json");
fs.writeFileSync(mapsOutputPath, JSON.stringify(mapNameToId, null, 2), "utf8");
// console.log(
//   "Successfully generated",
//   Object.keys(mapNameToId).length,
//   "map mappings to",
//   mapsOutputPath,
// );
