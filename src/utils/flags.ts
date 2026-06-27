type DamageEffect =
  | "dodge" // 闪避
  | "damage done" // 击中
  | "blocked damage" // 格挡
  | "parried damage" // 招架
  | "instant death" // 即死
  | "heal"; // 治疗

type DamageProperties =
  | "damage" // 普通
  | "crit damage" // 暴击
  | "direct hit damage" // 直击
  | "crit direct hit damage" // 直暴;
  | "crit heal"; // 暴击治疗

type DamageType =
  | "physics" // 物理
  | "magic" // 魔法
  | "darkness" // 暗黑;
  | "dot"
  | "heal";

function processFlags(flag: string) {
  const effect = processEffect(flag);
  const properties = processProperties(flag);
  const type = effect === "heal" ? "heal" : processType(flag);
  return { effect, properties, type };
}

// 0x01 = dodge (闪避/未击中)
// 0x02 = fully resisted (完全抵抗，如控制技能被免疫)
// 0x03 = damage done (正常造成伤害)
// 0x05 = blocked damage (格挡伤害)
// 0x06 = parried damage (招架伤害)
// 0x07 = invulnerable (无效伤害/无敌免疫)
// 0x08 = no effect (无效果)
// 0x0a = mp loss (消耗/扣除 MP)
// 0x0b = mp gain (恢复 MP)
// 0x0e = status applied to target (目标被施加状态)
// 0x0f = status applied to caster (自身被施加状态)
// 0x10 = status removed (状态解除/消失)
// 0x14 = status no effect (状态未生效)
// 0x18 = aggro increase (仇恨增加)
// 0x33 = instant death (即死)
// 0x000004 = heal (治疗)
// 0x200004 = crit heal (暴击治疗)

function processEffect(flag: string): DamageEffect {
  switch (true) {
    case flag.endsWith("33"):
      return "instant death";
    case flag.endsWith("1"):
      return "dodge";
    case flag.endsWith("3"):
      return "damage done";
    case flag.endsWith("4"):
      return "heal";
    case flag.endsWith("5"):
      return "blocked damage";
    case flag.endsWith("6"):
      return "parried damage";
    default:
      return "damage done";
  }
}

// 0x2000 = crit damage
// 0x4000 = direct hit damage
// 0x6000 = crit direct hit damage

function processProperties(flag: string): DamageProperties {
  switch (true) {
    case /2\w{4}4$/.test(flag):
      return "crit heal";
    case /2\w{3}$/.test(flag):
      return "crit damage";
    case /4\w{3}$/.test(flag):
      return "direct hit damage";
    case /6\w{3}$/.test(flag):
      return "crit direct hit damage";
    default:
      return "damage";
  }
}

// 0x50000 = magic
// 0x60000 = darkness
// 740003  = Shot (physics?)?

function processType(flag: string): DamageType {
  switch (true) {
    case /7?[1-4]\w{3}[35]$/.test(flag):
    case /[16]$/.test(flag):
      return "physics";
    case /^E$/.test(flag):
    case /5\w{4}$/.test(flag):
      return "magic";
    case /^(?:\d0)?3$/.test(flag):
    case /6\w{4}$/.test(flag):
      return "darkness";
    default:
      return "physics";
  }
}
// 0x10000 = 真无敌
// 0x4000 = 巨额伤害

// Unknown:

// 0x300

// 0x600 = 似乎意味着存在护盾

const kShiftFlagValues = ["3E", "113", "213", "313"];
const kShiftFlagValues2 = ["A10", "E"];
const kHealFlags = ["04"];
const kFlagInstantDeath = "36";
const kAttackFlags = ["01", "03", "05", "06", kFlagInstantDeath];

// 占星的小宇宙（ID: 0x1647）治疗时，21/22 (ActionEffect) 行的伤害字段通常为 0，且 Flag 为 3D。
// 真正的治疗数值会记录在紧随其后的 24 (DoTHoT) 行中，对应 StatusID 为 A9E。

function processAbilityLine(splitLine: string[]) {
  const flagIdx = 8;
  let offset = 0;
  let flags = splitLine[flagIdx] ?? "";
  let damage = splitLine[flagIdx + 1] ?? "";
  if (kShiftFlagValues.includes(flags)) {
    offset += 2;
    flags = splitLine[flagIdx + offset] ?? flags;
    damage = splitLine[flagIdx + offset + 1] ?? damage;
  }
  if (kShiftFlagValues2.includes(flags)) {
    offset += 2;
    flags = splitLine[flagIdx + offset] ?? flags;
    damage = splitLine[flagIdx + offset + 1] ?? damage;
  }
  const amount = UnscrambleDamage(damage);
  const lowByte = `00${flags}`.slice(-2);
  return {
    amount,
    lowByte,
    flags,
    isHeal: kHealFlags.includes(lowByte),
    isAttack: kAttackFlags.includes(lowByte),
  };
}

function UnscrambleDamage(field?: string): number {
  if (field === undefined) return 0;
  const len = field.length;
  if (len <= 4) return 0;
  // Get the left two bytes as damage.
  let damage = Number.parseInt(field.slice(0, len - 4), 16);
  // Check for third byte == 0x40.
  if (field[len - 4] === "4") {
    // Wrap in the 4th byte as extra damage.  See notes above.
    const rightDamage = Number.parseInt(field.slice(len - 2, len), 16);
    damage = damage - rightDamage + (rightDamage << 16);
  }
  return damage;
}

export {
  type DamageEffect,
  type DamageProperties,
  type DamageType,
  processAbilityLine,
  processFlags,
  UnscrambleDamage,
};
