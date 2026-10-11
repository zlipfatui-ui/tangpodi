import { useState } from 'react'
import { BookOpen, CircleHelp, Landmark, Sparkles } from 'lucide-react'
import { FormField } from './UI'
import { calculateTax, TAX_BRACKETS } from '../lib/tax'
import { formatMoney, getTodayISO } from '../lib/presentation'
import type { FinanceData } from '../lib/finance'

const num = (value: string) => Number(value.replace(/,/g, '')) || 0
const baht = (value: number) => Math.round(value).toLocaleString('th-TH')

const guideSteps = [
  { title: 'รวมเงินได้ทั้งปี', text: 'เงินเดือน × 12 เดือน รวมโบนัสด้วย นี่คือ “เงินได้พึงประเมิน”' },
  { title: 'หักค่าใช้จ่าย', text: 'มนุษย์เงินเดือนหักได้ 50% แต่ไม่เกิน 100,000 บาท แอปหักให้อัตโนมัติ' },
  { title: 'หักค่าลดหย่อน', text: 'ส่วนตัว 60,000 + ประกันสังคม + ประกันชีวิต + กองทุน ฯลฯ ใส่เท่าที่มี' },
  { title: 'คิดภาษีแบบขั้นบันได', text: 'แบ่งเงินได้สุทธิเป็นขั้น แต่ละขั้นคูณอัตราของตัวเอง แล้วรวมกัน' },
]

