import { describe, expect, it } from 'vitest'
import { markBillPaid, moveGoalMoney, recordDebtPayment } from './actions'
import type { FinanceData } from './finance'

const empty: FinanceData = {
  settings: { monthlyIncome: 0, fallbackBudget: 0, weekStartsOn: 1, electricityRate: 4, waterRate: 18, waterServiceFee: 0, birthday: null, theme: 'light' },
  transactions: [],
  bills: [{ id: 'internet', title: 'อินเทอร์เน็ต', amount: 600, dueDate: '2026-10-20', repeatMonthly: true, paid: false }],
  debts: [{ id: 'card', title: 'บัตรเครดิต', balance: 2000, installment: 500, dueDate: '2026-10-20' }],
  goals: [{ id: 'trip', title: 'เที่ยวทะเล', target: 5000, balance: 1000, monthlyPlan: 250 }],
  events: [],
  goalMovements: [],
}

describe('linked money actions', () => {
  it('marks a recurring bill paid and schedules the next month', () => {
    const result = markBillPaid(empty, 'internet', '2026-10-18', 'bill-payment')

    expect(result.bills[0]).toMatchObject({ dueDate: '2026-11-20', paid: false })
    expect(result.transactions[0]).toMatchObject({ kind: 'expense', amount: 600, linkedType: 'bill', linkedId: 'internet' })
  })

  it('reduces outstanding debt and advances the due date after a full installment', () => {
    const result = recordDebtPayment(empty, 'card', 500, '2026-10-18', 'debt-payment')

    expect(result.debts[0]).toMatchObject({ balance: 1500, dueDate: '2026-11-20' })
    expect(result.transactions[0]).toMatchObject({ kind: 'expense', amount: 500, linkedType: 'debt', linkedId: 'card' })
  })

  it('rejects debt payments above the remaining balance', () => {
    expect(() => recordDebtPayment(empty, 'card', 2500, '2026-10-18', 'debt-payment')).toThrow('ยอดชำระต้องไม่เกินยอดหนี้คงเหลือ')
  })

  it('tracks deposits and withdrawals in a goal without adding expenses', () => {
    const deposited = moveGoalMoney(empty, 'trip', 'in', 500, '2026-10-18', 'movement-in')
    const withdrawn = moveGoalMoney(deposited, 'trip', 'out', 200, '2026-10-19', 'movement-out')

    expect(withdrawn.goals[0].balance).toBe(1300)
    expect(withdrawn.goalMovements.map(({ direction, amount }) => [direction, amount])).toEqual([['out', 200], ['in', 500]])
    expect(withdrawn.transactions).toEqual([])
  })
})
