import { getActionChinese } from '@/resources/actionChinese'
import { chineseToIcon } from './chineseToIcon'
import { compareSame } from './compareSaveAction'
import { iconToSrc } from './iconToSrc'

function parseDynamicValue(value: string | number, level: number): number {
  if (typeof value === 'number') {
    return value
  }

  if (/^\d+$/.test(value)) {
    return Number.parseInt(value)
  }

  try {
    // eslint-disable-next-line no-eval
    const fn = eval(`(${value})`) as (level: number) => number

    if (typeof fn === 'function') {
      const result = fn(level)
      if (typeof result === 'number' && !Number.isNaN(result)) {
        return result
      }
    }

    throw new Error(`不是有效的数字，${value}`)
  }
  catch (e) {
    console.error(`解析函数失败: ${e}`)
    return 0
  }
}

function idToSrc(id: number | string) {
  if (typeof id === 'string') {
    id = parseDynamicValue(id, 999)
  }
  const chinese = getActionChinese(id) || getActionChinese(compareSame(id))
  if (!chinese) {
    // console.warn(`找不到动作中文: ${id}`)
    return ''
  }
  const icon = chineseToIcon(chinese)
  if (!icon) {
    // console.warn(`找不到动作图标: ${chinese}`)
    return ''
  }
  return iconToSrc(icon)
}
export { idToSrc, parseDynamicValue }
