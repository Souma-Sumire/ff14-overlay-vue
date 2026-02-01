import { execSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const scripts: string[] = [
  'aethercurrent.ts',
  'aetheryte.ts',
  'action.ts',
  'chinese2Icon.ts',
  'map.ts',
  'status.ts',
  'contentFinderCondition.ts',
  'meals.ts',
  // "world.ts",
]

console.log('--- Running scripts ---')

for (const script of scripts) {
  const scriptPath = path.join(__dirname, script)
  console.log(`Running ${script}...`)

  try {
    execSync(`npx tsx ${scriptPath}`, { stdio: 'inherit' })
  }
  catch (error) {
    console.error(`❌ Error running ${script}:`, error)
    process.exit(1)
  }
}

console.log('--- All scripts completed! ---')
