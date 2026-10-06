import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, Copy, Landmark, LogOut, Plus, Share2, Trash2, UserPlus } from 'lucide-react'
import { supabase, friendlyAuthError } from '../lib/supabase'
import { normalizeCode } from '../lib/sharedJars'
import { ACCOUNT_CATEGORIES, accountBalance, buildAccountInviteLink, memberFlows, monthCategoryTotals, parseAccountCode, personalTransferFor, type AccountEntry } from '../lib/sharedAccounts'
import type { MoneyTransaction } from '../lib/finance'
import { formatDate, formatMoney, getTodayISO } from '../lib/presentation'
import { FormField } from './UI'
import AuthForm from './AuthForm'

interface Account { id: string; title: string; owner_id: string; invite_code: string }
interface Member { account_id: string; user_id: string; role: 'owner' | 'member' }
interface Snapshot { accounts: Account[]; members: Member[]; names: Record<string, string>; entries: AccountEntry[] }
type PendingTransfer = Pick<AccountEntry, 'id' | 'kind' | 'amount' | 'entry_date'> & { title: string }

const empty: Snapshot = { accounts: [], members: [], names: {}, entries: [] }
const PENDING_KEY = 'tpd-pending-transfers'

function readPending(): PendingTransfer[] {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as PendingTransfer[] } catch { return [] }
}
function writePending(list: PendingTransfer[]) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)) } catch { /* ไม่มีที่เก็บ ข้ามได้ */ }
}

interface Props {
  transactions: MoneyTransaction[]
  onAddPersonal: (transaction: MoneyTransaction) => Promise<boolean>
  onRemovePersonal: (sharedEntryId: string) => Promise<void>
}

