import { ActionEnum } from "../types/Action";
import { defineStore } from "pinia";
import {
  ITimeline,
  ITimelineCondition,
  TimelineConfigEnum,
  ITimelineLine,
  TimelineConfigTranslate,
  ShowStyleTranslate,
  TimelineConfigValues,
  ShowStyle,
} from "../types/Timeline";
import { useActionStore } from "./action";
import Swal from "sweetalert2";
import "sweetalert2/src/sweetalert2.scss";
import Util from "../utils/util";
import { IActionData } from "../types/Action";

const actionStore = useActionStore();
class Timeline implements ITimeline {
  constructor(name: string, condition: ITimelineCondition, timeline: string, codeFight: string) {
    this.name = name;
    this.condition = condition;
    this.timeline = timeline;
    this.codeFight = codeFight;
    this.create = new Date().toLocaleString();
  }
  name: string;
  condition: ITimelineCondition;
  timeline: string;
  codeFight: string;
  create: string;
}

const configTranslate: TimelineConfigTranslate = {
  [TimelineConfigEnum.显示范围]: "显示范围（秒）",
  [TimelineConfigEnum.变色时间]: "提前变色（秒）",
  [TimelineConfigEnum.零后持续]: "后续保持（秒）",
  [TimelineConfigEnum.战前准备]: "倒计时量（秒）",
  [TimelineConfigEnum.TTS提前量]: "TTS预备（秒）",
  [TimelineConfigEnum.刷新频率]: "刷新率（毫秒）",
};

const configValues: TimelineConfigValues = {
  [TimelineConfigEnum.显示范围]: 120,
  [TimelineConfigEnum.变色时间]: 2.75,
  [TimelineConfigEnum.零后持续]: 0.75,
  [TimelineConfigEnum.战前准备]: 30,
  [TimelineConfigEnum.TTS提前量]: 1,
  [TimelineConfigEnum.刷新频率]: 100,
};

const showStyleTranslate: ShowStyleTranslate = {
  "--timeline-width": "时间轴宽度",
  "--font-size": "字体大小",
  "--normal-scale": "等待缩放",
  "--up-coming-scale": "来临缩放",
  "--opacity": "等待不透明度",
  "--tras-duration": "动画时间",
};

let showStyle: ShowStyle = {
  "--timeline-width": 160,
  "--font-size": 18,
  "--opacity": 0.33,
  "--normal-scale": 0.5,
  "--up-coming-scale": 1,
  "--tras-duration": 0.66,
};
//(?:[ \\t　]+(?<t>tts)[ \\t　]?)?(?: ["']??(?<tts>[^" \\t　\\n\\r]+)["']??)?(?:[ \\t　]+sync[ \\t　]*\\/(?<sync>.+)\\/)?(?:[ \\t　]*window[ \\t　]*(?<windowBefore>\\d+)(?:,[ \\t　]*(?<windowAfter>\\d+))?)?(?:[ \\t　]*jump[ \\t　]*(?<jump>\\d+))?[ \\t　]*$`;
const reg = `^(?<time>[-:：\\d.]+)\\s+(?<action>["'][^"']+["']).*`;

