<script setup lang="ts">
import { Moon, Sunny } from '@element-plus/icons-vue'
import { useDark, useToggle } from '@vueuse/core'

const isDark = useDark()

const toggleDark = useToggle(isDark)
</script>

<template>
  <button
    aria-label="Toggle Dark Mode"
    class="theme-toggle"
    @click="toggleDark()"
    @keyup.enter="toggleDark()"
  >
    <el-icon>
      <Moon v-if="isDark" class="el-icon moon" />
      <Sunny v-else class="el-icon sunny" />
    </el-icon>
  </button>
</template>

<style scoped>
.theme-toggle {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  cursor: pointer;
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}

.theme-toggle:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  background-color: var(--el-bg-color-hover);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.theme-toggle:active {
  background-color: var(--el-bg-color-pressed);
  border-color: var(--el-color-primary-dark-2);
  color: var(--el-color-primary-dark-2);
}
.el-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.moon {
  left: 55%;
}
</style>
