import chinese2IconRaw from '@/resources/chinese2Icon.json'
import { completeIcon } from '@/resources/status'

const chinese2Icon = chinese2IconRaw as Record<string, string>

const userAction = new Map(
  Object.entries({
    任务指令: '000123',
    冲刺: '000104',
    坐骑: '000118',
    攻击: '000101',
    腐秽大地: '003090',
  }),
)

export function chineseToIcon(chinese: string): string | undefined {
  const icon = Number(userAction.get(chinese) || chinese2Icon[chinese])
  if (Number.isNaN(icon)) {
    throw new TypeError(`icon for ${chinese} is not found`)
  }
  if (icon === 0) {
    return undefined
  }
  const complete = completeIcon(icon)
  return `/i/${complete}.png`
}
