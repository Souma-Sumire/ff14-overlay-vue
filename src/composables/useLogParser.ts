import type { PerformanceType } from '@/types/keigennRecord2'
import type { EncounterCandidate, MitigationRow, PartyMember, PlayerActionRecord } from '@/types/mitigation'
import type { DamageType } from '@/utils/flags'
import { keigennSkills } from '@/resources/keigennSkills'
import { createActionId } from '@/utils/actionId'
import { processAbilityLine, processFlags } from '@/utils/flags'
import { getKeigenn } from '@/utils/keigenn'
import { buildPartyColumnKey, EXTREME_DAMAGE_THRESHOLD } from '@/utils/mitigationConstants'
import { formatTime } from '@/utils/time'
import Util from '@/utils/util'
import logDefinitions from '../../cactbot/resources/netlog_defs'

interface Combatant { id: string, name: string, job: number, level: number }

interface RawEvent {
  timestamp: number
  id: string
  name: string
  amount: number
  type: DamageType
  sourceId: string
  sourceName: string
  targetId: string
  targetName: string
  flags: string
  line: string
  reduction: number
  shield: number
  castTime?: string
}

interface GroupedRawEvents {
  firstTimestamp: number
  id: string
  name: string
  events: RawEvent[]
}

const EVENT_GROUP_WINDOW_MS = 1000
const CAST_MATCH_LOOKBACK_MS = 30000
const CAST_CACHE_TTL_MS = 120000

const validSkillIds = new Set<number>()
keigennSkills.forEach((skill) => {
  if (typeof skill.id === 'number') {
    validSkillIds.add(skill.id)
    return
  }

  const matches = skill.id.match(/\d+/g)
  if (matches)
    matches.forEach(m => validSkillIds.add(Number(m)))
})

function parseAddedCombatant(split: string[]): Combatant {
  const id = split[logDefinitions.AddedCombatant.fields.id] || ''
  const rawJob = Number.parseInt(split[logDefinitions.AddedCombatant.fields.job] || '0', 16)
  const normalizedJob = Util.baseJobEnumConverted(rawJob)
  const jobName = Util.jobToFullName(Util.jobEnumToJob(normalizedJob)).simple1 || 'Unknown'
  const level = Number.parseInt(split[logDefinitions.AddedCombatant.fields.level] || '0', 16) || 0
  return {
    id,
    name: jobName,
    job: normalizedJob,
    level,
  }
}

function parsePartyIds(split: string[]) {
  const count = Number.parseInt(split[logDefinitions.PartyList.fields.partyCount] || '0', 10)
  const ids: string[] = []
  for (let i = 0; i < count; i++) {
    const id = split[logDefinitions.PartyList.fields.id0 + i]
    if (id && id !== '00')
      ids.push(id)
  }
  return ids
}

function resolveRsvAbilityName(name: string, rsvData: Map<number, string>) {
  const rsvMatch = name.match(/^_rsv_(\d+)_/i)
  if (!rsvMatch)
    return name

  const id = Number(rsvMatch[1])
  const fallback = name.match(/^_(rsv_\d+)_/i)?.[1]
  return rsvData.get(id) || fallback || name
}

function normalizeAbilityName(rawName: string) {
  const normalized = rawName.trim().toLowerCase()
  return normalized || ''
}

function normalizeAbilityId(rawId: string) {
  if (!rawId)
    return ''
  const parsed = Number.parseInt(rawId, 16)
  if (!Number.isFinite(parsed) || parsed <= 0)
    return ''
  return parsed.toString(16).toUpperCase()
}

function buildCastIdMatchKeys(rawIds: string[]) {
  const keys = rawIds
    .map(id => normalizeAbilityId(id))
    .filter(Boolean)
    .map(id => `id:${id}`)
  return Array.from(new Set(keys))
}

function buildCastNameMatchKeys(rawAbilityNames: string[]) {
  const keys = rawAbilityNames
    .map(name => normalizeAbilityName(name))
    .filter(Boolean)
    .map(name => `name:${name}`)
  return Array.from(new Set(keys))
}

