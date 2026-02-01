export interface ResourceTracker {
  reset(): void
  processLine(type: string, splitLine: string[]): void
  getResource(characterId: string): number | undefined
}
