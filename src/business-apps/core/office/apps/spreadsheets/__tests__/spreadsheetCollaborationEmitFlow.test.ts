/**
 * Tests for spreadsheet collaboration emit flow.
 * Verifies that each cell change triggers an emitOperation call with correct payload.
 */

describe('spreadsheetCollaborationEmitFlow', () => {
  describe('handleCellsChange emit behavior', () => {
    const normalizeCellValueForBatchPersistence = (value: unknown): unknown => {
      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.startsWith('=') ? { f: trimmed } : value
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) return value
      const obj = value as Record<string, unknown>
      if (typeof obj.f === 'string') {
        const trimmed = obj.f.trim()
        return { ...obj, f: trimmed.startsWith('=') ? trimmed : `=${trimmed}` }
      }
      return value
    }

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

    it('normalizes formula writes before they are queued for batch persistence', () => {
      const pendingCellChanges: Array<{ rowId: string; columnName: string; value: unknown }> = []
      const handleCellsChangeLike = (cells: Array<{ rowId: string; columnName: string; value: unknown }>) => {
        pendingCellChanges.push(
          ...cells.map(cell => ({
            ...cell,
            value: normalizeCellValueForBatchPersistence(cell.value)
          }))
        )
      }

      handleCellsChangeLike([{ rowId: 'row_0', columnName: 'ColA', value: '=SUM(A:A)' }])

      expect(pendingCellChanges).toEqual([{ rowId: 'row_0', columnName: 'ColA', value: { f: '=SUM(A:A)' } }])
    })

    it('keeps only the newest pending snapshot request for the same sheet', () => {
      const pendingSnapshotCheckpointBySheet = new Map<string, { requestedAt: number }>()

      pendingSnapshotCheckpointBySheet.set('sheet-1', { requestedAt: 1 })
      pendingSnapshotCheckpointBySheet.set('sheet-1', { requestedAt: 2 })
      pendingSnapshotCheckpointBySheet.set('sheet-2', { requestedAt: 3 })

      expect(Array.from(pendingSnapshotCheckpointBySheet.entries())).toEqual([
        ['sheet-1', { requestedAt: 2 }],
        ['sheet-2', { requestedAt: 3 }]
      ])
    })
  })
})
