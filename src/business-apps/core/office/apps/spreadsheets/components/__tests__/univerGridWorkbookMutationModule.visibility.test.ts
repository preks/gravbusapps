import {
  getColumnMoveMutation,
  getRowMoveMutation,
  isNativeColumnMoveCommand,
  isNativeRowDeleteCommand,
  isNativeRowMoveCommand,
  resolveSpreadsheetFeatureOperationType,
  resolveVisibilityAxis,
  resolveVisibilityHidden,
  runWithWorkbookFacadeSheetActive
} from '../univerGridWorkbookMutationModule'

describe('univerGridWorkbookMutationModule visibility helpers', () => {
  it('classifies Univer visible commands as visibility updates', () => {
    expect(resolveSpreadsheetFeatureOperationType('sheet.command.set-selected-rows-visible')).toBe('visibility_update')
    expect(resolveSpreadsheetFeatureOperationType('sheet.command.set-col-visible-on-cols')).toBe('visibility_update')
    expect(resolveSpreadsheetFeatureOperationType('sheet.mutation.set-col-hidden')).toBe('visibility_update')
  })

  it('resolves row visibility commands as unhide operations', () => {
    const commandId = 'sheet.command.set-selected-rows-visible'

    expect(resolveVisibilityAxis(commandId, undefined)).toBe('row')
    expect(resolveVisibilityHidden(commandId, undefined)).toBe(false)
  })

  it('detects native column and row structural move commands', () => {
    expect(isNativeColumnMoveCommand('sheet.mutation.move-column')).toBe(true)
    expect(isNativeColumnMoveCommand('sheet.command.move-columns')).toBe(true)
    expect(isNativeRowDeleteCommand('sheet.command.remove-rows')).toBe(true)
    expect(isNativeRowMoveCommand('sheet.mutation.move-row')).toBe(true)
    expect(isNativeRowMoveCommand('sheet.command.move-rows')).toBe(true)
  })

  it('extracts column move source and destination ranges from Univer params', () => {
    expect(
      getColumnMoveMutation({
        range: [{ startRow: 0, endRow: 0, startColumn: 2, endColumn: 3 }],
        targetRange: { startRow: 0, endRow: 0, startColumn: 10, endColumn: 11 }
      })
    ).toEqual({
      sourceStartColumn: 2,
      sourceEndColumn: 3,
      destinationStartColumn: 10
    })
  })

  it('extracts row move source and destination ranges from Univer params', () => {
    expect(
      getRowMoveMutation({
        range: [{ startRow: 2, endRow: 3, startColumn: 0, endColumn: 0 }],
        targetRange: { startRow: 10, endRow: 11, startColumn: 0, endColumn: 0 }
      })
    ).toEqual({
      sourceStartRow: 2,
      sourceEndRow: 3,
      destinationStartRow: 10
    })
  })

  it('extracts move ranges from fromRange payload shapes', () => {
    expect(
      getColumnMoveMutation({
        fromRange: { startRow: 0, endRow: 0, startColumn: 4, endColumn: 5 },
        destinationStartColumn: 1
      })
    ).toEqual({
      sourceStartColumn: 4,
      sourceEndColumn: 5,
      destinationStartColumn: 1
    })

    expect(
      getRowMoveMutation({
        fromRange: { startRow: 7, endRow: 8, startColumn: 0, endColumn: 0 },
        destinationRow: 3
      })
    ).toEqual({
      sourceStartRow: 7,
      sourceEndRow: 8,
      destinationStartRow: 3
    })
  })
})

describe('runWithWorkbookFacadeSheetActive', () => {
  it('activates target sheet then restores previous', () => {
    const calls: string[] = []
    const workbook = {
      activeId: 'a',
      getActiveSheet() {
        return { getSheetId: () => this.activeId }
      },
      setActiveSheet(id: string) {
        calls.push(`set:${id}`)
        this.activeId = id
      }
    }
    const result = runWithWorkbookFacadeSheetActive(workbook, 'b', () => {
      expect(workbook.activeId).toBe('b')
      return 42
    })
    expect(result).toBe(42)
    expect(workbook.activeId).toBe('a')
    expect(calls).toEqual(['set:b', 'set:a'])
  })

  it('no-ops when already on target sheet', () => {
    const workbook = {
      activeId: 'same',
      getActiveSheet() {
        return { getSheetId: () => this.activeId }
      },
      setActiveSheet: jest.fn()
    }
    runWithWorkbookFacadeSheetActive(workbook, 'same', () => undefined)
    expect(workbook.setActiveSheet).not.toHaveBeenCalled()
  })
})
