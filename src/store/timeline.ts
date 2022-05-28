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
  [TimelineConfigEnum.零后持续]: 0.25,
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
  "--normal-scale": 0.33,
  "--up-coming-scale": 1,
  "--tras-duration": 0.66,
};

export const useTimelineStore = defineStore("timeline", {
  state: () => {
    return {
      timelineLegalRegular:
        /^[ \t　]*(?<time>[\-:：\d.]+) +(?:["']?(?<action>[^"\n\r]+)["']?)?(?:[ \t　]+(?<t>tts)[ \t　]?)?(?: ["']??(?<tts>[^" \t　\n\r]+)["']??)?(?:[ \t　]+sync[ \t　]*\/(?<sync>.+)\/)?(?:[ \t　]*window[ \t　]*(?<windowBefore>\d+)(?:,[ \t　]*(?<windowAfter>\d+))?)?(?:[ \t　]*jump[ \t　]*(?<jump>\d+))?[ \t　]*$/gm,
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
      condition: ITimelineCondition = { zoneId: "0", job: "GLA" },
      rawTimeline: string = `-20 "<中间学派>刷盾"
0 "战斗开始"
10 "<死斗>~" tts
65 "一运" tts "场中集合"
100 "二运" sync /^.{14} ActionEffect 15:4.{7}:[^:]+:AAAA:/`,
      codeFight: string = "用户创建"
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
      return this.allTimelines.filter(
        (t) => (t.condition.zoneId === "0" || t.condition.zoneId === condition.zoneId) && t.condition.job === condition.job
      );
    },
    parseTimeline(rawTimeline: string) {
      return [...rawTimeline.matchAll(this.timelineLegalRegular)]
        .reduce((total, line) => {
          total.push({
            time: parseTime(line.groups!.time),
            action: line.groups!.action ? parseAction(line.groups!.action.replace(/ /, "&nbsp")) : "",
            sync: line.groups?.sync ? new RegExp(line.groups.sync) : void 0,
            show: !line.groups!.sync,
            windowBefore: line.groups?.windowBefore ? parseInt(line.groups.windowBefore) : 2.5,
            windowAfter: line.groups?.windowAfter ? parseInt(line.groups.windowAfter || line.groups.windowBefore) : 2.5,
            jump: line.groups?.jump ? parseInt(line.groups.jump) : void 0,
            alertAlready: false,
            tts: line.groups?.tts
              ? line.groups.tts
              : line.groups?.t
              ? line.groups.action.match(/^.*<(?<name>.+)>.*$/)?.groups?.name
              : void 0,
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
        })
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
        Swal.fire({
          text: `${this.allTimelines.length}条时间轴已就绪`,
          timer: 1500,
          showConfirmButton: false,
          backdrop: false,
        });
      }
    },
    sortTimelines() {
      this.allTimelines.sort((a, b) =>
        a.condition.job === b.condition.job
          ? Number(a.condition.zoneId) - Number(b.condition.zoneId)
          : Util.jobToJobEnum(a.condition.job) - Util.jobToJobEnum(b.condition.job)
      );
    },
  },
});

function parseTime(time: string): number {
  const timeFormatType = time.match(/^(?<negative>-)?(?<mm>[^:：]+):(?<ss>[^:：]+)$/);
  if (timeFormatType) {
    return parseFloat(timeFormatType.groups!.mm) * 60 + parseFloat(timeFormatType.groups!.ss) * (timeFormatType.groups?.negative ? -1 : 1);
  } else {
    return parseFloat(time);
  }
}
function parseAction(text: string): string {
  [...text.matchAll(/\s*\<(?<name>[^\<\>]*?)!??\>(?<repeat>~)?(?<other>.*)\s*/gm)].forEach((item) => {
    const action =
      actionStore.getAction({ Name: item.groups!.name, IsPlayerAction: true }) ??
      actionStore.getAction({ Name: item.groups!.name, IsPlayerAction: false });
    if (action) {
      text = `<div class="skill_icon">
    <img src="${__SITE_IMG__}/${action.Url}.png"
    onerror="javascript:this.src='${__SITE_IMG__BAK}/${action.Url}.png';this.onerror=null;">
    </div><span>${item.groups?.repeat ? item.groups!.name : ""}${item.groups?.other ? item.groups.other : ""}</span>`;
    }
  });

  return text;
}
