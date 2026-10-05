import { describe, expect, it } from 'vitest'
import { createBackupPayload, parseBackup } from './backup'
import type { FinanceData } from './finance'

const sample: FinanceData = {
  settings: {
    monthlyIncome: 28000,
    fallbackBudget: 7000,
    weekStartsOn: 1,
    electricityRate: 4.2,
    waterRate: 18,
    waterServiceFee: 0,
    birthday: null,
    theme: 'light',
  },
  transactions: [],
  bills: [],
  debts: [],
  goals: [],
  events: [],
  goalMovements: [],
}

describe('local backup', () => {
  it('round-trips the complete data bundle with a versioned envelope', () => {
    const json = createBackupPayload(sample, new Date('2026-09-23T00:00:00.000Z'))

    expect(JSON.parse(json)).toMatchObject({ schemaVersion: 1, appName: 'ตังค์พอดี' })
    expect(parseBackup(json)).toEqual({ ...sample, recurring: [], piggy: { hintsEnabled: true, dismissed: {} }, isDemo: false })
  })

  it('rejects unsupported versions before returning imported data', () => {
    expect(() => parseBackup(JSON.stringify({ schemaVersion: 99, data: sample }))).toThrow('เวอร์ชันไฟล์สำรองนี้ไม่รองรับ')
  })

  it('rejects incomplete records instead of overwriting local data', () => {
    expect(() => parseBackup(JSON.stringify({ schemaVersion: 1, data: { ...sample, bills: null } }))).toThrow('ไฟล์สำรองไม่ครบหรือเสียหาย')
    expect(() => parseBackup('{not json')).toThrow('อ่านไฟล์สำรองไม่ได้')
  })

  it('rejects an unknown appearance theme', () => {
    const invalid = { ...sample, settings: { ...sample.settings, theme: 'sepia' } }
    expect(() => parseBackup(JSON.stringify({ schemaVersion: 1, data: invalid }))).toThrow('ไฟล์สำรองไม่ครบหรือเสียหาย')
  })

  it('migrates existing version-one backups to the light theme', () => {
    const { theme: _theme, ...oldSettings } = sample.settings
    const oldData = { ...sample, settings: oldSettings }
    expect(parseBackup(JSON.stringify({ schemaVersion: 1, data: oldData })).settings.theme).toBe('light')
  })
})
