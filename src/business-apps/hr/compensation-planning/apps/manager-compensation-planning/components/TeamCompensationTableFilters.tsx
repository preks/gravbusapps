import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { PiX, PiXCircle } from 'react-icons/pi'
import { TeamCompensationFilterSearchToolbar } from './TeamCompensationFilterSearchToolbar'
import translations from '../_i18n'

/** Matches `DataFilter` / manager filter sidebar width so the toolbar lines up with the table column, not over the panel. */
const FILTER_SIDEBAR_COL_CLASS = 'gba:w-[336px] gba:shrink-0'

interface TeamCompensationTableFiltersProps {
  searchQuery: string
  onSearchChange: (search: string) => void
  onPageChange?: (page: number) => void
  showDataFilter: boolean
  onToggleDataFilter: () => void
  sidebarFilterIds: string[]
  filterLabelMap: Record<string, string>
  onRemoveSidebarFilterId: (id: string) => void
  /** Range / custom filters shown as pills (e.g. salary min–max, last raise dates). */
  additionalFilterPills?: { id: string; label: string }[]
  onRemoveAdditionalFilterPill?: (id: string) => void
  onClearAllFilters: () => void
  /** Rendered after filter + search, still on the left (e.g. section title). */
  toolbarAfterSearch?: React.ReactNode
  /** Right-aligned controls on the same row (e.g. company selector). */
  toolbarEndRight?: React.ReactNode
  /** Optional test id for the combined top toolbar row when `toolbarEndRight` is used. */
  toolbarRowDataTestId?: string
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
  additionalFilterPills = [],
  onRemoveAdditionalFilterPill,
  onClearAllFilters,
  toolbarAfterSearch,
  toolbarEndRight,
  toolbarRowDataTestId
}) => {
  const { t } = useTranslation(translations)

  const hasActiveFilters =
    sidebarFilterIds.length > 0 || additionalFilterPills.length > 0 || (searchQueryProp?.trim().length ?? 0) > 0

  const filterToolbarProps = {
    searchQuery: searchQueryProp,
    onSearchChange,
    onPageChange,
    showDataFilter,
    onToggleDataFilter,
    searchPlaceholder: t('search-placeholder'),
    searchAriaLabel: t('search-toggle-aria')
  }

  /** When the filter sidebar is open, indent toolbar and pills so they align with the table (not above the sidebar). */
  const alignToolbarWithTable = showDataFilter && toolbarEndRight != null

  const pillsBlock = hasActiveFilters && (
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
      {additionalFilterPills.map(pill => (
        <div
          key={pill.id}
          className="gba:flex gba:min-h-6 gba:max-w-80 gba:flex-shrink-0 gba:items-center gba:gap-3 gba:break-words gba:rounded-full gba:bg-gray-100 gba:px-3 gba:py-1"
        >
          <span className="gba:text-sm gba:leading-tight gba:whitespace-normal">{pill.label}</span>
          <button
            type="button"
            className="gba:ml-0.5 gba:flex gba:h-3 gba:w-3 gba:cursor-pointer gba:items-center gba:justify-center gba:rounded-full gba:border-none gba:bg-transparent gba:p-0 gba:text-gray-800 gba:transition-colors gba:hover:bg-gray-200"
            onClick={() => onRemoveAdditionalFilterPill?.(pill.id)}
            aria-label={t('filter-remove-pill-aria')}
            data-testid={`manager-team-pill-remove-${pill.id.replace(/[^a-zA-Z0-9-]/g, '-')}`}
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
  )

  const toolbarRow = (
    <div
      className={
        toolbarEndRight
          ? 'gba:flex gba:w-full gba:flex-row gba:flex-wrap gba:items-start gba:justify-between gba:gap-4'
          : 'gba:flex gba:min-w-0 gba:flex-row gba:flex-wrap gba:items-center gba:gap-4'
      }
      data-testid={toolbarEndRight ? toolbarRowDataTestId : undefined}
    >
      <div
        className={
          toolbarEndRight
            ? 'gba:flex gba:min-w-0 gba:flex-1 gba:flex-row gba:flex-wrap gba:items-center gba:gap-4'
            : 'gba:contents'
        }
      >
        <TeamCompensationFilterSearchToolbar {...filterToolbarProps} />
        {toolbarAfterSearch}
      </div>
      {toolbarEndRight ? (
        <div className="gba:flex gba:shrink-0 gba:flex-col gba:items-end gba:gap-2">{toolbarEndRight}</div>
      ) : null}
    </div>
  )

  if (alignToolbarWithTable) {
    return (
      <div className="gba:flex gba:flex-col gba:gap-4">
        <div className="gba:flex gba:w-full gba:flex-row gba:flex-wrap gba:items-start gba:gap-4">
          <div className={FILTER_SIDEBAR_COL_CLASS} aria-hidden />
          <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:gap-4">
            {toolbarRow}
            {hasActiveFilters && pillsBlock}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      {toolbarRow}
      {hasActiveFilters && pillsBlock}
    </div>
  )
}
