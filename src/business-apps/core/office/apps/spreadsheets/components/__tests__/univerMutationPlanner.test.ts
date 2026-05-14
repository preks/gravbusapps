import { buildAuthoritativeMutationEnvelope } from '../univerMutationPlanner'

describe('univerMutationPlanner', () => {
  const columns = [
    {
      id: 'col-name',
      name: 'name',
      label: 'Name',
      type: 'text',
      isVisible: true,
      isEditable: true,
      isRequired: false,
      isUnique: false,
      width: 120,
      order: 0
    }
  ] as any

  const ctx = {
    rowIndexToId: new Map([[0, 'row-1']]),
    columnIndexToName: new Map([[0, 'name']]),
    columnIndexToId: new Map([[0, 'col-name']])
  } as any

  it('keeps carried style ids out of plain value clears', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-1',
      intent: 'edit',
      currentData: [{ _id: 'row-1', name: 'Alice' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: {
        0: { 0: { v: null, s: 'style-1' } }
      },
      worksheetCellValue: {
        0: { 0: { v: null, s: 'style-1' } }
      },
      mergedCellValue: {
        0: { 0: { v: null, s: 'style-1' } }
      },
      workbookSnapshot: {
        styles: {
          'style-1': { bg: { rgb: '#ff0000' } }
        }
      },
      allowValueCarryingStylePayloads: true,
      replaceRangeStyleIntent: false
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowId: 'row-1',
          columnName: 'name',
          valueAction: 'clear'
        })
      ])
    )
    expect(envelope.plan?.cells?.[0]).not.toHaveProperty('stylePatch')
  })

  it('builds value clear plus style patch for replace-range mutations', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-2',
      intent: 'pasteReplace',
      currentData: [{ _id: 'row-1', name: 'Alice' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: {
        0: { 0: { v: null, s: 'style-1' } }
      },
      worksheetCellValue: {
        0: { 0: { v: null, s: 'style-1' } }
      },
      mergedCellValue: {
        0: { 0: { v: null, s: 'style-1' } }
      },
      workbookSnapshot: {
        styles: {
          'style-1': { bg: { rgb: '#ff0000' } }
        }
      },
      allowValueCarryingStylePayloads: true,
      replaceRangeStyleIntent: true
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowId: 'row-1',
          columnName: 'name',
          valueAction: 'clear',
          stylePatch: expect.objectContaining({
            set: expect.objectContaining({ s: 'style-1' }),
            unset: expect.arrayContaining(['bg'])
          })
        })
      ])
    )
    expect(envelope.plan?.styles).toEqual({
      'style-1': { bg: { rgb: '#ff0000' } }
    })
  })

  it('builds value set plus inline style patch for Excel-like replace-range paste cells', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-inline-paste',
      intent: 'pasteReplace',
      currentData: [{ _id: 'row-1', name: 'Alice' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: {
        0: {
          0: {
            v: 'Excel pasted',
            bg: { rgb: '#00ff00' },
            cl: { rgb: '#ff0000' }
          }
        }
      },
      worksheetCellValue: {
        0: {
          0: {
            v: 'Excel pasted',
            bg: { rgb: '#00ff00' },
            cl: { rgb: '#ff0000' }
          }
        }
      },
      mergedCellValue: {
        0: {
          0: {
            v: 'Excel pasted',
            bg: { rgb: '#00ff00' },
            cl: { rgb: '#ff0000' }
          }
        }
      },
      workbookSnapshot: null,
      replaceRangeStyleIntent: true
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowId: 'row-1',
          columnName: 'name',
          valueAction: 'set',
          value: 'Excel pasted',
          stylePatch: expect.objectContaining({
            set: expect.objectContaining({
              bg: { rgb: '#00ff00' },
              cl: { rgb: '#ff0000' }
            }),
            unset: expect.arrayContaining(['s', 'bl', 'it'])
          })
        })
      ])
    )
    expect(envelope.plan?.styles).toBeUndefined()
  })

  it('builds value clear plus live style patch when paste payload values are merged into Univer cell data', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-merged-clear-paste',
      intent: 'pasteReplace',
      currentData: [{ _id: 'row-1', name: 'Alice' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        0: { 0: { v: null, s: 'style-1' } }
      },
      workbookSnapshot: {
        styles: {
          'style-1': { bg: { rgb: '#00ff00' } }
        }
      },
      replaceRangeStyleIntent: true,
      mutationCommandId: 'sheet.command.paste'
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowId: 'row-1',
          columnName: 'name',
          valueAction: 'clear',
          stylePatch: expect.objectContaining({
            set: expect.objectContaining({ s: 'style-1' })
          })
        })
      ])
    )
  })

  it('does not create style patches for value-only mutations without replace-range intent', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-value-only',
      intent: 'edit',
      currentData: [{ _id: 'row-1', name: 'Alice' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        0: { 0: { v: 'Plain pasted' } }
      },
      workbookSnapshot: null,
      replaceRangeStyleIntent: false,
      mutationCommandId: 'sheet.mutation.set-range-values'
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowId: 'row-1',
          columnName: 'name',
          valueAction: 'set',
          value: 'Plain pasted'
        })
      ])
    )
    expect(envelope.plan?.cells?.some(cell => cell.stylePatch != null)).toBe(false)
  })

  it('prefers a stable column resolver over stale columnIndexToName mappings', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-stable-column',
      intent: 'edit',
      currentData: [{ _id: 'row-1', inserted_column: '' }],
      contextColumns: [
        {
          id: 'col-inserted',
          name: 'inserted_column',
          label: 'Inserted Column',
          type: 'text',
          isVisible: true,
          isEditable: true,
          isRequired: false,
          isUnique: false,
          width: 120,
          order: 0
        }
      ] as any,
      ctx: {
        rowIndexToId: new Map([[0, 'row-1']]),
        columnIndexToName: new Map([[0, 'stale_column']]),
        columnIndexToId: new Map([[0, 'col-stale']])
      } as any,
      resolveStableColumnName: columnIndex => (columnIndex === 0 ? 'inserted_column' : null),
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        0: { 0: { v: 'typed' } }
      },
      workbookSnapshot: null
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowId: 'row-1',
          columnName: 'inserted_column',
          valueAction: 'set',
          value: 'typed'
        })
      ])
    )
  })

  it('replaces existing values and old styling with pasted inline styling', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-replace-existing-style',
      intent: 'pasteReplace',
      currentData: [{ _id: 'row-1', name: 'Old value' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        0: {
          0: {
            v: 'New value',
            bg: { rgb: '#00ff00' },
            cl: { rgb: '#ff0000' }
          }
        }
      },
      workbookSnapshot: null,
      replaceRangeStyleIntent: true,
      mutationCommandId: 'sheet.command.paste'
    })

    expect(envelope.plan?.cells?.[0]).toEqual(
      expect.objectContaining({
        valueAction: 'set',
        value: 'New value',
        stylePatch: expect.objectContaining({
          set: expect.objectContaining({
            bg: { rgb: '#00ff00' },
            cl: { rgb: '#ff0000' }
          }),
          unset: expect.arrayContaining(['s', 'bl', 'it'])
        })
      })
    )
  })

  it('clears old formatting when plain pasted cells have no post-paste style keys', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-plain-over-styled',
      intent: 'pasteReplace',
      currentData: [{ _id: 'row-1', name: 'Styled old value' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        0: { 0: { v: 'Plain new value' } }
      },
      workbookSnapshot: null,
      replaceRangeStyleIntent: true,
      mutationCommandId: 'sheet.command.paste'
    })

    expect(envelope.plan?.cells?.[0]).toEqual(
      expect.objectContaining({
        valueAction: 'set',
        value: 'Plain new value',
        stylePatch: expect.objectContaining({
          unset: expect.arrayContaining(['s', 'bg', 'cl'])
        })
      })
    )
  })

  it('handles mixed formatted, plain, and clear pasted cells over existing data', () => {
    const twoColumnCtx = {
      rowIndexToId: new Map([
        [0, 'row-1'],
        [1, 'row-2']
      ]),
      columnIndexToName: new Map([
        [0, 'name'],
        [1, 'note']
      ]),
      columnIndexToId: new Map([
        [0, 'col-name'],
        [1, 'col-note']
      ])
    } as any
    const twoColumns = [
      ...columns,
      {
        id: 'col-note',
        name: 'note',
        label: 'Note',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 1
      }
    ] as any

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-mixed-paste',
      intent: 'pasteReplace',
      currentData: [
        { _id: 'row-1', name: 'Old A', note: 'Old B' },
        { _id: 'row-2', name: 'Old C', note: 'Old D' }
      ],
      contextColumns: twoColumns,
      ctx: twoColumnCtx,
      ranges: [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 1 }],
      mergedCellValue: {
        0: {
          0: { v: 'Styled', bg: { rgb: '#00ff00' } },
          1: { v: 'Plain' }
        },
        1: {
          0: { v: null, s: 'style-1' },
          1: { v: 'Also plain' }
        }
      },
      workbookSnapshot: {
        styles: {
          'style-1': { cl: { rgb: '#ff0000' } }
        }
      },
      replaceRangeStyleIntent: true,
      mutationCommandId: 'sheet.command.paste'
    })

    expect(envelope.plan?.cells).toHaveLength(4)
    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rowId: 'row-1', columnName: 'name', value: 'Styled' }),
        expect.objectContaining({ rowId: 'row-1', columnName: 'note', value: 'Plain' }),
        expect.objectContaining({
          rowId: 'row-2',
          columnName: 'name',
          valueAction: 'clear',
          stylePatch: expect.objectContaining({ set: expect.objectContaining({ s: 'style-1' }) })
        }),
        expect.objectContaining({ rowId: 'row-2', columnName: 'note', value: 'Also plain' })
      ])
    )
    expect(envelope.plan?.cells?.every(cell => cell.stylePatch != null)).toBe(true)
  })

  it('does not plan clears for ambiguous multi-cell v:null payloads without a command id', () => {
    const twoRowCtx = {
      rowIndexToId: new Map([
        [0, 'row-1'],
        [1, 'row-2']
      ]),
      columnIndexToName: new Map([[0, 'name']]),
      columnIndexToId: new Map([[0, 'col-name']])
    } as any

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-amb',
      intent: 'edit',
      currentData: [
        { _id: 'row-1', name: 'Alice' },
        { _id: 'row-2', name: 'Bob' }
      ],
      contextColumns: columns,
      ctx: twoRowCtx,
      ranges: [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        0: { 0: { v: null, s: 'style-1' } },
        1: { 0: { v: null, s: 'style-1' } }
      },
      workbookSnapshot: null,
      mutationCommandId: ''
    })

    expect(envelope.plan).toBeNull()
  })

  it('plans clears for delete-selection style payloads when command id is present', () => {
    const twoRowCtx = {
      rowIndexToId: new Map([
        [0, 'row-1'],
        [1, 'row-2']
      ]),
      columnIndexToName: new Map([[0, 'name']]),
      columnIndexToId: new Map([[0, 'col-name']])
    } as any

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-del',
      intent: 'edit',
      currentData: [
        { _id: 'row-1', name: 'Alice' },
        { _id: 'row-2', name: 'Bob' }
      ],
      contextColumns: columns,
      ctx: twoRowCtx,
      ranges: [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        0: { 0: { v: null, s: 'style-1' } },
        1: { 0: { v: null, s: 'style-1' } }
      },
      workbookSnapshot: null,
      mutationCommandId: 'deleteSelectionCommand'
    })

    expect(envelope.plan?.cells?.length).toBe(2)
    expect(envelope.plan?.cells?.every(cell => cell.valueAction === 'clear')).toBe(true)
  })

  it('does not plan value writes for cells covered by an existing merge', () => {
    const twoColumnCtx = {
      rowIndexToId: new Map([[0, 'row-1']]),
      columnIndexToName: new Map([
        [0, 'name'],
        [1, 'note']
      ]),
      columnIndexToId: new Map([
        [0, 'col-name'],
        [1, 'col-note']
      ])
    } as any
    const twoColumns = [
      ...columns,
      {
        id: 'col-note',
        name: 'note',
        label: 'Note',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 1
      }
    ] as any

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-merge',
      intent: 'edit',
      currentData: [{ _id: 'row-1', name: 'Anchor', note: 'Covered' }],
      contextColumns: twoColumns,
      ctx: twoColumnCtx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }],
      mergedCellValue: {
        0: {
          0: { v: 'Anchor updated' },
          1: { v: 'Covered updated' }
        }
      },
      workbookSnapshot: {
        sheets: {
          'sheet-1': {
            id: 'sheet-1',
            mergeData: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }]
          }
        }
      }
    })

    expect(envelope.plan?.cells).toEqual([
      expect.objectContaining({
        rowId: 'row-1',
        columnName: 'name',
        valueAction: 'set',
        value: 'Anchor updated'
      })
    ])
  })

  it('uses viewer visual row index (not data array index) when comparing to currentData', () => {
    const columns = [
      {
        id: 'col-name',
        name: 'name',
        label: 'Name',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 0
      }
    ] as any

    const ctx = {
      rowIndexToId: new Map([[2, 'row-at-vis-2']]),
      columnIndexToName: new Map([[0, 'name']]),
      columnIndexToId: new Map([[0, 'col-name']])
    } as any

    const currentData = [
      { _id: 'row-vis-0', name: 'r0' },
      { _id: 'row-vis-1', name: 'r1' },
      { _id: 'row-vis-10', _gridRowIndex: 10, name: 'collision' },
      { _id: 'row-at-vis-2', _gridRowIndex: 2, name: 'still-old' }
    ]

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-grid-index',
      intent: 'edit',
      currentData,
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 2, endRow: 2, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        2: { 0: { v: 'collision' } }
      },
      workbookSnapshot: null
    })

    expect(envelope.plan?.cells?.[0]).toEqual(
      expect.objectContaining({
        rowId: 'row-at-vis-2',
        columnName: 'name',
        valueAction: 'set',
        value: 'collision'
      })
    )
  })

  it('prefers stable row target resolution over stale rowIndexToId mappings', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-stable-target',
      intent: 'edit',
      currentData: [
        { _id: 'backend-row-1', _rowUuid: 'backend-row-1', name: 'row 1' },
        { _id: 'client-row-2', _clientRowId: 'client-row-2', name: '' }
      ],
      contextColumns: columns,
      ctx: {
        rowIndexToId: new Map([
          [0, 'backend-row-1'],
          [1, 'backend-row-3']
        ]),
        columnIndexToName: new Map([[0, 'name']]),
        columnIndexToId: new Map([[0, 'col-name']])
      } as any,
      resolveStableRowTarget: rowIndex =>
        rowIndex === 1
          ? {
              rowId: 'client-row-2',
              rowRef: { kind: 'clientHandle', clientRowId: 'client-row-2' },
              clientRowId: 'client-row-2',
              rowIndex: 1
            }
          : null,
      ranges: [{ startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        1: { 0: { v: 'edited row 2' } }
      },
      workbookSnapshot: null,
      mutationCommandId: 'sheet.mutation.set-range-values'
    })

    expect(envelope.plan?.cells).toEqual([
      expect.objectContaining({
        rowId: 'client-row-2',
        rowRef: { kind: 'clientHandle', clientRowId: 'client-row-2' },
        rowIndex: 1,
        columnName: 'name',
        valueAction: 'set',
        value: 'edited row 2'
      })
    ])
  })
})
