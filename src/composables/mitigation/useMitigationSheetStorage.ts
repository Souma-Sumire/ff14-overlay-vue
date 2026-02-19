import type { ColumnDef, MitigationRow, PlayerActionRecord, SheetState } from '@/types/mitigation'
import { GLOBAL_SKILL_MAX_LEVEL } from '@/resources/globalSkills'

export interface SheetStorageShards {
  sheetOrder: string[]
  sheetMetaMap: Record<string, Pick<SheetState, 'id' | 'name' | 'meta'>>
  sheetMechanicsMap: Record<string, SheetState['mechanics']>
  sheetPlannerMap: Record<string, SheetState['planner']>
}

export function stripRuntimeRow(row: MitigationRow): MitigationRow {
  const { _sim, _sim_str, _v, ...rest } = row
  return rest as MitigationRow
}

export function normalizeRowsForStorage(rows: MitigationRow[]) {
  return rows.map(stripRuntimeRow)
}

export function buildDefaultFilters(rows: MitigationRow[]) {
  return Array.from(new Set(rows.map(row => row.actionId)))
}

export function normalizeLegacySheet(sheet: SheetState): SheetState {
  const normalizedColumns = (sheet.planner.columns || []).map((col) => {
    const legacy = col as ColumnDef & { playerId?: string }
    const key = (legacy.key || legacy.playerId || '').trim()
    return {
      ...legacy,
      key: key || 'manual',
      targetId: legacy.targetId || legacy.playerId,
    } satisfies ColumnDef
  })
  const normalizedActions = (sheet.planner.playerActions || []).map((action) => {
    const legacy = action as PlayerActionRecord & { playerId?: string }
    return {
      ...legacy,
      columnKey: legacy.columnKey || legacy.playerId || '',
    } satisfies PlayerActionRecord
  }).filter(action => !!action.columnKey)

  return {
    id: sheet.id,
    name: sheet.name,
    meta: {
      zoneId: sheet.meta?.zoneId ?? null,
    },
    mechanics: {
      rows: sheet.mechanics.rows || [],
      filterMechanics: sheet.mechanics.filterMechanics || buildDefaultFilters(sheet.mechanics.rows || []),
    },
    planner: {
      playerActions: normalizedActions,
      columns: normalizedColumns,
      playerLevel: sheet.planner.playerLevel || GLOBAL_SKILL_MAX_LEVEL,
    },
  }
}

export function toSheetStorageShards(list: SheetState[]): SheetStorageShards {
  const sheetOrder: string[] = []
  const sheetMetaMap: Record<string, Pick<SheetState, 'id' | 'name' | 'meta'>> = {}
  const sheetMechanicsMap: Record<string, SheetState['mechanics']> = {}
  const sheetPlannerMap: Record<string, SheetState['planner']> = {}

  list.forEach((sheet) => {
    sheetOrder.push(sheet.id)
    sheetMetaMap[sheet.id] = {
      id: sheet.id,
      name: sheet.name,
      meta: sheet.meta,
    }
    sheetMechanicsMap[sheet.id] = {
      rows: normalizeRowsForStorage(sheet.mechanics.rows || []),
      filterMechanics: [...(sheet.mechanics.filterMechanics || [])],
    }
    sheetPlannerMap[sheet.id] = {
      playerActions: sheet.planner.playerActions.map(action => ({ ...action })),
      columns: sheet.planner.columns.map(col => ({ ...col, skills: [...col.skills], hiddenSkillIds: [...(col.hiddenSkillIds || [])] })),
      playerLevel: sheet.planner.playerLevel,
    }
  })

  return {
    sheetOrder,
    sheetMetaMap,
    sheetMechanicsMap,
    sheetPlannerMap,
  }
}

export function fromSheetStorageShards(shards: SheetStorageShards) {
  return shards.sheetOrder
    .map((id) => {
      const meta = shards.sheetMetaMap[id]
      const mechanics = shards.sheetMechanicsMap[id]
      const planner = shards.sheetPlannerMap[id]
      if (!meta || !mechanics || !planner)
        return null
      return normalizeLegacySheet({
        id: meta.id,
        name: meta.name,
        meta: meta.meta,
        mechanics,
        planner,
      } as SheetState)
    })
    .filter((sheet): sheet is SheetState => !!sheet)
}

export function buildSheetComparableState(
  rows: MitigationRow[],
  actions: PlayerActionRecord[],
  cols: ColumnDef[],
  filters: string[],
  level: number,
) {
  return JSON.stringify({
    rows: normalizeRowsForStorage(rows),
    playerActions: actions,
    columns: cols,
    filterMechanics: filters,
    playerLevel: level,
  })
}
