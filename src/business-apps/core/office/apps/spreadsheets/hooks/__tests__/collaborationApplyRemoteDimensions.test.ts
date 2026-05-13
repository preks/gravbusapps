import { createCollaborationApplyRemoteDimensions } from '../collaborationApplyRemoteDimensions'
import type { SpreadsheetRemoteDimensionsPayload } from '../../core/SpreadsheetCollaborationContract'

describe('createCollaborationApplyRemoteDimensions', () => {
  const basePayload = (): SpreadsheetRemoteDimensionsPayload => ({
    sheetId: 'sh1',
    defaultColWidth: 0,
    defaultRowHeight: 0,
    columnData: {},
    rowData: {},
    rowHeaderWidth: 0,
    columnHeaderHeight: 0,
    zoomRatio: 1
  })

  it('skips grid apply when every column delta matches a recent local resize echo', () => {
    const applyRemoteDimensions = jest.fn()
    const now = Date.now()
    const handler = createCollaborationApplyRemoteDimensions({
      activeSheetId: 'sh1',
      spreadsheetGridRef: { current: { applyRemoteDimensions } },
      recentLocalRowHeightRef: { current: new Map() },
      recentLocalColWidthRef: {
        current: new Map([['sh1:2', { width: 80, at: now }]])
      },
      baselineRowHeightsRef: { current: new Map() },
      baselineColWidthsRef: { current: new Map() }
    })
    handler({
      ...basePayload(),
      columnData: { '2': { w: 80 } }
    })
    expect(applyRemoteDimensions).not.toHaveBeenCalled()
  })

  it('invokes grid apply when dimensions survive echo filtering', () => {
    const applyRemoteDimensions = jest.fn()
    const handler = createCollaborationApplyRemoteDimensions({
      activeSheetId: 'sh1',
      spreadsheetGridRef: { current: { applyRemoteDimensions } },
      recentLocalRowHeightRef: { current: new Map() },
      recentLocalColWidthRef: { current: new Map() },
      baselineRowHeightsRef: { current: new Map() },
      baselineColWidthsRef: { current: new Map() }
    })
    handler({
      ...basePayload(),
      columnData: { '1': { w: 120 } }
    })
    expect(applyRemoteDimensions).toHaveBeenCalledTimes(1)
    expect(applyRemoteDimensions.mock.calls[0][0]).toMatchObject({
      sheetId: 'sh1',
      columnData: { '1': { w: 120 } }
    })
  })
})
