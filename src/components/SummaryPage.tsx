import { useState } from 'react'
import { ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { calculateBudgetSummary, type FinanceData } from '../lib/finance'
import { formatMoney, getTodayISO } from '../lib/presentation'

const palette = ['#e2508c', '#f97316', '#a3195b', '#f9a8c9', '#14b8a6', '#facc15', '#8b5cf6', '#60a5fa']
const pad = (n: number) => String(n).padStart(2, '0')
const thaiDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

/** โดนัทหมวดรายจ่าย: วงกลมซ้อนกันด้วย stroke-dasharray */
function Donut({ slices }: { slices: Array<{ label: string; value: number; color: string }> }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const r = 42, c = 2 * Math.PI * r
  let offset = 0
  return <svg className="summary-donut" viewBox="0 0 120 120" role="img" aria-label="สัดส่วนรายจ่ายตามหมวด">
    <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-border)" strokeWidth="22" />
    {total > 0 && slices.map((slice) => {
      const length = (slice.value / total) * c
      const el = <circle key={slice.label} cx="60" cy="60" r={r} fill="none" stroke={slice.color} strokeWidth="22" strokeDasharray={`${length} ${c - length}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)" />
      offset += length
      return el
    })}
    <circle cx="60" cy="60" r="53" fill="none" stroke="var(--color-ink)" strokeWidth="2.5" />
    <circle cx="60" cy="60" r="31" fill="var(--color-card)" stroke="var(--color-ink)" strokeWidth="2.5" />
  </svg>
}

export default function SummaryPage({ data }: { data: FinanceData }) {
  const today = getTodayISO()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [showRound, setShowRound] = useState(false)
  const [y, m] = month.split('-').map(Number) as [number, number]
  const start = `${month}-01`
  const end = `${month}-${pad(new Date(y, m, 0).getDate())}`
  const shift = (delta: number) => { const d = new Date(y, m - 1 + delta, 1); setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`) }

  const items = data.transactions.filter((item) => item.date >= start && item.date <= end && !item.sharedEntryId)
  const expense = items.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const income = items.filter((item) => item.kind === 'income').reduce((sum, item) => sum + item.amount, 0)
  const budgetSummary = calculateBudgetSummary(data, start, 'month')
  const rawBudget = budgetSummary.monthlyAllowance + budgetSummary.commitments
  const budget = Number.isFinite(rawBudget) && rawBudget > 0 ? rawBudget : income
  const budgetLeft = budget - expense
  const saved = income - expense
  const byCategory = new Map<string, number>()
  for (const item of items) if (item.kind === 'expense') byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.amount)
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([label, value], index) => ({ label, value, color: palette[index % palette.length]! }))
  const spentShare = budget > 0 ? Math.min(100, (expense / budget) * 100) : 0

  return <div className="page-stack summary-page">
    <section className="panel summary-card">
      <header className="summary-head">
        <h1>สรุป</h1>
        <div className="summary-month">
          <button type="button" className="icon-button" aria-label="เดือนก่อน" onClick={() => shift(-1)}><ChevronLeft size={18} /></button>
          <span>{thaiDate(start)} – {thaiDate(end)} {y + 543}</span>
          <button type="button" className="icon-button" aria-label="เดือนถัดไป" onClick={() => shift(1)}><ChevronRight size={18} /></button>
        </div>
      </header>

      <div className="summary-saved">
        <div><span>{showRound ? 'งบคงเหลือ' : 'เหลือเก็บ'}</span><strong className={(showRound ? budgetLeft : saved) < 0 ? 'money-negative' : 'summary-good'}>{formatMoney(showRound ? budgetLeft : saved)}</strong></div>
        <button type="button" className="summary-swap" onClick={() => setShowRound(!showRound)}>{showRound ? 'เหลือเก็บ' : 'รอบงบนี้'} <ArrowLeftRight size={15} /></button>
      </div>

      <div className="summary-pair">
        <div className="summary-tile summary-tile--expense">
          <span>รายจ่าย</span><strong>{formatMoney(expense)}</strong>
          <small>{budgetLeft >= 0 ? `เหลือ ${formatMoney(budgetLeft)} จากงบ` : `เกินงบ ${formatMoney(-budgetLeft)}`}</small>
          <div className="summary-bar"><i style={{ width: `${spentShare}%` }} /></div>
        </div>
        <div className="summary-tile summary-tile--income"><span>รายรับ</span><strong>{formatMoney(income)}</strong></div>
      </div>

      <div className="summary-chart">
        <Donut slices={categories} />
        <dl className="summary-facts">
          <div><dt>จำนวนรายการ</dt><dd>{items.length}</dd></div>
          <div><dt>งบที่ตั้งไว้</dt><dd>{formatMoney(budget)}</dd></div>
          <div><dt>งบคงเหลือ</dt><dd className={budgetLeft < 0 ? 'money-negative' : ''}>{formatMoney(budgetLeft)}</dd></div>
          <div><dt>รอบงบ</dt><dd>รายเดือน (วันที่ 1)</dd></div>
        </dl>
      </div>
    </section>

    <section className="panel summary-cats">
      <h2>รายจ่ายตามหมวด</h2>
      {categories.length === 0 ? <div className="empty-inline">เดือนนี้ยังไม่มีรายจ่าย</div> : categories.map((cat) => <div key={cat.label} className="summary-cat">
        <div className="summary-cat__row"><span><i style={{ background: cat.color }} />{cat.label}</span><b>{formatMoney(cat.value)} <small>{Math.round((cat.value / expense) * 100)}%</small></b></div>
        <div className="summary-bar"><i style={{ width: `${(cat.value / categories[0]!.value) * 100}%`, background: cat.color }} /></div>
      </div>)}
    </section>
  </div>
}
