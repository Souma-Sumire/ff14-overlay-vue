import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import { MacroInfo, PlaceMark, TextType } from "../types/Macro";
import { useStorage } from "@vueuse/core";
import { defaultMacro } from "../resources/macro";
import Swal from "sweetalert2";
import "sweetalert2/src/sweetalert2.scss";
import { doWayMark, doTextCommand, slotWayMark } from "../api/postNamazu";
export const useMacroStore = defineStore("macro", {
  state: () => {
    return {
      data: useStorage("my-macors", reactive(defaultMacro), localStorage),
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
      ],
    };
  },
  getters: {},
  actions: {
    editMacro(macro: MacroInfo): void {
      this.data.zoneId[this.selectZone].map((v) => (v.editable = false));
      macro.editable = true;
      if (macro.text) macro.text = cleanMacro(macro.text);
    },
    submitMacro(macro: MacroInfo): void {
      macro.editable = false;
      if (macro.text) macro.text = cleanMacro(macro.text);
    },
    cleanMacro,
    cleanEditable() {
      for (const key in this.data.zoneId) this.data.zoneId[key].map((v) => (v.editable = false));
    },
    newOne(type: TextType = "macro"): void {
      this.cleanEditable();
      const selectZoneId = Number(this.selectZone);
      if (this.data.zoneId[selectZoneId] === undefined) this.data.zoneId[selectZoneId] = [];
      if (this.data.zoneId[selectZoneId]) {
        if (type === "macro") {
          this.data.zoneId[selectZoneId].push({ type: type, name: "New Macro", text: "", editable: true });
        } else if (type === "place") {
          this.data.zoneId[selectZoneId].push({
            type: type,
            name: "New WayMark",
            place: [
              { Mark: "A", X: 100, Y: 0, Z: 100, Active: false },
              { Mark: "B", X: 100, Y: 0, Z: 100, Active: false },
              { Mark: "C", X: 100, Y: 0, Z: 100, Active: false },
              { Mark: "D", X: 100, Y: 0, Z: 100, Active: false },
              { Mark: "One", X: 100, Y: 0, Z: 100, Active: false },
              { Mark: "Two", X: 100, Y: 0, Z: 100, Active: false },
              { Mark: "Three", X: 100, Y: 0, Z: 100, Active: false },
              { Mark: "Four", X: 100, Y: 0, Z: 100, Active: false },
            ],
            editable: true,
          });
        }
      }
    },
    deleteMacro(macro: MacroInfo): void {
      if (macro.type === "macro" && (macro?.text ?? "").length <= 5) {
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
          doTextCommand("/e ============");
          text.split("\n").map((v, i) => setTimeout(() => doTextCommand("/p " + v), 200 * (i + 1)));
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
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "已发送到默语频道",
        showConfirmButton: false,
        timer: 1000,
      });
      doTextCommand("/e ============");
      text.split("\n").map((v, i) => setTimeout(() => doTextCommand("/e " + v), 200 * (i + 1)));
    },
    doLocalWayMark(place: PlaceMark[]): void {
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
    doSlotWayMark(place: PlaceMark[]): void {
      Swal.fire({
        title: "确定将该标点覆盖到插槽1？",
        text: "原在插槽1的标点将会被覆盖",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        confirmButtonText: "是的，插入插槽1",
        cancelButtonText: "不，再想想",
      }).then((result) => {
        if (result.isConfirmed) {
          slotWayMark(place);
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "已写入插槽1",
            showConfirmButton: false,
            timer: 1000,
          });
        }
      });
    },
    positioning(): void {
      this.selectZone = this.zoneNow;
    },
    handleChangeZone(event: any): void {
      this.selectZone = String(event.zoneID);
      this.zoneNow = this.selectZone;
    },
    resetZone(): void {
      Swal.fire({
        title: "确定恢复该地图的内容到默认？",
        text: "你把宏玩崩啦！？",
        icon: "warning",
        showCancelButton: true,
        showDenyButton: true,
        showConfirmButton: false,
        confirmButtonColor: "#3085d6",
        denyButtonText: "是的，抹除用户数据",
        cancelButtonText: "不，再想想",
      }).then((result) => {
        if (result.isDenied) {
          this.data.zoneId[this.selectZone] = defaultMacro.zoneId[this.selectZone];
        }
      });
    },
    importPPJSON(targetMacro: MacroInfo): void {
      Swal.fire({
        title: "请输入JSON字符串",
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
        .then((result) => {
          if (result.isConfirmed) {
            const json = JSON.parse(result.value);
            targetMacro.place = [
              { Mark: "A", X: json.A.X, Y: json.A.Y, Z: json.A.Z, Active: json.A.Active },
              { Mark: "B", X: json.B.X, Y: json.B.Y, Z: json.B.Z, Active: json.B.Active },
              { Mark: "C", X: json.C.X, Y: json.C.Y, Z: json.C.Z, Active: json.C.Active },
              { Mark: "D", X: json.D.X, Y: json.D.Y, Z: json.D.Z, Active: json.D.Active },
              { Mark: "One", X: json.One.X, Y: json.One.Y, Z: json.One.Z, Active: json.One.Active },
              { Mark: "Two", X: json.Two.X, Y: json.Two.Y, Z: json.Two.Z, Active: json.Two.Active },
              { Mark: "Three", X: json.Three.X, Y: json.Three.Y, Z: json.Three.Z, Active: json.Three.Active },
              { Mark: "Four", X: json.Four.X, Y: json.Four.Y, Z: json.Four.Z, Active: json.Four.Active },
            ];
            Swal.fire({
              position: "top-end",
              icon: "success",
              title: "导入成功",
              showConfirmButton: false,
              timer: 1500,
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
  },
});
export function cleanMacro(text: string): string {
  text = text.replaceAll(/\n{2,}/gm, "\n");
  text = text.replaceAll(/^\s*\/[\w\d]+\s/gm, "");
  text = text.replaceAll(/ /gm, `\xa0`);
  return text;
}
