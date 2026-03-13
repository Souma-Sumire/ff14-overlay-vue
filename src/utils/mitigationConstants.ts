export const EXTREME_DAMAGE_THRESHOLD = 9_000_000;

export function buildPartyColumnKey(index: number, targetId: string) {
  const normalizedTargetId = String(targetId || "").trim() || `unknown_${index + 1}`;
  return `party_${index + 1}_${normalizedTargetId}`;
}
