export type PeriodView = 'day' | 'week' | 'month'
export type LinkedEntryType = 'bill' | 'debt'

export interface Settings {
  monthlyIncome: number
  fallbackBudget: number
  weekStartsOn: number
  electricityRate: number
  waterRate: number
  waterServiceFee: number
  birthday: string | null
  theme: 'light' | 'dark'
}

export interface MoneyTransaction {
  id: string
  date: string
  kind: 'income' | 'expense'
  amount: number
  category: string
  note?: string
  linkedType?: LinkedEntryType
  linkedId?: string
  slipRef?: string
  sharedEntryId?: string
}

export interface Bill {
  id: string
  title: string
  amount: number
  dueDate: string
  repeatMonthly: boolean
  paid: boolean
}

export interface Debt {
  id: string
  title: string
  balance: number
  installment: number
  dueDate: string
}

export interface SavingsGoal {
  id: string
  title: string
  target: number
  balance: number
  monthlyPlan: number
  archived?: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  note?: string
}

export interface GoalMovement {
  id: string
  goalId: string
  date: string
  direction: 'in' | 'out'
  amount: number
  note?: string
}

export interface RecurringItem {
  id: string
  title: string
  amount: number
  kind: 'income' | 'expense'
  category: string
  frequency: 'monthly' | 'weekly'
  startDate: string
  lastGenerated?: string
}

export interface PiggyState {
  hintsEnabled: boolean
  dismissed: Record<string, string>
}

export interface FinanceData {
  settings: Settings
  transactions: MoneyTransaction[]
  bills: Bill[]
  debts: Debt[]
  goals: SavingsGoal[]
  events: CalendarEvent[]
  goalMovements: GoalMovement[]
  recurring?: RecurringItem[]
  piggy?: PiggyState
  isDemo?: boolean
}

export interface PeriodWindow {
  start: string
  end: string
  activeStart: string
  activeEnd: string
  activeDays: number
  monthDays: number
}

export interface BudgetSummary extends PeriodWindow {
  baseline: number
  hasHistory: boolean
  commitments: number
  plannedSavings: number
  required: number
  cashGap: number
  monthlyAllowance: number
  periodSpent: number
  periodAllowance: number
  periodRemaining: number
}

export interface ElectricityDevice {
  watts: number
  hoursPerDay: number
  days: number
}

