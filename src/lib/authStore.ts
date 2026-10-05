import { authStorageKey } from './supabaseConfig'

export interface StoredUser {
  name: string
  email: string
}

type ReadableStorage = Pick<Storage, 'getItem'>
type WritableStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const skipKey = 'tangpodi-gate-skipped'

function defaultStorage(): WritableStorage | undefined {
  try { return globalThis.localStorage } catch { return undefined }
}

export function nameFromUser(user: { email?: string | null; user_metadata?: Record<string, unknown> | null }): string {
  const meta = user.user_metadata?.display_name
  if (typeof meta === 'string' && meta.trim()) return meta.trim()
  return user.email?.split('@')[0] ?? 'เพื่อน'
}

/** อ่านผู้ใช้จากเซสชันที่ supabase-js เก็บไว้ (แบบ synchronous เพื่อเปิดแอปได้ทันที ไม่รอเน็ต) */
export function readStoredUser(storage: ReadableStorage | undefined = defaultStorage()): StoredUser | null {
  try {
    const raw = storage?.getItem(authStorageKey)
    if (!raw) return null
    const user = (JSON.parse(raw) as { user?: { email?: string; user_metadata?: Record<string, unknown> } }).user
    if (!user?.email) return null
    return { name: nameFromUser(user), email: user.email }
  } catch {
    return null
  }
}

export function isGateSkipped(storage: ReadableStorage | undefined = defaultStorage()): boolean {
  try { return storage?.getItem(skipKey) === 'true' } catch { return false }
}

export function setGateSkipped(value: boolean, storage: WritableStorage | undefined = defaultStorage()): void {
  try {
    if (value) storage?.setItem(skipKey, 'true')
    else storage?.removeItem(skipKey)
  } catch { /* ใช้งานต่อได้ แค่จะถามล็อกอินอีกครั้งตอนเปิดแอป */ }
}
