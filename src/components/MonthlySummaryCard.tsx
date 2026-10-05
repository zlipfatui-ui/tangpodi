import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatMoney } from '../lib/presentation'
import type { MonthlySummary } from '../lib/monthlySummary'

export function MonthlySummaryCard({ summary, label }: { summary: MonthlySummary; label: string }) {
  const diff = summary.spent - summary.previousSpent
  return <section className="panel summary-card">
    <div className="section-heading"><div><span className="eyebrow">หมูสรุปให้</span><h2>เดือน{label}</h2></div><span className={`icon-disc ${diff > 0 ? 'icon-disc--pink' : 'icon-disc--mint'}`}>{diff > 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}</span></div>
    <div className="forecast-lines">
      <div><span>ใช้จ่ายแล้ว</span><b>{formatMoney(summary.spent)}</b></div>
      <div><span>รายรับ</span><b>{formatMoney(summary.income)}</b></div>
      <div><span>ออมเข้ากระปุก</span><b>{formatMoney(summary.saved)}</b></div>
    </div>
    {summary.hasPrevious
      ? <>
        <p className="summary-lead">{diff === 0 ? 'ใช้เท่าเดือนก่อนพอดี' : diff > 0 ? `ใช้มากกว่าเดือนก่อน ${formatMoney(diff)}` : `ใช้น้อยกว่าเดือนก่อน ${formatMoney(-diff)}`}</p>
        <ul className="summary-changes">{summary.topChanges.map((item) => <li key={item.category}><span>{item.category}</span><b className={item.change > 0 ? 'overdue-text' : 'money-positive'}>{item.change > 0 ? '+' : '−'}{formatMoney(Math.abs(item.change))}</b></li>)}</ul>
      </>
      : <p className="summary-lead">ยังไม่มีข้อมูลเดือนก่อนให้เทียบ จดต่อไปเรื่อย ๆ หมูจะสรุปให้</p>}
  </section>
}
