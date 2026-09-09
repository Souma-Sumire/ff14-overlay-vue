import rawBeastbookData from "./generated/beastbook.json";
import { BEAST_COMMUNITY_PATCHES, type BeastCommunityPatch } from "./beastbookCommunity";
import { getMapIdByName } from "./maps";

export type BeastHabitatSourceType = "overworld" | "dungeon" | "fate";
export type BeastHabitatType = BeastHabitatSourceType | "special";

export interface BeastTagMeta {
  label: string;
  className: string;
}

export const BEAST_HABITAT_TYPE_META: Record<BeastHabitatType, BeastTagMeta | null> = {
  overworld: { label: "野外", className: "tag-overworld" },
  dungeon: { label: "副本", className: "tag-dungeon" },
  fate: { label: "FATE", className: "tag-fate" },
  special: null,
};

export function normalizeHabitatItem(
  hab: BeastHabitatItem,
  beastInfo?: { number: number; name: string },
): BeastHabitatItem {
  const summary = hab.Summary?.trim() ?? "";
  let mapId = hab.MapId;

  if (
    (hab.Type === "overworld" || hab.Type === "fate") &&
    summary &&
    summary !== "--" &&
    summary !== "初始自带"
  ) {
    const resolvedMapId = getMapIdByName(summary);
    if (resolvedMapId !== undefined) {
      mapId = resolvedMapId;
    } else {
      const infoText = beastInfo ? `（怪兽 #${beastInfo.number} ${beastInfo.name}）` : "";
      console.error(
        `[Beastbook] 未知地图名称: "${summary}"${infoText}，无法解析 MapId，请检查并修正地图名称。`,
      );
    }
  }

  return {
    ...hab,
    Summary: summary,
    MapId: mapId,
  };
}

export function resolveHabitatTypeTag(type?: BeastHabitatType): BeastTagMeta | null {
  if (!type) return null;
  if (Object.prototype.hasOwnProperty.call(BEAST_HABITAT_TYPE_META, type)) {
    return BEAST_HABITAT_TYPE_META[type] ?? null;
  }
  return null;
}

function resolveHabitatTypeTagFromValue(type?: string): BeastTagMeta | null {
  const normalizedType = type?.toLowerCase();
  if (
    !normalizedType ||
    !Object.prototype.hasOwnProperty.call(BEAST_HABITAT_TYPE_META, normalizedType)
  ) {
    return null;
  }
  return resolveHabitatTypeTag(normalizedType as BeastHabitatType);
}

export function getBeastEventTagClass(tag?: string): string {
  return resolveHabitatTypeTagFromValue(tag)?.className ?? "";
}

export function getBeastEventTagLabel(tag?: string): string | undefined {
  return resolveHabitatTypeTagFromValue(tag)?.label;
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
  EventName?: string;
  Note?: string;
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
  CommunityHabitats?: BeastHabitatItem[];
  Icon?: number;
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

export function getBeastHabitats(
  beast: Pick<BeastEntry, "Habitats" | "CommunityHabitats">,
): BeastHabitatItem[] {
  return [...(beast.Habitats ?? []), ...(beast.CommunityHabitats ?? [])];
}

export function parseBeastLevelRange(level?: string): [number, number] {
  if (!level || level.trim() === "-") return [0, 0];
  const levels = level.match(/\d+/g)?.map(Number);
  if (!levels?.length) return [0, 0];
  return [Math.min(...levels), Math.max(...levels)];
}

export function getBeastDisplayLevel(
  beast: Pick<BeastEntry, "Habitats" | "CommunityHabitats">,
): string {
  const levels = [
    ...new Set(
      getBeastHabitats(beast)
        .map((habitat) => habitat.Level)
        .filter((level): level is string => Boolean(level && level !== "-")),
    ),
  ];
  return levels.length > 0 ? levels.join(" / ") : "-";
}

export function getBeastMinLevel(
  beast: Pick<BeastEntry, "Habitats" | "CommunityHabitats">,
): number {
  return parseBeastLevelRange(getBeastDisplayLevel(beast))[0];
}

export function matchesBeastLevelRange(
  beast: Pick<BeastEntry, "Habitats" | "CommunityHabitats">,
  [selectedMin, selectedMax]: [number, number],
): boolean {
  if (selectedMin <= 1 && selectedMax >= 50) return true;
  const habitats = getBeastHabitats(beast);
  return (
    habitats.length === 0 ||
    habitats.some(({ Level }) => {
      const [min, max] = parseBeastLevelRange(Level);
      return max >= selectedMin && min <= selectedMax;
    })
  );
}

export function sortHabitatsByLevel(habitats?: BeastHabitatItem[]): BeastHabitatItem[] {
  return [...(habitats ?? [])].sort(
    (a, b) => parseBeastLevelRange(a.Level)[0] - parseBeastLevelRange(b.Level)[0],
  );
}

export function hasMatchingHabitat(
  beast: Pick<BeastEntry, "Habitats" | "CommunityHabitats">,
  types: readonly BeastHabitatType[],
  summary = "all",
): boolean {
  return getBeastHabitats(beast).some(
    (habitat) => types.includes(habitat.Type) && (summary === "all" || habitat.Summary === summary),
  );
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
  const allHabitats = entries.flatMap(getBeastHabitats);

  const rawOverworld = [
    ...new Set(
      allHabitats
        .filter((h) => h.Type === "overworld" || h.Type === "fate")
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

export function applyCommunityPatches(
  rawList: BeastEntry[],
  patches: Record<number, BeastCommunityPatch>,
): BeastEntry[] {
  return rawList.map((beast) => {
    const patch = patches[beast.Number];
    if (!patch) return beast;

    const baseHabs = beast.Habitats ? [...beast.Habitats] : [];
    let primaryHab: BeastHabitatItem;

    if (baseHabs.length > 0 && baseHabs[0]) {
      primaryHab = { ...baseHabs[0] };
    } else {
      primaryHab = {
        Summary: "--",
        Type: "overworld",
      };
    }

    if (patch.coords !== undefined) primaryHab.Coords = patch.coords;
    if (patch.level !== undefined) primaryHab.Level = patch.level;

    const beastInfo = { number: beast.Number, name: beast.Name };
    const extraHabs: BeastHabitatItem[] = (patch.extraHabitats ? [...patch.extraHabitats] : []).map(
      (hab) => normalizeHabitatItem(hab, beastInfo),
    );
    const sortedExtraHabitats = sortHabitatsByLevel(extraHabs);

    return {
      ...beast,
      Habitats: [normalizeHabitatItem(primaryHab, beastInfo)],
      CommunityHabitats: sortedExtraHabitats.length > 0 ? sortedExtraHabitats : undefined,
    };
  });
}

export const beastbookData: BeastEntry[] = applyCommunityPatches(
  rawBeastbookData as BeastEntry[],
  BEAST_COMMUNITY_PATCHES,
);

const defaultConstants = extractBeastConstants(beastbookData);

export const ALL_TAXONOMIES: readonly string[] = defaultConstants.taxonomies;
export const ALL_ATTACK_TYPES: readonly string[] = defaultConstants.attackTypes;
export const ALL_BORROW_ACTIONS: readonly string[] = defaultConstants.borrowActions;
export const ALL_RANGES: readonly string[] = defaultConstants.ranges;
export const OVERWORLD_HABITATS: readonly string[] = defaultConstants.overworldHabitats;
export const DUNGEON_HABITATS: readonly string[] = defaultConstants.dungeonHabitats;
