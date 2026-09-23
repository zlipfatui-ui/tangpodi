import { addDays, type FinanceData } from './finance'

type CalendarItems = Pick<FinanceData, 'events' | 'bills' | 'debts'>

interface CalendarEntry {
  uid: string
  title: string
  date: string
  description: string
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function foldLine(line: string): string[] {
  const output: string[] = []
  let current = ''
  let byteLength = 0

  for (const character of line) {
    const size = new TextEncoder().encode(character).length
    if (byteLength + size > 75) {
      output.push(current)
      current = ' '
      byteLength = 1
    }
    current += character
    byteLength += size
  }
  output.push(current)
  return output
}

function yyyymmdd(date: string): string {
  return date.replaceAll('-', '')
}

function buildEntry(entry: CalendarEntry, stamp: string): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${escapeText(entry.uid)}@tang-phor-dee.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${yyyymmdd(entry.date)}`,
    `DTEND;VALUE=DATE:${yyyymmdd(addDays(entry.date, 1))}`,
    `SUMMARY:${escapeText(entry.title)}`,
    `DESCRIPTION:${escapeText(entry.description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(entry.title)}`,
    'END:VALARM',
    'END:VEVENT',
  ]
}

export function buildCalendarFile(data: CalendarItems, createdAt = new Date()): string {
  const entries: CalendarEntry[] = [
    ...data.events.map((event) => ({
      uid: `event-${event.id}`,
      title: event.title,
      date: event.date,
      description: event.note ?? 'วันสำคัญจากตังค์พอดี',
    })),
    ...data.bills.filter((bill) => !bill.paid).map((bill) => ({
      uid: `bill-${bill.id}`,
      title: `${bill.title} · ${Math.round(bill.amount).toLocaleString('th-TH')} บาท`,
      date: bill.dueDate,
      description: `กำหนดชำระบิล ${bill.title}`,
    })),
    ...data.debts.filter((debt) => debt.balance > 0).map((debt) => ({
      uid: `debt-${debt.id}`,
      title: `ชำระหนี้: ${debt.title} · ${Math.round(debt.installment).toLocaleString('th-TH')} บาท`,
      date: debt.dueDate,
      description: `ยอดหนี้คงเหลือ ${Math.round(debt.balance).toLocaleString('th-TH')} บาท`,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const stamp = createdAt.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tang Phor Dee//Personal Finance//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...entries.flatMap((entry) => buildEntry(entry, stamp)),
    'END:VCALENDAR',
  ]

  return `${lines.flatMap(foldLine).join('\r\n')}\r\n`
}
