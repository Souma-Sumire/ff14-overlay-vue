<script setup lang="ts">
import { localeToCactbotLang, useLang } from '@/composables/useLang'
import aethercurrent from '@/resources/aethercurrent.json'
import type { Lang } from '@/types/lang'
const { locale } = useLang()

const exVersions = Array.from(
  new Set(
    aethercurrent
      .map((v) => v.exVersion)
      .sort()
      .reverse()
  )
)

const groupById = aethercurrent.reduce(
  (total, item) => {
    const group = total.find((v) => v.id === item.id)
    if (group) {
      group.items.push(item)
    } else {
      total.push({
        id: item.id,
        name: item.name,
        exVersion: item.exVersion,
        items: [item],
      })
    }
    return total
  },
  [] as {
    id: string
    name: { ja: string; cn?: string }
    exVersion: string
    items: {
      x: string
      y: string
      z: string
      territory: string
      game: {
        x: number
        y: number
      }
      id: string
      data: number
    }[]
  }[]
)
const IMG_RAW_SIZE = 2048
const IMG_SHOW_SIZE = 512
const IMG_SCALE = IMG_SHOW_SIZE / IMG_RAW_SIZE
const selectExVersion = ref(exVersions[0])

function getName(name: { ja: string; cn?: string; en?: string }) {
  return name[localeToCactbotLang(locale.value as Lang) as keyof typeof name] ?? name.en
}
</script>

<template>
  <el-container class="main-container">
    <el-header class="header-container">
      <div class="header-content">
        <span class="label">{{ $t('aether.exVersion') }}</span>
        <el-select
          v-model="selectExVersion"
          :placeholder="$t('aether.exVersion')"
          size="large"
          style="width: 15em; font-weight: bold"
        >
          <el-option
            v-for="version in exVersions"
            :key="version"
            :label="version"
            :value="version"
          />
        </el-select>
        <CommonLanguageSwitcher />
      </div>
    </el-header>

    <el-main class="map-container">
      <div
        v-for="map in groupById.filter((v) => v.exVersion === selectExVersion)"
        :key="map.id"
        class="map-card"
      >
        <h2 class="map-title">{{ getName(map.name) }}</h2>
        <div class="map-image-wrapper">
          <img
            :style="{
              width: `${IMG_SHOW_SIZE}px`,
              height: `${IMG_SHOW_SIZE}px`,
            }"
            :src="`https://v2.xivapi.com/api/asset/map/${map.id}`"
            :alt="getName(map.name)"
            class="map-image"
          />
          <article class="points-overlay">
            <div
              v-for="(item, index) in map.items.sort((a, b) => b.data - a.data)"
              :key="`${item.id}-${index}`"
              class="point"
              :style="{
                position: 'absolute',
                left: `${item.game.x * IMG_SCALE}px`,
                top: `${item.game.y * IMG_SCALE}px`,
              }"
            >
              {{ +index + 1 }}
            </div>
          </article>
        </div>
      </div>
    </el-main>
  </el-container>
</template>

<style scoped>
.main-container {
  min-height: 100vh;
}

.header-container {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color);
  margin-bottom: 2em;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1em;
}

.label {
  font-weight: bold;
}

.map-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2em;
}

.map-card {
  box-shadow: var(--el-box-shadow-light);
  border-radius: var(--el-border-radius-base);
  padding: 1em;
  background-color: var(--el-bg-color-overlay);
  transition: all 0.3s ease;
}

.map-card:hover {
  box-shadow: var(--el-box-shadow);
  transform: translateY(-5px);
}

.map-title {
  text-align: center;
  margin: 0;
  padding-bottom: 0.5em;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.map-image-wrapper {
  position: relative;
  margin-top: 1em;
}

.point {
  background-color: var(--el-color-primary);
  color: var(--el-color-white);
  border-radius: 50%;
  width: 1.5em;
  height: 1.5em;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.8em;
  font-weight: bold;
  box-shadow: var(--el-box-shadow-lighter);
  transform: translate(-50%, -50%);
}
</style>
