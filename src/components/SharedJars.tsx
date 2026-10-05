import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowLeft, Copy, LogOut, Plus, Share2, Trash2, UserPlus, Users } from 'lucide-react'
import { supabase, friendlyAuthError } from '../lib/supabase'
import { buildInviteLink, jarBalance, memberTotals, normalizeCode, parseJoinCode, type JarEntry } from '../lib/sharedJars'
import { formatDate, formatMoney, getTodayISO } from '../lib/presentation'
import { FormField } from './UI'
import AuthForm from './AuthForm'

interface Jar { id: string; title: string; target: number; owner_id: string; invite_code: string }
interface Member { jar_id: string; user_id: string; role: 'owner' | 'member' }
interface Snapshot { jars: Jar[]; members: Member[]; names: Record<string, string>; entries: JarEntry[] }

const empty: Snapshot = { jars: [], members: [], names: {}, entries: [] }

export default function SharedJars() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [snap, setSnap] = useState<Snapshot>(empty)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [code, setCode] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const joinHandled = useRef(false)
  const userId = session?.user.id

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const reload = useCallback(async () => {
    const [jars, members, entries, profiles] = await Promise.all([
      supabase.from('shared_jars').select('id,title,target,owner_id,invite_code').order('created_at', { ascending: false }),
      supabase.from('jar_members').select('jar_id,user_id,role'),
      supabase.from('jar_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,display_name'),
    ])
    const failed = jars.error ?? members.error ?? entries.error ?? profiles.error
    if (failed) { setMessage(friendlyAuthError(failed.message)); return }
    setSnap({
      jars: (jars.data ?? []) as Jar[],
      members: (members.data ?? []) as Member[],
      entries: (entries.data ?? []) as JarEntry[],
      names: Object.fromEntries((profiles.data ?? []).map((profile) => [profile.id as string, profile.display_name as string])),
    })
  }, [])

  const joinByCode = useCallback(async (value: string) => {
    const { data, error } = await supabase.rpc('join_jar', { p_code: value })
    if (error) { setMessage(friendlyAuthError(error.message)); return }
    setMessage('เข้าร่วมกระปุกแล้ว')
    await reload()
    setSelectedId(data as string)
  }, [reload])

  useEffect(() => {
    if (!userId) return
    void reload()
    const joinCode = parseJoinCode(window.location.hash)
    if (joinCode && !joinHandled.current) {
      joinHandled.current = true
      void joinByCode(joinCode).finally(() => { window.history.replaceState(null, '', `${window.location.pathname}#goals`) })
    }
    let timer: number | undefined
    const refresh = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void reload(), 250) }
    const channel = supabase.channel(`jars-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jar_entries' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jar_members' }, refresh)
      .subscribe()
    return () => { window.clearTimeout(timer); void supabase.removeChannel(channel) }
  }, [userId, reload, joinByCode])

  if (session === undefined) return <section className="panel"><div className="empty-inline">กำลังเปิดกระปุกกับเพื่อน…</div></section>

  const heading = <div className="section-heading"><div><span className="eyebrow">ออมไปด้วยกัน</span><h2>กระปุกกับเพื่อน</h2></div><span className="icon-disc icon-disc--turquoise"><Users size={18} /></span></div>
  if (!session) return <section className="panel shared-jars">{heading}<AuthForm /></section>

  const me = session.user.id
  const nameOf = (id: string) => id === me ? 'คุณ' : snap.names[id] ?? 'เพื่อน'
  const selected = snap.jars.find((jar) => jar.id === selectedId)

  const createJar = async (event: FormEvent) => {
    event.preventDefault()
    const value = Number(target)
    if (!title.trim()) return setMessage('ตั้งชื่อกระปุกก่อน')
    if (!Number.isFinite(value) || value <= 0) return setMessage('กรอกเป้าหมายมากกว่า 0 บาท')
    const id = crypto.randomUUID()
    const { error } = await supabase.from('shared_jars').insert({ id, title: title.trim(), target: value })
    if (error) return setMessage(friendlyAuthError(error.message))
    setTitle(''); setTarget(''); setMessage('สร้างกระปุกแล้ว ส่งลิงก์ชวนเพื่อนได้เลย')
    await reload(); setSelectedId(id)
  }

  const addEntry = async (event: FormEvent, jar: Jar, kind: 'in' | 'out') => {
    event.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setMessage('กรอกจำนวนเงินมากกว่า 0 บาท')
    const mine = memberTotals(snap.entries.filter((entry) => entry.jar_id === jar.id), [me]).find((row) => row.userId === me)?.total ?? 0
    if (kind === 'out' && value > mine) return setMessage('ถอนได้ไม่เกินยอดที่คุณออมไว้ในกระปุกนี้')
    const { error } = await supabase.from('jar_entries').insert({ jar_id: jar.id, kind, amount: value, note: note.trim() || null, entry_date: getTodayISO() })
    if (error) return setMessage(friendlyAuthError(error.message))
    setAmount(''); setNote(''); setMessage(kind === 'in' ? 'บันทึกยอดออมแล้ว' : 'บันทึกการถอนแล้ว')
    await reload()
  }

  const removeEntry = async (id: string) => {
    const { error } = await supabase.from('jar_entries').delete().eq('id', id)
    if (error) setMessage(friendlyAuthError(error.message)); else await reload()
  }

  const leaveOrDelete = async (jar: Jar) => {
    const owner = jar.owner_id === me
    if (!window.confirm(owner ? `ลบกระปุก “${jar.title}” ของทุกคนถาวร?` : `ออกจากกระปุก “${jar.title}”?`)) return
    const { error } = owner
      ? await supabase.from('shared_jars').delete().eq('id', jar.id)
      : await supabase.from('jar_members').delete().eq('jar_id', jar.id).eq('user_id', me)
    if (error) return setMessage(friendlyAuthError(error.message))
    setSelectedId(null); setMessage(owner ? 'ลบกระปุกแล้ว' : 'ออกจากกระปุกแล้ว'); await reload()
  }

  const invite = async (jar: Jar) => {
    const link = buildInviteLink(jar.invite_code, window.location.origin, import.meta.env.BASE_URL)
    const text = `มาออมเงินด้วยกันในกระปุก “${jar.title}” รหัสเชิญ ${jar.invite_code}`
    try {
      if (navigator.share) await navigator.share({ title: 'ตังค์พอดี', text, url: link })
      else { await navigator.clipboard.writeText(`${text}\n${link}`); setMessage('คัดลอกลิงก์เชิญแล้ว') }
    } catch { /* ผู้ใช้ยกเลิกการแชร์ */ }
  }

  const signOut = <button className="text-button" type="button" onClick={() => void supabase.auth.signOut()}><LogOut size={14} /> ออกจากระบบ ({session.user.email})</button>
  const messageNode = message && <p className="shared-message" role="status">{message}</p>

  if (selected) {
    const entries = snap.entries.filter((entry) => entry.jar_id === selected.id)
    const memberIds = snap.members.filter((member) => member.jar_id === selected.id).map((member) => member.user_id)
    const balance = jarBalance(entries)
    const percent = Math.min(100, balance / selected.target * 100)
    return <section className="panel shared-jars">
      <button className="link-button back-link" type="button" onClick={() => { setSelectedId(null); setMessage('') }}><ArrowLeft size={14} /> กระปุกทั้งหมด</button>
      <h2>{selected.title}</h2>
      <strong className="goal-balance">{formatMoney(balance)}</strong>
      <span className="goal-target">จากเป้าหมาย {formatMoney(selected.target)} · {memberIds.length} คน</span>
      <div className="goal-progress" role="progressbar" aria-label={`ความคืบหน้า ${selected.title}`} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div>
      <div className="goal-percent"><span>{Math.round(percent)}% แล้ว</span><span>เหลืออีก {formatMoney(Math.max(0, selected.target - balance))}</span></div>

      <div className="shared-invite"><span>รหัสเชิญ <b>{selected.invite_code}</b></span><button className="button button--outline button--small" type="button" onClick={() => void invite(selected)}>{typeof navigator.share === 'function' ? <Share2 size={15} /> : <Copy size={15} />} ชวนเพื่อน</button></div>

      <h3 className="shared-sub">ใครออมเท่าไร</h3>
      <ul className="transaction-list">{memberTotals(entries, memberIds).map((row) => <li className="transaction-row" key={row.userId}><div className="transaction-main"><b>{nameOf(row.userId)}</b><span>{selected.owner_id === row.userId ? 'เจ้าของกระปุก' : 'สมาชิก'}</span></div><strong className="money-positive">{formatMoney(row.total)}</strong></li>)}</ul>

      <h3 className="shared-sub">ออมเพิ่ม</h3>
      <form className="shared-entry" noValidate onSubmit={(event) => void addEntry(event, selected, 'in')} aria-label="บันทึกยอดออม">
        <FormField id="entry-amount" label="จำนวนเงิน (บาท)"><input id="entry-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></FormField>
        <FormField id="entry-note" label="โน้ต (ไม่บังคับ)"><input id="entry-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={120} /></FormField>
        <div className="shared-entry-actions"><button className="button button--primary" type="submit"><Plus size={16} /> ออมเข้ากระปุก</button><button className="button button--outline" type="button" onClick={(event) => void addEntry(event, selected, 'out')}>ถอนของฉัน</button></div>
      </form>
      {messageNode}

      <h3 className="shared-sub">ความเคลื่อนไหวล่าสุด</h3>
      {entries.length ? <ul className="transaction-list">{entries.slice(0, 15).map((entry) => <li className="transaction-row" key={entry.id}><div className="transaction-main"><b>{nameOf(entry.user_id)}</b><span>{entry.note || (entry.kind === 'in' ? 'ออมเงิน' : 'ถอนเงิน')} · {formatDate(entry.entry_date)}</span></div><strong className={entry.kind === 'in' ? 'money-positive' : ''}>{entry.kind === 'in' ? '+' : '−'}{formatMoney(entry.amount)}</strong>{entry.user_id === me && <button className="icon-button icon-button--danger" type="button" aria-label="ลบรายการนี้" onClick={() => void removeEntry(entry.id)}><Trash2 size={15} /></button>}</li>)}</ul> : <div className="empty-inline">ยังไม่มีใครออม เริ่มเป็นคนแรกเลย</div>}

      <div className="shared-footer"><button className="button button--outline button--small" type="button" onClick={() => void leaveOrDelete(selected)}>{selected.owner_id === me ? 'ลบกระปุกนี้' : 'ออกจากกระปุก'}</button>{signOut}</div>
    </section>
  }

  return <section className="panel shared-jars">
    {heading}
    {snap.jars.length ? <ul className="shared-list">{snap.jars.map((jar) => {
      const entries = snap.entries.filter((entry) => entry.jar_id === jar.id)
      const balance = jarBalance(entries)
      const percent = Math.min(100, balance / jar.target * 100)
      const count = snap.members.filter((member) => member.jar_id === jar.id).length
      return <li key={jar.id}><button type="button" className="shared-item" onClick={() => { setSelectedId(jar.id); setMessage('') }}>
        <span><b>{jar.title}</b><small>{count} คน · {formatMoney(balance)} จาก {formatMoney(jar.target)}</small></span>
        <span className="goal-progress" aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
      </button></li>
    })}</ul> : <div className="empty-inline">ยังไม่มีกระปุกร่วม สร้างกระปุกใหม่หรือใส่รหัสที่เพื่อนส่งมา</div>}
    <div className="shared-forms">
      <form noValidate onSubmit={(event) => void createJar(event)} aria-label="สร้างกระปุกร่วม">
        <FormField id="jar-title" label="ชื่อกระปุก"><input id="jar-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น ทริปญี่ปุ่น" maxLength={80} /></FormField>
        <FormField id="jar-target" label="เป้าหมายรวม (บาท)"><input id="jar-target" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} /></FormField>
        <button className="button button--primary" type="submit"><Plus size={16} /> สร้างกระปุกร่วม</button>
      </form>
      <form noValidate onSubmit={(event) => { event.preventDefault(); const value = normalizeCode(code); if (value.length !== 6) setMessage('รหัสเชิญมี 6 ตัวอักษร'); else void joinByCode(value).then(() => setCode('')) }} aria-label="เข้าร่วมด้วยรหัส">
        <FormField id="jar-code" label="มีรหัสเชิญจากเพื่อน?"><input id="jar-code" value={code} onChange={(event) => setCode(normalizeCode(event.target.value))} placeholder="AB12CD" autoCapitalize="characters" /></FormField>
        <button className="button button--outline" type="submit"><UserPlus size={16} /> เข้าร่วม</button>
      </form>
    </div>
    {messageNode}
    <div className="shared-footer">{signOut}</div>
  </section>
}
