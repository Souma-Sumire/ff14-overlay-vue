import type { BeastCoord } from "./communityCoords";

export interface SubstituteRuleFate {
  eventName: string;
  mobName: string;
  mapId: number;
  coords: BeastCoord[];
  level?: string;
  summary?: string;
}

export interface SubstituteRuleLeve {
  eventName: string;
  mobName: string;
  mapId: number;
  coords: BeastCoord[];
  level?: string;
  summary?: string;
}

export interface SubstituteRuleDungeon {
  summary: string;
  mobName: string;
  level?: string;
}

export interface SubstituteRule {
  guildhests?: string[];
  fates?: SubstituteRuleFate[];
  leves?: SubstituteRuleLeve[];
  dungeons?: SubstituteRuleDungeon[];
  bnpcIds?: string[];
}

export const substituteRules: Record<number, SubstituteRule> = {
  10: {
    fates: [
      {
        eventName: "大胡蜂和黄衫队",
        mobName: "胡蜂王",
        mapId: 15,
        coords: [{ x: 14.0, y: 15.0 }],
        level: "13",
      },
    ],
    bnpcIds: ["893", "953", "1983", "641"],
  },
  18: {
    guildhests: ["2"],
    fates: [
      {
        eventName: "无头骑士——波克曼",
        mobName: "波克曼",
        mapId: 5,
        coords: [{ x: 27.3, y: 22.1 }],
        level: "20",
      },
    ],
  },
  25: {
    guildhests: ["4"],
  },
  31: {
    guildhests: ["3"],
  },
  38: {
    fates: [
      {
        eventName: "狂暴巨兽——强化奇美拉",
        mobName: "强化奇美拉",
        mapId: 53,
        coords: [{ x: 31.4, y: 7.3 }],
        level: "49",
      },
    ],
  },
  39: {
    guildhests: ["9"],
  },
  40: {
    guildhests: ["10"],
  },
  47: {
    fates: [
      {
        eventName: "指挥官",
        mobName: "寒冰指挥官",
        mapId: 211,
        coords: [{ x: 16.5, y: 13.6 }],
        level: "48",
      },
    ],
  },
  50: {
    fates: [
      {
        eventName: "传说的魔兽——贝希摩斯",
        mobName: "贝希摩斯王",
        mapId: 25,
        coords: [{ x: 33.1, y: 16.2 }],
        level: "50",
      },
    ],
  },
};
