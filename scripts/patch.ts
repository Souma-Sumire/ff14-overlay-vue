import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const patchFile = path.join(rootDir, 'patches', '0001-cactbot-all.patch')

function applyPatch() {
  if (!fs.existsSync(patchFile)) {
    console.warn('⚠️ Patch file not found:', patchFile)
    return
  }

  console.log('--- Applying patch ---')
  try {
    // Check if patch is already applied
    try {
      execSync('git apply --check patches/0001-cactbot-all.patch', { cwd: rootDir, stdio: 'ignore' })
      console.log('Applying patch...')
      execSync('git apply patches/0001-cactbot-all.patch', { cwd: rootDir, stdio: 'inherit' })
      console.log('✅ Patch applied successfully!')
    }
    catch (e) {
      console.log('ℹ️ Patch already applied or cannot be applied cleanly.')
    }
  }
  catch (error) {
    console.error('❌ Error applying patch:', error)
  }
}

applyPatch()
