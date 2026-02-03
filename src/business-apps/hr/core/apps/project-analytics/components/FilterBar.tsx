import React from 'react'
import { Input, Button, Badge } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, XIcon, FunnelIcon } from '@phosphor-icons/react'
import { ProjectAnalyticsFilters, RiskStatus } from '../types'

interface FilterBarProps {
  filters: ProjectAnalyticsFilters
  onFiltersChange: (filters: ProjectAnalyticsFilters) => void
  prefixDataTestId?: string
}

const STATUS_OPTIONS: Array<{ value: RiskStatus; label: string }> = [
  { value: 'on-track', label: '🟢 On Track' },
  { value: 'at-risk', label: '🟠 At Risk' },
  { value: 'over-budget', label: '🔴 Over Budget' },
  { value: 'not-started', label: '⚪ Not Started' }
]

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFiltersChange, prefixDataTestId = 'filter-bar' }) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value })
  }

  const handleStatusToggle = (status: RiskStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status]
    onFiltersChange({ ...filters, statuses: newStatuses })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      projectIds: [],
      projectManagerIds: [],
      statuses: [],
      search: ''
    })
  }

  const hasActiveFilters =
    filters.search ||
    filters.statuses.length > 0 ||
    filters.projectIds.length > 0 ||
    filters.projectManagerIds.length > 0

  return (
    <div className="gba:mb-6 gba:space-y-4" data-testid={prefixDataTestId}>
      {/* Search and Clear */}
      <div className="gba:flex gba:items-center gba:gap-4">
        <div className="gba:relative gba:flex-1 gba:max-w-md">
          <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="gba:pl-9"
            data-testid={`${prefixDataTestId}-search`}
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gba:text-muted-foreground"
            data-testid={`${prefixDataTestId}-clear`}
          >
            <XIcon className="gba:w-4 gba:h-4 gba:mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Status Filters */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
        <FunnelIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
        <span className="gba:text-sm gba:text-muted-foreground gba:mr-2">Status:</span>
        {STATUS_OPTIONS.map(option => (
          <Badge
            key={option.value}
            variant={filters.statuses.includes(option.value) ? 'default' : 'outline'}
            className="gba:cursor-pointer gba:select-none"
            onClick={() => handleStatusToggle(option.value)}
            data-testid={`${prefixDataTestId}-status-${option.value}`}
          >
            {option.label}
          </Badge>
        ))}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
          <span>Showing:</span>
          {filters.search && (
            <Badge variant="secondary" className="gba:gap-1">
              Search: &quot;{filters.search}&quot;
              <XIcon
                className="gba:w-3 gba:h-3 gba:cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, search: '' })}
              />
            </Badge>
          )}
          {filters.statuses.map(status => (
            <Badge key={status} variant="secondary" className="gba:gap-1">
              {STATUS_OPTIONS.find(o => o.value === status)?.label}
              <XIcon
                className="gba:w-3 gba:h-3 gba:cursor-pointer"
                onClick={() => handleStatusToggle(status as RiskStatus)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
