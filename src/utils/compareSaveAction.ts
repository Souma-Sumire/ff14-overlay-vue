import { actionId2ClassJobLevel } from '@/resources/action2ClassJobLevel'

// 共享CD映射：仅用于把同CD技能归并到同一ID。
const compareSameGroup = {
  16484: 16486, // 回返彼岸花→回返纷乱雪月花
  16485: 16486, // 回返天下五剑→回返纷乱雪月花
  7496: 16481, // 必杀剑·红莲→必杀剑·闪影
  16003: 16192, /// 0色标准舞步结束→双色标准舞步结束
  16191: 16192, // 单色标准舞步→双色标准舞步结束
  16004: 16196, // 0色技巧舞步结束→四色技巧舞步结束
  16193: 16196, // 单色技巧舞步结束→四色技巧舞步结束
  16194: 16196, // 双色技巧舞步结束→四色技巧舞步结束
  16195: 16196, // 三色技巧舞步结束→四色技巧舞步结束
  3551: 25751, // 原初的直觉→原初的血气
  16464: 25751, // 原初的勇猛→原初的血气
  16510: 16508, // 能量抽取→能量吸收
  16499: 16498, // 毒菌冲击→钻头
  23287: 23290, // 如意大旋风→月下彼岸花
  18324: 18325, // 类星体→正义飞踢
  23272: 23285, // 天使的点心→马特拉魔术
  23280: 23285, // 龙之力→马特拉魔术
  23273: 23275, // 玄结界→斗灵弹
  11426: 11427, // 飞翎雨→地火喷发
  11428: 11429, // 山崩→轰雷
  34686: 34685, // 油性坦培拉涂层→坦培拉涂层
} as const

const compareSameMap = new Map<number, number>(Object.entries(compareSameGroup).map(([k, v]) => [Number(k), v]))
const compareSameSourceIdSet = new Set<number>(compareSameMap.keys())

export function compareSame(id: number) {
  return compareSameMap.get(id) || id
}

export function isCompareSameSourceId(id: number) {
  return compareSameSourceIdSet.has(id)
}

