<script setup lang="ts">
import { PtEnemies, type EnemyData } from '@/resources/pt'
import {
  addOverlayListener,
  removeOverlayListener,
} from '../../cactbot/resources/overlay_plugin_api'
import type { EnmityTargetCombatant, EventMap } from 'cactbot/types/event'

const mapIds = [1281, 1282, 1283, 1284, 1285, 1286, 1287, 1288, 1289, 1290]

const inPt = ref(false)

const tarIns = ref<EnmityTargetCombatant | null>(null)
const tarData = ref({} as EnemyData | undefined)

const handleEnmityTargetData: EventMap['EnmityTargetData'] = (e) => {
  tarIns.value = e.Target
  if (!e.Target?.BNpcNameID) {
    tarData.value = undefined
    return
  }
  tarData.value = PtEnemies[e.Target.BNpcNameID] || undefined
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
)

onMounted(() => {
  addOverlayListener('ChangeZone', handleChangeZone)
})

onUnmounted(() => {
  removeOverlayListener('ChangeZone', handleChangeZone)
})
</script>

<template>
  <CommonActWrapper>
    <div class="container" v-if="inPt && tarIns && tarData">
      <main class="main">
        <h3>{{ tarIns.Name }}({{ tarIns.BNpcNameID }})</h3>
        <ul>
          <li>难度：{{ tarData?.grade ?? '-' }}</li>
          <li>感知：{{ tarData?.detect ?? '-' }}</li>
          <li>攻略：{{ tarData?.note ?? '-' }}</li>
        </ul>
      </main>
    </div>
  </CommonActWrapper>
</template>

<style lang="scss" scoped>
$text-color: #fefefd;
$accent-color: #947b31;
$shadow-spread: 0.5px;
$shadow-blur: 2px;
$font-family: 'Microsoft YaHei', sans-serif;
$font-size: 20px;

.main {
  font-family: $font-family;
  font-size: $font-size;
  color: $text-color;

  text-shadow: $shadow-spread 0 $shadow-blur $accent-color,
    -$shadow-spread 0 $shadow-blur $accent-color,
    0 $shadow-spread $shadow-blur $accent-color,
    0 -$shadow-spread $shadow-blur $accent-color;

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
      color: darken($text-color, 20%);
    }
  }
}
</style>
