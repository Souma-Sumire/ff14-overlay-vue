import { describe, expect, it } from 'vitest'
import {
  normalizeTeamWatchActionMetaRaw,
  TEAM_WATCH_EMPTY_ACTIONS,
} from '../teamWatchResource'

describe('teamWatchResource', () => {
  it('normalizeTeamWatchActionMetaRaw should return fallback for invalid input', () => {
    const fallback = normalizeTeamWatchActionMetaRaw(0, null)
    expect(fallback.id).toBe(0)
    expect(fallback.name).toBe('#0')
  })

  it('team_WATCH_EMPTY_ACTIONS should be [0, 0, 0, 0, 0]', () => {
    expect(TEAM_WATCH_EMPTY_ACTIONS).toEqual([0, 0, 0, 0, 0])
  })
})
