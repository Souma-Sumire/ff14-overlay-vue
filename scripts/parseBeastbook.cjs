const fs = require("fs");
const path = require("path");

const chsPath = "D:/Github/ffxiv-datamining-hexcode-mixed/chs";

function parseCsv(filename) {
  const content = fs.readFileSync(path.join(chsPath, filename), "utf8");
  const result = new Map();
  const rows = [];
  let row = [];
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

  // 跳过前 3 行表头定义
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (r.length > 0 && r[0]) {
      result.set(r[0], r.slice(1));
    }
  }
  return result;
}

const xbmPetMap = parseCsv("XBMPet.csv");
const petMap = parseCsv("Pet.csv");
const actionMap = parseCsv("Action.csv");
const placeNameMap = parseCsv("PlaceName.csv");
const mapMap = parseCsv("Map.csv");
const cfcMap = parseCsv("ContentFinderCondition.csv");
const actionTransientMap = parseCsv("ActionTransient.csv");

const taxonomyNames = [
  "",
  "百兽纲",
  "百虫纲",
  "有翼纲",
  "草木纲",
  "水栖纲",
  "甲鳞纲",
  "咒具纲",
  "死尸纲",
];

const borrowSkills = {
  百兽纲: { name: "百兽肤", icon: 3927, actionId: 44896 },
  百虫纲: { name: "百虫肤", icon: 3926, actionId: 44897 },
  有翼纲: { name: "有翼飞掠", icon: 3928, actionId: 44898 },
  草木纲: { name: "草木播种", icon: 3929, actionId: 44899 },
  水栖纲: { name: "水栖波", icon: 3930, actionId: 44900 },
  甲鳞纲: { name: "甲鳞肤", icon: 3931, actionId: 44901 },
  咒具纲: { name: "咒具碎魂", icon: 3932, actionId: 44902 },
  死尸纲: { name: "死尸净化", icon: 3933, actionId: 44903 },
};

const magicAspectNames = {
  1: "火",
  2: "风",
  3: "土",
  4: "雷",
  5: "冰",
  6: "水",
};

const physicalAttackTypeNames = {
  1: "斩击",
  2: "突刺",
  3: "打击",
};

function cleanHex(str) {
  if (!str) return "";
  return str
    .replace(/<hex:024804F201F803><hex:024904F201F903>/g, '<span style="color:#00cc22;">')
    .replace(/<hex:024804F201F403><hex:024904F201F503>/g, '<span style="color:#ff7b1a;">')
    .replace(/<hex:024804F201FA03><hex:024904F201FB03>/g, '<span style="color:#888888;">')
    .replace(/<hex:0249020103><hex:0248020103>/g, "</span>")
    .replace(/<hex:02100103>/g, "\n")
    .replace(/<hex:[0-9A-Fa-f]+>/g, "")
    .trim();
}

// 社区整理的野外魔兽坐标
const communityCoords = {
  2: { x: 23.1, y: 17 },
  3: { x: 23.8, y: 25.6 },
  4: { x: 22, y: 22 },
  5: { x: 28.5, y: 24.3 },
  6: { x: 30.9, y: 18.2 },
  7: { x: 20.3, y: 28.6 },
  8: { x: 19, y: 19 },
  9: { x: 15.3, y: 14.3 },
  10: { x: 22, y: 30 },
  11: { x: 21, y: 26 },
  12: { x: 21.4, y: 16.3 },
  13: { x: 18.5, y: 28.3 },
  14: { x: 20.5, y: 18.5 },
  15: { x: 16.5, y: 16.5 },
  16: { x: 21, y: 23 },
  19: { x: 26.5, y: 15.9 },
  20: { x: 23, y: 26 },
  21: { x: 24.1, y: 23.6 },
  22: { x: 27, y: 25 },
  23: { x: 24, y: 12.3 },
  24: { x: 28.8, y: 36.7 },
  25: { x: 22, y: 30 },
  26: { x: 18.5, y: 17.5 },
  27: { x: 16.8, y: 14.5 },
  28: { x: 15.2, y: 37.5 },
  29: { x: 17.4, y: 23.7 },
  30: { x: 25.2, y: 24.5 },
  31: { x: 23, y: 23 },
  32: { x: 30.6, y: 24 },
  33: { x: 15.3, y: 14.7 },
  34: { x: 31.2, y: 20.3 },
  35: { x: 25, y: 39 },
  36: { x: 28.7, y: 19.3 },
  39: { x: 13.5, y: 22.3 },
  41: { x: 26.5, y: 18.9 },
  42: { x: 26.3, y: 12.9 },
};

