import {
  buildAuthoritativeMutationEnvelope,
  buildStylePatchFromUniverCell,
  normalizeValueForPersistence,
  resolveSpreadsheetLocalMutationIntent,
  stripIncidentalValueWritesFromStyleMutation
} from '../univerMutationPlanner'

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

  it('preserves typed univer envelopes for planned persisted values', () => {
    const numericColumns = [
      {
        id: 'col-amount',
        name: 'amount',
        label: 'Amount',
        type: 'number',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        order: 0
      }
    ] as any
    const numericCtx = {
      rowIndexToId: new Map([[0, 'row-1']]),
      columnIndexToName: new Map([[0, 'amount']]),
      columnIndexToId: new Map([[0, 'col-amount']])
    } as any
    const typedCell = { v: '42', t: 2 }

    expect(normalizeValueForPersistence(typedCell)).toEqual(typedCell)

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-typed-number',
      intent: 'edit',
      currentData: [{ _id: 'row-1', amount: null }],
      contextColumns: numericColumns,
      ctx: numericCtx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: { 0: { 0: typedCell } },
      worksheetCellValue: { 0: { 0: typedCell } },
      mergedCellValue: { 0: { 0: typedCell } },
      workbookSnapshot: null,
      isRowPersistedAtGridIndex: () => true
    })

    expect(envelope.plan?.cells).toEqual([
      expect.objectContaining({
        rowId: 'row-1',
        columnName: 'amount',
        valueAction: 'set',
        value: typedCell
      })
    ])
  })

  it('REPRO autofill: plans value writes for every cell of a 12-cell fill over fresh blank rows', () => {
    const fillColumns = [
      { id: 'col-a', name: 'A', label: 'A', type: 'text', isVisible: true, order: 0 },
      { id: 'col-b', name: 'B', label: 'B', type: 'text', isVisible: true, order: 1 },
      { id: 'col-c', name: 'C', label: 'C', type: 'text', isVisible: true, order: 2 }
    ] as any
    const fillCtx = {
      rowIndexToId: new Map([
        [0, 'row-0'],
        [1, 'row-1'],
        [2, 'row-2'],
        [3, 'row-3']
      ]),
      columnIndexToName: new Map([
        [0, 'A'],
        [1, 'B'],
        [2, 'C']
      ]),
      columnIndexToId: new Map([
        [0, 'col-a'],
        [1, 'col-b'],
        [2, 'col-c']
      ])
    } as any
    const currentData = [
      { _id: 'row-0', A: '', B: '', C: '' },
      { _id: 'row-1', A: '', B: '', C: '' },
      { _id: 'row-2', A: '', B: '', C: '' },
      { _id: 'row-3', A: '', B: '', C: '' }
    ]
    const matrix: Record<number, Record<number, { v: number }>> = {}
    let counter = 1
    for (let r = 0; r < 4; r += 1) {
      matrix[r] = {}
      for (let c = 0; c < 3; c += 1) {
        matrix[r][c] = { v: counter }
        counter += 1
      }
    }

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-fill',
      intent: 'autofill',
      currentData,
      contextColumns: fillColumns,
      ctx: fillCtx,
      ranges: [{ startRow: 0, endRow: 3, startColumn: 0, endColumn: 2 }],
      explicitPayloadAbsoluteCellValue: matrix as any,
      worksheetCellValue: matrix as any,
      mergedCellValue: matrix as any,
      workbookSnapshot: null,
      isRowPersistedAtGridIndex: () => true
    })

    expect(envelope.diagnostics.targetCellCount).toBe(12)
    expect(envelope.diagnostics.plannedValueSetCount).toBe(12)

    // Regression guard: a multi-cell write whose selection is (incorrectly) passed as a
    // merged region must NOT collapse to a single master cell. Real merges still drop slaves;
    // the autofill/paste selection range must never be treated as a merge.
    const envelopeWithSelectionAsMerge = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-fill-merge-guard',
      intent: 'autofill',
      currentData,
      contextColumns: fillColumns,
      ctx: fillCtx,
      ranges: [{ startRow: 0, endRow: 3, startColumn: 0, endColumn: 2 }],
      explicitPayloadAbsoluteCellValue: matrix as any,
      worksheetCellValue: matrix as any,
      mergedCellValue: matrix as any,
      workbookSnapshot: null,
      isRowPersistedAtGridIndex: () => true,
      liveMergeRanges: undefined
    })
    expect(envelopeWithSelectionAsMerge.diagnostics.plannedValueSetCount).toBe(12)
  })

  it('keeps autofill COPY style emission consistent for single-cell and multi-cell fills', () => {
    const twoRowCtx = {
      rowIndexToId: new Map([
        [0, 'row-1'],
        [1, 'row-2']
      ]),
      columnIndexToName: new Map([[0, 'name']]),
      columnIndexToId: new Map([[0, 'col-name']])
    } as any
    const currentData = [
      { _id: 'row-1', name: 'seed-1' },
      { _id: 'row-2', name: 'seed-2' }
    ]
    const workbookSnapshot = {
      styles: {
        'style-1': { bg: { rgb: '#00ff00' } }
      }
    }
    const singleCell = {
      0: {
        0: { v: 'filled-1', s: 'style-1' }
      }
    }
    const multiCell = {
      0: {
        0: { v: 'filled-1', s: 'style-1' }
      },
      1: {
        0: { v: 'filled-2', s: 'style-1' }
      }
    }

    const singleEnvelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-autofill-single',
      intent: 'autofill',
      currentData,
      contextColumns: columns,
      ctx: twoRowCtx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: singleCell as any,
      worksheetCellValue: singleCell as any,
      mergedCellValue: singleCell as any,
      workbookSnapshot,
      autofillApplyType: 'COPY'
    })
    const multiEnvelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-autofill-multi',
      intent: 'autofill',
      currentData,
      contextColumns: columns,
      ctx: twoRowCtx,
      ranges: [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: multiCell as any,
      worksheetCellValue: multiCell as any,
      mergedCellValue: multiCell as any,
      workbookSnapshot,
      autofillApplyType: 'COPY'
    })

    expect(singleEnvelope.plan?.cells).toEqual([
      expect.objectContaining({
        rowId: 'row-1',
        columnName: 'name',
        valueAction: 'set',
        stylePatch: expect.objectContaining({
          set: expect.objectContaining({ s: 'style-1' })
        })
      })
    ])
    expect(multiEnvelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowId: 'row-1',
          valueAction: 'set',
          stylePatch: expect.objectContaining({ set: expect.objectContaining({ s: 'style-1' }) })
        }),
        expect.objectContaining({
          rowId: 'row-2',
          valueAction: 'set',
          stylePatch: expect.objectContaining({ set: expect.objectContaining({ s: 'style-1' }) })
        })
      ])
    )
  })

  it('does not emit style for NO_FORMAT autofill even when Univer carries style with the value', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-autofill-no-format',
      intent: 'autofill',
      currentData: [{ _id: 'row-1', name: 'seed-1' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: {
        0: { 0: { v: 'filled-1', s: 'style-1' } }
      },
      worksheetCellValue: {
        0: { 0: { v: 'filled-1', s: 'style-1' } }
      },
      mergedCellValue: {
        0: { 0: { v: 'filled-1', s: 'style-1' } }
      },
      workbookSnapshot: {
        styles: {
          'style-1': { bg: { rgb: '#00ff00' } }
        }
      },
      autofillApplyType: 'NO_FORMAT'
    })

    expect(envelope.plan?.cells).toEqual([
      expect.objectContaining({
        rowId: 'row-1',
        valueAction: 'set',
        value: 'filled-1'
      })
    ])
    expect(envelope.plan?.cells?.[0]).not.toHaveProperty('stylePatch')
  })

  it('keeps style and strips incidental values for ONLY_FORMAT autofill', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-autofill-only-format',
      intent: 'formatOnly',
      currentData: [{ _id: 'row-1', name: 'Alice' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: {
        0: { 0: { v: 'Alice', s: 'style-1' } }
      },
      worksheetCellValue: {
        0: { 0: { v: 'Alice', s: 'style-1' } }
      },
      mergedCellValue: {
        0: { 0: { v: 'Alice', s: 'style-1' } }
      },
      workbookSnapshot: {
        styles: {
          'style-1': { bg: { rgb: '#00ff00' } }
        }
      },
      autofillApplyType: 'ONLY_FORMAT'
    })

    const plannedCells = stripIncidentalValueWritesFromStyleMutation({
      cells: envelope.plan?.cells ?? [],
      intent: 'formatOnly',
      replaceRangeStyleIntent: false,
      source: 'sheet-value-changed',
      mutatedCellCount: 1,
      autofillApplyType: 'ONLY_FORMAT'
    })

    expect(plannedCells).toEqual([
      expect.objectContaining({
        rowId: 'row-1',
        valueAction: 'none',
        stylePatch: expect.objectContaining({
          set: expect.objectContaining({ s: 'style-1' })
        })
      })
    ])
  })

  it('does not emit style noise for plain single-cell typing with carried style ids', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-plain-edit',
      intent: 'edit',
      currentData: [{ _id: 'row-1', name: '' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: {
        0: { 0: { v: 'typed', s: 'style-1' } }
      },
      worksheetCellValue: {
        0: { 0: { v: 'typed', s: 'style-1' } }
      },
      mergedCellValue: {
        0: { 0: { v: 'typed', s: 'style-1' } }
      },
      workbookSnapshot: {
        styles: {
          'style-1': { bg: { rgb: '#00ff00' } }
        }
      }
    })

    expect(envelope.plan?.cells).toEqual([
      expect.objectContaining({
        rowId: 'row-1',
        valueAction: 'set',
        value: 'typed'
      })
    ])
    expect(envelope.plan?.cells?.[0]).not.toHaveProperty('stylePatch')
  })

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

  it('does not create style patches for multi-cell autofill payloads that carry echoed style ids', () => {
    const fillColumns = [
      { id: 'col-name', name: 'name', label: 'Name', type: 'text', isVisible: true, order: 0 }
    ] as any
    const fillCtx = {
      rowIndexToId: new Map([
        [0, 'row-1'],
        [1, 'row-2'],
        [2, 'row-3']
      ]),
      columnIndexToName: new Map([[0, 'name']]),
      columnIndexToId: new Map([[0, 'col-name']])
    } as any

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-multicell-fill-style-noise',
      intent: 'autofill',
      currentData: [
        { _id: 'row-1', name: '1' },
        { _id: 'row-2', name: '2' },
        { _id: 'row-3', name: '3' }
      ],
      contextColumns: fillColumns,
      ctx: fillCtx,
      ranges: [{ startRow: 0, endRow: 2, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        0: { 0: { v: '10', s: 'style-1' } },
        1: { 0: { v: '11', s: 'style-1' } },
        2: { 0: { v: '12', s: 'style-1' } }
      },
      workbookSnapshot: {
        styles: {
          'style-1': { bg: { rgb: '#ff0000' } }
        }
      },
      allowValueCarryingStylePayloads: false,
      mutationCommandId: 'sheet.mutation.set-range-values'
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rowId: 'row-1', valueAction: 'set', value: '10' }),
        expect.objectContaining({ rowId: 'row-2', valueAction: 'set', value: '11' }),
        expect.objectContaining({ rowId: 'row-3', valueAction: 'set', value: '12' })
      ])
    )
    expect(envelope.plan?.cells?.every(cell => cell.stylePatch == null)).toBe(true)
  })

  it('emits style patches for pure multi-cell style-only mutations', () => {
    const fillColumns = [
      { id: 'col-name', name: 'name', label: 'Name', type: 'text', isVisible: true, order: 0 }
    ] as any
    const fillCtx = {
      rowIndexToId: new Map([
        [0, 'row-1'],
        [1, 'row-2'],
        [2, 'row-3']
      ]),
      columnIndexToName: new Map([[0, 'name']]),
      columnIndexToId: new Map([[0, 'col-name']])
    } as any

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-multicell-style-only',
      intent: 'formatOnly',
      currentData: [
        { _id: 'row-1', name: '1' },
        { _id: 'row-2', name: '2' },
        { _id: 'row-3', name: '3' }
      ],
      contextColumns: fillColumns,
      ctx: fillCtx,
      ranges: [{ startRow: 0, endRow: 2, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        0: { 0: { bl: 1 } },
        1: { 0: { bl: 1 } },
        2: { 0: { bl: 1 } }
      },
      workbookSnapshot: null,
      mutationCommandId: 'sheet.command.set-range-bold'
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rowId: 'row-1', valueAction: 'none', stylePatch: { set: { bl: 1 } } }),
        expect.objectContaining({ rowId: 'row-2', valueAction: 'none', stylePatch: { set: { bl: 1 } } }),
        expect.objectContaining({ rowId: 'row-3', valueAction: 'none', stylePatch: { set: { bl: 1 } } })
      ])
    )
  })

  it('does not emit style patches for single-cell value edits that carry an echoed style id', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-single-edit-style-noise',
      intent: 'edit',
      currentData: [{ _id: 'row-1', name: 'Alice' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        0: { 0: { v: 'Alice updated', s: 'style-1' } }
      },
      workbookSnapshot: {
        styles: {
          'style-1': { bg: { rgb: '#ff0000' } }
        }
      },
      allowValueCarryingStylePayloads: false,
      mutationCommandId: 'sheet.mutation.set-range-values'
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowId: 'row-1',
          columnName: 'name',
          valueAction: 'set',
          value: 'Alice updated'
        })
      ])
    )
    expect(envelope.plan?.cells?.[0]).not.toHaveProperty('stylePatch')
  })

  it('drops style-only unset noise from plain text entry set-range mutations', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-plain-entry-style-noise',
      intent: 'formatOnly',
      currentData: [{ _id: 'row-1', name: 'Plain text' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        0: {
          0: {
            s: null,
            bl: null,
            it: null,
            ul: null,
            st: null,
            ol: null,
            ff: null,
            fs: null,
            cl: null,
            bg: null,
            ht: null,
            vt: null,
            tb: null,
            tr: null,
            pd: null,
            bd: null,
            n: null
          }
        }
      },
      workbookSnapshot: null,
      replaceRangeStyleIntent: false,
      mutationCommandId: 'sheet.mutation.set-range-values'
    })

    expect(envelope.plan).toBeNull()
    expect(envelope.diagnostics.plannedStylePatchCount).toBe(0)
  })

  it('drops unset-only style noise from value entry into a new row', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-new-row-value-style-noise',
      intent: 'pasteReplace',
      currentData: [{ _id: 'row-1', name: '' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      mergedCellValue: {
        0: {
          0: {
            v: 'Plain text',
            s: null,
            bl: null,
            it: null,
            ul: null,
            st: null,
            ol: null,
            ff: null,
            fs: null,
            cl: null,
            bg: null,
            ht: null,
            vt: null,
            tb: null,
            tr: null,
            pd: null,
            bd: null,
            n: null
          }
        }
      },
      workbookSnapshot: null,
      replaceRangeStyleIntent: false,
      mutationCommandId: 'sheet.mutation.set-range-values'
    })

    expect(envelope.plan?.cells).toEqual([
      expect.objectContaining({
        rowId: 'row-1',
        columnName: 'name',
        valueAction: 'set',
        value: 'Plain text'
      })
    ])
    expect(envelope.plan?.cells?.some(cell => cell.stylePatch != null)).toBe(false)
  })

  it('keeps a single real value write when a noisy multi-cell mutation also carries style data', () => {
    const cells = stripIncidentalValueWritesFromStyleMutation({
      intent: 'edit',
      replaceRangeStyleIntent: false,
      source: 'sheet-value-changed',
      mutatedCellCount: 16,
      cells: [
        {
          rowId: 'row-1',
          columnName: 'name',
          rowIndex: 0,
          colIndex: 0,
          valueAction: 'set',
          value: 'typed',
          stylePatch: {
            set: { s: 'style-1' }
          }
        }
      ]
    })

    expect(cells).toEqual([
      expect.objectContaining({
        rowId: 'row-1',
        columnName: 'name',
        valueAction: 'set',
        value: 'typed',
        stylePatch: expect.objectContaining({
          set: expect.objectContaining({ s: 'style-1' })
        })
      })
    ])
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

  // 3d: StylePatchMode covers full-restyle (replaceInlineWithStyleRef) and partial-patch
  // (preserveUnspecifiedInline) behaviors. Auto-unset of unspecified inline keys must only
  // happen in full-restyle mode.
  describe('buildStylePatchFromUniverCell StylePatchMode', () => {
    it('replaceInlineWithStyleRef: auto-unsets unspecified inline keys when style id is set', () => {
      const patch = buildStylePatchFromUniverCell({ s: 'style-1' }, 'normal', 'replaceInlineWithStyleRef')
      expect(patch?.set).toEqual({ s: 'style-1' })
      // every UNIVER_INLINE_STYLE_KEY not in set gets added to unset
      expect(patch?.unset).toEqual(expect.arrayContaining(['bg', 'cl', 'bd', 'ff', 'fs']))
    })

    it('preserveUnspecifiedInline: leaves unspecified inline keys untouched when style id is set', () => {
      const patch = buildStylePatchFromUniverCell({ s: 'style-1' }, 'normal', 'preserveUnspecifiedInline')
      expect(patch?.set).toEqual({ s: 'style-1' })
      expect(patch?.unset).toBeUndefined()
    })

    it('replaceRange intent unsets all formatting keys regardless of mode', () => {
      const patch = buildStylePatchFromUniverCell({ v: 'plain' }, 'replaceRange', 'preserveUnspecifiedInline')
      expect(patch?.unset).toEqual(expect.arrayContaining(['s', 'bg', 'cl']))
    })

    it('returns undefined when there is no style payload at all', () => {
      const patch = buildStylePatchFromUniverCell({}, 'normal', 'preserveUnspecifiedInline')
      expect(patch).toBeUndefined()
    })

    it('flattens inline style object on s into set.bg (fill-color / set-range-values)', () => {
      const patch = buildStylePatchFromUniverCell(
        { s: { bg: { rgb: '#84e1bc' } } },
        'normal',
        'preserveUnspecifiedInline'
      )
      expect(patch?.set).toEqual({ bg: { rgb: '#84e1bc' } })
      expect(patch?.set).not.toHaveProperty('s')
    })
  })

  describe('resolveSpreadsheetLocalMutationIntent', () => {
    it('uses formatOnly for style-only sheet.mutation.set-range-values matrices', () => {
      expect(
        resolveSpreadsheetLocalMutationIntent({
          hasPersistableMutation: false,
          allowValueCarryingStylePayloads: false,
          commandId: 'sheet.mutation.set-range-values',
          mergedCellValue: {
            284: { 3: { s: { bg: { rgb: '#84e1bc' } } } }
          },
          replaceRangeStyleIntent: false,
          pasteIntoNewRows: false
        })
      ).toBe('formatOnly')
    })

    it('stays edit when the matrix carries persistable value keys', () => {
      expect(
        resolveSpreadsheetLocalMutationIntent({
          hasPersistableMutation: true,
          allowValueCarryingStylePayloads: false,
          commandId: 'sheet.mutation.set-range-values',
          mergedCellValue: {
            0: { 0: { v: 'hello', s: 'style-1' } }
          },
          replaceRangeStyleIntent: false,
          pasteIntoNewRows: false
        })
      ).toBe('edit')
    })

    it('uses pasteReplace only when a new-row value write is explicitly classified as paste', () => {
      expect(
        resolveSpreadsheetLocalMutationIntent({
          hasPersistableMutation: true,
          allowValueCarryingStylePayloads: false,
          commandId: 'sheet.mutation.set-range-values',
          mergedCellValue: {
            0: { 0: { v: 'hello', s: 'style-1' } }
          },
          replaceRangeStyleIntent: false,
          pasteIntoNewRows: true
        })
      ).toBe('pasteReplace')
    })
  })

  // 1d: liveMergeRanges from the worksheet facade must take precedence over a stale
  // workbookSnapshot.mergeData so writes into freshly-merged slave cells are skipped even
  // before the snapshot catches up.
  it('protects merge-slave coordinates from value writes using liveMergeRanges over stale snapshot', () => {
    const twoColumns = [
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
      },
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

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-live-merge',
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
      // Snapshot has NO merge; live merge ranges have the freshly-landed merge instead.
      workbookSnapshot: { sheets: { 'sheet-1': { id: 'sheet-1', mergeData: [] } } },
      liveMergeRanges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }]
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

  // 1d: when liveMergeRanges is empty/undefined, the planner still uses snapshot.mergeData.
  it('falls back to workbookSnapshot.mergeData when liveMergeRanges is not provided', () => {
    const twoColumns = [
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
      },
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

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-snapshot-merge',
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
          'sheet-1': { id: 'sheet-1', mergeData: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }] }
        }
      }
    })

    expect(envelope.plan?.cells).toEqual([
      expect.objectContaining({ rowId: 'row-1', columnName: 'name', valueAction: 'set' })
    ])
  })

  // 1c: ambiguous sparse-null clear is intentionally skipped in the primary loop, and the
  // fallback's broader matrix scan must NOT resurrect that key with a value mutation.
  it('does not resurrect a key the primary loop intentionally skipped via the ambiguous sparse-null gate', () => {
    const twoColumnColumns = [
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
      },
      {
        id: 'col-amount',
        name: 'amount',
        label: 'Amount',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 120,
        order: 1
      }
    ] as any

    const twoColumnCtx = {
      rowIndexToId: new Map([[0, 'row-1']]),
      columnIndexToName: new Map([
        [0, 'name'],
        [1, 'amount']
      ]),
      columnIndexToId: new Map([
        [0, 'col-name'],
        [1, 'col-amount']
      ])
    } as any

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-no-resurrect',
      intent: 'edit',
      currentData: [{ _id: 'row-1', name: 'Alice', amount: '42' }],
      contextColumns: twoColumnColumns,
      ctx: twoColumnCtx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }],
      // Two cells; one carries an ambiguous sparse-null over a non-blank current value, the
      // other carries a real edit. Empty commandId activates the ambiguousSparseNullNoiseGate.
      mergedCellValue: {
        0: { 0: { v: 'Alice updated' }, 1: { v: null } }
      },
      worksheetCellValue: {
        0: { 0: { v: 'Alice updated' }, 1: { v: null } }
      },
      explicitPayloadAbsoluteCellValue: {
        0: { 0: { v: 'Alice updated' }, 1: { v: null } }
      },
      workbookSnapshot: null,
      mutationCommandId: ''
    })

    const cells = envelope.plan?.cells ?? []
    const amountCell = cells.find(cell => cell.columnName === 'amount')
    // The intentionally-skipped key must not be resurrected with a value mutation by fallback.
    expect(amountCell).toBeUndefined()
    // The unambiguous edit on the other cell still flows through.
    expect(cells.find(cell => cell.columnName === 'name')).toEqual(
      expect.objectContaining({ valueAction: 'set', value: 'Alice updated' })
    )
  })

  it('does not clear existing values when autofill carries sparse v:null over a multi-row selection', () => {
    const fillColumns = [{ id: 'col-j', name: 'column_j', label: 'J', type: 'text', isVisible: true, order: 9 }] as any
    const fillCtx = {
      rowIndexToId: new Map(Array.from({ length: 14 }, (_, index) => [index + 6, `row-${index + 6}`])),
      columnIndexToName: new Map([[9, 'column_j']]),
      columnIndexToId: new Map([[9, 'col-j']])
    } as any
    const currentData = Array.from({ length: 14 }, (_, index) => ({
      _id: `row-${index + 6}`,
      column_j: index + 6
    }))
    const sparseNullMatrix: Record<number, Record<number, { v: null }>> = {}
    for (let row = 6; row <= 18; row += 1) {
      sparseNullMatrix[row] = { 9: { v: null } }
    }

    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-autofill-sparse-null',
      intent: 'autofill',
      currentData,
      contextColumns: fillColumns,
      ctx: fillCtx,
      ranges: [{ startRow: 6, endRow: 19, startColumn: 9, endColumn: 9 }],
      explicitPayloadAbsoluteCellValue: {
        ...sparseNullMatrix,
        19: { 9: { v: 18, t: 2 } }
      },
      worksheetCellValue: {
        ...sparseNullMatrix,
        19: { 9: { v: 18, t: 2 } }
      },
      mergedCellValue: {
        ...sparseNullMatrix,
        19: { 9: { v: 18, t: 2 } }
      },
      workbookSnapshot: null,
      mutationCommandId: 'sheet.mutation.set-range-values',
      autofillApplyType: 'SERIES',
      isRowPersistedAtGridIndex: () => true
    })

    const clears = envelope.plan?.cells.filter(cell => cell.valueAction === 'clear') ?? []
    expect(clears).toEqual([])
    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowIndex: 19,
          colIndex: 9,
          valueAction: 'set',
          value: { v: 18, t: 2 }
        })
      ])
    )
    expect(envelope.plan?.cells?.filter(cell => cell.rowIndex >= 6 && cell.rowIndex <= 18)).toEqual([])
  })

  it('strips incidental value writes from multi-cell style mutations', () => {
    const cells = [
      {
        rowId: 'row-1',
        columnName: 'name',
        rowIndex: 0,
        colIndex: 0,
        valueAction: 'set' as const,
        value: 704025,
        stylePatch: { set: { bl: 1 } }
      },
      {
        rowId: 'row-2',
        columnName: 'name',
        rowIndex: 1,
        colIndex: 0,
        valueAction: 'none' as const,
        stylePatch: { set: { bl: 1 } }
      }
    ]

    expect(
      stripIncidentalValueWritesFromStyleMutation({
        cells,
        intent: 'edit',
        replaceRangeStyleIntent: false,
        source: 'sheet-value-changed',
        mutatedCellCount: 2
      })
    ).toEqual([
      expect.objectContaining({ rowId: 'row-1', valueAction: 'none', stylePatch: { set: { bl: 1 } } }),
      expect.objectContaining({ rowId: 'row-2', valueAction: 'none' })
    ])
  })

  describe('no-clear-without-local-edit guard', () => {
    // Repro of the spurious-clear bug: user A wrote "A18" -> user B's session has it via collab
    // apply, but user B's Univer grid is blank/stale. A deferred-reconcile read at that cell must
    // NOT emit a `valueAction: 'clear'`, because user B never touched the cell.
    it('skips clear when session has value, grid is blank, authoritative is non-blank, and user did not touch', () => {
      const envelope = buildAuthoritativeMutationEnvelope({
        sheetId: 'sheet-1',
        traceId: 'trace-no-clear-guard',
        intent: 'edit',
        currentData: [{ _id: 'row-1', name: 'A18' }],
        contextColumns: columns,
        ctx,
        ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
        explicitPayloadAbsoluteCellValue: {
          0: { 0: { v: null } }
        },
        worksheetCellValue: {
          0: { 0: { v: null } }
        },
        mergedCellValue: {
          0: { 0: { v: null } }
        },
        workbookSnapshot: null,
        wasRecentlyLocallyMutated: () => false,
        getAuthoritativeSignatureForCell: () => 's:A18'
      })

      const clears = envelope.plan?.cells.filter(cell => cell.valueAction === 'clear') ?? []
      expect(clears).toEqual([])
    })

    // Real user clears must still work: when the local user did touch the cell, the planner
    // emits a clear even if the authoritative signature was non-blank moments ago.
    it('emits clear for user-initiated delete when cell is not locally owned', () => {
      const envelope = buildAuthoritativeMutationEnvelope({
        sheetId: 'sheet-1',
        traceId: 'trace-user-initiated-clear',
        intent: 'edit',
        currentData: [{ _id: 'row-1', name: 'A18' }],
        contextColumns: columns,
        ctx,
        ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
        explicitPayloadAbsoluteCellValue: {
          0: { 0: { v: null } }
        },
        worksheetCellValue: {
          0: { 0: { v: null } }
        },
        mergedCellValue: {
          0: { 0: { v: null } }
        },
        workbookSnapshot: null,
        wasRecentlyLocallyMutated: () => false,
        getAuthoritativeSignatureForCell: () => 's:A18',
        userInitiatedValueClear: true
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
    })

    it('still emits clear when the local user recently mutated the cell', () => {
      const envelope = buildAuthoritativeMutationEnvelope({
        sheetId: 'sheet-1',
        traceId: 'trace-real-clear',
        intent: 'edit',
        currentData: [{ _id: 'row-1', name: 'A18' }],
        contextColumns: columns,
        ctx,
        ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
        explicitPayloadAbsoluteCellValue: {
          0: { 0: { v: null } }
        },
        worksheetCellValue: {
          0: { 0: { v: null } }
        },
        mergedCellValue: {
          0: { 0: { v: null } }
        },
        workbookSnapshot: null,
        wasRecentlyLocallyMutated: () => true,
        getAuthoritativeSignatureForCell: () => 's:A18'
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
    })

    it('skips deferred replay clear when the only evidence is a recent local touch', () => {
      const envelope = buildAuthoritativeMutationEnvelope({
        sheetId: 'sheet-1',
        traceId: 'trace-deferred-stale-clear',
        intent: 'edit',
        currentData: [{ _id: 'row-1', name: 'F256 value' }],
        contextColumns: columns,
        ctx,
        ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
        explicitPayloadAbsoluteCellValue: {
          0: { 0: { v: null } }
        },
        worksheetCellValue: {
          0: { 0: { v: null } }
        },
        mergedCellValue: {
          0: { 0: { v: null } }
        },
        workbookSnapshot: null,
        wasRecentlyLocallyMutated: () => true,
        getAuthoritativeSignatureForCell: () => 's:F256 value',
        allowRecentlyLocalBlankClear: false
      })

      const clears = envelope.plan?.cells.filter(cell => cell.valueAction === 'clear') ?? []
      expect(clears).toEqual([])
    })

    // If the authoritative signature is also blank (i.e. the cell was genuinely empty), the
    // guard must NOT block — there is nothing to protect. A normal "no-op clear" path keeps
    // the cell as `valueAction: 'none'` because currentSignature === nextSignature, but we
    // assert no spurious clear is created either way.
    it('does not skip when authoritative is also blank (nothing to protect)', () => {
      const envelope = buildAuthoritativeMutationEnvelope({
        sheetId: 'sheet-1',
        traceId: 'trace-blank-auth',
        intent: 'edit',
        currentData: [{ _id: 'row-1', name: '' }],
        contextColumns: columns,
        ctx,
        ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
        explicitPayloadAbsoluteCellValue: {
          0: { 0: { v: null } }
        },
        worksheetCellValue: {
          0: { 0: { v: null } }
        },
        mergedCellValue: {
          0: { 0: { v: null } }
        },
        workbookSnapshot: null,
        wasRecentlyLocallyMutated: () => false,
        getAuthoritativeSignatureForCell: () => 'n:'
      })

      const clears = envelope.plan?.cells.filter(cell => cell.valueAction === 'clear') ?? []
      expect(clears).toEqual([])
    })
  })

  it('emits value writes for optimistic client rows even when session already matches', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-unmaterialized-row',
      intent: 'pasteReplace',
      currentData: [{ _id: 'client_row_158', _gridRowIndex: 158, name: '4' }],
      contextColumns: columns,
      ctx: {
        rowIndexToId: new Map([[158, 'client_row_158']]),
        columnIndexToName: new Map([[0, 'name']]),
        columnIndexToId: new Map([[0, 'col-name']])
      } as any,
      ranges: [{ startRow: 158, endRow: 158, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: {
        158: { 0: { v: '4' } }
      },
      worksheetCellValue: {
        158: { 0: { v: '4' } }
      },
      mergedCellValue: {
        158: { 0: { v: '4' } }
      },
      workbookSnapshot: null,
      isRowPersistedAtGridIndex: () => false
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowIndex: 158,
          colIndex: 0,
          valueAction: 'set',
          value: '4'
        })
      ])
    )
  })

  it('emits value writes for persisted rows when the backend-acknowledged cell is still blank', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-unacked-persisted-cell',
      intent: 'edit',
      currentData: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', name: '9' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: {
        0: { 0: { v: '9' } }
      },
      worksheetCellValue: {
        0: { 0: { v: '9' } }
      },
      mergedCellValue: {
        0: { 0: { v: '9' } }
      },
      workbookSnapshot: null,
      isRowPersistedAtGridIndex: () => true,
      getPersistedSignatureForCell: () => 'blank'
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 0,
          valueAction: 'set',
          value: '9'
        })
      ])
    )
  })

  it('emits value writes for recently locally mutated persisted rows even when the backend signature already matches', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-recent-local-persisted-cell',
      intent: 'edit',
      currentData: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', name: '9' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: {
        0: { 0: { v: '9' } }
      },
      worksheetCellValue: {
        0: { 0: { v: '9' } }
      },
      mergedCellValue: {
        0: { 0: { v: '9' } }
      },
      workbookSnapshot: null,
      isRowPersistedAtGridIndex: () => true,
      getPersistedSignatureForCell: () => 's:9',
      wasRecentlyLocallyMutated: () => true
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 0,
          valueAction: 'set',
          value: '9'
        })
      ])
    )
  })

  it('skips value writes for persisted rows when the backend-acknowledged cell already matches', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-acked-persisted-cell',
      intent: 'edit',
      currentData: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', name: '9' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: {
        0: { 0: { v: '9' } }
      },
      worksheetCellValue: {
        0: { 0: { v: '9' } }
      },
      mergedCellValue: {
        0: { 0: { v: '9' } }
      },
      workbookSnapshot: null,
      isRowPersistedAtGridIndex: () => true,
      getPersistedSignatureForCell: () => 's:9'
    })

    expect(envelope.plan?.cells ?? []).toEqual([])
  })

  it('still emits clear for recently locally mutated persisted rows', () => {
    const envelope = buildAuthoritativeMutationEnvelope({
      sheetId: 'sheet-1',
      traceId: 'trace-recent-local-persisted-clear',
      intent: 'edit',
      currentData: [{ _id: 'backend-row-1', _rowUuid: 'backend-row-1', name: '9' }],
      contextColumns: columns,
      ctx,
      ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }],
      explicitPayloadAbsoluteCellValue: {
        0: { 0: { v: null } }
      },
      worksheetCellValue: {
        0: { 0: { v: null } }
      },
      mergedCellValue: {
        0: { 0: { v: null } }
      },
      workbookSnapshot: null,
      isRowPersistedAtGridIndex: () => true,
      getPersistedSignatureForCell: () => 's:9',
      wasRecentlyLocallyMutated: () => true
    })

    expect(envelope.plan?.cells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 0,
          valueAction: 'clear'
        })
      ])
    )
  })

  it('keeps value writes when the mutation creates new logical rows', () => {
    const cells = [
      {
        rowId: 'client_row_9',
        columnName: 'name',
        rowIndex: 9,
        colIndex: 0,
        valueAction: 'set' as const,
        value: 1,
        stylePatch: { set: { bl: 1 } }
      },
      {
        rowId: 'client_row_9',
        columnName: 'amount',
        rowIndex: 9,
        colIndex: 1,
        valueAction: 'set' as const,
        value: 2,
        stylePatch: { set: { bl: 1 } }
      }
    ]

    expect(
      stripIncidentalValueWritesFromStyleMutation({
        cells,
        intent: 'edit',
        replaceRangeStyleIntent: false,
        source: 'sheet-value-changed',
        mutatedCellCount: 2,
        createsNewRows: true
      })
    ).toEqual(cells)
  })

  it('keeps value writes for paste-replace mutations that also carry style', () => {
    const cells = [
      {
        rowId: 'row-1',
        columnName: 'name',
        rowIndex: 0,
        colIndex: 0,
        valueAction: 'set' as const,
        value: 'pasted',
        stylePatch: { set: { s: 'style-1' } }
      }
    ]

    expect(
      stripIncidentalValueWritesFromStyleMutation({
        cells,
        intent: 'pasteReplace',
        replaceRangeStyleIntent: true,
        source: 'sheet-value-changed',
        mutatedCellCount: 1
      })
    ).toEqual(cells)
  })
})
