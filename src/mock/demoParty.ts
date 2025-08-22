import type { Role } from 'cactbot/types/job'
import type { Ref } from 'vue'
import type { Party } from '../../cactbot/types/event'
import { ref } from 'vue'
import Util from '@/utils/util'

const fullParty: Party[] = [
  { id: '冒险者ID', name: '冒险者', job: 0, inParty: true, level: 100 }, // NONE
  { id: '剑术ID', name: '剑术', job: 1, inParty: true, level: 100 }, // Gladiator
  { id: '格斗ID', name: '格斗', job: 2, inParty: true, level: 100 }, // Pugilist
  { id: '斧术ID', name: '斧术', job: 3, inParty: true, level: 100 }, // Marauder
  { id: '枪术ID', name: '枪术', job: 4, inParty: true, level: 100 }, // Lancer
  { id: '弓箭ID', name: '弓箭', job: 5, inParty: true, level: 100 }, // Archer
  { id: '幻术ID', name: '幻术', job: 6, inParty: true, level: 100 }, // Conjurer
  { id: '咒术ID', name: '咒术', job: 7, inParty: true, level: 100 }, // Thaumaturge
  { id: '刻木ID', name: '刻木', job: 8, inParty: true, level: 100 }, // Carpenter
  { id: '锻铁ID', name: '锻铁', job: 9, inParty: true, level: 100 }, // Blacksmith
  { id: '铸甲ID', name: '铸甲', job: 10, inParty: true, level: 100 }, // Armorer
  { id: '雕金ID', name: '雕金', job: 11, inParty: true, level: 100 }, // Goldsmith
  { id: '制革ID', name: '制革', job: 12, inParty: true, level: 100 }, // Leatherworker
  { id: '裁衣ID', name: '裁衣', job: 13, inParty: true, level: 100 }, // Weaver
  { id: '炼金ID', name: '炼金', job: 14, inParty: true, level: 100 }, // Alchemist
  { id: '烹调ID', name: '烹调', job: 15, inParty: true, level: 100 }, // Culinarian
  { id: '采矿ID', name: '采矿', job: 16, inParty: true, level: 100 }, // Miner
  { id: '园艺ID', name: '园艺', job: 17, inParty: true, level: 100 }, // Botanist
  { id: '捕鱼ID', name: '捕鱼', job: 18, inParty: true, level: 100 }, // Fisher
  { id: '秘术ID', name: '秘术', job: 26, inParty: true, level: 100 }, // Arcanist
  { id: '双剑ID', name: '双剑', job: 29, inParty: true, level: 100 }, // Rogue
  { id: '青魔ID', name: '青魔', job: 36, inParty: true, level: 100 }, // BlueMage
  { id: '骑士ID', name: '骑士', job: 19, inParty: true, level: 100 },
  { id: '武僧ID', name: '武僧', job: 20, inParty: true, level: 100 },
  { id: '战士ID', name: '战士', job: 21, inParty: true, level: 100 },
  { id: '龙骑ID', name: '龙骑', job: 22, inParty: true, level: 100 },
  { id: '诗人ID', name: '诗人', job: 23, inParty: true, level: 100 },
  { id: '白魔ID', name: '白魔', job: 24, inParty: true, level: 100 },
  { id: '黑魔ID', name: '黑魔', job: 25, inParty: true, level: 100 },
  { id: '召唤ID', name: '召唤', job: 27, inParty: true, level: 100 },
  { id: '学者ID', name: '学者', job: 28, inParty: true, level: 100 },
  { id: '忍者ID', name: '忍者', job: 30, inParty: true, level: 100 },
  { id: '机工ID', name: '机工', job: 31, inParty: true, level: 100 },
  { id: '暗骑ID', name: '暗骑', job: 32, inParty: true, level: 100 },
  { id: '占星ID', name: '占星', job: 33, inParty: true, level: 100 },
  { id: '武士ID', name: '武士', job: 34, inParty: true, level: 100 },
  { id: '赤魔ID', name: '赤魔', job: 35, inParty: true, level: 100 },
  { id: '绝枪ID', name: '绝枪', job: 37, inParty: true, level: 100 },
  { id: '舞者ID', name: '舞者', job: 38, inParty: true, level: 100 },
  { id: '钐镰ID', name: '钐镰', job: 39, inParty: true, level: 100 },
  { id: '贤者ID', name: '贤者', job: 40, inParty: true, level: 100 },
  { id: '蝰蛇ID', name: '蝰蛇', job: 41, inParty: true, level: 100 },
  { id: '画家ID', name: '绘灵', job: 42, inParty: true, level: 100 },
] as const

const defaultRoleCount: Partial<Record<Role, number>> = {
  dps: 4,
  healer: 2,
  tank: 2,
  crafter: 0,
  gatherer: 0,
  none: 0,
}

class RandomPartyGenerator {
  readonly party: Ref<Party[]>

  constructor() {
    this.party = ref<Party[]>([])
    this.shuffle() // 初始化一次
  }

  fullPary() {
    this.party.value = fullParty.slice()
  }

  /**
   * 随机生成新队伍
   * @param roleCount 队伍构成，默认tank:2, healer:2, dps:4
   */
  shuffle(
    roleCount: Partial<Record<Role, number>> = defaultRoleCount,
    options: { includeBaseJob?: boolean } = { includeBaseJob: false },
  ) {
    const count = { ...defaultRoleCount, ...roleCount }
    const result: Party[] = []
    const usedParty = fullParty.filter((member) => {
      if (options.includeBaseJob) {
        return true
      }
      const job = Util.jobEnumToJob(member.job)
      return Util.isBaseJob(job) === false
    })

    for (const [role, total] of Object.entries(count) as [Role, number][]) {
      const candidates = usedParty.filter((member) => {
        const job = Util.jobEnumToJob(member.job)
        return Util.jobToRole(job) === role
      })

      if (candidates.length === 0) continue

      for (let i = 0; i < total; i++) {
        const random = pickRandom(candidates)
        result.push({ ...random })
      }
    }

    this.party.value = result.map((member) => {
      const randomNum = crypto.getRandomValues(new Uint32Array(1))[0]!
      const randomId = randomNum.toString(16).toUpperCase()
      const randomName = `${member.name}#${Number(randomNum.toString().slice(0 - Math.floor(Math.random() * 4)))}`
      return { ...member, id: randomId, name: randomName }
    })
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T
}

export { RandomPartyGenerator }
