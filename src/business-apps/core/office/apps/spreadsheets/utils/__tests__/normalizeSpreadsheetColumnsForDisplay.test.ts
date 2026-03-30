import { normalizeSpreadsheetColumnsForDisplay } from '../normalizeSpreadsheetColumnsForDisplay'
import type { SpreadsheetColumn } from '../../types'

const base = (overrides: Partial<SpreadsheetColumn>): SpreadsheetColumn => ({
  id: 'c1',
  name: 'a',
  label: 'A',
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  order: 0,
  ...overrides
})

describe('normalizeSpreadsheetColumnsForDisplay', () => {
  it('treats missing isVisible as visible', () => {
    const raw = [base({ isVisible: undefined as unknown as boolean })]
    const next = normalizeSpreadsheetColumnsForDisplay(raw)
    expect(next[0].isVisible).toBe(true)
  })

  it('preserves explicit false', () => {
    const raw = [base({ isVisible: false })]
    const next = normalizeSpreadsheetColumnsForDisplay(raw)
    expect(next[0].isVisible).toBe(false)
  })

  it('preserves explicit true', () => {
    const raw = [base({ isVisible: true })]
    const next = normalizeSpreadsheetColumnsForDisplay(raw)
    expect(next[0].isVisible).toBe(true)
  })
})
