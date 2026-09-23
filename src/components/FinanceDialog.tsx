import { useState, type FormEvent } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Check, Trash2 } from 'lucide-react'
import { AppDialog, FormField } from './UI'
import { formatMoney, getTodayISO } from '../lib/presentation'
import type { Bill, CalendarEvent, Debt, MoneyTransaction, SavingsGoal } from '../lib/finance'

export type ActiveDialog =
  | { kind: 'transaction'; transaction?: MoneyTransaction; presetKind?: 'income' | 'expense' }
  | { kind: 'bill'; bill?: Bill; title?: string; amount?: number }
  | { kind: 'debt'; debt?: Debt }
  | { kind: 'goal'; goal?: SavingsGoal }
  | { kind: 'goalMovement'; goal: SavingsGoal; direction: 'in' | 'out' }
  | { kind: 'event'; event?: CalendarEvent; date?: string }
  | { kind: 'debtPayment'; debt: Debt }
  | { kind: 'delete'; label: string; onConfirm: () => Promise<boolean> }
  | { kind: 'import'; fileName: string; onConfirm: () => Promise<boolean> }
  | { kind: 'clearDemo'; onConfirm: () => Promise<boolean> }
  | { kind: 'reset'; onConfirm: () => Promise<boolean> }

export type DialogSubmission =
  | { kind: 'transaction'; value: MoneyTransaction }
  | { kind: 'bill'; value: Bill }
  | { kind: 'debt'; value: Debt }
  | { kind: 'goal'; value: SavingsGoal }
  | { kind: 'goalMovement'; goalId: string; direction: 'in' | 'out'; amount: number; note: string; date: string }
  | { kind: 'event'; value: CalendarEvent }
  | { kind: 'debtPayment'; debtId: string; amount: number; date: string }

interface FinanceDialogProps {
  dialog: ActiveDialog | null
  onClose: () => void
  onSave: (submission: DialogSubmission) => Promise<boolean>
}

function makeId() {
  return crypto.randomUUID()
}

function DialogForm({
  title,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'บันทึก',
  saving = false,
}: {
  title: string
  children: ReactNode
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  submitLabel?: string
  saving?: boolean
}) {
  return <form className="form-stack" aria-label={title} noValidate onSubmit={onSubmit}><div className="form-content">{children}</div><div className="dialog-actions"><button className="button button--quiet" type="button" onClick={onCancel}>ยกเลิก</button><button className="button button--primary" type="submit" disabled={saving}><Check size={16} />{saving ? 'กำลังบันทึก…' : submitLabel}</button></div></form>
}

