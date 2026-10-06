import type { MoneyTransaction } from './finance'

export interface AccountEntry {
  id: string
  account_id: string
  user_id: string
  kind: 'in' | 'out'
  amount: number
  category: string
  note: string | null
  transfer: boolean
  entry_date: string
  created_at: string
}

export const ACCOUNT_CATEGORIES = ['อาหาร', 'ของใช้ในบ้าน', 'ค่าน้ำค่าไฟ', 'ค่าเช่า/ผ่อน', 'เดินทาง', 'อื่น ๆ']

const signed = (entry: Pick<AccountEntry, 'kind' | 'amount'>) => entry.kind === 'in' ? entry.amount : -entry.amount

/** ยอดคงเหลือ (ติดลบได้ เพราะบัญชีร่วมอาจใช้เกินยอดที่เติม) */
export function accountBalance(entries: Array<Pick<AccountEntry, 'kind' | 'amount'>>): number {
  return entries.reduce((sum, entry) => sum + signed(entry), 0)
}

/** เติมเข้า/ใช้ไปของแต่ละคน เรียงคนที่เติมมากสุดก่อน รวมสมาชิกที่ยังไม่มีรายการ */
export function memberFlows(entries: AccountEntry[], memberIds: string[]): Array<{ userId: string; in: number; out: number }> {
  const flows = new Map(memberIds.map((id) => [id, { userId: id, in: 0, out: 0 }]))
  for (const entry of entries) {
    const flow = flows.get(entry.user_id) ?? { userId: entry.user_id, in: 0, out: 0 }
    if (entry.kind === 'in') flow.in += entry.amount; else flow.out += entry.amount
    flows.set(entry.user_id, flow)
  }
  return [...flows.values()].sort((a, b) => b.in - a.in)
}

/** รายจ่ายตามหมวดของเดือนที่ระบุ (YYYY-MM) ไม่นับรายการโอน/ถอน */
export function monthCategoryTotals(entries: AccountEntry[], month: string): Array<{ category: string; total: number }> {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    if (entry.kind !== 'out' || entry.transfer || !entry.entry_date.startsWith(month)) continue
    totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amount)
  }
  return [...totals].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total)
}

/** รายการคู่ฝั่งส่วนตัว: โอนเข้าบัญชีร่วม = รายจ่าย, ถอนออกมา = รายรับ */
export function personalTransferFor(entry: Pick<AccountEntry, 'id' | 'kind' | 'amount' | 'entry_date'>, accountTitle: string, id: string): MoneyTransaction {
  const deposit = entry.kind === 'in'
  return {
    id,
    date: entry.entry_date,
    kind: deposit ? 'expense' : 'income',
    amount: entry.amount,
    category: 'บัญชีร่วม',
    note: `${deposit ? 'โอนเข้า' : 'ถอนจาก'}บัญชีร่วม ${accountTitle}`,
    sharedEntryId: entry.id,
  }
}

export function buildAccountInviteLink(code: string, origin: string, basePath: string): string {
  return `${origin}${basePath}#acct/${code}`
}

/** อ่านรหัสเชิญบัญชีร่วมจากลิงก์ เช่น #acct/AB12CD */
export function parseAccountCode(hash: string): string | null {
  const match = /^#\/?acct\/([a-zA-Z0-9]{6})$/.exec(hash)
  return match ? match[1]!.toUpperCase() : null
}
