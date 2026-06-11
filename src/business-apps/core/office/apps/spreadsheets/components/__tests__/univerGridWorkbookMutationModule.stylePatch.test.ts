import {
  applyStylePatchToUniverCell,
  mergeWorksheetFormattingWithAuthoritativeValues,
  resolveRemoteStyleFacadeCellData,
  toUniverFacadeCellDataFromStylePatch,
  writeRemoteCellIntoUniverWorksheetSync
} from '../univerGridWorkbookMutationModule'

describe('applyStylePatchToUniverCell', () => {
  it('drops string style ref when applying inline bg without set.s', () => {
    const patched = applyStylePatchToUniverCell({ v: 'hello', s: 'style-default' }, { set: { bg: { rgb: '#0da471' } } })

    expect(patched.bg).toEqual({ rgb: '#0da471' })
    expect(patched.s).toBeUndefined()
    expect(patched.v).toBe('hello')
  })

  it('clears inline formatting when patch assigns a style id', () => {
    const patched = applyStylePatchToUniverCell(
      { v: 'hello', s: 'style-old', bg: { rgb: '#ffffff' }, bl: 0 },
      { set: { s: 'style-new' } }
    )

    expect(patched.s).toBe('style-new')
    expect(patched.bg).toBeUndefined()
    expect(patched.bl).toBeUndefined()
    expect(patched.v).toBe('hello')
  })

  it('flattens object s before merging inline patch keys', () => {
    const patched = applyStylePatchToUniverCell(
      { s: { bg: { rgb: '#111111' }, cl: { rgb: '#222222' } } },
      { set: { bg: { rgb: '#0da471' } } }
    )

    expect(patched.bg).toEqual({ rgb: '#0da471' })
    expect(patched.cl).toEqual({ rgb: '#222222' })
    expect(patched.s).toBeUndefined()
  })
})

describe('toUniverFacadeCellDataFromStylePatch', () => {
  it('nests inline bg under s for Univer facade setValue', () => {
    const facadeCell = toUniverFacadeCellDataFromStylePatch(
      { v: 'hello', s: 'style-default' },
      { set: { bg: { rgb: '#0da471' } } }
    )

    expect(facadeCell.v).toBe('hello')
    expect(facadeCell.s).toEqual({ bg: { rgb: '#0da471' } })
    expect(facadeCell.bg).toBeUndefined()
  })

  it('inlines referenced workbook styles for remote set_style apply', () => {
    const facadeCell = resolveRemoteStyleFacadeCellData(
      { v: 4, s: 'style-old', bl: 0 },
      { set: { s: 'teDplB' } },
      { teDplB: { bl: 1 } }
    )

    expect(facadeCell.v).toBe(4)
    expect(facadeCell.s).toEqual({ bl: 1 })
  })
})

describe('mergeWorksheetFormattingWithAuthoritativeValues', () => {
  it('preserves workbook style refs while applying authoritative values', () => {
    const merged = mergeWorksheetFormattingWithAuthoritativeValues(
      {
        id: 'sheet-2',
        name: 'Sheet 2',
        cellData: {
          0: {
            0: { v: 'stale value', s: 'hydrated-style' }
          }
        }
      },
      {
        id: 'sheet-2',
        name: 'Sheet 2',
        cellData: {
          0: {
            0: { v: 'server value' }
          }
        }
      },
      'sheet-2',
      'Sheet 2'
    )

    expect((merged.cellData as Record<string, Record<string, Record<string, unknown>>>)['0']['0']).toEqual({
      v: 'server value',
      s: 'hydrated-style'
    })
  })
})

describe('writeRemoteCellIntoUniverWorksheetSync', () => {
  it('preserves inline formatting when writing scalar values', () => {
    const setValue = jest.fn()
    const worksheet = {
      getRange: jest.fn(() => ({
        getCellData: () => ({ v: 'old', bg: { rgb: '#ffff00' }, bl: 1 }),
        setValue
      }))
    }

    writeRemoteCellIntoUniverWorksheetSync({
      workbook: {},
      worksheet,
      rowForApply: 0,
      colForApply: 0,
      value: 'new',
      echoKey: '0:0',
      remoteEchoSuppressionRef: { current: new Map() }
    })

    expect(setValue).toHaveBeenCalledWith({
      v: 'new',
      bg: { rgb: '#ffff00' },
      bl: 1,
      f: null,
      p: null,
      si: null
    })
  })
})