export const useTimelineStore = defineStore("timeline", {
  state: () => {
    return {
      reg: reg,
      timelineLegalRegular: new RegExp(reg, "gm"),
      allTimelines: [] as ITimeline[],
      configValues,
      configTranslate,
      settings: { api: "" },
      filters: {},
      showStyle,
      showStyleTranslate,
    };
  },
  getters: {},
  actions: {
    newTimeline(
      title: string = "Demo",
      condition: ITimelineCondition = { zoneId: "0", job: "NONE" },
      rawTimeline: string = `# 注释的内容不会被解析
# "<技能名>"会被解析为图片 紧接着一个波浪线可快捷重复技能名
-20 "<中间学派>~刷盾"
0 "战斗开始" tts "冲呀"
# 当sync在window的范围内被满足时将进行时间同步
30 "一运" sync / 14:4.{7}:[^:]*:AAAA:/ window 2.5,2.5
# 当存在jump时会进跳转至jump时间
50 "变异化型:蛇" sync / 14:4.{7}:[^:]*:BBBB:/ window 2.5,2.5 jump 1000
50 "变异化型:兽" sync / 14:4.{7}:[^:]*:CCCC:/ window 2.5,2.5 jump 2000
1000 "蛇轴"
2000 "兽轴"
`,
      codeFight: string = "用户创建",
    ) {
      this.allTimelines.push(new Timeline(title, condition, rawTimeline, codeFight));
      this.sortTimelines();
      Swal.fire({
        position: "center",
        icon: "success",
        title: `“${title}”已创建`,
        showConfirmButton: false,
        timer: 1000,
      });
    },
    getTimeline(condition: ITimelineCondition): ITimeline[] {
      return this.allTimelines.filter((t) => {
        return (
          (t.condition.zoneId === "0" || t.condition.zoneId === condition.zoneId) &&
          (t.condition.job === "NONE" || t.condition.job === condition.job)
        );
      });
    },
    parseTimeline(rawTimeline: string) {
      return [...rawTimeline.matchAll(this.timelineLegalRegular)]
        .reduce((total, line) => {
          const jump = line[0].match(/(?<=jump )[-:：\d.]+/)?.[0];
          const sync = line[0].match(/(?<=sync \/).+(?=\/)/)?.[0];
          const windowAfter = line[0].match(/(?<=window )[-:：\d.]+/)?.[0];
          const windowBefore = line[0].match(/(?<=window [-:：\d.]+,)[-:：\d.]+/)?.[0];
          const tts = line[0].match(/ tts ["'](?<tts>[^"']+)["']/)?.groups?.tts;
          const ttsSim = / tts(?: |$)/.test(line[0]) ? parseAction(line.groups!.action)?.groups?.name : undefined;
          total.push({
            // time: parseTime(line.groups!.time),
            // action: line.groups!.action ? parseAction(line.groups!.action.replace(/ /, "&nbsp")) : "",
            // sync: line.groups?.sync ? new RegExp(line.groups.sync) : void 0,
            // show: !line.groups!.sync,
            // windowBefore: line.groups?.windowBefore ? parseInt(line.groups.windowBefore) : 2.5,
            // windowAfter: line.groups?.windowAfter ? parseInt(line.groups.windowAfter || line.groups.windowBefore) : 2.5,
            // jump: line.groups?.jump ? parseInt(line.groups.jump) : void 0,
            // alertAlready: false,
            // tts: line.groups?.tts
            //   ? line.groups.tts
            //   : line.groups?.t
            //   ? line.groups.action.match(/^.*<(?<name>.+)>.*$/)?.groups?.name
            //   : void 0,
            time: parseTime(line.groups!.time),
            actionHTML: line.groups!.action ? parseActionHTML(line.groups!.action) : "",
            alertAlready: false,
            sync: sync ? new RegExp(sync) : undefined,
            show: !sync,
            windowBefore: parseFloat(windowBefore || windowAfter || "2.5"),
            windowAfter: parseFloat(windowAfter || windowBefore || "2.5"),
            jump: jump ? parseFloat(jump) : undefined,
            tts: tts || ttsSim,
          });
          return total;
        }, [] as Array<ITimelineLine>)
        .sort((a, b) => a.time - b.time);
    },
    saveTimelineSettings() {
      localStorage.setItem(
        "timelines",
        JSON.stringify({
          allTimelines: this.allTimelines,
          configValues: this.configValues,
          settings: this.settings,
          showStyle: this.showStyle,
          filters: this.filters,
        }),
      );
    },
    loadTimelineSettings() {
      const ls = localStorage.getItem("timelines");
      if (ls) {
        Object.assign(this, JSON.parse(ls));
        this.allTimelines.forEach((v) => {
          if ((v.condition as any).jobList) {
            v.condition.job = (v.condition as any).jobList[0] ?? "NONE";
            delete (v.condition as any).jobList;
          }
        });
        this.sortTimelines();
      }
    },
    sortTimelines() {
      this.allTimelines.sort((a, b) =>
        a.condition.job === b.condition.job
          ? Number(a.condition.zoneId) - Number(b.condition.zoneId)
          : Util.jobToJobEnum(a.condition.job) - Util.jobToJobEnum(b.condition.job),
      );
    },
  },
});

function parseTime(time: string): number {
  const timeFormatType = time.match(/^(?<negative>-)?(?<mm>[^:：]+):(?<ss>[^:：]+)$/);
  if (timeFormatType) {
    return (
      parseFloat(timeFormatType.groups!.mm) * 60 +
      parseFloat(timeFormatType.groups!.ss) * (timeFormatType.groups?.negative ? -1 : 1)
    );
  } else {
    return parseFloat(time);
  }
}
function parseAction(text: string) {
  return text.match(/\s*\<(?<name>[^\<\>]*?)!??\>(?<repeat>~)?(?<other>.*)\s*/);
}
function parseActionHTML(text: string): string {
  // text = text.replace(/ /, "&nbsp");
  text = text.replaceAll(/^["']|["']$/g, "");
  const item = parseAction(text);
  if (!item) return text;
  const action =
    actionStore.getActionByName(item.groups!.name, (a: IActionData) => a[ActionEnum.IsPlayerAction]) ??
    actionStore.getActionByName(item.groups!.name, () => true);
  if (action) {
    text = `<div class="skill_icon">
    <img src="${__SITE_IMG__}/${action.Url}.png"
    onerror="javascript:this.src='${__SITE_IMG__BAK}/${action.Url}.png';this.onerror=null;">
    </div><span>${item.groups?.repeat ? item.groups!.name : ""}${item.groups?.other ? item.groups.other : ""}</span>`;
  }
  return text;
}
