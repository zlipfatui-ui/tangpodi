import { describe, expect, it } from 'vitest'
import { getMonthlySummary } from './monthlySummary'
import { createEmptyFinanceData } from './data'
import type { MoneyTransaction } from './finance'

const tx = (id: string, date: string, amount: number, category: string, kind: 'income' | 'expense' = 'expense'): MoneyTransaction => ({ id, date, amount, category, kind })

describe('getMonthlySummary', () => {
  it('ranks category changes against the previous month, across a year boundary', () => {
    const data = { ...createEmptyFinanceData(), transactions: [
      tx('1', '2026-12-05', 1000, 'กาแฟ'), tx('2', '2027-01-05', 1800, 'กาแฟ'),
      tx('3', '2026-12-06', 500, 'เดินทาง'), tx('4', '2027-01-06', 400, 'เดินทาง'),
      tx('5', '2027-01-01', 30000, 'เงินเดือน', 'income'),
    ] }
    const summary = getMonthlySummary(data, '2027-01')
    expect(summary).toMatchObject({ spent: 2200, previousSpent: 1500, income: 30000, hasPrevious: true })
    expect(summary.topChanges[0]).toMatchObject({ category: 'กาแฟ', change: 800 })
  })

  it('reports no comparison when the previous month is empty', () => {
    expect(getMonthlySummary(createEmptyFinanceData(), '2026-10').hasPrevious).toBe(false)
  })
})
