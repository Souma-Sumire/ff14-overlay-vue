const JOB_RESOURCE_ACTION_COST_MAP: Record<number, number> = {
  // PLD 忠义量谱
  27: 50, // 保护
  3542: 50, // 盾阵
  7382: 50, // 干预
  25746: 50, // 圣盾阵

  // DRK MP
  7393: 3000, // 至黑之夜

  // SCH 以太超流
  167: 1, // 能量吸收
  188: 1, // 野战治疗阵
  3583: 1, // 不屈不挠之策
  7434: 1, // 深谋远虑之策

  // SGE 蛇胆
  24296: 1, // 灵橡清汁
  24298: 1, // 坚角清汁
  24299: 1, // 寄生清汁
  24303: 1, // 白牛清汁

  // WHM 治疗百合
  16531: 1, // 安慰之心
  16534: 1, // 狂喜之心
};

export function getJobResourceActionCost(actionId: number): number | undefined {
  if (!Number.isFinite(actionId) || actionId <= 0) return undefined;
  return JOB_RESOURCE_ACTION_COST_MAP[actionId];
}

export function resolveJobResourceActionCost(...actionIds: number[]): number | undefined {
  for (const id of actionIds) {
    const cost = getJobResourceActionCost(id);
    if (cost !== undefined) return cost;
  }
  return undefined;
}
