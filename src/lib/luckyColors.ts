export interface WeekdayColor {
  weekday: number
  label: string
  hex: string
}

export interface LuckyColor {
  label: string
  hex: string
}

export interface LuckyColorPurpose {
  key: 'finance' | 'work' | 'affection' | 'fortune' | 'avoid'
  label: string
  colors: LuckyColor[]
}

const weekdayPalette: WeekdayColor[] = [
  { weekday: 0, label: 'แดง', hex: '#C94F5F' },
  { weekday: 1, label: 'เหลือง', hex: '#C69B31' },
  { weekday: 2, label: 'ชมพู', hex: '#C9658D' },
  { weekday: 3, label: 'เขียว', hex: '#3C8068' },
  { weekday: 4, label: 'ส้ม', hex: '#C87531' },
  { weekday: 5, label: 'ฟ้า', hex: '#477DAD' },
  { weekday: 6, label: 'ม่วง', hex: '#715C91' },
]

const color = (label: string, hex: string): LuckyColor => ({ label, hex })
const personalPalette: LuckyColorPurpose[][] = [
  [
    { key: 'finance', label: 'การเงิน', colors: [color('ดำ', '#29262D'), color('ม่วง', '#715C91')] },
    { key: 'work', label: 'การงาน', colors: [color('ชมพู', '#C9658D'), color('โอลด์โรส', '#A9536D')] },
    { key: 'affection', label: 'เมตตาและความรัก', colors: [color('เทา', '#807D86'), color('ทอง', '#B89539')] },
    { key: 'fortune', label: 'โชคดี', colors: [color('เขียว', '#3C8068')] },
    { key: 'avoid', label: 'สีที่ควรเลี่ยง', colors: [color('ฟ้า', '#477DAD'), color('น้ำเงิน', '#345C86')] },
  ],
  [
    { key: 'finance', label: 'การเงิน', colors: [color('ส้ม', '#C87531'), color('น้ำตาล', '#805B48')] },
    { key: 'work', label: 'การงาน', colors: [color('เขียว', '#3C8068')] },
    { key: 'affection', label: 'เมตตาและความรัก', colors: [color('ฟ้า', '#477DAD'), color('น้ำเงิน', '#345C86')] },
    { key: 'fortune', label: 'โชคดี', colors: [color('ม่วง', '#715C91'), color('เทาดำ', '#56515B')] },
    { key: 'avoid', label: 'สีที่ควรเลี่ยง', colors: [color('แดง', '#C94F5F'), color('แสด', '#CF6C2D')] },
  ],
  [
    { key: 'finance', label: 'การเงิน', colors: [color('น้ำตาล', '#805B48'), color('เทา', '#807D86')] },
    { key: 'work', label: 'การงาน', colors: [color('ม่วง', '#715C91'), color('เทาดำ', '#56515B')] },
    { key: 'affection', label: 'เมตตาและความรัก', colors: [color('แดง', '#C94F5F'), color('ชมพู', '#C9658D')] },
    { key: 'fortune', label: 'โชคดี', colors: [color('ส้ม', '#C87531'), color('น้ำตาล', '#805B48')] },
    { key: 'avoid', label: 'สีที่ควรเลี่ยง', colors: [color('ขาว', '#F4F0E8'), color('เหลือง', '#C69B31')] },
  ],
  [
    { key: 'finance', label: 'การเงิน', colors: [color('ฟ้า', '#477DAD'), color('น้ำเงิน', '#345C86')] },
    { key: 'work', label: 'การงาน', colors: [color('ส้ม', '#C87531'), color('น้ำตาล', '#805B48')] },
    { key: 'affection', label: 'ความรัก', colors: [color('เหลือง', '#C69B31'), color('ขาว', '#F4F0E8')] },
    { key: 'fortune', label: 'โชคดี', colors: [color('เทา', '#807D86'), color('ทอง', '#B89539')] },
    { key: 'avoid', label: 'สีที่ควรเลี่ยง', colors: [color('ชมพู', '#C9658D')] },
  ],
  [
    { key: 'finance', label: 'การเงิน', colors: [color('เหลือง', '#C69B31'), color('ครีม', '#E7D7AC')] },
    { key: 'work', label: 'การงาน', colors: [color('ฟ้า', '#477DAD'), color('น้ำเงิน', '#345C86')] },
    { key: 'affection', label: 'ความรัก', colors: [color('เขียว', '#3C8068')] },
    { key: 'fortune', label: 'โชคดี', colors: [color('แดง', '#C94F5F'), color('โอลด์โรส', '#A9536D')] },
    { key: 'avoid', label: 'สีที่ควรเลี่ยง', colors: [color('ดำ', '#29262D'), color('เทาดำ', '#56515B')] },
  ],
  [
    { key: 'finance', label: 'การเงิน', colors: [color('เขียว', '#3C8068')] },
    { key: 'work', label: 'การงาน', colors: [color('เหลือง', '#C69B31'), color('ขาว', '#F4F0E8')] },
    { key: 'affection', label: 'ความรัก', colors: [color('ส้ม', '#C87531'), color('น้ำตาล', '#805B48')] },
    { key: 'fortune', label: 'โชคดี', colors: [color('ชมพู', '#C9658D')] },
    { key: 'avoid', label: 'สีที่ควรเลี่ยง', colors: [color('เทา', '#807D86'), color('ทอง', '#B89539')] },
  ],
  [
    { key: 'finance', label: 'การเงิน', colors: [color('แดง', '#C94F5F'), color('พีช', '#D8917B')] },
    { key: 'work', label: 'การงาน', colors: [color('น้ำตาล', '#805B48'), color('เทา', '#807D86')] },
    { key: 'affection', label: 'ความรัก', colors: [color('ชมพู', '#C9658D'), color('โอลด์โรส', '#A9536D')] },
    { key: 'fortune', label: 'โชคดี', colors: [color('ฟ้า', '#477DAD'), color('น้ำเงิน', '#345C86')] },
    { key: 'avoid', label: 'สีที่ควรเลี่ยง', colors: [color('เขียว', '#3C8068')] },
  ],
]

export function getWeekdayColor(isoDate: string): WeekdayColor | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const date = new Date(`${isoDate}T12:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return null
  return weekdayPalette[date.getUTCDay()]
}

export function getPersonalLuckyColors(weekday: number): LuckyColorPurpose[] | null {
  return personalPalette[weekday] ?? null
}
