import { createClient } from '@supabase/supabase-js'

// ค่าสาธารณะ (publishable key) ใส่ในเว็บได้ ความปลอดภัยอยู่ที่ Row Level Security ใน supabase/schema.sql
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://blkgiykznjnrsgxifqpf.supabase.co'
const key = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_sBLLtxVGK_mHwEuuE4fV-g_YI7Pwqvo'

export const supabase = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })

export function friendlyAuthError(message: string): string {
  if (/invalid login/i.test(message)) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  if (/already registered/i.test(message)) return 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน'
  if (/password/i.test(message) && /6/.test(message)) return 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร'
  if (/rate limit|too many/i.test(message)) return 'ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่'
  if (/fetch|network/i.test(message)) return 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองอีกครั้ง'
  if (/email/i.test(message) && /valid|invalid/i.test(message)) return 'รูปแบบอีเมลไม่ถูกต้อง'
  return message
}
