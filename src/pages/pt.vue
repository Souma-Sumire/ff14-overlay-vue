<script setup lang="ts">
import { PtEnemies, type EnemyData } from '@/resources/pt'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'
import type { EnmityTargetCombatant, EventMap } from 'cactbot/types/event'

const mapIds = [1281, 1282, 1283, 1284, 1285, 1286, 1287, 1288, 1289, 1290]

const inPt = useStorage('inPt', false)

const tarIns = ref<EnmityTargetCombatant | null>(null)
const tarData = ref({} as EnemyData | undefined)

const handleEnmityTargetData: EventMap['EnmityTargetData'] = (e) => {
  if (e.Target) {
    tarIns.value = e.Target
    tarData.value = PtEnemies[e.Target.BNpcNameID]
  } else {
    tarIns.value = null
    tarData.value = undefined
  }
}

const handleChangeZone: EventMap['ChangeZone'] = (e) => {
  inPt.value = mapIds.includes(e.zoneID)
}

watch(
  inPt,
  () => {
    ;(inPt.value ? addOverlayListener : removeOverlayListener)(
      'EnmityTargetData',
      handleEnmityTargetData
    )
  },
  {
    immediate: true,
  }
)

onMounted(() => {
  addOverlayListener('ChangeZone', handleChangeZone)
})

onUnmounted(() => {
  removeOverlayListener('ChangeZone', handleChangeZone)
})

const getEmoji = (str: string = '未知') => {
  const s = str ?? ''
  return {
    视觉: '👁️',
    听觉: '👂',
    范围: '⭕',
    简单: '🟢',
    中等: '🟡',
    困难: '🔴',
    危险: '🚨',
    小心: '⚠️',
    未知: '❔︎',
  }[s]
}
</script>

<template>
  <CommonActWrapper>
    <div class="container" v-if="inPt">
      <main class="main">
        <h3 v-show="tarIns">{{ tarIns?.Name }}({{ tarIns?.BNpcNameID }})</h3>
        <ul v-show="tarData">
          <li>评级：{{ getEmoji(tarData?.grade) }}{{ tarData?.grade }}</li>
          <li>索敌：{{ getEmoji(tarData?.detect) }}{{ tarData?.detect }}</li>
          <li>笔记：{{ tarData?.note || '无' }}</li>
        </ul>
      </main>
    </div>
  </CommonActWrapper>
</template>

<style lang="scss" scoped>
@use 'sass:color';
$text-color: #fefefd;
$accent-color: #947b31;
$shadow-spread: 1.5px;
$shadow-blur: 2.5px;
$font-family: 'Microsoft YaHei', sans-serif;
$font-size: 20px;

.main {
  font-family: $font-family;
  font-size: $font-size;
  color: $text-color;

  text-shadow: $shadow-spread 0 $shadow-blur $accent-color,
    -$shadow-spread 0 $shadow-blur $accent-color,
    0 $shadow-spread $shadow-blur $accent-color,
    0 - $shadow-spread $shadow-blur $accent-color;

  h3 {
    padding: 5px;
    border-bottom: 1px solid rgba($accent-color, 0.5);
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    line-height: 1.4;
    padding: 2px 0;

    &::before {
      content: '◈';
      color: color.adjust($text-color, $lightness: -20%);
    }
  }
}
</style>