export function FinanceDialog({ dialog, onClose, onSave }: FinanceDialogProps) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (submission: DialogSubmission) => {
    setError('')
    setSaving(true)
    const success = await onSave(submission)
    setSaving(false)
    if (!success) setError('บันทึกไม่สำเร็จ ลองอีกครั้งได้เลย')
  }

  if (!dialog) return <AppDialog open={false} title="" onClose={onClose}><span /></AppDialog>

  if (dialog.kind === 'transaction') {
    const item = dialog.transaction
    const kind = item?.kind ?? dialog.presetKind ?? 'expense'
    const categoryOptions = kind === 'income' ? ['เงินเดือน', 'งานเสริม', 'ของขวัญ', 'รายรับอื่น'] : ['อาหาร', 'ของกินของใช้', 'เดินทาง', 'บ้าน', 'สุขภาพ', 'กินข้างนอก', 'ช้อปปิ้ง', 'อื่น ๆ']
    return <TransactionDialog key={item?.id ?? dialog.presetKind ?? 'transaction-new'} item={item} presetKind={kind as 'income' | 'expense'} categories={categoryOptions} error={error} saving={saving} onClose={onClose} onSubmit={submit} />
  }

  if (dialog.kind === 'bill') return <BillDialog key={dialog.bill?.id ?? dialog.title ?? 'bill-new'} bill={dialog.bill} title={dialog.title} amount={dialog.amount} error={error} saving={saving} onClose={onClose} onSubmit={submit} />
  if (dialog.kind === 'debt') return <DebtDialog key={dialog.debt?.id ?? 'debt-new'} debt={dialog.debt} error={error} saving={saving} onClose={onClose} onSubmit={submit} />
  if (dialog.kind === 'goal') return <GoalDialog key={dialog.goal?.id ?? 'goal-new'} goal={dialog.goal} error={error} saving={saving} onClose={onClose} onSubmit={submit} />
  if (dialog.kind === 'event') return <EventDialog key={dialog.event?.id ?? dialog.date ?? 'event-new'} event={dialog.event} date={dialog.date} error={error} saving={saving} onClose={onClose} onSubmit={submit} />
  if (dialog.kind === 'goalMovement') return <GoalMovementDialog goal={dialog.goal} direction={dialog.direction} error={error} saving={saving} onClose={onClose} onSubmit={submit} />
  if (dialog.kind === 'debtPayment') return <DebtPaymentDialog debt={dialog.debt} error={error} saving={saving} onClose={onClose} onSubmit={submit} />

  const settingsDialog = dialog.kind === 'delete'
    ? { title: 'ลบรายการนี้ไหม', description: `ลบ “${dialog.label}” ออกจากข้อมูลในเครื่อง`, action: 'ลบรายการ', icon: <Trash2 size={18} /> }
    : dialog.kind === 'import'
      ? { title: 'แทนที่ข้อมูลปัจจุบัน?', description: `กู้คืนข้อมูลจากไฟล์ ${dialog.fileName} ข้อมูลทั้งหมดในเบราว์เซอร์นี้จะถูกแทนที่`, action: 'กู้คืนข้อมูล', icon: <AlertTriangle size={18} /> }
      : dialog.kind === 'clearDemo'
        ? { title: 'เริ่มบันทึกข้อมูลจริง?', description: 'ลบรายการตัวอย่างออกทั้งหมด แล้วเริ่มต้นด้วยข้อมูลว่าง', action: 'ล้างตัวอย่าง', icon: <AlertTriangle size={18} /> }
        : { title: 'ล้างข้อมูลทั้งหมด?', description: 'รายการ รายรับรายจ่าย หนี้ และกระปุกในอุปกรณ์นี้จะถูกลบถาวร ดาวน์โหลดไฟล์สำรองก่อนถ้าต้องการเก็บข้อมูลไว้', action: 'ล้างข้อมูลทั้งหมด', icon: <AlertTriangle size={18} /> }
  const confirm = async () => {
    setSaving(true)
    const success = dialog.kind === 'delete' || dialog.kind === 'import' || dialog.kind === 'clearDemo' || dialog.kind === 'reset'
      ? await dialog.onConfirm()
      : false
    setSaving(false)
    if (!success) setError('ทำรายการไม่สำเร็จ ข้อมูลเดิมยังอยู่ ลองอีกครั้งได้เลย')
  }
  return <AppDialog open title={settingsDialog.title} description={settingsDialog.description} onClose={onClose}>
    <div className="confirm-content"><span className="confirm-icon">{settingsDialog.icon}</span><p>{settingsDialog.description}</p>{error && <div className="field-error" role="alert">{error}</div>}<div className="dialog-actions"><button className="button button--quiet" type="button" onClick={onClose}>ยกเลิก</button><button className={`button ${dialog.kind === 'delete' || dialog.kind === 'reset' ? 'button--danger' : 'button--primary'}`} type="button" onClick={() => void confirm()} disabled={saving}>{settingsDialog.action}</button></div></div>
  </AppDialog>
}

