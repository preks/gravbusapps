import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerLeads } from '@/common/data/customer/hooks/useCustomerLeads'
import { LeadLayout, type LeadViewConfig } from '@/common/components/common-relations/view-layouts/lead-layout'
import type { CustomerLead } from '@/common/data/customer/types'
import type { CustomerLeadQueryVariables } from '@/common/data/customer/queries/customerLeadQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  createLeadColumns,
  createLeadSortableColumns
} from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { leadFilterConfig } from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { useCustomerLeadFilters } from '@/common/data/customer/hooks/useCustomerLeadFilters'
import { LeadStatisticsWithTrend } from '../lead-view/components/LeadStatistics'
import { useLeadStatisticsWithTrend as useCustomerLeadStatistics } from '@/common/data/customer/hooks/useCustomerLeadStatistics'
import {
  applyBasicFilters,
  applyDateFilter
} from '@/common/components/common-relations/view-layouts/lead-layout/utils/queryHelpers'

export type LeadViewProps = BusinessAppContextProps

export const LeadView: React.FC<LeadViewProps> = context => {
  const { fetchCustomerLeads } = useCustomerLeads(context)
  const leadStatistics = useCustomerLeadStatistics({ ...context, sourceApp: 'CRM' })

  const config: LeadViewConfig<CustomerLead, CustomerLeadQueryVariables> = useMemo(
    () => ({
      contextType: 'customer',

      fetchLeads: async (variables: CustomerLeadQueryVariables) => {
        return await fetchCustomerLeads(variables)
      },

      filterDataHook: useCustomerLeadFilters,

      createColumns: createLeadColumns as any,
      createSortableColumns: createLeadSortableColumns,

      mapColumnToGraphQLField: (columnId: string): string => {
        // Only map sortable fields for Customer Relations
        const mapping: Record<string, string> = {
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'email',
          createdAt: 'createdAt',
          updatedAt: 'updatedAt'
        }
        return mapping[columnId] || 'createdAt' // Default to createdAt for unsortable fields
      },

      baseFilterConfig: leadFilterConfig,

      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
        mapColumnToGraphQLField: (columnId: string) => string
      }) => {
        const vars: CustomerLeadQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        applyBasicFilters(vars, params.selectedFilters)
        applyDateFilter(vars, params.selectedFilters)

        if (params.sorting.length > 0) {
          vars.orderBy = [
            {
              field: params.mapColumnToGraphQLField(params.sorting[0].id) as any,
              direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
            }
          ]
        } else {
          vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
        }

        return vars
      },

      flowContexts: {
        entityContext: FlowContextName.customerLeadEntity,
        createContext: FlowContextName.customerLeadCreate
      },

      buildRecordUrl: (id: string) =>
        buildPlatformUrl('/platform/crm/lead-record', {
          leadId: id
        }),

      renderStatistics: ({ onRefresh }) =>
        leadStatistics.trendData ? (
          <LeadStatisticsWithTrend
            trendData={leadStatistics.trendData}
            mostCommonLeadSource="N/A"
            isLoading={leadStatistics.isLoading}
            error={leadStatistics.error}
            onRetry={onRefresh}
          />
        ) : null,

      processCompletionEvents: ['taskCompletion', 'leadCompletion']
    }),
    [context, fetchCustomerLeads, leadStatistics]
  )

  return <LeadLayout context={context} config={config} dataTestId="customer-lead-view" />
}

export default LeadView
