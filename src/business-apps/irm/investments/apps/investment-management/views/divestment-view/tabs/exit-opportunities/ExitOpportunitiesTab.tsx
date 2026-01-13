import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { OpportunityLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import { createOpportunityConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/opportunityConfigBuilder'
import { createOpportunityColumns } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentOpportunityFilters } from '@/business-apps/irm/core/apps/investment-relations/views/opportunity-view/hooks/useInvestmentOpportunityFilters'
import { ExitOpportunityStatistics } from './components/ExitOpportunityStatistics'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { TrendDownIcon } from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'

export type ExitOpportunitiesTabProps = BusinessAppContextProps

export const ExitOpportunitiesTab: React.FC<ExitOpportunitiesTabProps> = context => {
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)

  const config = useMemo(() => {
    const baseConfig = createOpportunityConfig<
      InvestmentOpportunity & { id: string },
      InvestmentOpportunityQueryVariables
    >({
      contextType: 'investment',

      extendQueryVariables: vars => ({
        ...vars,
        dealType: 'DIVESTMENT_DEAL'
      }),

      fetchOpportunities: async variables => {
        const result = await fetchInvestmentOpportunities(variables)
        return {
          opportunities: result.InvestmentOpportunity.filter(
            (opp): opp is InvestmentOpportunity & { id: string } => !!opp.id
          ),
          total: result.InvestmentOpportunityAggregate.aggregate.count
        }
      },

      filterDataHook: useInvestmentOpportunityFilters,

      columnMappings: {
        pipeline: 'opportunityPipeline',
        stage: 'opportunityPipelineStage'
      },

      flowContexts: {
        entity: FlowContextName.investmentOpportunityEntity,
        create: FlowContextName.investmentOpportunityCreate,
        createContextData: { dealType: 'DIVESTMENT_DEAL' }
      },

      urlPaths: {
        opportunityRecord: '/platform/irm/opportunity-record',
        accountRecord: '/platform/irm/account-record',
        source: 'divestment-view'
      },

      boardConfig: {
        pipelineCatalog: 'InvestmentOpportunityPipeline',
        pipelineStageCatalog: 'InvestmentOpportunityPipelineStage',
        opportunityType: 'InvestmentOpportunity',
        processName: 'transitionInvestmentOpportunity',
        processDomain: 'investment-relations',
        preferForecastedProfit: true
      },

      fetchBoardOpportunities: fetchInvestmentOpportunities,
      extractBoardOpportunities: result => result.InvestmentOpportunity || [],
      extractBoardTotalCount: result => result.InvestmentOpportunityAggregate?.aggregate?.count || 0,
      renderStatistics: (selectedCurrency?: string) => (
        <ExitOpportunityStatistics {...context} currencyCode={selectedCurrency} />
      ),
      rowActionsContextArray: [FlowContextName.investmentOpportunityEntity],
      buildRowActionsExternalContextData: (row: { original: InvestmentOpportunity & { id: string } }) => ({
        opportunityId: row.original.id
      })
    })

    // Override createColumns to add divestment column
    return {
      ...baseConfig,
      createColumns: (buildAccountUrl: (id: string) => string) => {
        const baseColumns = createOpportunityColumns(buildAccountUrl)

        // Add divestment column after account column
        const accountColumnIndex = baseColumns.findIndex(col => col.id === 'account')
        const divestmentColumn = {
          id: 'divestment',
          accessorFn: (row: any) => (row.divestment?.name || '') as string,
          header: 'Divestment',
          size: 200,
          minSize: 180,
          maxSize: 280,
          cell: ({ row }: any) => {
            const opportunity = row.original as InvestmentOpportunity & { id: string }
            if (!opportunity.divestment) {
              return <span className="gba:text-sm gba:text-muted-foreground">No divestment</span>
            }

            const divestment = opportunity.divestment
            const investmentRecordUrl = buildPlatformUrl('/platform/irm/investment-record', {
              investmentId: divestment.id
            })

            return (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  navigateTo(investmentRecordUrl)
                }}
                className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:group gba:bg-transparent gba:border-0 gba:p-0 gba:w-full gba:text-left"
                data-testid={`opportunity-divestment-link-${opportunity.id}`}
              >
                <Avatar className="gba:w-8 gba:h-8 gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:transition-all">
                  <AvatarFallback>
                    <TrendDownIcon className="gba:h-4 gba:w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="gba:min-w-0 gba:flex-1">
                  <div className="gba:font-medium gba:truncate gba:text-sm gba:group-hover:gba:text-primary gba:transition-colors">
                    {divestment.name}
                  </div>
                </div>
              </button>
            )
          }
        } as ColumnDef<InvestmentOpportunity & { id: string }>

        // Insert divestment column after account column, or at the end if account column not found
        if (accountColumnIndex >= 0) {
          return [
            ...baseColumns.slice(0, accountColumnIndex + 1),
            divestmentColumn,
            ...baseColumns.slice(accountColumnIndex + 1)
          ]
        }
        return [...baseColumns, divestmentColumn]
      },
      createSortableColumns: (availableColumnIds?: string[]) => {
        const baseSortable = baseConfig.createSortableColumns(availableColumnIds)
        // Add divestment to sortable columns if it's in available columns
        if (!availableColumnIds || availableColumnIds.includes('divestment')) {
          return [...baseSortable, { id: 'divestment', label: 'Divestment' }]
        }
        return baseSortable
      }
    } as typeof baseConfig
  }, [context, fetchInvestmentOpportunities])

  return (
    <OpportunityLayout
      context={context}
      config={config}
      dataTestId="exit-opportunities-view"
      extendVisibleColumns={['divestment']}
    />
  )
}

export default ExitOpportunitiesTab
