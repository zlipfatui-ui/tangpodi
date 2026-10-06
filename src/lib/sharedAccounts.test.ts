import { describe, expect, it } from 'vitest'
import { accountBalance, memberFlows, monthCategoryTotals, parseAccountCode, personalTransferFor, type AccountEntry } from './sharedAccounts'

const entry = (user_id: string, kind: 'in' | 'out', amount: number, extra: Partial<AccountEntry> = {}): AccountEntry => ({ id: `${user_id}${kind}${amount}`, account_id: 'a', user_id, kind, amount, category: 'อาหาร', note: null, transfer: false, entry_date: '2026-10-06', created_at: '', ...extra })

describe('shared accounts', () => {
  it('computes balance and may go negative', () => {
    expect(accountBalance([entry('a', 'in', 1000), entry('b', 'out', 300)])).toBe(700)
    expect(accountBalance([entry('a', 'out', 50)])).toBe(-50)
  })

  it('splits in/out per member and keeps idle members', () => {
    const flows = memberFlows([entry('a', 'in', 500), entry('b', 'out', 120), entry('a', 'out', 80)], ['a', 'b', 'c'])
    expect(flows).toEqual([{ userId: 'a', in: 500, out: 80 }, { userId: 'b', in: 0, out: 120 }, { userId: 'c', in: 0, out: 0 }])
  })

  it('totals month spending by category, skipping transfers and other months', () => {
    const rows = monthCategoryTotals([
      entry('a', 'out', 100), entry('b', 'out', 50), entry('a', 'out', 400, { category: 'ค่าเช่า/ผ่อน' }),
      entry('a', 'out', 999, { transfer: true }), entry('a', 'out', 70, { entry_date: '2026-09-30' }), entry('a', 'in', 5000),
    ], '2026-10')
    expect(rows).toEqual([{ category: 'ค่าเช่า/ผ่อน', total: 400 }, { category: 'อาหาร', total: 150 }])
  })

  it('mirrors a transfer on the personal side', () => {
    const deposit = personalTransferFor(entry('a', 'in', 2000, { id: 'e1' }), 'บ้าน', 't1')
    expect(deposit).toMatchObject({ id: 't1', kind: 'expense', amount: 2000, sharedEntryId: 'e1' })
    expect(personalTransferFor(entry('a', 'out', 300, { id: 'e2' }), 'บ้าน', 't2').kind).toBe('income')
  })

  it('parses account invite links', () => {
    expect(parseAccountCode('#acct/ab12cd')).toBe('AB12CD')
    expect(parseAccountCode('#join/AB12CD')).toBeNull()
  })
})