function TransactionDialog({ item, presetKind, categories, error, saving, onClose, onSubmit }: { item?: MoneyTransaction; presetKind: 'income' | 'expense'; categories: string[]; error: string; saving: boolean; onClose: () => void; onSubmit: (submission: DialogSubmission) => void }) {
  const [kind, setKind] = useState<'income' | 'expense'>(item?.kind ?? presetKind)
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  const [category, setCategory] = useState(item?.category ?? categories[0])
  const [date, setDate] = useState(item?.date ?? getTodayISO())
  const [note, setNote] = useState(item?.note ?? '')
  const [validation, setValidation] = useState('')
  const options = kind === 'income' ? ['เงินเดือน', 'งานเสริม', 'ของขวัญ', 'รายรับอื่น'] : ['อาหาร', 'ของกินของใช้', 'เดินทาง', 'บ้าน', 'สุขภาพ', 'กินข้างนอก', 'ช้อปปิ้ง', 'อื่น ๆ']
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amountValue = Number(amount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) { setValidation('กรอกจำนวนเงินมากกว่า 0 บาท'); return }
    if (!date) { setValidation('เลือกวันที่ของรายการ'); return }
    setValidation('')
    void onSubmit({ kind: 'transaction', value: { id: item?.id ?? makeId(), date, kind, amount: amountValue, category, note: note.trim() } })
  }
  return <AppDialog open title={item ? 'แก้ไขรายการ' : 'เพิ่มรายการ'} description="จำนวนเงินใช้หน่วยบาท" onClose={onClose}>
    <DialogForm title="บันทึกรายการ" onSubmit={handleSubmit} onCancel={onClose} saving={saving} submitLabel={item ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}>
      <div className="segmented form-toggle" aria-label="ประเภทรายการ"><button type="button" aria-pressed={kind === 'expense'} onClick={() => { setKind('expense'); setCategory('อาหาร') }}><ArrowUpRight size={15} /> รายจ่าย</button><button type="button" aria-pressed={kind === 'income'} onClick={() => { setKind('income'); setCategory('เงินเดือน') }}><ArrowDownLeft size={15} /> รายรับ</button></div>
      <FormField id="transaction-amount" label="จำนวนเงิน" error={validation}><div className="input-suffix"><input id="transaction-amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} autoFocus={!item} onChange={(event) => setAmount(event.target.value)} placeholder="0" /><span>บาท</span></div></FormField>
      <FormField id="transaction-category" label="หมวดหมู่"><select id="transaction-category" value={category} onChange={(event) => setCategory(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></FormField>
      <FormField id="transaction-date" label="วันที่"><input id="transaction-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></FormField>
      <FormField id="transaction-note" label="บันทึกเพิ่มเติม"><input id="transaction-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="เช่น มื้อกลางวัน" /></FormField>
      {error && <div className="field-error" role="alert">{error}</div>}
    </DialogForm>
  </AppDialog>
}

function BillDialog({ bill, title, amount, error, saving, onClose, onSubmit }: { bill?: Bill; title?: string; amount?: number; error: string; saving: boolean; onClose: () => void; onSubmit: (submission: DialogSubmission) => void }) {
  const [name, setName] = useState(bill?.title ?? title ?? '')
  const [amountValue, setAmountValue] = useState(bill ? String(bill.amount) : amount ? String(amount) : '')
  const [dueDate, setDueDate] = useState(bill?.dueDate ?? getTodayISO())
  const [repeatMonthly, setRepeatMonthly] = useState(bill?.repeatMonthly ?? true)
  const [validation, setValidation] = useState('')
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const numericAmount = Number(amountValue)
    if (!name.trim()) { setValidation('ใส่ชื่อบิลก่อนนะ'); return }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) { setValidation('กรอกยอดบิลมากกว่า 0 บาท'); return }
    setValidation('')
    void onSubmit({ kind: 'bill', value: { id: bill?.id ?? makeId(), title: name.trim(), amount: numericAmount, dueDate, repeatMonthly, paid: bill?.paid ?? false } })
  }
  return <AppDialog open title={bill ? 'แก้ไขบิล' : 'เพิ่มบิล'} description="ตั้งวันครบกำหนด แล้วแอปจะแสดงไว้ในปฏิทิน" onClose={onClose}>
    <DialogForm title="บันทึกบิล" onSubmit={handleSubmit} onCancel={onClose} saving={saving} submitLabel={bill ? 'บันทึกการแก้ไข' : 'เพิ่มบิล'}>
      <FormField id="bill-name" label="ชื่อบิล" error={validation}><input id="bill-name" value={name} autoFocus={!bill} onChange={(event) => setName(event.target.value)} placeholder="เช่น ค่าโทรศัพท์" /></FormField>
      <FormField id="bill-amount" label="ยอดที่ต้องจ่าย"><div className="input-suffix"><input id="bill-amount" type="number" min="0.01" inputMode="decimal" value={amountValue} onChange={(event) => setAmountValue(event.target.value)} placeholder="0" /><span>บาท</span></div></FormField>
      <FormField id="bill-date" label="วันครบกำหนด"><input id="bill-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></FormField>
      <label className="check-row"><input type="checkbox" checked={repeatMonthly} onChange={(event) => setRepeatMonthly(event.target.checked)} /> เตือนซ้ำทุกเดือน</label>
      {error && <div className="field-error" role="alert">{error}</div>}
    </DialogForm>
  </AppDialog>
}