const beastbook = [];

// 动态提取 XBMPet 表中的所有有效魔兽编号，避免硬编码条目上限
const petNumbers = [...xbmPetMap.keys()]
  .map(Number)
  .filter((n) => !isNaN(n) && n > 0)
  .sort((a, b) => a - b);

for (const i of petNumbers) {
  const row = xbmPetMap.get(i.toString());
  if (!row) continue;

  const petId = row[0];
  const petRow = petMap.get(petId);
  const rawName = petRow ? petRow[0].replace(/^"|"$/g, "") : "";
  const name = rawName ? `${rawName}种` : "";

  const taxonomyCode = parseInt(row[1], 10);
  const taxonomy = taxonomyNames[taxonomyCode] || "";
  const borrow = borrowSkills[taxonomy] || { name: "借用", icon: 3914, actionId: 0 };
  let borrowDescription = "";
  if (borrow.actionId) {
    const btRow = actionTransientMap.get(borrow.actionId.toString());
    if (btRow && btRow[0]) {
      borrowDescription = cleanHex(btRow[0].replace(/^"|"$/g, ""));
    }
  }

  const autoAttackActionId = row[5];
  const aaRow = actionMap.get(autoAttackActionId);
  let autoAttackType = "物理";
  if (aaRow) {
    const attackType = parseInt(aaRow[44], 10); // AttackType (original col 45)
    const aspect = parseInt(aaRow[45], 10); // Aspect (original col 46)
    if (attackType === 5) {
      autoAttackType = magicAspectNames[aspect] || "魔法";
    } else {
      autoAttackType = physicalAttackTypeNames[attackType] || "物理";
    }
  }

  const orderActionId = petRow ? petRow[1] : "";
  const releaseActionId = petRow ? petRow[2] : "";

  const orderRow = actionMap.get(orderActionId);
  const releaseRow = actionMap.get(releaseActionId);

  const orderName = orderRow ? orderRow[0].replace(/^"|"$/g, "") : "";
  const orderIcon = orderRow ? parseInt(orderRow[2], 10) : 0;
  const orderCastType = orderRow ? parseInt(orderRow[28], 10) : 0;
  const orderRange = orderCastType === 1 ? "单体攻击" : "范围攻击";
  const orderDescription = cleanHex(row[10] ? row[10].replace(/^"|"$/g, "") : "");

  const releaseName = releaseRow ? releaseRow[0].replace(/^"|"$/g, "") : "";
  const releaseIcon = releaseRow ? parseInt(releaseRow[2], 10) : 0;
  const releaseCastType = releaseRow ? parseInt(releaseRow[28], 10) : 0;
  const releaseRange = releaseCastType === 1 ? "单体攻击" : "范围攻击";
  const releaseDescription = cleanHex(row[9] ? row[9].replace(/^"|"$/g, "") : "");

  // row[6] 为 LocationKey: 0=无特定地点, 1=野外大地图 (PlaceName), 2=副本迷宫 (ContentFinderCondition)
  // row[7] 为 Location: 对应表的 ID
  const locationKey = row[6];
  const locationId = row[7];
  let habitatSummary = "--";
  let mapId = undefined;

  if (locationKey === "1" && locationId && locationId !== "0") {
    const pRow = placeNameMap.get(locationId);
    if (pRow) {
      habitatSummary = pRow[0].replace(/^"|"$/g, "");
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
      // ContentFinderCondition 的 Name 位于第 44 列 (在 slice(1) 后索引为 43)
      habitatSummary = cfcRow[43]?.replace(/^"|"$/g, "") || "--";
    }
  }

  const habitat = cleanHex(row[8] ? row[8].replace(/^"|"$/g, "") : "");
  const icon = parseInt(row[4], 10);
  const coord = communityCoords[i];

  beastbook.push({
    Number: i,
    Name: name,
    Taxonomy: taxonomy,
    AutoAttackType: autoAttackType,
    BorrowName: borrow.name,
    BorrowIcon: borrow.icon,
    BorrowDescription: borrowDescription,
    ReleaseName: releaseName,
    ReleaseDescription: releaseDescription,
    ReleaseRange: releaseRange,
    ReleaseIcon: releaseIcon,
    OrderName: orderName,
    OrderDescription: orderDescription,
    OrderRange: orderRange,
    OrderIcon: orderIcon,
    HabitatSummary: habitatSummary,
    HabitatType: locationKey === "2" ? "dungeon" : "overworld",
    Habitat: habitat,
    Coords: coord ? { x: coord.x, y: coord.y } : undefined,
    MapId: mapId,
    Icon: icon,
  });
}