// 技能进化映射：用于将下位技能归一到上位技能。
// 例如 A -> B -> C 需写为 { A: B, B: C }。
export const ACTION_UPGRADE_STEPS: Record<number, number> = {
  17: 36920, // 预警 -> 极致防御
  21: 3539, // 战女神之怒 -> 王权剑
  29: 25747, // 深奥之灵 -> 偿赎剑
  3542: 25746, // 盾阵 -> 圣盾阵
  7383: 36921, // 安魂祈祷 -> 绝对统治

  38: 7389, // 狂暴 -> 原初的解放
  44: 36923, // 复仇 -> 戮罪
  49: 3549, // 原初之魂 -> 裂石飞环
  51: 3550, // 钢铁旋风 -> 地毁人亡
  3551: 25751, // 原初的直觉 -> 原初的血气

  3636: 36927, // 暗影墙 -> 暗影卫
  3625: 7390, // 嗜血 -> 血乱
  16466: 16469, // 暗黑波动 -> 暗影波动
  16467: 16470, // 暗黑锋 -> 暗影锋

  16144: 16165, // 危险领域 -> 爆破领域
  16148: 36935, // 星云 -> 大星云
  16161: 25758, // 石之心 -> 刚玉之心

  133: 37010, // 医济 -> 医养
  139: 25860, // 神圣 -> 豪圣
  16533: 25859, // 闪耀 -> 闪灼
  7431: 16533, // 崩石 -> 闪耀
  132: 16532, // 烈风 -> 天辉
  3568: 7431, // 垒石 -> 崩石
  127: 3568, // 坚石 -> 垒石
  121: 132, // 疾风 -> 烈风
  119: 127, // 飞石 -> 坚石
  186: 37013, // 士气高扬之策 -> 意气轩昂之策
  16539: 25866, // 破阵法 -> 裂阵法
  16541: 25865, // 死炎法 -> 极炎法
  7435: 16541, // 魔炎法 -> 死炎法
  17865: 16540, // 猛毒菌 -> 蛊毒法
  3584: 7435, // 气炎法 -> 魔炎法
  // 163: 3584, // 毁灭 -> 气炎法
  17864: 17865, // 毒菌 -> 猛毒菌
  3601: 37030, // 阳星相位 -> 阳星合相
  3615: 25872, // 重力 -> 中重力
  16555: 25871, // 煞星 -> 落陷凶星
  7442: 16555, // 祸星 -> 煞星
  3608: 16554, // 炽灼 -> 焚灼
  3598: 7442, // 灾星 -> 祸星
  3596: 3598, // 凶星 -> 灾星
  3599: 3608, // 烧灼 -> 炽灼
  24292: 37034, // 均衡预后 -> 均衡预后II
  24306: 24312, // 注药II -> 注药III
  24307: 24313, // 发炎II -> 发炎III
  24308: 24314, // 均衡注药II -> 均衡注药III
  24297: 24315, // 失衡 -> 失衡II
  24304: 24316, // 箭毒 -> 箭毒II
  24283: 24306, // 注药 -> 注药II
  24289: 24307, // 发炎 -> 发炎II
  24293: 24308, // 均衡注药 -> 均衡注药II
  24288: 24302, // 自生 -> 自生II
  36940: 36942, // 铁山斗气 -> 阴阳斗气
  25761: 3547, // 铁山靠 -> 阴阳斗气斩
  36941: 36943, // 空鸣斗气 -> 万象斗气
  25763: 16474, // 空鸣拳 -> 万象斗气圈
  62: 25767, // 破坏神冲 -> 破坏神脚
  25882: 25768, // 爆裂脚 -> 凤凰舞
  3543: 25769, // 斗魂旋风脚 -> 梦幻斗舞
  53: 36945, // 连击 -> 猿舞连击
  54: 36946, // 正拳 -> 龙颚正拳
  56: 36947, // 崩拳 -> 豹袭崩拳
  3545: 36948, // 苍气炮 -> 真空波
  92: 16478, // 跳跃 -> 高跳
  84: 25771, // 直刺 -> 苍穹刺
  88: 25772, // 樱花怒放 -> 樱花缭乱
  78: 36954, // 贯通刺 -> 前冲刺
  87: 36955, // 开膛枪 -> 螺旋击
  2258: 36958, // 攻其不备 -> 百雷铳
  2248: 36957, // 夺取 -> 介毒之术
  2246: 3566, // 断绝 -> 梦幻三段
  7477: 36963, // 刃风 -> 晓风
  7483: 25780, // 风雅 -> 风光
  7498: 36962, // 心眼 -> 天眼通
  110: 36975, // 失血箭 -> 碎心箭
  106: 25783, // 连珠箭 -> 百首龙牙箭
  97: 16495, // 强力射击 -> 爆发射击
  36974: 16494, // 广域群射 -> 影噬箭
  98: 7409, // 直线射击 -> 辉煌箭
  100: 7406, // 毒咬箭 -> 烈毒咬箭
  113: 7407, // 风蚀箭 -> 狂风蚀箭
  2874: 36979, // 虹吸弹 -> 双将
  2890: 36980, // 弹射 -> 将死
  2870: 25786, // 散射 -> 霰弹枪
  2864: 16501, // 车式浮空炮塔 -> 后式自走人偶
  7415: 16502, // 超档车式炮塔 -> 超档后式人偶
  2872: 16500, // 热弹 -> 空气锚
  7410: 36978, // 热冲击 -> 烈焰弹
  2873: 7413, // 狙击弹 -> 热狙击弹
  2868: 7412, // 独头弹 -> 热独头弹
  2866: 7411, // 分裂弹 -> 热分裂弹
  153: 36986, // 暴雷 -> 高闪雷
  7420: 36987, // 霹雷 -> 高震雷
  147: 25794, // 烈炎 -> 高烈炎
  25793: 25795, // 冰冻 -> 高冰冻
  7447: 7420, // 震雷 -> 霹雷
  144: 153, // 闪雷 -> 暴雷
  181: 36990, // 溃烂爆发 -> 坏死爆发
  25805: 25838, // 火神召唤 -> 火神召唤II
  25806: 25839, // 土神召唤 -> 土神召唤II
  25807: 25840, // 风神召唤 -> 风神召唤II
  16511: 25826, // 迸裂 -> 三重灾祸
  3581: 7427, // 龙神附体 -> 龙神召唤
  25800: 3581, // 以太蓄能 -> 龙神附体
  172: 3579, // 毁坏 -> 毁荡
  25804: 25807, // 绿宝石召唤 -> 风神召唤
  25803: 25806, // 黄宝石召唤 -> 土神召唤
  25802: 25805, // 红宝石召唤 -> 火神召唤
  // 163: 172, // 毁灭 -> 毁坏
  7505: 25855, // 赤闪雷 -> 赤暴雷
  7507: 25856, // 赤疾风 -> 赤暴风
  7524: 37004, // 震荡 -> 激荡
  7509: 16526, // 散碎 -> 冲击
  7503: 7524, // 摇荡 -> 震荡
}

