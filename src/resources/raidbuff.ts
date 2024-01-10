import { completeIcon, statusData } from "./status";

export type Raidbuff = {
  id: number;
  fullIcon: string;
  isFriendly: boolean;
  name: string;
};

const keigenns: (Omit<Raidbuff, "fullIcon"> & { fullIcon?: string })[] = [
  { id: 141, name: "战斗之声", isFriendly: true },
  { id: 2722, name: "光明神的最终乐章", isFriendly: true },
  { id: 3183, name: "夺取", isFriendly: false },
  { id: 2599, name: "神秘环", isFriendly: true },
  { id: 786, name: "战斗连祷", isFriendly: true },
  { id: 1910, name: "巨龙右眼", isFriendly: true },
  { id: 1454, name: "巨龙左眼", isFriendly: true },
  { id: 1185, name: "义结金兰：攻击", isFriendly: true },
  { id: 2703, name: "灼热之光", isFriendly: true },
  { id: 1221, name: "连环计", isFriendly: false },
  { id: 1297, name: "鼓励", isFriendly: true },
  { id: 1822, name: "技巧舞步结束", isFriendly: true },
  { id: 1825, name: "进攻之探戈", isFriendly: true },
  { id: 1878, name: "占卜", isFriendly: true },
];

const keigennMap: Map<string, Raidbuff> = new Map();

export type Server = "Chinese" | "Global";

export let loadedDataLang: Server | undefined = undefined;

export function loadRaidbuff(server: "Chinese" | "Global"): void {
  if (loadedDataLang !== server) {
    const sourceKeigenns = server === "Chinese" ? keigenns : Object.assign(keigenns, {});
    keigennMap.clear();
    for (const keigenn of sourceKeigenns) {
      const icon = statusData[keigenn.id][1];
      keigenn.fullIcon = completeIcon(icon);
      keigennMap.set(keigenn.id.toString(16).toUpperCase(), keigenn as Raidbuff);
    }
    loadedDataLang = server;
  }
}

loadRaidbuff("Chinese");

export function getRaidbuff(decId: string): Raidbuff | undefined {
  return keigennMap.get(decId);
}

const regFriendly = /(?:攻击力|伤害)提高/;
const regEnemy = /(?:耐性|防御力)(?:大幅)?(?:降低|提升|低下|下降)|受伤(?:加重|减轻)|体力(?:增加|衰减|减少)|伤害屏障/;

const createMap = (regExp: RegExp, isFriendly: boolean) =>
  Object.entries(statusData).reduce((map, [key, [name, icon]]) => {
    if (regExp.test(name)) {
      map.set(key, { name, icon, isFriendly });
    }
    return map;
  }, new Map());

export const universalVulnerableFriendly = createMap(regFriendly, true);
export const universalVulnerableEnemy = createMap(regEnemy, false);
