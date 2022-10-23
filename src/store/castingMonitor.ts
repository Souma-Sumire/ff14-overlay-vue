import { getParams } from "@/utils/queryParams";
import Util from "@/utils/util";
import { getImgSrc, parseAction } from "@/utils/xivapi";
import { defineStore } from "pinia";
const THNSort = ["tank", "healer", "dps", "crafter", "gatherer", "none"];
const testActions = [
  24283, 24284, 24285, 24286, 24287, 24288, 24289, 24290, 24294, 24295, 24296, 24297, 24298, 24299, 24300, 24301, 24302,
  24303, 24304, 24305, 24306, 24307, 24309, 24310, 24311, 24312, 24313, 24315, 24316, 24317, 24318,
];
export const useCastingMonitorStore = defineStore("castingMonitor", {
  state: () => {
    return {
      castData: reactive({} as Record<string, Cast[]>),
      playerId: ref(""),
      focusTargetId: ref(""),
      partyData: [] as {
        id: string;
        name: string;
        job: number;
        inParty: boolean;
        src: string;
      }[],
      config: {
        duration: Number(getParams()?.duration || 25),
      },
    };
  },
  getters: {
    partyDataFormatted(state) {
      return state.partyData.sort((a, b) => {
        return (
          THNSort.indexOf(Util.jobToRole(Util.jobEnumToJob(a.job))) -
          THNSort.indexOf(Util.jobToRole(Util.jobEnumToJob(b.job)))
        );
      });
    },
    focusTargetCastArr(state) {
      return state.castData?.[state.focusTargetId] ?? [];
    },
  },
  actions: {
    testAction(casterId: string, logType: number, duration?: number): void {
      const actionId = testActions[Math.floor(Math.random() * testActions.length)];
      this.pushAction(logType, "action", casterId, actionId, duration);
    },
    async pushAction(
      logType: number,
      actionType: "item" | "action",
      casterId: string,
      actionId: number,
      duration?: number,
    ): Promise<void> {
      const energySaving = /^(?:1|true|yes|on|open|enabled|undefined)$/i.test(getParams()?.energySaving);
      if (
        (this.partyData.length === 0 && casterId === this.playerId) ||
        (energySaving && casterId === this.focusTargetId) ||
        (!energySaving && this.partyData.length > 0 && this.partyData.find((v) => v.id === casterId))
      ) {
        if (!this.castData[casterId]) this.castData[casterId] = [];
        const key = Symbol();
        this.castData[casterId].push({ time: Date.now(), type: logType, src: "", class: "", key: key, loaded: false });
        const cast = this.castData[casterId].find((v) => v.key === key)!;
        setTimeout(() => {
          this.castData[casterId]?.splice(this.castData[casterId].indexOf(cast), 1);
        }, (duration || this.config.duration) * 1000);
        const action = await parseAction(actionType, actionId, ["ID", "Icon", "ActionCategory"]);
        cast.loaded = true;
        cast.src = await getImgSrc(action.Icon);
        cast.class = `action-category-${action.ActionCategory?.ID}`;
      }
    },
    handleChangePrimaryPlayer(e: any): void {
      this.playerId = e.charID.toString(16).toUpperCase();
      this.focusTargetId = this.playerId;
    },
    handleLogLine(e: { line: string[] }): void {
      if (e.line[0] === "20") this.pushAction(14, "action", e.line[2], parseInt(e.line[4], 16), Number(e.line[8]));
      else if (e.line[0] === "21" || (e.line[0] === "22" && e.line[45] === "0"))
        this.pushAction(15, "action", e.line[2], parseInt(e.line[4], 16), Number(e.line[8]));
    },
    handlePartyChanged(e: any): void {
      if (e.party.length > 0) {
        this.partyData = e.party.filter((v: any) => v.inParty);
        for (const key in this.castData) {
          if (Object.prototype.hasOwnProperty.call(this.castData, key)) {
            if (!this.partyData.find((v) => v.id === key)) {
              Reflect.deleteProperty(this.castData, key);
            }
          }
        }
        if (!Object.keys(this.castData).includes(this.focusTargetId)) {
          // 没有之前监控的目标，重置为玩家本人。
          this.focusTargetId = this.playerId;
        }
      } else {
        // 没有队伍，重置为玩家本人。
        this.focusTargetId = this.playerId;
        for (let key in this.castData) {
          if (key === this.playerId) continue;
          Reflect.deleteProperty(this.castData, key);
        }
      }
    },
    handleClickChangeTarget(targetId: string): void {
      if (targetId === this.focusTargetId) {
        // 重复点击，重置为玩家本人。
        this.focusTargetId = this.playerId;
        return;
      }
      this.focusTargetId = targetId;
      callOverlayHandler({
        call: "broadcast",
        source: "castMonitorOverlay",
        msg: {
          targetId,
        },
      });
    },
    handleBroadcastMessage(e: { source: string; msg: any }): void {
      if (e.source === "castMonitorOverlay" && e.msg.targetId) {
        this.focusTargetId = e.msg.targetId;
      }
    },
  },
});
