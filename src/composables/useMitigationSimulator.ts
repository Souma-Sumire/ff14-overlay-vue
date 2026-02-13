import type { Ref } from 'vue'
import type { CellSimState, ColumnDef, MitigationRow, PlayerActionRecord } from '@/types/mitigation'
import { getFirstChargeDeficitTime, simulateChargeStateAtTime } from '@/utils/mitigationCharges'

interface ScheduledUse {
  id?: string
  rowIndex: number
  timestamp: number
  duration: number
  recast: number
}

const EPSILON = 0.001

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

      const rowIndex = action.rowKey
        ? (rowIndexByKey.get(action.rowKey) ?? -1)
        : findFirstRowAtOrAfter(rawRows, action.timestamp - 0.5)

      if (rowIndex === -1)
        return

      const cellKey = `${action.columnKey}_${action.skillId}`
      const list = schedules.get(cellKey) || []
      list.push({
        id: action.id,
        rowIndex,
        timestamp: action.timestamp,
        duration: skill.duration || 0,
        recast: action.recastOverride || skill.recast,
      })
      schedules.set(cellKey, list)
    })

    const scheduleTimestampsByKey = new Map<string, number[]>()
    schedules.forEach((list, key) => {
      list.sort((a, b) => (a.timestamp - b.timestamp) || (a.rowIndex - b.rowIndex))
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

          let startUse: typeof schedule[0] | undefined
          for (const item of schedule) {
            if (item.rowIndex === rowIndex) {
              startUse = item
              break
            }
          }

          if (startUse) {
            status = 'active-start'
            currentMatchingUse = startUse
          }
          else {
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
              if (timeSinceStart >= 0 && timeSinceStart < prevUse.duration) {
                status = 'active'
                currentMatchingUse = prevUse
              }
              else if (timeSinceStart >= prevUse.duration && timeSinceStart < prevUse.recast) {
                status = 'cooldown'
                currentMatchingUse = prevUse
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
          }

          if (status === 'active' || status === 'active-start')
            activeMitigations.push(skill.id)

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
            showDot: status === 'active-start',
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
      }
      row._v = (row._v || 0) + 1
    })
  }

  return {
    runSimulation,
  }
}
