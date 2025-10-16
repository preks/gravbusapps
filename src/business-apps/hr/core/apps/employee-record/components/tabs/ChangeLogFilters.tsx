import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ChangeLogFilters as ChangeLogFiltersType } from './ChangeLogTab'

interface ChangeLogFiltersProps {
  filters: ChangeLogFiltersType
  onFilterChange: (key: keyof ChangeLogFiltersType, value: any) => void
  onClearFilters: () => void
  userRole: string
  filteredEntriesCount: number
  totalEntriesCount: number
}

const FIELD_CATEGORIES = [
  { value: 'personal', label: getTranslationFromI18nKeyAndLabel('changelog.categories.personal', 'Personal Info') },
  { value: 'address', label: getTranslationFromI18nKeyAndLabel('changelog.categories.address', 'Address & Contact') },
  { value: 'org', label: getTranslationFromI18nKeyAndLabel('changelog.categories.org', 'Org Assignment') },
  { value: 'working', label: getTranslationFromI18nKeyAndLabel('changelog.categories.working', 'Working Conditions') },
  { value: 'financial', label: getTranslationFromI18nKeyAndLabel('changelog.categories.financial', 'Financial') },
  { value: 'skills', label: getTranslationFromI18nKeyAndLabel('changelog.categories.skills', 'Skills & Capabilities') },
  { value: 'performance', label: getTranslationFromI18nKeyAndLabel('changelog.categories.performance', 'Performance & Goals') },
  { value: 'absence', label: getTranslationFromI18nKeyAndLabel('changelog.categories.absence', 'Absence Entitlements') },
  { value: 'emergency', label: getTranslationFromI18nKeyAndLabel('changelog.categories.emergency', 'Emergency Contacts') }
]

const CHANGE_ACTORS = [
  { value: 'user', label: getTranslationFromI18nKeyAndLabel('changelog.actors.user', 'Manual Changes') },
  { value: 'ai', label: getTranslationFromI18nKeyAndLabel('changelog.actors.ai', 'AI Generated') },
  { value: 'system', label: getTranslationFromI18nKeyAndLabel('changelog.actors.system', 'System Generated') }
]

// Get available field categories based on user role
const getAvailableFieldCategories = (userRole: string) => {
  const allCategories = [
    'personal', 'address', 'org', 'working', 
    'financial', 'skills', 'performance', 'absence', 'emergency'
  ]

  // Filter based on user role
  switch (userRole) {
    case 'admin':
    case 'hr_manager':
      return allCategories
    case 'manager':
      return allCategories.filter(cat => cat !== 'financial')
    case 'employee':
    default:
      return allCategories.filter(cat => 
        !['financial', 'org', 'working'].includes(cat)
      )
  }
}

export const ChangeLogFilters: React.FC<ChangeLogFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  userRole,
  filteredEntriesCount,
  totalEntriesCount
}) => {
  const availableCategories = getAvailableFieldCategories(userRole)
  const filteredFieldCategories = FIELD_CATEGORIES.filter(cat => availableCategories.includes(cat.value))

  return (
    <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-4">
      <div className="gba:flex gba:items-center gba:mb-4">
        <h3 className="gba:text-lg gba:font-medium gba:m-0">
          {getTranslationFromI18nKeyAndLabel('changelog.filters.title', 'Filters')}
        </h3>
      </div>
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4">
        {/* Search */}
        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium gba:block">
            {getTranslationFromI18nKeyAndLabel('changelog.filters.search', 'Search')}
          </label>
          <input
            type="text"
            placeholder={getTranslationFromI18nKeyAndLabel('changelog.filters.search_placeholder', 'Search changes...')}
            value={filters.searchTerm}
            onChange={(e) => onFilterChange('searchTerm', e.target.value)}
            className="gba:w-full gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
          />
        </div>

        {/* Field Category */}
        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium gba:block">
            {getTranslationFromI18nKeyAndLabel('changelog.filters.field_category', 'Field Category')}
          </label>
          <select
            value={filters.fieldCategory[0] || ''}
            onChange={(e) => onFilterChange('fieldCategory', e.target.value ? [e.target.value] : [])}
            className="gba:w-full gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
          >
            <option value="">{getTranslationFromI18nKeyAndLabel('changelog.filters.all_categories', 'All categories')}</option>
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
            {getTranslationFromI18nKeyAndLabel('changelog.filters.change_actor', 'Change Actor')}
          </label>
          <select
            value={filters.changeActor[0] || ''}
            onChange={(e) => onFilterChange('changeActor', e.target.value ? [e.target.value] : [])}
            className="gba:w-full gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
          >
            <option value="">{getTranslationFromI18nKeyAndLabel('changelog.filters.all_actors', 'All actors')}</option>
            {CHANGE_ACTORS.map(actor => (
              <option key={actor.value} value={actor.value}>
                {actor.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium gba:block">
            {getTranslationFromI18nKeyAndLabel('changelog.filters.date_range', 'Date Range')}
          </label>
          <div className="gba:flex gba:gap-2">
            <input
              type="date"
              value={filters.dateRange.from ? filters.dateRange.from.toISOString().split('T')[0] : ''}
              onChange={(e) => onFilterChange('dateRange', { 
                ...filters.dateRange, 
                from: e.target.value ? new Date(e.target.value) : null 
              })}
              className="gba:flex-1 gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.dateRange.to ? filters.dateRange.to.toISOString().split('T')[0] : ''}
              onChange={(e) => onFilterChange('dateRange', { 
                ...filters.dateRange, 
                to: e.target.value ? new Date(e.target.value) : null 
              })}
              className="gba:flex-1 gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="gba:flex gba:justify-between gba:items-center gba:mt-4">
        <button 
          onClick={onClearFilters}
          className="gba:px-4 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:bg-white gba:cursor-pointer gba:hover:bg-gray-50"
        >
          {getTranslationFromI18nKeyAndLabel('changelog.actions.clear_filters', 'Clear Filters')}
        </button>
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:text-gray-500">
            {filteredEntriesCount} of {totalEntriesCount} changes
          </span>
        </div>
      </div>
    </div>
  )
}

export default ChangeLogFilters
