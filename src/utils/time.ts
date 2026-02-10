export function formatTime(seconds: number) {
  const isNegative = seconds < 0
  const totalSeconds = Math.floor(Math.abs(seconds))
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const ss = (totalSeconds % 60).toString().padStart(2, '0')
  return `${isNegative ? '-' : ''}${mm}:${ss}`
}

export function parseTimeText(value: string): number | null {
  const match = value.trim().match(/^(\d+):([0-5]\d)$/)
  if (!match)
    return null
  const mm = Number.parseInt(match[1]!, 10)
  const ss = Number.parseInt(match[2]!, 10)
  return mm * 60 + ss
}

export function formatTimeMs(ms: number) {
  const safeMs = Math.max(ms, 0)
  return formatTime(safeMs / 1000)
}

export function formatDateTime(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${date.getFullYear()}/${m}/${d} ${hh}:${mm}`
}
