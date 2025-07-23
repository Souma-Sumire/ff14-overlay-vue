import type { FFlogsStance, FFlogsType } from '../types/fflogs'

const windowAction: Map<
  number,
  { type: FFlogsType, window: [number, number], syncOnce?: boolean, battleOnce?: boolean }
> = new Map()

windowAction.set(26155, { type: 'cast', window: [999, 999], battleOnce: true }) // 海德林转场 众生离绝
windowAction.set(28027, { type: 'cast', window: [999, 999], battleOnce: true }) // 佐迪亚克转场 悼念
windowAction.set(26340, { type: 'cast', window: [999, 999], battleOnce: true }) // P3S转场 黑暗不死鸟
windowAction.set(25533, { type: 'begincast', window: [60, 60] }) // 绝龙诗 万物终结
windowAction.set(26376, { type: 'cast', window: [999, 999], battleOnce: true }) // 绝龙诗 灭绝之诗
windowAction.set(26814, { type: 'begincast', window: [999, 999], battleOnce: true }) // 绝龙诗 邪龙爪牙
windowAction.set(25313, { type: 'begincast', window: [200, 200] }) // 绝龙诗 空间牢狱
windowAction.set(27526, { type: 'begincast', window: [999, 999], battleOnce: true }) // 绝龙诗 圣徒化
windowAction.set(26215, { type: 'cast', window: [500, 30], battleOnce: true }) // 绝龙诗 P6: Nidhogg v2
windowAction.set(29050, { type: 'begincast', window: [200, 30], battleOnce: true }) // 绝龙诗 P6.5: Eyes v2
windowAction.set(29156, { type: 'cast', window: [20, 20] }) // 绝龙诗 冲击波
windowAction.set(27973, { type: 'cast', window: [20, 20] }) // 绝龙诗 邪念之火
windowAction.set(27937, { type: 'begincast', window: [20, 20] }) // 绝龙诗 绝命怒嚎
windowAction.set(28059, { type: 'begincast', window: [20, 20] }) // 绝龙诗 骑龙剑百京核爆
windowAction.set(28060, { type: 'begincast', window: [20, 20] }) // 绝龙诗 骑龙剑百京核爆
windowAction.set(28061, { type: 'begincast', window: [20, 20] }) // 绝龙诗 骑龙剑百京核爆
windowAction.set(27956, { type: 'begincast', window: [20, 20] }) // 绝龙诗 圣龙吐息 不太行 吐息是随机的
windowAction.set(27957, { type: 'begincast', window: [20, 20] }) // 绝龙诗 圣龙吐息 不太行 吐息是随机的
windowAction.set(27952, { type: 'begincast', window: [30, 30] }) // 绝龙诗 灭杀的誓言
windowAction.set(27969, { type: 'begincast', window: [20, 20] }) // 绝龙诗 无尽轮回
windowAction.set(27971, { type: 'begincast', window: [20, 20] }) // 绝龙诗 无尽轮回
windowAction.set(27939, { type: 'begincast', window: [20, 20] }) // 绝龙诗 神圣之翼
windowAction.set(27966, { type: 'begincast', window: [20, 20] }) // 绝龙诗 邪炎俯冲
windowAction.set(25316, { type: 'begincast', window: [999, 999], battleOnce: true }) // 绝龙诗 纯洁心灵
windowAction.set(25544, { type: 'begincast', window: [10, 10] }) // 绝龙诗 阿斯卡隆之仁·隐秘
windowAction.set(26379, { type: 'begincast', window: [10, 10] }) // 绝龙诗 腾龙枪
windowAction.set(31552, { type: 'begincast', window: [30, 30] }) // 绝欧米茄 防御程序
windowAction.set(31573, { type: 'begincast', window: [30, 30] }) // 绝欧米茄 你好，世界
windowAction.set(31573, { type: 'begincast', window: [30, 30] }) // 绝欧米茄 你好，世界
windowAction.set(31617, { type: 'begincast', window: [8, 8] }) // 绝欧米茄 波动炮
windowAction.set(31624, { type: 'begincast', window: [30, 30] }) // 绝欧米茄 代号：*能*·德尔塔
windowAction.set(31649, { type: 'begincast', window: [30, 30] }) // 绝欧米茄 宇宙记忆

