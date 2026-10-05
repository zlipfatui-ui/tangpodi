import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Flame, Plus, X } from 'lucide-react'
import { AppDialog } from './UI'
import { pageHelp, tourSteps } from '../lib/piggyScript'
import type { PiggyHint } from '../lib/piggyHints'
import type { SavingStreak } from '../lib/streak'
import piggyBankMascot from '../assets/piggy-bank.webp'

function PiggyFace({ size = 56 }: { size?: number }) {
  return <img className="piggy-face" src={piggyBankMascot} width={size} height={Math.round(size * 0.914)} alt="" aria-hidden="true" decoding="async" />
}

function findTarget(name: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)].find((element) => element.getBoundingClientRect().width > 0)
}

interface CoachMarksProps {
  onClose: () => void
  onFinish: () => void
}

/** ทัวร์แบบชี้ของจริงบนหน้าจอ: ไฮไลต์องค์ประกอบทีละขั้น พร้อมหมูอธิบาย */
export function CoachMarks({ onClose, onFinish }: CoachMarksProps) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const current = tourSteps[step]!
  const last = step === tourSteps.length - 1

  useLayoutEffect(() => {
    const measure = () => setRect(findTarget(current.target)?.getBoundingClientRect() ?? null)
    findTarget(current.target)?.scrollIntoView({ block: 'center', behavior: 'instant' })
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [current.target])

  useEffect(() => { nextRef.current?.focus() }, [step])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const below = rect ? rect.bottom < window.innerHeight * 0.55 : true
  const bubbleStyle = rect
    ? below ? { top: rect.bottom + 16 } : { bottom: window.innerHeight - rect.top + 16 }
    : { top: '35%' }

  return <div className="coach" role="dialog" aria-modal="true" aria-label="หมูพาเที่ยวแอป">
    {rect
      ? <span className="coach-spot" style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }} aria-hidden="true" />
      : <span className="coach-dim" aria-hidden="true" />}
    <div className="coach-bubble" style={bubbleStyle} aria-live="polite">
      <PiggyFace size={64} />
      <div className="coach-copy">
        <span className="coach-step">ขั้นที่ {step + 1} จาก {tourSteps.length}</span>
        <h3>{current.title}</h3>
        <p>{current.text}</p>
        <div className="coach-actions">
          <button className="text-button" type="button" onClick={onClose}>ข้าม</button>
          <span>
            {step > 0 && <button className="button button--quiet button--small" type="button" onClick={() => setStep(step - 1)}><ChevronLeft size={15} /> ย้อนกลับ</button>}
            <button ref={nextRef} className="button button--primary button--small" type="button" onClick={() => last ? onFinish() : setStep(step + 1)}>
              {last ? <><Plus size={15} /> เริ่มจดเลย</> : <>ถัดไป <ChevronRight size={15} /></>}
            </button>
          </span>
        </div>
      </div>
    </div>
  </div>
}

export function PiggyHelpDialog({ page, open, onClose, onTour }: { page: string; open: boolean; onClose: () => void; onTour: () => void }) {
  const help = pageHelp[page] ?? pageHelp.overview!
  return <AppDialog open={open} title={`หมูช่วยอธิบาย: ${help.title}`} onClose={onClose}>
    <div className="piggy-help">
      <PiggyFace size={84} />
      <div>
        {help.text.map((line) => <p key={line}>{line}</p>)}
        <button className="button button--quiet button--small" type="button" onClick={onTour}>ให้หมูพาเที่ยวทั้งแอป</button>
      </div>
    </div>
  </AppDialog>
}

export function PiggyHintBanner({ hint, onAction, onDismiss }: { hint: PiggyHint; onAction: (page: string) => void; onDismiss: () => void }) {
  return <section className="piggy-hint" aria-label="หมูทักทาย">
    <PiggyFace size={48} />
    <p>{hint.text}</p>
    {hint.action && <button className="button button--outline button--small" type="button" onClick={() => onAction(hint.action!.page)}>{hint.action.label}</button>}
    <button className="icon-button" type="button" aria-label="ปิดคำทักของหมู" onClick={onDismiss}><X size={16} /></button>
  </section>
}

const dayLetters = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export function StreakCard({ streak, hasGoals, onSave }: { streak: SavingStreak; hasGoals: boolean; onSave: () => void }) {
  const message = streak.savedToday
    ? 'วันนี้ออมแล้ว เก่งมาก! พรุ่งนี้มาออมต่อนะ'
    : streak.current > 0 ? 'ออมวันนี้เพื่อไม่ให้ streak ขาด' : 'ออมวันนี้เพื่อเริ่ม streak ใหม่'
  return <section className="streak-card" aria-label="ออมต่อเนื่อง">
    <div className="streak-main">
      <span className={`streak-flame${streak.current > 0 ? ' streak-flame--on' : ''}`}><Flame size={26} aria-hidden="true" /></span>
      <div>
        <strong>ออมต่อเนื่อง {streak.current} วัน</strong>
        <span>{message} · สถิติสูงสุด {streak.best} วัน</span>
      </div>
      {hasGoals && !streak.savedToday && <button className="button button--primary button--small" type="button" onClick={onSave}><Plus size={15} /> ออมวันนี้</button>}
    </div>
    <ol className="streak-days" aria-label="7 วันล่าสุด">
      {streak.recentDays.map((day) => <li key={day.date} className={day.saved ? 'streak-day streak-day--saved' : 'streak-day'}>
        <span aria-hidden="true">{day.saved && <Check size={14} strokeWidth={3} />}</span>
        <small>{dayLetters[new Date(`${day.date}T12:00:00`).getDay()]}<span className="sr-only">{day.saved ? ' ออมแล้ว' : ' ยังไม่ได้ออม'}</span></small>
      </li>)}
    </ol>
  </section>
}