function DebtDialog({ debt, error, saving, onClose, onSubmit }: { debt?: Debt; error: string; saving: boolean; onClose: () => void; onSubmit: (submission: DialogSubmission) => void }) {
  const [title, setTitle] = useState(debt?.title ?? '')
  const [balance, setBalance] = useState(debt ? String(debt.balance) : '')
  const [installment, setInstallment] = useState(debt ? String(debt.installment) : '')
  const [dueDate, setDueDate] = useState(debt?.dueDate ?? getTodayISO())
  const [validation, setValidation] = useState('')
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) { setValidation('ใส่ชื่อหนี้ก่อนนะ'); return }
    if (Number(balance) <= 0 || Number(installment) <= 0) { setValidation('ยอดหนี้และยอดผ่อนต้องมากกว่า 0 บาท'); return }
    setValidation('')
    void onSubmit({ kind: 'debt', value: { id: debt?.id ?? makeId(), title: title.trim(), balance: Number(balance), installment: Number(installment), dueDate } })
  }
  return <AppDialog open title={debt ? 'แก้ไขหนี้' : 'เพิ่มหนี้ที่ต้องผ่อน'} description="เก็บยอดที่เหลือและยอดชำระในแต่ละรอบ" onClose={onClose}>
    <DialogForm title="บันทึกหนี้" onSubmit={handleSubmit} onCancel={onClose} saving={saving} submitLabel={debt ? 'บันทึกการแก้ไข' : 'เพิ่มรายการหนี้'}>
      <FormField id="debt-name" label="ชื่อหนี้" error={validation}><input id="debt-name" autoFocus={!debt} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น บัตรเครดิต" /></FormField>
      <FormField id="debt-balance" label="ยอดหนี้คงเหลือ"><div className="input-suffix"><input id="debt-balance" type="number" min="0.01" inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="0" /><span>บาท</span></div></FormField>
      <FormField id="debt-installment" label="ยอดที่ต้องจ่ายต่อรอบ"><div className="input-suffix"><input id="debt-installment" type="number" min="0.01" inputMode="decimal" value={installment} onChange={(event) => setInstallment(event.target.value)} placeholder="0" /><span>บาท</span></div></FormField>
      <FormField id="debt-date" label="วันครบกำหนดครั้งถัดไป"><input id="debt-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></FormField>
      {error && <div className="field-error" role="alert">{error}</div>}
    </DialogForm>
  </AppDialog>
}

