import { describe, expect, it } from 'vitest'
import { getSavingStreak } from './streak'
import type { GoalMovement } from './finance'

const deposit = (date: string, direction: 'in' | 'out' = 'in'): GoalMovement => ({ id: `${direction}-${date}`, goalId: 'g', date, direction, amount: 100 })

describe('getSavingStreak', () => {
  it('counts consecutive days ending today', () => {
    const result = getSavingStreak([deposit('2026-10-04'), deposit('2026-10-05'), deposit('2026-10-06')], '2026-10-06')
    expect(result).toMatchObject({ current: 3, best: 3, savedToday: true })
  })

  it('keeps the streak alive when the last deposit was yesterday', () => {
    const result = getSavingStreak([deposit('2026-10-04'), deposit('2026-10-05')], '2026-10-06')
    expect(result).toMatchObject({ current: 2, savedToday: false })
  })

  it('resets after a missed day but remembers the best run', () => {
    const result = getSavingStreak([deposit('2026-10-01'), deposit('2026-10-02'), deposit('2026-10-03'), deposit('2026-10-06')], '2026-10-06')
    expect(result).toMatchObject({ current: 1, best: 3 })
    expect(getSavingStreak([deposit('2026-10-01')], '2026-10-06').current).toBe(0)
  })

  it('ignores withdrawals and counts a day once, across month ends', () => {
    const result = getSavingStreak([deposit('2026-09-30'), deposit('2026-09-30'), deposit('2026-10-01'), deposit('2026-10-01', 'out')], '2026-10-01')
    expect(result.current).toBe(2)
    expect(result.recentDays).toHaveLength(7)
    expect(result.recentDays[6]).toEqual({ date: '2026-10-01', saved: true })
  })
})
