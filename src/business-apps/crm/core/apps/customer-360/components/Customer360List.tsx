import React from 'react'
import type { Icon } from '@phosphor-icons/react'

export interface Customer360RowData {
  /** Stable domain id used as the React key. */
  id: string
  icon?: Icon
  primary: React.ReactNode
  secondary?: React.ReactNode
  /** Right-aligned content (status badge, amount, date). */
  trailing?: React.ReactNode
  onClick?: () => void
  testId?: string
}

interface Customer360ListProps {
  rows: Customer360RowData[]
  testId?: string
}

const Customer360Row: React.FC<{ row: Customer360RowData }> = ({ row }) => {
  const RowIcon = row.icon
  const interactive = Boolean(row.onClick)

  const content = (
    <>
      <div className="gba:flex gba:min-w-0 gba:items-start gba:gap-3">
        {RowIcon ? (
          <span className="gba:mt-0.5 gba:flex gba:size-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:text-muted-foreground">
            <RowIcon className="gba:size-4" />
          </span>
        ) : null}
        <div className="gba:flex gba:min-w-0 gba:flex-col gba:gap-0.5">
          <span className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">{row.primary}</span>
          {row.secondary ? (
            <span className="gba:truncate gba:text-xs gba:text-muted-foreground">{row.secondary}</span>
          ) : null}
        </div>
      </div>
      {row.trailing ? (
        <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-2 gba:text-right">{row.trailing}</div>
      ) : null}
    </>
  )

  if (interactive) {
    return (
      <button
        type="button"
        onClick={row.onClick}
        data-testid={row.testId}
        className="gba:flex gba:w-full gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:px-2 gba:py-3 gba:text-left gba:transition-colors gba:hover:bg-muted"
      >
        {content}
      </button>
    )
  }

  return (
    <div data-testid={row.testId} className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:px-2 gba:py-3">
      {content}
    </div>
  )
}

/**
 * Compact, divided list used for tabular-ish data (contracts, tickets, cases,
 * invoices, transactions, journal). Each row carries its own stable id key.
 */
const Customer360List: React.FC<Customer360ListProps> = ({ rows, testId }) => (
  <div className="gba:flex gba:flex-col gba:divide-y gba:divide-border" data-testid={testId}>
    {rows.map(row => (
      <Customer360Row key={row.id} row={row} />
    ))}
  </div>
)

export default Customer360List
export { Customer360List, Customer360Row }
