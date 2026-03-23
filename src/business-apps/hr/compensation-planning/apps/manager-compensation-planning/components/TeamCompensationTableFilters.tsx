import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { PiX, PiXCircle } from 'react-icons/pi'
import { AssetTableFilters } from '@/business-apps/hr/core/apps/assets/components/AssetTableFilters'
import translations from '../_i18n'

interface TeamCompensationTableFiltersProps {
  searchQuery: string
  onSearchChange: (search: string) => void
  onPageChange?: (page: number) => void
  showDataFilter: boolean
  onToggleDataFilter: () => void
  sidebarFilterIds: string[]
  filterLabelMap: Record<string, string>
  onRemoveSidebarFilterId: (id: string) => void
  onClearAllFilters: () => void
  toolbarAfterSearch?: React.ReactNode
}

export const TeamCompensationTableFilters: React.FC<TeamCompensationTableFiltersProps> = ({
  searchQuery: searchQueryProp,
  onSearchChange,
  onPageChange,
  showDataFilter,
  onToggleDataFilter,
  sidebarFilterIds,
  filterLabelMap,
  onRemoveSidebarFilterId,
  onClearAllFilters,
  toolbarAfterSearch
}) => {
  const { t } = useTranslation(translations)

  const hasActiveFilters = sidebarFilterIds.length > 0 || (searchQueryProp?.trim().length ?? 0) > 0

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <div className="gba:flex gba:min-w-0 gba:flex-row gba:flex-wrap gba:items-center gba:gap-4">
        <AssetTableFilters
          searchQuery={searchQueryProp}
          onSearchChange={onSearchChange}
          onPageChange={onPageChange}
          showDataFilter={showDataFilter}
          onToggleDataFilter={onToggleDataFilter}
          searchPlaceholder={t('search-placeholder')}
          searchAriaLabel={t('search-toggle-aria')}
        />
        {toolbarAfterSearch}
      </div>

      {hasActiveFilters && (
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2" data-testid="manager-team-filter-pills">
          {sidebarFilterIds.map(id => (
            <div
              key={id}
              className="gba:flex gba:min-h-6 gba:max-w-80 gba:flex-shrink-0 gba:items-center gba:gap-3 gba:break-words gba:rounded-full gba:bg-gray-100 gba:px-3 gba:py-1"
            >
              <span className="gba:text-sm gba:leading-tight gba:whitespace-normal">{filterLabelMap[id] ?? id}</span>
              <button
                type="button"
                className="gba:ml-0.5 gba:flex gba:h-3 gba:w-3 gba:cursor-pointer gba:items-center gba:justify-center gba:rounded-full gba:border-none gba:bg-transparent gba:p-0 gba:text-gray-800 gba:transition-colors gba:hover:bg-gray-200"
                onClick={() => onRemoveSidebarFilterId(id)}
                aria-label={t('filter-remove-pill-aria')}
                data-testid={`manager-team-pill-remove-${id.replace(/[^a-zA-Z0-9-]/g, '-')}`}
              >
                <PiX size={12} />
              </button>
            </div>
          ))}
          {(searchQueryProp?.trim().length ?? 0) > 0 && (
            <div className="gba:flex gba:min-h-6 gba:max-w-xs gba:flex-shrink-0 gba:items-center gba:gap-3 gba:truncate gba:rounded-full gba:bg-gray-100 gba:px-3 gba:py-1">
              <span className="gba:truncate gba:text-sm gba:leading-tight">
                {t('filter-pill-search', { q: searchQueryProp.trim() })}
              </span>
              <button
                type="button"
                className="gba:ml-0.5 gba:flex gba:h-3 gba:w-3 gba:shrink-0 gba:cursor-pointer gba:items-center gba:justify-center gba:rounded-full gba:border-none gba:bg-transparent gba:p-0 gba:text-gray-800 gba:transition-colors gba:hover:bg-gray-200"
                onClick={() => onSearchChange('')}
                aria-label={t('filter-remove-search-aria')}
                data-testid="manager-team-pill-remove-search"
              >
                <PiX size={12} />
              </button>
            </div>
          )}
          <button
            type="button"
            className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:text-gray-600 gba:transition-colors gba:hover:text-gray-800"
            onClick={() => onClearAllFilters()}
            data-testid="manager-team-clear-filters"
          >
            <span>{t('filter-clear-all')}</span>
            <span className="gba:flex gba:items-center gba:justify-center">
              <PiXCircle size={16} />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
