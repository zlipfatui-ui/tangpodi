import { addDays, type GoalMovement } from './finance'

export interface SavingStreak {
  current: number
  best: number
  savedToday: boolean
  recentDays: Array<{ date: string; saved: boolean }>
}

/** วันที่มีการเติมเงินเข้ากระปุกนับเป็น 1 วัน; streak ยังไม่ขาดถ้าเพิ่งออมเมื่อวาน */
export function getSavingStreak(movements: GoalMovement[], today: string): SavingStreak {
  const days = new Set(movements.filter((movement) => movement.direction === 'in' && movement.date <= today).map((movement) => movement.date))
  const savedToday = days.has(today)
  let current = 0
  for (let cursor = savedToday ? today : addDays(today, -1); days.has(cursor); cursor = addDays(cursor, -1)) current += 1

  let best = 0
  let run = 0
  let previous = ''
  for (const day of [...days].sort()) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1
    best = Math.max(best, run)
    previous = day
  }

  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6)
    return { date, saved: days.has(date) }
  })
  return { current, best, savedToday, recentDays }
}
