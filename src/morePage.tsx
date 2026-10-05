import { useState, type FormEvent } from 'react'
import { ChevronRight, Plus, Repeat, Settings as SettingsIcon, Trash2, Wrench, Route } from 'lucide-react'
import { FormField } from './components/UI'
import { formatMoney, getTodayISO } from './lib/presentation'
import type { FinanceData, RecurringItem } from './lib/finance'

interface MorePageProps {
  data: FinanceData
  onNavigate: (page: string) => void
  onTour: () => void
  onToggleHints: (enabled: boolean) => void
  onAddRecurring: (item: RecurringItem) => void
  onDeleteRecurring: (id: string) => void
}

export function MorePage({ data, onNavigate, onTour, onToggleHints, onAddRecurring, onDeleteRecurring }: MorePageProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [frequency, setFrequency] = useState<'monthly' | 'weekly'>('monthly')
  const [startDate, setStartDate] = useState(getTodayISO())
  const [error, setError] = useState('')
  const items = data.recurring ?? []
  const hintsEnabled = data.piggy?.hintsEnabled ?? true

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    if (!title.trim()) return setError('ใส่ชื่อรายการ เช่น ค่าเน็ต')
    if (!Number.isFinite(value) || value <= 0) return setError('กรอกจำนวนเงินมากกว่า 0 บาท')
    if (!startDate) return setError('เลือกวันที่เริ่ม')
    onAddRecurring({ id: crypto.randomUUID(), title: title.trim(), amount: value, kind, category: kind === 'income' ? 'รายรับประจำ' : 'รายจ่ายประจำ', frequency, startDate })
    setTitle(''); setAmount(''); setError('')
  }

  return <div className="page-stack">
    <section className="welcome-row"><div><div className="eyebrow">ทุกอย่างที่เหลือ</div><h1>เพิ่มเติม</h1><p>เครื่องมือ รายการประจำ และการตั้งค่า</p></div></section>
    <div className="more-links">
      <button type="button" className="more-link" onClick={() => onNavigate('utilities')}><span className="icon-disc icon-disc--turquoise"><Wrench size={18} /></span><span><b>เครื่องมือ</b><small>ค่าไฟ ค่าน้ำ ลองจำลองรายจ่ายก้อนใหญ่</small></span><ChevronRight size={17} /></button>
      <button type="button" className="more-link" onClick={() => onNavigate('settings')}><span className="icon-disc icon-disc--pink"><SettingsIcon size={18} /></span><span><b>ตั้งค่าและสำรองข้อมูล</b><small>รายได้ งบ ธีม ส่งออก/นำเข้า</small></span><ChevronRight size={17} /></button>
      <button type="button" className="more-link" onClick={onTour}><span className="icon-disc icon-disc--mint"><Route size={18} /></span><span><b>ให้หมูพาเที่ยวอีกครั้ง</b><small>ทบทวนวิธีใช้แอปทีละขั้น</small></span><ChevronRight size={17} /></button>
    </div>
    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">จดให้เองทุกรอบ</span><h2>รายการประจำ</h2></div><span className="icon-disc icon-disc--mint"><Repeat size={18} /></span></div>
      {items.length ? <ul className="transaction-list">{items.map((item) => <li className="transaction-row" key={item.id}>
        <div className="transaction-main"><b>{item.title}</b><span>{item.frequency === 'monthly' ? 'ทุกเดือน' : 'ทุกสัปดาห์'} · เริ่ม {item.startDate}</span></div>
        <strong className={item.kind === 'income' ? 'money-positive' : ''}>{item.kind === 'income' ? '+' : '−'}{formatMoney(item.amount)}</strong>
        <button className="icon-button icon-button--danger" type="button" aria-label={`ลบรายการประจำ ${item.title}`} onClick={() => onDeleteRecurring(item.id)}><Trash2 size={15} /></button>
      </li>)}</ul> : <div className="empty-inline">ยังไม่มีรายการประจำ เช่น ค่าเน็ต ค่าเช่า หรือเงินเดือน</div>}
      <details className="recurring-add"><summary className="button button--outline"><Plus size={16} /> เพิ่มรายการประจำ</summary>
      <form className="recurring-form" noValidate onSubmit={submit} aria-label="เพิ่มรายการประจำ">
        <FormField id="rec-title" label="ชื่อรายการ"><input id="rec-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น ค่าอินเทอร์เน็ต" /></FormField>
        <FormField id="rec-amount" label="จำนวนเงิน (บาท)"><input id="rec-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></FormField>
        <FormField id="rec-kind" label="ประเภท"><select id="rec-kind" value={kind} onChange={(event) => setKind(event.target.value as 'expense' | 'income')}><option value="expense">รายจ่าย</option><option value="income">รายรับ</option></select></FormField>
        <FormField id="rec-frequency" label="ทำซ้ำ"><select id="rec-frequency" value={frequency} onChange={(event) => setFrequency(event.target.value as 'monthly' | 'weekly')}><option value="monthly">ทุกเดือน</option><option value="weekly">ทุกสัปดาห์</option></select></FormField>
        <FormField id="rec-start" label="วันที่เริ่ม" error={error}><input id="rec-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></FormField>
        <button className="button button--primary" type="submit"><Plus size={16} /> เพิ่มรายการประจำ</button>
      </form></details>
    </section>
    <section className="panel more-toggle">
      <label><input type="checkbox" checked={hintsEnabled} onChange={(event) => onToggleHints(event.target.checked)} /> <span><b>ให้หมูทักทาย</b><small>เตือนบิล งบ และ streak การออมบนหน้าแรก</small></span></label>
    </section>
  </div>
}
