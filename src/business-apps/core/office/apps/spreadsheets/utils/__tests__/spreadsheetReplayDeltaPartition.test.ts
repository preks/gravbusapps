import {
  PURE_CELL_VALUE_DELTA_OP_TYPES,
  countReplayDeltaChangeKinds,
  partitionReplayDeltaChanges
} from '../spreadsheetReplayDeltaPartition'

describe('spreadsheetReplayDeltaPartition', () => {
  it('classifies the canonical cell-value op types', () => {
    expect(PURE_CELL_VALUE_DELTA_OP_TYPES.has('set_cell')).toBe(true)
    expect(PURE_CELL_VALUE_DELTA_OP_TYPES.has('set_range')).toBe(true)
    expect(PURE_CELL_VALUE_DELTA_OP_TYPES.has('clear_cell')).toBe(true)
    expect(PURE_CELL_VALUE_DELTA_OP_TYPES.has('cells_changed')).toBe(true)
    expect(PURE_CELL_VALUE_DELTA_OP_TYPES.has('set_style')).toBe(false)
    expect(PURE_CELL_VALUE_DELTA_OP_TYPES.has('add_rows')).toBe(false)
  })

  it('partitionReplayDeltaChanges separates cell-value ops from structural ops', () => {
    const changes = [
      { operationType: 'set_cell', payload: { rowId: 'r1', columnName: 'a', value: '1' } },
      { operationType: 'add_rows', payload: { rows: [] } },
      { operationType: 'set_range', payload: { cells: [] } },
      { operationType: 'set_style', payload: {} },
      { operationType: 'clear_cell', payload: { rowId: 'r2' } },
      { operationType: 'column_add', payload: {} },
      { operationType: 'cells_changed', payload: { cells: [] } },
      { operationType: 'merge_ranges', payload: {} }
    ]
    const { cellValueChanges, structuralChanges } = partitionReplayDeltaChanges(changes)
    expect(cellValueChanges.map(c => c.operationType)).toEqual(['set_cell', 'set_range', 'clear_cell', 'cells_changed'])
    expect(structuralChanges.map(c => c.operationType)).toEqual(['add_rows', 'set_style', 'column_add', 'merge_ranges'])
  })

  it('partitionReplayDeltaChanges treats unknown op types as structural (safe default)', () => {
    const { cellValueChanges, structuralChanges } = partitionReplayDeltaChanges([
      { operationType: 'totally_new_op' },
      { operationType: '' },
      {} as { operationType?: string }
    ])
    expect(cellValueChanges).toEqual([])
    expect(structuralChanges).toHaveLength(3)
  })

  it('partitionReplayDeltaChanges handles nullish / non-array input', () => {
    expect(partitionReplayDeltaChanges(undefined)).toEqual({
      cellValueChanges: [],
      structuralChanges: []
    })
    expect(partitionReplayDeltaChanges(null)).toEqual({
      cellValueChanges: [],
      structuralChanges: []
    })
  })

  it('partitionReplayDeltaChanges preserves input order within each bucket', () => {
    const changes = [
      { operationType: 'set_cell', tag: 'a' },
      { operationType: 'add_rows', tag: 'b' },
      { operationType: 'set_cell', tag: 'c' },
      { operationType: 'add_rows', tag: 'd' },
      { operationType: 'set_cell', tag: 'e' }
    ] as Array<{ operationType: string; tag: string }>
    const { cellValueChanges, structuralChanges } = partitionReplayDeltaChanges(changes)
    expect(cellValueChanges.map(c => c.tag)).toEqual(['a', 'c', 'e'])
    expect(structuralChanges.map(c => c.tag)).toEqual(['b', 'd'])
  })

  it('countReplayDeltaChangeKinds matches partition counts without allocating arrays', () => {
    const changes = [
      { operationType: 'set_cell' },
      { operationType: 'add_rows' },
      { operationType: 'set_range' },
      { operationType: 'set_style' },
      { operationType: 'cells_changed' }
    ]
    const counts = countReplayDeltaChangeKinds(changes)
    expect(counts).toEqual({ changeCount: 5, cellChangeCount: 3, structuralChangeCount: 2 })
  })

  it('countReplayDeltaChangeKinds returns zeros for nullish input', () => {
    expect(countReplayDeltaChangeKinds(undefined)).toEqual({
      changeCount: 0,
      cellChangeCount: 0,
      structuralChangeCount: 0
    })
    expect(countReplayDeltaChangeKinds(null)).toEqual({
      changeCount: 0,
      cellChangeCount: 0,
      structuralChangeCount: 0
    })
  })
})
