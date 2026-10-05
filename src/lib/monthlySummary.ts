import type { FinanceData } from './finance'

export interface CategoryChange {
  category: string
  current: number
  previous: number
  change: number
}

export interface MonthlySummary {
  month: string
  spent: number
  previousSpent: number
  income: number
  saved: number
  topChanges: CategoryChange[]
  hasPrevious: boolean
}

function previousMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year!, m! - 2, 1))
  return date.toISOString().slice(0, 7)
}

function totals(data: FinanceData, month: string) {
  const byCategory = new Map<string, number>()
  let income = 0
  for (const transaction of data.transactions) {
    if (!transaction.date.startsWith(month)) continue
    if (transaction.kind === 'income') income += transaction.amount
    else byCategory.set(transaction.category, (byCategory.get(transaction.category) ?? 0) + transaction.amount)
  }
  return { byCategory, income, spent: [...byCategory.values()].reduce((sum, value) => sum + value, 0) }
}

/** เปรียบเทียบเดือน `month` (YYYY-MM) กับเดือนก่อนหน้า ใช้เฉพาะข้อมูลที่บันทึกจริง */
export function getMonthlySummary(data: FinanceData, month: string): MonthlySummary {
  const current = totals(data, month)
  const before = totals(data, previousMonth(month))
  const categories = new Set([...current.byCategory.keys(), ...before.byCategory.keys()])
  const topChanges = [...categories]
    .map((category) => {
      const now = current.byCategory.get(category) ?? 0
      const prev = before.byCategory.get(category) ?? 0
      return { category, current: now, previous: prev, change: now - prev }
    })
    .filter((item) => item.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 3)
  const saved = data.goalMovements
    .filter((movement) => movement.date.startsWith(month))
    .reduce((sum, movement) => sum + (movement.direction === 'in' ? movement.amount : -movement.amount), 0)
  return { month, spent: current.spent, previousSpent: before.spent, income: current.income, saved, topChanges, hasPrevious: before.spent > 0 }
}

