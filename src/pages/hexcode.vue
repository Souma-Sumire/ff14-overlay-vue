<template>
  <main>
    <textarea name="" id="" cols="100" rows="5" v-model="text" wrap="off"></textarea>
    <article>
      <ul>
        <li v-for="(m, i) in message" :key="i">
          <span :style="{ color: m.passed ? 'black' : 'red' }">{{ `${m.msg} ${m.passed ? "通过" : `错误${m.over}`}` }}</span>
        </li>
      </ul>
    </article>
  </main>
</template>

<script setup lang="ts">
import { Ref } from "vue";
interface Result {
  msg: string;
  passed: boolean;
  over: string;
}
const text = useStorage("hexcode", "");
const message: Ref<Result[]> = ref([]);

function getUnicode(s: string): number {
  switch (true) {
    case /[\u0000-\u007f]/.test(s):
      return 1;
    case /[\u0080-\u00ff]/.test(s):
    case /[\u0100-\u017f]/.test(s):
    case /[\u0300-\u036f]/.test(s):
    case /[\u0370-\u03ff]/.test(s):
    case /[\u0400-\u04ff]/.test(s):
    case /[\u2000-\u206f]/.test(s):
    case /[\u2070-\u209f]/.test(s):
    case /[\u20a0-\u20cf]/.test(s):
    case /[\u2100-\u214f]/.test(s):
    case /[\u2150-\u218f]/.test(s):
    case /[\u2190-\u21ff]/.test(s):
    case /[\u2200-\u22ff]/.test(s):
    case /[\u2300-\u23ff]/.test(s):
    case /[\u2460-\u24ff]/.test(s):
    case /[\u2500-\u257f]/.test(s):
    case /[\u25a0-\u25ff]/.test(s):
    case /[\u2600-\u26ff]/.test(s):
    case /[\u2700-\u27bf]/.test(s):
    case /[\u3000-\u303f]/.test(s):
    case /[\u3040-\u309f]/.test(s):
    case /[\u30a0-\u30ff]/.test(s):
    case /[\u3200-\u32ff]/.test(s):
    case /[\u3300-\u33ff]/.test(s):
    case /[\u4e00-\u9fff]/.test(s):
    case /[\ue000-\uf8ff]/.test(s):
    case /[\uff00-\uffef]/.test(s):
      return 3;
    default:
      console.error(`未知的${s} \\u${s.charCodeAt(0).toString(16).padStart(4, "0")}`);
      throw new Error("Unexpected unicode range");
  }
}

function test(text: string): Result[] {
  let lastIndex = 0;
  const result = [];
  while (lastIndex < text.length) {
    const hex02 = text.indexOf("<hex:02", lastIndex);
    const hexFF = text.indexOf("FF", lastIndex);
    if (hex02 === -1 && hexFF === -1) {
      break;
    }
    const hex = [hex02, hexFF].filter((v) => v >= 0).sort((a, b) => a - b)[0];
    const offset = hex === hex02 ? 0 : -7;
    if (hex === hex02) lastIndex = hex02 + 1;
    else if (hex === hexFF) lastIndex = hexFF + 1;
    else throw new Error("Unexpected");
    const code = text.slice(lastIndex + 6 + offset, lastIndex + 8 + offset);
    const len16 = text.slice(lastIndex + 8 + offset, lastIndex + 10 + offset);
    const len10 = parseInt(len16, 16);
    const msg = `指令${code} 长度${len16}(${len10})`;
    let i = 0;
    let byte = 0;
    let label = true;
    let colon = true;
    for (; byte < len10; i++) {
      const b = text[hex + offset + i + 11];
      const after = text.slice(hex + offset + i + 11, hex + offset + i + 11 + 5);
      if (b === undefined) {
        break;
      }
      if (b === "<") {
        label = true;
        colon = false;
      }
      if (label && !colon) {
      } else if (b === ">" && colon) {
      } else if (b === "<" && after === "<hex:") {
      } else {
        const l = getUnicode(b);
        byte += label ? l / 2 : l;
        console.debug(b, "+" + (label ? l / 2 : l), `已数${byte}`);
      }
      if (b === ":") {
        colon = true;
      }
      if (b === ">") {
        label = false;
        colon = false;
      }
    }
    const over = text.slice(lastIndex + offset + i + 3, lastIndex + offset + i + 11);
    result.push({ passed: over.endsWith("03>") || over.startsWith("<hex:FF"), over, msg });
    // break;
  }
  return result;
}

watchEffect(() => {
  message.value.length = 0;
  text.value.split("\n").forEach((v) => {
    const result = test(v);
    message.value.push(...result);
  });
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
