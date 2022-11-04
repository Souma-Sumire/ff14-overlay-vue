import { params } from "@/utils/queryParams";
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
        duration: Number(params?.duration || 25),
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
    testAction(): void {
      const actionId = testActions[Math.floor(Math.random() * testActions.length)];
      this.pushAction(Date.now(), 14, "贤者技能随机", this.focusTargetId, actionId, 1);
      setTimeout(() => {
        this.pushAction(Date.now(), 15, "贤者技能随机", this.focusTargetId, actionId);
      }, 1000);
    },
    testItem(): void {
      this.pushAction(Date.now(), 15, "item_11c7", this.focusTargetId, parseInt("20011C7", 16));
    },
    testItemHQ(): void {
      this.pushAction(Date.now(), 15, "item_f5407", this.focusTargetId, parseInt("20F5407", 16));
    },
    testParty(fakeParty: boolean): void {
      this.handlePartyChanged({
        party: fakeParty
          ? [
              { id: "10000001", name: "测试张三", job: 24, inParty: true, src: "" },
              { id: "10000002", name: "测试李四", job: 25, inParty: true, src: "" },
              { id: "10000004", name: "测试王五", job: 19, inParty: true, src: "" },
              { id: "10000005", name: "测试赵六", job: 23, inParty: true, src: "" },
              { id: "10000006", name: "测试孙七", job: 39, inParty: true, src: "" },
              { id: "10000007", name: "测试周八", job: 40, inParty: true, src: "" },
              { id: "10000008", name: "测试吴九", job: 37, inParty: true, src: "" },
              { id: "10000009", name: "测试郑十", job: 38, inParty: true, src: "" },
            ]
          : [],
      });
    },
    async pushAction(
      time: number,
      logLine: number,
      abilityName: "item" | "action" | "mount" | string,
      casterId: string,
      abilityId: number,
      cast1000Ms?: number,
    ): Promise<void> {
      const energySaving = /^(?:1|true|yes|on|open|enabled|undefined)$/i.test(params?.energySaving);
      if (
        (this.partyData.length === 0 && casterId === this.playerId) ||
        (energySaving && casterId === this.focusTargetId) ||
        (!energySaving && this.partyData.length > 0 && this.partyData.find((v) => v.id === casterId))
      ) {
        let queryType;
        let itemIsHQ = false;
        if (/^(?:item|mount)_/.test(abilityName)) {
          abilityId = parseInt(abilityName.replace(/^.+_/, ""), 16);
          //HQ道具 item_fXXXX （转十进制则为10XXXXXX）
          if (abilityId > 983040) {
            abilityId = parseInt(abilityId.toString().slice(-5), 10);
            itemIsHQ = true;
          }
          queryType = abilityName.replace(/_.+$/, "") as "item" | "mount";
        } else {
          queryType = "action";
        }
        if (!this.castData[casterId]) this.castData[casterId] = [];
        const key = Symbol();
        this.castData[casterId].push({
          time: time,
          logLine: logLine,
          src: "",
          class: "",
          key: key,
          APIData: {},
        });
        const cast = this.castData[casterId].find((v) => v.key === key)!;
        setTimeout(() => {
          this.castData[casterId]?.splice(this.castData[casterId].indexOf(cast), 1);
        }, (cast1000Ms || this.config.duration) * 1000);
        if (/^unknown_/.test(abilityName)) {
          cast.src = "https://cafemaker.wakingsands.com/i/000000/000405.png";
          cast.class = `action action-category-0`;
        } else {
          if (abilityId < 100000) {
            const action = await parseAction(queryType, abilityId, [
              "ID",
              "Icon",
              "ActionCategoryTargetID",
              "Name",
              "Description",
            ]);
            cast.APIData = action;
            cast.src = await getImgSrc(action?.Icon, itemIsHQ);
            if (queryType === "action") {
              cast.class = `action action-category-${action?.ActionCategoryTargetID}`;
            } else if (queryType === "item") {
              cast.class = "item" + (itemIsHQ ? "HQ" : "");
            } else if (queryType === "mount") {
              cast.class = "mount";
            }
            if (action.ActionCategoryTargetID === 2 || action.ActionCategoryTargetID === 3) {
              const lastCast = this.castData[casterId]
                .filter((v) => /action-category-[23]/.test(v.class) && v.logLine !== 14)
                .at(-2);
              if (lastCast) {
                cast.GCDCast = ((cast.time - lastCast.time) / 1000).toFixed(2);
                if (parseFloat(cast.GCDCast) >= 2.55) cast.GCDClass = "wasted";
              }
            }
          }
        }
      }
    },
    handleChangePrimaryPlayer(e: any): void {
      this.playerId = e.charID.toString(16).toUpperCase();
      this.focusTargetId = this.playerId;
    },
    handleLogLine(e: { line: string[] }): void {
      if (e.line[0] === "20")
        this.pushAction(Date.parse(e.line[1]), 14, e.line[5], e.line[2], parseInt(e.line[4], 16), Number(e.line[8]));
      else if (e.line[0] === "21" || (e.line[0] === "22" && e.line[45] === "0"))
        this.pushAction(Date.parse(e.line[1]), 15, e.line[5], e.line[2], parseInt(e.line[4], 16));
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
        if (!Object.keys(this.partyData).includes(this.focusTargetId)) {
          // 没有之前监控的目标，重置为玩家本人。
          this.focusTargetId = this.playerId;
        }
      } else {
        // 没有队伍，重置为玩家本人。
        this.focusTargetId = this.playerId;
        // 清空队伍数据
        this.partyData.length = 0;
      }
    },
    handleClickChangeTarget(targetId: string): void {
      if (targetId === this.focusTargetId) {
        // 重复点击，重置为玩家本人。
        this.focusTargetId = this.playerId;
      } else {
        this.focusTargetId = targetId;
      }
      if (/^(?:1|true|yes|on|open|enabled|undefined)$/i.test(params?.syncFocusWS)) {
        callOverlayHandler({
          call: "broadcast",
          source: "castMonitorOverlay",
          msg: {
            targetId: this.focusTargetId,
          },
        });
      }
    },
    handleBroadcastMessage(e: { source: string; msg: any }): void {
      if (e.source === "castMonitorOverlay" && e.msg.targetId) {
        this.focusTargetId = e.msg.targetId;
      }
    },
  },
});
