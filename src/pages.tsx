import { lazy, Suspense, useState, type FormEvent } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpToLine,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Droplets,
  Edit3,
  FileDown,
  Info,
  Plus,
  Search,
  Sun,
  Moon,
  PiggyBank,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  WalletCards,
  Zap,
} from 'lucide-react'
import { addDays, calculateBudgetSummary, calculateElectricity, calculateWater, getBirthWeekday, getPeriodWindow, type Bill, type CalendarEvent, type Debt, type FinanceData, type MoneyTransaction, type PeriodView, type SavingsGoal } from './lib/finance'
import { formatDate, formatMoney, formatMonth, getMonthGrid, getTodayISO, periodLabel, shiftAnchor } from './lib/presentation'
import { getPersonalLuckyColors, getWeekdayColor } from './lib/luckyColors'
import { FormField } from './components/UI'
import { PiggyHintBanner, StreakCard } from './components/PiggyGuide'
import { MonthlySummaryCard } from './components/MonthlySummaryCard'
import type { PiggyHint } from './lib/piggyHints'
import type { SavingStreak } from './lib/streak'
import type { MonthlySummary } from './lib/monthlySummary'
import piggyBankMascot from './assets/piggy-bank.webp'

const SharedJars = lazy(() => import('./components/SharedJars'))

const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

type DailyNudgeAction = 'calendar' | 'ledger' | 'expense'

interface DailyNudge {
  title: string
  message: string
  actionLabel: string
  action: DailyNudgeAction
}

function getDailyNudge(data: FinanceData, today: string): DailyNudge {
  const obligations = [
    ...data.bills.filter((bill) => !bill.paid).map((bill) => ({ title: bill.title, amount: bill.amount, dueDate: bill.dueDate })),
    ...data.debts.filter((debt) => debt.balance > 0).map((debt) => ({ title: debt.title, amount: debt.installment, dueDate: debt.dueDate })),
  ].sort((left, right) => left.dueDate.localeCompare(right.dueDate))
  const due = obligations.filter((item) => item.dueDate <= today)
  if (due.length) {
    const first = due[0]!
    const overdue = due.some((item) => item.dueDate < today)
    const extraCount = due.length - 1
    return {
      title: overdue ? 'มีรายการค้างเช็กอยู่' : due.length === 1 ? `วันนี้ถึงกำหนด ${first.title}` : `วันนี้มีรายการถึงกำหนด ${due.length} รายการ`,
      message: `${first.title} · ${formatMoney(first.amount)}${extraCount ? ` และอีก ${extraCount} รายการ` : ''} ถ้าจ่ายแล้วอย่าลืมอัปเดตในปฏิทินนะ`,
      actionLabel: 'เช็กปฏิทิน',
      action: 'calendar',
    }
  }

  const todayEvents = data.events.filter((event) => event.date === today)
  if (todayEvents.length) {
    const first = todayEvents[0]!
    return {
      title: `วันนี้มีนัด “${first.title}” แล้วหรือยัง?`,
      message: first.note || 'หมูแวะมาชวนเช็กว่าวันนี้จัดการเรียบร้อยหรือยัง',
      actionLabel: 'เปิดปฏิทิน',
      action: 'calendar',
    }
  }

  const upcoming = obligations.find((item) => item.dueDate <= addDays(today, 3))
  if (upcoming) {
    return {
      title: `ใกล้ถึงกำหนด ${upcoming.title} แล้วนะ`,
      message: `ครบกำหนด ${formatDate(upcoming.dueDate)} ลองเตรียมไว้ก่อนถึงวันจ่ายนะ`,
      actionLabel: 'ดูวันครบกำหนด',
      action: 'calendar',
    }
  }

  const loggedToday = data.transactions.filter((transaction) => transaction.date === today).length
  if (loggedToday) {
    return {
      title: `วันนี้บันทึกแล้ว ${loggedToday} รายการ`,
      message: 'เก่งมากเลย! ถ้ายังมีอะไรตกหล่น ค่อยเติมได้เสมอ',
      actionLabel: 'ดูรายการวันนี้',
      action: 'ledger',
    }
  }

  const weekday = new Date(`${today}T12:00:00`).getDay()
  const prompts: Array<[string, string]> = [
    ['ก่อนเริ่มสัปดาห์ใหม่', 'มีรายจ่ายวันนี้ที่อยากจดไว้ไหม? จดสั้น ๆ แล้วค่อยพักได้เลย'],
    ['เริ่มสัปดาห์ใหม่แล้ว', 'วันนี้มีรายจ่ายอะไรหรือยัง? จดไว้ทีละนิดก็พอ'],
    ['วันนี้จดรายจ่ายหรือยัง?', 'หลังจ่ายแล้วแวะจดได้เลย หมูช่วยรวมยอดให้เอง'],
    ['ถึงกลางสัปดาห์แล้ว', 'มีรายการไหนที่ยังไม่ได้จดไหม? ค่อย ๆ เติมได้เลย'],
    ['วันนี้ใช้เงินไปกับอะไรบ้าง?', 'จดไว้สั้น ๆ แล้วจะเห็นยอดที่เหลือชัดขึ้นนะ'],
    ['ใกล้วันหยุดแล้ว', 'วันนี้จ่ายอะไรไปหรือยัง? จดไว้ก่อนจะได้ไม่ลืม'],
    ['วันนี้มีแผนใช้เงินไหม?', 'ถ้ามีรายจ่ายระหว่างวัน จดหลังจ่ายได้เลยนะ'],
  ]
  const [title, message] = prompts[weekday]!
  return { title, message, actionLabel: 'บันทึกรายจ่าย', action: 'expense' }
}

interface HomePageProps {
  data: FinanceData
  anchor: string
  view: PeriodView
  onViewChange: (view: PeriodView) => void
  onShift: (direction: -1 | 1) => void
  onNavigate: (page: string) => void
  onQuickAdd: (kind: 'income' | 'expense') => void
  onPayBill: (bill: Bill) => void
  onPayDebt: (debt: Debt) => void
  streak: SavingStreak
  hint: PiggyHint | null
  summary: MonthlySummary
  onSaveToday: () => void
  onDismissHint: () => void
}

