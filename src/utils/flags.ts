export enum DamageEffect {
  "dodge" = "闪避",
  "damage done" = "击中",
  "blocked damage" = "格挡",
  "parried damage" = "招架",
  "instant death" = "即死",
  // "special" = "特殊", // P10S 蛛网分摊E 宝石兽护盾9A0E 不死鸟4F50E

  "heal" = "治疗",
  "crit heal" = "暴击治疗",
}

export enum DamageProperties {
  "damage" = "普通",
  "crit damage" = "暴击",
  "direct hit damage" = "直击",
  "crit direct hit damage" = "直暴",
}

export enum DamageType {
  "physics" = "物理",
  "magic" = "魔法",
  "darkness" = "暗黑",
}

export function processFlags(flag: string) {
  const effect = processEffect(flag);
  const properties = processProperties(flag);
  const type = processType(flag);
  return { effect, properties, type };
}

// 0x01 = dodge
// 0x03 = damage done
// 0x05 = blocked damage
// 0x06 = parried damage
// 0x33 = instant death
// 0x000004 = heal
// 0x200004 = crit heal

function processEffect(flag: string): DamageEffect {
  switch (true) {
    case /1$/.test(flag):
      return DamageEffect["dodge"];
    case /3$/.test(flag):
      return DamageEffect["damage done"];
    case /5$/.test(flag):
      return DamageEffect["blocked damage"];
    case /6$/.test(flag):
      return DamageEffect["parried damage"];
    case /33$/.test(flag):
      return DamageEffect["instant death"];
    case /4$/.test(flag):
      return DamageEffect["heal"];
    case /2\w{4}4$/.test(flag):
      return DamageEffect["crit heal"];
    // case /E$/.test(flag):
    //   return DamageEffect["special"];
    default:
      throw new Error("Unknown effect flag " + flag);
  }
}

// 0x2000 = crit damage
// 0x4000 = direct hit damage
// 0x6000 = crit direct hit damage

function processProperties(flag: string): DamageProperties {
  switch (true) {
    case /2\w{3}$/.test(flag):
      return DamageProperties["crit damage"];
    case /4\w{3}$/.test(flag):
      return DamageProperties["direct hit damage"];
    case /6\w{3}$/.test(flag):
      return DamageProperties["crit direct hit damage"];
    default:
      return DamageProperties["damage"];
  }
}

// 0x50000 = magic
// 0x60000 = darkness

function processType(flag: string): DamageType {
  switch (true) {
    case /7?[123]\w{3}[35]$|[16]$/.test(flag):
      return DamageType["physics"];
    case /^E$/.test(flag):
    case /5\w{4}$/.test(flag):
      return DamageType["magic"];
    case /^(?:\d0)?3$/.test(flag):
    case /6\w{4}$/.test(flag):
      return DamageType["darkness"];
    default:
      throw new Error("Unknown type flag " + flag);
  }
}
// 0x10000 = 真无敌
// 0x4000 = 巨额伤害

// Unknown:

// 0x300
// 本次身上有盾有减伤被打了一下同时自动跳血了
// 21|2023-10-28T15:00:24.3770000+08:00|40008039|科库托斯|8150|unknown_8150|10513635|·老公|750303|17560000|1B|81508000|0|0|0|0|0|0|0|0|0|0|0|0|102334|112302|10000|10000|||99.45|93.25|0.00|1.09|29236846|36660084|10000|10000|||99.99|99.99|0.00|3.14|0000FFAB|0|1|6eafbe14defac4b5

// 0x600 = 似乎意味着存在护盾

const kShiftFlagValues = ["3E", "113", "213", "313"];
const kShiftFlagValues2 = ["A10", "E"];
const kHealFlags = ["04"];
const kFlagInstantDeath = "36";
const kAttackFlags = ["01", "03", "05", "06", kFlagInstantDeath];

export const processAbilityLine = (splitLine: string[]) => {
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
    amount: amount,
    lowByte: lowByte,
    flags: flags,
    isHeal: kHealFlags.includes(lowByte),
    isAttack: kAttackFlags.includes(lowByte),
  };
};

const UnscrambleDamage = (field?: string): number => {
  if (field === undefined) return 0;
  const len = field.length;
  if (len <= 4) return 0;
  // Get the left two bytes as damage.
  let damage = parseInt(field.slice(0, len - 4), 16);
  // Check for third byte == 0x40.
  if (field[len - 4] === "4") {
    // Wrap in the 4th byte as extra damage.  See notes above.
    const rightDamage = parseInt(field.slice(len - 2, len), 16);
    damage = damage - rightDamage + (rightDamage << 16);
  }
  return damage;
};
