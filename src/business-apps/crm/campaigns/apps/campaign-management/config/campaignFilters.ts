import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const t = (key: string, fallback: string) => getTranslationFromI18nKeyAndLabel(`crm:campaign-filters-${key}`, fallback)

export const campaignFilterConfig: FilterConfiguration = {
  id: 'campaign-filters',
  name: t('name', 'Campaign Filters'),
  groups: [
    {
      id: 'type-group',
      label: t('typeGroup', 'Campaign Type'),
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'types',
          field: 'types',
          label: t('typeGroup', 'Campaign Type'),
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: t('searchTypes', 'Search types...')
          }
        }
      ]
    },
    {
      id: 'status-group',
      label: t('statusGroup', 'Status'),
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'status',
          field: 'status',
          label: t('statusGroup', 'Status'),
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: t('searchStatuses', 'Search statuses...')
          }
        }
      ]
    },
    {
      id: 'start-date-group',
      label: t('startDate', 'Start Date'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'startDateRange',
          field: 'startDateRange',
          label: t('startDate', 'Start Date'),
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: t('fromDate', 'From Date'),
            placeholderEnd: t('toDate', 'To Date'),
            showClearButton: true
          }
        }
      ]
    },
    {
      id: 'end-date-group',
      label: t('endDate', 'End Date'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'endDateRange',
          field: 'endDateRange',
          label: t('endDate', 'End Date'),
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: t('fromDate', 'From Date'),
            placeholderEnd: t('toDate', 'To Date'),
            showClearButton: true
          }
        }
      ]
    },
    {
      id: 'created-date-group',
      label: t('createdDate', 'Created Date'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'createdAtRange',
          field: 'createdAtRange',
          label: t('createdDate', 'Created Date'),
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: t('fromDate', 'From Date'),
            placeholderEnd: t('toDate', 'To Date'),
            showClearButton: true
          }
        }
      ]
    }
  ]
}
