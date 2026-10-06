import { describe, expect, it } from 'vitest'
import { calculateTax, type TaxInput } from './tax'

const base: TaxInput = { income: 0, spouse: false, children: 0, parents: 0, socialSecurity: 0, lifeInsurance: 0, funds: 0, withheld: 0 }

describe('thai personal income tax estimate', () => {
  it('is zero when net income is within the exempt bracket', () => {
    expect(calculateTax({ ...base, income: 300_000 }).tax).toBe(0)
  })

  it('walks the progressive brackets', () => {
    // 1,000,000 - 100,000 (ค่าใช้จ่าย) - 60,000 (ส่วนตัว) = 840,000 → 7,500 + 20,000 + 37,500 + 18,000
    const result = calculateTax({ ...base, income: 1_000_000 })
    expect(result.netIncome).toBe(840_000)
    expect(result.tax).toBe(83_000)
    expect(result.marginalRate).toBe(0.2)
  })

  it('applies allowances with their caps', () => {
    const result = calculateTax({ ...base, income: 600_000, spouse: true, children: 2, parents: 6, socialSecurity: 20_000, lifeInsurance: 150_000, funds: 200_000 })
    // 100,000 + 60,000 + 60,000 + 60,000 + 120,000 + 9,000 + 100,000 + 90,000 (15%)
    expect(result.allowances).toBe(60_000 + 60_000 + 60_000 + 120_000 + 9_000 + 100_000 + 90_000)
    expect(result.netIncome).toBe(Math.max(0, 600_000 - 100_000 - result.allowances))
  })

  it('reports refund when more was withheld than owed', () => {
    expect(calculateTax({ ...base, income: 1_000_000, withheld: 95_000 }).balance).toBe(-12_000)
  })
})
