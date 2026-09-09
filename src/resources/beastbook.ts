import beastbookData from "@/resources/generated/beastbook.json";

export type BeastHabitatType = "overworld" | "dungeon" | "special";

export type BeastSubstituteTag = "行会令" | "理符" | "FATE";

export interface BeastTagMeta {
  label: string;
  className: string;
}

export const BEAST_HABITAT_TYPE_META: Record<BeastHabitatType, BeastTagMeta | null> = {
  overworld: { label: "野外", className: "tag-overworld" },
  dungeon: { label: "副本", className: "tag-dungeon" },
  special: null,
};

export const BEAST_SUBSTITUTE_TAG_META: Record<BeastSubstituteTag, BeastTagMeta> = {
  行会令: { label: "行会令", className: "tag-guildhest" },
  理符: { label: "理符", className: "tag-leve" },
  FATE: { label: "FATE", className: "tag-fate" },
};

export function resolveHabitatTypeTag(type?: string): BeastTagMeta | null {
  if (!type) return null;
  if (Object.prototype.hasOwnProperty.call(BEAST_HABITAT_TYPE_META, type)) {
    return BEAST_HABITAT_TYPE_META[type as BeastHabitatType];
  }
  return null;
}

export function resolveSubstituteTag(tag?: string, type?: string): BeastTagMeta | null {
  if (tag && Object.prototype.hasOwnProperty.call(BEAST_SUBSTITUTE_TAG_META, tag)) {
    return BEAST_SUBSTITUTE_TAG_META[tag as BeastSubstituteTag];
  }
  if (type) {
    return resolveHabitatTypeTag(type);
  }
  return null;
}

export function getBeastEventTagClass(tag?: string): string {
  if (tag && Object.prototype.hasOwnProperty.call(BEAST_SUBSTITUTE_TAG_META, tag)) {
    return BEAST_SUBSTITUTE_TAG_META[tag as BeastSubstituteTag].className;
  }
  return "";
}

export interface BeastCoord {
  x: number;
  y: number;
}

export interface BeastHabitatItem {
  Summary: string;
  Type: BeastHabitatType;
  MapId?: number;
  Coords?: BeastCoord[];
  CoordsNote?: string;
  Level?: string;
  MobName?: string;
  IsSubstitute?: boolean;
  Tag?: BeastSubstituteTag;
  EventName?: string;
}

export interface BeastEntry {
  Number: number;
  Name: string;
  Taxonomy: string;
  AutoAttackType: string;
  BorrowName: string;
  BorrowIcon?: number;
  BorrowDescription?: string;
  ReleaseName: string;
  ReleaseDescription: string;
  ReleaseRange: string;
  ReleaseIcon?: number;
  OrderName: string;
  OrderDescription: string;
  OrderRange: string;
  OrderIcon?: number;
  Habitat: string;
  Habitats?: BeastHabitatItem[];
  Icon?: number;
  Substitutes?: string[];
  SubstituteHabitats?: BeastHabitatItem[];
}

export interface BeastDisplay extends Omit<
  BeastEntry,
  "Icon" | "ReleaseIcon" | "OrderIcon" | "BorrowIcon"
> {
  Level: string;
  IconUrl: string;
  LargeIconUrl: string;
  ReleaseIconUrl: string;
  OrderIconUrl: string;
  BorrowIconUrl: string;
}

export const ALL_CAPTURE_STATUS = ["已拥有", "未拥有"] as const;

const REGION_KEYWORDS = ["黑衣森林", "拉诺西亚", "萨纳兰", "库尔札斯", "摩杜纳"];
const SUB_DIRECTION_ORDER = ["中央", "中", "东", "西", "南", "北", "低地", "高地", "外地"];

export function sortOverworldHabitats(list: string[]): string[] {
  const withoutEmpty = list.filter((h) => h !== "--");
  withoutEmpty.sort((a, b) => {
    const regIndexA = REGION_KEYWORDS.findIndex((k) => a.includes(k));
    const regIndexB = REGION_KEYWORDS.findIndex((k) => b.includes(k));

    const safeRegA = regIndexA === -1 ? 999 : regIndexA;
    const safeRegB = regIndexB === -1 ? 999 : regIndexB;

    if (safeRegA !== safeRegB) {
      return safeRegA - safeRegB;
    }

    const regKeyA = REGION_KEYWORDS[regIndexA];
    const regKeyB = REGION_KEYWORDS[regIndexB];
    const pureA = regKeyA ? a.replace(regKeyA, "") : a;
    const pureB = regKeyB ? b.replace(regKeyB, "") : b;

    const dirIndexA = SUB_DIRECTION_ORDER.findIndex((d) => pureA.includes(d));
    const dirIndexB = SUB_DIRECTION_ORDER.findIndex((d) => pureB.includes(d));

    const safeDirA = dirIndexA === -1 ? 999 : dirIndexA;
    const safeDirB = dirIndexB === -1 ? 999 : dirIndexB;

    if (safeDirA !== safeDirB) {
      return safeDirA - safeDirB;
    }

    return a.localeCompare(b, "zh-CN");
  });

  if (list.includes("--")) {
    withoutEmpty.push("--");
  }
  return withoutEmpty;
}

export function extractBeastConstants(entries: BeastEntry[]): {
  taxonomies: string[];
  attackTypes: string[];
  borrowActions: string[];
  ranges: string[];
  overworldHabitats: string[];
  dungeonHabitats: string[];
} {
  const allHabitats: BeastHabitatItem[] = entries.flatMap((b) => b.Habitats ?? []);

  const rawOverworld = [
    ...new Set(
      allHabitats
        .filter((h) => h.Type === "overworld")
        .map((h) => h.Summary)
        .filter((s): s is string => Boolean(s)),
    ),
  ];

  return {
    taxonomies: [...new Set(entries.map((b) => b.Taxonomy))].filter(Boolean),
    attackTypes: [...new Set(entries.map((b) => b.AutoAttackType))].filter(Boolean),
    borrowActions: [...new Set(entries.map((b) => b.BorrowName))].filter(Boolean),
    ranges: [
      ...new Set([...entries.map((b) => b.ReleaseRange), ...entries.map((b) => b.OrderRange)]),
    ].filter(Boolean),
    overworldHabitats: sortOverworldHabitats(rawOverworld),
    dungeonHabitats: [
      ...new Set(
        allHabitats
          .filter((h) => h.Type === "dungeon")
          .map((h) => h.Summary)
          .filter((s): s is string => Boolean(s)),
      ),
    ],
  };
}

const defaultConstants = extractBeastConstants(beastbookData as BeastEntry[]);

export const ALL_TAXONOMIES: readonly string[] = defaultConstants.taxonomies;
export const ALL_ATTACK_TYPES: readonly string[] = defaultConstants.attackTypes;
export const ALL_BORROW_ACTIONS: readonly string[] = defaultConstants.borrowActions;
export const ALL_RANGES: readonly string[] = defaultConstants.ranges;
export const OVERWORLD_HABITATS: readonly string[] = defaultConstants.overworldHabitats;
export const DUNGEON_HABITATS: readonly string[] = defaultConstants.dungeonHabitats;
