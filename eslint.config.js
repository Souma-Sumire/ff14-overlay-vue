import antfu from '@antfu/eslint-config'

export default antfu({
  unocss: true,
  ignores: [
    'cactbot/**',
    '.eslintrc-auto-import.json',
    'node_modules',
    'src/resources/**.json',
  ],
  rules: {
    'node/prefer-global/process': 'off',
  },
})
