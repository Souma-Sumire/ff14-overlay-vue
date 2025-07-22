const { execSync } = require("child_process");

const scripts = [
  "generate-aethercurrent.cjs",
  "generate-aetheryte.cjs",
  "generate-map.cjs",
  "generate-action.cjs",
  "generate-status.cjs",
  "generate-contentFinderCondition.cjs",
  "generate-meals.cjs",
  // "generate-world.cjs",
];

for (const script of scripts) {
  console.log(`Running ${script}...`);
  execSync(`node scripts/${script}`, { stdio: "inherit" });
}
console.log("✅ All scripts completed!");
