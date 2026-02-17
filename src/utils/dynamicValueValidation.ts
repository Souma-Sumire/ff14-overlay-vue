import type { DynamicValue } from '@/types/dynamicValue'
import { validateTeamWatchDynamicValue } from '@/resources/teamWatchResource'

export function parseOptionalDynamicInput(input: string): DynamicValue | undefined {
  const trimmed = input.trim()
  if (!trimmed)
    return undefined
  const numeric = Number(trimmed)
  if (Number.isFinite(numeric))
    return numeric
  return trimmed
}

export function parseRequiredDynamicInput(input: string): DynamicValue | null {
  const trimmed = input.trim()
  if (!trimmed)
    return null
  const numeric = Number(trimmed)
  if (Number.isFinite(numeric))
    return numeric
  return trimmed
}

export function validateOptionalDynamicInput(input: string, label: string) {
  const parsed = parseOptionalDynamicInput(input)
  if (parsed === undefined)
    return ''
  return validateTeamWatchDynamicValue(parsed, label)
}

export function validateRequiredDynamicInput(input: string, label: string) {
  const parsed = parseRequiredDynamicInput(input)
  if (parsed === null) {
    return {
      parsed: null,
      message: `${label}不能为空`,
    }
  }
  return {
    parsed,
    message: validateTeamWatchDynamicValue(parsed, label),
  }
}
