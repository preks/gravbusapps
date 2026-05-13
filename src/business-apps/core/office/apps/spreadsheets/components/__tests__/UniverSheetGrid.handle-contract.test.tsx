import './setupUniverSheetGridTestMocks'
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import type { UniverSheetGridHandle } from '../UniverSheetGrid.types'
import {
  createWorkbookSnapshots,
  resetUniverSheetGridTestMocks,
  TestUniverSheetGrid
} from './setupUniverSheetGridTestMocks'

describe('UniverSheetGrid handle contract', () => {
  const originalStructuredClone = globalThis.structuredClone
  const cloneForTest = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(entry => cloneForTest(entry))
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneForTest(entry)]))
    }
    return value
  }
  const sheet = {
    id: 'sheet-1',
    name: 'Sheet 1',
    settings: { mergeData: [] }
  } as any
  const columns = [
    {
      id: 'col-1',
      name: 'name',
      label: 'Name',
      type: 'text',
      isVisible: true,
      isEditable: true,
      isRequired: false,
      isUnique: false,
      width: 150,
      order: 0
    }
  ] as any
  const data = [{ _id: 'row-1', name: 'Alice' }]

  beforeEach(() => {
    resetUniverSheetGridTestMocks()
    globalThis.structuredClone =
      originalStructuredClone ?? (((value: unknown) => cloneForTest(value)) as typeof structuredClone)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    jest.restoreAllMocks()
    globalThis.structuredClone = originalStructuredClone
  })

  it('exposes getWorkbookSnapshot after bootstrap', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => {
      expect(typeof ref.current?.getWorkbookSnapshot).toBe('function')
    })
    expect(ref.current?.getWorkbookSnapshot()).not.toBeNull()
  })

  it('exposes requestSnapshotCheckpoint without throwing when wired', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    render(
      <TestUniverSheetGrid
        ref={ref}
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )
    await waitFor(() => expect(ref.current?.requestSnapshotCheckpoint).toBeDefined())
    expect(() => ref.current?.requestSnapshotCheckpoint?.(true)).not.toThrow()
  })

  it('returns null when workbook snapshot cloning fails', async () => {
    const ref = React.createRef<UniverSheetGridHandle>()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    globalThis.structuredClone = (() => {
      throw new Error('clone failed')
    }) as typeof structuredClone

    try {
      render(
        <TestUniverSheetGrid
          ref={ref}
          sheet={sheet}
          data={data}
          columns={columns}
          isReadOnly
          onCellChange={jest.fn()}
          onDataChange={jest.fn()}
        />
      )

      await waitFor(() => {
        expect(typeof ref.current?.getWorkbookSnapshot).toBe('function')
      })

      expect(ref.current?.getWorkbookSnapshot()).toBeNull()
    } finally {
      globalThis.structuredClone = originalStructuredClone
    }
  })

  it('falls back to a row-built snapshot when the provided snapshot is rejected before bootstrap', async () => {
    render(
      <TestUniverSheetGrid
        sheet={sheet}
        data={data}
        columns={columns}
        isReadOnly
        initialSnapshot={
          {
            id: 'broken-workbook',
            name: 'Broken workbook',
            sheetOrder: ['sheet-1'],
            sheets: [] as unknown
          } as Record<string, unknown>
        }
        onCellChange={jest.fn()}
        onDataChange={jest.fn()}
      />
    )

    await waitFor(() => {
      expect(createWorkbookSnapshots.length).toBeGreaterThan(0)
    })

    expect(createWorkbookSnapshots[0]).toMatchObject({
      id: 'workbook-sheet-1',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet 1'
        }
      }
    })
  })
})
