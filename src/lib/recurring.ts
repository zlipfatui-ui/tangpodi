import { addDays, addOneMonth, type FinanceData, type MoneyTransaction, type RecurringItem } from './finance'

function nextDue(item: RecurringItem): string {
  if (!item.lastGenerated) return item.startDate
  if (item.frequency === 'weekly') return addDays(item.lastGenerated, 7)
  // ยึดวันที่ตั้งต้น (เช่น 31) ไม่ให้เลื่อนเป็น 30 ถาวรหลังเดือนสั้น
  const [year, month] = addOneMonth(`${item.lastGenerated.slice(0, 7)}-01`).split('-').map(Number)
  const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate()
  const day = Math.min(Number(item.startDate.slice(8, 10)), lastDay)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** สร้างรายการประจำที่ถึงกำหนดจนถึงวันนี้ ไม่สร้างซ้ำ (id ผูกกับรายการ+วันที่) */
export function applyRecurring(data: FinanceData, today: string): FinanceData {
  const items = data.recurring ?? []
  if (!items.length) return data
  const existing = new Set(data.transactions.map((transaction) => transaction.id))
  const created: MoneyTransaction[] = []
  const nextItems = items.map((item) => {
    let cursor = item
    for (let guard = 0; guard < 400 && nextDue(cursor) <= today; guard += 1) {
      const date = nextDue(cursor)
      const id = `rec-${item.id}-${date}`
      if (!existing.has(id)) {
        existing.add(id)
        created.push({ id, date, kind: item.kind, amount: item.amount, category: item.category, note: `${item.title} (ประจำ)` })
      }
      cursor = { ...cursor, lastGenerated: date }
    }
    return cursor
  })
  if (!created.length) return data
  return { ...data, transactions: [...created.reverse(), ...data.transactions], recurring: nextItems }
}
