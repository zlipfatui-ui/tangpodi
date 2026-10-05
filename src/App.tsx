import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDownLeft,
  CircleHelp,
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  Moon,
  PiggyBank,
  Plus,
  Sun,
  WalletCards,
} from 'lucide-react'
import { FinanceDialog, type ActiveDialog, type DialogSubmission } from './components/FinanceDialog'
import { AppDialog, Toast, type ToastMessage } from './components/UI'
import { CoachMarks, PiggyHelpDialog } from './components/PiggyGuide'
import { MorePage } from './morePage'
import { CalendarPage, GoalsPage, HomePage, LedgerPage, SettingsPage, UtilitiesPage } from './pages'
import { markBillPaid, moveGoalMoney, recordDebtPayment } from './lib/actions'
import { buildCalendarFile } from './lib/calendar'
import { createBackupPayload, parseBackup } from './lib/backup'
import { loadFinanceData, requestPersistentStorage, saveFinanceData } from './lib/database'
import { createDemoFinanceData, createEmptyFinanceData } from './lib/data'
import { applyRecurring } from './lib/recurring'
import { getTodayISO, shiftAnchor } from './lib/presentation'
import type { Bill, FinanceData, PeriodView, RecurringItem } from './lib/finance'
import { getSavingStreak } from './lib/streak'
import { getPiggyHint } from './lib/piggyHints'
import { getMonthlySummary } from './lib/monthlySummary'
import './App.css'

type PageName = 'overview' | 'ledger' | 'calendar' | 'goals' | 'more' | 'utilities' | 'settings'
type TabName = 'overview' | 'ledger' | 'goals' | 'more'
const pageNames: Record<PageName, string> = {
  overview: 'หน้าแรก',
  ledger: 'รายการ',
  calendar: 'ปฏิทิน',
  goals: 'กระปุก',
  more: 'เพิ่มเติม',
  utilities: 'เครื่องมือ',
  settings: 'ตั้งค่า',
}
const navigation: Array<{ id: TabName; icon: typeof LayoutDashboard }> = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'ledger', icon: FileText },
  { id: 'goals', icon: WalletCards },
  { id: 'more', icon: MoreHorizontal },
]
// เส้นทางย่อยอยู่ใต้แท็บหลัก: ปฏิทินอยู่กับรายการ, เครื่องมือและตั้งค่าอยู่กับเพิ่มเติม
const tabOf = (page: PageName): TabName => page === 'calendar' ? 'ledger' : page === 'utilities' || page === 'settings' ? 'more' : page
// ช่องที่ 3 ของแถบล่างเป็นปุ่ม + จึงข้ามดัชนีที่ 2
const bottomSlot: Record<TabName, number> = { overview: 0, ledger: 1, goals: 3, more: 4 }
const routeAnimationMs = 340
const onboardingPendingKey = 'tangpodi-onboarding-pending'

function hasPendingGuide() {
  try { return window.localStorage.getItem(onboardingPendingKey) === 'true' } catch { return false }
}

function setPendingGuide(pending: boolean) {
  try {
    if (pending) window.localStorage.setItem(onboardingPendingKey, 'true')
    else window.localStorage.removeItem(onboardingPendingKey)
  } catch { /* The guide still works for the current session. */ }
}

