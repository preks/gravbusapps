import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentLeads } from '@/common/data/investment/hooks/useInvestmentLeads'
import { LeadLayout, type LeadViewConfig } from '@/common/components/common-relations/view-layouts/lead-layout'
import type { InvestmentLead } from '@/common/data/investment/types'
import type { InvestmentLeadQueryVariables } from '@/common/data/investment/queries/investmentLeadQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  createLeadColumns,
  createLeadSortableColumns
} from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { leadFilterConfig } from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { useLeadFilterOptions } from '../lead-view/hooks/useLeadFilterOptions'
import { LeadStatistics } from '../lead-view/components/LeadStatistics'
import {
  applyBasicFilters,
  applyDateFilter
} from '@/common/components/common-relations/view-layouts/lead-layout/utils/queryHelpers'

export type LeadViewProps = BusinessAppContextProps

export const LeadView: React.FC<LeadViewProps> = context => {
  const { fetchInvestmentLeads } = useGetInvestmentLeads(context)

  const config: LeadViewConfig<InvestmentLead, InvestmentLeadQueryVariables> = useMemo(
    () => ({
      contextType: 'investment',

      fetchLeads: async (variables: InvestmentLeadQueryVariables) => {
        const result = await fetchInvestmentLeads(variables)
        return {
          leads: result.InvestmentLead || [],
          total: result.InvestmentLeadAggregate?.aggregate?.count || 0
        }
      },

      filterDataHook: useLeadFilterOptions,

      createColumns: createLeadColumns as any,
      createSortableColumns: createLeadSortableColumns,

      mapColumnToGraphQLField: (columnId: string): string => {
        // Investment Relations supports more nested sorting than Customer Relations
        const mapping: Record<string, string> = {
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'email',
          leadStatus: 'leadStatus', // Investment API supports nested orderBy
          leadRating: 'leadRating',
          leadSource: 'leadSource',
          ownerEmployee: 'ownerEmployee',
          locality: 'locality',
          createdAt: 'createdAt',
          updatedAt: 'updatedAt'
        }
        return mapping[columnId] || 'createdAt'
      },

      baseFilterConfig: leadFilterConfig,

      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
        mapColumnToGraphQLField: (columnId: string) => string
      }) => {
        const vars: InvestmentLeadQueryVariables = {
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
        entityContext: FlowContextName.investmentLeadEntity,
        createContext: FlowContextName.investmentLeadCreate
      },

      renderStatistics: ({ context: ctx }) => {
        return <LeadStatistics {...ctx} />
      },

      processCompletionEvents: [
        'com.newwork.process.taskCompletion',
        'com.newwork.process.completion',
        'com.newwork.process.continue',
        'com.newwork.process.processCompletion',
        'processCompletion',
        'leadCompletion',
        'leadCompleted'
      ]
    }),
    [context, fetchInvestmentLeads]
  )

  return <LeadLayout context={context} config={config} dataTestId="investment-lead-view" />
}

export default LeadView
