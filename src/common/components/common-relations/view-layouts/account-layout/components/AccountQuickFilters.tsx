import React from 'react'
import { Button } from '@newwork/nw-design-system'

export type QuickFilterType = 'all' | 'established' | 'prospect'

export interface AccountQuickFiltersProps {
  activeFilter: QuickFilterType
  onFilterChange: (filter: QuickFilterType, prospective: boolean | undefined) => void
  labels: {
    all: string
    established: string // "Customers" for CRM, "Portfolio Companies" for IRM
    prospect: string // "Prospects"
  }
  dataTestIdPrefix?: string
}

/**
 * Reusable quick filter buttons for Account views (CRM & IRM)
 * - All: Shows all accounts (no prospective filter)
 * - Established: Shows accounts with prospective = false
 * - Prospect: Shows accounts with prospective = true
 */
export const AccountQuickFilters: React.FC<AccountQuickFiltersProps> = ({
  activeFilter,
  onFilterChange,
  labels,
  dataTestIdPrefix = 'account'
}) => {
  const handleFilterClick = (filter: QuickFilterType) => {
    if (filter === activeFilter) return

    let prospective: boolean | undefined

    if (filter === 'prospect') {
      prospective = true
    } else if (filter === 'established') {
      prospective = false
    } else {
      // 'all' filter - no prospective filter
      prospective = undefined
    }

    onFilterChange(filter, prospective)
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${dataTestIdPrefix}-quick-filters`}>
      <Button
        variant={activeFilter === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleFilterClick('all')}
        data-testid={`${dataTestIdPrefix}-quick-filter-all`}
      >
        {labels.all}
      </Button>
      <Button
        variant={activeFilter === 'established' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleFilterClick('established')}
        data-testid={`${dataTestIdPrefix}-quick-filter-established`}
      >
        {labels.established}
      </Button>
      <Button
        variant={activeFilter === 'prospect' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleFilterClick('prospect')}
        data-testid={`${dataTestIdPrefix}-quick-filter-prospect`}
      >
        {labels.prospect}
      </Button>
    </div>
  )
}

export default AccountQuickFilters