function GoalDialog({ goal, error, saving, onClose, onSubmit }: { goal?: SavingsGoal; error: string; saving: boolean; onClose: () => void; onSubmit: (submission: DialogSubmission) => void }) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [target, setTarget] = useState(goal ? String(goal.target) : '')
  const [balance, setBalance] = useState(goal ? String(goal.balance) : '0')
  const [monthlyPlan, setMonthlyPlan] = useState(goal ? String(goal.monthlyPlan) : '')
  const [validation, setValidation] = useState('')
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) { setValidation('ตั้งชื่อเป้าหมายก่อนนะ'); return }
    if (Number(target) <= 0 || Number(balance) < 0 || Number(monthlyPlan) < 0) { setValidation('ตรวจยอดเป้าหมายและเงินที่ตั้งใจเก็บ'); return }
    setValidation('')
    void onSubmit({ kind: 'goal', value: { id: goal?.id ?? makeId(), title: title.trim(), target: Number(target), balance: Number(balance), monthlyPlan: Number(monthlyPlan) } })
  }
  return <AppDialog open title={goal ? 'แก้ไขเป้าหมาย' : 'สร้างกระปุกใหม่'} description="ตั้งชื่อเป้าหมายและแบ่งเงินเก็บตามที่สะดวก" onClose={onClose}>
    <DialogForm title="บันทึกกระปุก" onSubmit={handleSubmit} onCancel={onClose} saving={saving} submitLabel={goal ? 'บันทึกการแก้ไข' : 'สร้างกระปุก'}>
      <FormField id="goal-name" label="เก็บเงินเพื่อ"><input id="goal-name" autoFocus={!goal} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น ทริปกับเพื่อน" /></FormField>
      <FormField id="goal-target" label="เป้าหมาย"><div className="input-suffix"><input id="goal-target" type="number" min="0.01" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="0" /><span>บาท</span></div></FormField>
      <FormField id="goal-balance" label="มีอยู่ในกระปุกแล้ว"><div className="input-suffix"><input id="goal-balance" type="number" min="0" inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="0" /><span>บาท</span></div></FormField>
      <FormField id="goal-plan" label="ตั้งใจเก็บต่อเดือน"><div className="input-suffix"><input id="goal-plan" type="number" min="0" inputMode="decimal" value={monthlyPlan} onChange={(event) => setMonthlyPlan(event.target.value)} placeholder="0" /><span>บาท</span></div></FormField>
      {validation && <div className="field-error">{validation}</div>}{error && <div className="field-error" role="alert">{error}</div>}
    </DialogForm>
  </AppDialog>
}

function GoalMovementDialog({ goal, direction, error, saving, onClose, onSubmit }: { goal: SavingsGoal; direction: 'in' | 'out'; error: string; saving: boolean; onClose: () => void; onSubmit: (submission: DialogSubmission) => void }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [validation, setValidation] = useState('')
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) { setValidation('กรอกจำนวนเงินมากกว่า 0 บาท'); return }
    if (direction === 'out' && Number(amount) > goal.balance) { setValidation('ถอนเงินได้ไม่เกินยอดในกระปุก'); return }
    setValidation('')
    void onSubmit({ kind: 'goalMovement', goalId: goal.id, direction, amount: Number(amount), note: note.trim(), date: getTodayISO() })
  }
  return <AppDialog open title={direction === 'in' ? 'เติมเงินเข้ากระปุก' : 'ถอนเงินจากกระปุก'} description={`${goal.title} · มีอยู่ ${formatMoney(goal.balance)}`} onClose={onClose}>
    <DialogForm title="บันทึกเงินเข้าออก" onSubmit={handleSubmit} onCancel={onClose} saving={saving} submitLabel={direction === 'in' ? 'เติมเงิน' : 'ถอนเงิน'}>
      <FormField id="movement-amount" label="จำนวนเงิน" error={validation}><div className="input-suffix"><input id="movement-amount" type="number" min="0.01" inputMode="decimal" value={amount} autoFocus onChange={(event) => setAmount(event.target.value)} placeholder="0" /><span>บาท</span></div></FormField>
      <FormField id="movement-note" label="บันทึกเพิ่มเติม"><input id="movement-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder={direction === 'in' ? 'เช่น แบ่งจากเงินเดือน' : 'เช่น ซื้อบัตรเดินทาง'} /></FormField>
      {error && <div className="field-error" role="alert">{error}</div>}
    </DialogForm>
  </AppDialog>
}

