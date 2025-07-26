const { execSync } = require('node:child_process')

const scripts = [
  'aethercurrent.cjs',
  'aetheryte.cjs',
  'map.cjs',
  'action.cjs',
  'status.cjs',
  'contentFinderCondition.cjs',
  'meals.cjs',
  // "world.cjs",
]

for (const script of scripts) {
  console.log(`Running ${script}...`)
  execSync(`node scripts/${script}`, { stdio: 'inherit' })
}
console.log('✅ All scripts completed!')
