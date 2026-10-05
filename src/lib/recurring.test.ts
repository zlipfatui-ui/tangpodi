import { describe, expect, it } from 'vitest'
import { applyRecurring } from './recurring'
import { createEmptyFinanceData } from './data'
import type { RecurringItem } from './finance'

const net: RecurringItem = { id: 'net', title: 'เน็ต', amount: 599, kind: 'expense', category: 'ค่าบริการ', frequency: 'monthly', startDate: '2026-08-31' }
const withItem = (item: RecurringItem) => ({ ...createEmptyFinanceData(), recurring: [item] })

describe('applyRecurring', () => {
  it('backfills every due month once, clamping month ends', () => {
    const result = applyRecurring(withItem(net), '2026-10-06')
    expect(result.transactions.map((t) => t.date).sort()).toEqual(['2026-08-31', '2026-09-30'])
    expect(result.recurring?.[0]?.lastGenerated).toBe('2026-09-30')
  })

  it('is idempotent', () => {
    const once = applyRecurring(withItem(net), '2026-10-06')
    expect(applyRecurring(once, '2026-10-06')).toBe(once)
  })

  it('creates nothing before the start date and supports weekly items', () => {
    expect(applyRecurring(withItem({ ...net, startDate: '2026-11-01' }), '2026-10-06').transactions).toHaveLength(0)
    const weekly = applyRecurring(withItem({ ...net, frequency: 'weekly', startDate: '2026-09-22' }), '2026-10-06')
    expect(weekly.transactions.map((t) => t.date).sort()).toEqual(['2026-09-22', '2026-09-29', '2026-10-06'])
  })
})
