import { addDays, type PeriodView } from './finance'

export function getTodayISO(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export function formatMoney(amount: number, compact = false): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
    notation: compact && Math.abs(amount) >= 100_000 ? 'compact' : 'standard',
  }).format(amount)
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('th-TH', options).format(new Date(year, month - 1, day, 12))
}

export function formatMonth(value: string): string {
  const [year, month] = value.slice(0, 7).split('-').map(Number)
  return new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 15))
}

export function shiftAnchor(value: string, view: PeriodView, direction: -1 | 1): string {
  if (view === 'day') return addDays(value, direction)
  if (view === 'week') return addDays(value, direction * 7)

  const [year, month, day] = value.split('-').map(Number)
  const nextMonthDate = new Date(Date.UTC(year, month - 1 + direction, 1))
  const lastDay = new Date(Date.UTC(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth() + 1, 0)).getUTCDate()
  nextMonthDate.setUTCDate(Math.min(day, lastDay))
  return nextMonthDate.toISOString().slice(0, 10)
}

export function getMonthGrid(anchor: string, weekStartsOn: number): Array<{ date: string; inMonth: boolean }> {
  const [year, month] = anchor.slice(0, 7).split('-').map(Number)
  const monthStartDate = new Date(Date.UTC(year, month - 1, 1))
  const monthEndDate = new Date(Date.UTC(year, month, 0))
  const firstOffset = (monthStartDate.getUTCDay() - weekStartsOn + 7) % 7
  const daysInMonth = monthEndDate.getUTCDate()
  const slots = Math.ceil((firstOffset + daysInMonth) / 7) * 7
  const firstCell = new Date(monthStartDate.getTime() - firstOffset * 86_400_000)

  return Array.from({ length: slots }, (_, index) => {
    const date = new Date(firstCell.getTime() + index * 86_400_000)
    const value = date.toISOString().slice(0, 10)
    return { date: value, inMonth: value.slice(0, 7) === anchor.slice(0, 7) }
  })
}

export function periodLabel(anchor: string, view: PeriodView, start: string, end: string): string {
  if (view === 'month') return formatMonth(anchor)
  if (view === 'day') return formatDate(anchor, { weekday: 'long', day: 'numeric', month: 'long' })
  const sameMonth = start.slice(0, 7) === end.slice(0, 7)
  return sameMonth
    ? `${formatDate(start, { day: 'numeric' })} – ${formatDate(end, { day: 'numeric', month: 'long', year: 'numeric' })}`
    : `${formatDate(start, { day: 'numeric', month: 'short' })} – ${formatDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}`
}
