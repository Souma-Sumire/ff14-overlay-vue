import type { Keigenn, Server } from '@/types/keigennRecord2'
import { chinese, global } from '../resources/keigenn'
import { completeIcon, statusData } from '../resources/status'

const keigennMap: Map<string, Keigenn> = new Map()

let loadedDataLang: Server = 'Chinese'

export function loadKeigenn(server: 'Chinese' | 'Global'): void {
  if (loadedDataLang !== server || keigennMap.size === 0) {
    keigennMap.clear()
    for (const keigenn of server === 'Chinese' ? chinese : global) {
      const icon = statusData[keigenn.id][1]
      keigenn.fullIcon = completeIcon(icon)
      keigennMap.set(
        keigenn.id.toString(16).toUpperCase().padStart(2, '0'),
        keigenn as Keigenn,
      )
    }
    loadedDataLang = server
  }
}

loadKeigenn('Chinese')

export function getKeigenn(decId: string): Keigenn | undefined {
  return keigennMap.get(decId)
}

export function multiplierEffect(multiplier: number) {
  if (multiplier === 1)
    return 'useful'
  if (multiplier === 0)
    return 'unuseful'
  return 'half-useful'
}

const regFriendly
  = /(?:耐性|防御力)(?:大幅)?(?:降低|提升|低下|下降)|受伤(?:加重|减轻)|体力(?:增加|衰减|减少)|伤害屏障/
const regEnemy = /(?:精神|力量|灵巧|智力){1,2}(?:大幅)?降低/

function createMap(regExp: RegExp, isFriendly: boolean) {
  return Object.entries(statusData).reduce((map, [key, [name, icon]]) => {
    if (regExp.test(name))
      map.set(key, { name, icon, isFriendly })

    return map
  }, new Map())
}

export const universalVulnerableFriendly = createMap(regFriendly, true)
export const universalVulnerableEnemy = createMap(regEnemy, false)