function calculateReductionMultiplier(
  damageType: DamageType,
  flagsEffect: string,
  playerStatus: Record<string, any>,
) {
  if (flagsEffect === 'instant death' || flagsEffect === 'dodge')
    return 0

  let flagMultiplier = 1
  if (flagsEffect === 'blocked damage')
    flagMultiplier = 0.8
  else if (flagsEffect === 'parried damage')
    flagMultiplier = 0.85

  let reductionMultiplier = 1
  for (const status of Object.values(playerStatus)) {
    const perf = status.performance as PerformanceType
    const typeKey = damageType as keyof PerformanceType
    reductionMultiplier *= perf[typeKey] ?? 1
  }

  return 1 - reductionMultiplier * flagMultiplier
}

function calculateMedian(arr: number[]): number {
  if (arr.length === 0)
    return 0

  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid] || 0
    : ((sorted[mid - 1] || 0) + (sorted[mid] || 0)) / 2
}

function calculateAverage(arr: number[]): number {
  if (arr.length === 0)
    return 0
  const sum = arr.reduce((acc, value) => acc + value, 0)
  return sum / arr.length
}

function addPrepullRows(rows: MitigationRow[], importKeySeed: string) {
  const prepullTimes = [-30, -25, -20, -15, -10, -5, 0]
  for (const timestamp of prepullTimes) {
    const exists = rows.some(row => Math.abs(row.timestamp - timestamp) < 0.001)
    if (exists)
      continue

    rows.push({
      key: `prepull_${importKeySeed}_${timestamp}`,
      timestamp,
      action: 'Prepull',
      actionId: '',
      source: '',
      damageType: 'physics',
      rawDamage: 0,
      targetCount: 1,
      isAOE: false,
      isTB: false,
      isShare: false,
      targets: [],
      targetIds: [],
      rawLines: [],
      flags: [],
      damageDetails: [],
    })
  }
}

