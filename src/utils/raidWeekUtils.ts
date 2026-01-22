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

export function getFormattedWeekLabel(
  weekRangeLabel: string,
  zeroWeekStart: Date | null,
): { label: string; index: number } {
  if (!zeroWeekStart) return { label: weekRangeLabel, index: 0 }

  const startStr = weekRangeLabel.split(' - ')[0]
  const currentStart = new Date(startStr + ' 16:00:00')

  const diff = currentStart.getTime() - zeroWeekStart.getTime()
  // 1 week = 604800000 ms
  const weekIndex = Math.round(diff / 604800000) + 1
  return {
    label: `第 ${weekIndex} 周 (${weekRangeLabel})`,
    index: weekIndex,
  }
}
