export interface ResourceTracker {
  reset(): void
  processLine(type: string, splitLine: string[]): void
  getResource(characterId: string): number | undefined
  isReady?(characterId: string, skillId: number, cost: number): boolean
  getExtraText?(characterId: string, skillId: number, timestamp: number, allCooldowns: Record<number, number[]>): string
}