export function useLogParser() {
  const rsvDataGlobal = new Map<number, string>()
  const RSV_STORAGE_KEY = 'mitigation-rsv-data'

  function loadRsvData() {
    try {
      const saved = localStorage.getItem(RSV_STORAGE_KEY)
      if (!saved)
        return

      const parsed = JSON.parse(saved) as Record<number, string>
      for (const [key, value] of Object.entries(parsed)) {
        const id = Number(key)
        if (id && value)
          rsvDataGlobal.set(id, value)
      }
    }
    catch (error) {
      console.warn('Failed to load RSV data:', error)
    }
  }

  function saveRsvData() {
    try {
      const stored: Record<number, string> = {}
      for (const [key, value] of rsvDataGlobal.entries())
        stored[key] = value

      localStorage.setItem(RSV_STORAGE_KEY, JSON.stringify(stored))
    }
    catch (error) {
      console.warn('Failed to save RSV data:', error)
    }
  }

  async function parseFile(file: File): Promise<EncounterCandidate[]> {
    loadRsvData()
    const text = await file.text()
    const lines = text.split(/\r?\n/)
    const parsedEncounters: EncounterCandidate[] = []

    const allCombatants = new Map<string, Combatant>()
    let currentPartyIds: string[] = []

    let currentEncounter: EncounterCandidate | null = null
    let currentZoneId: number | null = null
    let currentZone = 'Unknown'
    let inCombat = false

    for (const line of lines) {
      if (!line)
        continue

      const split = line.split('|')
      const type = split[logDefinitions.GameLog.fields.type]

      if (type === logDefinitions.AddedCombatant.type) {
        const combatant = parseAddedCombatant(split)
        if (combatant.id.startsWith('1'))
          allCombatants.set(combatant.id, combatant)
      }

      if (type === logDefinitions.PartyList.type)
        currentPartyIds = parsePartyIds(split)

      if (type === logDefinitions.ChangeZone.type) {
        currentZone = split[logDefinitions.ChangeZone.fields.name] || 'Unknown'
        const zoneIdHex = split[logDefinitions.ChangeZone.fields.id]
        const parsedZoneId = Number.parseInt(zoneIdHex || '', 16)
        currentZoneId = Number.isNaN(parsedZoneId) ? null : parsedZoneId
      }

      if (type === logDefinitions.RSVData.type) {
        const key = split[logDefinitions.RSVData.fields.key]
        const value = split[logDefinitions.RSVData.fields.value]
        const match = key?.match(/^_rsv_(\d+)_/i)
        const id = match ? Number(match[1]) : 0
        if (id && value)
          rsvDataGlobal.set(id, value)
      }

      if (type === logDefinitions.InCombat.type) {
        const combatAct = split[logDefinitions.InCombat.fields.inACTCombat] === '1'
        const combatGame = split[logDefinitions.InCombat.fields.inGameCombat] === '1'
        const isCombat = combatAct || combatGame
        const timestamp = new Date(split[logDefinitions.InCombat.fields.timestamp] || '').getTime()

        if (isCombat && !inCombat) {
          inCombat = true
          const party = currentPartyIds
            .map(id => allCombatants.get(id))
            .filter((member): member is PartyMember => !!member)

          currentEncounter = {
            id: createActionId(),
            zoneId: currentZoneId,
            zoneName: currentZone,
            startTime: timestamp,
            endTime: timestamp,
            durationStr: '00:00',
            lines: [],
            party,
          }
        }
        else if (!isCombat && inCombat && currentEncounter) {
          inCombat = false
          currentEncounter.endTime = timestamp
          currentEncounter.durationStr = formatTime((timestamp - currentEncounter.startTime) / 1000)
          if (currentEncounter.lines.length > 20)
            parsedEncounters.push(currentEncounter)
          currentEncounter = null
        }
      }

      if (inCombat && currentEncounter) {
        currentEncounter.lines.push(line)

        if (type === logDefinitions.AddedCombatant.type) {
          const combatant = parseAddedCombatant(split)
          if (!combatant.id.startsWith('1'))
            continue

          allCombatants.set(combatant.id, combatant)
          const existsInParty = currentEncounter.party.some(member => member.id === combatant.id)
          if (!existsInParty && currentPartyIds.includes(combatant.id))
            currentEncounter.party.push(combatant)
        }
      }
    }

    if (inCombat && currentEncounter) {
      currentEncounter.endTime = currentEncounter.startTime + 1000 * 60 * 10
      parsedEncounters.push(currentEncounter)
    }

    saveRsvData()
    return parsedEncounters.reverse()
  }

  function extractMechanics(
    encounter: EncounterCandidate,
    options: { includeMechanics?: boolean, includePlayerActions?: boolean } = {},
  ): { rows: MitigationRow[], playerActions: PlayerActionRecord[] } {
    const includeMechanics = options.includeMechanics !== false
    const includePlayerActions = options.includePlayerActions !== false
    loadRsvData()
    const importKeySeed = createActionId()

    const rawEvents: RawEvent[] = []
    const playerActions: PlayerActionRecord[] = []

    const statusData: Record<string, Record<string, any>> = {}
    const shieldData: Record<string, number> = {}
    const activeCasts = new Map<string, { totalTime: string, startedAt: number }>()
    const playerActionKeys = new Set<string>()

    const pruneActiveCasts = (now: number) => {
      for (const [castKey, castData] of activeCasts.entries()) {
        if (now - castData.startedAt > CAST_CACHE_TTL_MS)
          activeCasts.delete(castKey)
      }
    }
    const resolveCastTime = (castKeys: string[], now: number) => {
      let bestMatch: { totalTime: string, age: number } | null = null
      for (const castKey of castKeys) {
        const castData = activeCasts.get(castKey)
        if (!castData)
          continue
        const age = now - castData.startedAt
        if (age < 0 || age > CAST_MATCH_LOOKBACK_MS)
          continue
        if (!bestMatch || age < bestMatch.age)
          bestMatch = { totalTime: castData.totalTime, age }
      }
      return bestMatch?.totalTime
    }

    const partyMembersMap = new Map<string, PartyMember>()
    encounter.party.forEach(member => partyMembersMap.set(member.id, member))
    const partyIds = new Set(encounter.party.map(member => member.id))
    const columnKeyByPartyId = new Map<string, string>()
    encounter.party.forEach((member, index) => {
      columnKeyByPartyId.set(member.id, buildPartyColumnKey(index, member.id))
    })
    const getSanitizedNameById = (id: string, fallback: string) => {
      const member = partyMembersMap.get(id)
      if (member) {
        const name = Util.jobToFullName(Util.jobEnumToJob(member.job)).simple1
        if (name)
          return name
      }
      if (String(id || '').startsWith('1'))
        return '玩家'
      return fallback || 'Unknown'
    }

    for (const line of encounter.lines) {
      const split = line.split('|')
      const type = split[logDefinitions.GameLog.fields.type]
      const timestampText = split[logDefinitions.GameLog.fields.timestamp] || ''
      const timestamp = new Date(timestampText).getTime()

      if (type === logDefinitions.StartsUsing.type) {
        const abilityNameRaw = split[logDefinitions.StartsUsing.fields.ability] || ''
        const abilityIdRaw = split[logDefinitions.StartsUsing.fields.id] || ''
        const castTime = split[logDefinitions.StartsUsing.fields.castTime] || ''
        const castSeconds = Number.parseFloat(castTime)
        if (!Number.isFinite(castSeconds) || castSeconds < 1)
          continue
        const abilityName = resolveRsvAbilityName(abilityNameRaw, rsvDataGlobal)
        pruneActiveCasts(timestamp)
        const castKeys = [
          ...buildCastIdMatchKeys([abilityIdRaw]),
          ...buildCastNameMatchKeys([abilityName]),
        ]
        castKeys.forEach((castKey) => {
          activeCasts.set(castKey, { totalTime: castTime, startedAt: timestamp })
        })
        continue
      }

      if (type === logDefinitions.GainsEffect.type) {
        const targetId = split[logDefinitions.GainsEffect.fields.targetId] || ''
        const effectId = split[logDefinitions.GainsEffect.fields.effectId] || ''
        const keigenn = getKeigenn(effectId)
        if (targetId.startsWith('1') && keigenn) {
          if (!statusData[targetId])
            statusData[targetId] = {}
          statusData[targetId][effectId] = keigenn
        }
        continue
      }

      if (type === logDefinitions.LosesEffect.type) {
        const targetId = split[logDefinitions.LosesEffect.fields.targetId] || ''
        const effectId = split[logDefinitions.LosesEffect.fields.effectId] || ''
        if (statusData[targetId])
          delete statusData[targetId][effectId]
        continue
      }

      if (type === logDefinitions.StatusEffect.type) {
        const targetId = split[logDefinitions.StatusEffect.fields.targetId] || ''
        const shieldValue = Number.parseInt(split[logDefinitions.StatusEffect.fields.currentShield] || '0', 10) || 0
        if (targetId.startsWith('1'))
          shieldData[targetId] = shieldValue
        continue
      }

      if (type !== logDefinitions.Ability.type && type !== logDefinitions.NetworkAOEAbility.type)
        continue

      const sourceId = split[logDefinitions.Ability.fields.sourceId] || '0'
      const targetId = split[logDefinitions.Ability.fields.targetId] || '0'
      const abilityIdHex = split[logDefinitions.Ability.fields.id] || '0'
      const actionIdHex = split[logDefinitions.Ability.fields.actionId] || '0'
      const abilityIdDec = Number.parseInt(abilityIdHex, 16)
      const abilityOwnerId = split[logDefinitions.Ability.fields.ownerId] || '0'
      const abilityNameRaw = split[logDefinitions.Ability.fields.ability] || 'Unknown'
      const abilityName = resolveRsvAbilityName(abilityNameRaw, rsvDataGlobal)
      pruneActiveCasts(timestamp)
      const castTime
        = resolveCastTime(buildCastIdMatchKeys([abilityIdHex, actionIdHex]), timestamp)
          ?? resolveCastTime(buildCastNameMatchKeys([abilityName]), timestamp)
      const isOwnerPlayer = !/^0+$/.test(abilityOwnerId) && abilityOwnerId.startsWith('1')
      let realPlayerId = sourceId.startsWith('1') ? sourceId : (isOwnerPlayer ? abilityOwnerId : null)

      if (realPlayerId && partyIds.has(realPlayerId)) {
        const actionKey = `${realPlayerId}_${abilityIdDec}_${timestampText}`
        if (playerActionKeys.has(actionKey)) {
          realPlayerId = null
        }
        else {
          playerActionKeys.add(actionKey)
        }
      }

      if (includePlayerActions && realPlayerId && partyIds.has(realPlayerId) && validSkillIds.has(abilityIdDec)) {
        const columnKey = columnKeyByPartyId.get(realPlayerId)
        if (!columnKey)
          continue
        playerActions.push({
          id: createActionId(),
          timestamp: (timestamp - encounter.startTime) / 1000,
          columnKey,
          skillId: abilityIdDec,
        })
      }

      if (sourceId.startsWith('1') || isOwnerPlayer || !includeMechanics)
        continue

      const ability = processAbilityLine(split)
      if ((!ability.isAttack && ability.amount === 0) || ability.isHeal)
        continue
      if (sourceId === targetId)
        continue
      if (sourceId.startsWith('4') && targetId.startsWith('4') && sourceId !== targetId)
        continue

      const flags = ability.flags
      const { type: damageType, effect } = processFlags(flags)
      const reduction = calculateReductionMultiplier(damageType, effect, statusData[targetId] || {})

      rawEvents.push({
        timestamp,
        id: abilityIdHex,
        name: abilityName,
        amount: ability.amount,
        type: damageType,
        sourceId,
        sourceName: getSanitizedNameById(sourceId, split[logDefinitions.Ability.fields.source] || 'Unknown'),
        targetId,
        targetName: getSanitizedNameById(targetId, split[logDefinitions.Ability.fields.target] || 'Unknown'),
        flags,
        line,
        reduction,
        shield: shieldData[targetId] || 0,
        castTime,
      })
    }

    if (!includeMechanics) {
      return {
        rows: [],
        playerActions,
      }
    }

    const grouped: GroupedRawEvents[] = []
    const groupedByStableKey = new Map<string, GroupedRawEvents[]>()
    const sortedRawEvents = [...rawEvents].sort((a, b) => a.timestamp - b.timestamp)
    for (const event of sortedRawEvents) {
      // Group by ability id (instead of source) so simultaneous same-mechanic hits
      // from multiple casters are merged into one mechanic row with multi-targets.
      const stableKey = `${event.id}`
      const groupList = groupedByStableKey.get(stableKey) || []
      const previousGroup = groupList[groupList.length - 1]
      if (previousGroup && event.timestamp - previousGroup.firstTimestamp <= EVENT_GROUP_WINDOW_MS) {
        previousGroup.events.push(event)
        continue
      }

      const nextGroup: GroupedRawEvents = {
        firstTimestamp: event.timestamp,
        id: event.id,
        name: event.name,
        events: [event],
      }
      groupList.push(nextGroup)
      groupedByStableKey.set(stableKey, groupList)
      grouped.push(nextGroup)
    }

    const rowDrafts: Array<Omit<MitigationRow, 'isAOE' | 'isTB'> & { localIsAOE: boolean, localIsTB: boolean }> = []
    const sortedGroups = [...grouped].sort((a, b) => a.firstTimestamp - b.firstTimestamp)

    for (let groupIndex = 0; groupIndex < sortedGroups.length; groupIndex += 1) {
      const group = sortedGroups[groupIndex]!
      const targetsSet = new Set(group.events.map(event => event.targetId))
      const uniqueTargetsById = new Map<string, string>()
      group.events.forEach((event) => {
        if (!uniqueTargetsById.has(event.targetId))
          uniqueTargetsById.set(event.targetId, event.targetName)
      })
      const targetsByTimestamp = new Map<number, Set<string>>()
      group.events.forEach((event) => {
        const bucket = targetsByTimestamp.get(event.timestamp)
        if (bucket) {
          bucket.add(event.targetId)
          return
        }
        targetsByTimestamp.set(event.timestamp, new Set([event.targetId]))
      })
      const flags = group.events.map(event => event.flags)

      const estimatedRawDamages = group.events.map((event) => {
        const safeReduction = Math.min(0.95, event.reduction)
        return Math.round((event.amount + event.shield) / (1 - safeReduction))
      })

      const normalizedDamages = group.events.map((event, index) => {
        let raw = estimatedRawDamages[index] || 0
        const member = partyMembersMap.get(event.targetId)
        if (member && Util.isTankJob(Util.jobEnumToJob(member.job)))
          raw = Math.round(raw / 0.8)
        return raw
      })

      const simultaneousHitCount = Math.max(
        0,
        ...Array.from(targetsByTimestamp.values()).map(bucket => bucket.size),
      )
      const hitCount = simultaneousHitCount
      const isAOE = hitCount >= 4

      const damagesForBaseline = isAOE ? normalizedDamages : estimatedRawDamages
      const nonSpecialDamages = damagesForBaseline.filter(damage => Number.isFinite(damage) && damage > 0 && damage <= EXTREME_DAMAGE_THRESHOLD)
      const baselinePool = nonSpecialDamages.length > 0
        ? nonSpecialDamages
        : damagesForBaseline.filter(damage => Number.isFinite(damage) && damage > 0)
      const medianDamage = calculateMedian(baselinePool)
      const maxDamage = baselinePool.length > 0 ? Math.max(...baselinePool) : 0
      const outlierRatio = medianDamage > 0 ? maxDamage / medianDamage : 0
      const hasDamageOutlier = hitCount >= 2 && outlierRatio >= 2

      const filteredDamages = baselinePool.filter((damage) => {
        if (medianDamage <= 0)
          return true
        return damage <= 2 * medianDamage
      })
      const baselineCandidates = filteredDamages.length > 0 ? filteredDamages : baselinePool
      const baselineRawDamage = baselineCandidates.length > 0
        ? Math.round(calculateAverage(baselineCandidates))
        : 0

      const targetThresholds = group.events.map((event) => {
        const member = partyMembersMap.get(event.targetId)
        return member && Util.isTankJob(Util.jobEnumToJob(member.job)) ? 200000 : 250000
      })
      const baselineThreshold = targetThresholds.length > 0 ? Math.max(...targetThresholds) : 0
      const allTargetsHighDamage = estimatedRawDamages.length > 0
        ? estimatedRawDamages.every((damage, index) => damage >= (targetThresholds[index] || 0) || damage === 0)
        : false
      const hasExtremeDamage = estimatedRawDamages.some(damage => damage > EXTREME_DAMAGE_THRESHOLD)
      const isTBTargetCount = hitCount === 1 || hitCount === 2
      const isTB = !isAOE
        && isTBTargetCount
        && !hasDamageOutlier
        && !hasExtremeDamage
        && baselineRawDamage > baselineThreshold
        && allTargetsHighDamage

      const normalizedTime = (group.firstTimestamp - encounter.startTime) / 1000
      if (normalizedTime < -30)
        continue
      const castDuration = group.events[0]?.castTime
      const castSeconds = castDuration !== undefined ? Number.parseFloat(castDuration) : Number.NaN

      const damageDetails = group.events.map((event, index) => ({
        target: event.targetName,
        targetId: event.targetId,
        damage: event.amount,
        flag: event.flags,
        estimatedRaw: estimatedRawDamages[index],
      }))

      rowDrafts.push({
        key: `${importKeySeed}_${group.id}_${group.firstTimestamp}_${group.events[0]?.sourceId || 'src'}_${groupIndex}`,
        timestamp: normalizedTime,
        action: group.name,
        actionId: group.id,
        source: group.events[0]?.sourceName || 'Unknown',
        damageType: group.events[0]?.type || 'physics',
        rawDamage: baselineRawDamage,
        targetCount: Math.max(1, targetsSet.size),
        flags,
        damageDetails,
        targets: Array.from(uniqueTargetsById.values()),
        targetIds: Array.from(uniqueTargetsById.keys()),
        castTime: castDuration,
        castStartTime: Number.isFinite(castSeconds) ? normalizedTime - castSeconds : undefined,
        // Avoid retaining potentially sensitive raw log lines in parsed mechanic rows.
        rawLines: [],
        localIsAOE: isAOE,
        localIsTB: isTB,
      })
    }

    const actionTypeStateById = new Map<string, { isAOE: boolean, isTB: boolean }>()
    rowDrafts.forEach((draft) => {
      const state = actionTypeStateById.get(draft.actionId) || { isAOE: false, isTB: false }
      if (draft.localIsAOE)
        state.isAOE = true
      if (draft.localIsTB)
        state.isTB = true
      actionTypeStateById.set(draft.actionId, state)
    })

    const rows: MitigationRow[] = rowDrafts.map((draft) => {
      const { localIsAOE, localIsTB, ...row } = draft
      const state = actionTypeStateById.get(draft.actionId) || { isAOE: localIsAOE, isTB: localIsTB }
      return {
        ...row,
        isAOE: state.isAOE,
        isTB: !state.isAOE && state.isTB,
        isShare: false,
      }
    })

    addPrepullRows(rows, importKeySeed)

    return {
      rows: rows.sort((a, b) => a.timestamp - b.timestamp),
      playerActions,
    }
  }

  return {
    parseFile,
    extractMechanics,
  }
}