function DebtPaymentDialog({ debt, error, saving, onClose, onSubmit }: { debt: Debt; error: string; saving: boolean; onClose: () => void; onSubmit: (submission: DialogSubmission) => void }) {
  const [amount, setAmount] = useState(String(Math.min(debt.installment, debt.balance)))
  const [validation, setValidation] = useState('')
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payment = Number(amount)
    if (!Number.isFinite(payment) || payment <= 0) { setValidation('กรอกยอดชำระมากกว่า 0 บาท'); return }
    if (payment > debt.balance) { setValidation(`จ่ายได้ไม่เกินยอดคงเหลือ ${formatMoney(debt.balance)}`); return }
    setValidation('')
    void onSubmit({ kind: 'debtPayment', debtId: debt.id, amount: payment, date: getTodayISO() })
  }
  return <AppDialog open title="บันทึกการชำระหนี้" description={`${debt.title} · เหลือ ${formatMoney(debt.balance)}`} onClose={onClose}>
    <DialogForm title="ชำระหนี้" onSubmit={handleSubmit} onCancel={onClose} saving={saving} submitLabel="บันทึกการชำระ">
      <FormField id="debt-payment-amount" label="ยอดที่ชำระ" error={validation}><div className="input-suffix"><input id="debt-payment-amount" type="number" min="0.01" max={debt.balance} inputMode="decimal" value={amount} autoFocus onChange={(event) => setAmount(event.target.value)} /><span>บาท</span></div></FormField>
      <div className="inline-note"><ArrowUpRight size={15} /> ยอดหนี้คงเหลือหลังจ่าย {formatMoney(Math.max(0, debt.balance - (Number(amount) || 0)))}</div>
      {error && <div className="field-error" role="alert">{error}</div>}
    </DialogForm>
  </AppDialog>
}

function EventDialog({ event, date, error, saving, onClose, onSubmit }: { event?: CalendarEvent; date?: string; error: string; saving: boolean; onClose: () => void; onSubmit: (submission: DialogSubmission) => void }) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [eventDate, setEventDate] = useState(event?.date ?? date ?? getTodayISO())
  const [note, setNote] = useState(event?.note ?? '')
  const [validation, setValidation] = useState('')
  const handleSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault()
    if (!title.trim()) { setValidation('ใส่ชื่อวันสำคัญก่อนนะ'); return }
    if (!eventDate) { setValidation('เลือกวันที่'); return }
    setValidation('')
    void onSubmit({ kind: 'event', value: { id: event?.id ?? makeId(), title: title.trim(), date: eventDate, note: note.trim() } })
  }
  return <AppDialog open title={event ? 'แก้ไขวันสำคัญ' : 'เพิ่มวันสำคัญ'} description="นัดหมายส่วนตัวจะแสดงในปฏิทินการเงิน" onClose={onClose}>
    <DialogForm title="บันทึกวันสำคัญ" onSubmit={handleSubmit} onCancel={onClose} saving={saving} submitLabel={event ? 'บันทึกการแก้ไข' : 'เพิ่มวันสำคัญ'}>
      <FormField id="event-name" label="ชื่อวันสำคัญ" error={validation}><input id="event-name" autoFocus={!event} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น นัดหมอฟัน" /></FormField>
      <FormField id="event-date" label="วันที่"><input id="event-date" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></FormField>
      <FormField id="event-note" label="รายละเอียด"><textarea id="event-note" className="resize-none" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="รายละเอียดเพิ่มเติม" /></FormField>
      {error && <div className="field-error" role="alert">{error}</div>}
    </DialogForm>
  </AppDialog>
}
