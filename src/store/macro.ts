import { defaultMacro } from "./../resources/macro";
import { defineStore } from "pinia";
import Swal from "sweetalert2";
import "@sweetalert2/theme-bootstrap-4/bootstrap-4.scss";
import { doTextCommand, doWayMarks, doInsertPreset, doQueueActions } from "../utils/postNamazu";
import { MacroInfoMacro, MacroInfoPlace, MacroType } from "../types/Macro";
import zoneInfo from "../resources/zoneInfo";
import { getMapIDByTerritoryType, getTerritoryTypeByMapID } from "../resources/contentFinderCondition";
let partyLen = 0;
addOverlayListener("PartyChanged", (e: any) => (partyLen = e.party.length));
export const useMacroStore = defineStore("macro", {
  state: () => {
    return {
      data: useStorage("my-macros", reactive(defaultMacro)),
      selectZone: useStorage("my-zone", ref("1003")),
      zoneNow: useStorage("my-zone-now", ref("129")),
      fastEntrance: [
        { text: "P1S", value: "1003" },
        { text: "P2S", value: "1005" },
        { text: "P3S", value: "1007" },
        { text: "P4S", value: "1009" },
        { text: "P5S", value: "1082" },
        { text: "P6S", value: "1084" },
        { text: "P7S", value: "1086" },
        { text: "P8S", value: "1088" },
        { text: "DSR", value: "968" },
      ],
      gameExists: useStorage("my-game-exists", false),
    };
  },
  getters: {
    defaultX: (state) => zoneInfo[Number(state.selectZone)].offsetX,
    defaultY: (state) => zoneInfo[Number(state.selectZone)].offsetY,
  },
  actions: {
    editMacroMacro(macro: MacroInfoMacro): void {
      this.data.zoneId[this.selectZone].map((v) => Reflect.deleteProperty(v, "Editable"));
      macro.Editable = true;
      macro.Text = cleanMacro(macro.Text);
    },
    submitMacroMacro(macro: MacroInfoMacro): void {
      Reflect.deleteProperty(macro, "Editable");
      macro.Text = cleanMacro(macro.Text);
    },
    editMacroPlace(macro: MacroInfoPlace): void {
      this.data.zoneId[this.selectZone].map((v) => Reflect.deleteProperty(v, "Editable"));
      macro.Editable = true;
    },
    submitMacroPlace(macro: MacroInfoPlace): void {
      Reflect.deleteProperty(macro, "Editable");
    },
    initAllData() {
      for (const x in this.data.zoneId) this.initSelectZoneData(x);
    },
    initSelectZoneData(zone: string) {
      for (const y in this.data.zoneId[zone]) {
        Reflect.deleteProperty(this.data.zoneId[zone][y], "Editable");
        if (this.data.zoneId[zone][y].Type === "place") {
          const d = this.data.zoneId[zone][y] as MacroInfoPlace;
          d.Place = {
            A: d.Place.A ?? { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
            B: d.Place.B ?? { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
            C: d.Place.C ?? { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
            D: d.Place.D ?? { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
            One: d.Place.One ?? { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
            Two: d.Place.Two ?? { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
            Three: d.Place.Three ?? { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
            Four: d.Place.Four ?? { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
          };
        }
      }
    },
    newOne(type: MacroType = "macro") {
      for (const x in this.data.zoneId)
        for (const y in this.data.zoneId[x]) Reflect.deleteProperty(this.data.zoneId[x][y], "Editable");
      const selectZoneId = Number(this.selectZone);
      if (this.data.zoneId[selectZoneId] === undefined) this.data.zoneId[selectZoneId] = [];
      if (this.data.zoneId[selectZoneId]) {
        if (type === "macro") {
          this.data.zoneId[selectZoneId].push({ Type: type, Name: "New Macro", Text: "", Editable: true });
        } else if (type === "place") {
          const i = this.data.zoneId[selectZoneId].push({
            Name: "New WayMark",
            Type: type,
            Editable: true,
            Place: {
              "A": { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
              "B": { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
              "C": { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
              "D": { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
              "One": { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
              "Two": { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
              "Three": { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
              "Four": { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
            },
          });
          return this.data.zoneId[selectZoneId][i - 1];
        }
      }
    },
    async importPPJSON(): Promise<void> {
      const selectZoneId = Number(this.selectZone);
      const blank: PPJSON = {
        A: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        B: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        C: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        D: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        One: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        Two: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        Three: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        Four: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
      };
      await Swal.fire({
        title: "请输入PP导出格式JSON字符串",
        input: "text",
        inputAttributes: {
          autocapitalize: "off",
          autocorrect: "off",
          autocomplete: "off",
        },
        showCancelButton: true,
        confirmButtonText: "确定",
        cancelButtonText: "放弃",
      })
        .then(async (result) => {
          if (result.isConfirmed) {
            const json = Object.assign({ MapID: -1, Name: "json" }, Object.assign(blank, JSON.parse(result.value)));
            const selectMapID = getMapIDByTerritoryType(selectZoneId);
            const selectZone = zoneInfo[selectZoneId];
            const JSONZone = zoneInfo[getTerritoryTypeByMapID(json.MapID)];
            let flag = true;
            if (json.MapID !== selectMapID) {
              await Swal.fire({
                title: "地图不符",
                text: `你正试图将"${
                  JSONZone.name.cn ?? JSONZone.name.ja ?? "" + JSONZone.name.en
                }"的场景标记预设导入至"${selectZone.name.cn ?? selectZone.name.ja ?? "" + selectZone.name.en}"中`,
                showConfirmButton: false,
                showDenyButton: true,
                showCancelButton: true,
                denyButtonText: `强制转换坐标`,
                cancelButtonText: "不，再想想",
              }).then((result) => {
                flag = result.isDenied;
              });
            }
            if (!flag) return;
            const targetMacro = this.newOne("place") as MacroInfoPlace;
            targetMacro.Name = json.Name;
            targetMacro.Place = json;
            Reflect.deleteProperty(targetMacro, "Editable");
            const oX = selectZone.offsetX - JSONZone.offsetX;
            const oY = selectZone.offsetY - JSONZone.offsetY;
            try {
              ["A", "B", "C", "D", "One", "Two", "Three", "Four"].map((v: any) => {
                // @ts-ignore
                targetMacro.Place[v].X -= oX;
                // @ts-ignore
                targetMacro.Place[v].Z -= oY;
              });
            } catch {}
            Reflect.deleteProperty(targetMacro.Place, "MapID");
            Reflect.deleteProperty(targetMacro.Place, "Name");
            Swal.fire({
              position: "top-end",
              icon: "success",
              title: "导入成功",
              showConfirmButton: false,
              timer: 1000,
            });
          }
        })
        .catch(() => {
          Swal.fire({
            position: "top-end",
            icon: "error",
            title: "解析字符串时出现错误，动作终止",
            showConfirmButton: false,
            timer: 1500,
          });
        });
    },
    deleteMacro(macro: MacroInfoMacro | MacroInfoPlace): void {
      if (
        (macro.Type === "macro" && (macro?.Text ?? "").length <= 5) ||
        (macro.Type === "place" &&
          macro.Place?.A?.Active === false &&
          macro.Place?.B?.Active === false &&
          macro.Place?.C?.Active === false &&
          macro.Place?.D?.Active === false &&
          macro.Place?.One?.Active === false &&
          macro.Place?.Two?.Active === false &&
          macro.Place?.Three?.Active === false &&
          macro.Place?.Four?.Active === false)
      ) {
        let index = this.data.zoneId[this.selectZone].indexOf(macro);
        if (index > -1) this.data.zoneId[this.selectZone].splice(index, 1);
      } else
        Swal.fire({
          title: "确定要删除吗",
          showConfirmButton: false,
          showDenyButton: true,
          showCancelButton: true,
          denyButtonText: `是的，删除`,
          cancelButtonText: "不，再想想",
        }).then((result) => {
          if (result.isDenied) {
            let index = this.data.zoneId[this.selectZone].indexOf(macro);
            if (index > -1) this.data.zoneId[this.selectZone].splice(index, 1);
          }
        });
    },
    sendMacroParty(text: string): void {
      Swal.fire({
        title: "确定发到小队频道？",
        text: "请谨慎",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        confirmButtonText: "是的，发到小队",
        cancelButtonText: "不，再想想",
      }).then((result) => {
        if (result.isConfirmed) {
          macroCommand(text, "p");
        }
      });
    },
    sendMacroEcho(text: string): void {
      macroCommand(text, "e");
    },
    doLocalWayMark(place: PPJSON): void {
      Swal.fire({
        title: "确定进行本地标点？",
        text: "只有你自己能看到这些标点哦",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        confirmButtonText: "是的，本地标点",
        cancelButtonText: "不，再想想",
      }).then((result) => {
        if (result.isConfirmed) {
          doWayMarks(place);
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "已进行本地标点",
            showConfirmButton: false,
            timer: 1000,
          });
        }
      });
    },
    doSlotWayMark(place: PPJSON): void {
      Swal.fire({
        title: "确定将该预设覆盖到插槽5？",
        text: "原在插槽5的预设将会被覆盖",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        confirmButtonText: "写入",
        showDenyButton: true,
        denyButtonText: "写入并标记",
        cancelButtonText: "不，再想想",
      }).then((result) => {
        if (result.isDenied) {
          doInsertPreset(Number(this.selectZone), place, 5);
          if (this.selectZone === this.zoneNow)
            doQueueActions([{ c: "DoTextCommand", p: "/waymark preset 5", d: 500 }]);
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "已写入插槽5",
            showConfirmButton: false,
            timer: 1000,
          });
        }
        if (result.isConfirmed) {
          doInsertPreset(Number(this.selectZone), place, 5);
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "已写入插槽5",
            showConfirmButton: false,
            timer: 1000,
          });
        }
      });
    },
    positioning(): void {
      this.selectZone = this.zoneNow;
    },
    handleChangeZone(e: any): void {
      Swal.close();
      const zoneID = getZoneIDByZoneName(e.zoneName);
      const ignore = [
        144, //金蝶游乐场
        979, //苍穹皓天
      ];
      if (ignore.includes(e.zoneID)) return;
      if (!zoneID) {
        this.selectZone = "129";
        this.zoneNow = "129";
        Swal.fire({
          position: "center",
          icon: "info",
          title: "未知区域",
          text: `${e.zoneName} ${e.zoneID}`,
          footer: "若此处是战斗副本，请反馈作者。",
          backdrop: false,
        });
        return;
      }
      if (this.gameExists) {
        this.selectZone = zoneID;
        this.zoneNow = zoneID;
      }
    },
    handleGameExists(e: any): void {
      this.gameExists = !!e?.detail?.exists;
    },
    handleLogLine(e: any) {
      if (e.line[2] === "0038") {
        const echoSwitch = e.line[4].match(/^发宏\s*(?<channel>e|p)?/);
        if (echoSwitch) {
          const channel: "e" | "p" = echoSwitch?.groups?.channel ?? "e";
          const macro = this.data.zoneId[this.zoneNow].filter((v) => v.Type === "macro");
          if (macro.length === 1 && macro[0].Type === "macro") {
            macroCommand(macro[0].Text, channel);
          } else if (macro.length > 1) {
            doTextCommand("/e 本地图存在多个宏，无法使用快捷发宏，请手动在网页中指定。");
          } else doTextCommand("/e 当前地图没有宏<se.3>");
          return;
        }
        const echoWayMarkLocal = (e.line[4] as string).match(/^本地标点/);
        if (echoWayMarkLocal) {
          const place = this.data.zoneId[this.zoneNow].filter((v) => v.Type === "place");
          if (place.length === 1) {
            doWayMarks((place[0] as MacroInfoPlace).Place!);
          } else if (place.length > 1) {
            doTextCommand("/e 本地图存在多个场景标记，无法使用快捷本地标点，请手动在网页中指定。");
          }
          return;
        }
        const echoSlot = (e.line[4] as string).match(/^(?:标点|标记|场景|场景标记)(?:插槽|预设)\s*(?<slot>[1-5])?/);
        if (echoSlot) {
          const slotIndex: 1 | 2 | 3 | 4 | 5 = Number(echoSlot?.groups?.slot ?? 5) as 1 | 2 | 3 | 4 | 5;
          const place = this.data.zoneId[this.zoneNow].filter((v) => v.Type === "place");
          if (place.length === 1) {
            doInsertPreset(Number(this.zoneNow), (place[0] as MacroInfoPlace).Place!, slotIndex);
          } else if (place.length > 1) {
            doTextCommand("/e 本地图存在多个场景标记预设，无法使用快捷插槽，请手动在网页中指定。");
          }
          return;
        }
      }
    },
    resetZone(): void {
      Swal.fire({
        title: "确定恢复该地图的内容到默认？",
        text: "仅限当前地图",
        icon: "warning",
        showCancelButton: true,
        showDenyButton: true,
        showConfirmButton: false,
        confirmButtonColor: "#3085d6",
        denyButtonColor: "#E6A23C",
        denyButtonText: "是的，恢复该区域数据",
        cancelButtonText: "不，再想想",
      }).then((result) => {
        if (result.isDenied) {
          this.data.zoneId[this.selectZone].length = 0;
          this.data.zoneId[this.selectZone].push(...JSON.parse(JSON.stringify(defaultMacro.zoneId[this.selectZone])));
          this.initSelectZoneData(this.selectZone);
          const zoneName = zoneInfo?.[this.selectZone as unknown as number];
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "已恢复" + zoneName?.name.cn ?? zoneName?.name?.ja ?? zoneName?.name?.en ?? "",
            showConfirmButton: false,
            timer: 1000,
          });
        }
      });
    },
    resetAllData(): void {
      Swal.fire({
        title: "确定清除所有地图的自定义内容？",
        text: "所有数据都将灰飞烟灭！！！",
        icon: "warning",
        showCancelButton: true,
        showDenyButton: true,
        showConfirmButton: false,
        confirmButtonColor: "#3085d6",
        denyButtonText: "是的，抹除所有一切用户数据",
        cancelButtonText: "不，再想想",
      }).then((result) => {
        if (result.isDenied) {
          Swal.fire({
            title: "你真的真的确定要毁灭一切数据吗？",
            text: "所有数据都将灰飞烟灭！！！！！！！！",
            icon: "warning",
            showCancelButton: true,
            showDenyButton: true,
            showConfirmButton: false,
            confirmButtonColor: "#3085d6",
            denyButtonText: "是的，抹除所有数据！！！！！",
            cancelButtonText: "不，再想想",
          }).then((result) => {
            if (result.isDenied) {
              this.data.zoneId = JSON.parse(JSON.stringify(defaultMacro.zoneId));
              Swal.fire({
                position: "top-end",
                icon: "success",
                title: "世界已核平~",
                showConfirmButton: false,
                timer: 1000,
              });
            }
          });
        }
      });
    },
  },
});
export function cleanMacro(text: string): string {
  text = text.replaceAll(/\n{2,}/gm, "\n");
  // text = text.replaceAll(/^\s*\/[pe]\s/gm, "");
  text = text.replaceAll(/^\s+/gm, "");
  text = text.replaceAll(/ /gm, `\xa0`);
  return text;
}
export function getZoneIDByZoneName(ZoneName: string) {
  for (const zoneId in zoneInfo) {
    const zone = zoneInfo[zoneId];
    for (const lang in zone.name) {
      const zoneName = zone.name[lang as keyof typeof zone.name];
      if (zoneName?.toUpperCase() === ZoneName.toUpperCase() || zoneName === ZoneName.replaceAll(/[\(\)]/gi, "")) {
        return zoneId;
      }
    }
  }
}

async function macroCommand(text: string, channel: "e" | "p") {
  if (channel === "p" && partyLen === 0) doTextCommand("/e 单人时无法发送小队宏<se.3>");
  const macros = text.replaceAll(/^\s*\/[pe]\s/gm, "").split("\n");
  const queue = macros.map((m) => {
    return { c: "DoTextCommand" as PostNamazuCall, p: `/${channel} ` + m, d: 125 };
  });
  doQueueActions(queue);
  Swal.fire({
    position: "top-end",
    icon: "success",
    title: "已发送",
    showConfirmButton: false,
    timer: 1000,
  });
}
