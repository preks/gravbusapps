import { buildDuplicateVisualWorksheetSnapshot, proposeDuplicateSheetDisplayName } from '../workbookStructureFormatting'

describe('proposeDuplicateSheetDisplayName', () => {
  it('uses "(copy)" suffix and increments when taken', () => {
    const taken = new Set(['Revenue (copy)'])
    expect(proposeDuplicateSheetDisplayName('Revenue', taken)).toBe('Revenue (copy 2)')
  })
})

describe('buildDuplicateVisualWorksheetSnapshot', () => {
  it('returns formatting-only worksheet with overridden id/name', () => {
    const snapshot = {
      styles: { s1: { ff: 'Arial' } },
      sheets: {
        src: {
          id: 'src',
          name: 'Src',
          cellData: {
            0: {
              0: { v: 'hello', s: 's1' }
            }
          }
        }
      }
    }
    const out = buildDuplicateVisualWorksheetSnapshot(snapshot, 'src', 'new-id', 'Copy')
    expect(out?.id).toBe('new-id')
    expect(out?.name).toBe('Copy')
    const row0 = out?.cellData as Record<number, Record<number, { v?: unknown; ff?: unknown }>> | undefined
    expect(row0?.[0]?.[0]?.v).toBeUndefined()
    expect(row0?.[0]?.[0]?.ff).toBe('Arial')
  })
})
