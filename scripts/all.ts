import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { csvPaths } from "./paths.js";

if (!fs.existsSync(csvPaths.ja) || !fs.existsSync(csvPaths.cn)) {
  console.log("ℹ️ 数据挖掘目录不存在，跳过数据生成脚本。");
  process.exit(0);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scripts: string[] = [
  "aethercurrent.ts",
  "aetheryte.ts",
  "action.ts",
  "actionCategory.ts",
  "actionUpgradeStepsBake.ts",
  "roleActionCategoryByJob.ts",
  "actionMetaBake.ts",
  "actionMinLevelBake.ts",
  "map.ts",
  "status.ts",
  "contentFinderCondition.ts",
  "meals.ts",
  "world.ts",
  "beastbook.ts",
];

console.log("--- Running scripts ---");

for (const script of scripts) {
  const scriptPath = path.join(__dirname, script);
  console.log(`Running ${script}...`);

  try {
    await import(pathToFileURL(scriptPath).href);
  } catch (error) {
    console.error(`❌ Error running ${script}:`, error);
    process.exit(1);
  }
}

console.log("--- All scripts completed! ---");
