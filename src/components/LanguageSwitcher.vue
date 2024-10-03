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

function changeLanguage() {
  locale.value = currentLocale.value
}

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
      <select v-model="currentLocale" class="language-select" @change="changeLanguage">
        <option v-for="(lang, key) in availableLocales" :key="key" :value="lang">
          {{ languages[lang] }}
        </option>
      </select>
      <span class="select-arrow" />
    </div>
  </div>
</template>

<style scoped>
.language-switcher {
  display: inline-flex;
  align-items: center;
  margin: 10px 0;
}

.select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background-color: #f0f0f0;
  border-radius: 20px;
  padding: 2px 8px;
}

.globe-icon {
  width: 18px;
  height: 18px;
  color: #007bff;
  margin-right: 5px;
}

.language-select {
  appearance: none;
  background: transparent;
  border: none;
  font-size: 14px;
  padding: 5px 20px 5px 5px;
  cursor: pointer;
  outline: none;
}

.select-arrow {
  position: absolute;
  right: 8px;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid #007bff;
  pointer-events: none;
}

.language-select:focus + .select-arrow {
  border-top-color: #0056b3;
}

.language-select option {
  background-color: white;
  color: #333;
}
</style>
