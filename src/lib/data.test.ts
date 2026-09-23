import { describe, expect, it } from 'vitest'
import { addDefaultTheme, createDemoFinanceData, createEmptyFinanceData } from './data'

describe('appearance defaults', () => {
  it('starts both fresh and demo data in the light theme', () => {
    expect(createEmptyFinanceData().settings.theme).toBe('light')
    expect(createDemoFinanceData(new Date(2026, 8, 23)).settings.theme).toBe('light')
  })

  it('adds the light default when loading an older local record', () => {
    const fresh = createEmptyFinanceData()
    const { theme: _theme, ...oldSettings } = fresh.settings
    const oldData = { ...fresh, settings: oldSettings } as typeof fresh
    expect(addDefaultTheme(oldData).settings.theme).toBe('light')
  })
})
