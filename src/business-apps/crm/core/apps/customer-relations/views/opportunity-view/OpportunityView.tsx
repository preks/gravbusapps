import React, { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerOpportunities } from '@/common/data/customer/hooks/useCustomerOpportunities'
import { OpportunityLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import { OpportunityStatisticsLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout/components/OpportunityStatisticsLayout'
import { createOpportunityConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/opportunityConfigBuilder'
import { createOpportunityColumns } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'
import type { CustomerOpportunityQueryVariables } from '@/common/data/customer/queries/customerOpportunityQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useCustomerOpportunityFilters } from './hooks/useCustomerOpportunityFilters'
import { useCustomerOpportunityStatistics } from '@/common/data/customer/hooks/useCustomerOpportunityStatistics'
import { CUSTOMER_OPPORTUNITY_DESCRIPTORS } from '@/common/data/customer/types/customerOpportunityTypes'
import {
  insertCustomerColumnsAfter,
  CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS,
  CUSTOMER_OPPORTUNITY_SORTABLE_COLUMNS
} from '@/common/components/customer/view-layouts/opportunity-layout/config/opportunityColumns'

// Separate component to properly use hooks with currency filtering
const CustomerOpportunityStatistics: React.FC<{
  context: BusinessAppContextProps
  selectedCurrency?: string // Full currency ID like "Currency:v1:EUR" or undefined
}> = ({ context, selectedCurrency }) => {
  const opportunityStatistics = useCustomerOpportunityStatistics(context, selectedCurrency)

  if (!opportunityStatistics.trendData) return null

  return (
    <OpportunityStatisticsLayout
      statistics={{
        recentOpportunities: opportunityStatistics.trendData.recentOpportunities,
        totalOpportunities: opportunityStatistics.trendData.totalOpportunities,
        // CRM still uses winRate from hook - mapping to opportunitiesThisQuarter for shared layout compatibility
        opportunitiesThisQuarter: opportunityStatistics.trendData.winRate,
        opportunitiesThisYear: opportunityStatistics.trendData.opportunitiesThisYear,
        isLoading: opportunityStatistics.isLoading,
        error: opportunityStatistics.error,
        refetch: () => void opportunityStatistics.refetch()
      }}
    />
  )
}

export type OpportunityViewProps = BusinessAppContextProps

export const OpportunityView: React.FC<OpportunityViewProps> = context => {
  const { fetchCustomerOpportunities } = useCustomerOpportunities(context)

  const config = useMemo(() => {
    const baseConfig = createOpportunityConfig<CustomerOpportunity, CustomerOpportunityQueryVariables>({
      contextType: 'customer',

      extendQueryVariables: vars => ({
        ...vars
      }),

      fetchOpportunities: async variables => {
        return await fetchCustomerOpportunities(variables)
      },

      filterDataHook: useCustomerOpportunityFilters,

      viewDescriptors: CUSTOMER_OPPORTUNITY_DESCRIPTORS,

      columnMappings: {
        pipeline: 'salesPipeline',
        stage: 'salesPipelineStage'
      },

      flowContexts: {
        entity: FlowContextName.customerOpportunityEntity,
        create: FlowContextName.customerOpportunityCreate
      },

      urlPaths: {
        opportunityRecord: '/platform/crm/opportunity-record',
        accountRecord: '/platform/crm/account-record',
        source: 'customer-relations'
      },

      boardConfig: {
        pipelineCatalog: 'SalesPipeline',
        pipelineStageCatalog: 'SalesPipelineStage',
        opportunityType: 'CustomerOpportunity',
        processName: 'transitionOpportunity',
        processDomain: 'customer-relations'
      },

      fetchBoardOpportunities: fetchCustomerOpportunities,
      extractBoardOpportunities: result => result.opportunities || [],
      extractBoardTotalCount: result => result.total || 0,

      // Use renderStatistics to support currency filtering
      renderStatistics: (selectedCurrency?: string) => (
        <CustomerOpportunityStatistics context={context} selectedCurrency={selectedCurrency} />
      ),

      rowActionsContextArray: [FlowContextName.customerOpportunityEntity],
      buildRowActionsExternalContextData: (row: { original: CustomerOpportunity }) => ({
        opportunityId: row.original.id
      })
    })

    // CRM-specific: Override createColumns to add customer-specific columns
    return {
      ...baseConfig,
      createColumns: (buildAccountUrl: (id: string) => string) => {
        const baseColumns = createOpportunityColumns(buildAccountUrl) as ColumnDef<CustomerOpportunity>[]
        return insertCustomerColumnsAfter(baseColumns, 'amount')
      },
      createSortableColumns: (availableColumnIds?: string[]) => {
        const baseSortable = baseConfig.createSortableColumns(availableColumnIds)
        // Add CRM-specific sortable columns
        const additionalSortable = CUSTOMER_OPPORTUNITY_SORTABLE_COLUMNS.filter(
          col => !availableColumnIds || availableColumnIds.includes(col.id)
        )
        return [...baseSortable, ...additionalSortable]
      }
    } as typeof baseConfig
  }, [context, fetchCustomerOpportunities])

  return (
    <OpportunityLayout
      context={context}
      config={config}
      dataTestId="customer-opportunities-view"
      extendVisibleColumns={CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS}
    />
  )
}

export default OpportunityView
