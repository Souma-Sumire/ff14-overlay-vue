<template>
  <div>
    <div><input type="file" name="" id="" @input="handleInput" /></div>
    <div>
      <ul>
        <li v-for="(l, i) in fileResult" :key="i" v-show="!l.result.every((e) => e.passed)">
          {{ l.key }}
          {{
            l.result.every((e) => e.passed)
              ? "全部通过"
              : l.result
                  .filter((f) => f.passed === false)
                  .map((e) => `${e.msg}${e.over}`)
                  .join("")
          }}
        </li>
      </ul>
    </div>
  </div>
  <main>
    <textarea name="" id="" cols="100" rows="5" v-model="text"></textarea>
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
const fileResult: Ref<{ key: string; result: Result[] }[]> = ref([]);
const text = useStorage("hexcode", "");
const message: Ref<Result[]> = ref([]);
function handleInput(e: any) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target?.result;
    if (text) {
      text
        .toString()
        .split("\n")
        .map((t: string, i: number) => {
          if (i <= 4) {
            return;
          }
          const [key, text] = t.split(",");
          if (key && text) {
            const result = test(key, text);
            console.log(result);
            fileResult.value.push({ key, result });
          }
        });
    }
  };
  reader.readAsText(file);
}

function test(key: string, text: string): Result[] {
  let lastIndex = 0;
  const result = [];
  while (lastIndex < text.length) {
    const hex02 = text.indexOf("<hex:02", lastIndex);
    const hexFF = text.indexOf("<hex:FF", lastIndex);
    if (hex02 === -1 && hexFF === -1) {
      break;
    }
    const hex = hex02 === -1 ? hexFF : hex02;
    const offset = hex === hexFF ? -2 : 0;
    if (hex02 !== -1) lastIndex = hex02 + 1;
    else if (hexFF !== -1) lastIndex = hexFF + 1;
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
        continue;
      } else if (b === "<" && after === "<hex:") {
        continue;
      } else if (/[\u0000-\u007f]/.test(b)) {
        byte += label ? 0.5 : 1;
        console.debug(b, "+" + label ? 0.5 : 1, `已数${byte}`);
      } else if (/[\ue000-\uf8ff\uff00-\uffef]/.test(b)) {
        byte += 3;
        console.debug(b, "+3", `已数${byte}`);
      } else {
        console.error(`未知的${key} ${b} \\u${b.charCodeAt(0).toString(16).padStart(4, "0")}`);
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
  }
  return result;
}

watchEffect(() => {
  message.value.length = 0;
  const result = test("input", text.value);
  message.value.push(...result);
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
