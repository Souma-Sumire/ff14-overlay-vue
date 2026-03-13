import type { EnemyRecord } from "./ddFormat";
import process from "node:process";
import { defaultDdPath, rewriteDdEnemies } from "./ddFormat";

function parseArgs(argv: string[]): { ddPath: string } {
  const ddPathArg = argv.find((arg) => arg.startsWith("--dd-path="));
  return {
    ddPath: ddPathArg ? ddPathArg.slice("--dd-path=".length) : defaultDdPath(),
  };
}

function normalizeRecord(record: EnemyRecord): EnemyRecord {
  return { ...record };
}

const { ddPath } = parseArgs(process.argv.slice(2));
const result = await rewriteDdEnemies(ddPath, (parsed) => normalizeRecord(parsed.record), {
  completeVulnerabilities: true,
});

console.log(`Normalized ${result.changedLines} enemy lines in ${ddPath}`);
console.log(result.changedLines > 0 ? "dd.ts updated" : "No changes needed");
