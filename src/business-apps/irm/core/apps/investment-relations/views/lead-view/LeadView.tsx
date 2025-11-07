import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LeadLayout, type LeadViewConfig } from '@/common/components/common-relations/view-layouts/lead-layout'
import type { InvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'
import { INVESTMENT_LEAD_DESCRIPTORS } from '@/common/data/investment/types/investmentLeadTypes'
import { commonLeadColumns } from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { commonLeadFilterConfig } from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { useInvestmentLeads } from '@/common/data/investment/hooks/useInvestmentLeads'
import { useInvestmentLeadFilters } from '@/common/data/investment/hooks/useInvestmentLeadFilters'
import type { InvestmentLeadQueryVariables } from '@/common/data/investment/queries/investmentLeadQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useInvestmentLeadStatistics } from '@/common/data/investment/hooks/useInvestmentLeadStatistics'
import type { LeadStatisticsData } from '@/common/components/common-relations/view-layouts/lead-layout'

export type LeadViewProps = BusinessAppContextProps

export const LeadView: React.FC<LeadViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchInvestmentLeads } = useInvestmentLeads(context)
  const leadFilters = useInvestmentLeadFilters(context)
  const leadStatistics = useInvestmentLeadStatistics(context)

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
  const config: LeadViewConfig<InvestmentLead, InvestmentLeadQueryVariables> = useMemo(
    () => ({
      fetchLeads: fetchInvestmentLeads,
      filterDataHook: () => ({
        owners: leadFilters.owners,
        statuses: leadFilters.statuses,
        ratings: leadFilters.ratings,
        sources: leadFilters.sources,
        salutations: leadFilters.salutations,
        industries: leadFilters.industries
      }),
      createColumns: () => commonLeadColumns() as any,
      descriptors: INVESTMENT_LEAD_DESCRIPTORS,
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
        const vars: InvestmentLeadQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        // Copy filter values directly (Filter-IDs now match Descriptor-Keys)
        // Handle createdAtRange date filter splitting
        if (
          params.selectedFilters.createdAtRange &&
          Array.isArray(params.selectedFilters.createdAtRange) &&
          params.selectedFilters.createdAtRange.length === 2
        ) {
          const [start, end] = params.selectedFilters.createdAtRange
          if (start) vars.createdAtFrom = start
          if (end) vars.createdAtTo = end
        }

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
            key !== 'createdAtRange' &&
            key !== 'sensitive' &&
            params.selectedFilters[key] !== undefined &&
            params.selectedFilters[key] !== null
          ) {
            vars[key as keyof InvestmentLeadQueryVariables] = params.selectedFilters[key]
          }
        })

        // Use column ID directly - buildOrderBy will use descriptors (INVESTMENT_LEAD_DESCRIPTORS)
        // to resolve correct GraphQL paths (e.g., leadStatus.value, ownerEmployee.displayName)
        // Special handling for composite 'lead' column
        if (params.sorting.length > 0) {
          const columnId = params.sorting[0].id
          const direction = params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

          if (columnId === 'lead') {
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
        entityContext: FlowContextName.investmentLeadEntity,
        createContext: FlowContextName.investmentLeadCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/irm/lead-record', { leadId: id }),
      leadStatistics: leadStatisticsData,
      processCompletionEvents: [
        'com.newwork.process.taskCompletion',
        'com.newwork.process.completion',
        'com.newwork.process.continue',
        'com.newwork.process.processCompletion',
        'processCompletion',
        'leadCompletion',
        'leadCompleted'
      ],
      rowActionsContextArray: [FlowContextName.investmentLeadEntity],
      buildRowActionsExternalContextData: (row: { original: InvestmentLead }) => ({
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
        addLead: { key: 'irm:lead.addLead', default: 'Add Lead' }
      }
    }),
    [fetchInvestmentLeads, leadFilters, leadStatisticsData, accessToken]
  )

  return <LeadLayout context={context} config={config} dataTestId="investment-lead-view" />
}

export default LeadView
