import ZoneId from "../../cactbot/resources/zone_id";

// 只需要写本体的
const bossPhase: Record<
  string,
  {
    // 实际进游戏时的boss bNpcID
    bNpcId: number[];
    // 用于从fflogs自动导入日志时自动选择阶段
    fflogsBoss?: number;
  }
> = {
  // O4S 新生艾克斯迪司
  [ZoneId.DeltascapeV40Savage]: { bNpcId: [7459] },
  // O8S 凯夫卡 未知
  // [ZoneId.SigmascapeV40Savage]: [?],
  // O12S 欧米茄
  // [ZoneId.AlphascapeV40Savage]: [?],
  // P4S 赫斯珀洛斯
  // [ZoneId.AsphodelosTheFourthCircleSavage]: [?],
  // P8S 赫淮斯托斯
  // [ZoneId.AbyssosTheEighthCircleSavage]: [?],
  // P12S 帕拉斯雅典娜
  // [ZoneId.AnabaseiosTheTwelfthCircleSavage]: [?],
  // M4S 狡雷
  // [ZoneId.AacLightHeavyweightM4Savage]: [?],
  // M8S 剑嚎
  // [ZoneId.AacCruiserweightM4Savage]: [?],
  // M12S 林德布鲁姆
  [ZoneId.AacHeavyweightM4Savage]: { bNpcId: [19202], fflogsBoss: 105 },
};

export { bossPhase };
