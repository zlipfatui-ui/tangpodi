import { describe, expect, it } from 'vitest'
import { buildInviteLink, jarBalance, memberTotals, normalizeCode, parseJoinCode, type JarEntry } from './sharedJars'

const entry = (user_id: string, kind: 'in' | 'out', amount: number): JarEntry => ({ id: `${user_id}${kind}${amount}`, jar_id: 'j', user_id, kind, amount, note: null, entry_date: '2026-10-06', created_at: '' })

describe('shared jars', () => {
  it('computes balance and per-member totals, including members with nothing saved', () => {
    const entries = [entry('a', 'in', 500), entry('b', 'in', 200), entry('a', 'out', 100)]
    expect(jarBalance(entries)).toBe(600)
    expect(memberTotals(entries, ['a', 'b', 'c'])).toEqual([{ userId: 'a', total: 400 }, { userId: 'b', total: 200 }, { userId: 'c', total: 0 }])
  })

  it('never reports a negative balance', () => {
    expect(jarBalance([entry('a', 'out', 50)])).toBe(0)
  })

  it('parses invite links and normalizes typed codes', () => {
    expect(parseJoinCode('#join/ab12cd')).toBe('AB12CD')
    expect(parseJoinCode('#/join/AB12CD')).toBe('AB12CD')
    expect(parseJoinCode('#goals')).toBeNull()
    expect(parseJoinCode('#join/short')).toBeNull()
    expect(normalizeCode(' ab-12 cd9 ')).toBe('AB12CD')
    expect(buildInviteLink('AB12CD', 'https://x.github.io', '/tangpodi/')).toBe('https://x.github.io/tangpodi/#join/AB12CD')
  })
})
