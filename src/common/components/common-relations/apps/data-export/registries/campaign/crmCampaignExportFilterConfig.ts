import { buildExportFilterConfig } from '../../utils/filterConfigBuilders'

/** CRM campaign export filters aligned with campaign management list filters. */
export const crmCampaignExportFilterConfig = buildExportFilterConfig(
  'campaign-export-filters',
  'Campaign Export Filters',
  [
    {
      id: 'type-group',
      label: 'filter-campaign-type',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'types',
          field: 'types',
          label: 'filter-campaign-type',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'filter-search-types',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'status-group',
      label: 'filter-status',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'status',
          field: 'status',
          label: 'filter-status',
          type: 'multi-select',
          config: {
            options: [
              { id: 'planned', label: 'filter-campaign-status-planned' },
              { id: 'active', label: 'filter-campaign-status-active' },
              { id: 'completed', label: 'filter-campaign-status-completed' }
            ],
            searchPlaceholder: 'filter-search-statuses',
            totalCount: 3,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'date-group',
      label: 'filter-date-ranges',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'startDateRange',
          field: 'startDateRange',
          label: 'filter-start-date',
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: 'filter-from-date',
            placeholderEnd: 'filter-to-date',
            showClearButton: true
          }
        },
        {
          id: 'endDateRange',
          field: 'endDateRange',
          label: 'filter-end-date',
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: 'filter-from-date',
            placeholderEnd: 'filter-to-date',
            showClearButton: true
          }
        },
        {
          id: 'createdAtRange',
          field: 'createdAtRange',
          label: 'filter-created-date',
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: 'filter-from-date',
            placeholderEnd: 'filter-to-date',
            showClearButton: true
          }
        }
      ]
    }
  ]
)
