<script setup lang="ts">
import aethercurrent from '@/resources/aethercurrent.json'

const exVersions = Array.from(new Set(aethercurrent.map(v => v.exVersion).sort().reverse()))

const groupById = aethercurrent.reduce((total, item) => {
  const group = total.find(v => v.id === item.id)
  if (group) {
    group.items.push(item)
  }
  else {
    total.push({
      id: item.id,
      name: item.name,
      exVersion: item.exVersion,
      items: [item],
    })
  }
  return total
}, [] as {
  id: string
  name: { ja: string, cn?: string }
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
}[])
const IMG_RAW_SIZE = 2048
const IMG_SHOW_SIZE = 512
const IMG_SCALE = IMG_SHOW_SIZE / IMG_RAW_SIZE
const selectExVersion = ref(exVersions[0])
</script>

<template>
  <div>
    <el-select
      v-model="selectExVersion" placeholder="Select ExVersion" size="large"
      style="font-weight: bold;width:15em"
    >
      <el-option v-for="version in exVersions" :key="version" :label="version" :value="version" />
    </el-select>
    <main flex="~ gap3 wrap">
      <div v-for="map in groupById.filter(v => v.exVersion === selectExVersion)" :key="map.id">
        <h2>{{ map.name.cn ?? map.name.ja }}</h2>
        <div style="position:relative;user-select: none">
          <img
            :style="{ width: `${IMG_SHOW_SIZE}px` }"
            :src="`https://xivapi.com/m/${map.id.split('/')[0]}/${map.id.replace('/', '.')}.jpg`"
          >
          <article>
            <div
              v-for="(item, index) in map.items.sort((a, b) => a.data - b.data)" :key="`${item.id}-${index}`" class="point" :style="{
                position: 'absolute', left: `${item.game.x * IMG_SCALE}px`, top: `${item.game.y * IMG_SCALE}px`,
              }"
            >
              {{ +index + 1 }}
            </div>
          </article>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped lang='scss'>
.point {
  display: block;
  color: white;
  background: green;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  transform: translate(-8px, -8px);
  text-align: center;
  line-height: 16px;
  font-size: 12px;
  font-weight: bold;
}

h2 {
  margin-bottom: 1px;
}
</style>
