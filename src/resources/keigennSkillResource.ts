import type { KeigennSkill, SkillScope } from "@/types/keigennRecord2";
import "@/resources/globalSkills";
import {
  getGlobalSkillDefinitionById,
  resolveBakedActionMeta,
} from "@/resources/logic/actionMetaResolver";

const keigennSkillDefinitions: { id: number; scope: SkillScope }[] = [
  { id: 30, scope: "party" }, // 神圣领域
  { id: 43, scope: "party" }, // 死斗
  { id: 3638, scope: "party" }, // 行尸走肉
  { id: 16152, scope: "party" }, // 超火流星
  { id: 140, scope: "single" }, // 天赐祝福
  { id: 25862, scope: "party" }, // 礼仪之铃
  { id: 25868, scope: "party" }, // 疾风怒涛之计
  { id: 25874, scope: "party" }, // 大宇宙
  { id: 7549, scope: "party" }, // 牵制
  { id: 7560, scope: "party" }, // 昏乱
  { id: 7535, scope: "party" }, // 雪仇
  { id: 3540, scope: "party" }, // 圣光幕帘
  { id: 7385, scope: "party" }, // 武装戍卫
  { id: 7388, scope: "party" }, // 摆脱
  { id: 16471, scope: "party" }, // 暗黑布道
  { id: 16160, scope: "party" }, // 光之心
  { id: 7433, scope: "party" }, // 全大赦
  { id: 16536, scope: "party" }, // 节制
  { id: 7405, scope: "party" }, // 行吟
  { id: 16889, scope: "party" }, // 策动
  { id: 2887, scope: "party" }, // 武装解除
  { id: 16012, scope: "party" }, // 防守之桑巴
  { id: 25857, scope: "party" }, // 抗死
  { id: 7531, scope: "self" }, // 铁壁
  { id: 7561, scope: "party" }, // 即刻咏唱
  { id: 7542, scope: "self" }, // 浴血
  { id: 7541, scope: "self" }, // 内丹
  { id: 7548, scope: "self" }, // 亲疏自行
  { id: 7559, scope: "self" }, // 沉稳咏唱
  { id: 17, scope: "self" }, // 预警
  { id: 36920, scope: "self" }, // 极致防御
  { id: 22, scope: "self" }, // 壁垒
  { id: 25746, scope: "self" }, // 圣盾阵
  { id: 7382, scope: "other" }, // 干预
  { id: 44, scope: "self" }, // 复仇
  { id: 36923, scope: "self" }, // 戮罪
  { id: 40, scope: "self" }, // 战栗
  { id: 3552, scope: "self" }, // 泰然自若
  { id: 25751, scope: "self" }, // 原初的血气
  { id: 16464, scope: "other" }, // 原初的勇猛
  { id: 36927, scope: "self" }, // 暗影卫
  { id: 3634, scope: "self" }, // 弃明投暗
  { id: 7393, scope: "single" }, // 至黑之夜
  { id: 25754, scope: "single" }, // 献奉
  { id: 36935, scope: "self" }, // 大星云
  { id: 16140, scope: "self" }, // 伪装
  { id: 25758, scope: "single" }, // 刚玉之心
  { id: 16151, scope: "single" }, // 极光
  { id: 3570, scope: "single" }, // 神名
  { id: 7432, scope: "single" }, // 神祝祷
  { id: 25861, scope: "single" }, // 水流幕
  { id: 16542, scope: "party" }, // 秘策
  { id: 3585, scope: "party" }, // 展开战术
  { id: 16538, scope: "party" }, // 异想的幻光
  { id: 188, scope: "party" }, // 野战治疗阵
  { id: 3583, scope: "party" }, // 不屈不挠之策
  { id: 7434, scope: "single" }, // 深谋远虑之策
  { id: 16545, scope: "party" }, // 炽天召唤
  { id: 25867, scope: "single" }, // 生命回生法
  { id: 37014, scope: "party" }, // 炽天附体
  { id: 3614, scope: "single" }, // 先天禀赋
  { id: 3613, scope: "party" }, // 命运之轮
  { id: 16553, scope: "party" }, // 天星冲日
  { id: 7439, scope: "party" }, // 地星
  { id: 16556, scope: "single" }, // 天星交错
  { id: 16557, scope: "party" }, // 天宫图
  { id: 16559, scope: "party" }, // 中间学派
  { id: 25873, scope: "single" }, // 擢升
  { id: 24298, scope: "party" }, // 坚角清汁
  { id: 24299, scope: "single" }, // 寄生清汁
  { id: 24303, scope: "single" }, // 白牛清汁
  { id: 24305, scope: "single" }, // 输血
  { id: 24311, scope: "party" }, // 泛输血
  { id: 24310, scope: "party" }, // 整体论
  { id: 24300, scope: "party" }, // 活化
  { id: 24318, scope: "party" }, // 魂灵风息
  { id: 37035, scope: "party" }, // 智慧之爱
  { id: 7394, scope: "self" }, // 金刚极意
  { id: 65, scope: "party" }, // 真言
  { id: 2241, scope: "self" }, // 残影
  { id: 36962, scope: "self" }, // 天眼通
  { id: 24404, scope: "self" }, // 神秘纹
  { id: 7408, scope: "party" }, // 大地神的抒情恋歌
  { id: 16015, scope: "party" }, // 治疗之华尔兹
  { id: 16014, scope: "party" }, // 即兴表演
  { id: 157, scope: "self" }, // 魔罩
  { id: 155, scope: "self" }, // 以太步
  { id: 25799, scope: "self" }, // 守护之光
  { id: 34685, scope: "party" }, // 坦培拉涂层
];

const keigennSkills: KeigennSkill[] = keigennSkillDefinitions
  .map((definition) => {
    const shared = getGlobalSkillDefinitionById(definition.id);
    const api = resolveBakedActionMeta(definition.id);

    if (!shared && !api) return undefined;

    const skill: KeigennSkill = {
      id: definition.id,
      recast1000ms: shared?.recast1000ms ?? (api ? Math.round(api.recast1000ms) : 0),
      job: [...(shared?.job?.length ? shared.job : (api?.jobs ?? []))],
      minLevel: shared?.minLevel ?? api?.classJobLevel ?? 1,
      scope: definition.scope,
      duration: shared?.duration ?? 0,
      maxCharges: shared?.maxCharges ?? api?.maxCharges ?? 1,
    };

    return skill;
  })
  .filter((skill): skill is KeigennSkill => Boolean(skill));

export { keigennSkills };
