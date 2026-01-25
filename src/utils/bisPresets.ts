import type { BisValue } from './bisUtils'
import { getRoleType } from './lootParser'

export interface BisPreset {
  name: string
  roleType: 'tank' | 'healer' | 'dps'
  config: Record<string, BisValue>
}

// 在配装器界面运行以下JS即刻提取对应格式Object
// javascript:(function(){const slotMap={"武器":"weapon","头部":"head","身体":"body","手部":"hands","腿部":"legs","脚部":"feet","耳饰":"earring","项链":"necklace","手镯":"bracelet","戒指":"ring"};const jobName=document.querySelector(".condition_job-name")?.innerText.trim()||document.querySelector(".gears_job-name")?.innerText.trim()||document.querySelector(".mdc-top-app-bar__title")?.innerText.trim()||"未知职业";const getRoleType=(j)=>{if(/战士|绝枪战士|暗黑骑士|骑士/.test(j))return"tank";if(/白魔法师|占星术士|学者|贤者/.test(j))return"healer";return"dps"};const config={};const rows=document.querySelectorAll("tr.gears_item:not(.-food)");rows.forEach(tr=>{const slotText=tr.querySelector(".gears_inline-slot")?.innerText.trim();const nameText=tr.querySelector(".gears_name")?.innerText.trim();const id=slotMap[slotText];if(id&&nameText){const type=nameText.includes("零式")?"raid":"tome";if(id==="ring"&&config[id]==="raid")return;config[id]=type}});config.twine=1;config.coating=1;config.tome=config.weapon==="tome"?1:0;config.solvent=config.weapon==="tome"?1:0;const preset={name:"孤风行 - "+jobName,roleType:getRoleType(jobName),config:config};const json=JSON.stringify(preset,null,2).replace(/"(\w+)":/g,"$1:");function copy(text){const t=document.createElement("textarea");t.value=text;document.body.appendChild(t);t.select();try{document.execCommand("copy");alert("提取成功！\n职业："+jobName)}catch(e){prompt("请手动复制：",text)}document.body.removeChild(t)}copy(json)})();
export const BIS_PRESETS: BisPreset[] = [
  {
    name: '孤风行 - 坦克通用',
    roleType: 'tank',
    config: {
      weapon: 'raid',
      head: 'raid',
      body: 'tome',
      hands: 'raid',
      legs: 'raid',
      feet: 'tome',
      earring: 'raid',
      necklace: 'tome',
      bracelet: 'tome',
      ring: 'raid',
      twine: 1,
      coating: 1,
      tome: 0,
      solvent: 0,
    },
  },
  {
    name: '孤风行 - 白贤2.42',
    roleType: 'healer',
    config: {
      weapon: 'raid',
      head: 'raid',
      body: 'tome',
      hands: 'raid',
      legs: 'raid',
      feet: 'raid',
      earring: 'tome',
      necklace: 'raid',
      bracelet: 'tome',
      ring: 'tome',
      twine: 1,
      coating: 1,
      tome: 0,
      solvent: 0,
    },
  },
  {
    name: '孤风行 - 白贤2.43',
    roleType: 'healer',
    config: {
      weapon: 'raid',
      head: 'raid',
      body: 'tome',
      hands: 'tome',
      legs: 'raid',
      feet: 'raid',
      earring: 'raid',
      necklace: 'raid',
      bracelet: 'tome',
      ring: 'tome',
      twine: 1,
      coating: 1,
      tome: 0,
      solvent: 0,
    },
  },
  {
    name: '孤风行 - 4奶通用',
    roleType: 'healer',
    config: {
      weapon: 'raid',
      head: 'raid',
      body: 'tome',
      hands: 'raid',
      legs: 'raid',
      feet: 'raid',
      earring: 'raid',
      necklace: 'raid',
      bracelet: 'tome',
      ring: 'tome',
      twine: 1,
      coating: 1,
      tome: 0,
      solvent: 0,
    },
  },
  {
    name: '孤风行 - 学者2.31',
    roleType: 'healer',
    config: {
      weapon: 'raid',
      head: 'raid',
      body: 'tome',
      hands: 'raid',
      legs: 'raid',
      feet: 'raid',
      earring: 'raid',
      necklace: 'raid',
      bracelet: 'tome',
      ring: 'tome',
      twine: 1,
      coating: 1,
      tome: 0,
      solvent: 0,
    },
  },
]

export function getPresetsForRole(
  role: string | null | undefined,
): BisPreset[] {
  const roleType = getRoleType(role).replace('role-', '') as
    | 'tank'
    | 'healer'
    | 'dps'
  return BIS_PRESETS.filter((p) => p.roleType === roleType)
}
