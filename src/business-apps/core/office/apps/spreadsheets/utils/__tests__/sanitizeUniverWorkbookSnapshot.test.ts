/**
 * @jest-environment jsdom
 */
import { sanitizeUniverWorkbookSnapshotForBootstrap } from '../sanitizeUniverWorkbookSnapshot'

describe('sanitizeUniverWorkbookSnapshotForBootstrap', () => {
  it('preserves safe workbook snapshots and sanitizes unsafe style and formula payloads', () => {
    const result = sanitizeUniverWorkbookSnapshotForBootstrap({
      id: 'workbook-sheet-1',
      name: 'Sheet 1',
      sheetOrder: ['sheet-1'],
      styles: {
        safeStyle: { bg: { rgb: '#ff0000' }, ff: 'Inter' },
        unsafeStyle: { note: 'expression(alert(1))' }
      },
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet 1',
          cellData: {
            0: {
              0: { f: '=HYPERLINK("https://example.com","Open")', s: 'safeStyle' },
              1: { f: '=IMAGE("javascript:alert(1)")', s: 'unsafeStyle' }
            }
          }
        }
      }
    })

    expect(result.changed).toBe(true)
    expect(result.snapshot).not.toBeNull()
    expect(result.snapshot?.styles).toEqual({
      safeStyle: { bg: { rgb: '#ff0000' }, ff: 'Inter' }
    })
    expect(result.snapshot?.sheets).toMatchObject({
      'sheet-1': {
        cellData: {
          '0': {
            '0': { f: '=HYPERLINK("https://example.com","Open")', s: 'safeStyle' }
          }
        }
      }
    })
    const firstRowCells = (
      result.snapshot?.sheets as Record<string, { cellData?: Record<string, Record<string, unknown>> }>
    )['sheet-1'].cellData?.['0']
    expect(firstRowCells?.['1']).toBeUndefined()
  })

  it('rejects malformed workbook snapshots without bootstrap-critical sheet objects', () => {
    const result = sanitizeUniverWorkbookSnapshotForBootstrap({
      id: 'broken-workbook',
      name: 'Broken',
      sheetOrder: ['sheet-1'],
      sheets: [] as unknown
    } as Record<string, unknown>)

    expect(result.snapshot).toBeNull()
  })

  it('moves inline cell formatting keys under s for bootstrap snapshots', () => {
    const result = sanitizeUniverWorkbookSnapshotForBootstrap({
      id: 'workbook-sheet-1',
      name: 'Sheet 1',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet 1',
          cellData: {
            0: {
              0: { v: 'A', bg: { rgb: '#ff0000' }, bl: 1 }
            }
          }
        }
      }
    })

    expect(result.snapshot).not.toBeNull()
    expect(result.snapshot?.sheets).toMatchObject({
      'sheet-1': {
        cellData: {
          '0': {
            '0': {
              v: 'A',
              s: {
                bg: { rgb: '#ff0000' },
                bl: 1
              }
            }
          }
        }
      }
    })
  })

  it('keeps a valid style ref when mixed inline keys are redundant and merges true overrides deterministically', () => {
    const result = sanitizeUniverWorkbookSnapshotForBootstrap({
      id: 'workbook-sheet-1',
      name: 'Sheet 1',
      sheetOrder: ['sheet-1'],
      styles: {
        styleA: { bg: { rgb: '#ff0000' } }
      },
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet 1',
          cellData: {
            0: {
              0: { v: 'A', s: 'styleA', bg: { rgb: '#ff0000' } },
              1: { v: 'B', s: 'styleA', bl: 1 }
            }
          }
        }
      }
    })

    expect(result.snapshot?.sheets).toMatchObject({
      'sheet-1': {
        cellData: {
          '0': {
            '0': { v: 'A', s: 'styleA' },
            '1': {
              v: 'B',
              s: {
                bg: { rgb: '#ff0000' },
                bl: 1
              }
            }
          }
        }
      }
    })
  })

  it('preserves numeric style refs by canonicalizing them to string ids', () => {
    const result = sanitizeUniverWorkbookSnapshotForBootstrap({
      id: 'workbook-sheet-1',
      name: 'Sheet 1',
      sheetOrder: ['sheet-1'],
      styles: {
        '1': { bg: { rgb: '#00ff00' } }
      },
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet 1',
          cellData: {
            0: {
              0: { v: 'A', s: 1 }
            }
          }
        }
      }
    })

    expect(result.snapshot?.sheets).toMatchObject({
      'sheet-1': {
        cellData: {
          '0': {
            '0': { v: 'A', s: '1' }
          }
        }
      }
    })
  })

  it('preserves value cells when hydration payload includes f: null', () => {
    const result = sanitizeUniverWorkbookSnapshotForBootstrap({
      id: 'workbook-sheet-1',
      name: 'Sheet 1',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet 1',
          cellData: {
            1: {
              1: { f: null, v: 'Emir' }
            }
          }
        }
      }
    })

    expect(result.snapshot).not.toBeNull()
    expect(result.snapshot?.sheets).toMatchObject({
      'sheet-1': {
        cellData: {
          '1': {
            '1': {
              v: 'Emir'
            }
          }
        }
      }
    })
  })
})
