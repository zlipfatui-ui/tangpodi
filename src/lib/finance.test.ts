import { describe, expect, it } from 'vitest'
import {
  calculateBudgetSummary,
  calculateElectricity,
  calculateWater,
  getBirthWeekday,
  getPeriodWindow,
  type FinanceData,
} from './finance'

const baseData: FinanceData = {
  settings: {
    monthlyIncome: 30000,
    fallbackBudget: 6000,
    weekStartsOn: 1,
    electricityRate: 4.5,
    waterRate: 18,
    waterServiceFee: 0,
    birthday: null,
    theme: 'light',
  },
  transactions: [],
  bills: [],
  debts: [],
  goals: [],
  events: [],
  goalMovements: [],
}

describe('getPeriodWindow', () => {
  it('clips a week crossing a month boundary to the selected month', () => {
    expect(getPeriodWindow('2026-10-01', 'week', 1)).toEqual({
      start: '2026-09-28',
      end: '2026-10-04',
      activeStart: '2026-10-01',
      activeEnd: '2026-10-04',
      activeDays: 4,
      monthDays: 31,
    })
  })

  it('returns the complete calendar month for monthly view', () => {
    expect(getPeriodWindow('2026-02-18', 'month', 1)).toMatchObject({
      start: '2026-02-01',
      end: '2026-02-28',
      activeStart: '2026-02-01',
      activeEnd: '2026-02-28',
      activeDays: 28,
      monthDays: 28,
    })
  })
})

describe('calculateBudgetSummary', () => {
  it('uses last month variable spending and adds this month commitments once', () => {
    const data: FinanceData = {
      ...baseData,
      transactions: [
        { id: 'last-food', date: '2026-09-04', kind: 'expense', amount: 10000, category: 'อาหาร' },
        { id: 'last-bill', date: '2026-09-08', kind: 'expense', amount: 2500, category: 'บิล', linkedType: 'bill', linkedId: 'rent' },
        { id: 'oct-food', date: '2026-10-02', kind: 'expense', amount: 1000, category: 'อาหาร' },
      ],
      bills: [{ id: 'rent', title: 'ค่าเช่า', amount: 2500, dueDate: '2026-10-10', repeatMonthly: true, paid: false }],
      debts: [{ id: 'card', title: 'บัตรเครดิต', balance: 8000, installment: 2000, dueDate: '2026-10-15' }],
      goals: [{ id: 'trip', title: 'เที่ยวทะเล', target: 12000, balance: 2000, monthlyPlan: 1000 }],
    }

    const summary = calculateBudgetSummary(data, '2026-10-18', 'month')

    expect(summary.baseline).toBe(10000)
    expect(summary.commitments).toBe(4500)
    expect(summary.plannedSavings).toBe(1000)
    expect(summary.required).toBe(15500)
    expect(summary.cashGap).toBe(0)
    expect(summary.monthlyAllowance).toBe(10000)
    expect(summary.periodSpent).toBe(1000)
    expect(summary.periodRemaining).toBe(9000)
  })

  it('uses the fallback budget and clearly marks missing history', () => {
    const summary = calculateBudgetSummary(baseData, '2026-10-18', 'month')

    expect(summary.hasHistory).toBe(false)
    expect(summary.baseline).toBe(6000)
    expect(summary.monthlyAllowance).toBe(6000)
  })

  it('does not count completed bill and debt payments a second time', () => {
    const data: FinanceData = {
      ...baseData,
      transactions: [
        { id: 'bill-paid', date: '2026-10-03', kind: 'expense', amount: 2300, category: 'บิล', linkedType: 'bill', linkedId: 'phone' },
        { id: 'debt-paid', date: '2026-10-04', kind: 'expense', amount: 1000, category: 'หนี้', linkedType: 'debt', linkedId: 'card' },
      ],
      bills: [{ id: 'phone', title: 'ค่าโทรศัพท์', amount: 2500, dueDate: '2026-11-03', repeatMonthly: true, paid: false }],
      debts: [{ id: 'card', title: 'บัตรเครดิต', balance: 7000, installment: 1000, dueDate: '2026-11-04' }],
    }

    expect(calculateBudgetSummary(data, '2026-10-18', 'month').commitments).toBe(3300)
  })

  it('keeps overspending visible as a negative remaining allowance', () => {
    const data: FinanceData = {
      ...baseData,
      settings: { ...baseData.settings, fallbackBudget: 3000 },
      transactions: [{ id: 'overspend', date: '2026-10-08', kind: 'expense', amount: 3400, category: 'ของใช้' }],
    }

    expect(calculateBudgetSummary(data, '2026-10-18', 'month').periodRemaining).toBe(-400)
  })
})

describe('utility estimates', () => {
  it('sums electricity estimates for multiple devices', () => {
    expect(calculateElectricity([
      { watts: 1000, hoursPerDay: 2, days: 30 },
      { watts: 100, hoursPerDay: 5, days: 30 },
    ], 4)).toBe(300)
  })

  it('calculates water usage and service fee', () => {
    expect(calculateWater(120, 128.5, 18, 25)).toBe(178)
  })
})

describe('birthday weekday', () => {
  it('finds the weekday from a date without timezone shifts', () => {
    expect(getBirthWeekday('1998-04-27')).toBe(1)
  })
})
