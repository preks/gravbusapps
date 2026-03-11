import type { FilterConfiguration } from '@newwork/nw-design-system'
import { ContentGroup } from '@/common/data/content/types/contentEnums'

// Base filter groups (without content group filter)
const baseFilterGroups = [
  {
    id: 'type-filter',
    label: 'Content Type',
    collapsible: true,
    filters: [
      {
        id: 'contentTypeRef',
        field: 'contentTypeRef',
        label: 'Type',
        type: 'select' as const,
        config: {
          options: [
            { id: 'ContentType:v1:Article', label: 'Article' },
            { id: 'ContentType:v1:News', label: 'News' },
            { id: 'ContentType:v1:Announcement', label: 'Announcement' },
            { id: 'ContentType:v1:KnowledgeBase', label: 'Knowledge Base' },
            { id: 'ContentType:v1:Document', label: 'Document' },
            { id: 'ContentType:v1:Question', label: 'Question' },
            { id: 'ContentType:v1:Discussion', label: 'Discussion' }
          ]
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
      id: 'contentGroupRef',
      field: 'contentGroupRef',
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