export default function TaxCalculator({ data }: { data: FinanceData }) {
  const year = getTodayISO().slice(0, 4)
  const yearIncome = data.transactions
    .filter((item) => item.kind === 'income' && item.date.startsWith(year) && !item.sharedEntryId)
    .reduce((sum, item) => sum + item.amount, 0)
  const [mode, setMode] = useState<'month' | 'year'>('month')
  const [income, setIncome] = useState('')
  const [spouse, setSpouse] = useState(false)
  const [children, setChildren] = useState('0')
  const [parents, setParents] = useState('0')
  const [socialSecurity, setSocialSecurity] = useState('')
  const [lifeInsurance, setLifeInsurance] = useState('')
  const [funds, setFunds] = useState('')
  const [withheld, setWithheld] = useState('')
  const yearly = mode === 'month' ? num(income) * 12 : num(income)
  const result = calculateTax({ income: yearly, spouse, children: num(children), parents: num(parents), socialSecurity: num(socialSecurity), lifeInsurance: num(lifeInsurance), funds: num(funds), withheld: num(withheld) })
  const hasIncome = yearly > 0
  const deductionLines = [
    ['ส่วนตัว', 60_000],
    ['คู่สมรส', spouse ? 60_000 : 0],
    ['บุตร', Math.max(0, Math.floor(num(children))) * 30_000],
    ['บิดามารดา', Math.min(4, Math.max(0, Math.floor(num(parents)))) * 30_000],
    ['ประกันสังคม', Math.min(num(socialSecurity), 9_000)],
    ['ประกันชีวิต', Math.min(num(lifeInsurance), 100_000)],
    ['กองทุน', Math.min(num(funds), yearly * 0.15, 500_000)],
  ].filter(([, value]) => Number(value) > 0) as Array<[string, number]>

  const loadExample = () => {
    setMode('month'); setIncome('50000'); setSpouse(false); setChildren('0'); setParents('0')
    setSocialSecurity('9000'); setLifeInsurance(''); setFunds(''); setWithheld('')
  }

  return <div className="page-stack tax-page">
    <section className="welcome-row"><div><div className="eyebrow">มนุษย์เงินเดือน</div><h1>คำนวณภาษีเงินได้</h1><p>กรอกเงินเดือน แล้วดูวิธีคิดทีละบรรทัด</p></div><span className="icon-disc icon-disc--pink"><Landmark size={20} /></span></section>

    <details className="panel tax-guide" open={!hasIncome}>
      <summary><span className="icon-disc icon-disc--mint"><BookOpen size={18} /></span><b>สอนคิดภาษีใน 4 ขั้น</b></summary>
      <div className="tax-formula">
        <p><b>เงินได้สุทธิ</b> = เงินได้พึงประเมิน − ค่าใช้จ่าย − ค่าลดหย่อน</p>
        <p><b>ภาษีที่ต้องเสีย</b> = เงินได้สุทธิ × อัตราภาษี (ขั้นบันได)</p>
      </div>
      <ol className="tax-steps">{guideSteps.map((step, index) => <li key={step.title}><span className="tax-step-number">{index + 1}</span><div><b>{step.title}</b><small>{step.text}</small></div></li>)}</ol>
      <button className="button button--primary" type="button" onClick={loadExample}><Sparkles size={16} /> ลองตัวอย่าง: เงินเดือน 50,000</button>
    </details>

    <section className="panel utility-panel">
      <h2>ข้อมูลของคุณ</h2>
      <div className="segmented" aria-label="หน่วยของเงินได้">{([['month', 'ต่อเดือน'], ['year', 'ทั้งปี']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>)}</div>
      <FormField id="tax-income" label={mode === 'month' ? 'เงินเดือน (บาท/เดือน)' : 'เงินได้รวมทั้งปี (บาท)'}><input id="tax-income" inputMode="decimal" placeholder={mode === 'month' ? 'เช่น 30000' : 'เช่น 360000'} value={income} onChange={(event) => setIncome(event.target.value)} /></FormField>
      {yearIncome > 0 && <button className="text-button" type="button" onClick={() => { setMode('year'); setIncome(String(Math.round(yearIncome))) }}>ใช้รายรับปี {year} จากแอป ({formatMoney(yearIncome)})</button>}
      <details className="tax-more">
        <summary>ค่าลดหย่อนเพิ่มเติม (ไม่บังคับ)</summary>
        <div className="device-row">
          <FormField id="tax-sso" label="ประกันสังคมทั้งปี (สูงสุด 9,000)"><input id="tax-sso" inputMode="decimal" value={socialSecurity} onChange={(event) => setSocialSecurity(event.target.value)} /></FormField>
          <FormField id="tax-children" label="จำนวนบุตร"><input id="tax-children" type="number" min="0" inputMode="numeric" value={children} onChange={(event) => setChildren(event.target.value)} /></FormField>
          <FormField id="tax-parents" label="พ่อแม่ที่เลี้ยงดู (สูงสุด 4)"><input id="tax-parents" type="number" min="0" max="4" inputMode="numeric" value={parents} onChange={(event) => setParents(event.target.value)} /></FormField>
          <FormField id="tax-life" label="เบี้ยประกันชีวิต (สูงสุด 100,000)"><input id="tax-life" inputMode="decimal" value={lifeInsurance} onChange={(event) => setLifeInsurance(event.target.value)} /></FormField>
          <FormField id="tax-funds" label="กองทุน กบข./PVD/RMF/SSF"><input id="tax-funds" inputMode="decimal" value={funds} onChange={(event) => setFunds(event.target.value)} /></FormField>
          <FormField id="tax-withheld" label="ภาษีที่ถูกหักไว้แล้ว"><input id="tax-withheld" inputMode="decimal" value={withheld} onChange={(event) => setWithheld(event.target.value)} /></FormField>
        </div>
        <label className="check-row"><input type="checkbox" checked={spouse} onChange={(event) => setSpouse(event.target.checked)} /> คู่สมรสไม่มีเงินได้</label>
      </details>
    </section>

    <section className="panel tax-receipt" aria-live="polite">
      <h2>ตัวอย่างการคำนวณของคุณ</h2>
      {hasIncome ? <>
        <dl className="tax-lines">
          <div><dt>เงินได้ทั้งปี{mode === 'month' ? ` (${baht(num(income))} × 12)` : ''}</dt><dd>{baht(yearly)} บาท</dd></div>
          <div><dt>หัก ค่าใช้จ่าย (50% ไม่เกิน 100,000)</dt><dd className="tax-minus">−{baht(result.expenseDeduction)} บาท</dd></div>
          {deductionLines.map(([label, value]) => <div className="tax-sub" key={label}><dt>ลดหย่อน · {label}</dt><dd>{baht(value)}</dd></div>)}
          <div><dt>หัก ค่าลดหย่อนรวม</dt><dd className="tax-minus">−{baht(result.allowances)} บาท</dd></div>
          <div className="tax-total"><dt>เงินได้สุทธิเพื่อเสียภาษี</dt><dd>{baht(result.netIncome)} บาท</dd></div>
        </dl>
        <h3>คิดภาษีทีละขั้น</h3>
        <ul className="tax-bracket-lines">{result.steps.map((step) => <li key={step.from}><span>{baht(step.amount)} × {Math.round(step.rate * 100)}%</span><b>{step.rate === 0 ? 'ยกเว้น' : `${baht(step.tax)} บาท`}</b></li>)}</ul>
        <div className="utility-result"><div><span>ดังนั้น ภาษีที่ต้องชำระ</span><strong>{formatMoney(result.tax)}</strong></div><span>ขั้นสูงสุด {Math.round(result.marginalRate * 100)}% · เฉลี่ยเดือนละ {formatMoney(result.tax / 12)}</span></div>
        {num(withheld) > 0 && <p className="shared-message" role="status">{result.balance > 0 ? `ต้องจ่ายเพิ่ม ${formatMoney(result.balance)}` : result.balance < 0 ? `ได้คืนประมาณ ${formatMoney(-result.balance)}` : 'พอดี ไม่ต้องจ่ายเพิ่มหรือขอคืน'}</p>}
      </> : <div className="empty-inline">กรอกเงินเดือนด้านบน หรือกด “ลองตัวอย่าง” เพื่อดูวิธีคิด</div>}
    </section>

    <section className="panel">
      <h2>อัตราภาษีขั้นบันได</h2>
      <table className="tax-table"><thead><tr><th>เงินได้สุทธิ</th><th>อัตรา</th></tr></thead><tbody>{TAX_BRACKETS.map((bracket, index) => {
        const from = index === 0 ? 0 : TAX_BRACKETS[index - 1].upTo
        const active = hasIncome && (result.netIncome > from || index === 0) && result.netIncome <= bracket.upTo
        return <tr key={bracket.upTo} className={active ? 'tax-row--active' : ''}><td>{bracket.upTo === Infinity ? `${baht(from + 1)} ขึ้นไป` : `${index === 0 ? '0' : baht(from + 1)} – ${baht(bracket.upTo)}`}</td><td>{bracket.rate === 0 ? 'ยกเว้น' : `${Math.round(bracket.rate * 100)}%`}</td></tr>
      })}</tbody></table>
    </section>

    <div className="inline-note"><CircleHelp size={15} /> ยื่น ภ.ง.ด.91 (เงินเดือนอย่างเดียว) ช่วง ม.ค.–มี.ค. ของปีถัดไป ทางออนไลน์ที่ efiling.rd.go.th · ผลลัพธ์เป็นค่าประมาณ ไม่ใช่คำแนะนำด้านภาษี</div>
  </div>
}