export default function SharedAccounts({ transactions, onAddPersonal, onRemovePersonal }: Props) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [snap, setSnap] = useState<Snapshot>(empty)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(ACCOUNT_CATEGORIES[0]!)
  const [note, setNote] = useState('')
  const joinHandled = useRef(false)
  const txRef = useRef(transactions)
  useEffect(() => { txRef.current = transactions }, [transactions])
  const userId = session?.user.id

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const flushPending = useCallback(async () => {
    for (const item of readPending()) {
      if (!txRef.current.some((tx) => tx.sharedEntryId === item.id)) {
        if (!await onAddPersonal(personalTransferFor(item, item.title, crypto.randomUUID()))) return
      }
      writePending(readPending().filter((pending) => pending.id !== item.id))
    }
  }, [onAddPersonal])

  const reload = useCallback(async () => {
    const [accounts, members, entries, profiles] = await Promise.all([
      supabase.from('shared_accounts').select('id,title,owner_id,invite_code').order('created_at', { ascending: false }),
      supabase.from('account_members').select('account_id,user_id,role'),
      supabase.from('account_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,display_name'),
    ])
    const failed = accounts.error ?? members.error ?? entries.error ?? profiles.error
    if (failed) { setMessage(friendlyAuthError(failed.message)); return }
    setSnap({
      accounts: (accounts.data ?? []) as Account[],
      members: (members.data ?? []) as Member[],
      entries: (entries.data ?? []) as AccountEntry[],
      names: Object.fromEntries((profiles.data ?? []).map((profile) => [profile.id as string, profile.display_name as string])),
    })
  }, [])

  const joinByCode = useCallback(async (value: string) => {
    const { data, error } = await supabase.rpc('join_account', { p_code: value })
    if (error) { setMessage(friendlyAuthError(error.message)); return }
    setMessage('เข้าร่วมบัญชีร่วมแล้ว')
    await reload()
    setSelectedId(data as string)
  }, [reload])

  useEffect(() => {
    if (!userId) return
    void reload()
    void flushPending()
    const joinCode = parseAccountCode(window.location.hash)
    if (joinCode && !joinHandled.current) {
      joinHandled.current = true
      void joinByCode(joinCode).finally(() => { window.history.replaceState(null, '', `${window.location.pathname}#goals`) })
    }
    let timer: number | undefined
    const refresh = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void reload(), 250) }
    const channel = supabase.channel(`accounts-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'account_entries' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'account_members' }, refresh)
      .subscribe()
    return () => { window.clearTimeout(timer); void supabase.removeChannel(channel) }
  }, [userId, reload, joinByCode, flushPending])

  if (session === undefined) return <section className="panel"><div className="empty-inline">กำลังเปิดบัญชีร่วม…</div></section>

  const heading = <div className="section-heading"><div><span className="eyebrow">รายรับรายจ่ายร่วมกัน</span><h2>บัญชีร่วม</h2></div><span className="icon-disc icon-disc--turquoise"><Landmark size={18} /></span></div>
  if (!session) return <section className="panel shared-jars">{heading}<AuthForm /></section>

  const me = session.user.id
  const nameOf = (id: string) => id === me ? 'คุณ' : snap.names[id] ?? 'เพื่อน'
  const selected = snap.accounts.find((account) => account.id === selectedId)

  const createAccount = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return setMessage('ตั้งชื่อบัญชีก่อน')
    const id = crypto.randomUUID()
    const { error } = await supabase.from('shared_accounts').insert({ id, title: title.trim() })
    if (error) return setMessage(friendlyAuthError(error.message))
    setTitle(''); setMessage('สร้างบัญชีร่วมแล้ว ส่งลิงก์ชวนสมาชิกได้เลย')
    await reload(); setSelectedId(id)
  }

  /** transfer = โอนเข้า/ถอนออกจากเงินส่วนตัว แล้วบันทึกคู่ฝั่งส่วนตัวให้ */
  const addEntry = async (account: Account, kind: 'in' | 'out', transfer: boolean) => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setMessage('กรอกจำนวนเงินมากกว่า 0 บาท')
    const row = { id: crypto.randomUUID(), account_id: account.id, kind, amount: value, category: transfer ? 'โอน' : category, note: note.trim() || null, transfer, entry_date: getTodayISO() }
    const { error } = await supabase.from('account_entries').insert(row)
    if (error) return setMessage(friendlyAuthError(error.message))
    if (transfer) {
      writePending([...readPending(), { id: row.id, kind, amount: value, entry_date: row.entry_date, title: account.title }])
      await flushPending()
    }
    setAmount(''); setNote('')
    setMessage(transfer ? (kind === 'in' ? 'โอนเข้าบัญชีร่วมแล้ว และบันทึกรายจ่ายส่วนตัวให้แล้ว' : 'ถอนออกแล้ว และบันทึกรายรับส่วนตัวให้แล้ว') : kind === 'in' ? 'บันทึกรายรับแล้ว' : 'บันทึกรายจ่ายแล้ว')
    await reload()
  }

  const removeEntry = async (entry: AccountEntry) => {
    const paired = entry.transfer && transactions.some((tx) => tx.sharedEntryId === entry.id)
    const alsoPersonal = paired && window.confirm('ลบรายการคู่ในบัญชีส่วนตัวของคุณด้วยไหม?')
    const { error } = await supabase.from('account_entries').delete().eq('id', entry.id)
    if (error) return setMessage(friendlyAuthError(error.message))
    if (alsoPersonal) await onRemovePersonal(entry.id)
    await reload()
  }

  const leaveOrDelete = async (account: Account) => {
    const owner = account.owner_id === me
    if (!window.confirm(owner ? `ลบบัญชีร่วม “${account.title}” ของทุกคนถาวร?` : `ออกจากบัญชีร่วม “${account.title}”?`)) return
    const { error } = owner
      ? await supabase.from('shared_accounts').delete().eq('id', account.id)
      : await supabase.from('account_members').delete().eq('account_id', account.id).eq('user_id', me)
    if (error) return setMessage(friendlyAuthError(error.message))
    setSelectedId(null); setMessage(owner ? 'ลบบัญชีแล้ว' : 'ออกจากบัญชีแล้ว'); await reload()
  }

  const removeMember = async (account: Account, memberId: string) => {
    if (!window.confirm(`เอา ${nameOf(memberId)} ออกจากบัญชี “${account.title}”?`)) return
    const { error } = await supabase.from('account_members').delete().eq('account_id', account.id).eq('user_id', memberId)
    if (error) setMessage(friendlyAuthError(error.message)); else await reload()
  }

  const invite = async (account: Account) => {
    const link = buildAccountInviteLink(account.invite_code, window.location.origin, import.meta.env.BASE_URL)
    const text = `มาใช้บัญชีร่วม “${account.title}” ด้วยกัน รหัสเชิญ ${account.invite_code}`
    try {
      if (navigator.share) await navigator.share({ title: 'ตังค์พอดี', text, url: link })
      else { await navigator.clipboard.writeText(`${text}\n${link}`); setMessage('คัดลอกลิงก์เชิญแล้ว') }
    } catch { /* ผู้ใช้ยกเลิกการแชร์ */ }
  }

  const signOut = <button className="text-button" type="button" onClick={() => void supabase.auth.signOut()}><LogOut size={14} /> ออกจากระบบ ({session.user.email})</button>
  const messageNode = message && <p className="shared-message" role="status">{message}</p>

  if (selected) {
    const entries = snap.entries.filter((entry) => entry.account_id === selected.id)
    const members = snap.members.filter((member) => member.account_id === selected.id)
    const balance = accountBalance(entries)
    const categories = monthCategoryTotals(entries, getTodayISO().slice(0, 7))
    const isOwner = selected.owner_id === me
    return <section className="panel shared-jars">
      <button className="link-button back-link" type="button" onClick={() => { setSelectedId(null); setMessage('') }}><ArrowLeft size={14} /> บัญชีร่วมทั้งหมด</button>
      <h2>{selected.title}</h2>
      <strong className="goal-balance">{formatMoney(balance)}</strong>
      <span className="goal-target">ยอดคงเหลือ · {members.length} คน</span>

      <div className="shared-invite"><span>รหัสเชิญ <b>{selected.invite_code}</b></span><button className="button button--outline button--small" type="button" onClick={() => void invite(selected)}>{typeof navigator.share === 'function' ? <Share2 size={15} /> : <Copy size={15} />} ชวนสมาชิก</button></div>

      <h3 className="shared-sub">ใครเติมใครใช้</h3>
      <ul className="transaction-list">{memberFlows(entries, members.map((member) => member.user_id)).map((row) => <li className="transaction-row" key={row.userId}><div className="transaction-main"><b>{nameOf(row.userId)}</b><span>{selected.owner_id === row.userId ? 'เจ้าของบัญชี' : 'สมาชิก'} · ใช้ไป {formatMoney(row.out)}</span></div><strong className="money-positive">+{formatMoney(row.in)}</strong>{isOwner && row.userId !== me && <button className="icon-button icon-button--danger" type="button" aria-label={`เอา ${nameOf(row.userId)} ออก`} onClick={() => void removeMember(selected, row.userId)}><Trash2 size={15} /></button>}</li>)}</ul>

      {categories.length > 0 && <><h3 className="shared-sub">รายจ่ายเดือนนี้ตามหมวด</h3>
        <ul className="transaction-list">{categories.map((row) => <li className="transaction-row" key={row.category}><div className="transaction-main"><b>{row.category}</b></div><strong>{formatMoney(row.total)}</strong></li>)}</ul></>}

      <h3 className="shared-sub">บันทึกรายการ</h3>
      <form className="shared-entry" noValidate onSubmit={(event) => event.preventDefault()} aria-label="บันทึกรายการบัญชีร่วม">
        <FormField id="acc-amount" label="จำนวนเงิน (บาท)"><input id="acc-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></FormField>
        <FormField id="acc-category" label="หมวดหมู่ (รายจ่าย)"><select id="acc-category" value={category} onChange={(event) => setCategory(event.target.value)}>{ACCOUNT_CATEGORIES.map((option) => <option key={option}>{option}</option>)}</select></FormField>
        <FormField id="acc-note" label="โน้ต (ไม่บังคับ)"><input id="acc-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={120} /></FormField>
        <div className="shared-entry-actions">
          <button className="button button--primary" type="button" onClick={() => void addEntry(selected, 'out', false)}><Plus size={16} /> บันทึกรายจ่าย</button>
          <button className="button button--outline" type="button" onClick={() => void addEntry(selected, 'in', false)}>บันทึกรายรับ</button>
        </div>
        <div className="shared-entry-actions">
          <button className="button button--outline" type="button" onClick={() => void addEntry(selected, 'in', true)}><ArrowDownToLine size={16} /> โอนเข้าจากเงินฉัน</button>
          <button className="button button--outline" type="button" onClick={() => void addEntry(selected, 'out', true)}><ArrowUpFromLine size={16} /> ถอนมาเข้าเงินฉัน</button>
        </div>
      </form>
      {messageNode}

      <h3 className="shared-sub">ความเคลื่อนไหวล่าสุด</h3>
      {entries.length ? <ul className="transaction-list">{entries.slice(0, 20).map((entry) => <li className="transaction-row" key={entry.id}><div className="transaction-main"><b>{nameOf(entry.user_id)} · {entry.transfer ? (entry.kind === 'in' ? 'โอนเข้า' : 'ถอนออก') : entry.category}</b><span>{entry.note ? `${entry.note} · ` : ''}{formatDate(entry.entry_date)}</span></div><strong className={entry.kind === 'in' ? 'money-positive' : ''}>{entry.kind === 'in' ? '+' : '−'}{formatMoney(entry.amount)}</strong>{entry.user_id === me && <button className="icon-button icon-button--danger" type="button" aria-label="ลบรายการนี้" onClick={() => void removeEntry(entry)}><Trash2 size={15} /></button>}</li>)}</ul> : <div className="empty-inline">ยังไม่มีรายการ เริ่มบันทึกเป็นคนแรกเลย</div>}

      <div className="shared-footer"><button className="button button--outline button--small" type="button" onClick={() => void leaveOrDelete(selected)}>{isOwner ? 'ลบบัญชีนี้' : 'ออกจากบัญชี'}</button>{signOut}</div>
    </section>
  }

  return <section className="panel shared-jars">
    {heading}
    {snap.accounts.length ? <ul className="shared-list">{snap.accounts.map((account) => {
      const balance = accountBalance(snap.entries.filter((entry) => entry.account_id === account.id))
      const count = snap.members.filter((member) => member.account_id === account.id).length
      return <li key={account.id}><button type="button" className="shared-item" onClick={() => { setSelectedId(account.id); setMessage('') }}>
        <span><b>{account.title}</b><small>{count} คน · คงเหลือ {formatMoney(balance)}</small></span>
      </button></li>
    })}</ul> : <div className="empty-inline">ยังไม่มีบัญชีร่วม สร้างบัญชีใหม่หรือใส่รหัสที่คนอื่นส่งมา</div>}
    <div className="shared-forms">
      <form noValidate onSubmit={(event) => void createAccount(event)} aria-label="สร้างบัญชีร่วม">
        <FormField id="acc-title" label="ชื่อบัญชีร่วม"><input id="acc-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น บ้าน, ฉันกับแฟน, ห้อง 302" maxLength={80} /></FormField>
        <button className="button button--primary" type="submit"><Plus size={16} /> สร้างบัญชีร่วม</button>
      </form>
      <form noValidate onSubmit={(event) => { event.preventDefault(); const value = normalizeCode(code); if (value.length !== 6) setMessage('รหัสเชิญมี 6 ตัวอักษร'); else void joinByCode(value).then(() => setCode('')) }} aria-label="เข้าร่วมบัญชีด้วยรหัส">
        <FormField id="acc-code" label="มีรหัสเชิญ?"><input id="acc-code" value={code} onChange={(event) => setCode(normalizeCode(event.target.value))} placeholder="AB12CD" autoCapitalize="characters" /></FormField>
        <button className="button button--outline" type="submit"><UserPlus size={16} /> เข้าร่วม</button>
      </form>
    </div>
    {messageNode}
    <div className="shared-footer">{signOut}</div>
  </section>
}
