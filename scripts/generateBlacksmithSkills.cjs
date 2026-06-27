const fs = require("fs");
const path = require("path");
const http = require("https");
const vm = require("vm");

const jsFiles = [
  "viper.js",
  "pictomancer.js",
  "paladin.js",
  "warrior.js",
  "darkknight.js",
  "gunbreaker.js",
  "whitemage.js",
  "scholar.js",
  "astrologian.js",
  "sage.js",
  "monk.js",
  "dragoon.js",
  "ninja.js",
  "samurai.js",
  "reaper.js",
  "bard.js",
  "machinist.js",
  "dancer.js",
  "blackmage.js",
  "summoner.js",
  "redmage.js",
];

const baseUrl = "https://actff1.web.sdo.com/project/20190917jobguid/dateconfig/";

// 项目内路径
const projectRoot = path.resolve(__dirname, "..");
const cacheDir = path.join(projectRoot, "node_modules/.cache/blacksmith");
const jsonPath = path.join(projectRoot, "src/resources/generated/blacksmithSkills.json");
const blacklistJsonPath = path.join(
  projectRoot,
  "src/resources/generated/blacksmithBlacklist.json",
);

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    http
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

async function run() {
  console.log("1. 开始下载/更新职业指南技能数据JS...");
  for (const file of jsFiles) {
    const dest = path.join(cacheDir, file);
    try {
      await downloadFile(baseUrl + file, dest);
    } catch (err) {
      console.warn(`下载 ${file} 失败，将尝试使用本地缓存。Error: ${err.message}`);
      if (!fs.existsSync(dest)) {
        throw new Error(`本地没有 ${file} 的缓存，无法继续。请检查网络。`);
      }
    }
  }

  console.log("2. 提取并编译技能威力字典...");
  const dictionary = {};

  for (const file of jsFiles) {
    const filePath = path.join(cacheDir, file);
    let code = fs.readFileSync(filePath, "utf8");

    const sandbox = { window: {} };
    vm.createContext(sandbox);
    try {
      vm.runInContext(code, sandbox);
    } catch {
      try {
        vm.runInContext("var window = {};\n" + code, sandbox);
      } catch {
        continue;
      }
    }

    let jobKey =
      Object.keys(sandbox.window).find((k) => sandbox.window[k] && sandbox.window[k].pve) ||
      Object.keys(sandbox).find((k) => sandbox[k] && sandbox[k].pve);
    const jobData = jobKey ? sandbox.window[jobKey] || sandbox[jobKey] : null;
    if (!jobData) continue;

    const pve = jobData.pve;
    if (pve.subArry) {
      for (const sub of pve.subArry) {
        if (sub.jobArry) {
          for (const skill of sub.jobArry) {
            if (skill.classification === "特性") continue;

            const content = skill.content || "";
            const name = skill.name.trim();

            const potencyRegex =
              /(?:威力[：:]|威力\s*|连击中威力[：:]|连击后方物理攻击威力[：:]|侧面物理攻击威力[：:]|恢复自身体力威力[：:]|连击侧面物理攻击威力[：:]|安魂祈祷状态中威力[：:]|连发时威力[：:]|促进中威力[：:]|使用祖灵降临后发动该技能，威力提高到|英雄的掠影的攻击威力[：:]|英雄的掠影发动暗影使者的威力[：:]|英雄的掠影发动掠影的蔑视的威力[：:]|诗心3档时威力[：:]|消耗3种尾声标识时威力[：:])\s*(\d+)/g;

            let match;
            let maxPotency = 0;
            while ((match = potencyRegex.exec(content)) !== null) {
              const val = parseInt(match[1]);
              if (val > maxPotency) {
                maxPotency = val;
              }
            }

            if (maxPotency === 0) {
              const fallbackMatch = content.match(/威力[：:\s]*(\d+)/);
              if (fallbackMatch) {
                maxPotency = parseInt(fallbackMatch[1]);
              }
            }

            if (maxPotency === 0) continue;

            // 匹配衰减百分比
            let falloffPct = 0;
            const falloffMatch = content.match(/(?:威力降低|降低|减少)\s*(\d+)\s*%/);
            if (falloffMatch) {
              const hasTarget = content.includes("目标") || content.includes("敌人");
              if (
                hasTarget &&
                (content.includes("降低") || content.includes("减少") || content.includes("衰减"))
              ) {
                if (
                  !content.includes("目标攻击造成的伤害") &&
                  !content.includes("目标物理攻击造成的伤害") &&
                  !content.includes("目标魔法攻击造成的伤害") &&
                  !content.includes("敌人攻击造成的伤害")
                ) {
                  falloffPct = parseInt(falloffMatch[1]);
                }
              }
            }

            // 检测溅射判定类型
            let splashType = null;
            if (content.includes("向目标所在方向")) {
              splashType = "directional";
            } else if (content.includes("对自身周围")) {
              splashType = "selfArea";
            } else if (content.includes("对目标及其周围")) {
              splashType = "target";
            }

            if (dictionary[name]) {
              if (maxPotency > dictionary[name].base) {
                dictionary[name].base = maxPotency;
              }
              if (falloffPct > 0) {
                dictionary[name].pct = falloffPct;
              }
              if (splashType) {
                dictionary[name].splashType = splashType;
              }
            } else {
              dictionary[name] = { base: maxPotency };
              if (falloffPct > 0) {
                dictionary[name].pct = falloffPct;
              }
              if (splashType) {
                dictionary[name].splashType = splashType;
              }
            }
          }
        }
      }
    }
  }

  // 合并与清洗特性
  if (dictionary["战逃反应效果提高2"]) {
    dictionary["沥血剑"] = { base: 540 };
    delete dictionary["战逃反应效果提高2"];
  }
  if (dictionary["掠影示现效果提高II"] || dictionary["掠影示现效果提高III"]) {
    dictionary["掠影示现"] = { base: 620, pct: 25 };
    delete dictionary["掠影示现效果提高II"];
    delete dictionary["掠影示现效果提高III"];
  }

  // 补全舞者舞步结束的各种变体名称的威力数据（均为 75% 目标衰减，自身中心AOE）
  dictionary["双色标准舞步结束"] = { base: 850, pct: 75, splashType: "selfArea" };
  dictionary["单色标准舞步结束"] = { base: 540, pct: 75, splashType: "selfArea" };
  dictionary["四色技巧舞步结束"] = { base: 1300, pct: 75, splashType: "selfArea" };
  dictionary["三色技巧舞步结束"] = { base: 950, pct: 75, splashType: "selfArea" };
  dictionary["双色技巧舞步结束"] = { base: 780, pct: 75, splashType: "selfArea" };
  dictionary["单色技巧舞步结束"] = { base: 540, pct: 75, splashType: "selfArea" };
  const traitsToDelete = [
    "技能威力提高",
    "技能威力提高II",
    "技能威力提高III",
    "技能威力提高IV",
    "长枪精通",
    "长枪精通III",
    "毁灭精通IV",
    "赤魔法精通III",
  ];
  for (const trait of traitsToDelete) {
    delete dictionary[trait];
  }

  // 写入 JSON：每个技能一行
  const lines = Object.keys(dictionary)
    .sort()
    .map((name) => {
      const skill = dictionary[name];
      const entry = { base: skill.base };
      if (skill.pct !== undefined) entry.pct = skill.pct;
      if (skill.splashType) entry.splashType = skill.splashType;
      return `"${name}":${JSON.stringify(entry)}`;
    });
  fs.writeFileSync(jsonPath, `{${lines.join(",\n")}}`, "utf8");
  console.log(
    `- 成功将共 ${Object.keys(dictionary).length} 个技能的威力字典写入 blacksmithSkills.json`,
  );

  // 3. 构建黑名单（仅包含无法选定目标的场地/自身中心AOE）
  console.log("3. 正在生成黑名单...");

  const baseBlacklistMap = {
    "1D5F": "六分反击",
    17: "厄运流转",
    DF3: "法令",
    6504: "豪圣",
    "650A": "裂阵法",
    9094: "埋伏之毒",
    E37: "腐秽大地",
    "3F1F": "弓形冲波",
    6512: "大宇宙",
  };

  const nameToHex = {};

  for (const [hex, name] of Object.entries(baseBlacklistMap)) {
    const hexUpper = hex.toUpperCase();
    if (!nameToHex[hexUpper]) {
      nameToHex[hexUpper] = [];
    }
    if (!nameToHex[hexUpper].includes(name)) {
      nameToHex[hexUpper].push(name);
    }
  }

  const sortedHexIds = Object.keys(nameToHex).sort((a, b) => {
    const numA = parseInt(a, 16);
    const numB = parseInt(b, 16);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });

  // 4. 将黑名单写入 json 文件（紧凑格式）
  console.log("4. 将黑名单写入 blacksmithBlacklist.json...");
  const blLines = sortedHexIds.map(
    (hex) => `"${hex}":${JSON.stringify(Array.from(new Set(nameToHex[hex])).join("/"))}`,
  );
  fs.writeFileSync(blacklistJsonPath, `{${blLines.join(",\n")}}`, "utf8");
  console.log(
    `- 成功将带技能名备注的黑名单（共 ${sortedHexIds.length} 个）写入了 blacksmithBlacklist.json！`,
  );

  console.log("全流程执行成功！");
}

run().catch((err) => {
  console.error("执行脚本失败:", err);
  process.exit(1);
});
