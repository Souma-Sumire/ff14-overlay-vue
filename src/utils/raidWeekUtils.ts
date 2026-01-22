export function getRaidWeekStart(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const hour = d.getHours()
  let daysToSubtract = 0
  if (day === 2) {
    if (hour < 16) daysToSubtract = 7
    else daysToSubtract = 0
  } else if (day > 2) {
    daysToSubtract = day - 2
  } else {
    daysToSubtract = day + 5
  }
  const start = new Date(d)
  start.setDate(d.getDate() - daysToSubtract)
  start.setHours(16, 0, 0, 0)
  start.setMilliseconds(0)
  return start
}

export function getRaidWeekLabel(
  dateInput: Date | string,
  offset: number = 0,
): { label: string; start: Date; end: Date } {
  const date = new Date(dateInput)
  if (offset !== 0) {
    date.setDate(date.getDate() + offset * 7)
  }

  const start = getRaidWeekStart(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  end.setMilliseconds(-1)

  const fmt = (dt: Date) =>
    `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`

  return {
    label: `${fmt(start)} - ${fmt(end)}`,
    start,
    end,
  }
}

export function getWeekIndexFromStart(current: Date, start: Date): number {
  const diff = current.getTime() - start.getTime()
  // 1 week = 604800000 ms
  return Math.round(diff / 604800000) + 1
}

export function getCurrentWeekNumber(timestamps: (number | string | Date)[]): number {
  if (!timestamps || timestamps.length === 0) return 1
  const times = timestamps.map((t) => new Date(t).getTime())
  const firstTime = Math.min(...times)

  const zeroWeekStart = getRaidWeekStart(new Date(firstTime))
  const currentWeekStart = getRaidWeekStart(new Date())

  return getWeekIndexFromStart(currentWeekStart, zeroWeekStart)
}

export function getFormattedWeekLabel(
  weekRangeLabel: string,
  zeroWeekStart: Date | null,
): { label: string; index: number } {
  if (!zeroWeekStart) return { label: weekRangeLabel, index: 0 }

  const startStr = weekRangeLabel.split(' - ')[0]
  const currentStart = new Date(startStr + ' 16:00:00')

  const weekIndex = getWeekIndexFromStart(currentStart, zeroWeekStart)
  return {
    label: `第 ${weekIndex} 周 (${weekRangeLabel})`,
    index: weekIndex,
  }
}

export function getRaidWeekIndex(
  currentDate: Date | string | number,
  zeroWeekDate: Date | string | number,
): number {
  const currentStart = getRaidWeekStart(new Date(currentDate))
  const zeroStart = getRaidWeekStart(new Date(zeroWeekDate))
  return getWeekIndexFromStart(currentStart, zeroStart)
}
