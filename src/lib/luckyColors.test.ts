import { describe, expect, it } from 'vitest'
import { getWeekdayColor, getPersonalLuckyColors } from './luckyColors'

describe('Thai lucky color references', () => {
  it('shows the traditional weekday color for the local ISO date', () => {
    expect(getWeekdayColor('2026-09-23')).toMatchObject({ weekday: 3, label: 'เขียว' })
  })

  it('returns separate yearly colors for the birthday and each intention', () => {
    expect(getPersonalLuckyColors(4)).toMatchObject([
      { key: 'finance', label: 'การเงิน', colors: [{ label: 'เหลือง' }, { label: 'ครีม' }] },
      { key: 'work', label: 'การงาน', colors: [{ label: 'ฟ้า' }, { label: 'น้ำเงิน' }] },
      { key: 'affection', label: 'ความรัก' },
      { key: 'fortune', label: 'โชคดี' },
      { key: 'avoid', label: 'สีที่ควรเลี่ยง' },
    ])
  })

  it('returns no profile colors for an invalid weekday', () => {
    expect(getPersonalLuckyColors(8)).toBeNull()
  })
})
