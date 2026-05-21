import React from 'react'
import { render, screen } from '@testing-library/react'
import { renderInteractiveTableCell } from './interactiveTableCells'
import type { InteractiveTableColumn } from '../../../types/models'

jest.mock('../../links/EntityLink', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a data-testid="entity-link" href={href}>
      {children}
    </a>
  ),
  SUPPORTED_PROTOCOLS: ['employee', 'skill']
}))

jest.mock('@/common/components/markdown', () => ({
  MarkdownWithChipsRenderer: ({ content }: { content: string }) => <span>{content}</span>
}))

describe('renderInteractiveTableCell', () => {
  it('renders chip cell as entity link', () => {
    const column: InteractiveTableColumn = {
      id: 'employee',
      header: 'Employee',
      dataType: 'chip',
      entityType: 'employee'
    }
    render(
      <>
        {renderInteractiveTableCell(
          column,
          { id: '08b7cc98-4ec6-4b17-87fa-3eb5ccb7df8f', label: 'Daniel Vorberg' },
          'token'
        )}
      </>
    )
    const link = screen.getByTestId('entity-link')
    expect(link).toHaveAttribute('href', 'employee://08b7cc98-4ec6-4b17-87fa-3eb5ccb7df8f')
    expect(link).toHaveTextContent('Daniel Vorberg')
  })

  it('renders empty placeholder for blank cell', () => {
    const column: InteractiveTableColumn = {
      id: 'x',
      header: 'X',
      dataType: 'text'
    }
    const { container } = render(<>{renderInteractiveTableCell(column, '', 'token')}</>)
    expect(container.textContent).toContain('—')
  })

  it('formats ISO strings in text columns (e.g. closeDate typed as text)', () => {
    const column: InteractiveTableColumn = {
      id: 'closeDate',
      header: 'Close Date',
      dataType: 'text'
    }
    render(<>{renderInteractiveTableCell(column, '2025-09-30T00:00:00', 'token')}</>)
    expect(screen.queryByText('2025-09-30T00:00:00')).not.toBeInTheDocument()
    expect(screen.getByTestId('interactive-table-date-cell')).toBeInTheDocument()
  })

  it('renders date cell without raw ISO string', () => {
    const column: InteractiveTableColumn = {
      id: 'closeDate',
      header: 'Close Date',
      dataType: 'date'
    }
    render(<>{renderInteractiveTableCell(column, '2025-09-30T00:00:00', 'token')}</>)
    expect(screen.queryByText('2025-09-30T00:00:00')).not.toBeInTheDocument()
    expect(screen.getByTestId('interactive-table-date-cell')).toBeInTheDocument()
  })

  it('renders currency cell with formatted amount', () => {
    const column: InteractiveTableColumn = {
      id: 'estimatedAmount',
      header: 'Amount',
      dataType: 'currency'
    }
    render(<>{renderInteractiveTableCell(column, { value: 400000, unit: 'EUR' }, 'token')}</>)
    expect(screen.getByText(/400/)).toBeInTheDocument()
  })

  it('renders chip_list with multiple links', () => {
    const column: InteractiveTableColumn = {
      id: 'skills',
      header: 'Skills',
      dataType: 'chip_list',
      entityType: 'skill'
    }
    render(
      <>
        {renderInteractiveTableCell(
          column,
          [
            { id: '6b6383f7-db9a-43b7-9cc7-ae3b314a9fdf', label: 'Java Coding' },
            { id: '100c322b-057f-49f3-b71d-da7a1764ab2c', label: 'java' }
          ],
          'token'
        )}
      </>
    )
    const links = screen.getAllByTestId('entity-link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'skill://6b6383f7-db9a-43b7-9cc7-ae3b314a9fdf')
  })
})
