<script setup lang="ts">
import type { Ref } from 'vue'

interface Result {
  msg: string
  passed: boolean
  over: string
  full: string
}
const utftext = ref('')
const utftext2 = ref('')
const utftextlength = ref(0)
const utftextlength2 = ref(0)
const text = useStorage('hexcode', '')
const message: Ref<Result[]> = ref([])
const differenceHex = ref('')

watchEffect(() => {
  utftextlength.value = getUtf8ByteLength(utftext.value)
  utftextlength2.value = getUtf8ByteLength(utftext2.value)
  // 十六进制差异
  differenceHex.value = (utftextlength.value - utftextlength2.value).toString(16).toUpperCase()
})

function getUtf8ByteLength(str: string) {
  let totalLength = 0
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i)
    if (charCode < 0x80)
      totalLength += 1
    else if (charCode < 0x800)
      totalLength += 2
    else if (charCode < 0x10000)
      totalLength += 3
    else if (charCode < 0x200000)
      totalLength += 4
  }
  return totalLength
}

function test(text: string): Result[] {
  let lastIndex = 0
  const result = []
  while (lastIndex < text.length) {
    const hex02 = text.indexOf('<hex:02', lastIndex)
    if (hex02 === -1)
      break

    lastIndex = hex02 + 1
    const short = text.slice(lastIndex - 1, lastIndex + 9)
    if (short === '<hex:0203>') {
      break
    }
    const code = text.slice(lastIndex + 6, lastIndex + 8)
    const len16 = text.slice(lastIndex + 8, lastIndex + 10)
    const len10 = Number.parseInt(len16, 16)
    const msg = `指令${code} 长度${len16}(${len10})`
    let i = 0
    let byte = 0
    let label = true
    let colon = true
    for (; byte < len10; i++) {
      const b = text[hex02 + i + 11]
      const after = text.slice(hex02 + i + 11, hex02 + i + 11 + 5)
      if (b === undefined)
        break

      if (b === '<') {
        label = true
        colon = false
      }
      if (label && !colon) { /* empty */ }
      else if (b === '>' && colon) { /* empty */ }
      else if (b === '<' && after === '<hex:') { /* empty */ }
      else {
        const l = getUtf8ByteLength(b)
        byte += label ? l / 2 : l
      }
      if (b === ':')
        colon = true

      if (b === '>') {
        label = false
        colon = false
      }
    }
    const over = text.slice(lastIndex + i + 3, lastIndex + i + 11)
    const full = text.slice(lastIndex + 10, lastIndex + 10 + i)
    result.push({ passed: over.endsWith('03>'), over, msg, full })
    // break;
  }
  return result
}

watchEffect(() => {
  message.value.length = 0
  text.value.split('\n').forEach((v) => {
    const result = test(v)
    message.value.push(...result)
  })
})

function format(str: string) {
  return str
    .replaceAll('<hex:024804F201F803><hex:024904F201F903>', '<span style="color:#00cc22;">')
    .replaceAll('<hex:024804F201FA03><hex:024904F201FB03>', '<span style="color:#ffff66;">')
    .replaceAll('<hex:0249020103><hex:0248020103>', '</span>')
    .replaceAll('<hex:02100103>', '<br>')
    .replaceAll(
      '<hex:024804F201F403><hex:024904F201F503>',
      '<span style="color:#ff7b1a;">',
    ).replaceAll(/(<)(hex:[^>]+)(>)/g, '&lt;$2&gt;')
}

function onChange() {
  nextTick(() => {
    text.value = text.value.replaceAll(/\n/g, '<hex:02100103>')
  })
}

function handleReplace() {
  text.value = text.value
    .replaceAll('追加', '追加')
    .replaceAll('効果時間', '持续时间')
    .replaceAll('時間', '时间')
    .replaceAll('効果', '效果')
    .replaceAll('発動確率', '发动几率')
    .replaceAll('発動条件', '发动条件')
    .replace(/^対象に([火水氷雷风土光暗])属性魔法攻撃。/, '对目标发动$1属性魔法攻击')
    .replace(/^対象とその周囲の敵に([火水氷雷风土光暗])属性範囲魔法攻撃。/, '对目标及其周围的敌人发动$1属性范围魔法攻击')
    .replace(/^対象とその周囲の敵に([火水氷雷风土光暗])属性範囲魔法攻撃。/, '对周围的敌人发动$1属性范围魔法攻击')
    .replaceAll('氷', '冰')
    .replaceAll('自身の周囲の敵に範囲物理攻撃。', '对自身周围的敌人发动范围物理攻击')
    .replaceAll('対象に物理攻撃。', '对目标发动物理攻击')
    .replaceAll('回復力', '恢复力')
    .replaceAll('回復力', '恢复力')
    .replaceAll('対象のＨＰを継続回復する。', '令目标体力持续恢复　　　　')
    .replaceAll('自身のＨＰを継続回復する。', '令自身体力持续恢复　　　　')
    .replaceAll('クリティカルヒットやダイレクトヒットの発動率を上昇させる效果を受けている場合は与ダメージが上昇する。', '受暴击或直击发动率提高效果影响时，攻击造成的伤害提高　　　　　　　　　　　　　　　　　　　　　　　　')
    .replaceAll('の', '的')
}
</script>

<template>
  <main>
    <h2>UTF8长度计算</h2>
    <textarea id="" v-model="utftext" name="" cols="100" rows="1" />
    {{ utftextlength }}
    <textarea id="" v-model="utftext2" name="" cols="100" rows="1" />
    {{ utftextlength2 }}
    <p>UTF8长度差异（十六进制）：{{ differenceHex }}</p>
    <h2>{{ `指令码检测（不包括FFXX>）` }}</h2>
    <div style="min-height:2em;height: 100%;width:35em;border:1px solid #ccc;padding:0.5em; background-color:#333;color:white;font-family:'宋体';font-size: 16px;" v-html="format(text)" />
    <textarea id="" v-model="text" m-b-2 m-t-2 name="" cols="100" rows="5" @keyup="onChange" />
    <button @click="handleReplace">
      一键替换日文
    </button>
    <article>
      {{ message.every((m) => m.passed) ? "02开头指令全部通过" : "可能有错误" }}
      <ul>
        <li v-for="(m, i) in message" :key="i">
          <span :style="{ color: m.passed ? 'black' : 'red' }">{{ `${m.passed ? "通过" : `错误`} ${m.msg} ${m.full}` }}</span>
        </li>
      </ul>
    </article>
  </main>
</template>

<style scoped lang="scss">
textarea {
  font-size: 18px;
}
main {
  font-size: 12px;
}
</style>
