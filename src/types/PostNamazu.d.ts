// PostNamazu.ts
declare type WayMarkInfo = {
  X: number;
  Y: number;
  Z: number;
  Active: boolean;
  ID?: number;
};
type WayMarkKeys = "A" | "B" | "C" | "D" | "One" | "Two" | "Three" | "Four";
type WayMarkJSON = Partial<{ [key in WayMarkKeys]?: WayMarkInfo }>;
declare type PPJSON = WayMarkJSON & { Name?: string; MapID?: number };
type Slot = 1 | 2 | 3 | 4 | 5;
declare enum MarkTypes {
  "attack1" = 0, //攻击1
  "attack2" = 1, //攻击2
  "attack3" = 2, //攻击3
  "attack4" = 3, //攻击4
  "attack5" = 4, //攻击5
  "bind1" = 5, //止步1
  "bind2" = 6, //止步2
  "bind3" = 7, //止步3
  "stop1" = 8, //禁止1
  "stop2" = 9, //禁止2
  "square" = 10, //正方
  "circle" = 11, //圆圈
  "cross" = 12, //十字
  "triangle" = 13, //三角
}

declare type MarkJSON = {
  ActorID?: number;
  Name?: string;
  MarkType: MarkTypes;
  LocalOnly: boolean;
};
interface TextCommandEvent {
  c: "DoTextCommand" | "command";
  p: string;
}
interface WaymarksEvent {
  c: "DoWaymarks" | "place";
  p: string; //JSON.stringify(WayMarkJSON)
}
interface MarkEvent {
  c: "mark";
  p: string; //JSON.stringify(MarkJSON)
}
interface InsertPresetEvent {
  c: "DoInsertPreset" | "preset";
  p: string; //JSON.stringify(WaymarkJSON)
}
interface QueueActionsEvent {
  c: "DoQueueActions";
  p: PostNamazuQueueAction;
}
declare type PostNamazuCall = "DoTextCommand" | "command" | "DoWaymarks" | "place" | "mark" | "DoInsertPreset" | "preset" | "DoQueueActions";
declare type PostNamazuQueueAction = {
  c: PostNamazuCall;
  p: string | PPJSON;
  d?: number;
}[];
type PostNamazuEvent = TextCommandEvent | WaymarksEvent | MarkEvent | InsertPresetEvent | QueueActionsEvent;
declare function callOverlayHandler(event: { call: "PostNamazu" } & PostNamazuEvent): Promise<unknown>;
