import type { FinanceData } from './finance'
import { addOneMonth } from './finance'

export function addDefaultTheme(data: FinanceData): FinanceData {
  const themed = data.settings.theme === 'light' || data.settings.theme === 'dark'
    ? data
    : { ...data, settings: { ...data.settings, theme: 'light' as const } }
  if (themed.recurring && themed.piggy) return themed
  return { ...themed, recurring: themed.recurring ?? [], piggy: themed.piggy ?? { hintsEnabled: true, dismissed: {} } }
}

export function createEmptyFinanceData(): FinanceData {
  return {
    settings: {
      monthlyIncome: 0,
      fallbackBudget: 0,
      weekStartsOn: 1,
      electricityRate: 4.2,
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
    recurring: [],
    piggy: { hintsEnabled: true, dismissed: {} },
    isDemo: false,
  }
}

function dateWithDay(monthAnchor: string, day: number): string {
  const [year, month] = monthAnchor.slice(0, 7).split('-').map(Number)
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${monthAnchor.slice(0, 7)}-${String(Math.min(day, last)).padStart(2, '0')}`
}

export function createDemoFinanceData(today = new Date()): FinanceData {
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const thisMonth = `${todayIso.slice(0, 7)}-01`
  const [year, month] = thisMonth.slice(0, 7).split('-').map(Number)
  const previous = `${new Date(Date.UTC(year, month - 1, 0)).getUTCFullYear()}-${String(new Date(Date.UTC(year, month - 1, 0)).getUTCMonth() + 1).padStart(2, '0')}-01`
  const nextMonth = addOneMonth(thisMonth)
  const day = today.getDate()
  const dueSoon = day + 4 <= new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    ? dateWithDay(thisMonth, day + 4)
    : dateWithDay(nextMonth, 5)
  const debtDue = day + 2 <= new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    ? dateWithDay(thisMonth, day + 2)
    : dateWithDay(nextMonth, 7)
  const eventDate = dueSoon

  return {
    settings: {
      monthlyIncome: 42000,
      fallbackBudget: 10000,
      weekStartsOn: 1,
      electricityRate: 4.2,
      waterRate: 18,
      waterServiceFee: 25,
      birthday: '2001-07-12',
      theme: 'light',
    },
    transactions: [
      { id: 'demo-last-market', date: dateWithDay(previous, 4), kind: 'expense', amount: 8350, category: 'ของกินของใช้', note: 'ตลาดและซูเปอร์มาร์เก็ต' },
      { id: 'demo-last-trip', date: dateWithDay(previous, 12), kind: 'expense', amount: 2800, category: 'เดินทาง', note: 'รถไฟฟ้าและแท็กซี่' },
      { id: 'demo-last-coffee', date: dateWithDay(previous, 18), kind: 'expense', amount: 1650, category: 'กินข้างนอก', note: 'กาแฟและมื้อพิเศษ' },
      { id: 'demo-last-rent', date: dateWithDay(previous, 2), kind: 'expense', amount: 7800, category: 'ที่พัก', linkedType: 'bill', linkedId: 'demo-rent' },
      { id: 'demo-rent-paid', date: dateWithDay(thisMonth, 2), kind: 'expense', amount: 7800, category: 'ที่พัก', linkedType: 'bill', linkedId: 'demo-rent' },
      { id: 'demo-last-card', date: dateWithDay(previous, 15), kind: 'expense', amount: 1800, category: 'ชำระหนี้', linkedType: 'debt', linkedId: 'demo-card' },
      { id: 'demo-salary', date: dateWithDay(thisMonth, 1), kind: 'income', amount: 42000, category: 'เงินเดือน', note: 'เงินเดือนประจำ' },
      { id: 'demo-market', date: dateWithDay(thisMonth, Math.max(1, day - 3)), kind: 'expense', amount: 680, category: 'ของกินของใช้', note: 'ของเข้าบ้าน' },
      { id: 'demo-lunch', date: dateWithDay(thisMonth, Math.max(1, day - 1)), kind: 'expense', amount: 185, category: 'กินข้างนอก', note: 'ข้าวกลางวัน' },
      { id: 'demo-transit', date: todayIso, kind: 'expense', amount: 74, category: 'เดินทาง', note: 'รถไฟฟ้า' },
    ],
    bills: [
      { id: 'demo-rent', title: 'ค่าเช่าห้อง', amount: 7800, dueDate: dateWithDay(nextMonth, 2), repeatMonthly: true, paid: false },
      { id: 'demo-internet', title: 'ค่าอินเทอร์เน็ต', amount: 599, dueDate: dueSoon, repeatMonthly: true, paid: false },
      { id: 'demo-water', title: 'ค่าน้ำโดยประมาณ', amount: 180, dueDate: dateWithDay(nextMonth, 3), repeatMonthly: true, paid: false },
    ],
    debts: [
      { id: 'demo-card', title: 'บัตรเครดิต', balance: 12400, installment: 1800, dueDate: debtDue },
    ],
    goals: [
      { id: 'demo-trip-goal', title: 'ทริปทะเลกับเพื่อน', target: 20000, balance: 6400, monthlyPlan: 1500 },
      { id: 'demo-emergency', title: 'เงินสำรองใจเย็น', target: 50000, balance: 17800, monthlyPlan: 2000 },
    ],
    events: [
      { id: 'demo-event', title: 'วันเงินเข้า', date: eventDate, note: 'เช็กยอดแล้วแบ่งเข้ากระปุกได้เลย' },
    ],
    goalMovements: [
      { id: 'demo-goal-in-1', goalId: 'demo-trip-goal', date: dateWithDay(previous, 5), direction: 'in', amount: 3000, note: 'เริ่มเก็บทริปแรก' },
      { id: 'demo-goal-in-2', goalId: 'demo-trip-goal', date: dateWithDay(previous, 20), direction: 'in', amount: 3400, note: 'เติมกระปุก' },
    ],
    recurring: [],
    piggy: { hintsEnabled: true, dismissed: {} },
    isDemo: true,
  }
}
