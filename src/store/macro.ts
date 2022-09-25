import { defaultMacro } from "./../resources/macro";
import { PPJSON } from "./../types/Macro";
import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import Swal from "sweetalert2";
import "@sweetalert2/theme-bootstrap-4/bootstrap-4.scss";
import { reactive, ref } from "vue";
import { doTextCommand, doWayMark, slotWayMark } from "../api/postNamazu";
import { MacroInfoMacro, MacroInfoPlace, MacroType } from "../types/Macro";
import zoneInfo from "../resources/zoneInfo";
import { getMapIDByTerritoryType, getTerritoryTypeByMapID } from "../resources/contentFinderCondition";

export const useMacroStore = defineStore("macro", {
  state: () => {
    return {
      data: useStorage("my-macors", reactive(defaultMacro)),
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
  getters: {},
  actions: {
    editMacro(macro: MacroInfoMacro): void {
      this.data.zoneId[this.selectZone].map((v) => (v.Editable = false));
      macro.Editable = true;
      if (macro.Text) macro.Text = cleanMacro(macro.Text);
    },
    submitMacro(macro: MacroInfoMacro): void {
      macro.Editable = false;
      if (macro.Text) macro.Text = cleanMacro(macro.Text);
    },
    cleanMacro,
    cleanEditable() {
      for (const x in this.data.zoneId)
        for (const y in this.data.zoneId[x]) Reflect.deleteProperty(this.data.zoneId[x][y], "Editable");
    },
    newOne(type: MacroType = "macro") {
      this.cleanEditable();
      const selectZoneId = Number(this.selectZone);
      if (this.data.zoneId[selectZoneId] === undefined) this.data.zoneId[selectZoneId] = [];
      if (this.data.zoneId[selectZoneId]) {
        if (type === "macro") {
          this.data.zoneId[selectZoneId].push({ Type: type, Name: "New Macro", Text: "", Editable: true });
        } else if (type === "place") {
          const defaultX = -zoneInfo[selectZoneId].offsetX;
          const defaultY = -zoneInfo[selectZoneId].offsetY;
          const i = this.data.zoneId[selectZoneId].push({
            Name: "New WayMark",
            Type: type,
            Editable: true,
            Place: {
              "A": { X: defaultX, Y: 0, Z: defaultY, Active: false },
              "B": { X: defaultX, Y: 0, Z: defaultY, Active: false },
              "C": { X: defaultX, Y: 0, Z: defaultY, Active: false },
              "D": { X: defaultX, Y: 0, Z: defaultY, Active: false },
              "One": { X: defaultX, Y: 0, Z: defaultY, Active: false },
              "Two": { X: defaultX, Y: 0, Z: defaultY, Active: false },
              "Three": { X: defaultX, Y: 0, Z: defaultY, Active: false },
              "Four": { X: defaultX, Y: 0, Z: defaultY, Active: false },
            },
          });
          return this.data.zoneId[selectZoneId][i - 1];
        }
      }
    },
    async importPPJSON(): Promise<void> {
      const selectZoneId = Number(this.selectZone);
      const defaultX = -zoneInfo[selectZoneId].offsetX;
      const defaultY = -zoneInfo[selectZoneId].offsetY;
      const blank: PPJSON = {
        A: { X: defaultX, Y: 0, Z: defaultY, Active: false },
        B: { X: defaultX, Y: 0, Z: defaultY, Active: false },
        C: { X: defaultX, Y: 0, Z: defaultY, Active: false },
        D: { X: defaultX, Y: 0, Z: defaultY, Active: false },
        One: { X: defaultX, Y: 0, Z: defaultY, Active: false },
        Two: { X: defaultX, Y: 0, Z: defaultY, Active: false },
        Three: { X: defaultX, Y: 0, Z: defaultY, Active: false },
        Four: { X: defaultX, Y: 0, Z: defaultY, Active: false },
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
                if (!result.isDenied) return;
              });
            }
            const targetMacro = this.newOne("place") as MacroInfoPlace;
            targetMacro.Name = json.Name;
            targetMacro.Place = json;
            targetMacro.Editable = false;
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
          !macro.Place.A.Active &&
          !macro.Place.B.Active &&
          !macro.Place.C.Active &&
          !macro.Place.D.Active &&
          !macro.Place.One.Active &&
          !macro.Place.Two.Active &&
          !macro.Place.Three.Active &&
          !macro.Place.Four.Active)
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
          const t = text;
          t.replaceAll(/^\s*\/[pe]/gm, "");
          t.split("\n").map((v, i) => setTimeout(() => doTextCommand("/p " + v), 200 * (i + 1)));
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "已发送到小队频道",
            showConfirmButton: false,
            timer: 1000,
          });
        }
      });
    },
    sendMacroEcho(text: string): void {
      const t = text;
      t.replaceAll(/^\s*\/[pe]/gm, "");
      t.split("\n").map((v, i) => setTimeout(() => doTextCommand("/e " + v), 200 * (i + 1)));
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "已发送到默语频道",
        showConfirmButton: false,
        timer: 1000,
      });
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
          doWayMark(place);
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
        confirmButtonText: "是的，覆盖插槽5",
        cancelButtonText: "不，再想想",
      }).then((result) => {
        if (result.isConfirmed) {
          slotWayMark(this.selectZone, place, 5);
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
      const zoneID = getZoneIDByZoneName(e.zoneName);
      //金蝶游乐场
      if (e.zoneID === 144) return;
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
        switch (e.line[4]) {
          case "发宏":
            var lastTimeMacro = new Date().getTime();
            {
              const macro = this.data.zoneId[this.selectZone].filter((v) => v.Type === "macro");
              if (macro.length === 1 && macro[0].Type === "macro") {
                const now = new Date().getTime();
                if (now - lastTimeMacro >= 3000) this.sendMacroEcho(macro[0].Text);
                else this.sendMacroParty(macro[0].Text);
                lastTimeMacro = new Date().getTime();
              } else if (macro.length > 1) {
                doTextCommand("/e 本地图存在多个宏，无法使用快捷发宏，请手动在网页中指定。");
              }
            }
            break;
          case "本地标点":
            {
              const place = this.data.zoneId[this.selectZone].filter((v) => v.Type === "place");
              if (place.length === 1) {
                doWayMark((place[0] as MacroInfoPlace).Place!);
              } else if (place.length > 1) {
                doTextCommand("/e 本地图存在多个场景标记，无法使用快捷本地标点，请手动在网页中指定。");
              }
            }
            break;
          case "标点插槽":
            {
              const place = this.data.zoneId[this.selectZone].filter((v) => v.Type === "place");
              if (place.length === 1) {
                slotWayMark(this.selectZone, (place[0] as MacroInfoPlace).Place!, 5);
              } else if (place.length > 1) {
                doTextCommand("/e 本地图存在多个场景标记预设，无法使用快捷插槽，请手动在网页中指定。");
              }
            }
            break;
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
          this.data.zoneId[this.selectZone] = defaultMacro.zoneId[this.selectZone];
        }
      });
    },
    updateData(): void {
      Swal.fire({
        title: "确定更新全部地图数据库吗？",
        text: "该动作会恢复掉你曾经删除的默认数据",
        icon: "question",
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: "是的，更新全部数据",
        cancelButtonText: "不，再想想",
      }).then((result) => {
        if (result.isConfirmed) {
          try {
            for (const zoneId in defaultMacro.zoneId) {
              const defData = defaultMacro.zoneId[zoneId as keyof typeof defaultMacro.zoneId];
              const nowData = this.data.zoneId[zoneId] ?? []; //144 = 金蝶
              for (const key in defData) {
                const def = defData[key];
                if (
                  !nowData.find((v) => {
                    if (def.Type === "macro" && v.Type === "macro")
                      return JSON.stringify(def.Text) === JSON.stringify(v.Text);
                    if (def.Type === "place" && v.Type === "place")
                      return JSON.stringify(def.Place) === JSON.stringify(v.Place);
                    return false;
                  })
                ) {
                  nowData.unshift(def);
                }
              }
            }
            Swal.fire({
              position: "top-end",
              icon: "success",
              title: "更新完成",
              showConfirmButton: false,
              timer: 1000,
            });
          } catch (e: any) {
            Swal.fire({
              icon: "error",
              title: e.message,
            });
          }
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
              this.data.zoneId = defaultMacro.zoneId;
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
      if (zoneName === ZoneName || zoneName === ZoneName.replaceAll(/[\(\)]/g, "")) {
        return zoneId;
      }
    }
  }
}
