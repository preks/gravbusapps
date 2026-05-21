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

  it('sorts by order and reseats sequential indexes', () => {
    const raw = [
      base({ id: 'c3', name: 'c', label: 'C', order: 5 }),
      base({ id: 'c1', name: 'a', label: 'A', order: 1 }),
      base({ id: 'c2', name: 'b', label: 'B', order: 1 })
    ]

    expect(normalizeSpreadsheetColumnsForDisplay(raw)).toEqual([
      expect.objectContaining({ id: 'c1', order: 0 }),
      expect.objectContaining({ id: 'c2', order: 1 }),
      expect.objectContaining({ id: 'c3', order: 2 })
    ])
  })
})
