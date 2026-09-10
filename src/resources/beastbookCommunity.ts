import type { BeastCoord, BeastHabitatSourceType } from "./beastbook";

export interface BeastCommunityHabitat {
  Summary: string;
  Type: BeastHabitatSourceType;
  MapId?: number;
  Coords?: BeastCoord[];
  CoordsNote?: string;
  Level?: string;
  MobName?: string;
  EventName?: string;
  Note?: string;
}

export interface BeastCommunityPatch {
  /** 主要栖息地 坐标 */
  coords?: BeastCoord[];
  /** 主要栖息地 怪物等级 */
  level?: string;
  /** 社区补充的额外栖息地列表 */
  extraHabitats?: BeastCommunityHabitat[];
}

export const BEAST_COMMUNITY_PATCHES: Record<number, BeastCommunityPatch> = {
  "2": {
    coords: [{ x: 23.1, y: 17 }],
    level: "1~2",
  },
  "3": {
    coords: [{ x: 23.8, y: 25.6 }],
    level: "3~4",
  },
  "4": {
    coords: [
      { x: 22, y: 22 },
      { x: 20, y: 18 },
    ],
    level: "4~6",
  },
  "5": {
    coords: [{ x: 28.5, y: 24.3 }],
    level: "5~9",
  },
  "6": {
    coords: [{ x: 30.9, y: 18.2 }],
    level: "4~9",
  },
  "7": {
    coords: [{ x: 20.3, y: 28.6 }],
    level: "6~8",
  },
  "8": {
    coords: [{ x: 19, y: 19 }],
    level: "10",
  },
  "9": {
    coords: [{ x: 15.3, y: 14.3 }],
    level: "10~13",
  },
  "10": {
    coords: [{ x: 22, y: 30 }],
    level: "1~4",
    extraHabitats: [
      {
        Summary: "中拉诺西亚",
        Type: "overworld",
        Coords: [{ x: 16, y: 12.5 }],
        Level: "10~13",
      },
      {
        Summary: "中拉诺西亚",
        Type: "fate",
        EventName: "大胡蜂和黄衫队",
        Coords: [{ x: 14, y: 15 }],
        MobName: "胡蜂王",
        Level: "13",
      },
      {
        Summary: "中萨纳兰",
        Type: "overworld",
        Coords: [
          { x: 26.8, y: 19.1 },
          { x: 27.2, y: 19.6 },
        ],
        Level: "1~4",
        MobName: "胡蜂王",
      },
      {
        Summary: "西萨纳兰",
        Type: "overworld",
        Coords: [{ x: 16.7, y: 16 }],
        Level: "1~4",
        MobName: "鲜花胡蜂",
      },
      {
        Summary: "南萨纳兰",
        Type: "overworld",
        Coords: [{ x: 22.1, y: 14.2 }],
        Level: "1~4",
        MobName: "杀人蜂云",
      },
      {
        Summary: "东萨纳兰",
        Type: "overworld",
        Coords: [{ x: 11.1, y: 23.9 }],
        Level: "1~4",
        MobName: "胡蜂",
      },
    ],
  },
  "11": {
    coords: [{ x: 21, y: 26 }],
    level: "6",
  },
  "12": {
    coords: [{ x: 21.4, y: 16.3 }],
    level: "5~7",
  },
  "13": {
    coords: [
      { x: 18.5, y: 28.3 },
      { x: 19.6, y: 27.6 },
    ],
    level: "14",
  },
  "14": {
    coords: [{ x: 20.5, y: 18.5 }],
    level: "4~8",
  },
  "15": {
    coords: [{ x: 16.5, y: 16.5 }],
    level: "13",
  },
  "16": {
    coords: [
      { x: 21, y: 23 },
      { x: 22.8, y: 20.8 },
    ],
    level: "16",
  },
  "17": {
    extraHabitats: [
      {
        Summary: "流沙迷宫樵鸣洞",
        Type: "dungeon",
        Level: "38",
        MobName: "滑沙",
      },
    ],
  },
  "18": {
    extraHabitats: [
      {
        Summary: "行会令：打倒会在战斗中召唤增员的波克曼！",
        Type: "dungeon",
        MobName: "波克曼",
        Level: "11",
      },
      {
        Summary: "黑衣森林东部林区",
        Type: "fate",
        EventName: "无头骑士——波克曼",
        Coords: [{ x: 27.3, y: 22.1 }],
        MobName: "波克曼",
        Level: "20",
      },
    ],
  },
  "19": {
    coords: [{ x: 26.5, y: 15.9 }],
    level: "7",
  },
  "20": {
    coords: [{ x: 23, y: 26 }],
    level: "10",
  },
  "21": {
    coords: [{ x: 24.1, y: 23.6 }],
    level: "16",
  },
  "22": {
    coords: [{ x: 27, y: 25 }],
    level: "3~4",
  },
  "23": {
    coords: [{ x: 24, y: 12.3 }],
    level: "29",
  },
  "24": {
    coords: [{ x: 28.8, y: 36.7 }],
    level: "30",
  },
  "25": {
    coords: [{ x: 22, y: 30 }],
    level: "12",
    extraHabitats: [
      {
        Summary: "行会令：削弱金币龟的力量，用陷阱将其捕获！",
        Type: "dungeon",
        MobName: "金币龟",
        Level: "16",
      },
    ],
  },
  "26": {
    coords: [{ x: 18.5, y: 17.5 }],
    level: "8",
  },
  "27": {
    coords: [{ x: 16.8, y: 14.5 }],
    level: "14",
  },
  "28": {
    coords: [{ x: 15.2, y: 37.5 }],
    level: "31",
  },
  "29": {
    coords: [{ x: 17.4, y: 23.7 }],
    level: "7",
  },
  "30": {
    coords: [{ x: 25.2, y: 24.5 }],
    level: "12",
  },
  "31": {
    coords: [{ x: 24.6, y: 23 }],
    level: "4",
    extraHabitats: [
      {
        Summary: "西萨纳兰",
        Type: "overworld",
        Coords: [{ x: 23, y: 23 }],
        Level: "9",
      },
      {
        Summary: "东拉诺西亚",
        Type: "overworld",
        Coords: [{ x: 17, y: 26 }],
        Level: "33",
      },
      {
        Summary: "行会令：突破三道关门，打倒最深处的越壁蟾蜍！",
        Type: "dungeon",
        MobName: "越壁蟾蜍",
        Level: "16",
      },
    ],
  },
  "32": {
    coords: [{ x: 30.6, y: 24 }],
    level: "33",
  },
  "33": {
    coords: [{ x: 15.3, y: 14.7 }],
    level: "34",
    extraHabitats: [
      {
        Summary: "拉诺西亚高地",
        Type: "fate",
        EventName: "振兴贫女材场 讨伐猛兽",
        Coords: [{ x: 11.4, y: 24.2 }],
        MobName: "长须豹幼崽",
        Level: "18",
      },
      {
        Summary: "拉诺西亚高地",
        Type: "fate",
        EventName: "食豹猛禽——西牟鸟",
        Coords: [{ x: 8.9, y: 21.1 }],
        MobName: "独行长须豹",
        Level: "23",
      },
      {
        Summary: "拉诺西亚高地",
        Type: "overworld",
        Coords: [{ x: 9.0, y: 21.2 }],
        MobName: "高阶长须豹",
        Level: "24",
      },
    ],
  },
  "34": {
    coords: [{ x: 31.2, y: 20.3 }],
    level: "9",
  },
  "35": {
    coords: [{ x: 25, y: 39 }],
    level: "32",
    extraHabitats: [
      {
        Summary: "休养胜地布雷福洛克斯野营地",
        Type: "dungeon",
        Level: "32",
        MobName: "白烬火蛟",
      },
    ],
  },
  "36": {
    coords: [{ x: 27, y: 15 }],
    level: "12~17",
  },
  "38": {
    extraHabitats: [
      {
        Summary: "北萨纳兰",
        Type: "fate",
        EventName: "狂暴巨兽——强化奇美拉",
        Coords: [{ x: 17, y: 14.5 }],
        MobName: "强化奇美拉",
        Level: "49",
      },
      {
        Summary: "死化奇美拉讨伐",
        Type: "dungeon",
        Level: "50",
        MobName: "死化奇美拉",
      },
    ],
  },
  "39": {
    coords: [{ x: 13.5, y: 22.3 }],
    level: "31",
    extraHabitats: [
      {
        Summary: "行会令：注意两种泡泡的同时打倒剧毒魔花谭琳！",
        Type: "dungeon",
        MobName: "剧毒魔花谭琳",
        Level: "31",
      },
    ],
  },
  "40": {
    coords: [{ x: 20.2, y: 18.4 }],
    level: "7",
    extraHabitats: [
      {
        Summary: "行会令：扑灭苍蓝的火焰，打倒妖异布索！",
        Type: "dungeon",
        MobName: "布索",
        Level: "31",
      },
    ],
  },
  "41": {
    coords: [
      { x: 26.5, y: 18.9 },
      { x: 26.1, y: 21.2 },
    ],
    level: "6",
  },
  "42": {
    coords: [{ x: 26.3, y: 12.9 }],
    level: "45",
    extraHabitats: [
      {
        Summary: "魔兽领域日影地修炼所",
        Type: "dungeon",
        Level: "20",
        MobName: "斗技场巨蚺",
      },
    ],
  },
  "46": {
    extraHabitats: [
      {
        Summary: "阿巴拉提亚云海",
        Type: "fate",
        EventName: "黑色怪鸟",
        Coords: [{ x: 30.1, y: 36 }],
        MobName: "安祖主母",
        Level: "47",
      },
      {
        Summary: "阿巴拉提亚云海",
        Type: "fate",
        EventName: "黑色怪鸟",
        Coords: [{ x: 30.1, y: 36 }],
        MobName: "小母安祖",
        Level: "47",
      },
    ],
  },
  "47": {
    extraHabitats: [
      {
        Summary: "希瓦歼灭战",
        Type: "dungeon",
        Level: "50",
        MobName: "寒冰士兵",
        Note: "转阶段小怪",
      },
      {
        Summary: "库尔札斯西部高地",
        Type: "fate",
        EventName: "指挥官",
        Coords: [{ x: 16.5, y: 13.6 }],
        MobName: "寒冰指挥官",
        Level: "48",
      },
    ],
  },
  "50": {
    extraHabitats: [
      {
        Summary: "库尔札斯中央高地",
        Type: "fate",
        EventName: "受伤的魔兽——贝希摩斯",
        Coords: [{ x: 4, y: 15 }],
        MobName: "贝希摩斯",
        Level: "50",
      },
      {
        Summary: "库尔札斯中央高地",
        Type: "fate",
        EventName: "传说的魔兽——贝希摩斯",
        Coords: [{ x: 6.2, y: 22.1 }],
        MobName: "贝希摩斯",
        Level: "50",
      },
    ],
  },
};
