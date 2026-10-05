import { addDays, calculateBudgetSummary, type FinanceData } from './finance'
import { getSavingStreak } from './streak'
import { formatMoney } from './presentation'

export interface PiggyHint {
  id: string
  text: string
  action?: { label: string; page: 'calendar' | 'goals' | 'ledger' }
}

/** คำทักของหมู: ข้อความเดียว เรียงตามความสำคัญ ข้อที่ปิดแล้วจะไม่แสดงอีก (id ผูกกับวัน/เดือน) */
export function getPiggyHint(data: FinanceData, today: string): PiggyHint | null {
  const piggy = data.piggy ?? { hintsEnabled: true, dismissed: {} }
  if (!piggy.hintsEnabled) return null
  const candidates: PiggyHint[] = []

  const due = [
    ...data.bills.filter((bill) => !bill.paid).map((bill) => ({ title: bill.title, date: bill.dueDate })),
    ...data.debts.filter((debt) => debt.balance > 0).map((debt) => ({ title: debt.title, date: debt.dueDate })),
  ].sort((a, b) => a.date.localeCompare(b.date))[0]
  if (due && due.date <= addDays(today, 3)) {
    candidates.push({
      id: `due-${due.title}-${due.date}`,
      text: due.date < today ? `${due.title} เลยกำหนดแล้วนะ ถ้าจ่ายแล้วอย่าลืมกดอัปเดต` : `${due.title} ใกล้ถึงกำหนดแล้ว เตรียมเงินไว้ก่อนนะ`,
      action: { label: 'เปิดปฏิทิน', page: 'calendar' },
    })
  }

  const streak = getSavingStreak(data.goalMovements, today)
  if (data.goals.length && !streak.savedToday) {
    candidates.push(streak.current >= 2
      ? { id: `streak-${today}`, text: `ออมต่อเนื่อง ${streak.current} วันแล้ว! วันนี้ออมอีกนิดเพื่อไม่ให้ streak ขาดนะ`, action: { label: 'ไปออมเงิน', page: 'goals' } }
      : { id: `start-streak-${today}`, text: 'วันนี้ยังไม่ได้ออม ลองเติมกระปุกสักนิดเพื่อเริ่ม streak กัน', action: { label: 'ไปออมเงิน', page: 'goals' } })
  }

  const month = calculateBudgetSummary(data, today, 'month')
  if (month.periodAllowance > 0 && month.periodRemaining >= 0 && month.periodRemaining < month.periodAllowance * 0.15) {
    candidates.push({ id: `budget-${today.slice(0, 7)}`, text: `งบเดือนนี้เหลือ ${formatMoney(month.periodRemaining)} แล้ว ใช้ระวังหน่อยนะ`, action: { label: 'ดูรายการ', page: 'ledger' } })
  }

  const reached = data.goals.find((goal) => goal.target > 0 && goal.balance >= goal.target)
  if (reached) candidates.push({ id: `goal-${reached.id}`, text: `กระปุก “${reached.title}” ถึงเป้าแล้ว เก่งมาก!`, action: { label: 'ดูกระปุก', page: 'goals' } })

  return candidates.find((hint) => !(hint.id in piggy.dismissed)) ?? null
}
