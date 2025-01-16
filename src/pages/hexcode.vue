<!-- eslint-disable vue/no-irregular-whitespace -->
<!-- eslint-disable no-irregular-whitespace -->
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
    )
    .replaceAll(/(<)(hex:[^>]+)(>)/g, '&lt;$2&gt;')
}

function onChange() {
  nextTick(() => {
    text.value = text.value.replaceAll(/\n/g, '<hex:02100103>')
    // handleReplace()
  })
}

function handleReplace() {
  text.value = text.value
    .replaceAll(/次に実行する1回のウェポンスキルの与ダメージが(\d+)％上昇する。/g, '效果时间内，自身发动的1次战技的伤害提高$1%')
    .replaceAll(/敵またはパーティメンバーひとりを対象とする。<hex:02100103>対象の目前まで素早く移動する。/g, '以一名敌人为目标，自身快速移动到目标身边')
    .replaceAll(/発動条件を満たすと(.+?)のいずれかに変化する。/g, '满足发动条件时，会变为$1中的一个')
    .replaceAll('この魔法は固有のリキャストタイマーを持ち、実行すると他のウェポンスキルと魔法にこのアクションと同じリキャストタイムが発生する。', '该魔法有单独计算的复唱时间，发动后其他战技与魔法会进入与该战技相同的复唱时间')
    .replaceAll('このウェポンスキルは固有のリキャストタイマーを持ち、実行すると他のウェポンスキルと魔法にこのアクションと同じリキャストタイムが発生する。', '该战技有单独计算的复唱时间，发动后其他战技与魔法会进入与该战技相同的复唱时间')
    .replaceAll('自身のリミットゲージを3秒分増加させる。', '自身的极限槽量值增加3秒')
    .replaceAll('このアクションは、対象が実行している防御の効果を無視してダメージを与える。', '该技能不受防御的效果影响')
    .replaceAll('このアクションはホットバーに登録することはできない。', '该技能无法设置到热键栏')
    .replaceAll(/<hex:024804F201F803><hex:024904F201F903>追加効果：<hex:0249020103><hex:0248020103>自身に<hex:024804F201F403><hex:024904F201F503>「(.+?)」<hex:0249020103><hex:0248020103>を付与する。/g, '<hex:024804F201F803><hex:024904F201F903>追加效果：<hex:0249020103><hex:0248020103><hex:024804F201F403><hex:024904F201F503>$1<hex:0249020103><hex:0248020103>　　　　　　　　　　　')
  // eslint-disable-next-line regexp/no-super-linear-backtracking
    .replaceAll(/発動条件を満たすと(.+?)が(.+?)に変化する。/g, '满足发动条件时，$1会变为$2')
    .replaceAll(/自身の与ダメージを(\d+)％上昇させる。/g, '自身发动攻击造成的伤害提高$1%')
    .replaceAll(/一定時間、/g, '一定时间内，')
    .replaceAll('対象が1体の場合は、威力が1.5倍になる。', '攻击单一目标时，威力提高至1.5倍')
    .replaceAll('自身のＭＰを回復する。', '恢复自身魔力')
    .replaceAll(/このアクションを実行すると(.{1,20}?)に変化する。/g, '该技能发动后变为$1')
    // .replaceAll('コンボ条件', '连击条件　')
    .replaceAll('コンボ条件', '连击条件')
    .replaceAll(/メインターゲットに(\d+)％ヘヴィを付与する。/g, '令主目标陷入$1%加重状态')
    .replaceAll('対象とその周囲の敵に範囲魔法攻撃。', '对目标及其周围的敌人发动范围魔法攻击')
    .replaceAll('対象とその周囲の敵に物理攻撃。', '对目标及其周围的敌人发动物理攻击')
    .replaceAll('メインターゲットにバインドを付与する。', '令主目标陷入止步状态')
    .replaceAll('この魔法は固有のリキャストタイマーを持つ。', '该魔法有单独计算的复唱时间')
    .replaceAll('このウェポンスキルは固有のリキャストタイマーを持つ。', '该战技有单独计算的复唱时间')
    .replaceAll('コンボ時かつ背面攻撃時威力', '连击中背面攻击威力　　　　')
    .replaceAll('コンボ時かつ側面攻撃時威力', '连击中侧面攻击威力　　　　')
    .replaceAll('コンボ時かつ背面攻撃時威力', '连击中背面威力　　　　　　')
    .replaceAll('コンボボーナス', '连击成功　　　')
    .replaceAll('コンボ時威力', '连击中威力　')
    .replaceAll(/<hex:02100103><hex:024804F201F803><hex:024904F201F903>バリア量：<hex:0249020103><hex:0248020103>(?:回復力|恢复力)(\d+)相当/g, '，该防护罩能够抵消相当于恢复力$1的伤害量　')
    .replaceAll('背面攻撃時威力', '背面攻击威力　')
    .replaceAll('側面攻撃時威力', '侧面攻击威力　')
    .replaceAll('対象に継続ダメージを付与する。', '持续伤害　　　　　　　　　　　')
    .replaceAll('対象に向かって前方扇範囲物理攻撃。', '向目标所在方向发出扇形范围物理攻击')
    .replaceAll('追加', '追加')
    .replaceAll('効果時間', '持续时间')
    .replaceAll('猛襲', '猛袭')
    .replaceAll('時間', '时间')
    .replaceAll('効果', '效果')
    .replaceAll('発動確率', '发动几率')
    .replaceAll('発動条件', '发动条件')
    .replace(/^対象に([火水氷雷风土光暗無])属性魔法攻撃。/, '对目标发动$1属性魔法攻击')
    .replace(/^対象とその周囲の敵に([火水氷雷风土光暗無])属性範囲魔法攻撃。/, '对目标及其周围的敌人发动$1属性范围魔法攻击')
    .replace(/^対象とその周囲の敵に([火水氷雷风土光暗無])属性範囲魔法攻撃。/, '对周围的敌人发动$1属性范围魔法攻击')
    .replace(/^対象に([火水氷雷风土光暗無])属性魔法攻撃。/, '对目标发动$1属性魔法攻击')
    .replaceAll('氷', '冰')
    .replaceAll('無', '无')
    .replaceAll('対象に物理攻撃。', '对目标发动物理攻击')
    .replaceAll('対象に魔法攻撃。', '对目标发动魔法攻击')
    .replaceAll('自身の周囲の敵に範囲物理攻撃。', '对自身周围的敌人发动范围物理攻击')
    .replaceAll('対象に向かって前方直線範囲物理攻撃。', '向目标所在方向发出直线范围物理攻击')
    .replaceAll(/2体目以降の対象への威力は(\d+)％減少する。/g, '攻击复数敌人时，对目标之外的敌人威力降低$1%')
    .replaceAll('対象に物理攻撃。', '对目标发动物理攻击')
    .replaceAll('対象とその周囲の敵に範囲物理攻撃。', '对目标及其周围敌人发动范围物理攻击')
    .replaceAll('このアクションは必ずクリティカルヒットかつダイレクトヒットする。', '该技能必定暴击并且直击')
    .replaceAll('クリティカルヒットやダイレクトヒットの発動率を上昇させる効果を受けている場合は与ダメージが上昇する。', '受暴击或直击发动率提高效果影响时，攻击造成的伤害提高')
    .replaceAll('回復力', '恢复力')
    .replaceAll('対象のＨＰを継続回復する。', '令目标体力持续恢复　　　　')
    .replaceAll('自身のＨＰを継続回復する。', '令自身体力持续恢复　　　　')
    .replaceAll('バインド中は実行不可。', '止步状态下无法发动')
    .replaceAll('クリティカルヒットやダイレクトヒットの発動率を上昇させる效果を受けている場合は与ダメージが上昇する。', '受暴击或直击发动率提高效果影响时，攻击造成的伤害提高　　　　　　　　　　　　　　　　　　　　　　　　')
    // .replaceAll('の', '的')
    .replaceAll(/自身对目标造成的伤害提高(\d+)%/g, '自身造成的伤害提高$1%')
    .replaceAll(/自身のウェポンスキルのリキャストタイムを(\d+)[％%] ?短縮させる。/g, '自身的自动攻击间隔、战技与魔法的咏唱及复唱时间缩短$1%')
    .replaceAll(/既に<hex:024804F201F403><hex:024904F201F503>「([^」]+)」<hex:0249020103><hex:0248020103>が付与されている場合は、その持续时间を(\d+)秒延長する。/g, '若已经附加<hex:024804F201F403><hex:024904F201F503>$1<hex:0249020103><hex:0248020103>状态，则持续时间延长$2秒')
    .replaceAll(/最大で(\d+)秒まで延長することができる。/g, '最多可延长至$1秒')
    .replaceAll('カルディア［被］の效果対象のＨＰを回復する。', '令带有关心状态的目标恢复体力')
    .replaceAll('作業効率', '作业效率')
    .replaceAll('加工効率', '加工效率')
    .replaceAll('または', '或')
    .replaceAll('の命中時', '命中时')
    .replaceAll('効率', '效率')
    .replaceAll('耐久を消費して、作業を進めると同時に品質を上げる。', '消耗耐久以推动作业进展，同时提高品质')
    .replaceAll('耐久を消費して、品質を上げる。CPを消費しないが成功率が低い。', '消耗耐久以提高制品品质<hex:02100103>不会消耗制作力，但是成功率比较低')
    .replaceAll('成功率', '成功率')
    // .replaceAll('％', '% ')
    .replaceAll('自身に「匠的好機」を付与する。', '工匠的良机　　　　　　　　　　')
    .replaceAll('対象に物理攻撃を与えつつ15m後方に飛び退く。', '对目标发动物理攻击同时后跳15米')
    .replaceAll(/次に実行する魔法のダメージと回復效果を(\d+)％上昇させる。/g, '下次发动魔法攻击造成的伤害和恢复效果提高$1%')
    .replaceAll(/最大スタック数：<hex:0249020103><hex:0248020103>(\d)/g, '最大档数：<hex:0249020103><hex:0248020103>$1　　　')
    .replaceAll(/最大チャージ数：<hex:0249020103><hex:0248020103>(\d)/g, '积蓄次数：<hex:0249020103><hex:0248020103>$1　　　')

    .replaceAll('ドシス', '注药')
    .replaceAll('アダースティング', '蛇刺')
    .replaceAll('グラビラ', '中重力')
    .replaceAll('グラビラ', '中重力')
    .replaceAll('エウクラシア・ドシスIII', '均衡注药III')
    .replaceAll('エウクラシア', '均衡')
    .replaceAll('カルディア', 'カルディア')
    .replaceAll('デプラスマン', '移转')
    .replaceAll('「祖霊降ろし」', '祖灵降临')
    .replaceAll('壱の牙【切創】', '壹之牙·切创')
    .replaceAll('弐の牙【猛襲】', '贰之牙·猛袭')
    .replaceAll('弐の牙【疾速】', '贰之牙·疾速')
    .replaceAll('参の牙【咬撃】', '叁之牙·咬击')
    .replaceAll('参の牙【咬裂】', '叁之牙·咬裂')
    .replaceAll('参の牙【噛砕】', '叁之牙·噬碎')
    .replaceAll('参の牙【噛殺】', '叁之牙·噬杀')
    .replaceAll('壱の蛇【惨毒】', '壹之蛇·惨毒')
    .replaceAll('壱の蛇【猛襲】', '壹之蛇·猛袭')
    .replaceAll('弐の蛇【疾速】', '贰之蛇·疾速')
    .replaceAll('飛蛇の尾', '飞蛇之尾')
    .replaceAll('祖霊の牙【壱】', '祖灵之牙·壹')
    .replaceAll('祖霊の牙【弐】', '祖灵之牙·贰')
    .replaceAll('祖霊の牙【参】', '祖灵之牙·叁')
    .replaceAll('祖霊の牙【肆】', '祖灵之牙·肆')
    .replaceAll('祖霊の大蛇牙', '祖灵大蛇牙')
    .replaceAll('蛇尾撃', '蛇尾击')
    .replaceAll('双牙連撃', '双牙连击')
    .replaceAll('双牙乱撃', '双牙乱击')
    .replaceAll('飛蛇連尾撃', '飞蛇连尾击')
    .replaceAll('飛蛇乱尾撃', '飞蛇乱尾击')
    .replaceAll('祖霊の蛇【壱】', '祖灵之蛇·壹')
    .replaceAll('祖霊の蛇【弐】', '祖灵之蛇·贰')
    .replaceAll('祖霊の蛇【参】', '祖灵之蛇·叁')
    .replaceAll('祖霊の蛇【肆】', '祖灵之蛇·肆')
    .replaceAll('追の牙', '追之牙')
    .replaceAll('蛇行', '蛇行')
    .replaceAll('蛇鱗術', '蛇鳞术')
    .replaceAll('蛇鱗撃', '蛇鳞击')
    .replaceAll('蛇鱗撃', '蛇鳞击')
    .replaceAll('大空喰らう蛇', '噬空之蛇')
    .replaceAll('レッドファイア', '赤红火炎')
    .replaceAll('グリーンエアロ', '翠绿疾风')
    .replaceAll('ブルーウォータ', '湛蓝流水')
    .replaceAll('シアンブリザド', '碧青冰结')
    .replaceAll('イエローストーン', '明黄飞石')
    .replaceAll('マゼンタサンダー', '品红闪雷')
    .replaceAll('ホワイトホーリー', '纯白神圣')
    .replaceAll('ブラックコメット', '漆黑彗星')
    .replaceAll('ピクトポンポン', '绒球意象')
    .replaceAll('ピクトウィング', '飞翼意象')
    .replaceAll('ピクトクロー', '利爪意象')
    .replaceAll('ピクトファング', '尖牙意象')
    .replaceAll('ピクトアニマル', '动物意象')
    .replaceAll('イマジンポンポン', '绒球具现')
    .replaceAll('イマジンウィング', '飞翼具现')
    .replaceAll('イマジンクロー', '利爪具现')
    .replaceAll('イマジンファング', '尖牙具现')
    .replaceAll('イマジンアニマル', '动物具现')
    .replaceAll('スマッジ', '晕彩')
    .replaceAll('テンペラコート', '坦培拉涂层')
    .replaceAll('テンペラグラッサ', '油性坦培拉')
    .replaceAll('サブトラクティブパレット', '减色技法')
    .replaceAll('サブトラクティブパレット解除', '减色技法解除')
    .replaceAll('ウォール・オブ・ファット', '胆固醇之墙')
    .replaceAll('スタープリズム', '星光棱镜')
    .replaceAll('スタープリズム', '星光棱镜')
    .replaceAll('マディーンレトリビューション', '马蒂恩之裁')
    .replaceAll('弐の牙【猛袭】', '贰之牙·猛袭')
    .replaceAll('壱の蛇【猛袭】', '壹之蛇·猛袭')
    .replaceAll('色魔法3実行可', '色彩魔法3预备')
    .replaceAll('色魔法2実行可', '色彩魔法2预备')
    .replaceAll('>かつ<', '>与<')
    .replaceAll(/[「」]/g, '')
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
