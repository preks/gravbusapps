import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { CommonLeadFilters } from '@/common/data/relations/types/commonLeadTypes'

/**
 * Default Lead Filter Configuration
 * Base filter configuration shared across Customer and Investment Leads
 * Uses individual filter groups for better control and pagination
 */
export const defaultLeadFilterConfig: FilterConfiguration & { data?: CommonLeadFilters } = {
  groups: [
    {
      id: 'owner-group',
      label: 'Owner',
      filters: [
        {
          id: 'owners',
          label: 'Owner',
          type: 'multi-select',
          options: [],
          placeholder: 'Select owners...',
          searchable: true,
          loadMore: true
        }
      ]
    },
    {
      id: 'status-group',
      label: 'Status',
      filters: [
        {
          id: 'statuses',
          label: 'Status',
          type: 'multi-select',
          options: [],
          placeholder: 'Select status...',
          searchable: true,
          loadMore: true
        }
      ]
    },
    {
      id: 'rating-group',
      label: 'Rating',
      filters: [
        {
          id: 'ratings',
          label: 'Rating',
          type: 'multi-select',
          options: [],
          placeholder: 'Select rating...',
          searchable: true,
          loadMore: true
        }
      ]
    },
    {
      id: 'source-group',
      label: 'Source',
      filters: [
        {
          id: 'sources',
          label: 'Source',
          type: 'multi-select',
          options: [],
          placeholder: 'Select source...',
          searchable: true,
          loadMore: true
        }
      ]
    },
    {
      id: 'salutation-group',
      label: 'Salutation',
      filters: [
        {
          id: 'salutations',
          label: 'Salutation',
          type: 'multi-select',
          options: [],
          placeholder: 'Select salutation...',
          searchable: true,
          loadMore: true
        }
      ]
    },
    {
      id: 'industry-group',
      label: 'Industry',
      filters: [
        {
          id: 'industries',
          label: 'Industry',
          type: 'multi-select',
          options: [],
          placeholder: 'Select industry...',
          searchable: true,
          loadMore: true
        }
      ]
    },
    {
      id: 'date-group',
      label: 'Date Range',
      filters: [
        {
          id: 'createdAfter',
          label: 'Created After',
          type: 'date',
          placeholder: 'Select start date'
        },
        {
          id: 'createdBefore',
          label: 'Created Before',
          type: 'date',
          placeholder: 'Select end date'
        }
      ]
    }
  ]
}