function parsePage(hash: string): PageName {
  const page = hash.replace(/^#\/?/, '') as PageName
  return page in pageNames ? page : 'overview'
}

function downloadFile(contents: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function syncThemeToDocument(theme: FinanceData['settings']['theme']) {
  document.documentElement.setAttribute('data-theme', theme)
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#15121a' : '#fff8fb')
  try { window.localStorage.setItem('tangpodi-theme', theme) } catch { /* Theme still lives in IndexedDB. */ }
}

export default function App() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [page, setPage] = useState<PageName>(() => parsePage(window.location.hash))
  const [leavingPage, setLeavingPage] = useState<PageName | null>(null)
  const [routeDirection, setRouteDirection] = useState<'forward' | 'backward'>('forward')
  const pageRef = useRef(page)
  const routeTimer = useRef<number | null>(null)
  const [view, setView] = useState<PeriodView>('week')
  const [anchor, setAnchor] = useState(getTodayISO())
  const [dialog, setDialog] = useState<ActiveDialog | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [entryTransitionFinished, setEntryTransitionFinished] = useState(false)
  const [guideOpen, setGuideOpen] = useState(hasPendingGuide)
  const dataReady = data !== null
  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const entryTransitionVisible = dataReady && !entryTransitionFinished && !prefersReducedMotion

  const navigate = useCallback((next: PageName) => {
    const current = pageRef.current
    if (current === next) return
    pageRef.current = next
    if (routeTimer.current !== null) window.clearTimeout(routeTimer.current)
    const motionAllowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setRouteDirection(bottomSlot[tabOf(next)] >= bottomSlot[tabOf(current)] ? 'forward' : 'backward')
    setLeavingPage(motionAllowed ? current : null)
    setPage(next)
    if (motionAllowed) routeTimer.current = window.setTimeout(() => { setLeavingPage(null); routeTimer.current = null }, routeAnimationMs)
  }, [])

  useEffect(() => {
    const syncPage = () => navigate(parsePage(window.location.hash))
    window.addEventListener('hashchange', syncPage)
    return () => { window.removeEventListener('hashchange', syncPage); if (routeTimer.current !== null) window.clearTimeout(routeTimer.current) }
  }, [navigate])

  const theme = data?.settings.theme ?? 'light'
  useEffect(() => {
    if (data) syncThemeToDocument(data.settings.theme)
  }, [data])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const stored = await loadFinanceData()
        const loaded = stored ?? createDemoFinanceData()
        const initial = applyRecurring(loaded, getTodayISO())
        if (!stored || initial !== loaded) {
          await saveFinanceData(initial)
        }
        if (!stored) {
          setPendingGuide(true)
          if (active) setGuideOpen(true)
        }
        if (active) { setData(initial); setLoadError('') }
        void requestPersistentStorage().catch(() => false)
      } catch {
        if (active) setLoadError('เปิดข้อมูลในอุปกรณ์นี้ไม่สำเร็จ รีเฟรชหน้าแล้วลองอีกครั้ง')
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3400)
    return () => window.clearTimeout(timer)
  }, [toast])

  const notify = useCallback((text: string, tone: ToastMessage['tone'] = 'success') => {
    setToast({ id: Date.now(), text, tone })
  }, [])

  const persist = useCallback(async (next: FinanceData, successMessage?: string): Promise<boolean> => {
    setSaving(true)
    try {
      await saveFinanceData(next)
      setData(next)
      setLoadError('')
      if (successMessage) notify(successMessage)
      return true
    } catch {
      notify('บันทึกไม่สำเร็จ ข้อมูลเดิมยังอยู่ ลองอีกครั้งได้เลย', 'error')
      return false
    } finally {
      setSaving(false)
    }
  }, [notify])

  const changeTheme = (nextTheme: FinanceData['settings']['theme']) => {
    if (!data || data.settings.theme === nextTheme) return
    void persist({ ...data, settings: { ...data.settings, theme: nextTheme } }, nextTheme === 'dark' ? 'ใช้ธีมมืดแล้ว' : 'ใช้ธีมสว่างแล้ว')
  }

  const ThemeIcon = theme === 'dark' ? Sun : Moon
  const themeActionLabel = theme === 'dark' ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'

  const openPage = (next: PageName) => {
    // oxlint-disable-next-line react/immutability -- the hash is the app's shareable route state.
    if (window.location.hash !== `#${next}`) window.location.hash = next
    navigate(next)
  }

  const dismissHint = (id: string) => {
    if (!data) return
    const piggy = data.piggy ?? { hintsEnabled: true, dismissed: {} }
    void persist({ ...data, piggy: { ...piggy, dismissed: { ...piggy.dismissed, [id]: getTodayISO() } } })
  }
  const toggleHints = (enabled: boolean) => {
    if (!data) return
    const piggy = data.piggy ?? { hintsEnabled: true, dismissed: {} }
    void persist({ ...data, piggy: { ...piggy, hintsEnabled: enabled } }, enabled ? 'หมูจะกลับมาทักทายแล้ว' : 'ปิดคำทักของหมูแล้ว')
  }
  const addRecurring = (item: RecurringItem) => {
    if (!data) return
    void persist(applyRecurring({ ...data, recurring: [...(data.recurring ?? []), item] }, getTodayISO()), 'เพิ่มรายการประจำแล้ว')
  }
  const deleteRecurring = (id: string) => {
    if (!data) return
    void persist({ ...data, recurring: (data.recurring ?? []).filter((item) => item.id !== id) }, 'ลบรายการประจำแล้ว (รายการที่จดไปแล้วยังอยู่)')
  }
  const startTour = () => {
    setHelpOpen(false)
    openPage('overview')
    setGuideOpen(true)
  }
  const saveToday = () => {
    if (!data) return
    const goal = data.goals.find((item) => item.balance < item.target) ?? data.goals[0]
    if (goal) setDialog({ kind: 'goalMovement', goal, direction: 'in' })
    else openPage('goals')
  }

  const closeGuide = () => {
    setPendingGuide(false)
    setGuideOpen(false)
  }

  const startFreshData = () => {
    setPendingGuide(true)
    setGuideOpen(true)
    openPage('overview')
  }

  const closeDialog = () => setDialog(null)
  const saveSubmission = async (submission: DialogSubmission): Promise<boolean> => {
    if (!data) return false
    let next = data
    let message = 'บันทึกแล้ว'
    switch (submission.kind) {
      case 'transaction': {
        const exists = data.transactions.some((item) => item.id === submission.value.id)
        next = { ...data, transactions: exists
          ? data.transactions.map((item) => item.id === submission.value.id ? submission.value : item)
          : [submission.value, ...data.transactions] }
        message = exists ? 'บันทึกการแก้ไขแล้ว' : 'บันทึกรายการแล้ว'
        break
      }
      case 'bill': {
        const exists = data.bills.some((item) => item.id === submission.value.id)
        next = { ...data, bills: exists
          ? data.bills.map((item) => item.id === submission.value.id ? submission.value : item)
          : [submission.value, ...data.bills] }
        message = exists ? 'แก้ไขบิลแล้ว' : 'เพิ่มบิลแล้ว'
        break
      }
      case 'debt': {
        const exists = data.debts.some((item) => item.id === submission.value.id)
        next = { ...data, debts: exists
          ? data.debts.map((item) => item.id === submission.value.id ? submission.value : item)
          : [submission.value, ...data.debts] }
        message = exists ? 'แก้ไขรายการหนี้แล้ว' : 'เพิ่มรายการหนี้แล้ว'
        break
      }
      case 'goal': {
        const exists = data.goals.some((item) => item.id === submission.value.id)
        next = { ...data, goals: exists
          ? data.goals.map((item) => item.id === submission.value.id ? submission.value : item)
          : [submission.value, ...data.goals] }
        message = exists ? 'แก้ไขกระปุกแล้ว' : 'สร้างกระปุกแล้ว'
        break
      }
      case 'goalMovement':
        try {
          next = moveGoalMoney(data, submission.goalId, submission.direction, submission.amount, submission.date, crypto.randomUUID(), submission.note)
          message = submission.direction === 'in' ? 'เติมเงินเข้ากระปุกแล้ว' : 'ถอนเงินจากกระปุกแล้ว'
        } catch (error) { notify(error instanceof Error ? error.message : 'ตรวจยอดเงินอีกครั้ง', 'error'); return false }
        break
      case 'debtPayment':
        try {
          next = recordDebtPayment(data, submission.debtId, submission.amount, submission.date, crypto.randomUUID())
          message = 'บันทึกการชำระหนี้แล้ว'
        } catch (error) { notify(error instanceof Error ? error.message : 'ตรวจยอดเงินอีกครั้ง', 'error'); return false }
        break
      case 'event': {
        const exists = data.events.some((item) => item.id === submission.value.id)
        next = { ...data, events: exists
          ? data.events.map((item) => item.id === submission.value.id ? submission.value : item)
          : [submission.value, ...data.events] }
        message = exists ? 'แก้ไขวันสำคัญแล้ว' : 'เพิ่มวันสำคัญแล้ว'
        break
      }
    }
    const success = await persist(next, message)
    if (success) setDialog(null)
    return success
  }

  const confirmDelete = (type: 'transaction' | 'bill' | 'debt' | 'goal' | 'event', id: string, label: string) => {
    setDialog({ kind: 'delete', label, onConfirm: async () => {
      if (!data) return false
      let next = data
      if (type === 'transaction') next = { ...data, transactions: data.transactions.filter((item) => item.id !== id) }
      if (type === 'bill') next = { ...data, bills: data.bills.filter((item) => item.id !== id), transactions: data.transactions.filter((item) => !(item.linkedType === 'bill' && item.linkedId === id)) }
      if (type === 'debt') next = { ...data, debts: data.debts.filter((item) => item.id !== id), transactions: data.transactions.filter((item) => !(item.linkedType === 'debt' && item.linkedId === id)) }
      if (type === 'goal') next = { ...data, goals: data.goals.filter((item) => item.id !== id), goalMovements: data.goalMovements.filter((item) => item.goalId !== id) }
      if (type === 'event') next = { ...data, events: data.events.filter((item) => item.id !== id) }
      const success = await persist(next, 'ลบรายการแล้ว')
      if (success) setDialog(null)
      return success
    } })
  }

  const markPaid = async (bill: Bill) => {
    if (!data) return
    try {
      const next = markBillPaid(data, bill.id, getTodayISO(), crypto.randomUUID())
      await persist(next, `บันทึกว่าจ่าย ${bill.title} แล้ว`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'บันทึกการชำระไม่สำเร็จ', 'error')
    }
  }

  const downloadBackup = () => {
    if (!data) return
    const date = getTodayISO()
    downloadFile(createBackupPayload(data), `tang-phor-dee-${date}.json`, 'application/json')
    notify('ดาวน์โหลดไฟล์สำรองแล้ว')
  }

  const downloadCalendar = () => {
    if (!data) return
    downloadFile(buildCalendarFile(data), `tang-phor-dee-calendar-${getTodayISO()}.ics`, 'text/calendar;charset=utf-8')
    notify('ดาวน์โหลดนัดหมายแล้ว เพิ่มไฟล์นี้ในปฏิทินมือถือได้เลย', 'info')
  }

  const importBackup = async (file: File) => {
    try {
      const importedData = parseBackup(await file.text())
      setDialog({ kind: 'import', fileName: file.name, onConfirm: async () => {
        const success = await persist(importedData, 'กู้คืนข้อมูลแล้ว')
        if (success) setDialog(null)
        return success
      } })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'อ่านไฟล์สำรองไม่ได้', 'error')
    }
  }

  const clearDemo = () => setDialog({ kind: 'clearDemo', onConfirm: async () => {
    const success = await persist(createEmptyFinanceData(), 'ล้างข้อมูลตัวอย่างแล้ว เริ่มบันทึกได้เลย')
    if (success) { setDialog(null); startFreshData() }
    return success
  } })

  const resetAll = () => setDialog({ kind: 'reset', onConfirm: async () => {
    const success = await persist(createEmptyFinanceData(), 'ล้างข้อมูลทั้งหมดแล้ว')
    if (success) { setDialog(null); startFreshData() }
    return success
  } })

  const title = pageNames[page]
  const activeTab = tabOf(page)
  const navigationButtons = () => navigation.map(({ id, icon: Icon }) => <div className="nav-entry" key={id}><a className={`nav-link${activeTab === id ? ' nav-link--active' : ''}`} href={`#${id}`} data-tour={`nav-${id}`} aria-current={activeTab === id ? 'page' : undefined} onClick={() => openPage(id)}><Icon size={18} strokeWidth={1.9} /><span>{pageNames[id]}</span>{id === 'ledger' && data && data.bills.filter((bill) => !bill.paid).length > 0 && <i className="nav-dot" aria-label="มีบิลรอชำระ" />}</a></div>)
  const listSwitch = (active: 'ledger' | 'calendar') => <div className="segmented list-switch" aria-label="มุมมองรายการ">{([['ledger', 'รายการ'], ['calendar', 'ปฏิทิน']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={active === key} onClick={() => openPage(key)}>{label}</button>)}</div>

  const renderContent = (targetPage: PageName) => {
    if (!data) return null
    const today = getTodayISO()
    const streak = getSavingStreak(data.goalMovements, today)
    switch (targetPage) {
      case 'overview': {
        const hint = getPiggyHint(data, today)
        return <HomePage data={data} anchor={anchor} view={view} streak={streak} hint={hint} summary={getMonthlySummary(data, today.slice(0, 7))} onSaveToday={saveToday} onDismissHint={() => hint && dismissHint(hint.id)} onViewChange={setView} onShift={(direction) => setAnchor((current) => shiftAnchor(current, view, direction))} onNavigate={(next) => openPage(next as PageName)} onQuickAdd={(kind) => setDialog({ kind: 'transaction', presetKind: kind })} onPayBill={(bill) => void markPaid(bill)} onPayDebt={(debt) => setDialog({ kind: 'debtPayment', debt })} />
      }
      case 'ledger': return <>{listSwitch('ledger')}<LedgerPage data={data} anchor={anchor} onShift={(direction) => setAnchor((current) => shiftAnchor(current, 'month', direction))} onAdd={(kind) => setDialog({ kind: 'transaction', presetKind: kind })} onEdit={(transaction) => setDialog({ kind: 'transaction', transaction })} onDelete={confirmDelete} /></>
      case 'calendar': return <>{listSwitch('calendar')}<CalendarPage data={data} anchor={anchor} onShift={(direction) => setAnchor((current) => shiftAnchor(current, 'month', direction))} onAddEvent={(date) => setDialog({ kind: 'event', date })} onAddBill={() => setDialog({ kind: 'bill' })} onAddDebt={() => setDialog({ kind: 'debt' })} onEditBill={(bill) => setDialog({ kind: 'bill', bill })} onEditDebt={(debt) => setDialog({ kind: 'debt', debt })} onPayBill={(bill) => void markPaid(bill)} onPayDebt={(debt) => setDialog({ kind: 'debtPayment', debt })} onEditEvent={(event) => setDialog({ kind: 'event', event })} onDelete={(type, id, label) => confirmDelete(type, id, label)} onExport={downloadCalendar} /></>
      case 'goals': return <GoalsPage data={data} streak={streak} onSaveToday={saveToday} onAdd={() => setDialog({ kind: 'goal' })} onEdit={(goal) => setDialog({ kind: 'goal', goal })} onMove={(goal, direction) => setDialog({ kind: 'goalMovement', goal, direction })} onDelete={(goal) => confirmDelete('goal', goal.id, goal.title)} />
      case 'more': return <MorePage data={data} onNavigate={(next) => openPage(next as PageName)} onTour={startTour} onToggleHints={toggleHints} onAddRecurring={addRecurring} onDeleteRecurring={deleteRecurring} />
      case 'utilities': return <><button className="link-button back-link" type="button" onClick={() => openPage('more')}>← กลับไปเพิ่มเติม</button><UtilitiesPage data={data} onAddBill={(title, amount) => setDialog({ kind: 'bill', title, amount })} /></>
      case 'settings': return <><button className="link-button back-link" type="button" onClick={() => openPage('more')}>← กลับไปเพิ่มเติม</button><SettingsPage data={data} saving={saving} onSave={(settings) => persist({ ...data, settings }, 'บันทึกการตั้งค่าแล้ว')} onThemeChange={changeTheme} onExport={downloadBackup} onImport={(file) => void importBackup(file)} onClearDemo={clearDemo} onReset={resetAll} /></>
    }
  }

  if (loadError) return <main className="load-error"><div className="brand-mark"><WalletCards size={23} /></div><h1>เปิดข้อมูลไม่ได้</h1><p>{loadError}</p><button className="button button--primary" type="button" onClick={() => window.location.reload()}>ลองเปิดอีกครั้ง</button></main>
  if (!data) return <main className="boot-screen" role="status" aria-label="กำลังเปิดแอป" />

  const helpButton = <button className="piggy-help-button" type="button" aria-label="ให้หมูช่วยอธิบายหน้านี้" onClick={() => setHelpOpen(true)}><PiggyBank size={17} /><span>ถามหมู</span></button>

  return <>
    <div className="app-shell" inert={entryTransitionVisible || guideOpen}>
    <aside className="sidebar" aria-label="เมนูหลัก"><a className="brand-lockup" href="#overview" onClick={() => openPage('overview')}><span className="brand-mark"><WalletCards size={22} /></span><span><b>ตังค์พอดี</b><small>วางแผนเงินแบบใจเย็น</small></span></a><button className="button button--primary sidebar-add" type="button" data-tour="add" onClick={() => setAddOpen(true)}><Plus size={17} /> จดรายการ</button><nav className="side-navigation">{navigationButtons()}</nav><div className="sidebar-bottom"><div className="privacy-badge"><span className="privacy-dot" /><span>ข้อมูลอยู่ในอุปกรณ์นี้</span></div><div className="sidebar-note">ค่อย ๆ จัดการไปทีละวัน</div></div></aside>
    <div className="mobile-topbar"><a className="mobile-brand" href="#overview" onClick={() => openPage('overview')}><span className="brand-mark"><WalletCards size={19} /></span><b>ตังค์พอดี</b></a><div className="mobile-topbar-actions">{helpButton}<button className="icon-button theme-toggle" type="button" aria-label={themeActionLabel} title={themeActionLabel} disabled={saving} onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}><ThemeIcon size={18} /></button></div></div>
    <main className="main-area"><div className="main-topline"><div className="breadcrumb"><span>ตังค์พอดี</span><span>/</span><strong>{title}</strong></div><div className="topline-actions">{helpButton}<span className="today-label">ข้อมูลส่วนตัวอยู่ในเครื่องนี้</span><button className="icon-button theme-toggle" type="button" aria-label={themeActionLabel} title={themeActionLabel} disabled={saving} onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}><ThemeIcon size={17} /></button></div></div>
      <div className={`page-stage page-stage--${routeDirection}`}>
        {leavingPage && <div className="content-wrap content-wrap--leave" key={leavingPage} aria-hidden="true" inert>{renderContent(leavingPage)}</div>}
        <div className={`content-wrap${leavingPage ? ' content-wrap--enter' : ''}`} key={page}>{renderContent(page)}</div>
      </div><footer className="app-footer"><span>ตังค์พอดี · จัดเงินได้แบบไม่กดดัน</span><a href="https://museum.li.mahidol.ac.th/color-palettes/" target="_blank" rel="noreferrer">ที่มาสีประจำวัน <CircleHelp size={13} /></a></footer>
    </main>
    <nav className="bottom-navigation" aria-label="เมนูหลัก"><span className="bottom-nav-indicator" style={{ transform: `translateX(${bottomSlot[activeTab] * 100}%)` }} aria-hidden="true" />{navigation.slice(0, 2).map(({ id, icon: Icon }) => <a href={`#${id}`} key={id} data-tour={`nav-${id}`} className={`bottom-nav-link${activeTab === id ? ' bottom-nav-link--active' : ''}`} aria-current={activeTab === id ? 'page' : undefined} onClick={() => openPage(id)}><Icon size={19} /><span>{pageNames[id]}</span></a>)}<button className="fab" type="button" data-tour="add" aria-label="จดรายการ" onClick={() => setAddOpen(true)}><Plus size={26} strokeWidth={2.4} /></button>{navigation.slice(2).map(({ id, icon: Icon }) => <a href={`#${id}`} key={id} data-tour={`nav-${id}`} className={`bottom-nav-link${activeTab === id ? ' bottom-nav-link--active' : ''}`} aria-current={activeTab === id ? 'page' : undefined} onClick={() => openPage(id)}><Icon size={19} /><span>{pageNames[id]}</span></a>)}</nav>
    <FinanceDialog dialog={dialog} onClose={closeDialog} onSave={saveSubmission} />
    <AppDialog open={addOpen} title="จดอะไรดี?" description="เลือกอย่างใดอย่างหนึ่ง" onClose={() => setAddOpen(false)}>
      <div className="add-sheet">
        <button type="button" className="add-sheet-option add-sheet-option--expense" onClick={() => { setAddOpen(false); setDialog({ kind: 'transaction', presetKind: 'expense' }) }}><span className="icon-disc icon-disc--pink"><Plus size={20} /></span><b>จ่ายเงิน</b><small>จดรายจ่ายที่เพิ่งใช้</small></button>
        <button type="button" className="add-sheet-option" onClick={() => { setAddOpen(false); setDialog({ kind: 'transaction', presetKind: 'income' }) }}><span className="icon-disc icon-disc--mint"><ArrowDownLeft size={20} /></span><b>รับเงิน</b><small>จดรายรับที่เข้ามา</small></button>
        <button type="button" className="add-sheet-option" onClick={() => { setAddOpen(false); saveToday() }}><span className="icon-disc icon-disc--turquoise"><PiggyBank size={20} /></span><b>ออมเงิน</b><small>เติมกระปุกและสะสม streak</small></button>
      </div>
    </AppDialog>
    <PiggyHelpDialog page={page} open={helpOpen} onClose={() => setHelpOpen(false)} onTour={startTour} />
    <Toast toast={toast} />
    {entryTransitionVisible && <div className="entry-transition" aria-hidden="true">
      <span className="entry-transition__panel entry-transition__panel--left" onAnimationEnd={() => setEntryTransitionFinished(true)} />
      <span className="entry-transition__panel entry-transition__panel--right" />
    </div>}
    </div>
    {guideOpen && !entryTransitionVisible && <CoachMarks onClose={closeGuide} onFinish={() => { closeGuide(); setDialog({ kind: 'transaction', presetKind: 'expense' }) }} />}
  </>
}
