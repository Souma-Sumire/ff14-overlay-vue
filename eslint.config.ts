import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import antfu from '@antfu/eslint-config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const autoImportConfigPath = path.resolve(__dirname, '.eslintrc-auto-import.json')
const autoImportGlobals = fs.existsSync(autoImportConfigPath)
  ? JSON.parse(fs.readFileSync(autoImportConfigPath, 'utf-8')).globals
  : {}

export default antfu(
  {
    ignores: ['dist/', 'node_modules/', 'cactbot/'],
    vue: true,
    typescript: true,
    unocss: true,
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false,
    },
  },
  {
    languageOptions: {
      globals: {
        ...autoImportGlobals,
      },
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
)
