import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  LeadLayout,
  type LeadViewConfig,
  type LeadStatisticsData
} from '@/common/components/common-relations/view-layouts/lead-layout'
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

export const LeadView: React.FC<LeadViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchCustomerLeads } = useCustomerLeads(context)
  const leadStatistics = useCustomerLeadStatistics(context)

  // Statistics - Transform hook data to LeadStatisticsData format
  const leadStatisticsData: LeadStatisticsData | undefined = useMemo(() => {
    return {
      recentLeads: leadStatistics.recentLeads,
      hotLeads: leadStatistics.hotLeads,
      conversionRate: leadStatistics.conversionRate,
      topSource: leadStatistics.topSource,
      isLoading: leadStatistics.isLoading,
      error: leadStatistics.error,
      refetch: leadStatistics.refetch
    }
  }, [leadStatistics])

  // Config
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
        status: 'Status',
        rating: 'Rating',
        source: 'Source',
        industry: 'Industry',
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

        // Normalize date range filters
        const dateRangeKeys = ['createdAtRange', 'updatedAtRange']
        dateRangeKeys.forEach(rangeKey => {
          const normalized = normalizeDateRange(params.selectedFilters[rangeKey])
          if (normalized) {
            const baseKey = rangeKey.replace('Range', '')
            if (normalized.from) vars[`${baseKey}From` as keyof CustomerLeadQueryVariables] = normalized.from
            if (normalized.to) vars[`${baseKey}To` as keyof CustomerLeadQueryVariables] = normalized.to
          }
        })

        // Handle sensitive filter (boolean - no Descriptor)
        if (params.selectedFilters.sensitive !== undefined && params.selectedFilters.sensitive !== null) {
          if (Array.isArray(params.selectedFilters.sensitive) && params.selectedFilters.sensitive.length > 0) {
            const sensitiveValue = params.selectedFilters.sensitive[0]
            if (sensitiveValue === 'true') {
              vars.sensitive = true
            } else if (sensitiveValue === 'false') {
              vars.sensitive = false
            }
          }
        }

        // Copy all other filters directly (they now match Descriptor-Keys)
        Object.keys(params.selectedFilters).forEach(key => {
          if (
            !dateRangeKeys.includes(key) &&
            key !== 'sensitive' &&
            params.selectedFilters[key] !== undefined &&
            params.selectedFilters[key] !== null
          ) {
            vars[key as keyof CustomerLeadQueryVariables] = params.selectedFilters[key]
          }
        })

        // Use column ID directly - buildOrderBy will use descriptors (CUSTOMER_LEAD_DESCRIPTORS)
        // to resolve correct GraphQL paths (e.g., leadStatus.value, ownerEmployee.displayName)
        // Special handling for composite 'lead' column
        if (params.sorting.length > 0) {
          const columnId = params.sorting[0].id
          const direction = params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

          // Non-sortable columns
          if (columnId === 'communicationChannels' || columnId === 'location') {
            vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
          } else if (columnId === 'lead') {
            // Sort by firstName, then lastName
            vars.orderBy = [
              { field: 'firstName', direction },
              { field: 'lastName', direction }
            ]
          } else {
            // Use column ID directly - buildOrderBy will resolve paths via descriptors
            vars.orderBy = [{ field: columnId as any, direction }]
          }
        } else {
          vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
        }

        return vars
      },
      flowContexts: {
        entityContext: FlowContextName.customerLeadEntity,
        createContext: FlowContextName.customerLeadCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/lead-record', { leadId: id }),
      leadStatistics: leadStatisticsData,
      processCompletionEvents: ['taskCompletion', 'leadCompletion'],
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
    [fetchCustomerLeads, leadStatisticsData, accessToken]
  )

  return <LeadLayout context={context} config={config} dataTestId="customer-lead-view" />
}

export default LeadView
