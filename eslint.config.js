import antfu from '@antfu/eslint-config'

export default antfu({
  unocss: true,
  ignores: [
    'cactbot/**',
    '.eslintrc-auto-import.json',
    'node_modules',
    'scripts/generate-map.cjs',
    'scripts/generate-aether.cjs',
  ],
})
