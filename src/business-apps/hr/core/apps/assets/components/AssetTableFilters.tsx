import React, { useState, useEffect } from 'react'
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/debounced-input'
import { AssetStatus } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatStatus } from './AssetTableUtils'

interface AssetTableFiltersProps {
  searchQuery: string
  statusFilter: string
  onSearchChange: (search: string) => void
  onStatusFilterChange: (status: string) => void
  onPageChange?: (page: number) => void
}

export const AssetTableFilters: React.FC<AssetTableFiltersProps> = ({
  searchQuery: searchQueryProp,
  statusFilter: statusFilterProp,
  onSearchChange,
  onStatusFilterChange,
  onPageChange
}) => {
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilterProp)
  const [inputKey, setInputKey] = useState(0)

  useEffect(() => {
    setLocalStatusFilter(statusFilterProp)
  }, [statusFilterProp])

  const handleStatusFilterChange = (value: string) => {
    setLocalStatusFilter(value)
    onStatusFilterChange(value)
    onPageChange?.(1)
  }

  const handleSearchChange = (value: string) => {
    onSearchChange(value)
    onPageChange?.(1)
  }

  const handleClearSearch = () => {
    const emptyValue = ''
    onSearchChange(emptyValue)
    onPageChange?.(1)
    setInputKey(prev => prev + 1)
  }

  return (
    <div className="gba:flex gba:gap-4 gba:flex-wrap">
      <div className="gba:flex-1 gba:min-w-[200px] gba:relative">
        <DebouncedInput
          key={`search-input-${inputKey}`}
          value={searchQueryProp}
          onChange={handleSearchChange}
          placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.search_assets', 'Search assets...')}
          className="gba:w-full gba:pr-10"
          debounceDelay={300}
          ariaLabel={getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.search_assets', 'Search assets...')}
          data-testid="asset-search-input"
          icon={
            <MagnifyingGlass className="gba:w-4 gba:h-4 gba:text-muted-foreground" data-testid="asset-search-icon" />
          }
        />
        {searchQueryProp && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="gba:absolute gba:right-1 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-6 gba:w-6 gba:p-0 gba:rounded-full hover:gba:bg-muted gba:transition-colors"
            data-testid="asset-search-clear-button"
            aria-label={getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.clear_search', 'Clear search')}
          >
            <X className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
          </Button>
        )}
      </div>

      <Select value={localStatusFilter} onValueChange={handleStatusFilterChange}>
        <SelectTrigger className="gba:w-[180px]" data-testid="asset-status-filter">
          <SelectValue
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.all_statuses', 'All Statuses')}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.all_statuses', 'All Statuses')}
          </SelectItem>
          {Object.values(AssetStatus)
            .filter(status => status !== AssetStatus.RETIRED)
            .map(status => (
              <SelectItem key={status} value={status}>
                {formatStatus(status)}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  )
}
