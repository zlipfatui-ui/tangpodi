import { describe, expect, it } from 'vitest'
import { getPiggyHint } from './piggyHints'
import { createEmptyFinanceData } from './data'

const today = '2026-10-06'
const base = () => ({ ...createEmptyFinanceData(), goals: [{ id: 'g', title: 'ทริป', target: 1000, balance: 100, monthlyPlan: 0 }] })

describe('getPiggyHint', () => {
  it('nudges a streak that is about to break', () => {
    const data = { ...base(), goalMovements: [
      { id: 'a', goalId: 'g', date: '2026-10-04', direction: 'in' as const, amount: 50 },
      { id: 'b', goalId: 'g', date: '2026-10-05', direction: 'in' as const, amount: 50 },
    ] }
    expect(getPiggyHint(data, today)?.text).toContain('2 วัน')
  })

  it('puts a due bill ahead of the streak nudge', () => {
    const data = { ...base(), bills: [{ id: 'b', title: 'ค่าเน็ต', amount: 599, dueDate: today, repeatMonthly: true, paid: false }] }
    expect(getPiggyHint(data, today)?.text).toContain('ค่าเน็ต')
  })

  it('stays quiet once dismissed or when hints are off', () => {
    const data = base()
    const hint = getPiggyHint(data, today)!
    expect(getPiggyHint({ ...data, piggy: { hintsEnabled: true, dismissed: { [hint.id]: today } } }, today)).toBeNull()
    expect(getPiggyHint({ ...data, piggy: { hintsEnabled: false, dismissed: {} } }, today)).toBeNull()
  })
})
