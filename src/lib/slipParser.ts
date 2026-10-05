export interface SlipFields {
  amount?: number
  date?: string
  recipient?: string
  ref?: string
}

const months: Array<[number, string[]]> = [
  [1, ['มกราคม', 'ม.ค.', 'มค', 'jan']], [2, ['กุมภาพันธ์', 'ก.พ.', 'กพ', 'feb']], [3, ['มีนาคม', 'มี.ค.', 'มีค', 'mar']],
  [4, ['เมษายน', 'เม.ย.', 'เมย', 'apr']], [5, ['พฤษภาคม', 'พ.ค.', 'พค', 'may']], [6, ['มิถุนายน', 'มิ.ย.', 'มิย', 'jun']],
  [7, ['กรกฎาคม', 'ก.ค.', 'กค', 'jul']], [8, ['สิงหาคม', 'ส.ค.', 'สค', 'aug']], [9, ['กันยายน', 'ก.ย.', 'กย', 'sep']],
  [10, ['ตุลาคม', 'ต.ค.', 'ตค', 'oct']], [11, ['พฤศจิกายน', 'พ.ย.', 'พย', 'nov']], [12, ['ธันวาคม', 'ธ.ค.', 'ธค', 'dec']],
]

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const monthPattern = months.flatMap(([, names]) => names).sort((a, b) => b.length - a.length).map(escapeRegex).join('|')
const dateRegex = new RegExp(`(\\d{1,2})\\s*(${monthPattern})\\s*(\\d{2,4})`, 'i')

/** OCR ภาษาไทยมักใส่ช่องว่างระหว่างตัวอักษร จึงรวมให้ก่อนอ่าน */
export function normalizeSlipText(text: string): string {
  return text
    // OCR มักถอด สระอำ เป็น นิคหิต + สระอา
    .replace(/ํา/g, 'ำ')
    .replace(/([ก-๛])[ \t]+\./g, '$1.')
    .replace(/([ก-๛.])[ \t]+(?=[ก-๛])/g, '$1')
    .replace(/[ \t]+/g, ' ')
}

function monthNumber(token: string): number | undefined {
  const lowered = token.toLowerCase()
  return months.find(([, names]) => names.includes(lowered))?.[0]
}

function resolveYear(raw: string, today: Date): number {
  const value = Number(raw)
  if (raw.length >= 4) return value > 2400 ? value - 543 : value
  // ปีย่อ 2 หลัก: พ.ศ. (69 → 2569) หรือ ค.ศ. (26 → 2026) เลือกปีที่ไม่อยู่ในอนาคตและใกล้ปัจจุบันที่สุด
  const candidates = [1957 + value, 2000 + value].filter((year) => year <= today.getFullYear() + 1)
  return candidates.sort((a, b) => Math.abs(a - today.getFullYear()) - Math.abs(b - today.getFullYear()))[0] ?? 2000 + value
}

export function parseSlipDate(text: string, today = new Date()): string | undefined {
  const match = dateRegex.exec(text)
  if (!match) return undefined
  const month = monthNumber(match[2]!.replace(/\s/g, ''))
  const day = Number(match[1])
  if (!month || day < 1 || day > 31) return undefined
  const year = resolveYear(match[3]!, today)
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const parsed = new Date(`${iso}T00:00:00.000Z`)
  return parsed.toISOString().slice(0, 10) === iso ? iso : undefined
}

const amountPattern = '([\\d,]+(?:\\.\\d{1,2})?)'

export function parseSlipAmount(text: string): number | undefined {
  const labelled = new RegExp(`(?:จำนวนเงิน|จำนวน|amount)\\s*[:：]?\\s*(?:บาท|thb|฿)?\\s*${amountPattern}`, 'i').exec(text)
  const fallback = [...text.matchAll(new RegExp(`${amountPattern}\\s*(?:บาท|thb|baht)`, 'gi'))]
    .filter((match) => !/(?:ค่าธรรมเนียม|fee)\s*[:：]?\s*$/i.test(text.slice(Math.max(0, match.index - 20), match.index)))
    .map((match) => match[1]!)
  for (const raw of [labelled?.[1], fallback[0]]) {
    const value = raw ? Number(raw.replace(/,/g, '')) : NaN
    if (Number.isFinite(value) && value > 0) return value
  }
  return undefined
}

export function parseSlipRecipient(text: string): string | undefined {
  const match = /(?:ไปยัง|ผู้รับ|ถึง|\bto\b)\s*[:：]?\s*\n?\s*([^\n]{2,40})/i.exec(text)
  const name = match?.[1]?.replace(/[xX*\-\d\s]{6,}.*$/, '').trim()
  return name && /[ก-๛a-zA-Z]/.test(name) ? name : undefined
}

export function parseSlipRef(text: string): string | undefined {
  const raw = /(?:รหัสอ้างอิง|เลขที่รายการ|หมายเลขอ้างอิง|เลขอ้างอิง|ref(?:erence)?(?:\s*(?:no|id)\.?)?)[ 	]*[:：]?[ 	]*([A-Za-z0-9 ]{8,40})/i.exec(text)?.[1]
  // OCR อาจแทรกช่องว่างกลางเลขอ้างอิง จึงรวมกลับ
  const ref = raw?.replace(/ /g, '')
  return ref && ref.length >= 8 ? ref : undefined
}

export function parseSlipText(raw: string, today = new Date()): SlipFields {
  const text = normalizeSlipText(raw)
  return {
    amount: parseSlipAmount(text),
    date: parseSlipDate(text, today),
    // ชื่อผู้รับเก็บช่องว่างระหว่างคำไว้ จึงอ่านจากข้อความดิบ ไม่ใช่ข้อความที่รวมช่องว่างแล้ว
    recipient: parseSlipRecipient(raw.replace(/[ \t]+/g, ' ')),
    ref: parseSlipRef(text),
  }
}
