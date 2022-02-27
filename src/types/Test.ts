enum skillEnum {
  地星 = "地星",
  天宫图 = "天宫图",
//   死斗 = "死斗",
}

const skillName: Record<skillEnum, string> = {
  [skillEnum.地星]: "地星",
  [skillEnum.天宫图]: "天宫图",
};

const skillRecastMs: Record<skillEnum, number> = {
  [skillEnum.地星]: 6000,
  [skillEnum.天宫图]: 6000,
};