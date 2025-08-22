import globals from 'globals'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default [
  // 基础 ESLint 推荐规则
  js.configs.recommended,

  // TypeScript 相关的推荐规则
  ...tseslint.configs.recommended,

  // 禁用所有与 Prettier 冲突的规则
  prettierConfig,
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // 在这里禁用所有与 TypeScript 相关的规则，因为这些文件是纯 JavaScript
      '@typescript-eslint/no-require-imports': 'off',
      // 其他你希望禁用的规则...
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      prettier,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // 开启 Prettier 规则
      'prettier/prettier': 'error',
    },
  },

  {
    ignores: [
      'node_modules/',
      'dist/',
      'cactbot/',
      'src/resources/**.json',
      'uno.config.ts',
    ],
  },
]
