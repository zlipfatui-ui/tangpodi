import { describe, expect, it } from 'vitest'
import { normalizeSlipText, parseSlipDate, parseSlipText } from './slipParser'

const today = new Date(2026, 9, 6)

describe('parseSlipText', () => {
  it('reads a typical transfer slip with a Buddhist short year and ignores the fee', () => {
    const slip = `โอนเงินสำเร็จ
6 ต.ค. 69 14:32 น.
รหัสอ้างอิง: 202610061432ABCD1234
จาก นาย สมชาย ใจดี
ธนาคารกสิกรไทย
ไปยัง น.ส. สมหญิง รักดี
ธนาคารไทยพาณิชย์
จำนวน: 1,250.50 บาท
ค่าธรรมเนียม: 0.00 บาท`
    expect(parseSlipText(slip, today)).toEqual({ amount: 1250.5, date: '2026-10-06', recipient: 'น.ส. สมหญิง รักดี', ref: '202610061432ABCD1234' })
  })

  it('copes with OCR spacing between Thai characters', () => {
    const slip = 'จ ำ น ว น เ งิ น 250.00 บ า ท\n12 ก.ย. 2569'
    expect(normalizeSlipText('ต . ค .')).toBe('ต.ค.')
    expect(parseSlipText('จำนวนเงิน 250.00 บาท\n12 ก.ย. 2569', today)).toMatchObject({ amount: 250, date: '2026-09-12' })
    expect(parseSlipText(slip, today)).toMatchObject({ amount: 250, date: '2026-09-12' })
  })

  it('repairs OCR output: decomposed sara am and spaces inside the reference', () => {
    const nikhahitAa = String.fromCharCode(0x0e4d, 0x0e32)
    const slip = ['6 ต.ค. 69', 'รหัสอ้างอิง: 202610061432ABCD 1234', `จ${nikhahitAa}นวน: 89.00 บาท`].join(String.fromCharCode(10))
    expect(parseSlipText(slip, today)).toMatchObject({ amount: 89, date: '2026-10-06', ref: '202610061432ABCD1234' })
  })

  it('falls back to a baht amount without a label, and reads English dates', () => {
    expect(parseSlipText('Transfer successful\n06 Oct 2026\n89.00 THB', today)).toMatchObject({ amount: 89, date: '2026-10-06' })
  })

  it('returns undefined fields instead of guessing', () => {
    expect(parseSlipText('ข้อความอื่นที่ไม่ใช่สลิป', today)).toEqual({ amount: undefined, date: undefined, recipient: undefined, ref: undefined })
    expect(parseSlipDate('31 ก.พ. 69', today)).toBeUndefined()
  })
})
