import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LeadLayout, type LeadViewConfig } from '@/common/components/common-relations/view-layouts/lead-layout'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'
import { type CustomerLead, CUSTOMER_LEAD_DESCRIPTORS } from '@/common/data/customer/types/customerLeadTypes'
import {
  commonLeadColumns,
  commonLeadFilterConfig
} from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { useCustomerLeads } from '@/common/data/customer/hooks/useCustomerLeads'
import type { CustomerLeadQueryVariables } from '@/common/data/customer/queries/customerLeadQueries'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useCustomerLeadStatistics } from '@/common/data/customer/hooks/useCustomerLeadStatistics'

export type LeadViewProps = BusinessAppContextProps

// Helper functions to reduce cognitive complexity
const processDateRangeFilters = (
  selectedFilters: Record<string, any>,
  dateRangeKeys: string[],
  vars: CustomerLeadQueryVariables
): void => {
  for (const rangeKey of dateRangeKeys) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (normalized) {
      const baseKey = rangeKey.replace('Range', '')
      if (normalized.from) vars[`${baseKey}From` as keyof CustomerLeadQueryVariables] = normalized.from
      if (normalized.to) vars[`${baseKey}To` as keyof CustomerLeadQueryVariables] = normalized.to
    }
  }
}

const processSensitiveFilter = (selectedFilters: Record<string, any>, vars: CustomerLeadQueryVariables): void => {
  if (selectedFilters.sensitive !== undefined && selectedFilters.sensitive !== null) {
    if (Array.isArray(selectedFilters.sensitive) && selectedFilters.sensitive.length > 0) {
      const sensitiveValue = selectedFilters.sensitive[0]
      if (sensitiveValue === 'true') {
        vars.sensitive = true
      } else if (sensitiveValue === 'false') {
        vars.sensitive = false
      }
    }
  }
}

const processOtherFilters = (
  selectedFilters: Record<string, any>,
  excludeKeys: string[],
  vars: CustomerLeadQueryVariables
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (!excludeKeys.includes(key) && selectedFilters[key] !== undefined && selectedFilters[key] !== null) {
      vars[key as keyof CustomerLeadQueryVariables] = selectedFilters[key]
    }
  }
}

const processSorting = (sorting: Array<{ id: string; desc: boolean }>, vars: CustomerLeadQueryVariables): void => {
  if (sorting.length > 0) {
    const columnId = sorting[0].id
    const direction = sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

    const nonSortableColumns = ['communicationChannels', 'location']
    if (nonSortableColumns.includes(columnId)) {
      vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
    } else if (columnId === 'lead') {
      vars.orderBy = [
        { field: 'firstName', direction },
        { field: 'lastName', direction }
      ]
    } else {
      vars.orderBy = [{ field: columnId as any, direction }]
    }
  } else {
    vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
  }
}

export const LeadView: React.FC<LeadViewProps> = context => {
  const { accessToken } = context
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('crm:customer-lead-preferences:v1')

  // Data Hooks
  const { fetchCustomerLeads } = useCustomerLeads(context)
  const leadStatistics = useCustomerLeadStatistics(context)

  // Config — leadStatistics is intentionally excluded so that statistics state
  // updates (isLoading, recentLeads, etc.) do not recreate config, which would
  // cascade into new queryVariables/loadData references and re-fire GetLeads.
  // leadStatistics is passed as a separate prop to LeadLayout instead.
  const config: LeadViewConfig<CustomerLead, CustomerLeadQueryVariables> = useMemo(
    () => ({
      fetchLeads: fetchCustomerLeads,
      createColumns: () => commonLeadColumns() as any,
      descriptors: CUSTOMER_LEAD_DESCRIPTORS,
      entityName: 'Lead',
      columnLabels: {
        lead: 'Lead',
        firstName: 'First Name',
        lastName: 'Last Name',
        address: 'Location',
        leadStatus: 'Status',
        leadRating: 'Rating',
        leadSource: 'Source',
        industryClass: 'Industry',
        ownerEmployee: 'Owner',
        createdAt: 'Created Date',
        updatedAt: 'Updated Date'
      },
      baseFilterConfig: commonLeadFilterConfig,
      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
      }) => {
        const vars: CustomerLeadQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        const dateRangeKeys = ['createdAtRange', 'updatedAtRange']
        processDateRangeFilters(params.selectedFilters, dateRangeKeys, vars)
        processSensitiveFilter(params.selectedFilters, vars)
        processOtherFilters(params.selectedFilters, [...dateRangeKeys, 'sensitive'], vars)
        processSorting(params.sorting, vars)

        return vars
      },
      flowContexts: {
        entityContext: FlowContextName.customerLeadEntity,
        createContext: FlowContextName.customerLeadCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/lead-record', { leadId: id }),
      rowActionsContextArray: [FlowContextName.customerLeadEntity],
      buildRowActionsExternalContextData: (row: { original: CustomerLead }) => ({
        leadId: row.original.id
      }),
      translations: {
        allLeads: { key: 'common:allLeads', default: 'All Leads' },
        searchLeads: { key: 'common:searchLeads', default: 'Search leads...' },
        filterLeads: { key: 'common:filterLeads', default: 'Filter Leads' },
        filterLeadsDescription: {
          key: 'common:filterLeadsDescription',
          default: 'Apply filters to narrow down the lead list'
        },
        addLead: { key: 'crm:lead.addLead', default: 'Add Lead' }
      }
    }),
    [fetchCustomerLeads, accessToken]
  )

  return (
    <LeadLayout
      context={context}
      config={config}
      leadStatistics={leadStatistics}
      dataTestId="customer-lead-view"
      enableExport
      exportFilenamePrefix="leads"
      initialFilters={initialFilters}
      onFilterChange={saveFilters}
      initialSorting={initialSorting ?? undefined}
      onSortingChange={saveSorting}
      initialVisibleColumns={initialVisibleColumns ?? undefined}
      onVisibleColumnsChange={saveVisibleColumns}
    />
  )
}

export default LeadView
