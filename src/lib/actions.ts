import { addOneMonth, type FinanceData, type MoneyTransaction } from './finance'

function findById<T extends { id: string }>(items: T[], id: string, missingMessage: string): T {
  const item = items.find((candidate) => candidate.id === id)
  if (!item) throw new Error(missingMessage)
  return item
}

export function markBillPaid(data: FinanceData, billId: string, date: string, transactionId: string): FinanceData {
  const bill = findById(data.bills, billId, 'ไม่พบบิลที่เลือก')
  if (bill.paid) throw new Error('บิลนี้ชำระแล้ว')

  const transaction: MoneyTransaction = {
    id: transactionId,
    date,
    kind: 'expense',
    amount: bill.amount,
    category: 'ชำระบิล',
    note: bill.title,
    linkedType: 'bill',
    linkedId: bill.id,
  }

  return {
    ...data,
    transactions: [transaction, ...data.transactions],
    bills: data.bills.map((item) => item.id !== billId ? item : item.repeatMonthly
      ? { ...item, dueDate: addOneMonth(item.dueDate), paid: false }
      : { ...item, paid: true }),
  }
}

export function recordDebtPayment(data: FinanceData, debtId: string, amount: number, date: string, transactionId: string): FinanceData {
  const debt = findById(data.debts, debtId, 'ไม่พบรายการหนี้ที่เลือก')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('กรอกยอดชำระมากกว่า 0 บาท')
  if (amount > debt.balance) throw new Error('ยอดชำระต้องไม่เกินยอดหนี้คงเหลือ')

  const remainingBalance = debt.balance - amount
  const completedInstallment = amount >= debt.installment
  const transaction: MoneyTransaction = {
    id: transactionId,
    date,
    kind: 'expense',
    amount,
    category: 'ชำระหนี้',
    note: debt.title,
    linkedType: 'debt',
    linkedId: debt.id,
  }

  return {
    ...data,
    transactions: [transaction, ...data.transactions],
    debts: data.debts.map((item) => item.id !== debtId ? item : {
      ...item,
      balance: remainingBalance,
      dueDate: remainingBalance === 0 || completedInstallment ? addOneMonth(item.dueDate) : item.dueDate,
    }),
  }
}

export function moveGoalMoney(
  data: FinanceData,
  goalId: string,
  direction: 'in' | 'out',
  amount: number,
  date: string,
  movementId: string,
  note?: string,
): FinanceData {
  const goal = findById(data.goals, goalId, 'ไม่พบกระปุกที่เลือก')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('กรอกจำนวนเงินมากกว่า 0 บาท')
  if (direction === 'out' && amount > goal.balance) throw new Error('ถอนเงินได้ไม่เกินยอดในกระปุก')

  const balance = Math.max(0, goal.balance + (direction === 'in' ? amount : -amount))
  return {
    ...data,
    goals: data.goals.map((item) => item.id === goalId ? { ...item, balance } : item),
    goalMovements: [{ id: movementId, goalId, date, direction, amount, note }, ...data.goalMovements],
  }
}
