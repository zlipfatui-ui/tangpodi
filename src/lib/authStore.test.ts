import { describe, expect, it } from 'vitest'
import { isGateSkipped, nameFromUser, readStoredUser, setGateSkipped } from './authStore'
import { authStorageKey } from './supabaseConfig'

const fakeStorage = (initial: Record<string, string> = {}) => {
  const map = new Map(Object.entries(initial))
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => void map.set(key, value), removeItem: (key: string) => void map.delete(key) }
}

describe('authStore', () => {
  it('reads the signed-in user from the stored supabase session', () => {
    const session = JSON.stringify({ access_token: 'x', user: { email: 'mook@gmail.com', user_metadata: { display_name: 'มุก' } } })
    expect(readStoredUser(fakeStorage({ [authStorageKey]: session }))).toEqual({ name: 'มุก', email: 'mook@gmail.com' })
  })

  it('falls back to the email name and tolerates missing or broken data', () => {
    expect(nameFromUser({ email: 'somchai@gmail.com', user_metadata: {} })).toBe('somchai')
    expect(readStoredUser(fakeStorage())).toBeNull()
    expect(readStoredUser(fakeStorage({ [authStorageKey]: '{not json' }))).toBeNull()
    expect(readStoredUser(undefined)).toBeNull()
  })

  it('remembers that the login gate was skipped', () => {
    const storage = fakeStorage()
    expect(isGateSkipped(storage)).toBe(false)
    setGateSkipped(true, storage)
    expect(isGateSkipped(storage)).toBe(true)
    setGateSkipped(false, storage)
    expect(isGateSkipped(storage)).toBe(false)
  })
})
