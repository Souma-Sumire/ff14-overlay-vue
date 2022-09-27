<script setup lang="ts">
import zoneInfo from "@/resources/zoneInfo";
import { useMacroStore } from "@/store/macro";
import { PPJSON } from "@/types/Macro";

const markMap = {
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  One: "1",
  Two: "2",
  Three: "3",
  Four: "4",
};
const macroStore = useMacroStore();
const zoneOffsetX = computed(() => zoneInfo[Number(macroStore.selectZone)].offsetX);
const zoneOffsetY = computed(() => zoneInfo[Number(macroStore.selectZone)].offsetY);
const { place } = defineProps<{ place: PPJSON }>();
const placeInfo = reactivePick(place, ["A", "B", "C", "D", "One", "Two", "Three", "Four"]);
</script>

<template>
  <div h200px w200px style="position: relative; background-color: rgba(214, 199, 148, 1)">
    <div
      v-for="(mark, key) in placeInfo"
      :key="key"
      class="markIcon"
      :class="'markIcon' + key"
      :style="{
        left: Math.min(200, Math.max(0, (Number(mark.X) + Number(zoneOffsetX)) * 3 + 100)) + 'px',
        top: Math.min(200, Math.max(0, (Number(mark.Z) + Number(zoneOffsetY)) * 3 + 100)) + 'px',
      }"
    >
      {{ mark.Active ? markMap[key] ?? key : "" }}
    </div>
  </div>
</template>
<style lang="scss" scoped>
.markIcon {
  position: absolute;
  text-align: center;
  transform: translate(-50%, -50%);
  font-size: 21px;
  font-weight: bold;
  color: white;
  -webkit-text-stroke: 1px rgba(50, 50, 50, 1);
  z-index: 10;
  overflow: hidden;
  padding: 5px;
}
$color1: rgba(255, 0, 0, 1);
$color2: rgba(255, 255, 0, 1);
$color3: rgba(0, 0, 255, 1);
$color4: rgba(128, 0, 128, 1);
.markIconA,
.markIconOne {
  text-shadow: 0 0 1px $color1, 0 0 2px $color1, 0 0 3px $color1;
}
.markIconB,
.markIconTwo {
  text-shadow: 0 0 1px $color2, 0 0 2px $color2, 0 0 3px $color2;
}
.markIconC,
.markIconThree {
  text-shadow: 0 0 1px $color3, 0 0 2px $color3, 0 0 3px $color3;
}
.markIconD,
.markIconFour {
  text-shadow: 0 0 1px $color4, 0 0 2px $color4, 0 0 3px $color4;
}
</style>
