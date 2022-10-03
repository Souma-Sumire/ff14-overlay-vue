import { defineStore } from "pinia";
export const useCastingMonitorStore = defineStore("castingMonitor", {
  state: () => {
    return {
      castData: reactive({} as Record<string, Cast[]>),
      playerId: ref(""),
      focusTargetId: ref(""),
      partyData: ref([
        { id: "10000001", name: "测试张三", job: 24, inParty: true },
        { id: "10000002", name: "测试李四", job: 25, inParty: true },
        { id: "10000004", name: "测试王五", job: 19, inParty: true },
        { id: "10000005", name: "测试赵六", job: 23, inParty: true },
        { id: "10000006", name: "测试孙七", job: 39, inParty: true },
        { id: "10000007", name: "测试周八", job: 40, inParty: true },
        { id: "10000008", name: "测试吴九", job: 37, inParty: true },
        { id: "10000009", name: "测试郑十", job: 38, inParty: true },
      ] as { id: string; name: string; job: number; inParty: boolean }[]),
    };
  },
  getters: {},
  actions: {
    handleChangePrimaryPlayer(e: any): void {
      this.playerId = e?.charID?.toString(16)?.toUpperCase();
    },
    handleLogLine(e: { line: string[] }): void {},
    handlePartyChanged(e: any): void {
      if (e.party.length > 0) {
        this.partyData = e.party.filter((v: any) => v.inParty);
      }
    },
    changeTarget(targetId: string): void {
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
