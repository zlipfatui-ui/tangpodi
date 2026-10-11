import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

/** ปิดป๊อปอัปเมื่อแตะข้างนอกหรือกด Esc */
function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return { open, setOpen, ref }
}

export interface ToonOption { value: string; label: ReactNode }

export function ToonSelect({ id, value, options, onChange }: { id: string; value: string; options: ToonOption[]; onChange: (value: string) => void }) {
  const { open, setOpen, ref } = usePopover()
  const current = options.find((option) => option.value === value) ?? options[0]
  return <div className="toon-pop" ref={ref}>
    <button id={id} type="button" className="toon-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span>{current?.label}</span><ChevronDown size={18} className="toon-chevron" />
    </button>
    {open && <ul className="toon-menu" role="listbox" aria-labelledby={id}>
      {options.map((option) => <li key={option.value}>
        <button type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false) }}>
          <span>{option.label}</span>{option.value === value && <Check size={16} />}
        </button>
      </li>)}
    </ul>}
  </div>
}

const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const todayISO = () => { const now = new Date(); return iso(now.getFullYear(), now.getMonth(), now.getDate()) }

export function ToonDate({ id, value, max, onChange, clearable }: { id: string; value: string; max?: string; onChange: (value: string) => void; clearable?: boolean }) {
  const { open, setOpen, ref } = usePopover()
  const base = new Date(`${value || todayISO()}T00:00:00`)
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() })
  useEffect(() => { if (open) setView({ y: base.getFullYear(), m: base.getMonth() }) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const first = new Date(view.y, view.m, 1).getDay()
  const days = new Date(view.y, view.m + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const shift = (delta: number) => setView(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const today = todayISO()
  const label = value ? new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : 'เลือกวันที่'
  const pick = (date: string) => { onChange(date); setOpen(false) }

  return <div className="toon-pop" ref={ref}>
    <button id={id} type="button" className={`toon-trigger${value ? '' : ' toon-trigger--empty'}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span>{label}</span><CalendarDays size={18} />
    </button>
    {open && <div className="toon-calendar" role="dialog" aria-label="เลือกวันที่">
      <div className="toon-cal-head">
        <button type="button" aria-label="เดือนก่อน" onClick={() => shift(-1)}><ChevronLeft size={18} /></button>
        <b>{new Date(view.y, view.m, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</b>
        <button type="button" aria-label="เดือนถัดไป" onClick={() => shift(1)}><ChevronRight size={18} /></button>
      </div>
      <div className="toon-cal-grid">
        {weekdays.map((day) => <span key={day} className="toon-cal-weekday">{day}</span>)}
        {cells.map((day, index) => {
          if (!day) return <span key={`e${index}`} />
          const date = iso(view.y, view.m, day)
          const disabled = Boolean(max && date > max)
          const cls = ['toon-day', date === value && 'toon-day--picked', date === today && 'toon-day--today'].filter(Boolean).join(' ')
          return <button key={date} type="button" className={cls} disabled={disabled} aria-pressed={date === value} onClick={() => pick(date)}>{day}</button>
        })}
      </div>
      <div className="toon-cal-foot">
        {clearable && <button type="button" className="text-button" onClick={() => pick('')}>ล้าง</button>}
        <button type="button" className="text-button" disabled={Boolean(max && today > max)} onClick={() => pick(today)}>วันนี้</button>
      </div>
    </div>}
  </div>
}