// ─── 动态提取与生成游戏文本常量（防止未来更新需要硬编码维护） ───────────────────

const REGION_KEYWORDS = ["黑衣森林", "拉诺西亚", "萨纳兰", "库尔札斯", "摩杜纳"];

const SUB_DIRECTION_ORDER = ["中央", "中", "东", "西", "南", "北", "低地", "高地", "外地"];

function sortOverworldHabitats(list) {
  const withoutEmpty = list.filter((h) => h !== "--");
  withoutEmpty.sort((a, b) => {
    const regIndexA = REGION_KEYWORDS.findIndex((k) => a.includes(k));
    const regIndexB = REGION_KEYWORDS.findIndex((k) => b.includes(k));

    const safeRegA = regIndexA === -1 ? 999 : regIndexA;
    const safeRegB = regIndexB === -1 ? 999 : regIndexB;

    if (safeRegA !== safeRegB) {
      return safeRegA - safeRegB;
    }

    // 剥离大区名后再判断自然方位，防止“拉诺西亚”自带“西”字造成方位错判
    const regKeyA = REGION_KEYWORDS[regIndexA];
    const regKeyB = REGION_KEYWORDS[regIndexB];
    const pureA = regKeyA ? a.replace(regKeyA, "") : a;
    const pureB = regKeyB ? b.replace(regKeyB, "") : b;

    const dirIndexA = SUB_DIRECTION_ORDER.findIndex((d) => pureA.includes(d));
    const dirIndexB = SUB_DIRECTION_ORDER.findIndex((d) => pureB.includes(d));

    const safeDirA = dirIndexA === -1 ? 999 : dirIndexA;
    const safeDirB = dirIndexB === -1 ? 999 : dirIndexB;

    if (safeDirA !== safeDirB) {
      return safeDirA - safeDirB;
    }

    return a.localeCompare(b, "zh-CN");
  });

  if (list.includes("--")) {
    withoutEmpty.push("--");
  }
  return withoutEmpty;
}

const rawOverworld = [
  ...new Set(beastbook.filter((b) => b.HabitatType === "overworld").map((b) => b.HabitatSummary)),
].filter(Boolean);
const overworldHabitats = sortOverworldHabitats(rawOverworld);

const constants = {
  taxonomies: [...new Set(beastbook.map((b) => b.Taxonomy))].filter(Boolean),
  attackTypes: [...new Set(beastbook.map((b) => b.AutoAttackType))].filter(Boolean),
  borrowActions: [...new Set(beastbook.map((b) => b.BorrowName))].filter(Boolean),
  ranges: [
    ...new Set([...beastbook.map((b) => b.ReleaseRange), ...beastbook.map((b) => b.OrderRange)]),
  ].filter(Boolean),
  overworldHabitats,
  dungeonHabitats: [
    ...new Set(beastbook.filter((b) => b.HabitatType === "dungeon").map((b) => b.HabitatSummary)),
  ].filter(Boolean),
};

const outputPath = path.resolve(__dirname, "../src/assets/data/beastbook.json");
fs.writeFileSync(outputPath, JSON.stringify(beastbook, null, 2), "utf8");
console.log("Successfully generated", beastbook.length, "entries to", outputPath);

const constantsPath = path.resolve(__dirname, "../src/assets/data/beastbookConstants.json");
fs.writeFileSync(constantsPath, JSON.stringify(constants, null, 2), "utf8");
console.log("Successfully generated constants to", constantsPath);
