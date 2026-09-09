import rawMapNameToId from "./generated/maps.json";

/** The canonical map name -> territory/map id index used by all map features. */
export const MAP_NAME_TO_ID: Readonly<Record<string, number>> = rawMapNameToId;

export function getMapIdByName(name?: string): number | undefined {
  if (!name) return undefined;
  return MAP_NAME_TO_ID[name.trim()];
}

export function hasMapName(name?: string): boolean {
  return getMapIdByName(name) !== undefined;
}
