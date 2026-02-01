import { getActionChinese } from '@/resources/actionChinese'
import { chineseToIcon } from './chineseToIcon'
import { compareSame } from './compareSaveAction'
import { iconToSrc } from './iconToSrc'

function parseDynamicValue(value: string | number, level: number): number {
  if (typeof value === 'number')
    return value

  const numericAttempt = Number(value)
  if (!Number.isNaN(numericAttempt))
    return numericAttempt

  try {
    if (!/^[\s\w=>()*+\-/.,:;<?@[\]^{}!]+$/.test(value)) {
      throw new Error('函数表达式中的字符无效')
    }

    // eslint-disable-next-line no-new-func
    const fn = new Function('level', `return (${value})(level)`) as (
      level: number,
    ) => number
    const result = fn(level)

    if (typeof result !== 'number' || Number.isNaN(result)) {
      throw new TypeError(`Function returned non-number: ${result}`)
    }

    return result
  }
  catch (e) {
    console.error(`解析动态值无法处理值 "${value}":`, e)
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
    // console.warn(`找不到动作图标: ${chinese}, icon: ${icon}`)
    return ''
  }
  return iconToSrc(icon)
}
export { idToSrc, parseDynamicValue }
