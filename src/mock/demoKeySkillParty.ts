import type { Role } from 'cactbot/types/job'
import type { Ref } from 'vue'
import type { Party } from '../../cactbot/types/event'
import { ref } from 'vue'
import Util from '@/utils/util'

const fullParty: Party[] = [
  { id: '骑士ID', name: '虚构骑士', job: 19, inParty: true, level: 100 },
  { id: '武僧ID', name: '虚构武僧', job: 20, inParty: true, level: 100 },
  { id: '战士ID', name: '虚构战士', job: 21, inParty: true, level: 100 },
  { id: '龙骑ID', name: '虚构龙骑士', job: 22, inParty: true, level: 100 },
  { id: '诗人ID', name: '虚构吟游诗人', job: 23, inParty: true, level: 100 },
  { id: '白魔ID', name: '虚构白魔法师', job: 24, inParty: true, level: 100 },
  { id: '黑魔ID', name: '虚构黑魔法师', job: 25, inParty: true, level: 100 },
  { id: '召唤ID', name: '虚构召唤师', job: 27, inParty: true, level: 100 },
  { id: '学者ID', name: '虚构学者', job: 28, inParty: true, level: 100 },
  { id: '忍者ID', name: '虚构忍者', job: 30, inParty: true, level: 100 },
  { id: '机工ID', name: '虚构机工士', job: 31, inParty: true, level: 100 },
  { id: '暗骑ID', name: '虚构暗黑骑士', job: 32, inParty: true, level: 100 },
  { id: '占星ID', name: '虚构占星术士', job: 33, inParty: true, level: 100 },
  { id: '武士ID', name: '虚构武士', job: 34, inParty: true, level: 100 },
  { id: '赤魔ID', name: '虚构赤魔法师', job: 35, inParty: true, level: 100 },
  { id: '绝枪ID', name: '虚构绝枪战士', job: 37, inParty: true, level: 100 },
  { id: '舞者ID', name: '虚构舞者', job: 38, inParty: true, level: 100 },
  { id: '钐镰ID', name: '虚构钐镰客', job: 39, inParty: true, level: 100 },
  { id: '贤者ID', name: '虚构贤者', job: 40, inParty: true, level: 100 },
  { id: '蝰蛇ID', name: '虚构蝰蛇剑士', job: 41, inParty: true, level: 100 },
  { id: '画家ID', name: '虚构绘灵法师', job: 42, inParty: true, level: 100 },
]

const defaultRoleCount: Partial<Record<Role, number>> = {
  tank: 2,
  healer: 2,
  dps: 4,
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
  shuffle(roleCount: Partial<Record<Role, number>> = defaultRoleCount) {
    const count = { ...defaultRoleCount, ...roleCount }
    const shuffled = [...fullParty].sort(() => Math.random() - 0.5)
    const result: Party[] = []
    const size = Object.values(count).reduce((a, b) => a + b, 0)

    for (const member of shuffled) {
      const job = Util.jobEnumToJob(member.job)
      const role: Role = Util.jobToRole(job)
      const c = count[role] ?? 0
      if (c <= 0)
        continue
      count[role] = c - 1
      result.push(member)
      if (result.length >= size)
        break
    }
    this.party.value = result
  }
}

export { RandomPartyGenerator }
