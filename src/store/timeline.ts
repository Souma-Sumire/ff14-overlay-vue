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
  [TimelineConfigEnum.变色时间]: "变色时间（秒）",
  [TimelineConfigEnum.零后持续]: "零秒后持续（秒）",
  [TimelineConfigEnum.战前准备]: "战前显示（秒）",
  [TimelineConfigEnum.TTS提前量]: "TTS提前量（秒）",
  [TimelineConfigEnum.刷新频率]: "刷新频率（毫秒）",
};

const configValues: TimelineConfigValues = {
  [TimelineConfigEnum.显示范围]: 120,
  [TimelineConfigEnum.变色时间]: 4,
  [TimelineConfigEnum.零后持续]: 0.2,
  [TimelineConfigEnum.战前准备]: 30,
  [TimelineConfigEnum.TTS提前量]: 2,
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
  "--timeline-width": 220,
  "--font-size": 16,
  "--opacity": 0.5,
  "--normal-scale": 0.5,
  "--up-coming-scale": 0.75,
  "--tras-duration": 1,
};
export const useTimelineStore = defineStore("timeline", {
  state: () => {
    return {
      timelineLegalRegular:
        /^\s*(?<time>[\-:：\d.]+) (?:["']?(?<action>[^"\n\r]+)["']?)?(?: (?<t>tts) ?)?(?:["']??(?<tts>[^"\s\n\r]+)["']??)?(?: sync ?\/(?<sync>.+)\/)?(?: window ?(?<windowBefore>\d+)(?:,(?<windowAfter>\d+))?)?(?: jump ?(?<jump>\d+))?\s*$/gm,
      allTimelines: [] as ITimeline[],
      configValues,
      configTranslate,
      settings: { api: "" },
      showStyle,
      showStyleTranslate,
    };
  },
  getters: {},
  actions: {
    newTimeline(
      title: string = "Demo",
      condition: ITimelineCondition = { zoneId: "0", jobList: ["GLA"] },
      rawTimeline: string = `0 "战斗开始"
10 "<死斗>~" tts
20 "<地星><星体爆轰!>"
65 "一运" tts "场中集合"
75 "<宏观宇宙>"
85 "<微观宇宙!>"`,
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
      return this.allTimelines.filter((value) => {
        return (
          (value.condition.zoneId === "0" || value.condition.zoneId === condition.zoneId) &&
          //玩家站着不动不会触发职业事件，职业会为none
          (condition.jobList.includes("NONE") ||
            value.condition.jobList.length === 0 ||
            value.condition.jobList.filter((v) => condition.jobList.includes(v)).length)
        );
      });
    },
    parseTimeline(rawTimeline: string) {
      function parseTime(time: string): number {
        const timeFormatType = time.match(/^(?<negative>-)?(?<mm>[^:：]+):(?<ss>[^:：]+)$/);
        if (timeFormatType) {
          return (
            parseFloat(timeFormatType.groups!.mm) * 60 + parseFloat(timeFormatType.groups!.ss) * (timeFormatType.groups?.negative ? -1 : 1)
          );
        } else {
          return parseFloat(time);
        }
      }
      function parseAction(text: string): string {
        [...text.matchAll(/\<(?<name>[^\<\>]*?)(?<mandatory>\!)?\>(?<repeat>~)?/gim)].forEach((item) => {
          let action = actionStore.getAction({ Name: item.groups!.name, IsPlayerAction: !item.groups?.mandatory });
          //"https://xivapi.com/i/${action.Url}.png"
          if (action) {
            text = text.replace(
              item[0],
              `<div class="skill_icon"><img src="https://souma.diemoe.net/resources/icon/${action.Url}.png" alt=""></div>
              <span>${item.groups?.repeat ? item.groups!.name : ""}</span>`
            );
          } else {
            text = `<span>${item[0]}</span>`;
          }
        });
        return text;
      }
      return [...rawTimeline.matchAll(this.timelineLegalRegular)].reduce((total, line) => {
        total.push({
          time: parseTime(line.groups!.time),
          action: line.groups!.action ? parseAction(line.groups!.action.replace(/ /, "&nbsp")) : "",
          sync: line.groups?.sync ? new RegExp(line.groups.sync) : void 0,
          show: !line.groups!.sync,
          windowBefore: line.groups?.windowBefore ? parseInt(line.groups.windowBefore) : 2.5,
          windowAfter: line.groups?.windowAfter ? parseInt(line.groups.windowAfter || line.groups.windowBefore) : 2.5,
          jump: line.groups?.jump ? parseInt(line.groups.jump) : void 0,
          alertAlready: false,
          tts: line.groups?.tts ? line.groups.tts : line.groups?.t ? line.groups.action.match(/^.*<(?<name>.+)>.*$/)?.groups?.name : void 0,
        });
        return total;
      }, [] as Array<ITimelineLine>);
    },
    saveTimelineSettings() {
      localStorage.setItem(
        "timelines",
        JSON.stringify({
          allTimelines: this.allTimelines,
          configValues: this.configValues,
          settings: this.settings,
          showStyle: this.showStyle,
        })
      );
    },
    loadTimelineSettings() {
      const ls = localStorage.getItem("timelines");
      if (ls) Object.assign(this, JSON.parse(ls));
    },
    sortTimelines() {
      this.allTimelines.sort((a, b) => Number(a.condition.zoneId) - Number(b.condition.zoneId));
    },
  },
});
