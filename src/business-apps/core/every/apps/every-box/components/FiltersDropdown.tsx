/**
 * FiltersDropdown Component
 * Dropdown menu for filtering tasks with multi-select capability
 */

import React from 'react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  Button,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import { Filter } from 'lucide-react'
import translations from '../_i18n'

export type FilterType = 'all' | 'blinks' | 'approvals' | 'completed'

export interface FiltersDropdownProps {
  selectedFilters: FilterType[]
  onFiltersChange: (filters: FilterType[]) => void
  filterCounts: {
    all: number
    blinks: number
    approvals: number
    completed: number
  }
  prefixDataTestId?: string
}

export const FiltersDropdown: React.FC<FiltersDropdownProps> = ({
  selectedFilters,
  onFiltersChange,
  filterCounts,
  prefixDataTestId = 'filters-dropdown'
}) => {
  const { t } = useTranslation(translations)

  // Get the currently selected filter (only one at a time)
  const selectedFilter = selectedFilters[0] || 'all'

  const handleFilterChange = (filter: string) => {
    // Always select only one filter
    onFiltersChange([filter as FilterType])
  }

  const activeFilterCount = selectedFilter === 'all' ? 0 : 1

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gba:gap-2" data-testid={`${prefixDataTestId}-trigger`}>
          <Filter className="gba:h-4 gba:w-4" />
          <span className="gba:hidden sm:gba:inline">{t('filters-dropdown-label')}</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="gba:ml-1 gba:h-5 gba:min-w-5 gba:px-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="gba:w-56" data-testid={`${prefixDataTestId}-content`}>
        <DropdownMenuRadioGroup value={selectedFilter} onValueChange={handleFilterChange}>
          <DropdownMenuRadioItem value="all" data-testid={`${prefixDataTestId}-all`}>
            <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
              <span>{t('filters-all')}</span>
              <Badge variant="secondary" className="gba:ml-2">
                {filterCounts.all}
              </Badge>
            </div>
          </DropdownMenuRadioItem>

          <DropdownMenuSeparator />

          <DropdownMenuRadioItem value="blinks" data-testid={`${prefixDataTestId}-blinks`}>
            <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
              <span>{t('filters-blinks')}</span>
              <Badge variant="secondary" className="gba:ml-2">
                {filterCounts.blinks}
              </Badge>
            </div>
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem value="approvals" data-testid={`${prefixDataTestId}-approvals`}>
            <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
              <span>{t('filters-approvals')}</span>
              <Badge variant="secondary" className="gba:ml-2">
                {filterCounts.approvals}
              </Badge>
            </div>
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem value="completed" data-testid={`${prefixDataTestId}-completed`}>
            <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
              <span>{t('filters-completed')}</span>
              <Badge variant="secondary" className="gba:ml-2">
                {filterCounts.completed}
              </Badge>
            </div>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
