import React from 'react'
import { render } from '@testing-library/react'
import type { SpreadsheetSheet, SpreadsheetColumn } from '../../types'
import { TableView } from '../TableView'

let capturedGridProps: Record<string, unknown> | null = null

jest.mock('@newwork/nw-design-system', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

jest.mock('../../components/UniverSheetGrid', () => ({
  UniverSheetGrid: (props: Record<string, unknown>) => {
    capturedGridProps = props
    return <div data-testid="mock-univer-grid" />
  }
}))

const textCol = (id: string, name: string, order: number): SpreadsheetColumn => ({
  id,
  name,
  label: name,
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  order
})

const makeSheet = (): SpreadsheetSheet => ({
  id: 'sheet-a',
  name: 'Sheet A',
  viewType: 'table',
  columns: [textCol('name', 'name', 0)],
  views: [],
  data: [],
  settings: {
    allowAdd: true,
    allowEdit: true,
    allowDelete: true,
    allowExport: true,
    allowImport: true,
    rowsPerPage: 50,
    showRowNumbers: true
  }
})

describe('TableView', () => {
  beforeEach(() => {
    capturedGridProps = null
  })

  it('forwards the actual source sheet id from Univer data changes', () => {
    const onDataChange = jest.fn()

    render(
      <TableView
        sheet={makeSheet()}
        data={[]}
        columns={[]}
        spreadsheetColumns={[textCol('name', 'name', 0)]}
        testId="table-view"
        onDataChange={onDataChange}
      />
    )

    expect(capturedGridProps).not.toBeNull()
    const gridOnDataChange = capturedGridProps?.onDataChange as
      | ((data: Record<string, unknown>[], sheetId?: string) => void)
      | undefined

    expect(gridOnDataChange).toBeDefined()
    gridOnDataChange?.([{ _rowUuid: 'row-1', name: 'value' }], 'sheet-b')

    expect(onDataChange).toHaveBeenCalledWith([{ _rowUuid: 'row-1', name: 'value' }], 'sheet-b')
  })
})
