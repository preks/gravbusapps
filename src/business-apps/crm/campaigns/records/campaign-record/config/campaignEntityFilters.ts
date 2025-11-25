import type { FilterConfiguration, FilterGroup, Filter } from '@newwork/nw-design-system'

// Helper to create filter groups with common properties
const createFilterGroup = (id: string, label: string, filters: Filter[], defaultExpanded = true): FilterGroup => ({
  id,
  label,
  collapsible: true,
  defaultExpanded,
  filters
})

// Helper to create multi-select filter
const createMultiSelectFilter = (
  id: string,
  label: string,
  options: Array<{ id: string; label: string }>,
  searchPlaceholder?: string
): Filter => ({
  id,
  field: id,
  label,
  type: 'multi-select',
  config: {
    options,
    ...(searchPlaceholder && { searchPlaceholder })
  }
})

// Entity type options
const entityTypeOptions = [
  { id: 'lead', label: 'Lead' },
  { id: 'account', label: 'Account' },
  { id: 'contact', label: 'Contact' },
  { id: 'opportunity', label: 'Opportunity' }
]

// Status options
const statusOptions = [
  { id: 'new', label: 'New' },
  { id: 'open', label: 'Open' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'converted', label: 'Converted' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' }
]

// Date range filter
const dateRangeFilter: Filter = {
  id: 'createdAtRange',
  field: 'createdAtRange',
  label: 'Creation Date',
  type: 'date',
  config: {
    dateType: 'date',
    mode: 'range',
    placeholder: 'Start Date',
    placeholderEnd: 'End Date',
    showClearButton: true
  }
}

export const campaignEntityFilterConfig: FilterConfiguration = {
  id: 'campaign-entity-filters',
  name: 'Campaign Entity Filters',
  groups: [
    createFilterGroup('entity-type-group', 'Entity Type', [
      createMultiSelectFilter('type', 'Entity Type', entityTypeOptions)
    ]),
    createFilterGroup('status-group', 'Status', [
      createMultiSelectFilter('status', 'Status', statusOptions, 'Search statuses...')
    ]),
    createFilterGroup('date-group', 'Date Range', [dateRangeFilter], false)
  ]
}
