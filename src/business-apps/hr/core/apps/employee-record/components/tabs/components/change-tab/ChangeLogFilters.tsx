import React, { useEffect, useState } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ChangeLogFilters as ChangeLogFiltersType } from '../../ChangeLogTab'
import { FIELD_CATEGORIES } from './constants'
import { useDebounce } from '@/common/hooks/useDebounce'

interface ChangeLogFiltersProps {
  filters: ChangeLogFiltersType
  onFilterChange: (key: keyof ChangeLogFiltersType, value: any) => void
  onClearFilters: () => void
  userRole: string
  filteredEntriesCount: number
  totalEntriesCount: number
  actorNames?: string[]
}

// Dynamic actor options provided by parent; we always include System

// Get available field categories based on user role
const getAvailableFieldCategories = (userRole: string) => {
  const allCategories = ['personal', 'address', 'org', 'employment', 'financial', 'skills', 'documents']

  switch (userRole) {
    case 'admin':
    case 'hr_manager':
      return allCategories
    case 'manager':
      return allCategories.filter(cat => cat !== 'financial')
    case 'employee':
    default:
      // Employees can see Employment; hide only Financial and Org
      return allCategories.filter(cat => !['financial', 'org'].includes(cat))
  }
}

export const ChangeLogFilters: React.FC<ChangeLogFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  userRole,
  filteredEntriesCount,
  totalEntriesCount,
  actorNames: propsActorNames
}) => {
  const availableCategories = getAvailableFieldCategories(userRole)
  const filteredFieldCategories = FIELD_CATEGORIES.filter(cat => availableCategories.includes(cat.value))

  // Local state + debounce for search input
  const [searchLocal, setSearchLocal] = useState<string>(filters.searchTerm || '')
  const debouncedSearch = useDebounce(searchLocal, 500)

  useEffect(() => {
    if (debouncedSearch !== filters.searchTerm) {
      onFilterChange('searchTerm', debouncedSearch)
    }
  }, [debouncedSearch, filters.searchTerm, onFilterChange])

  const inputClass =
    'gba:h-8 gba:w-full gba:px-3 gba:py-1 gba:text-sm gba:rounded gba:border gba:border-input gba:bg-background gba:text-foreground'

  return (
    <div className="gba:bg-card gba:text-card-foreground gba:border gba:border-border gba:rounded-lg gba:p-4">
      <div className="gba:flex gba:items-center gba:mb-4">
        <h3 className="gba:text-lg gba:font-medium gba:m-0">
          {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.filters.title', 'Filters')}
        </h3>
      </div>
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4">
        {/* Search */}
        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium gba:block">
            {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.filters.search', 'Search')}
          </label>
          <input
            type="text"
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:changelog_tab.filters.search_placeholder',
              'Search changes...'
            )}
            value={searchLocal}
            onChange={e => setSearchLocal(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Field Category */}
        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium gba:block">
            {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.filters.field_category', 'Field Category')}
          </label>
          <select
            value={filters.fieldCategory[0] || ''}
            onChange={e => onFilterChange('fieldCategory', e.target.value ? [e.target.value] : [])}
            className={inputClass}
          >
            <option value="">
              {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.filters.all_categories', 'All categories')}
            </option>
            {filteredFieldCategories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* Change Actor */}
        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium gba:block">
            {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.filters.change_actor', 'Change Actor')}
          </label>
          <select
            value={filters.changeActor[0] || ''}
            onChange={e => onFilterChange('changeActor', e.target.value ? [e.target.value] : [])}
            className={inputClass}
          >
            <option value="">
              {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.filters.all_actors', 'All actors')}
            </option>
            {/* Single System option */}
            <option value="system">
              {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.actors.system', 'System')}
            </option>
            {/* Dynamic actor names */}
            {(propsActorNames || []).map((name: string) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium gba:block">
            {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.filters.date_range', 'Date Range')}
          </label>
          <div className="gba:flex gba:gap-2">
            <input
              type="date"
              value={filters.dateRange.from ? filters.dateRange.from.toISOString().split('T')[0] : ''}
              onChange={e =>
                onFilterChange('dateRange', {
                  ...filters.dateRange,
                  from: e.target.value ? new Date(e.target.value) : null
                })
              }
              className={`gba:flex-1 ${inputClass}`}
            />
            <input
              type="date"
              value={filters.dateRange.to ? filters.dateRange.to.toISOString().split('T')[0] : ''}
              onChange={e =>
                onFilterChange('dateRange', {
                  ...filters.dateRange,
                  to: e.target.value ? new Date(e.target.value) : null
                })
              }
              className={`gba:flex-1 ${inputClass}`}
            />
          </div>
        </div>
      </div>

      <div className="gba:flex gba:justify-between gba:items-center gba:mt-4">
        <button
          onClick={onClearFilters}
          className="gba:h-8 gba:px-4 gba:py-1 gba:text-sm gba:border gba:border-input gba:rounded-md gba:bg-background gba:cursor-pointer gba:hover:bg-accent"
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.actions.clear_filters', 'Clear Filters')}
        </button>
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:text-muted-foreground">
            {filteredEntriesCount} {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.labels.of', 'of')}{' '}
            {totalEntriesCount} {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.labels.changes', 'changes')}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ChangeLogFilters
