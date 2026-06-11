import { createUniverMountWorksheetSelectionChrome } from '../univerMountWorksheetSelectionChrome'

describe('createUniverMountWorksheetSelectionChrome', () => {
  it('retries the same worksheet id until the host accepts it', () => {
    const onActiveWorksheetChange = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)

    const refs = {
      univerAPIRef: {
        current: {
          getActiveWorkbook: () => ({
            getActiveSheet: () => ({
              getSheetId: () => 'sheet-2',
              getSheetName: () => 'Sheet 2'
            })
          })
        }
      },
      activeSelectionRef: { current: null },
      copiedSelectionAnchorRef: { current: null },
      pendingFormattingPasteIntentRef: { current: null },
      lastEmittedWorksheetIdRef: { current: '' },
      suppressWorksheetSelectionEmitRef: { current: null },
      callbacksRef: {
        current: {
          onActiveWorksheetChange
        }
      }
    }

    const chrome = createUniverMountWorksheetSelectionChrome(refs as never)

    chrome.emitWorksheetFromUniver()
    expect(onActiveWorksheetChange).toHaveBeenCalledTimes(1)
    expect(refs.lastEmittedWorksheetIdRef.current).toBe('')

    chrome.emitWorksheetFromUniver()
    expect(onActiveWorksheetChange).toHaveBeenCalledTimes(2)
    expect(refs.lastEmittedWorksheetIdRef.current).toBe('sheet-2')
  })

  it('suppresses unexpected worksheet ids until the expected bootstrap sheet appears', () => {
    const onActiveWorksheetChange = jest.fn()
    const activeSheetRef = { current: 'sheet-ghost' }

    const refs = {
      univerAPIRef: {
        current: {
          getActiveWorkbook: () => ({
            getActiveSheet: () => ({
              getSheetId: () => activeSheetRef.current,
              getSheetName: () => activeSheetRef.current
            })
          })
        }
      },
      activeSelectionRef: { current: null },
      copiedSelectionAnchorRef: { current: null },
      pendingFormattingPasteIntentRef: { current: null },
      lastEmittedWorksheetIdRef: { current: '' },
      suppressWorksheetSelectionEmitRef: {
        current: { expectedSheetId: 'sheet-1', untilMs: Date.now() + 5_000 }
      },
      callbacksRef: {
        current: {
          onActiveWorksheetChange
        }
      }
    }

    const chrome = createUniverMountWorksheetSelectionChrome(refs as never)

    chrome.emitWorksheetFromUniver()
    expect(onActiveWorksheetChange).not.toHaveBeenCalled()

    activeSheetRef.current = 'sheet-1'
    chrome.emitWorksheetFromUniver()

    expect(onActiveWorksheetChange).toHaveBeenCalledTimes(1)
    expect(onActiveWorksheetChange).toHaveBeenCalledWith('sheet-1', 'sheet-1')
    expect(refs.suppressWorksheetSelectionEmitRef.current).toBeNull()
  })
})
