import { shouldSkipRedundantStructuralWsEvent, type StructuralWsDedupToken } from '../spreadsheetStructuralWsDedup'

describe('shouldSkipRedundantStructuralWsEvent', () => {
  const now = 1_000_000

  it('ignores expired tokens', () => {
    const token: StructuralWsDedupToken = {
      kind: 'sheet_created',
      sheetId: 'a',
      version: 0,
      expiresAt: now - 1
    }
    expect(
      shouldSkipRedundantStructuralWsEvent(
        token,
        { type: 'sheet_created', sheetId: 'a', sheet: { id: 'a', version: 0 } },
        now
      )
    ).toBe(false)
  })

  it('skips sheet_created echo when id and version match', () => {
    const token: StructuralWsDedupToken = {
      kind: 'sheet_created',
      sheetId: 'a',
      version: 0,
      expiresAt: now + 10_000
    }
    expect(
      shouldSkipRedundantStructuralWsEvent(
        token,
        { type: 'sheet_created', sheetId: 'a', sheet: { id: 'a', version: 0 } },
        now
      )
    ).toBe(true)
    expect(
      shouldSkipRedundantStructuralWsEvent(
        token,
        { type: 'sheet_created', sheetId: 'b', sheet: { id: 'b', version: 0 } },
        now
      )
    ).toBe(false)
  })

  it('skips sheet_renamed echo when id, version, and trimmed name match', () => {
    const token: StructuralWsDedupToken = {
      kind: 'sheet_renamed',
      sheetId: 'a',
      version: 3,
      name: 'Next',
      expiresAt: now + 10_000
    }
    expect(
      shouldSkipRedundantStructuralWsEvent(
        token,
        { type: 'sheet_updated', sheetId: 'a', sheet: { id: 'a', version: 3, name: 'Next' } },
        now
      )
    ).toBe(true)
    expect(
      shouldSkipRedundantStructuralWsEvent(
        token,
        { type: 'sheet_renamed', sheetId: 'a', sheet: { id: 'a', version: 3, name: 'Other' } },
        now
      )
    ).toBe(false)
  })

  it('skips sheet_deleted echo when sheetId matches', () => {
    const token: StructuralWsDedupToken = {
      kind: 'sheet_deleted',
      sheetId: 'a',
      expiresAt: now + 10_000
    }
    expect(shouldSkipRedundantStructuralWsEvent(token, { type: 'sheet_deleted', sheetId: 'a' }, now)).toBe(true)
    expect(shouldSkipRedundantStructuralWsEvent(token, { type: 'sheet_deleted', sheetId: 'b' }, now)).toBe(false)
  })
})
