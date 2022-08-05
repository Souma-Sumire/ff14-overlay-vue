import { FFlogsStance } from "../types/FFlogs";

const windowAction = new Map();
windowAction.set(26155, [999, 999]); //海德林转场 众生离绝
windowAction.set(28027, [999, 999]); //佐迪亚克转场 悼念
windowAction.set(26340, [999, 999]); //P3S转场 黑暗不死鸟
windowAction.set(25533, [20, 20]); //绝龙诗 万物终结
windowAction.set(26376, [999, 999]); //绝龙诗 灭绝之诗
windowAction.set(26814, [999, 999]); //绝龙诗 邪龙爪牙
windowAction.set(25313, [200, 200]); //绝龙诗 空间牢狱
windowAction.set(27526, [1000, 10]); //绝龙诗 圣徒化
windowAction.set(26215, [500, 10]); //绝龙诗 P6: Nidhogg v2
windowAction.set(29050, [200, 10]); //绝龙诗 P6.5: Eyes v2
windowAction.set(29156, [20, 20]); //绝龙诗 冲击波
windowAction.set(27973, [20, 20]); //绝龙诗 邪念之火
windowAction.set(27937, [20, 20]); //绝龙诗 绝命怒嚎
windowAction.set(28059, [20, 20]); //绝龙诗 骑龙剑百京核爆
windowAction.set(28060, [20, 20]); //绝龙诗 骑龙剑百京核爆
windowAction.set(28061, [20, 20]); //绝龙诗 骑龙剑百京核爆
windowAction.set(27956, [20, 20]); //绝龙诗 圣龙吐息
windowAction.set(27957, [20, 20]); //绝龙诗 圣龙吐息
windowAction.set(25316, [20, 20]); //绝龙诗 纯洁心灵

export function factory(events: FFlogsStance, zoneID: number): FFlogsStance {
  for (const event of events) event.window = windowAction.get(event.actionId);
  if (zoneID === 968 && events.length > 0 && events.filter((v) => !v.sourceIsFriendly)[0].actionId === 25544) {
    events[0].window = [200, 0];
    for (const event of events) event.time += 180;
  }
  return events;
}
