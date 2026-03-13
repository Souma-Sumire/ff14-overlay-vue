export const MITIGATION_GRID_WIDTH = {
  castStart: 45,
  time: 45,
  nameMin: 120,
  target: 100,
  damage: 68,
  shield: 70,
  reduction: 58,
  columnPadding: 6,
  skillCell: 24,
  skillIcon: 22,
  addColumnHeader: 28,
} as const;

export function getMitigationGridColumnWidth(skillCount: number) {
  const normalizedSkillCount = Math.max(0, Math.floor(skillCount));
  return (
    normalizedSkillCount * MITIGATION_GRID_WIDTH.skillCell + MITIGATION_GRID_WIDTH.columnPadding
  );
}
