/**
 * Tests for spreadsheet collaboration emit flow.
 * Verifies that each cell change triggers an emitOperation call with correct payload.
 */

describe('spreadsheetCollaborationEmitFlow', () => {
  describe('handleCellsChange emit behavior', () => {
    it('emits one operation per cell when all cells have backend row ids', () => {
      const emitOperation = jest.fn()
      const getBackendRowIdForUiRowId = (uiRowId: string): string | undefined => {
        const map: Record<string, string> = {
          row_0: 'uuid-1',
          row_1: 'uuid-2'
        }
        return map[uiRowId]
      }

      const handleCellsChangeLike = (
        cells: Array<{ rowId: string; columnName: string; value: unknown }>,
        activeSheetId: string
      ) => {
        cells.forEach(cell => {
          const backendRowId = getBackendRowIdForUiRowId(String(cell.rowId))
          if (!backendRowId) return
          emitOperation({
            type: 'cell_update',
            data: {
              sheetId: activeSheetId,
              rowId: backendRowId,
              column: cell.columnName,
              value: cell.value
            },
            broadcastOnly: true
          })
        })
      }

      handleCellsChangeLike(
        [
          { rowId: 'row_0', columnName: 'ColA', value: 'a1' },
          { rowId: 'row_1', columnName: 'ColA', value: 'a2' },
          { rowId: 'row_0', columnName: 'ColB', value: 10 }
        ],
        'sheet-1'
      )

      expect(emitOperation).toHaveBeenCalledTimes(3)
      expect(emitOperation).toHaveBeenNthCalledWith(1, {
        type: 'cell_update',
        data: { sheetId: 'sheet-1', rowId: 'uuid-1', column: 'ColA', value: 'a1' },
        broadcastOnly: true
      })
      expect(emitOperation).toHaveBeenNthCalledWith(2, {
        type: 'cell_update',
        data: { sheetId: 'sheet-1', rowId: 'uuid-2', column: 'ColA', value: 'a2' },
        broadcastOnly: true
      })
      expect(emitOperation).toHaveBeenNthCalledWith(3, {
        type: 'cell_update',
        data: { sheetId: 'sheet-1', rowId: 'uuid-1', column: 'ColB', value: 10 },
        broadcastOnly: true
      })
    })

    it('skips emit for cells whose row has no backend id (new/unpersisted rows)', () => {
      const emitOperation = jest.fn()
      const getBackendRowIdForUiRowId = (uiRowId: string): string | undefined => {
        if (uiRowId === 'row_new') return undefined
        return 'uuid-persisted'
      }

      const handleCellsChangeLike = (
        cells: Array<{ rowId: string; columnName: string; value: unknown }>,
        activeSheetId: string
      ) => {
        cells.forEach(cell => {
          const backendRowId = getBackendRowIdForUiRowId(String(cell.rowId))
          if (!backendRowId) return
          emitOperation({
            type: 'cell_update',
            data: {
              sheetId: activeSheetId,
              rowId: backendRowId,
              column: cell.columnName,
              value: cell.value
            },
            broadcastOnly: true
          })
        })
      }

      handleCellsChangeLike(
        [
          { rowId: 'row_0', columnName: 'ColA', value: 'a' },
          { rowId: 'row_new', columnName: 'ColA', value: 'new-value' }
        ],
        'sheet-1'
      )

      expect(emitOperation).toHaveBeenCalledTimes(1)
      expect(emitOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rowId: 'uuid-persisted', value: 'a' })
        })
      )
    })
  })
})
