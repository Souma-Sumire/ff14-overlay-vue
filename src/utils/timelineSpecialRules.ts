import { FFlogsStance, FFlogsType } from "../types/Fflogs";

const windowAction: Map<number, { type: FFlogsType; window: [number, number] }> = new Map();
windowAction.set(26155, { type: "cast", window: [999, 999] }); //海德林转场 众生离绝
windowAction.set(28027, { type: "cast", window: [999, 999] }); //佐迪亚克转场 悼念
windowAction.set(26340, { type: "cast", window: [999, 999] }); //P3S转场 黑暗不死鸟
windowAction.set(25533, { type: "begincast", window: [60, 60] }); //绝龙诗 万物终结
windowAction.set(26376, { type: "cast", window: [999, 999] }); //绝龙诗 灭绝之诗
windowAction.set(26814, { type: "begincast", window: [999, 999] }); //绝龙诗 邪龙爪牙
windowAction.set(25313, { type: "begincast", window: [200, 200] }); //绝龙诗 空间牢狱
windowAction.set(27526, { type: "begincast", window: [999, 999] }); //绝龙诗 圣徒化
windowAction.set(26215, { type: "cast", window: [500, 30] }); //绝龙诗 P6: Nidhogg v2
windowAction.set(29050, { type: "begincast", window: [200, 30] }); //绝龙诗 P6.5: Eyes v2
windowAction.set(29156, { type: "cast", window: [20, 20] }); //绝龙诗 冲击波
windowAction.set(27973, { type: "cast", window: [20, 20] }); //绝龙诗 邪念之火
windowAction.set(27937, { type: "begincast", window: [20, 20] }); //绝龙诗 绝命怒嚎
windowAction.set(28059, { type: "begincast", window: [20, 20] }); //绝龙诗 骑龙剑百京核爆
windowAction.set(28060, { type: "begincast", window: [20, 20] }); //绝龙诗 骑龙剑百京核爆
windowAction.set(28061, { type: "begincast", window: [20, 20] }); //绝龙诗 骑龙剑百京核爆
windowAction.set(27956, { type: "begincast", window: [20, 20] }); //绝龙诗 圣龙吐息
windowAction.set(27957, { type: "begincast", window: [20, 20] }); //绝龙诗 圣龙吐息
windowAction.set(25316, { type: "begincast", window: [999, 999] }); //绝龙诗 纯洁心灵
windowAction.set(25544, { type: "begincast", window: [10, 10] }); //绝龙诗 阿斯卡隆之仁·隐秘
windowAction.set(26379, { type: "begincast", window: [10, 10] }); //绝龙诗 腾龙枪

export function factory(events: FFlogsStance): FFlogsStance {
  for (const event of events) {
    const w = windowAction.get(event.actionId);
    if (w?.type === event.type) event.window = w?.window;
  }
  return events;
}
