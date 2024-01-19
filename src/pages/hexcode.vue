<template>
  <main>
    <textarea name="" id="" cols="100" rows="5" v-model="text"></textarea>
    <article>
      <ul>
        <li v-for="(m, i) in message" :key="i">
          <span :style="{ color: m.endsWith('通过') ? 'black' : 'red' }">{{ m }}</span>
        </li>
      </ul>
    </article>
  </main>
</template>

<script setup lang="ts">
import { Ref } from "vue";

const text = useStorage("hexcode", "");
const message: Ref<string[]> = ref([]);
watchEffect(() => {
  console.clear();
  let lastIndex = 0;
  message.value.length = 0;
  while (lastIndex < text.value.length) {
    const msg: string[] = [];
    const hex02 = text.value.indexOf("<hex:02", lastIndex);
    const hexFF = text.value.indexOf("<hex:FF", lastIndex);
    if (hex02 === -1 && hexFF === -1) {
      break;
    }
    const hex = hex02 === -1 ? hexFF : hex02;
    const offset = hex === hexFF ? -2 : 0;
    if (hex02 !== -1) lastIndex = hex02 + 1;
    else if (hexFF !== -1) lastIndex = hexFF + 1;
    const code = text.value.slice(lastIndex + 6 + offset, lastIndex + 8 + offset);
    const len16 = text.value.slice(lastIndex + 8 + offset, lastIndex + 10 + offset);
    const len10 = parseInt(len16, 16);
    msg.push(`指令${code} 长度${len16}(${len10})`);
    let i = 0;
    let byte = 0;
    let label = true;
    let colon = true;
    for (; byte < len10; i++) {
      const q = text.value[hex + 11 + offset + i - 1];
      const b = text.value[hex + 11 + offset + i];

      if (b === ">") {
        label = false;
        colon = false;
      }
      if (b === "<") {
        label = true;
        colon = false;
      }
      if (label && !colon) {
      } else if (/\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3010|\u3011|\u007e/.test(b)) {
        byte += 3;
        console.debug(b, "+3", `已数${byte}`);
      } else if (/[\u4e00-\u9fa5\u0800-\u4e00]/.test(b)) {
        byte += 3;
        console.debug(b, "+3", `已数${byte}`);
      } else if (/[a-zA-Z0-9!"#$%&'()*+,-./:;=?@\[\]\^_{\|}~]/.test(b)) {
        byte += label ? 0.5 : 1;
        console.debug(b, label ? "+0.5" : "+1", `已数${byte}`);
      } else if (b === ">" || b === "<") {
        console.debug(b, "+0", `跳过`);
      } else throw new Error("error: " + b);
      if (b === ":") {
        colon = true;
      }
    }
    const over = text.value.slice(lastIndex + offset + i + 3, lastIndex + offset + i + 11);
    msg.push(over.endsWith("03>") || over.startsWith("<hex:FF") ? "通过" : `失败（${over}）`);

    message.value.push(msg.join(" "));
  }
});
</script>

<style scoped lang="scss">
textarea {
  font-size: 18px;
}
main {
  font-size: 12px;
}
</style>
