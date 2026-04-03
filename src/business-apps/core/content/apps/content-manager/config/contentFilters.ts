import type { FilterConfiguration } from '@newwork/nw-design-system'
import { ContentGroup } from '@/common/data/content/constants/contentConstants'

// Base filter groups (without content group filter)
const baseFilterGroups = [
  {
    id: 'type-filter',
    label: 'Content Type',
    collapsible: true,
    filters: [
      {
        id: 'contentTypeId',
        field: 'contentTypeId',
        label: 'Type',
        type: 'select' as const,
        config: {
          options: [],
          searchPlaceholder: 'Search types...',
          totalCount: 0,
          hasMore: false
        }
      }
    ]
  },
  {
    id: 'category-filter',
    label: 'Category',
    collapsible: true,
    filters: [
      {
        id: 'categoryIds',
        field: 'categoryIds',
        label: 'Category',
        type: 'multi-select' as const,
        config: {
          options: [],
          searchPlaceholder: 'Search categories...',
          totalCount: 0,
          hasMore: false
        }
      }
    ]
  },
  {
    id: 'tag-filter',
    label: 'Tag',
    collapsible: true,
    filters: [
      {
        id: 'tagIds',
        field: 'tagIds',
        label: 'Tag',
        type: 'multi-select' as const,
        config: {
          options: [],
          searchPlaceholder: 'Search tags...',
          totalCount: 0,
          hasMore: false
        }
      }
    ]
  },
  {
    id: 'status-filter',
    label: 'Status',
    collapsible: true,
    filters: [
      {
        id: 'status',
        field: 'status',
        label: 'Status',
        type: 'select' as const,
        config: {
          options: [
            { id: 'active', label: 'Active' },
            { id: 'deleted', label: 'Deleted' }
          ]
        }
      }
    ]
  },
  {
    id: 'date-filter',
    label: 'Date Range',
    collapsible: true,
    filters: [
      {
        id: 'dateRange',
        field: 'dateRange',
        label: 'Created Date',
        type: 'dateRange' as const,
        config: {}
      }
    ]
  }
]

// Content group filter (only for "All Content" section)
const contentGroupFilter = {
  id: 'group-filter',
  label: 'Content Group',
  collapsible: true,
  filters: [
    {
      id: 'contentGroup',
      field: 'contentGroup',
      label: 'Group',
      type: 'select' as const,
      config: {
        options: [
          { id: ContentGroup.NEWS, label: 'News' },
          { id: ContentGroup.KNOWLEDGE, label: 'Knowledge' },
          { id: ContentGroup.POLICY, label: 'Policies' },
          { id: ContentGroup.DOCUMENT, label: 'Document' },
          { id: ContentGroup.QUESTION, label: 'Question' }
        ]
      }
    }
  ]
}

// Filter config for "All Content" section (includes group filter)
export const contentFilterConfigAll: FilterConfiguration = {
  groups: [contentGroupFilter, ...baseFilterGroups]
}

// Filter config for specific sections (without group filter)
export const contentFilterConfigSpecific: FilterConfiguration = {
  groups: baseFilterGroups
}
