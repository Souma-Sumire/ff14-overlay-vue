import { defineStore } from "pinia";
import { IAction, ActionEnum } from "../types/Action";
import { actions } from "../resources/action";
import Util from "../utils/util";
export const useActionStore = defineStore("action", {
  state: () => {
    return {};
  },
  getters: {},
  actions: {
    getActionById(id: number): IAction | undefined {
      return createActionById(id);
    },
    getActionByName(name: string, fn: Function): IAction | undefined {
      for (const key in actions) {
        if (Object.prototype.hasOwnProperty.call(actions, key)) {
          const action = actions[key];
          if (action[ActionEnum.Name] === name && fn(action)) return createActionById(Number(key));
        }
      }
    },
  },
});

function createActionById(id: number): IAction | undefined {
  const action: any[] = actions[id];
  if (action === undefined) return undefined;
  return {
    Id: id,
    Name: action[ActionEnum.Name],
    Icon: traitIcon[id] ?? action[ActionEnum.Icon],
    ActionCategory: traitActionCategory[id] ?? action[ActionEnum.ActionCategory],
    ClassJob: Util.jobEnumToJob(action[ActionEnum.ClassJob]),
    ClassJobLevel: action[ActionEnum.ClassJobLevel],
    IsRoleAction: action[ActionEnum.IsRoleAction],
    Cast100ms: action[ActionEnum.Cast100ms],
    Recast100ms: traitRecast100ms[id] ?? action[ActionEnum.Recast100ms],
    MaxCharges: traitMaxCharges[id] ?? action[ActionEnum.MaxCharges],
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

const traitRecast100ms: Record<number, number> = {
  3606: 900, //光速
  7521: 1100, //倍增
  7519: 350, //六分反击
  3574: 300, //激情咏唱
  24300: 900, //命源
  7405: 900, //行吟
  16889: 900, //策动
  16012: 900, //守护之桑巴
  158: 120, //转魔
  3585: 900, //展开战术
  16003: 300, //标准舞步结束
  16191: 300, //标准舞步结束
  16192: 300, //标准舞步结束
  16004: 1200, //技巧舞步结束
  16193: 1200, //技巧舞步结束
  16194: 1200, //技巧舞步结束
  16195: 1200, //技巧舞步结束
  16196: 1200, //技巧舞步结束
  11415: 300, //月之笛
};

const traitMaxCharges: Record<number, number> = {
  16151: 2, //极光
  25762: 3, //抜重歩法
  24380: 2, //调和的灵魂
  3640: 2, //跳斩
  7432: 2, //神祝祷
  7518: 2, //促进
  3574: 2, //激情咏唱
  2874: 3, //虹吸弹
  2876: 2, //整备
  95: 2, //破碎冲
  83: 2, //龙剑
  2262: 2, //缩地
  16483: 2, //燕返
  16484: 2, //燕返彼岸花
  16485: 2, //燕返天下五剑
  16486: 2, //燕返纷乱雪月花
  7499: 2, //明镜止水
  110: 3, //失血箭
  16010: 3, //前冲步
  3614: 2, //先天禀赋
  16556: 2, //星天交错
  7386: 3, //猛攻
  25799: 2, //守护之光
};

const traitIcon: Record<number, number> = {
  2: 123, //任务指令
  3: 104, //冲刺
  4: 118, //坐骑
  7: 101, //攻击
};

const traitActionCategory: Record<number, number> = {
  16483: 3, //燕回返 战技
  16484: 3, //回返彼岸花 战技
  16485: 3, //回返天下五剑 战技
  16486: 3, //回返纷乱雪月花 战技
};
