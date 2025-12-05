import React from 'react'
import { Button } from '@newwork/nw-design-system'
import type { StatusItem } from '../hooks/useInvestmentOpportunityFilters'

export type QuickFilterType = 'all' | 'qualified' | 'unqualified'

export interface OpportunityQuickFiltersProps {
  statuses: StatusItem[]
  activeFilter: QuickFilterType
  onFilterChange: (filter: QuickFilterType, statusIds: string[] | undefined) => void
}

/**
 * Quick filter buttons for IRM Opportunity view
 * - All: Shows all opportunities (no status filter)
 * - Qualified: Shows opportunities with status code 'WON'
 * - Unqualified: Shows opportunities with status codes 'OPEN' or 'LOST'
 */
export const OpportunityQuickFilters: React.FC<OpportunityQuickFiltersProps> = ({
  statuses,
  activeFilter,
  onFilterChange
}) => {
  const handleFilterClick = (filter: QuickFilterType) => {
    if (filter === activeFilter) return

    let statusIds: string[] | undefined

    if (filter === 'qualified') {
      // Filter for WON status
      statusIds = statuses.filter(s => s.code?.toUpperCase() === 'WON').map(s => s.id)
      // If no WON statuses found, set empty array to show no results
      if (statusIds.length === 0) statusIds = []
    } else if (filter === 'unqualified') {
      // Filter for OPEN or LOST statuses
      statusIds = statuses
        .filter(s => {
          const code = s.code?.toUpperCase()
          return code === 'OPEN' || code === 'LOST'
        })
        .map(s => s.id)
      // If no matching statuses found, set empty array to show no results
      if (statusIds.length === 0) statusIds = []
    } else {
      // 'all' filter - no status filter
      statusIds = undefined
    }

    onFilterChange(filter, statusIds)
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid="opportunity-quick-filters">
      <Button
        variant={activeFilter === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleFilterClick('all')}
        data-testid="opportunity-quick-filter-all"
      >
        All
      </Button>
      <Button
        variant={activeFilter === 'unqualified' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleFilterClick('unqualified')}
        data-testid="opportunity-quick-filter-unqualified"
      >
        Unqualified
      </Button>
      <Button
        variant={activeFilter === 'qualified' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleFilterClick('qualified')}
        data-testid="opportunity-quick-filter-qualified"
      >
        Qualified
      </Button>
    </div>
  )
}

export default OpportunityQuickFilters
