<script setup lang="ts">
import type { Lang } from '@/types/lang'
import { useStorage } from '@vueuse/core'
import { onMounted, watch } from 'vue'
import { useLang } from '@/composables/useLang'

const props = defineProps({
  teleported: {
    type: Boolean,
    default: true,
  },
})

const { locale, availableLocales } = useLang()

const languages: Record<string, string> = {
  zhCn: '简体中文',
  en: 'English',
  ja: '日本語',
  zhTw: '繁體中文',
}

const currentLocale = useStorage('user-locale', locale.value as Lang)

watch(currentLocale, (newLocale) => {
  locale.value = newLocale
})

onMounted(() => {
  locale.value = currentLocale.value
})
</script>

<template>
  <div class="language-switcher">
    <div class="select-wrapper">
      <svg
        class="globe-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path
          d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
        />
      </svg>
      <el-select
        v-model="currentLocale"
        size="small"
        class="language-select"
        :teleported="props.teleported"
      >
        <el-option
          v-for="lang in availableLocales"
          :key="lang"
          :value="lang"
          :label="languages[lang]"
        />
      </el-select>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.select-wrapper {
  display: flex;
  align-items: center;
}

.globe-icon {
  width: 18px;
  height: 18px;
  color: #007bff;
  margin-right: 5px;
}

.language-select {
  width: 6.5em;

  :deep(.el-input__wrapper) {
    background-color: transparent;
  }

  :deep(.el-input__inner) {
    color: inherit;
  }
}
</style>

<style lang="scss">
html.dark .language-switcher .globe-icon {
  color: #3b82f6;
}

html.dark .language-switcher .language-select {
  .el-input__wrapper {
    background-color: #1e293b;
    box-shadow: 0 0 0 1px #334155 inset;
  }

  .el-input__inner {
    color: #f1f5f9;
  }
}
</style>
