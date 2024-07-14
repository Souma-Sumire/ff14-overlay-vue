// contentFinderCondition.csv A5: =B5&":"&D5&","
import contentFinderCondition from './contentFinderCondition.json'

const map: Record<string, number> = {}
for (const key in contentFinderCondition)
  map[contentFinderCondition[key as keyof typeof contentFinderCondition]] = Number(key)

export function getMapIDByTerritoryType(territoryType: number): number {
  return map[territoryType.toString()] ?? territoryType
}
export function getTerritoryTypeByMapID(mapID: number): number {
  return Number(contentFinderCondition[mapID.toString() as keyof typeof contentFinderCondition])
}
