import { describe, expect, it } from 'vitest'
import { buildCalendarFile } from './calendar'
import type { FinanceData } from './finance'

const data: Pick<FinanceData, 'events' | 'bills' | 'debts'> = {
  events: [{ id: 'payday', title: 'วันเงินเข้า, เงินเดือน', date: '2026-10-01', note: 'เช็กยอด; แบ่งออม' }],
  bills: [
    { id: 'phone', title: 'ค่าโทรศัพท์', amount: 599, dueDate: '2026-10-10', repeatMonthly: true, paid: false },
    { id: 'paid', title: 'บิลที่จ่ายแล้ว', amount: 300, dueDate: '2026-10-11', repeatMonthly: false, paid: true },
  ],
  debts: [{ id: 'card', title: 'บัตรเครดิต', balance: 1200, installment: 400, dueDate: '2026-10-15' }],
}

describe('calendar export', () => {
  it('exports important dates and unpaid bills and debts as all-day reminders', () => {
    const result = buildCalendarFile(data, new Date('2026-09-23T04:00:00.000Z'))
    const unfolded = result.replace(/\r\n /g, '')

    expect(result).toContain('BEGIN:VCALENDAR\r\n')
    expect(unfolded).toContain('SUMMARY:วันเงินเข้า\\, เงินเดือน')
    expect(unfolded).toContain('SUMMARY:ค่าโทรศัพท์ · 599 บาท')
    expect(unfolded).toContain('SUMMARY:ชำระหนี้: บัตรเครดิต · 400 บาท')
    expect(unfolded).not.toContain('บิลที่จ่ายแล้ว')
    expect(unfolded).toContain('DTSTART;VALUE=DATE:20261010')
    expect(unfolded).toContain('TRIGGER:-P1D')
    expect(result).toContain('END:VCALENDAR\r\n')
  })
})
