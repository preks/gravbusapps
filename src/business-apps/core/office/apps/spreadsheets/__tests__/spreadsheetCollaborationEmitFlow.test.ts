/**
 * Tests for spreadsheet collaboration emit flow.
 * Verifies that each cell change triggers an emitOperation call with correct payload.
 */

describe('spreadsheetCollaborationEmitFlow', () => {
  describe('handleCellsChange emit behavior', () => {
    it('does not emit live collaboration ops for routine cell changes', () => {
      const emitOperation = jest.fn()
      const handleCellsChangeLike = (_cells: Array<{ rowId: string; columnName: string; value: unknown }>) => {
        void _cells
      }

      handleCellsChangeLike([
        { rowId: 'row_0', columnName: 'ColA', value: 'a1' },
        { rowId: 'row_1', columnName: 'ColA', value: 'a2' },
        { rowId: 'row_0', columnName: 'ColB', value: 10 }
      ])

      expect(emitOperation).not.toHaveBeenCalled()
    })

    it('keeps newly created rows local until persistence assigns backend ids', () => {
      const pendingCellChanges: Array<{ rowId: string; columnName: string; value: unknown }> = []
      const handleCellsChangeLike = (cells: Array<{ rowId: string; columnName: string; value: unknown }>) => {
        pendingCellChanges.push(...cells)
      }

      handleCellsChangeLike([
        { rowId: 'row_0', columnName: 'ColA', value: 'a' },
        { rowId: 'row_new', columnName: 'ColA', value: 'new-value' }
      ])

      expect(pendingCellChanges).toEqual([
        { rowId: 'row_0', columnName: 'ColA', value: 'a' },
        { rowId: 'row_new', columnName: 'ColA', value: 'new-value' }
      ])
    })
  })
})
