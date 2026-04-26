# 时间轴导出格式说明 (ITimeline)

如果你是其他工具（如xiv-mit-composer、healerbook等）的开发者，可以参考此文档生成兼容本悬浮窗的导出字符串。

## 数据结构

```typescript
interface ITimeline {
  name: string; // 时间轴标题
  condition: {
    zoneID: string; // 地图ID (如 "1122")，"0" 为通用
    jobs: string[]; // 职业大写简写列表 (如 ["PLD", "WAR"])，["NONE"] 为通用
    phase?: "door" | "final"; // 用于手动指定门神/本体。
    fflogsBoss?: number; // 当你的程序不方便计算 phase 值时，可传入 FFLogs V1 的 event.fights[x].boss，本项目会自动识别门神/本体。
  };
  timeline: string; // 时间轴正文
  source: string; // 来源 (如 "来自XXX" 或 Logs 链接)
  createdAt: string; // 创建时间 (new Date().toLocaleString())
}
```

## Demo

```typescript
import * as LZString from "lz-string";

const myTimeline = {
  name: "示例时间轴",
  condition: {
    zoneID: "1122",
    jobs: ["PLD", "GNB"],
    fflogsBoss: 105,
  },
  timeline: '0.0 "开始"\n10.0 "技能A"',
  source: "我的减伤器",
  createdAt: new Date().toLocaleString(),
};
const jsonStr = JSON.stringify(myTimeline);
const exportString = LZString.compressToBase64(jsonStr);
console.log(exportString);
```
