export interface BeastCoord {
  x: number;
  y: number;
}

export interface BeastCommunityHabitat {
  mapId?: number;
  summary?: string;
  coords?: BeastCoord[];
  level?: string;
  type?: "overworld" | "dungeon" | "special";
  mobName?: string;
}

export interface BeastCommunityCoordEntry {
  coords?: BeastCoord[];
  level?: string;
  habitats?: BeastCommunityHabitat[];
}

export const communityCoords: Record<number, BeastCommunityCoordEntry> = {
  2: {
    coords: [{ x: 23.1, y: 17 }],
    level: "1~2",
  },
  3: {
    coords: [{ x: 23.8, y: 25.6 }],
    level: "3~4",
  },
  4: {
    coords: [
      { x: 22, y: 22 },
      { x: 20, y: 18 },
    ],
    level: "4~6",
  },
  5: {
    coords: [{ x: 28.5, y: 24.3 }],
    level: "5~9",
  },
  6: {
    coords: [{ x: 30.9, y: 18.2 }],
    level: "4~9",
  },
  7: {
    coords: [{ x: 20.3, y: 28.6 }],
    level: "6~8",
  },
  8: {
    coords: [{ x: 19, y: 19 }],
    level: "10",
  },
  9: {
    coords: [{ x: 15.3, y: 14.3 }],
    level: "10~13",
  },
  10: {
    level: "1~4 / 10~13",
    habitats: [
      {
        mapId: 21,
        coords: [{ x: 22, y: 30 }],
        level: "1~4",
      },
      {
        mapId: 15,
        coords: [{ x: 16, y: 12.5 }],
        level: "10~13",
      },
    ],
  },
  11: {
    coords: [{ x: 21, y: 26 }],
    level: "6",
  },
  12: {
    coords: [{ x: 21.4, y: 16.3 }],
    level: "5~7",
  },
  13: {
    coords: [
      { x: 18.5, y: 28.3 },
      { x: 19.6, y: 27.6 },
    ],
    level: "14",
  },
  14: {
    coords: [{ x: 20.5, y: 18.5 }],
    level: "4~8",
  },
  15: {
    coords: [{ x: 16.5, y: 16.5 }],
    level: "13",
  },
  16: {
    coords: [
      { x: 21, y: 23 },
      { x: 22.8, y: 20.8 },
    ],
    level: "16",
  },
  17: {
    level: "17 / 38",
    habitats: [
      {
        summary: "封锁坑道铜铃铜山",
        type: "dungeon",
        level: "17",
      },
      {
        summary: "流沙迷宫樵鸣洞",
        type: "dungeon",
        mobName: "滑沙",
        level: "38",
      },
    ],
  },
  19: {
    coords: [{ x: 26.5, y: 15.9 }],
    level: "7",
  },
  20: {
    coords: [{ x: 23, y: 26 }],
    level: "10",
  },
  21: {
    coords: [{ x: 24.1, y: 23.6 }],
    level: "16",
  },
  22: {
    coords: [{ x: 27, y: 25 }],
    level: "3~4",
  },
  23: {
    coords: [{ x: 24, y: 12.3 }],
    level: "29",
  },
  24: {
    coords: [{ x: 28.8, y: 36.7 }],
    level: "30",
  },
  25: {
    coords: [{ x: 22, y: 30 }],
    level: "12",
  },
  26: {
    coords: [{ x: 18.5, y: 17.5 }],
    level: "8",
  },
  27: {
    coords: [{ x: 16.8, y: 14.5 }],
    level: "14",
  },
  28: {
    coords: [{ x: 15.2, y: 37.5 }],
    level: "31",
  },
  29: {
    coords: [{ x: 17.4, y: 23.7 }],
    level: "7",
  },
  30: {
    coords: [{ x: 25.2, y: 24.5 }],
    level: "12",
  },
  31: {
    level: "4 / 9 / 33",
    habitats: [
      {
        mapId: 16,
        coords: [{ x: 24.6, y: 23 }],
        level: "4",
      },
      {
        mapId: 20,
        coords: [{ x: 23, y: 23 }],
        level: "9",
      },
      {
        mapId: 17,
        coords: [{ x: 17, y: 26 }],
        level: "33",
      },
    ],
  },
  32: {
    coords: [{ x: 30.6, y: 24 }],
    level: "33",
  },
  33: {
    coords: [{ x: 15.3, y: 14.7 }],
    level: "34",
  },
  34: {
    coords: [{ x: 31.2, y: 20.3 }],
    level: "9",
  },
  35: {
    coords: [{ x: 25, y: 39 }],
    level: "32",
  },
  36: {
    coords: [{ x: 27, y: 15 }],
    level: "12~17",
  },
  39: {
    coords: [{ x: 13.5, y: 22.3 }],
    level: "31",
  },
  40: {
    coords: [{ x: 20.2, y: 18.4 }],
    level: "7",
  },
  41: {
    coords: [
      { x: 26.5, y: 18.9 },
      { x: 26.1, y: 21.2 },
    ],
    level: "6",
  },
  42: {
    coords: [{ x: 26.3, y: 12.9 }],
    level: "45",
  },
};