export function HomePage({ data, anchor, view, streak, hint, summary: monthlySummary, onSaveToday, onDismissHint, onViewChange, onShift, onNavigate, onQuickAdd, onPayBill, onPayDebt }: HomePageProps) {
  const [moreOpen, setMoreOpen] = useState(() => typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(min-width: 1000px)').matches)
  const today = getTodayISO()
  const dailyNudge = getDailyNudge(data, today)
  const summary = calculateBudgetSummary(data, anchor, view)
  const monthSummary = calculateBudgetSummary(data, anchor, 'month')
  const percentage = monthSummary.monthlyAllowance > 0
    ? Math.max(0, Math.min(100, (monthSummary.periodSpent / monthSummary.monthlyAllowance) * 100))
    : 0
  const window = getPeriodWindow(anchor, view, data.settings.weekStartsOn)
  const bars = Array.from({ length: Math.min(7, window.activeDays) }, (_, index) => {
    const date = new Date(`${window.activeStart}T00:00:00.000Z`)
    date.setUTCDate(date.getUTCDate() + index)
    const day = date.toISOString().slice(0, 10)
    const amount = data.transactions
      .filter((transaction) => transaction.kind === 'expense' && !transaction.linkedType && transaction.date === day)
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    return { day, amount }
  })
  const maxBar = Math.max(1, ...bars.map((bar) => bar.amount))
  const reminderEnd = addDays(today, 7)
  const upcomingBills = data.bills.filter((bill) => !bill.paid && bill.dueDate <= reminderEnd).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3)
  const upcomingDebts = data.debts.filter((debt) => debt.balance > 0 && debt.dueDate <= reminderEnd).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3)
  const todayColor = getWeekdayColor(today)!
  const birthWeekday = data.settings.birthday ? getBirthWeekday(data.settings.birthday) : null
  const birthdayColors = birthWeekday === null ? null : getPersonalLuckyColors(birthWeekday)
  const runDailyNudge = () => {
    if (dailyNudge.action === 'calendar' || dailyNudge.action === 'ledger') onNavigate(dailyNudge.action)
    else onQuickAdd('expense')
  }

  return (
    <div className="page-stack">
      {data.isDemo && <div className="demo-banner"><WalletCards size={17} /> <span>นี่คือข้อมูลตัวอย่าง ลองกดดูได้เลย</span><button type="button" className="text-button" onClick={() => onNavigate('settings')}>เริ่มใช้ข้อมูลของฉัน <ChevronRight size={14} /></button></div>}
      {hint && <PiggyHintBanner hint={hint} onAction={onNavigate} onDismiss={onDismissHint} />}
      <div className="period-toolbar">
        <div className="segmented" aria-label="เลือกรอบงบ">
          {([['day', 'วัน'], ['week', 'สัปดาห์'], ['month', 'เดือน']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => onViewChange(key)}>{label}</button>)}
        </div>
        <div className="period-switch" key={`${view}-${anchor}`}><button className="icon-button" type="button" aria-label="ช่วงก่อนหน้า" onClick={() => onShift(-1)}><ChevronLeft size={18} /></button><span>{periodLabel(anchor, view, summary.start, summary.end)}</span><button className="icon-button" type="button" aria-label="ช่วงถัดไป" onClick={() => onShift(1)}><ChevronRight size={18} /></button></div>
      </div>

      <div className="home-grid home-grid--main">
        <section className="wallet-card" key={`${view}-${anchor}`}>
          <div className="wallet-top"><span className="wallet-kicker"><Wallet size={16} /> เงินใช้ได้ใน{view === 'day' ? 'วันนี้' : view === 'week' ? 'สัปดาห์นี้' : 'เดือนนี้'}</span><span className={`status-pill ${summary.periodRemaining < 0 ? 'status-pill--danger' : 'status-pill--mint'}`}>{summary.periodRemaining < 0 ? 'เกินงบแล้ว' : 'ยังไหวอยู่'}</span></div>
          <div data-tour="amount" className={`wallet-amount ${summary.periodRemaining < 0 ? 'wallet-amount--negative' : ''}`}>{formatMoney(summary.periodRemaining)}</div>
          <div className="wallet-caption">จากงบช่วงนี้ {formatMoney(summary.periodAllowance)} · ใช้ไป {formatMoney(summary.periodSpent)}</div>
          <div className="wallet-progress" role="progressbar" aria-label="สัดส่วนงบที่ใช้แล้ว" aria-valuenow={Math.round(Math.min(100, percentage))} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percentage}%` }} /></div>
          <div className="wallet-footer"><span>งบเดือนนี้ {formatMoney(monthSummary.monthlyAllowance)}</span><span>{formatMoney(monthSummary.periodSpent)} ใช้ไปแล้ว</span></div>
          <div className="wallet-stitch" aria-hidden="true" />
        </section>

        <div className="home-side">
          <StreakCard streak={streak} hasGoals={data.goals.length > 0} onSave={onSaveToday} />
          <section className="panel due-card">
            <div className="section-heading"><div><span className="eyebrow">ไม่ปล่อยให้ลืม</span><h2>ใกล้ถึงวันจ่าย</h2></div><button className="link-button" type="button" onClick={() => onNavigate('calendar')}>ปฏิทิน <ChevronRight size={15} /></button></div>
            {[...upcomingBills.map((bill) => ({ id: bill.id, title: bill.title, amount: bill.amount, date: bill.dueDate, kind: 'bill' as const, source: bill })), ...upcomingDebts.map((debt) => ({ id: debt.id, title: debt.title, amount: debt.installment, date: debt.dueDate, kind: 'debt' as const, source: debt }))].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3).map((item) => <div className="due-row" key={`${item.kind}-${item.id}`}><div className="due-icon"><CalendarClock size={16} /></div><div className="due-title"><b>{item.title}</b><span className={item.date < today ? 'overdue-text' : ''}>{item.date < today ? 'เลยกำหนด · ' : ''}{formatDate(item.date)}</span></div><strong>{formatMoney(item.amount)}</strong>{item.kind === 'bill' ? <button className="small-action" type="button" onClick={() => onPayBill(item.source)}>จ่ายแล้ว</button> : <button className="small-action" type="button" onClick={() => onPayDebt(item.source)}>ชำระ</button>}</div>)}
            {upcomingBills.length + upcomingDebts.length === 0 && <div className="empty-inline"><Check size={16} /> ไม่มีรายการใกล้ถึงกำหนด</div>}
          </section>
        </div>
      </div>

      <details className="home-more" open={moreOpen} onToggle={(event) => setMoreOpen(event.currentTarget.open)}>
        <summary><span>ดูเพิ่มเติม</span><small>ประมาณการ กราฟ สรุปเดือน สีมงคล</small><ChevronDown size={18} aria-hidden="true" /></summary>
        <div className="home-more-body">
      <section className="home-welcome">
        <div className="home-welcome__copy">
          <div className="home-welcome__text"><div className="eyebrow"><PiggyBank size={15} /> หมูออมเงิน · {formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>{dailyNudge.title}</h1><p>{dailyNudge.message} <button className="daily-nudge-action" type="button" onClick={runDailyNudge}>{dailyNudge.actionLabel} <ChevronRight size={13} /></button></p></div>
          <div className="welcome-actions"><button className="button button--quiet" type="button" onClick={() => onQuickAdd('income')}><ArrowDownLeft size={17} /> รับเงิน</button><button className="button button--primary" type="button" onClick={() => onQuickAdd('expense')}><Plus size={17} /> เพิ่มรายจ่าย</button></div>
        </div>
        <img className="home-welcome__mascot" src={piggyBankMascot} width="512" height="468" alt="" aria-hidden="true" decoding="async" />
      </section>

          <div className="home-grid">
        <section className="panel forecast-card">
          <div className="section-heading"><div><span className="eyebrow">ประมาณการเดือนนี้</span><h2>ควรเตรียมเงินไว้</h2></div><span className="icon-disc icon-disc--pink"><TrendingUp size={18} /></span></div>
          {!monthSummary.hasHistory && <div className="inline-note"><CircleHelp size={15} /> ยังไม่มีรายจ่ายเดือนก่อน ใช้วงเงินสำรองที่ตั้งไว้</div>}
          <div className="forecast-total">{formatMoney(monthSummary.required)}<span>โดยประมาณ</span></div>
          <div className="forecast-lines">
            <div><span>รายจ่ายทั่วไปเดือนก่อน</span><b>{formatMoney(monthSummary.baseline)}</b></div>
            <div><span>บิลและหนี้เดือนนี้</span><b>{formatMoney(monthSummary.commitments)}</b></div>
            <div><span>ตั้งใจเก็บเข้ากระปุก</span><b>{formatMoney(monthSummary.plannedSavings)}</b></div>
          </div>
          <div className={`forecast-foot ${monthSummary.cashGap > 0 ? 'forecast-foot--warning' : ''}`}><span>รายรับที่คาดไว้ {formatMoney(data.settings.monthlyIncome)}</span><strong>{monthSummary.cashGap > 0 ? `ยังขาด ${formatMoney(monthSummary.cashGap)}` : 'พอสำหรับแผนนี้'}</strong></div>
        </section>

        <section className="panel week-card">
          <div className="section-heading"><div><span className="eyebrow">จังหวะการใช้เงิน</span><h2>วันนี้กับวันก่อน ๆ</h2></div><button className="link-button" type="button" onClick={() => onNavigate('ledger')}>ดูรายการ <ChevronRight size={15} /></button></div>
          <div className="mini-chart" aria-label="กราฟรายจ่ายในช่วงที่เลือก">
            {bars.map(({ day, amount }) => <div className="bar-column" key={day} title={`${formatDate(day)} ${formatMoney(amount)}`}><span className="bar-value">{amount > 0 ? formatMoney(amount) : '–'}</span><div className="bar-track"><span className={day === today ? 'bar-fill bar-fill--today' : 'bar-fill'} style={{ height: `${Math.max(4, amount / maxBar * 100)}%` }} /></div><span className="bar-day">{formatDate(day, { weekday: 'short' })}</span></div>)}
          </div>
          <div className="chart-caption"><TrendingDown size={15} /> รายจ่ายทั่วไป · บิลและเงินออมแยกไว้อีกส่วน</div>
        </section>

        <MonthlySummaryCard summary={monthlySummary} label={formatMonth(`${monthlySummary.month}-01`)} />

        <section className="panel lucky-card">
          <div className="lucky-card-heading"><div><span className="eyebrow">เติมสีสันให้วันนี้</span><h2>สีมงคลแบบละเอียด</h2></div><Info className="lucky-heading-icon" size={21} aria-hidden="true" /></div>
          <div className="lucky-today">
            <span className="lucky-today-swatch" style={{ backgroundColor: todayColor.hex }} aria-hidden="true" />
            <div><span>วันนี้ · วัน{dayNames[todayColor.weekday]} สีประจำวัน</span><strong>{todayColor.label}</strong></div>
          </div>
          {birthdayColors ? <>
            <div className="lucky-profile-heading"><span>สีตามวันเกิดคุณ · วัน{dayNames[birthWeekday!]}</span><span className="lucky-year">ตารางปี 2569</span></div>
            <div className="lucky-profile-grid">{birthdayColors.map((purpose) => <div className={`lucky-profile-row${purpose.key === 'avoid' ? ' lucky-profile-row--avoid' : ''}`} key={purpose.key}>
              <span className="lucky-purpose">{purpose.label}</span><span className="lucky-options">{purpose.colors.map((item) => <span className="lucky-color-option" key={item.label}><i className={`lucky-swatch${item.label === 'ขาว' || item.label === 'ครีม' ? ' lucky-swatch--pale' : ''}`} style={{ backgroundColor: item.hex }} aria-hidden="true" />{item.label}</span>)}</span>
            </div>)}</div>
          </> : <div className="lucky-empty"><span>ตั้งวันเกิดไว้ แล้วจะแสดงสีแยกตามการเงิน การงาน ความรัก และโชคดี</span><button className="link-button" type="button" onClick={() => onNavigate('settings')}>เพิ่มวันเกิด <ChevronRight size={15} /></button></div>}
          <p className="belief-note">สีวันเป็นคติไทย ส่วนสีแยกตามเป้าหมายอ้างอิงตารางปี 2569 · เป็นความเชื่อ ไม่ใช่คำทำนาย</p>
          <a className="lucky-source" href="https://www.ktc.co.th/article/shopping/fashion/birthday-auspicious-color-timetable" target="_blank" rel="noreferrer">ที่มาตารางสีตามวันเกิด · KTC <CircleHelp size={13} /></a>
        </section>

          </div>
        </div>
      </details>
    </div>
  )
}

interface LedgerPageProps {
  data: FinanceData
  anchor: string
  onShift: (direction: -1 | 1) => void
  onAdd: (kind: 'income' | 'expense') => void
  onEdit: (transaction: MoneyTransaction) => void
  onDelete: (type: 'transaction', id: string, label: string) => void
}

export function LedgerPage({ data, anchor, onShift, onAdd, onEdit, onDelete }: LedgerPageProps) {
  const [query, setQuery] = useState('')
  const month = anchor.slice(0, 7)
  const current = data.transactions.filter((item) => item.date.slice(0, 7) === month)
  const previousMonthAnchor = shiftAnchor(`${month}-01`, 'month', -1)
  const previousMonth = previousMonthAnchor.slice(0, 7)
  const previousExpenses = data.transactions.filter((item) => item.date.slice(0, 7) === previousMonth && item.kind === 'expense')
  const currentExpenses = current.filter((item) => item.kind === 'expense')
  const incomeTotal = current.filter((item) => item.kind === 'income').reduce((sum, item) => sum + item.amount, 0)
  const expenseTotal = currentExpenses.reduce((sum, item) => sum + item.amount, 0)
  const categoryComparison = new Map<string, { current: number; previous: number }>()
  for (const item of currentExpenses) categoryComparison.set(item.category, { ...(categoryComparison.get(item.category) ?? { current: 0, previous: 0 }), current: (categoryComparison.get(item.category)?.current ?? 0) + item.amount })
  for (const item of previousExpenses) categoryComparison.set(item.category, { ...(categoryComparison.get(item.category) ?? { current: 0, previous: 0 }), previous: (categoryComparison.get(item.category)?.previous ?? 0) + item.amount })
  const matching = current.filter((item) => `${item.category} ${item.note ?? ''}`.toLocaleLowerCase('th-TH').includes(query.toLocaleLowerCase('th-TH'))).sort((a, b) => b.date.localeCompare(a.date))

  return <div className="page-stack">
    <section className="welcome-row"><div><div className="eyebrow">สมุดเงินเข้าออก</div><h1>รายการของฉัน</h1><p>จดไว้เห็นชัด ค่อยวางแผนต่อได้</p></div><div className="welcome-actions"><button className="button button--quiet" type="button" onClick={() => onAdd('income')}><ArrowDownLeft size={17} /> เพิ่มรายรับ</button><button className="button button--primary" type="button" onClick={() => onAdd('expense')}><Plus size={17} /> เพิ่มรายจ่าย</button></div></section>
    <div className="period-switch period-switch--left" key={anchor.slice(0, 7)}><button className="icon-button" aria-label="เดือนก่อน" type="button" onClick={() => onShift(-1)}><ChevronLeft size={18} /></button><span>{formatMonth(anchor)}</span><button className="icon-button" aria-label="เดือนถัดไป" type="button" onClick={() => onShift(1)}><ChevronRight size={18} /></button></div>
    <div className="ledger-summary"><div className="summary-tile"><span>รายรับ</span><strong className="money-positive">{formatMoney(incomeTotal)}</strong><ArrowDownLeft size={18} /></div><div className="summary-tile"><span>รายจ่าย</span><strong>{formatMoney(expenseTotal)}</strong><ArrowUpRight size={18} /></div><div className="summary-tile"><span>สุทธิ</span><strong className={incomeTotal - expenseTotal < 0 ? 'money-negative' : 'money-positive'}>{formatMoney(incomeTotal - expenseTotal)}</strong><Wallet size={18} /></div></div>
    <section className="panel comparison-panel"><div className="section-heading"><div><span className="eyebrow">เทียบเดือนก่อน</span><h2>หมวดที่ใช้ไป</h2></div><span className="compare-period">{formatMonth(previousMonthAnchor)}</span></div>
      {categoryComparison.size ? <div className="comparison-list">{[...categoryComparison.entries()].sort((a, b) => b[1].current - a[1].current).slice(0, 4).map(([category, amounts]) => { const max = Math.max(amounts.current, amounts.previous, 1); return <div className="comparison-row" key={category}><div><span>{category}</span><b>{formatMoney(amounts.current)}</b></div><div className="compare-bars"><span style={{ width: `${amounts.current / max * 100}%` }} /><i style={{ width: `${amounts.previous / max * 100}%` }} /></div><small>ก่อนหน้า {formatMoney(amounts.previous)}</small></div> })}</div> : <div className="empty-inline">เดือนนี้ยังไม่มีข้อมูลให้เปรียบเทียบ</div>}
    </section>
    <section className="panel ledger-panel"><div className="section-heading"><div><span className="eyebrow">{matching.length} รายการ</span><h2>Statement</h2></div><label className="search-box"><Search size={16} /><input aria-label="ค้นหารายการ" placeholder="ค้นหาหมวดหรือบันทึก" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" aria-label="ล้างคำค้น" onClick={() => setQuery('')}><span>×</span></button>}</label></div>
      {matching.length ? <ul className="transaction-list">{matching.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} onEdit={() => onEdit(transaction)} onDelete={() => onDelete('transaction', transaction.id, transaction.note || transaction.category)} />)}</ul> : <div className="empty-state"><span className="empty-state-icon"><Search size={22} /></span><h3>{query ? 'ไม่เจอรายการนี้' : 'ยังไม่มีรายการในเดือนนี้'}</h3><p>{query ? 'ลองเปลี่ยนคำค้นหาดูนะ' : 'เพิ่มรายรับหรือรายจ่าย แล้วสรุปจะอัปเดตให้ทันที'}</p>{!query && <button className="button button--primary" type="button" onClick={() => onAdd('expense')}><Plus size={16} /> เพิ่มรายการแรก</button>}</div>}
    </section>
  </div>
}

function TransactionRow({ transaction, onEdit, onDelete }: { transaction: MoneyTransaction; onEdit: () => void; onDelete: () => void }) {
  const income = transaction.kind === 'income'
  return <li className="transaction-row"><span className={`transaction-icon ${income ? 'transaction-icon--income' : 'transaction-icon--expense'}`}>{income ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><div className="transaction-main"><b>{transaction.note || transaction.category}</b><span>{transaction.category} · {formatDate(transaction.date)}</span></div><strong className={income ? 'money-positive' : ''}>{income ? '+' : '−'}{formatMoney(transaction.amount)}</strong><div className="row-actions"><button className="icon-button" aria-label={`แก้ไข ${transaction.note || transaction.category}`} type="button" onClick={onEdit}><Edit3 size={15} /></button><button className="icon-button icon-button--danger" aria-label={`ลบ ${transaction.note || transaction.category}`} type="button" onClick={onDelete}><Trash2 size={15} /></button></div></li>
}

interface CalendarPageProps {
  data: FinanceData
  anchor: string
  onShift: (direction: -1 | 1) => void
  onAddEvent: (date: string) => void
  onAddBill: () => void
  onAddDebt: () => void
  onEditBill: (bill: Bill) => void
  onEditDebt: (debt: Debt) => void
  onPayBill: (bill: Bill) => void
  onPayDebt: (debt: Debt) => void
  onEditEvent: (event: CalendarEvent) => void
  onDelete: (type: 'bill' | 'debt' | 'event', id: string, label: string) => void
  onExport: () => void
}

export function CalendarPage({ data, anchor, onShift, onAddEvent, onAddBill, onAddDebt, onEditBill, onEditDebt, onPayBill, onPayDebt, onEditEvent, onDelete, onExport }: CalendarPageProps) {
  const [selectedDateState, setSelectedDate] = useState(() => anchor.slice(0, 7) === getTodayISO().slice(0, 7) ? getTodayISO() : `${anchor.slice(0, 7)}-01`)
  const selectedDate = selectedDateState.slice(0, 7) === anchor.slice(0, 7)
    ? selectedDateState
    : anchor.slice(0, 7) === getTodayISO().slice(0, 7) ? getTodayISO() : `${anchor.slice(0, 7)}-01`
  const cells = getMonthGrid(anchor, data.settings.weekStartsOn)
  const weekdays = Array.from({ length: 7 }, (_, index) => dayNames[(data.settings.weekStartsOn + index) % 7])
  const markers = new Set([...data.events.map((event) => event.date), ...data.bills.filter((bill) => !bill.paid).map((bill) => bill.dueDate), ...data.debts.filter((debt) => debt.balance > 0).map((debt) => debt.dueDate)])
  const dayEvents = data.events.filter((event) => event.date === selectedDate)
  const dayBills = data.bills.filter((bill) => bill.dueDate === selectedDate && !bill.paid)
  const dayDebts = data.debts.filter((debt) => debt.dueDate === selectedDate && debt.balance > 0)
  const dateNumber = (value: string) => Number(value.slice(-2))
  const monthItems = [
    ...data.events.filter((event) => event.date.slice(0, 7) === anchor.slice(0, 7)).map((event) => ({ date: event.date, title: event.title, amount: null as number | null, type: 'event' as const, source: event })),
    ...data.bills.filter((bill) => !bill.paid && bill.dueDate.slice(0, 7) === anchor.slice(0, 7)).map((bill) => ({ date: bill.dueDate, title: bill.title, amount: bill.amount, type: 'bill' as const, source: bill })),
    ...data.debts.filter((debt) => debt.balance > 0 && debt.dueDate.slice(0, 7) === anchor.slice(0, 7)).map((debt) => ({ date: debt.dueDate, title: debt.title, amount: debt.installment, type: 'debt' as const, source: debt })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return <div className="page-stack">
    <section className="welcome-row"><div><div className="eyebrow">วันที่สำคัญและวันจ่าย</div><h1>ปฏิทินการเงิน</h1><p>เห็นบิลล่วงหน้า แล้วแบ่งเงินไว้ทัน</p></div><div className="welcome-actions"><button className="button button--quiet" type="button" onClick={onExport}><FileDown size={17} /> ใส่ปฏิทินมือถือ</button><button className="button button--outline" type="button" onClick={onAddDebt}><Plus size={17} /> เพิ่มหนี้</button><button className="button button--primary" type="button" onClick={onAddBill}><Plus size={17} /> เพิ่มบิล</button></div></section>
    <div className="calendar-layout"><section className="panel calendar-panel"><div className="calendar-head"><div className="period-switch period-switch--left" key={anchor.slice(0, 7)}><button className="icon-button" aria-label="เดือนก่อน" type="button" onClick={() => onShift(-1)}><ChevronLeft size={18} /></button><h2>{formatMonth(anchor)}</h2><button className="icon-button" aria-label="เดือนถัดไป" type="button" onClick={() => onShift(1)}><ChevronRight size={18} /></button></div><button className="button button--quiet button--small" type="button" onClick={() => onAddEvent(selectedDate)}><Plus size={15} /> วันสำคัญ</button></div>
      <table className="calendar-grid"><thead><tr>{weekdays.map((weekday) => <th key={weekday} scope="col">{weekday.slice(0, 1)}</th>)}</tr></thead><tbody>{Array.from({ length: cells.length / 7 }, (_, row) => <tr key={row}>{cells.slice(row * 7, row * 7 + 7).map(({ date, inMonth }) => { const active = selectedDate === date; const isToday = getTodayISO() === date; const marked = markers.has(date); return <td key={date}><button type="button" className={`calendar-day${inMonth ? '' : ' calendar-day--muted'}${active ? ' calendar-day--selected' : ''}${isToday ? ' calendar-day--today' : ''}`} aria-label={`${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${marked ? ' มีรายการ' : ''}`} aria-pressed={active} onClick={() => setSelectedDate(date)}><span>{dateNumber(date)}</span>{marked && <i aria-hidden="true" />}</button></td> })}</tr>)}</tbody></table>
      <div className="calendar-legend"><span><i className="legend-dot legend-dot--pink" /> วันสำคัญ</span><span><i className="legend-dot legend-dot--mint" /> บิลหรือหนี้</span></div>
    </section>
    <section className="panel selected-day-panel"><div className="section-heading"><div><span className="eyebrow">{formatDate(selectedDate, { weekday: 'long' })}</span><h2>{formatDate(selectedDate, { day: 'numeric', month: 'long' })}</h2></div><button className="icon-button" type="button" aria-label="เพิ่มวันสำคัญในวันที่เลือก" onClick={() => onAddEvent(selectedDate)}><Plus size={18} /></button></div>
      {[...dayEvents.map((event) => ({ id: event.id, title: event.title, date: event.date, amount: null as number | null, type: 'event' as const, source: event })), ...dayBills.map((bill) => ({ id: bill.id, title: bill.title, date: bill.dueDate, amount: bill.amount, type: 'bill' as const, source: bill })), ...dayDebts.map((debt) => ({ id: debt.id, title: debt.title, date: debt.dueDate, amount: debt.installment, type: 'debt' as const, source: debt }))].map((item) => <div className="agenda-item" key={`${item.type}-${item.id}`}><span className={`agenda-mark agenda-mark--${item.type}`} /> <div className="agenda-copy"><b>{item.title}</b><span>{item.type === 'event' ? (item.source as CalendarEvent).note || 'วันสำคัญ' : item.type === 'bill' ? 'บิลที่ต้องจ่าย' : 'วันชำระหนี้'}</span></div>{item.amount !== null && <strong>{formatMoney(item.amount)}</strong>}{item.type === 'bill' && <button className="small-action" type="button" onClick={() => onPayBill(item.source as Bill)}>จ่ายแล้ว</button>}{item.type === 'debt' && <button className="small-action" type="button" onClick={() => onPayDebt(item.source as Debt)}>ชำระ</button>}{item.type === 'event' && <><button className="icon-button" type="button" aria-label={`แก้ไข ${item.title}`} onClick={() => onEditEvent(item.source as CalendarEvent)}><Edit3 size={14} /></button><button className="icon-button icon-button--danger" type="button" aria-label={`ลบ ${item.title}`} onClick={() => onDelete('event', item.id, item.title)}><Trash2 size={14} /></button></>}</div>)}
      {!dayEvents.length && !dayBills.length && !dayDebts.length && <div className="empty-inline"><CalendarDays size={17} /> วันนี้ยังว่าง เพิ่มวันสำคัญไว้ได้เลย</div>}
    </section></div>
    <section className="panel month-agenda"><div className="section-heading"><div><span className="eyebrow">รายการทั้งเดือน</span><h2>นัดหมายและกำหนดจ่าย</h2></div><span className="status-pill status-pill--pink">{monthItems.length} รายการ</span></div>{monthItems.length ? <div className="month-list">{monthItems.map((item) => <div className="month-list-row" key={`${item.type}-${item.source.id}`}><span className="month-date">{formatDate(item.date, { day: 'numeric', month: 'short' })}</span><span className={`agenda-mark agenda-mark--${item.type}`} /><b>{item.title}</b>{item.amount !== null && <strong>{formatMoney(item.amount)}</strong>}{item.type === 'event' && <div className="row-actions"><button className="icon-button" aria-label={`แก้ไข ${item.title}`} type="button" onClick={() => onEditEvent(item.source as CalendarEvent)}><Edit3 size={14} /></button><button className="icon-button icon-button--danger" aria-label={`ลบ ${item.title}`} type="button" onClick={() => onDelete('event', item.source.id, item.title)}><Trash2 size={14} /></button></div>}</div>)}</div> : <div className="empty-inline">เดือนนี้ยังไม่มีวันจ่ายหรือวันสำคัญ</div>}</section>
    <section className="panel obligations-panel"><div className="section-heading"><div><span className="eyebrow">รายการที่ต้องติดตาม</span><h2>บิลและหนี้ที่กำลังผ่อน</h2></div><button className="button button--quiet button--small" type="button" onClick={onAddDebt}><Plus size={15} /> เพิ่มหนี้</button></div>
      <div className="obligation-list">{data.bills.map((bill) => <div className="obligation-row" key={`bill-${bill.id}`}><span className="obligation-type obligation-type--bill"><CalendarClock size={15} /></span><div className="obligation-copy"><b>{bill.title}</b><span>{bill.paid ? 'ชำระแล้ว' : `ครบกำหนด ${formatDate(bill.dueDate)}`}{bill.repeatMonthly ? ' · ทุกเดือน' : ''}</span></div><strong>{formatMoney(bill.amount)}</strong>{!bill.paid && <button className="small-action" type="button" onClick={() => onPayBill(bill)}>จ่ายแล้ว</button>}<button className="icon-button" type="button" aria-label={`แก้ไขบิล ${bill.title}`} onClick={() => onEditBill(bill)}><Edit3 size={14} /></button><button className="icon-button icon-button--danger" type="button" aria-label={`ลบบิล ${bill.title}`} onClick={() => onDelete('bill', bill.id, bill.title)}><Trash2 size={14} /></button></div>)}
      {data.debts.map((debt) => <div className="obligation-row" key={`debt-${debt.id}`}><span className="obligation-type obligation-type--debt"><WalletCards size={15} /></span><div className="obligation-copy"><b>{debt.title}</b><span>เหลือ {formatMoney(debt.balance)} · ชำระ {formatMoney(debt.installment)} / รอบ · {formatDate(debt.dueDate)}</span></div><strong>{formatMoney(debt.installment)}</strong><button className="small-action" type="button" onClick={() => onPayDebt(debt)}>ชำระ</button><button className="icon-button" type="button" aria-label={`แก้ไขหนี้ ${debt.title}`} onClick={() => onEditDebt(debt)}><Edit3 size={14} /></button><button className="icon-button icon-button--danger" type="button" aria-label={`ลบหนี้ ${debt.title}`} onClick={() => onDelete('debt', debt.id, debt.title)}><Trash2 size={14} /></button></div>)}
      {!data.bills.length && !data.debts.length && <div className="empty-inline">เพิ่มบิลหรือยอดผ่อน เพื่อให้แอปช่วยเตือนก่อนถึงวันจ่าย</div>}</div></section>
  </div>
}

interface GoalsPageProps {
  data: FinanceData
  onAdd: () => void
  onEdit: (goal: SavingsGoal) => void
  onMove: (goal: SavingsGoal, direction: 'in' | 'out') => void
  onDelete: (goal: SavingsGoal) => void
  streak: SavingStreak
  onSaveToday: () => void
}

export function GoalsPage({ data, streak, onSaveToday, onAdd, onEdit, onMove, onDelete }: GoalsPageProps) {
  const [tab, setTab] = useState<'mine' | 'friends'>(() => /^#\/?join\//.test(window.location.hash) ? 'friends' : 'mine')
  const totalBalance = data.goals.reduce((sum, goal) => sum + goal.balance, 0)
  const totalTarget = data.goals.reduce((sum, goal) => sum + goal.target, 0)
  const movements = data.goalMovements.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  return <div className="page-stack"><section className="welcome-row"><div><div className="eyebrow">เงินก้อนเล็กที่มีความหมาย</div><h1>กระปุกของฉัน</h1><p>เก็บทีละนิด ให้เป้าหมายค่อย ๆ ใกล้เข้ามา</p></div><button className="button button--primary" type="button" onClick={onAdd}><Plus size={17} /> สร้างกระปุก</button></section>
    <StreakCard streak={streak} hasGoals={data.goals.length > 0} onSave={onSaveToday} />
    <div className="segmented list-switch" aria-label="ประเภทกระปุก">{([['mine', 'ของฉัน'], ['friends', 'กับเพื่อน']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === 'friends' ? <Suspense fallback={<section className="panel"><div className="empty-inline">กำลังเปิดกระปุกกับเพื่อน…</div></section>}><SharedJars /></Suspense> : <>
    <section className="savings-overview"><div className="savings-overview-icon"><Wallet size={24} /></div><div><span>รวมเงินในกระปุก</span><strong>{formatMoney(totalBalance)}</strong></div><div className="savings-overview-divider" /><div><span>เป้าหมายทั้งหมด</span><strong>{formatMoney(totalTarget)}</strong></div></section>
    {data.goals.length ? <div className="goal-grid">{data.goals.map((goal, index) => { const percent = goal.target ? Math.min(100, goal.balance / goal.target * 100) : 0; const GoalIcon = index % 3 === 0 ? WalletCards : index % 3 === 1 ? Wallet : Target; return <article className={`goal-card goal-card--${index % 3}`} key={goal.id}><div className="goal-card-top"><span className="goal-symbol"><GoalIcon size={18} strokeWidth={1.8} /></span><button className="icon-button" type="button" onClick={() => onEdit(goal)} aria-label={`แก้ไขกระปุก ${goal.title}`}><Edit3 size={15} /></button></div><h2>{goal.title}</h2><strong className="goal-balance">{formatMoney(goal.balance)}</strong><span className="goal-target">จากเป้าหมาย {formatMoney(goal.target)}</span><div className="goal-progress" role="progressbar" aria-label={`ความคืบหน้า ${goal.title}`} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div><div className="goal-percent"><span>{Math.round(percent)}% แล้ว</span><span>ตั้งใจเก็บ {formatMoney(goal.monthlyPlan)}/เดือน</span></div><div className="goal-actions"><button type="button" className="button button--primary button--small" onClick={() => onMove(goal, 'in')}><Plus size={15} /> เติมเงิน</button><button type="button" className="button button--outline button--small" onClick={() => onMove(goal, 'out')}><ArrowUpToLine size={15} /> ถอนเงิน</button><button type="button" className="icon-button icon-button--danger" aria-label={`ลบกระปุก ${goal.title}`} onClick={() => onDelete(goal)}><Trash2 size={15} /></button></div></article> })}</div> : <div className="panel empty-state"><span className="empty-state-icon"><Wallet size={22} /></span><h3>เริ่มกระปุกใบแรก</h3><p>ตั้งเป้าหมาย แล้วบันทึกเงินที่แบ่งไว้</p><button className="button button--primary" type="button" onClick={onAdd}><Plus size={16} /> สร้างกระปุก</button></div>}
    <section className="panel"><div className="section-heading"><div><span className="eyebrow">รายการเคลื่อนไหวล่าสุด</span><h2>เงินเข้าออกกระปุก</h2></div><span className="icon-disc icon-disc--mint"><ArrowDownLeft size={18} /></span></div>{movements.length ? <ul className="transaction-list">{movements.map((movement) => { const goal = data.goals.find((item) => item.id === movement.goalId); return <li className="transaction-row" key={movement.id}><span className={`transaction-icon ${movement.direction === 'in' ? 'transaction-icon--income' : 'transaction-icon--expense'}`}>{movement.direction === 'in' ? <ArrowDownLeft size={17} /> : <ArrowUpToLine size={17} />}</span><div className="transaction-main"><b>{goal?.title ?? 'กระปุกที่ลบแล้ว'}</b><span>{movement.note || (movement.direction === 'in' ? 'เติมกระปุก' : 'ถอนเงิน')} · {formatDate(movement.date)}</span></div><strong className={movement.direction === 'in' ? 'money-positive' : ''}>{movement.direction === 'in' ? '+' : '−'}{formatMoney(movement.amount)}</strong></li> })}</ul> : <div className="empty-inline">ยังไม่มีรายการเคลื่อนไหว</div>}</section>
    </>}
  </div>
}

export function UtilitiesPage({ data, onAddBill }: { data: FinanceData; onAddBill: (title: string, amount: number) => void }) {
  const [devices, setDevices] = useState([{ name: 'เครื่องปรับอากาศ', watts: '900', hours: '6', days: '30' }])
  const [previousMeter, setPreviousMeter] = useState('120')
  const [currentMeter, setCurrentMeter] = useState('128')
  const power = calculateElectricity(devices.map((device) => ({ watts: Number(device.watts) || 0, hoursPerDay: Number(device.hours) || 0, days: Number(device.days) || 0 })), data.settings.electricityRate)
  const water = calculateWater(Number(previousMeter) || 0, Number(currentMeter) || 0, data.settings.waterRate, data.settings.waterServiceFee)
  return <div className="page-stack"><section className="welcome-row"><div><div className="eyebrow">คำนวณก่อนถึงบิล</div><h1>เครื่องคิดค่าน้ำค่าไฟ</h1><p>ปรับราคา/หน่วยได้ในตั้งค่า ผลลัพธ์เป็นค่าประมาณ</p></div><span className="icon-disc icon-disc--turquoise"><Zap size={20} /></span></section>
    <div className="utility-grid"><section className="panel utility-panel"><div className="utility-heading"><span className="utility-icon utility-icon--electric"><Zap size={18} /></span><div><h2>ค่าไฟจากวัตต์</h2><p>วัตต์ × ชั่วโมง × วัน ÷ 1,000 × ค่าไฟต่อหน่วย</p></div></div><div className="device-list">{devices.map((device, index) => <div className="device-row" key={index}><FormField id={`device-name-${index}`} label="เครื่องใช้ไฟฟ้า"><input id={`device-name-${index}`} value={device.name} onChange={(event) => setDevices((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /></FormField><FormField id={`device-watts-${index}`} label="วัตต์"><input id={`device-watts-${index}`} type="number" min="0" inputMode="decimal" value={device.watts} onChange={(event) => setDevices((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, watts: event.target.value } : item))} /></FormField><FormField id={`device-hours-${index}`} label="ชม./วัน"><input id={`device-hours-${index}`} type="number" min="0" max="24" inputMode="decimal" value={device.hours} onChange={(event) => setDevices((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, hours: event.target.value } : item))} /></FormField><FormField id={`device-days-${index}`} label="วัน"><input id={`device-days-${index}`} type="number" min="0" max="31" inputMode="numeric" value={device.days} onChange={(event) => setDevices((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, days: event.target.value } : item))} /></FormField><button className="icon-button icon-button--danger" aria-label={`ลบ ${device.name}`} type="button" disabled={devices.length === 1} onClick={() => setDevices((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button></div>)}</div><button className="text-button" type="button" onClick={() => setDevices((items) => [...items, { name: '', watts: '', hours: '', days: '30' }])}><Plus size={15} /> เพิ่มเครื่องใช้ไฟฟ้า</button><div className="utility-result"><div><span>ประมาณค่าไฟ</span><strong>{formatMoney(power)}</strong></div><span>{data.settings.electricityRate.toLocaleString('th-TH')} บาท/หน่วย</span></div><button className="button button--outline button--small" type="button" onClick={() => onAddBill('ค่าไฟโดยประมาณ', Math.round(power))} disabled={power <= 0}><CalendarClock size={15} /> เพิ่มเป็นบิล</button></section>
    <section className="panel utility-panel"><div className="utility-heading"><span className="utility-icon utility-icon--water"><Droplets size={18} /></span><div><h2>ค่าน้ำจากมิเตอร์</h2><p>ผลต่างลูกบาศก์เมตร × ราคาต่อหน่วย</p></div></div><div className="water-meter-fields"><FormField id="previous-meter" label="เลขมิเตอร์ครั้งก่อน"><input id="previous-meter" type="number" min="0" inputMode="decimal" value={previousMeter} onChange={(event) => setPreviousMeter(event.target.value)} /></FormField><ChevronRight size={18} /><FormField id="current-meter" label="เลขมิเตอร์ครั้งนี้"><input id="current-meter" type="number" min="0" inputMode="decimal" value={currentMeter} onChange={(event) => setCurrentMeter(event.target.value)} /></FormField></div><div className="water-usage"><Droplets size={16} /><span>ใช้น้ำ {Math.max(0, (Number(currentMeter) || 0) - (Number(previousMeter) || 0)).toLocaleString('th-TH')} หน่วย</span></div><div className="utility-result"><div><span>ประมาณค่าน้ำ</span><strong>{formatMoney(water)}</strong></div><span>{data.settings.waterRate} บาท/หน่วย + ค่าบริการ {formatMoney(data.settings.waterServiceFee)}</span></div><button className="button button--outline button--small" type="button" onClick={() => onAddBill('ค่าน้ำโดยประมาณ', Math.round(water))} disabled={water <= 0}><CalendarClock size={15} /> เพิ่มเป็นบิล</button></section></div>
    <div className="inline-note"><CircleHelp size={15} /> ไม่รวมภาษี อัตราขั้นบันได หรือค่าบริการอื่นจากผู้ให้บริการ ตั้งราคา/หน่วยและค่าบริการได้ในหน้าตั้งค่า</div>
  </div>
}

interface SettingsPageProps {
  data: FinanceData
  saving: boolean
  onSave: (settings: FinanceData['settings']) => Promise<boolean>
  onThemeChange: (theme: FinanceData['settings']['theme']) => void
  onExport: () => void
  onImport: (file: File) => void
  onClearDemo: () => void
  onReset: () => void
}

export function SettingsPage({ data, saving, onSave, onThemeChange, onExport, onImport, onClearDemo, onReset }: SettingsPageProps) {
  const [settings, setSettings] = useState(data.settings)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const updateNumber = (key: keyof FinanceData['settings'], value: string) => setSettings((current) => ({ ...current, [key]: Number(value) || 0 }))
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (settings.monthlyIncome < 0) nextErrors.income = 'รายรับต้องไม่ติดลบ'
    if (settings.birthday && settings.birthday > getTodayISO()) nextErrors.birthday = 'วันเกิดต้องไม่เกินวันนี้'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    await onSave({ ...settings, theme: data.settings.theme })
  }
  return <div className="page-stack"><section className="welcome-row"><div><div className="eyebrow">ปรับให้เข้ากับชีวิตของคุณ</div><h1>ตั้งค่า</h1><p>ข้อมูลเก็บไว้ในเบราว์เซอร์ของอุปกรณ์นี้</p></div><span className="icon-disc icon-disc--pink"><Wallet size={19} /></span></section>
    <section className="panel theme-panel"><div><span className="eyebrow">ปรับบรรยากาศ</span><h2>ธีมหน้าจอ</h2><p>เลือกโทนขาวหรือดำ ไอคอน SVG จะปรับสีตามธีม</p></div><div className="segmented theme-switch" role="group" aria-label="ธีมหน้าจอ"><button type="button" aria-pressed={data.settings.theme === 'light'} onClick={() => onThemeChange('light')}><Sun size={16} /> สว่าง</button><button type="button" aria-pressed={data.settings.theme === 'dark'} onClick={() => onThemeChange('dark')}><Moon size={16} /> มืด</button></div></section>
    <form className="panel settings-form" noValidate onSubmit={handleSubmit}><div className="section-heading"><div><span className="eyebrow">แผนรายเดือน</span><h2>รายรับและงบที่ใช้ตั้งต้น</h2></div></div><div className="settings-grid"><FormField id="monthly-income" label="รายรับที่คาดไว้ต่อเดือน" error={errors.income}><div className="input-suffix"><input id="monthly-income" type="number" min="0" inputMode="decimal" value={settings.monthlyIncome} aria-invalid={Boolean(errors.income)} onChange={(event) => updateNumber('monthlyIncome', event.target.value)} /><span>บาท</span></div></FormField><FormField id="fallback-budget" label="วงเงินสำรองเมื่อยังไม่มีข้อมูลเดือนก่อน" hint="ใช้ประมาณงบจนมีประวัติรายจ่าย"><div className="input-suffix"><input id="fallback-budget" type="number" min="0" inputMode="decimal" value={settings.fallbackBudget} onChange={(event) => updateNumber('fallbackBudget', event.target.value)} /><span>บาท</span></div></FormField><FormField id="week-start" label="เริ่มสัปดาห์ในวัน"><select id="week-start" value={settings.weekStartsOn} onChange={(event) => updateNumber('weekStartsOn', event.target.value)}>{dayNames.map((day, index) => <option value={index} key={day}>วัน{day}</option>)}</select></FormField><FormField id="birthday" label="วันเกิด" error={errors.birthday} hint="ใช้แสดงสีตามวันเกิด">
      <input id="birthday" type="date" max={getTodayISO()} value={settings.birthday ?? ''} aria-invalid={Boolean(errors.birthday)} onChange={(event) => setSettings((current) => ({ ...current, birthday: event.target.value || null }))} />
    </FormField></div><div className="form-divider" /><div className="section-heading"><div><span className="eyebrow">ประมาณค่าสาธารณูปโภค</span><h2>ราคาต่อหน่วย</h2></div></div><div className="settings-grid"><FormField id="electricity-rate" label="ค่าไฟ"><div className="input-suffix"><input id="electricity-rate" type="number" min="0" inputMode="decimal" value={settings.electricityRate} onChange={(event) => updateNumber('electricityRate', event.target.value)} /><span>บาท/หน่วย</span></div></FormField><FormField id="water-rate" label="ค่าน้ำ"><div className="input-suffix"><input id="water-rate" type="number" min="0" inputMode="decimal" value={settings.waterRate} onChange={(event) => updateNumber('waterRate', event.target.value)} /><span>บาท/หน่วย</span></div></FormField><FormField id="water-service" label="ค่าบริการน้ำ"><div className="input-suffix"><input id="water-service" type="number" min="0" inputMode="decimal" value={settings.waterServiceFee} onChange={(event) => updateNumber('waterServiceFee', event.target.value)} /><span>บาท/รอบ</span></div></FormField></div><div className="settings-footer"><span>{saving ? 'กำลังบันทึก…' : 'แก้ไขแล้วกดบันทึกเพื่อใช้กับแผนของคุณ'}</span><button className="button button--primary" type="submit" disabled={saving}><Check size={16} /> บันทึกการตั้งค่า</button></div></form>
    <section className="panel backup-panel"><div className="section-heading"><div><span className="eyebrow">ข้อมูลในเครื่อง</span><h2>สำรองและกู้คืน</h2></div><span className="icon-disc icon-disc--turquoise"><FileDown size={18} /></span></div><p>ส่งออกเป็นไฟล์ JSON เพื่อย้ายอุปกรณ์ หรือกู้คืนหลังล้างข้อมูลเบราว์เซอร์ ไฟล์สำรองเก็บข้อมูลส่วนตัวของคุณไว้ด้วย</p><div className="backup-actions"><button className="button button--outline" type="button" onClick={onExport}><FileDown size={16} /> ดาวน์โหลดไฟล์สำรอง</button><label className="button button--quiet file-label"><input type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setFileName(file.name); onImport(file) }; event.currentTarget.value = '' }} />นำเข้าไฟล์สำรอง <ChevronDown size={15} /></label></div>{fileName && <span className="field-hint">เลือกไฟล์ {fileName}</span>}</section>
    <section className="panel local-data-panel"><div className="section-heading"><div><span className="eyebrow">เก็บไว้ในอุปกรณ์</span><h2>{data.isDemo ? 'กำลังดูข้อมูลตัวอย่าง' : 'ข้อมูลของฉัน'}</h2></div><span className="status-pill status-pill--mint">IndexedDB</span></div><p>ข้อมูลไม่ถูกส่งไปเซิร์ฟเวอร์ และยังไม่ซิงก์ข้ามอุปกรณ์ ควรดาวน์โหลดไฟล์สำรองเป็นครั้งคราว</p><div className="backup-actions">{data.isDemo && <button className="button button--primary" type="button" onClick={onClearDemo}>ล้างตัวอย่างแล้วเริ่มใหม่</button>}<button className="button button--danger-quiet" type="button" onClick={onReset}>ล้างข้อมูลทั้งหมด</button></div></section>
  </div>
}