const dayMs = 86_400_000

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`)
  return date
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(value: string, days: number): string {
  return toISODate(new Date(parseDate(value).getTime() + days * dayMs))
}

function monthStart(value: string): string {
  return `${value.slice(0, 7)}-01`
}

function monthEnd(value: string): string {
  const [year, month] = value.slice(0, 7).split('-').map(Number)
  return toISODate(new Date(Date.UTC(year, month, 0)))
}

function daysBetween(start: string, end: string): number {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / dayMs) + 1
}

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

function isVariableExpense(transaction: MoneyTransaction): boolean {
  return transaction.kind === 'expense' && !transaction.linkedType
}

function amountOfLinked(
  transactions: MoneyTransaction[],
  type: LinkedEntryType,
  id: string,
  start: string,
  end: string,
): number {
  return transactions
    .filter((transaction) => transaction.linkedType === type && transaction.linkedId === id && inRange(transaction.date, start, end))
    .reduce((sum, transaction) => sum + transaction.amount, 0)
}

function calculateCommitments(data: FinanceData, start: string, end: string): number {
  const linkedPayments = data.transactions
    .filter((transaction) => transaction.kind === 'expense' && transaction.linkedType && inRange(transaction.date, start, end))
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  const dueBills = data.bills.reduce((sum, bill) => {
    if (!inRange(bill.dueDate, start, end) || bill.paid) return sum
    const paidThisMonth = amountOfLinked(data.transactions, 'bill', bill.id, start, end)
    return sum + (paidThisMonth > 0 ? 0 : bill.amount)
  }, 0)

  const remainingDebtInstallments = data.debts.reduce((sum, debt) => {
    if (!inRange(debt.dueDate, start, end) || debt.balance <= 0) return sum
    const paidThisMonth = amountOfLinked(data.transactions, 'debt', debt.id, start, end)
    return sum + Math.min(debt.balance, Math.max(0, debt.installment - paidThisMonth))
  }, 0)

  return linkedPayments + dueBills + remainingDebtInstallments
}

export function getPeriodWindow(anchor: string, view: PeriodView, weekStartsOn: number): PeriodWindow {
  const firstDay = monthStart(anchor)
  const lastDay = monthEnd(anchor)
  const monthDays = daysBetween(firstDay, lastDay)
  let start = anchor
  let end = anchor

  if (view === 'month') {
    start = firstDay
    end = lastDay
  } else if (view === 'week') {
    const weekday = parseDate(anchor).getUTCDay()
    const offset = (weekday - weekStartsOn + 7) % 7
    start = addDays(anchor, -offset)
    end = addDays(start, 6)
  }

  const activeStart = start < firstDay ? firstDay : start
  const activeEnd = end > lastDay ? lastDay : end

  return {
    start,
    end,
    activeStart,
    activeEnd,
    activeDays: daysBetween(activeStart, activeEnd),
    monthDays,
  }
}

export function calculateBudgetSummary(data: FinanceData, anchor: string, view: PeriodView): BudgetSummary {
  const currentMonthStart = monthStart(anchor)
  const currentMonthEnd = monthEnd(anchor)
  const priorMonthAnchor = addDays(currentMonthStart, -1)
  const priorMonthStart = monthStart(priorMonthAnchor)
  const priorMonthEnd = monthEnd(priorMonthAnchor)
  const priorExpenses = data.transactions.filter((transaction) => transaction.kind === 'expense' && inRange(transaction.date, priorMonthStart, priorMonthEnd))
  const hasHistory = priorExpenses.length > 0
  const historicalVariableSpending = priorExpenses
    .filter(isVariableExpense)
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const baseline = hasHistory ? historicalVariableSpending : data.settings.fallbackBudget
  const commitments = calculateCommitments(data, currentMonthStart, currentMonthEnd)
  const plannedSavings = data.goals
    .filter((goal) => !goal.archived)
    .reduce((sum, goal) => sum + goal.monthlyPlan, 0)
  const required = baseline + commitments + plannedSavings
  const cashGap = Math.max(0, required - data.settings.monthlyIncome)
  const monthlyAllowance = Math.min(
    baseline,
    Math.max(0, data.settings.monthlyIncome - commitments - plannedSavings),
  )
  const window = getPeriodWindow(anchor, view, data.settings.weekStartsOn)
  const periodSpent = data.transactions
    .filter((transaction) => isVariableExpense(transaction) && inRange(transaction.date, window.activeStart, window.activeEnd))
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const periodAllowance = monthlyAllowance * window.activeDays / window.monthDays

  return {
    ...window,
    baseline,
    hasHistory,
    commitments,
    plannedSavings,
    required,
    cashGap,
    monthlyAllowance,
    periodSpent,
    periodAllowance,
    periodRemaining: periodAllowance - periodSpent,
  }
}

export function calculateElectricity(devices: ElectricityDevice[], ratePerKwh: number): number {
  return devices.reduce((sum, device) => {
    const usageKwh = Math.max(0, device.watts) * Math.max(0, device.hoursPerDay) * Math.max(0, device.days) / 1000
    return sum + usageKwh * Math.max(0, ratePerKwh)
  }, 0)
}

export function calculateWater(previousMeter: number, currentMeter: number, ratePerCubicMeter: number, serviceFee: number): number {
  const usage = Math.max(0, currentMeter - previousMeter)
  return usage * Math.max(0, ratePerCubicMeter) + Math.max(0, serviceFee)
}

export function getBirthWeekday(birthday: string): number {
  return parseDate(birthday).getUTCDay()
}

export function addOneMonth(value: string): string {
  const date = parseDate(value)
  const originalDay = date.getUTCDate()
  const nextMonthLastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 2, 0)).getUTCDate()
  date.setUTCMonth(date.getUTCMonth() + 1, Math.min(originalDay, nextMonthLastDay))
  return toISODate(date)
}
