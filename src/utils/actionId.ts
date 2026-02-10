export function createActionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function ensureActionId<T extends { id?: string }>(action: T): T & { id: string } {
  if (action.id)
    return action as T & { id: string }
  return { ...action, id: createActionId() }
}
