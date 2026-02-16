import type { Ref } from 'vue'
import type { CellSimState, ColumnDef, MitigationRow, MitigationScope, PlayerActionRecord } from '@/types/mitigation'
import { getFirstChargeDeficitTime, simulateChargeStateAtTime } from '@/utils/mitigationCharges'
import Util from '@/utils/util'

interface ScheduledUse {
  id?: string
  columnKey: string
  rowIndex: number
  timestamp: number
  duration: number
  effectiveDuration: number
  recast: number
  mitigationScope?: MitigationScope
  shieldAmount: number
}

const EPSILON = 0.001

function normalizeTargetId(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function findFirstRowAtOrAfter(rows: MitigationRow[], timestamp: number) {
  let left = 0
  let right = rows.length - 1
  let answer = -1

  while (left <= right) {
    const middle = Math.floor((left + right) / 2)
    const current = rows[middle]
    if (!current)
      break

    if (current.timestamp >= timestamp) {
      answer = middle
      right = middle - 1
    }
    else {
      left = middle + 1
    }
  }

  return answer
}

function getColumnTargetNameCandidates(col: ColumnDef) {
  const names = new Set<string>()
  const key = String(col.key || '').trim()
  if (!key)
    return names
  names.add(key)
  const match = key.match(/\(([^()]+)\)\s*$/)
  if (match?.[1])
    names.add(match[1].trim())
  const displayName = Util.jobToFullName(Util.jobEnumToJob(col.jobEnum)).simple1
  if (displayName)
    names.add(displayName.trim())
  return names
}

function getDetailBaseDamage(detail: NonNullable<MitigationRow['damageDetails']>[number]) {
  const estimatedRaw = Number(detail.estimatedRaw)
  if (Number.isFinite(estimatedRaw) && estimatedRaw > 0)
    return estimatedRaw
  const damage = Number(detail.damage)
  if (Number.isFinite(damage) && damage > 0)
    return damage
  return 0
}

function getPersonalDamageForColumn(row: MitigationRow, col: ColumnDef) {
  const fallback = Math.max(0, Number(row.rawDamage || 0))
  const details = row.damageDetails
  const targetId = normalizeTargetId(col.targetId)
  const rowTargetIdSet = new Set((row.targetIds || []).map(item => normalizeTargetId(item)).filter(Boolean))
  const targetNames = (row.targets || []).map(target => String(target || '').trim()).filter(Boolean)
  const targetsAll = targetNames.includes('全部')
  if (details && details.length > 0) {
    let matchedDamage = 0
    if (targetId) {
      const byId = details
        .filter(detail => normalizeTargetId(detail.targetId) === targetId)
        .reduce((sum, detail) => sum + getDetailBaseDamage(detail), 0)
      if (byId > 0)
        matchedDamage = Math.max(matchedDamage, byId)
    }

    const nameCandidates = getColumnTargetNameCandidates(col)
    if (nameCandidates.size > 0) {
      const byName = details
        .filter(detail => nameCandidates.has(detail.target))
        .reduce((sum, detail) => sum + getDetailBaseDamage(detail), 0)
      if (byName > 0)
        matchedDamage = Math.max(matchedDamage, byName)
    }
    if (targetsAll)
      return Math.max(matchedDamage, fallback)
    if (matchedDamage > 0)
      return matchedDamage
    return 0
  }

  // row.rawDamage is already per-target baseline damage when details are absent.
  if ((targetId && rowTargetIdSet.has(targetId)) || rowTargetIdSet.has(normalizeTargetId(col.key)))
    return fallback

  const nameCandidates = getColumnTargetNameCandidates(col)
  if (targetsAll || (nameCandidates.size > 0 && targetNames.some(target => nameCandidates.has(target))))
    return fallback

  return 0
}

function isRowTargetingAllParty(row: MitigationRow, partyColumns: ColumnDef[]) {
  if (!partyColumns.length)
    return false

  const targetNames = new Set((row.targets || []).map(target => String(target || '').trim()).filter(Boolean))
  if (targetNames.has('全部'))
    return true

  const targetIds = new Set((row.targetIds || []).map(item => normalizeTargetId(item)).filter(Boolean))
  const detailTargetIds = new Set((row.damageDetails || []).map(detail => normalizeTargetId(detail.targetId)).filter(Boolean))
  const combinedIds = new Set<string>([...targetIds, ...detailTargetIds])
  let matched = 0
  for (const col of partyColumns) {
    const colTargetId = normalizeTargetId(col.targetId)
    if ((colTargetId && combinedIds.has(colTargetId)) || combinedIds.has(normalizeTargetId(col.key))) {
      matched += 1
      continue
    }
    const candidates = getColumnTargetNameCandidates(col)
    if (candidates.size > 0 && Array.from(candidates).some(name => targetNames.has(name))) {
      matched += 1
      continue
    }
  }
  if (matched >= partyColumns.length)
    return true

  return Math.max(0, Number(row.targetCount || 0)) >= partyColumns.length
}

function computeUseShieldSimulation(
  use: ScheduledUse,
  rows: MitigationRow[],
  columnByKey: Map<string, ColumnDef>,
) {
  const baseDuration = Math.max(0, Number(use.duration || 0))
  const absorbedByRowIndex = new Map<number, number>()
  if (baseDuration <= 0)
    return { effectiveDuration: 0, absorbedByRowIndex }
  if (!Number.isFinite(use.shieldAmount) || use.shieldAmount <= 0)
    return { effectiveDuration: baseDuration, absorbedByRowIndex }

  const endTimestamp = use.timestamp + baseDuration
  const ownerCol = columnByKey.get(use.columnKey)
  const addAbsorb = (rowIndex: number, value: number) => {
    if (!Number.isFinite(value) || value <= EPSILON)
      return
    absorbedByRowIndex.set(rowIndex, (absorbedByRowIndex.get(rowIndex) || 0) + value)
  }

  if (use.mitigationScope === 'self') {
    if (!ownerCol)
      return { effectiveDuration: baseDuration, absorbedByRowIndex }
    let remainingShield = use.shieldAmount
    for (let i = use.rowIndex; i < rows.length; i++) {
      const row = rows[i]
      if (!row)
        break
      if (row.timestamp + EPSILON < use.timestamp)
        continue
      if (row.timestamp >= endTimestamp - EPSILON)
        break
      const consumed = getPersonalDamageForColumn(row, ownerCol)
      if (consumed <= 0)
        continue
      const absorbed = Math.min(remainingShield, consumed)
      addAbsorb(i, absorbed)
      remainingShield = Math.max(0, remainingShield - absorbed)
      if (remainingShield <= EPSILON) {
        return {
          effectiveDuration: Math.max(EPSILON, row.timestamp - use.timestamp + EPSILON),
          absorbedByRowIndex,
        }
      }
    }
    return { effectiveDuration: baseDuration, absorbedByRowIndex }
  }

  const partyColumns = Array.from(columnByKey.values())
  if (partyColumns.length === 0)
    return { effectiveDuration: baseDuration, absorbedByRowIndex }
  const remainingShieldByMember = partyColumns.map(() => use.shieldAmount)
  for (let i = use.rowIndex; i < rows.length; i++) {
    const row = rows[i]
    if (!row)
      break
    if (row.timestamp + EPSILON < use.timestamp)
      continue
    if (row.timestamp >= endTimestamp - EPSILON)
      break

    const rowHitsAllParty = isRowTargetingAllParty(row, partyColumns)
    const fallbackDamage = Math.max(0, Number(row.rawDamage || 0))
    let consumedMembers = 0
    let absorbedTotal = 0
    for (let index = 0; index < partyColumns.length; index++) {
      if (remainingShieldByMember[index]! <= EPSILON)
        continue
      let consumed = getPersonalDamageForColumn(row, partyColumns[index]!)
      if (rowHitsAllParty)
        consumed = Math.max(consumed, fallbackDamage)
      if (consumed <= 0)
        continue
      consumedMembers += 1
      const absorbed = Math.min(remainingShieldByMember[index]!, consumed)
      absorbedTotal += absorbed
      remainingShieldByMember[index] = Math.max(0, remainingShieldByMember[index]! - absorbed)
    }
    if (consumedMembers > 0 && absorbedTotal > EPSILON) {
      addAbsorb(i, absorbedTotal / consumedMembers)
    }
    if (remainingShieldByMember.every(value => value <= EPSILON)) {
      return {
        effectiveDuration: Math.max(EPSILON, row.timestamp - use.timestamp + EPSILON),
        absorbedByRowIndex,
      }
    }
  }
  return { effectiveDuration: baseDuration, absorbedByRowIndex }
}

export function useMitigationSimulator(
  rows: Ref<MitigationRow[]>,
  columns: Ref<ColumnDef[]>,
  playerActions: Ref<PlayerActionRecord[]>,
) {
  function runSimulation() {
    const rawRows = rows.value
    if (!rawRows || rawRows.length === 0)
      return

    const rowIndexByKey = new Map<string, number>()
    rawRows.forEach((row, index) => rowIndexByKey.set(row.key, index))

    const skillLookupByPlayer = new Map<string, Map<number, ColumnDef['skills'][number]>>()
    columns.value.forEach((col) => {
      const map = new Map<number, ColumnDef['skills'][number]>()
      col.skills.forEach(skill => map.set(skill.id, skill))
      skillLookupByPlayer.set(col.key, map)
    })

    const schedules = new Map<string, ScheduledUse[]>()
    playerActions.value.forEach((action) => {
      const playerSkills = skillLookupByPlayer.get(action.columnKey)
      const skill = playerSkills?.get(action.skillId)
      if (!playerSkills || !skill)
        return

      const rowIndexByTimestamp = findFirstRowAtOrAfter(rawRows, action.timestamp)
      let rowIndex = rowIndexByTimestamp
      if (action.rowKey) {
        const matchedIndex = rowIndexByKey.get(action.rowKey)
        if (matchedIndex !== undefined) {
          if (rowIndexByTimestamp === -1) {
            rowIndex = matchedIndex
          }
          else {
            const rowByKey = rawRows[matchedIndex]
            const rowByTimestamp = rawRows[rowIndexByTimestamp]
            const keyTimeMatches = !!rowByKey && Math.abs(rowByKey.timestamp - action.timestamp) <= EPSILON
            const tsTimeMatches = !!rowByTimestamp && Math.abs(rowByTimestamp.timestamp - action.timestamp) <= EPSILON
            // Prefer timestamp anchor; use rowKey only to disambiguate rows at the same cast time.
            rowIndex = keyTimeMatches && tsTimeMatches ? matchedIndex : rowIndexByTimestamp
          }
        }
      }

      if (rowIndex === -1)
        return

      const cellKey = `${action.columnKey}_${action.skillId}`
      const list = schedules.get(cellKey) || []
      list.push({
        id: action.id,
        columnKey: action.columnKey,
        rowIndex,
        timestamp: action.timestamp,
        duration: skill.duration || 0,
        effectiveDuration: Math.max(0, Number(skill.duration || 0)),
        recast: action.recastOverride || skill.recast,
        mitigationScope: skill.mitigationScope,
        shieldAmount: Math.max(0, Number(skill.shieldAmount || 0)),
      })
      schedules.set(cellKey, list)
    })

    const columnByKey = new Map(columns.value.map(col => [col.key, col] as const))
    const scheduleTimestampsByKey = new Map<string, number[]>()
    const rowShieldAbsorbedByIndex = Array.from({ length: rawRows.length }, () => 0)
    schedules.forEach((list, key) => {
      list.sort((a, b) => (a.timestamp - b.timestamp) || (a.rowIndex - b.rowIndex))
      list.forEach((use) => {
        const shieldSimulation = computeUseShieldSimulation(use, rawRows, columnByKey)
        use.effectiveDuration = shieldSimulation.effectiveDuration
        shieldSimulation.absorbedByRowIndex.forEach((value, rowIndex) => {
          rowShieldAbsorbedByIndex[rowIndex] = (rowShieldAbsorbedByIndex[rowIndex] || 0) + value
        })
      })
      scheduleTimestampsByKey.set(key, list.map(use => use.timestamp))
    })

    rawRows.forEach((row, rowIndex) => {
      const activeMitigations: number[] = []
      const cellSims: Record<string, CellSimState> = {}

      columns.value.forEach((col) => {
        col.skills.forEach((skill) => {
          const key = `${col.key}_${skill.id}`
          const schedule = schedules.get(key) || []
          const scheduleTimestamps = scheduleTimestampsByKey.get(key) || []

          let status: CellSimState['status'] = ''
          let currentMatchingUse: typeof schedule[0] | undefined
          let nextUse: typeof schedule[0] | undefined
          let showDot = false
          let showDotMuted = false

          let startUse: typeof schedule[0] | undefined
          for (const item of schedule) {
            if (item.rowIndex === rowIndex) {
              startUse = item
              break
            }
          }

          if (startUse) {
            const elapsed = row.timestamp - startUse.timestamp
            const activeDuration = Math.max(0, startUse.effectiveDuration)
            const inActiveWindow = elapsed >= -EPSILON && elapsed < activeDuration
            const hasDuration = Number(startUse.duration || 0) > 0
            showDot = true
            showDotMuted = hasDuration ? !inActiveWindow : false
            currentMatchingUse = startUse
            if (Math.abs(elapsed) <= EPSILON) {
              status = 'active-start'
            }
            else if (elapsed > EPSILON && elapsed < activeDuration) {
              status = 'active'
            }
            else if (
              elapsed >= activeDuration
              && elapsed < startUse.recast
            ) {
              status = 'cooldown'
            }
          }

          if (!status) {
            let prevUse: typeof schedule[0] | undefined
            for (let i = schedule.length - 1; i >= 0; i--) {
              const candidate = schedule[i]
              if (candidate && candidate.timestamp <= row.timestamp) {
                prevUse = candidate
                break
              }
            }

            if (prevUse) {
              const timeSinceStart = row.timestamp - prevUse.timestamp
              const activeDuration = Math.max(0, prevUse.effectiveDuration)
              if (timeSinceStart >= 0 && timeSinceStart < activeDuration) {
                status = 'active'
                currentMatchingUse = prevUse
              }
              else if (timeSinceStart >= activeDuration && timeSinceStart < prevUse.recast) {
                status = 'cooldown'
                currentMatchingUse = prevUse
              }
            }
          }

          if (!status) {
            for (let i = 0; i < schedule.length; i++) {
              const candidate = schedule[i]
              if (candidate && candidate.timestamp > row.timestamp) {
                nextUse = candidate
                const timeToNext = nextUse.timestamp - row.timestamp
                const requiredSpacing = nextUse.recast
                if (timeToNext > 0 && timeToNext < requiredSpacing)
                  status = 'conflict'
                break
              }
            }
          }

          if (status === 'active' || status === 'active-start') {
            const canApplyToRow = skill.mitigationScope !== 'self'
              || getPersonalDamageForColumn(row, col) > EPSILON
            if (canApplyToRow)
              activeMitigations.push(skill.id)
          }

          let charges = 1
          let conflictTimeInfo: number | undefined
          let nextRechargeAtForCharges: number | undefined
          const isChargeBased = (skill.maxCharges ?? 1) > 1

          if (isChargeBased) {
            const maxCharges = skill.maxCharges || 1
            const recast = skill.recast || 1
            const chargeState = simulateChargeStateAtTime(scheduleTimestamps, row.timestamp, maxCharges, recast)
            charges = chargeState.charges
            nextRechargeAtForCharges = chargeState.nextRechargeAt

            if (status === 'cooldown' || status === 'conflict') {
              if (charges > 0)
                status = ''
            }
            else if (!status && charges <= 0) {
              status = 'cooldown'
            }

            if (status !== 'active' && status !== 'active-start') {
              const deficitTime = getFirstChargeDeficitTime(
                [...scheduleTimestamps, row.timestamp].sort((a, b) => a - b),
                maxCharges,
                recast,
              )
              if (deficitTime !== null && deficitTime > row.timestamp + EPSILON) {
                status = 'conflict'
                conflictTimeInfo = deficitTime
              }
            }
          }

          const classes = ['cell-check']
          if (status === 'active' || status === 'active-start')
            classes.push('is-active')
          if (status === 'active-start')
            classes.push('is-start')
          if (status === 'cooldown')
            classes.push('is-cooldown')
          if (status === 'conflict')
            classes.push('is-pre-cooldown')

          const offset = (status === 'active-start' && currentMatchingUse)
            ? Math.round(currentMatchingUse.timestamp - row.timestamp)
            : 0

          let recastLeft = 0
          if (status === 'conflict' && nextUse) {
            const timeToNext = nextUse.timestamp - row.timestamp
            const requiredSpacing = nextUse.recast
            recastLeft = Math.round(timeToNext - requiredSpacing)
          }
          else if (currentMatchingUse) {
            recastLeft = Math.round(Math.max(0, currentMatchingUse.recast - (row.timestamp - currentMatchingUse.timestamp)))
          }
          else if (isChargeBased && nextRechargeAtForCharges !== undefined && charges < (skill.maxCharges || 1)) {
            recastLeft = Math.max(0, Math.round(nextRechargeAtForCharges - row.timestamp))
          }

          cellSims[key] = {
            status,
            classes,
            showDot,
            showDotMuted,
            offset,
            useTimestamp: currentMatchingUse?.timestamp,
            actionId: currentMatchingUse?.id,
            tooltip: `<strong>${skill.name}</strong><br/>${status === 'active-start' || status === 'active' ? '生效中' : (status === 'cooldown' ? (isChargeBased ? '无充能' : '冷却中') : (status === 'conflict' ? '冲突' : '就绪'))}`,
            ready: status === '' || status === 'active' || status === 'active-start',
            charges,
            maxCharges: skill.maxCharges || 1,
            recastLeft,
            conflictTime: conflictTimeInfo,
          }
        })
      })

      row._sim = {
        cells: cellSims,
        activeMitigations,
        damageTypeClass: row.damageType,
        shieldAbsorbed: Math.max(0, Math.round(rowShieldAbsorbedByIndex[rowIndex] || 0)),
      }
      row._v = (row._v || 0) + 1
    })
  }

  return {
    runSimulation,
  }
}
