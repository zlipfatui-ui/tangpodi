import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Flame, ScanLine, Users } from 'lucide-react'
import { isGateSkipped, nameFromUser, readStoredUser, setGateSkipped, type StoredUser } from '../lib/authStore'
import piggyBankMascot from '../assets/piggy-bank.webp'

const AuthForm = lazy(() => import('./AuthForm'))

type Phase = 'login' | 'welcome' | 'splash' | 'app'

const splashMs = 1500
const splashOutMs = 520

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function initialPhase(): Phase {
  if (readStoredUser()) return prefersReducedMotion() ? 'app' : 'splash'
  return isGateSkipped() ? 'app' : 'login'
}

function Pig({ className }: { className: string }) {
  return <img className={className} src={piggyBankMascot} width="512" height="468" alt="" aria-hidden="true" decoding="async" />
}

function LoginScreen({ onSkip }: { onSkip: () => void }) {
  return <main className="gate">
    <div className="gate-card">
      <Pig className="gate-pig" />
      <h1>ตังค์พอดี</h1>
      <p className="gate-sub">เข้าสู่ระบบด้วย Gmail เพื่อออมเงินกับเพื่อน</p>
      <Suspense fallback={<div className="empty-inline">กำลังเปิดหน้าเข้าสู่ระบบ…</div>}>
        <AuthForm intro={false} emailLabel="Gmail หรืออีเมลของคุณ" emailPlaceholder="you@gmail.com" />
      </Suspense>
      <button className="text-button gate-skip" type="button" onClick={onSkip}>ใช้แบบไม่ล็อกอินก่อน</button>
      <small className="gate-note">ข้อมูลรายรับจ่ายของคุณเก็บในเครื่องนี้เท่านั้น ล็อกอินไว้ใช้กับกระปุกเพื่อนเท่านั้น</small>
    </div>
  </main>
}

function WelcomeScreen({ name, onContinue }: { name: string; onContinue: () => void }) {
  return <main className="gate gate--welcome">
    <div className="gate-card">
      <Pig className="gate-pig gate-pig--wave" />
      <span className="eyebrow">เข้าสู่ระบบสำเร็จ</span>
      <h1>สวัสดี {name}!</h1>
      <p className="gate-sub">หมูออมเงินยินดีต้อนรับ มาจัดเงินให้พอดีกันเลย</p>
      <ul className="gate-tips">
        <li><span className="icon-disc icon-disc--pink"><ScanLine size={18} /></span><span><b>จดรายการเร็ว</b><small>กดปุ่ม + หรือสแกนสลิปให้ระบบอ่านยอดให้</small></span></li>
        <li><span className="icon-disc icon-disc--turquoise"><Users size={18} /></span><span><b>ออมกับเพื่อน</b><small>สร้างกระปุกร่วม แล้วส่งรหัสชวนเพื่อน</small></span></li>
        <li><span className="icon-disc icon-disc--mint"><Flame size={18} /></span><span><b>ออมต่อเนื่อง</b><small>ออมทุกวันเพื่อสะสม streak</small></span></li>
      </ul>
      <button className="button button--primary gate-start" type="button" autoFocus onClick={onContinue}>เริ่มใช้งาน <ArrowRight size={17} /></button>
    </div>
  </main>
}

function Splash({ name, leaving }: { name: string; leaving: boolean }) {
  return <div className={`gate-splash${leaving ? ' gate-splash--out' : ''}`} role="status" aria-label="กำลังเปิดแอป">
    <Pig className="gate-splash__pig" />
    <b>ยินดีต้อนรับกลับมา</b>
    <span>{name}</span>
  </div>
}

/** ด่านเข้าแอป: ยังไม่ล็อกอิน → หน้าล็อกอิน → หน้าต้อนรับ; ล็อกอินอยู่แล้ว → ฉากต้อนรับกลับสั้น ๆ แล้วเปิดแอป */
export default function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(initialPhase)
  const [user, setUser] = useState<StoredUser | null>(readStoredUser)
  const [leaving, setLeaving] = useState(false)
  const phaseRef = useRef(phase)
  const hadSession = useRef(readStoredUser() !== null)

  useEffect(() => { phaseRef.current = phase }, [phase])

  useEffect(() => {
    if (phase !== 'splash') return
    const out = window.setTimeout(() => setLeaving(true), splashMs)
    const done = window.setTimeout(() => { setPhase('app'); setLeaving(false) }, splashMs + splashOutMs)
    return () => { window.clearTimeout(out); window.clearTimeout(done) }
  }, [phase])

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    const timer = window.setTimeout(() => {
      void import('../lib/supabase').then(async ({ supabase }) => {
        if (cancelled) return
        const { data: current } = await supabase.auth.getSession()
        if (cancelled) return
        if (!current.session && hadSession.current) {
          // เซสชันที่เก็บไว้หมดอายุหรือถูกเพิกถอน
          hadSession.current = false
          setUser(null); setPhase('login')
        }
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') { setUser(null); setGateSkipped(false); setPhase('login') }
          else if (event === 'SIGNED_IN' && session && phaseRef.current === 'login') {
            setUser({ name: nameFromUser(session.user), email: session.user.email ?? '' })
            setPhase('welcome')
          }
        })
        unsubscribe = () => data.subscription.unsubscribe()
      }).catch(() => undefined)
    }, 300)
    return () => { cancelled = true; window.clearTimeout(timer); unsubscribe?.() }
  }, [])

  if (phase === 'login') return <LoginScreen onSkip={() => { setGateSkipped(true); setPhase('app') }} />
  if (phase === 'welcome') return <WelcomeScreen name={user?.name ?? 'เพื่อน'} onContinue={() => setPhase('app')} />
  return <>{children}{phase === 'splash' && <Splash name={user?.name ?? ''} leaving={leaving} />}</>
}
