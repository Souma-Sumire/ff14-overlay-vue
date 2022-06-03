import { FFlogsStance } from "../types/FFlogs";

const windowAction = new Map();
windowAction.set(26155, [999, 999]); //海德林转场 众生离绝
windowAction.set(28027, [999, 999]); //佐迪亚克转场 悼念
windowAction.set(26340, [999, 999]); //P3S转场 黑暗不死鸟
windowAction.set(25533, [20, 20]); //绝龙诗 万物终结
windowAction.set(26376, [999,999]); //绝龙诗 灭绝之诗
windowAction.set(26814, [999,999]); //绝龙诗 邪龙爪牙
windowAction.set(25313, [200,200]); //绝龙诗 空间牢狱
windowAction.set(27526, [999,999]); //绝龙诗 圣徒化
windowAction.set(26215, [999,999]); //绝龙诗 P6: Nidhogg v2
windowAction.set(29050, [200,200]); //绝龙诗 P6.5: Eyes v2
windowAction.set(29156, [10,20]); //绝龙诗 冲击波






export function factory(events: FFlogsStance, zoneID: number): FFlogsStance {
  for (const event of events) event.window = windowAction.get(event.actionId);
  switch (zoneID) {
    case 968: //绝龙诗
      if (events.length > 0 && events[0].actionId === 25544)
        //第一个是阿斯卡隆之仁·无形 也就是P2开始
        events[0].window = [200,0]
        for (const event of events) {
          event.time += 180;
        }
      break;
  }
  return events;
}
