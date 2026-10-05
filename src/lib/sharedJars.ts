export interface JarEntry {
  id: string
  jar_id: string
  user_id: string
  kind: 'in' | 'out'
  amount: number
  note: string | null
  entry_date: string
  created_at: string
}

const signed = (entry: Pick<JarEntry, 'kind' | 'amount'>) => entry.kind === 'in' ? entry.amount : -entry.amount

export function jarBalance(entries: Array<Pick<JarEntry, 'kind' | 'amount'>>): number {
  return Math.max(0, entries.reduce((sum, entry) => sum + signed(entry), 0))
}

/** ยอดสุทธิที่แต่ละคนออมไว้ เรียงมากไปน้อย รวมสมาชิกที่ยังไม่เคยออม (ยอด 0) */
export function memberTotals(entries: JarEntry[], memberIds: string[]): Array<{ userId: string; total: number }> {
  const totals = new Map(memberIds.map((id) => [id, 0]))
  for (const entry of entries) totals.set(entry.user_id, (totals.get(entry.user_id) ?? 0) + signed(entry))
  return [...totals].map(([userId, total]) => ({ userId, total: Math.max(0, total) })).sort((a, b) => b.total - a.total)
}

export function normalizeCode(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
}

/** อ่านรหัสเชิญจากลิงก์ เช่น #join/AB12CD */
export function parseJoinCode(hash: string): string | null {
  const match = /^#\/?join\/([a-zA-Z0-9]{6})$/.exec(hash)
  return match ? match[1]!.toUpperCase() : null
}

export function buildInviteLink(code: string, origin: string, basePath: string): string {
  return `${origin}${basePath}#join/${code}`
}
