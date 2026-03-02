import fs from 'node:fs'
import antfu from '@antfu/eslint-config'

const autoImportGlobals = fs.existsSync('.eslintrc-auto-import.json')
  ? JSON.parse(fs.readFileSync('.eslintrc-auto-import.json', 'utf-8')).globals
  : {}

export default antfu(
  {
    ignores: ['dist', 'node_modules', 'cactbot'],
    vue: true,
    typescript: true,
    unocss: true,
    stylistic: true,
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
      'unused-imports/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
).then(configs => configs.map((config) => {
  if (!config.rules)
    return config
  const rules = { ...config.rules }
  for (const key in rules) {
    const level = Array.isArray(rules[key]) ? rules[key][0] : rules[key]
    if (level === 'error' || level === 2) {
      if (Array.isArray(rules[key]))
        rules[key] = ['warn', ...rules[key].slice(1)]
      else
        rules[key] = 'warn'
    }
  }
  return { ...config, rules }
}))