// 技能进化链学习等级覆写表（可选）。
// key: actionId, value: 学习等级
// 若未配置则回退到 action2ClassJobLevel。
export const ACTION_UPGRADE_LEVEL_OVERRIDES: Record<number, number> = {
}

export function getUpgradeActionChain(actionId: number): number[] {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return []
  const start = Math.trunc(actionId)
  const chain: number[] = [start]
  const visited = new Set<number>([start])
  let current = start
  while (true) {
    const next = ACTION_UPGRADE_STEPS[current]
    if (next === undefined)
      break
    if (!Number.isFinite(next) || next <= 0)
      break
    const nextActionId = Math.trunc(next)
    if (visited.has(nextActionId))
      break
    chain.push(nextActionId)
    visited.add(nextActionId)
    current = nextActionId
  }
  return chain
}

const topTierUpgradeActionMap = (() => {
  const map = new Map<number, number>()
  Object.keys(ACTION_UPGRADE_STEPS).forEach((rawActionId) => {
    const lowerTierActionId = Number(rawActionId)
    if (!Number.isFinite(lowerTierActionId) || lowerTierActionId <= 0)
      return
    const chain = getUpgradeActionChain(lowerTierActionId)
    if (chain.length <= 1)
      return
    const topTierActionId = chain[chain.length - 1]!
    map.set(lowerTierActionId, topTierActionId)
  })
  return map
})()

export function normalizeUpgradeActionId(actionId: number) {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return actionId
  return topTierUpgradeActionMap.get(actionId) ?? actionId
}

export function isLowerTierActionId(actionId: number) {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return false
  return normalizeUpgradeActionId(actionId) !== actionId
}

const upgradeLowerByUpper = (() => {
  const map = new Map<number, number[]>()
  Object.entries(ACTION_UPGRADE_STEPS).forEach(([rawLower, rawUpper]) => {
    const lower = Number(rawLower)
    const upper = Number(rawUpper)
    if (!Number.isFinite(lower) || lower <= 0 || !Number.isFinite(upper) || upper <= 0)
      return
    if (!map.has(upper))
      map.set(upper, [])
    map.get(upper)!.push(lower)
  })
  return map
})()

const actionUpgradeLevelCache = new Map<number, number>()
const upgradeDepthToTopCache = new Map<number, number>()
const upgradeFamilyByTopCache = new Map<number, number[]>()
const levelResolvedUpgradeActionCache = new Map<string, number>()

function normalizeLevel(level: number) {
  if (!Number.isFinite(level))
    return 1
  return Math.max(1, Math.trunc(level))
}

