<template>
  <div id="warpper">
    <main :style="settings.style.main">
      <article></article>
    </main>
    <footer v-show="showSettings">
      <h1>设置</h1>
      <h4>外框</h4>
      <ul>
        <li v-for="(item, key) in settings.style.main" :key="key">{{ key }}<input type="text" v-model="settings.style.main[key]" /></li>
      </ul>
      <h4>内部</h4>
      <ul>
        <li v-for="(item, key) in settings.style.article" :key="key">
          {{ key }}<input type="text" v-model="settings.style.article[key]" />
        </li>
      </ul>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, watchEffect } from "vue";

const showSettings = ref(true);
const settings = reactive({
  style: {
    main: { width: "100px", height: "10px", border: "1px solid black" },
    article: { backgroundColor: "cornflowerblue" },
  },
});
(function loadSettings() {
  try {
    const _ = JSON.parse(localStorage.getItem("mpTickData") ?? "{}");
    if (_) {
      //@ts-ignore
      for (const key in settings.style) {
        //@ts-ignore
        for (const key2 in settings.style[key]) {
          //@ts-ignore
          settings.style[key][key2] = _?.style?.[key]?.[key2] ?? settings.style[key];
        }
      }
    }
  } catch {}
})();
watchEffect(() => {
  localStorage.setItem("mpTickData", JSON.stringify(settings));
});
let playerID: string;

document.addEventListener("onOverlayStateUpdate", (e: any) => (showSettings.value = !e.detail.isLocked));
addOverlayListener("ChangePrimaryPlayer", (e: any) => (playerID = e.charID.toString(16).toUpperCase()));
addOverlayListener("LogLine", (e: any) => (e.line[0] === "39" && e.line[2] === playerID && e.line[6] === e.line[7] ? anime() : ""));
startOverlayEvents();

function anime() {
  //   tick.classList.remove("anime");
  //   window.requestAnimationFrame(() => window.requestAnimationFrame(() => tick.classList.add("anime")));
}
</script>

<style lang="scss" scoped>
#warpper {
  > main {
    > article {
      //   transition-duration: 3s;
      background-size: 5px 5px;
    }
  }
}
</style>
