import type { FilterConfiguration } from '@newwork/nw-design-system'
import {
  buildExportFilterConfig,
  createDateRangeGroup,
  createEntityMultiSelectGroup
} from '../../utils/filterConfigBuilders'

const activityTypeGroup = createEntityMultiSelectGroup(
  'activity-type-group',
  'filter-activity-type',
  'activityTypeIds',
  'filter-activity-type',
  'filter-search-activity-types'
)

const ownerGroup = createEntityMultiSelectGroup(
  'owner-group',
  'filter-owner',
  'ownerEmployeeIds',
  'filter-owner',
  'filter-search-owners'
)

const createdDateGroup = createDateRangeGroup(
  'created-date-group',
  'filter-created-date',
  'createdAtRange',
  'filter-created-date'
)

const occurredDateGroup = createDateRangeGroup(
  'occurred-date-group',
  'filter-occurred-date',
  'occurredAtRange',
  'filter-occurred-date'
)

function createReferenceTypeGroup(referenceOptions: Array<{ id: string; label: string; value: string }>) {
  return {
    id: 'reference-type-group',
    label: 'filter-reference-type',
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: 'referenceType',
        field: 'referenceType',
        label: 'filter-reference-type',
        type: 'multi-select' as const,
        config: {
          options: referenceOptions,
          searchPlaceholder: 'filter-select',
          totalCount: referenceOptions.length,
          hasMore: false
        }
      }
    ]
  }
}

const crmReferenceOptions = [
  { id: 'account', label: 'filter-reference-account', value: 'account' },
  { id: 'contact', label: 'filter-reference-contact', value: 'contact' },
  { id: 'lead', label: 'filter-reference-lead', value: 'lead' },
  { id: 'opportunity', label: 'filter-reference-opportunity', value: 'opportunity' }
]

const irmReferenceOptions = [
  ...crmReferenceOptions,
  { id: 'investment', label: 'filter-reference-investment', value: 'investment' }
]

export const crmActivityExportFilterConfig: FilterConfiguration = buildExportFilterConfig(
  'crm-activity-export-filters',
  'CRM Activity Export Filters',
  [activityTypeGroup, ownerGroup, createReferenceTypeGroup(crmReferenceOptions), createdDateGroup, occurredDateGroup]
)

export const irmActivityExportFilterConfig: FilterConfiguration = buildExportFilterConfig(
  'irm-activity-export-filters',
  'IRM Activity Export Filters',
  [activityTypeGroup, ownerGroup, createReferenceTypeGroup(irmReferenceOptions), createdDateGroup, occurredDateGroup]
)
