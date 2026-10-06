import { useState } from 'react'
import { CircleHelp, Landmark } from 'lucide-react'
import { FormField } from './UI'
import { calculateTax } from '../lib/tax'
import { formatMoney, getTodayISO } from '../lib/presentation'
import type { FinanceData } from '../lib/finance'

const num = (value: string) => Number(value.replace(/,/g, '')) || 0

export default function TaxCalculator({ data }: { data: FinanceData }) {
  const year = getTodayISO().slice(0, 4)
  const yearIncome = data.transactions
    .filter((item) => item.kind === 'income' && item.date.startsWith(year) && !item.sharedEntryId)
    .reduce((sum, item) => sum + item.amount, 0)
  const [income, setIncome] = useState('')
  const [spouse, setSpouse] = useState(false)
  const [children, setChildren] = useState('0')
  const [parents, setParents] = useState('0')
  const [socialSecurity, setSocialSecurity] = useState('')
  const [lifeInsurance, setLifeInsurance] = useState('')
  const [funds, setFunds] = useState('')
  const [withheld, setWithheld] = useState('')
  const result = calculateTax({ income: num(income), spouse, children: num(children), parents: num(parents), socialSecurity: num(socialSecurity), lifeInsurance: num(lifeInsurance), funds: num(funds), withheld: num(withheld) })
  const hasIncome = num(income) > 0

  return <section className="panel utility-panel">
    <div className="utility-heading"><span className="utility-icon utility-icon--electric"><Landmark size={18} /></span><div><h2>ประมาณภาษีเงินได้บุคคลธรรมดา</h2><p>เงินเดือน/ค่าจ้าง ขั้นบันไดภาษีไทย 0–35%</p></div></div>
    <FormField id="tax-income" label="เงินได้รวมทั้งปี (บาท)"><input id="tax-income" inputMode="decimal" value={income} onChange={(event) => setIncome(event.target.value)} /></FormField>
    {yearIncome > 0 && <button className="text-button" type="button" onClick={() => setIncome(String(Math.round(yearIncome)))}>ใช้รายรับปี {year} จากแอป ({formatMoney(yearIncome)})</button>}
    <div className="device-row">
      <FormField id="tax-children" label="จำนวนบุตร"><input id="tax-children" type="number" min="0" inputMode="numeric" value={children} onChange={(event) => setChildren(event.target.value)} /></FormField>
      <FormField id="tax-parents" label="บิดามารดาที่เลี้ยงดู (สูงสุด 4)"><input id="tax-parents" type="number" min="0" max="4" inputMode="numeric" value={parents} onChange={(event) => setParents(event.target.value)} /></FormField>
    </div>
    <label className="check-row"><input type="checkbox" checked={spouse} onChange={(event) => setSpouse(event.target.checked)} /> คู่สมรสไม่มีเงินได้</label>
    <div className="device-row">
      <FormField id="tax-sso" label="ประกันสังคม (สูงสุด 9,000)"><input id="tax-sso" inputMode="decimal" value={socialSecurity} onChange={(event) => setSocialSecurity(event.target.value)} /></FormField>
      <FormField id="tax-life" label="เบี้ยประกันชีวิต (สูงสุด 100,000)"><input id="tax-life" inputMode="decimal" value={lifeInsurance} onChange={(event) => setLifeInsurance(event.target.value)} /></FormField>
      <FormField id="tax-funds" label="กองทุน กบข./PVD/RMF/SSF"><input id="tax-funds" inputMode="decimal" value={funds} onChange={(event) => setFunds(event.target.value)} /></FormField>
      <FormField id="tax-withheld" label="ภาษีที่ถูกหักไว้แล้ว"><input id="tax-withheld" inputMode="decimal" value={withheld} onChange={(event) => setWithheld(event.target.value)} /></FormField>
    </div>
    <div className="utility-result"><div><span>ภาษีที่ต้องเสียโดยประมาณ</span><strong>{formatMoney(result.tax)}</strong></div><span>เงินได้สุทธิ {formatMoney(result.netIncome)}{hasIncome ? ` · ขั้น ${Math.round(result.marginalRate * 100)}%` : ''}</span></div>
    {hasIncome && num(withheld) > 0 && <p className="shared-message" role="status">{result.balance > 0 ? `ต้องจ่ายเพิ่ม ${formatMoney(result.balance)}` : result.balance < 0 ? `ได้คืนประมาณ ${formatMoney(-result.balance)}` : 'พอดี ไม่ต้องจ่ายเพิ่มหรือขอคืน'}</p>}
    <div className="inline-note"><CircleHelp size={15} /> หักค่าใช้จ่าย 50% (ไม่เกิน 100,000) และลดหย่อนส่วนตัว 60,000 ให้อัตโนมัติ บุตรคิดคนละ 30,000 เป็นค่าประมาณ ไม่ใช่คำแนะนำด้านภาษี ตรวจสอบกับกรมสรรพากรก่อนยื่นจริง</div>
  </section>
}