// 绝亚未实测
windowAction.set(0x49B0, { type: 'cast', window: [10, 2.5], syncOnce: true }) // 流体摆动
windowAction.set(0x4830, { type: 'cast', window: [200, 60], syncOnce: true, battleOnce: true }) // 鹰式破坏炮
windowAction.set(0x4854, { type: 'cast', window: [250, 65], syncOnce: true, battleOnce: true }) // 正义飞踢
windowAction.set(0x485A, { type: 'begincast', window: [500, 500], syncOnce: true, battleOnce: true }) // 时间停止
windowAction.set(0x4878, { type: 'begincast', window: [67, 67], syncOnce: true }) // 神圣审判
windowAction.set(0x4879, { type: 'cast', window: [67, 67], syncOnce: true }) // 神圣审判
windowAction.set(0x4A8B, { type: 'cast', window: [900, 200], syncOnce: true, battleOnce: true }) // unknown

// 绝伊甸
windowAction.set(0x9CFF, { type: 'begincast', window: [200, 20], syncOnce: true }) // P2 四重强击
windowAction.set(0x9D49, { type: 'begincast', window: [500, 20], syncOnce: true, battleOnce: true }) // P3 地狱审判
windowAction.set(0x9D36, { type: 'begincast', window: [999, 30], syncOnce: true, battleOnce: true }) // P4 具象化
windowAction.set(0x9D72, { type: 'begincast', window: [30, 30], syncOnce: true }) // P5 光尘之剑

// 绝神兵未实测
windowAction.set(0x2B5F, { type: 'begincast', window: [310, 30], syncOnce: true, battleOnce: true }) // P2 深红旋风
windowAction.set(0x2CFD, { type: 'begincast', window: [600, 30], syncOnce: true, battleOnce: true }) // P3 大地粉碎
windowAction.set(0x2B72, { type: 'begincast', window: [100, 30], syncOnce: true, battleOnce: true }) // P4 雾散爆发
windowAction.set(0x2B87, { type: 'begincast', window: [60, 60], syncOnce: true }) // 魔导核爆
windowAction.set(0x2B76, { type: 'begincast', window: [100, 100], syncOnce: true, battleOnce: true }) // 追击之究极幻想
windowAction.set(0x2D4C, { type: 'begincast', window: [100, 100], syncOnce: true, battleOnce: true }) // 爆击之究极幻想
windowAction.set(0x2D4D, { type: 'begincast', window: [100, 100], syncOnce: true, battleOnce: true }) // 乱击之究极幻想

// M5S
windowAction.set(0xA721, { type: 'begincast', window: [9.6, 2], syncOnce: true }) // 经典铭心
windowAction.set(0xA756, { type: 'cast', window: [77.2, 30], syncOnce: true, battleOnce: true }) // 激热跳舞街
windowAction.set(0xA76F, { type: 'cast', window: [30, 30], syncOnce: false }) // 在这停顿！
windowAction.set(0xA723, { type: 'cast', window: [30, 30], syncOnce: false }) // 欢庆时刻
windowAction.set(0xA770, { type: 'cast', window: [30, 30], syncOnce: false }) // 在这停顿！

// M8S
windowAction.set(0xA3DA, { type: 'begincast', window: [10, 10], syncOnce: false }) // 空间斩
windowAction.set(0xA3D0, { type: 'begincast', window: [20, 30], syncOnce: true }) // 风之狼吼
windowAction.set(0xA3D3, { type: 'begincast', window: [20, 20], syncOnce: true }) // 土之狼吼
windowAction.set(0xA749, { type: 'begincast', window: [60, 60], syncOnce: true, battleOnce: true }) // 风尘光狼斩
windowAction.set(0xA3F1, { type: 'begincast', window: [20, 20], syncOnce: true }) // 空间灭斩
windowAction.set(0xA38F, { type: 'cast', window: [60, 60], syncOnce: true, battleOnce: true }) // --middle--
windowAction.set(0xA82D, { type: 'cast', window: [60, 60], syncOnce: true, battleOnce: true }) // --sync--

export function factory(events: FFlogsStance): FFlogsStance {
  for (const event of events) {
    const w = windowAction.get(event.actionId)
    if (w?.type === event.type) {
      event.window = w?.window
      event.syncOnce = Boolean(w?.syncOnce)
      event.battleOnce = Boolean(w?.battleOnce)
    }
  }
  return events
}
