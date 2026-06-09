import type { FilterConfiguration } from '@newwork/nw-design-system'

type FilterGroup = FilterConfiguration['groups'][number]
type FilterDef = FilterGroup['filters'][number]

const emptyMultiSelectConfig = (searchPlaceholder: string) => ({
  options: [] as Array<{ id: string; label: string }>,
  searchPlaceholder,
  totalCount: 0,
  hasMore: false
})

/** Reusable multi-select filter entry — options filled by useFilterGroups + descriptors. */
export function createEntityMultiSelectFilter(
  field: string,
  labelKey: string,
  searchPlaceholderKey: string
): FilterDef {
  return {
    id: field,
    field,
    label: labelKey,
    type: 'multi-select',
    config: emptyMultiSelectConfig(searchPlaceholderKey)
  }
}

export function createEntityMultiSelectGroup(
  groupId: string,
  groupLabelKey: string,
  field: string,
  filterLabelKey: string,
  searchPlaceholderKey: string,
  defaultExpanded = false
): FilterGroup {
  return {
    id: groupId,
    label: groupLabelKey,
    collapsible: true,
    defaultExpanded,
    filters: [createEntityMultiSelectFilter(field, filterLabelKey, searchPlaceholderKey)]
  }
}

export function createDateRangeFilter(field: string, labelKey: string): FilterDef {
  return {
    id: field,
    field,
    label: labelKey,
    type: 'date',
    config: {
      dateType: 'date',
      mode: 'range',
      placeholder: 'filter-start-date',
      placeholderEnd: 'filter-end-date',
      showClearButton: true
    }
  }
}

export function createDateRangeGroup(
  groupId: string,
  groupLabelKey: string,
  field: string,
  filterLabelKey: string,
  defaultExpanded = false
): FilterGroup {
  return {
    id: groupId,
    label: groupLabelKey,
    collapsible: true,
    defaultExpanded,
    filters: [createDateRangeFilter(field, filterLabelKey)]
  }
}

export function createNumberRangeFilter(field: string, labelKey: string): FilterDef {
  return {
    id: field,
    field,
    label: labelKey,
    type: 'number',
    config: {
      mode: 'range',
      min: 0,
      max: 1000000,
      step: 100,
      placeholderMin: 'filter-min-amount',
      placeholderMax: 'filter-max-amount'
    }
  }
}

export function createNumberRangeGroup(
  groupId: string,
  groupLabelKey: string,
  field: string,
  filterLabelKey: string,
  defaultExpanded = false
): FilterGroup {
  return {
    id: groupId,
    label: groupLabelKey,
    collapsible: true,
    defaultExpanded,
    filters: [createNumberRangeFilter(field, filterLabelKey)]
  }
}

export const accountCommunicationExportFilterGroup: FilterGroup = {
  id: 'contact-filters',
  label: 'filter-contact-information',
  collapsible: true,
  defaultExpanded: false,
  filters: [
    {
      id: 'communicationChannels',
      field: 'communicationChannels',
      label: 'filter-contact-info',
      type: 'multi-select',
      config: {
        options: [
          { id: 'has:email', label: 'filter-has-email' },
          { id: 'missing:email', label: 'filter-missing-email' },
          { id: 'has:phone', label: 'filter-has-phone' },
          { id: 'missing:phone', label: 'filter-missing-phone' },
          { id: 'has:website', label: 'filter-has-website' },
          { id: 'missing:website', label: 'filter-missing-website' }
        ],
        searchPlaceholder: 'filter-select',
        totalCount: 6,
        hasMore: false
      }
    }
  ]
}

export const accountCategoryExportFilterGroup: FilterGroup = {
  id: 'account-type-group',
  label: 'filter-account-category',
  collapsible: true,
  defaultExpanded: false,
  filters: [
    {
      id: 'prospective',
      field: 'prospective',
      label: 'filter-account-category',
      type: 'checkbox-group',
      config: {
        options: [
          { id: 'true', label: 'filter-prospect' },
          { id: 'false', label: 'filter-established' }
        ]
      }
    }
  ]
}

export const accountStatusExportFilterGroup: FilterGroup = {
  id: 'status-group',
  label: 'filter-status',
  collapsible: true,
  defaultExpanded: false,
  filters: [
    {
      id: 'recordStates',
      field: 'recordStates',
      label: 'filter-status',
      type: 'multi-select',
      config: {
        options: [
          { id: 'ACTIVE', label: 'filter-record-active' },
          { id: 'INACTIVE', label: 'filter-record-inactive' },
          { id: 'DRAFT', label: 'filter-record-draft' },
          { id: 'ARCHIVED', label: 'filter-record-archived' }
        ],
        searchPlaceholder: 'filter-select-status',
        totalCount: 4,
        hasMore: false
      }
    }
  ]
}

export const contactInfoExportFilterGroup: FilterGroup = {
  id: 'contact-info-group',
  label: 'filter-contact-information',
  collapsible: true,
  defaultExpanded: false,
  filters: [
    {
      id: 'communicationChannels',
      field: 'communicationChannels',
      label: 'filter-contact-info',
      type: 'multi-select',
      config: {
        options: [
          { id: 'has:email', label: 'filter-has-email' },
          { id: 'missing:email', label: 'filter-missing-email' },
          { id: 'has:phone', label: 'filter-has-phone' },
          { id: 'missing:phone', label: 'filter-missing-phone' }
        ],
        searchPlaceholder: 'filter-select',
        totalCount: 4,
        hasMore: false
      }
    }
  ]
}

export const sensitiveExportFilterGroup: FilterGroup = {
  id: 'sensitive-group',
  label: 'filter-sensitive',
  collapsible: true,
  defaultExpanded: false,
  filters: [
    {
      id: 'sensitive',
      field: 'sensitive',
      label: 'filter-sensitive',
      type: 'multi-select',
      config: {
        options: [
          { id: 'true', label: 'filter-yes' },
          { id: 'false', label: 'filter-no' }
        ],
        searchPlaceholder: 'filter-select',
        totalCount: 2,
        hasMore: false
      }
    }
  ]
}

export function buildExportFilterConfig(id: string, name: string, groups: FilterGroup[]): FilterConfiguration {
  return { id, name, groups }
}
