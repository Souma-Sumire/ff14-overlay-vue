import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as teamWatchResource from '../../resources/teamWatchResource'
import { useTeamWatchStore } from '../teamWatchStore'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

vi.stubGlobal('localStorage', localStorageMock)

describe('teamWatchStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should initialize with default settings if storage is empty', () => {
    const store = useTeamWatchStore()
    expect(store.sortRuleUser.length).toBeGreaterThan(0)
    expect(Object.keys(store.watchJobsActionsIDUser).length).toBeGreaterThan(0)
  })

  it('saveSettings should update state and call saveTeamWatchStorageData', () => {
    const store = useTeamWatchStore()
    const spy = vi.spyOn(teamWatchResource, 'saveTeamWatchStorageData')

    const nextSettings = {
      sortRuleUser: [1, 2, 3],
      watchJobsActionsIDUser: { 1: [100, 200] },
      actionMetaUser: {},
    }

    store.saveSettings(nextSettings)

    expect(store.sortRuleUser).toEqual([1, 2, 3])
    // Note: buildStorageData might normalize it, so we check inclusion
    expect(store.watchJobsActionsIDUser[1]).toEqual([100, 200])
    expect(spy).toHaveBeenCalled()
  })

  it('resetSettings should restore defaults but preserve known jobs', () => {
    const store = useTeamWatchStore()
    const customJob = 999
    store.watchJobsActionsIDUser[customJob] = [123, 456]

    store.resetSettings()

    // Sort rule should be back to default
    expect(store.sortRuleUser).not.toContain(customJob)
    // Job is still in watch map (due to knownJobs initialization logic) but actions are reset to empty/default
    expect(store.watchJobsActionsIDUser[customJob]).toEqual([0, 0, 0, 0, 0])
  })

  it('resetSettings should restore factory skills for standard jobs', () => {
    const store = useTeamWatchStore()
    const pld = 19 // Paladin
    store.watchJobsActionsIDUser[pld] = [0, 0, 0, 0, 0]

    store.resetSettings()

    // Paladin should have its default skills (e.g., Hallowed Ground is usually in there)
    const pldActions = store.watchJobsActionsIDUser[pld]
    expect(pldActions).not.toEqual([0, 0, 0, 0, 0])
    expect(pldActions.includes(7535)).toBe(true) // Shirk/Reprisal or similar default
  })

  it('exportSettings and importSettings should be consistent', () => {
    const store = useTeamWatchStore()
    const originalSnapshot = store.getSnapshot()

    const exported = store.exportSettings()
    expect(typeof exported).toBe('string')

    store.importSettings(exported)
    const importedSnapshot = store.getSnapshot()

    expect(importedSnapshot.sortRuleUser).toEqual(originalSnapshot.sortRuleUser)
    expect(importedSnapshot.watchJobsActionsIDUser).toEqual(originalSnapshot.watchJobsActionsIDUser)
  })

  it('watch should automatically persist changes', async () => {
    const store = useTeamWatchStore()
    const spy = vi.spyOn(teamWatchResource, 'saveTeamWatchStorageData')

    // Changing a reactive property
    store.fakeMode = true

    // Wait for watch to trigger (watchers are async by default in Vue 3)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(spy).toHaveBeenCalled()
  })
})
