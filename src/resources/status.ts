import STATUS from './status.json'

const _STATUS = STATUS as unknown as Record<string, [string, number, number]>

for (const key in STATUS) {
  const element = STATUS[key as keyof typeof STATUS]
  _STATUS[key] = [element[0], Number.parseInt(element[1]), Number.parseInt(element[2])]
}

export function completeIcon(icon: number): string {
  if (typeof icon === 'number') {
    let head = [...'000000']
    const iconStr = icon.toString()
    if (iconStr.length > 3) {
      const temp = [...iconStr].slice(0, iconStr.length - 3).concat(...'000')
      head = [...head.slice(0, 6 - temp.length), ...temp]
    }
    let foot = [...'000000']
    foot = [...foot.slice(0, 6 - iconStr.length), ...iconStr]
    return `${head.join('')}/${foot.join('')}`
  }
  throw new Error('icon is not a number')
}

export function stackUrl(url: string, stack: number) {
  return stack > 1 && stack <= 16
    ? url.substring(0, 7)
    + (
      Array.from({ length: 6 }).join('0')
      + (Number.parseInt(url.substring(7)) + stack - 1)
    ).slice(-6)
    : url
}
// A: =B5&": ["""&C5&""", "&E5&"],"
export const statusData: Record<number, [string, number, number]> = _STATUS
