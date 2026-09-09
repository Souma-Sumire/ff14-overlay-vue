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
