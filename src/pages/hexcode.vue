<template>
  <main>
    <h2>UTF8长度计算</h2>
    <textarea name="" id="" cols="100" rows="5" v-model="utftext" wrap="off"></textarea>
    <p>{{ utftextlength }}</p>
    <h2>{{ `<hex:02开头检测` }}</h2>
    <textarea name="" id="" cols="100" rows="5" v-model="text" wrap="off"></textarea>
    <article>
      {{ message.every((m) => m.passed) ? "全部通过" : "有错误" }}
      <ul>
        <li v-for="(m, i) in message" :key="i">
          <span :style="{ color: m.passed ? 'black' : 'red' }">{{ `${m.passed ? "通过" : `错误`} ${m.msg} ${m.full}` }}</span>
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
  full: string;
}
const utftext = ref("");
const utftextlength = ref(0);
const text = useStorage("hexcode", "");
const message: Ref<Result[]> = ref([]);

watchEffect(() => {
  utftextlength.value = getUtf8ByteLength(utftext.value);
});

function getUtf8ByteLength(str: string) {
  let totalLength = 0;
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    if (charCode < 0x80) {
      totalLength += 1;
    } else if (charCode < 0x800) {
      totalLength += 2;
    } else if (charCode < 0x10000) {
      totalLength += 3;
    } else if (charCode < 0x200000) {
      totalLength += 4;
    }
  }
  return totalLength;
}

function test(text: string): Result[] {
  let lastIndex = 0;
  const result = [];
  while (lastIndex < text.length) {
    const hex02 = text.indexOf("<hex:02", lastIndex);
    if (hex02 === -1) {
      break;
    }
    lastIndex = hex02 + 1;
    const code = text.slice(lastIndex + 6, lastIndex + 8);
    const len16 = text.slice(lastIndex + 8, lastIndex + 10);
    const len10 = parseInt(len16, 16);
    const msg = `指令${code} 长度${len16}(${len10})`;
    let i = 0;
    let byte = 0;
    let label = true;
    let colon = true;
    for (; byte < len10; i++) {
      const b = text[hex02 + i + 11];
      const after = text.slice(hex02 + i + 11, hex02 + i + 11 + 5);
      if (b === undefined) {
        break;
      }
      if (b === "<") {
        label = true;
        colon = false;
      }
      if (label && !colon) { /* empty */ } else if (b === ">" && colon) { /* empty */ } else if (b === "<" && after === "<hex:") { /* empty */ } else {
        const l = getUtf8ByteLength(b);
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
    const over = text.slice(lastIndex + i + 3, lastIndex + i + 11);
    const full = text.slice(lastIndex + 10, lastIndex + 10 + i);
    result.push({ passed: over.endsWith("03>"), over, msg, full });
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