export function getActionUpgradeMinLevel(actionId: number) {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return 1
  const id = Math.trunc(actionId)
  const cached = actionUpgradeLevelCache.get(id)
  if (cached !== undefined)
    return cached

  const overridden = Number(ACTION_UPGRADE_LEVEL_OVERRIDES[id])
  if (Number.isFinite(overridden) && overridden > 0) {
    const resolved = normalizeLevel(overridden)
    actionUpgradeLevelCache.set(id, resolved)
    return resolved
  }

  const fromMap = Number(actionId2ClassJobLevel(id))
  const resolved = Number.isFinite(fromMap) && fromMap > 0
    ? normalizeLevel(fromMap)
    : 1
  actionUpgradeLevelCache.set(id, resolved)
  return resolved
}

function getUpgradeDepthToTop(actionId: number) {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return 0
  const id = Math.trunc(actionId)
  const cached = upgradeDepthToTopCache.get(id)
  if (cached !== undefined)
    return cached

  let depth = 0
  let current = id
  const visited = new Set<number>([current])
  while (true) {
    const next = ACTION_UPGRADE_STEPS[current]
    if (typeof next !== 'number' || !Number.isFinite(next) || next <= 0)
      break
    const nextId = Math.trunc(next)
    if (visited.has(nextId))
      break
    depth += 1
    visited.add(nextId)
    current = nextId
  }
  upgradeDepthToTopCache.set(id, depth)
  return depth
}

function getUpgradeFamilyByTop(topActionId: number) {
  const top = Math.trunc(topActionId)
  const cached = upgradeFamilyByTopCache.get(top)
  if (cached)
    return cached

  const visited = new Set<number>()
  const stack: number[] = [top]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (visited.has(current))
      continue
    visited.add(current)
    const lowers = upgradeLowerByUpper.get(current) ?? []
    lowers.forEach((lower) => {
      if (!visited.has(lower))
        stack.push(lower)
    })
  }
  const family = [...visited]
  upgradeFamilyByTopCache.set(top, family)
  return family
}

export function resolveUpgradeActionIdForLevel(actionId: number, level: number) {
  if (!Number.isFinite(actionId) || actionId <= 0)
    return actionId

  const startActionId = Math.trunc(actionId)
  const normalizedLevel = normalizeLevel(level)
  const cacheKey = `${startActionId}:${normalizedLevel}`
  const cached = levelResolvedUpgradeActionCache.get(cacheKey)
  if (cached !== undefined)
    return cached

  const topActionId = normalizeUpgradeActionId(startActionId)
  const family = getUpgradeFamilyByTop(topActionId)
  let bestActionId = topActionId
  let bestMinLevel = Number.NEGATIVE_INFINITY
  let bestDepth = Number.NEGATIVE_INFINITY

  family.forEach((candidateId) => {
    const minLevel = getActionUpgradeMinLevel(candidateId)
    if (minLevel > normalizedLevel)
      return
    const depth = getUpgradeDepthToTop(candidateId)
    if (
      minLevel > bestMinLevel
      || (minLevel === bestMinLevel && depth > bestDepth)
      || (minLevel === bestMinLevel && depth === bestDepth && candidateId === startActionId)
    ) {
      bestActionId = candidateId
      bestMinLevel = minLevel
      bestDepth = depth
    }
  })

  if (bestMinLevel === Number.NEGATIVE_INFINITY) {
    bestActionId = family.reduce((acc, candidateId) => {
      const candidateLevel = getActionUpgradeMinLevel(candidateId)
      const accLevel = getActionUpgradeMinLevel(acc)
      if (candidateLevel < accLevel)
        return candidateId
      if (candidateLevel === accLevel && getUpgradeDepthToTop(candidateId) > getUpgradeDepthToTop(acc))
        return candidateId
      return acc
    }, topActionId)
  }

  levelResolvedUpgradeActionCache.set(cacheKey, bestActionId)
  return bestActionId
}
