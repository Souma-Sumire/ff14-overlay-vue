<script setup>
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale, availableLocales } = useI18n()

const languages = {
  zhCn: '简体中文',
  en: 'English',
  ja: '日本語',
}

const currentLocale = useStorage('user-locale', locale.value)

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
      <svg class="globe-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <el-select v-model="currentLocale" size="small" class="language-select">
        <el-option v-for="(lang, key) in availableLocales" :key="key" :value="lang" :label="languages[lang]" />
      </el-select>
    </div>
  </div>
</template>

<style scoped>
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
  width: 5.5em;
}
</style>
