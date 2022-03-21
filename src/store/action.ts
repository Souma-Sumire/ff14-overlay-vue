import actions from "../resources/action.json";
import { defineStore } from "pinia";
import { IAction, IActionOptions } from "../types/Action";

enum ActionEnum {
  "Id",
  "Name",
  "Icon",
  "ActionCategory",
  "ClassJob",
  "ClassJobLevel",
  "IsRoleAction",
  "Cast100ms",
  "Recast100ms",
  "MaxCharges",
  "IsPvP",
  "IsPlayerAction",
}

export const useActionStore = defineStore("action", {
  state: () => {
    return {};
  },
  getters: {},
  actions: {
    getAction(options: IActionOptions): (IAction & { Url?: string }) | undefined {
      const action: any = (actions as any).find((item: any) => {
        if (options?.IsPlayerAction && item[ActionEnum.Icon] === 405) return;
        return Object.entries(options).every(([key, value]) => {
          return item[ActionEnum[key as any]] === value;
        });
      });
      if (action) {
        return createAction(action);
      }
    },
    getActions(options: IActionOptions): (IAction & { Url?: string })[] | undefined {
      let _actions: any[] = (actions as []).filter((item: any) => {
        return Object.entries(options).every(([key, value]) => {
          return item[ActionEnum[key as any]] === value;
        });
      });
      for (let i = 0; i < _actions.length; i++) {
        _actions[i] = createAction(_actions[i]);
      }
      if (_actions) return _actions;
    },
  },
});

function createAction(action: any) {
  return {
    Id: action[ActionEnum.Id],
    Name: action[ActionEnum.Name],
    Icon: action[ActionEnum.Icon],
    ActionCategory: action[ActionEnum.ActionCategory],
    ClassJob: action[ActionEnum.ClassJob],
    ClassJobLevel: action[ActionEnum.ClassJobLevel],
    IsRoleAction: action[ActionEnum.IsRoleAction],
    Cast100ms: action[ActionEnum.Cast100ms],
    Recast100ms: action[ActionEnum.Recast100ms],
    MaxCharges: action[ActionEnum.MaxCharges],
    IsPvP: action[ActionEnum.IsPvP],
    IsPlayerAction: action[ActionEnum.IsPlayerAction],
    Url: createIconUrl(action[ActionEnum.Icon]),
  };
}
function createIconUrl(icon: number | undefined) {
  if (!icon) return;
  let head = [..."000000"];
  let iconStr = icon.toString();
  if (iconStr.length > 3) {
    const temp = [...iconStr].slice(0, iconStr.length - 3).concat(..."000");
    head = [...head.slice(0, 6 - temp.length), ...temp];
  }
  let foot = [..."000000"];
  foot = [...foot.slice(0, 6 - iconStr.length), ...iconStr];
  return `${head.join("")}/${foot.join("")}`;
}
