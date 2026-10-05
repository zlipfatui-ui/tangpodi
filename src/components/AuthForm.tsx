import { useState, type FormEvent } from 'react'
import { supabase, friendlyAuthError } from '../lib/supabase'
import { FormField } from './UI'

export default function AuthForm({ emailLabel = 'อีเมล', emailPlaceholder = '', intro = true }: { emailLabel?: string; emailPlaceholder?: string; intro?: boolean }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) return setError('กรอกอีเมลและรหัสผ่าน')
    if (mode === 'signup' && !name.trim()) return setError('ใส่ชื่อที่เพื่อนจะเห็น')
    setBusy(true); setError('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() } } })
    setBusy(false)
    if (result.error) setError(friendlyAuthError(result.error.message))
    else if (mode === 'signup' && !result.data.session) setError('สมัครแล้ว แต่ต้องยืนยันอีเมลก่อน (เจ้าของแอปยังเปิดตัวเลือกยืนยันอีเมลไว้)')
  }

  return <form className="shared-auth" noValidate onSubmit={submit} aria-label={mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}>
    {intro && <p>เข้าสู่ระบบเพื่อสร้างหรือเข้าร่วมกระปุกกับเพื่อน เฉพาะกระปุกร่วมเท่านั้นที่ถูกเก็บออนไลน์ ข้อมูลรายรับจ่ายของคุณยังอยู่ในเครื่อง</p>}
    {mode === 'signup' && <FormField id="auth-name" label="ชื่อที่เพื่อนเห็น"><input id="auth-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" /></FormField>}
    <FormField id="auth-email" label={emailLabel}><input id="auth-email" type="email" placeholder={emailPlaceholder} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></FormField>
    <FormField id="auth-password" label="รหัสผ่าน" hint="อย่างน้อย 6 ตัวอักษร" error={error}><input id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></FormField>
    <div className="shared-auth-actions">
      <button className="button button--primary" type="submit" disabled={busy}>{busy ? 'กำลังดำเนินการ…' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</button>
      <button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>{mode === 'login' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}</button>
    </div>
  </form>
}
