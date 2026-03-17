import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { InsertTabContent } from './InsertTabContent'

jest.mock('@newwork/nw-design-system', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  }),
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
    ...props
  }: {
    children: React.ReactNode
    onSelect?: () => void
    [key: string]: unknown
  }) => (
    <button type="button" onClick={() => onSelect?.()} {...props}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />
}))

jest.mock('./editorToolbarShared', () => ({
  ToolbarButton: ({
    children,
    onClick,
    tooltip
  }: {
    children: React.ReactNode
    onClick: () => void
    tooltip: string
  }) => (
    <button type="button" onClick={onClick} data-tooltip={tooltip}>
      {children}
    </button>
  ),
  RibbonGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

function createEditor(inTable = true) {
  const chain = {
    focus: jest.fn(() => chain),
    insertTable: jest.fn(() => chain),
    addRowBefore: jest.fn(() => chain),
    addRowAfter: jest.fn(() => chain),
    duplicateRow: jest.fn(() => chain),
    addColumnBefore: jest.fn(() => chain),
    addColumnAfter: jest.fn(() => chain),
    duplicateColumn: jest.fn(() => chain),
    deleteRow: jest.fn(() => chain),
    deleteColumn: jest.fn(() => chain),
    deleteTable: jest.fn(() => chain),
    mergeCells: jest.fn(() => chain),
    splitCell: jest.fn(() => chain),
    toggleHeaderRow: jest.fn(() => chain),
    toggleHeaderColumn: jest.fn(() => chain),
    toggleHeaderCell: jest.fn(() => chain),
    setTableWidth: jest.fn(() => chain),
    setTableWidthMode: jest.fn(() => chain),
    setTableAlign: jest.fn(() => chain),
    setTableLayout: jest.fn(() => chain),
    setCellAttribute: jest.fn(() => chain),
    setPageBreak: jest.fn(() => chain),
    extendMarkRange: jest.fn(() => chain),
    unsetLink: jest.fn(() => chain),
    setLink: jest.fn(() => chain),
    setImage: jest.fn(() => chain),
    run: jest.fn(() => true)
  }

  const can = () => ({
    addRowBefore: () => inTable,
    addRowAfter: () => inTable,
    duplicateRow: () => inTable,
    deleteRow: () => inTable,
    addColumnBefore: () => inTable,
    addColumnAfter: () => inTable,
    duplicateColumn: () => inTable,
    deleteColumn: () => inTable,
    deleteTable: () => inTable,
    mergeCells: () => inTable,
    splitCell: () => inTable,
    toggleHeaderRow: () => inTable,
    toggleHeaderColumn: () => inTable,
    toggleHeaderCell: () => inTable,
    setTableLayout: () => inTable,
    setCellAttribute: () => inTable
  })

  return {
    state: {
      selection: {
        $from: {
          depth: inTable ? 2 : 1,
          node: (depth: number) => ({
            type: {
              name: inTable && depth === 1 ? 'tableCell' : 'paragraph'
            }
          })
        }
      }
    },
    chain: jest.fn(() => chain),
    can,
    isActive: jest.fn(() => false),
    getAttributes: jest.fn((name: string) => {
      if (name === 'table') return { tableWidth: '100%', tableWidthMode: 'manual' }
      if (name === 'tableCell' || name === 'tableHeader') return { backgroundColor: '', borderColor: '' }
      return {}
    }),
    __chain: chain
  } as any
}

describe('InsertTabContent', () => {
  it('disables table tools outside a table selection', () => {
    render(<InsertTabContent editor={createEditor(false)} testId="document-toolbar" />)

    expect(screen.getByTestId('document-toolbar-table-tools-trigger')).toBeDisabled()
  })

  it('dispatches structural, width, and styling commands from the table tools menu', () => {
    const editor = createEditor(true)

    render(<InsertTabContent editor={editor} testId="document-toolbar" />)

    fireEvent.click(screen.getByTestId('document-toolbar-table-row-before'))
    fireEvent.click(screen.getByTestId('document-toolbar-table-duplicate-column'))
    fireEvent.click(screen.getByTestId('document-toolbar-table-width-autofit-window'))
    fireEvent.click(screen.getByTestId('document-toolbar-table-width-fixed'))
    fireEvent.click(screen.getByTestId('document-toolbar-table-align-center'))
    fireEvent.click(screen.getByTestId('document-toolbar-table-text-align-right'))
    fireEvent.click(screen.getByTestId('document-toolbar-table-fill-yellow'))

    expect(editor.__chain.addRowBefore).toHaveBeenCalled()
    expect(editor.__chain.duplicateColumn).toHaveBeenCalled()
    expect(editor.__chain.setTableWidthMode).toHaveBeenCalledWith('auto-fit-window')
    expect(editor.__chain.setTableLayout).toHaveBeenCalledWith({ width: '14cm', mode: 'manual' })
    expect(editor.__chain.setTableAlign).toHaveBeenCalledWith('center')
    expect(editor.__chain.setCellAttribute).toHaveBeenCalledWith('cellTextAlign', 'right')
    expect(editor.__chain.setCellAttribute).toHaveBeenCalledWith('backgroundColor', '#FFF2CC')
  })

  it('falls back to the stock insertTable command when no dialog is provided', () => {
    const editor = createEditor(true)

    render(<InsertTabContent editor={editor} testId="document-toolbar" />)

    fireEvent.click(screen.getAllByRole('button')[2])

    expect(editor.__chain.insertTable).toHaveBeenCalledWith({ rows: 3, cols: 3, withHeaderRow: true })
  })
})
