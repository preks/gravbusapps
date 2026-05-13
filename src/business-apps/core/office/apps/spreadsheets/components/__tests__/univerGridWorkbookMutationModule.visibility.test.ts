import {
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
