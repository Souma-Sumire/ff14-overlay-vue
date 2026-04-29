import type { DamageType } from "./flags";
import type { Keigenn, Status } from "@/types/keigennRecord2";
import { keigenns } from "../resources/keigenn";
import { completeIcon, statusData } from "../resources/logic/status";

const keigennMap: Map<string, Keigenn> = new Map();

for (const keigenn of keigenns) {
  const statusEntry = statusData[keigenn.id];
  if (!statusEntry) {
    console.warn(`[keigenn] Missing status data for id ${keigenn.id} (${keigenn.name})`);
    keigenn.fullIcon = completeIcon(0);
  } else {
    keigenn.fullIcon = completeIcon(statusEntry[1]);
  }
  keigennMap.set(keigenn.id.toString(16).toUpperCase().padStart(2, "0"), keigenn as Keigenn);
}

export function getKeigenn(decId: string): Keigenn | undefined {
  const keigenn = keigennMap.get(decId);
  // 浅拷贝一次，避免修改原对象的属性。
  if (!keigenn) return undefined;
  return { ...keigenn };
}

export function multiplierEffect(
  status: Status,
  damageType: DamageType,
): "useful" | "unuseful" | "half-useful" {
  if (status.type === "absorbed" || damageType === "heal") {
    // 护盾类技能、治疗永远有效
    return "useful";
  } else if (damageType === "dot" || damageType === "darkness") {
    // DOT、真实伤害永远无效
    return "unuseful";
  }
  if (
    // 真无敌
    (status.performance.darkness === 0 &&
      status.performance.magic === 0 &&
      status.performance.physics === 0) ||
    // 死斗、行尸走肉
    (status.performance.darkness === 1 &&
      status.performance.magic === 1 &&
      status.performance.physics === 1)
  ) {
    return "useful";
  }

  const other = damageType === "physics" ? "magic" : "physics";
  // 半效减伤
  const a = (100 - status.performance[damageType] * 100) * 2;
  const b = 100 - status.performance[other] * 100;
  if (a === b) return "half-useful";

  // 1=没减伤，0=完全100%减伤
  return status.performance[damageType] === 1 ? "unuseful" : "useful";
}

const regFriendly =
  /(?:耐性|防御力)(?:大幅)?(?:降低|提升|低下|下降)|受伤(?:加重|减轻)|体力(?:增加|衰减|减少)|伤害屏障/;
const regEnemy = /(?:精神|力量|灵巧|智力){1,2}(?:大幅)?降低/;

function createMap(regExp: RegExp, isFriendly: boolean) {
  return Object.entries(statusData).reduce((map, [key, [name, icon]]) => {
    if (regExp.test(name)) map.set(key, { name, icon, isFriendly });

    return map;
  }, new Map());
}

export const universalVulnerableFriendly = createMap(regFriendly, true);
export const universalVulnerableEnemy = createMap(regEnemy, false);
