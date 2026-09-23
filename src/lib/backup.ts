import type { FinanceData } from './finance'

const schemaVersion = 1

interface BackupEnvelope {
  appName: string
  schemaVersion: number
  exportedAt: string
  data: FinanceData
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function hasStringId(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0
}

function isFinanceData(value: unknown): value is FinanceData {
  if (!isRecord(value) || !isRecord(value.settings)) return false
  const settings = value.settings
  if (!isNumber(settings.monthlyIncome) || !isNumber(settings.fallbackBudget)) return false
  if (!Number.isInteger(settings.weekStartsOn) || Number(settings.weekStartsOn) < 0 || Number(settings.weekStartsOn) > 6) return false
  if (!isNumber(settings.electricityRate) || !isNumber(settings.waterRate) || !isNumber(settings.waterServiceFee)) return false
  if (settings.birthday !== null && !isDate(settings.birthday)) return false
  if (settings.theme !== undefined && settings.theme !== 'light' && settings.theme !== 'dark') return false

  if (!Array.isArray(value.transactions) || !value.transactions.every((item) =>
    hasStringId(item) && isDate(item.date) && (item.kind === 'income' || item.kind === 'expense') && isNumber(item.amount) && typeof item.category === 'string'
  )) return false
  if (!Array.isArray(value.bills) || !value.bills.every((item) =>
    hasStringId(item) && typeof item.title === 'string' && isNumber(item.amount) && isDate(item.dueDate) && typeof item.repeatMonthly === 'boolean' && typeof item.paid === 'boolean'
  )) return false
  if (!Array.isArray(value.debts) || !value.debts.every((item) =>
    hasStringId(item) && typeof item.title === 'string' && isNumber(item.balance) && isNumber(item.installment) && isDate(item.dueDate)
  )) return false
  if (!Array.isArray(value.goals) || !value.goals.every((item) =>
    hasStringId(item) && typeof item.title === 'string' && isNumber(item.target) && isNumber(item.balance) && isNumber(item.monthlyPlan)
  )) return false
  if (!Array.isArray(value.events) || !value.events.every((item) =>
    hasStringId(item) && typeof item.title === 'string' && isDate(item.date)
  )) return false
  if (!Array.isArray(value.goalMovements) || !value.goalMovements.every((item) =>
    hasStringId(item) && typeof item.goalId === 'string' && isDate(item.date) && (item.direction === 'in' || item.direction === 'out') && isNumber(item.amount)
  )) return false
  return true
}

export function createBackupPayload(data: FinanceData, exportedAt = new Date()): string {
  const envelope: BackupEnvelope = {
    appName: 'ตังค์พอดี',
    schemaVersion,
    exportedAt: exportedAt.toISOString(),
    data,
  }
  return JSON.stringify(envelope, null, 2)
}

export function parseBackup(contents: string): FinanceData {
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch {
    throw new Error('อ่านไฟล์สำรองไม่ได้')
  }

  if (!isRecord(parsed)) throw new Error('อ่านไฟล์สำรองไม่ได้')
  if (parsed.schemaVersion !== schemaVersion) throw new Error('เวอร์ชันไฟล์สำรองนี้ไม่รองรับ')
  if (!isFinanceData(parsed.data)) throw new Error('ไฟล์สำรองไม่ครบหรือเสียหาย')
  return {
    ...parsed.data,
    settings: { ...parsed.data.settings, theme: parsed.data.settings.theme ?? 'light' },
    isDemo: false,
  }
}
