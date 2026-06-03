import React, { useMemo, useState, useCallback, useRef } from 'react'
import { AiButton, Button, useTranslation } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import icpScoringI18n from '@/common/components/icp-scoring/_i18n'
import { IcpScoringSelectionDialog } from '@/business-apps/crm/core/features/icp-scoring'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'
import { useCustomerOpportunities } from '@/common/data/customer/hooks/useCustomerOpportunities'
import { OpportunityLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import { OpportunityStatisticsLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout/components/OpportunityStatisticsLayout'
import type { OpportunityStatisticsData } from '@/common/components/common-relations/view-layouts/opportunity-layout/components/OpportunityStatisticsLayout'
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
  const { accessToken } = context
  const { t } = useTranslation(icpScoringI18n)
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('crm:customer-opportunity-preferences:v1')
  const { fetchCustomerOpportunities } = useCustomerOpportunities(context)
  const [isBulkScoringOpen, setIsBulkScoringOpen] = useState(false)
  const [scoreRefreshKey, setScoreRefreshKey] = useState(0)

  // State to trigger statistics refresh (re-mounts CustomerOpportunityStatistics via key prop)
  const [statisticsRefreshKey, setStatisticsRefreshKey] = useState(0)

  // Refs so that renderStatistics in config always reads the latest values without
  // causing config to rebuild (which would cascade to listQueryVariables → loadListData → query).
  const statisticsRefreshKeyRef = useRef(statisticsRefreshKey)
  statisticsRefreshKeyRef.current = statisticsRefreshKey
  const contextRef = useRef(context)
  contextRef.current = context

  // Create a refetch callback for statistics
  const refetchStatistics = useCallback(() => {
    setStatisticsRefreshKey(prev => prev + 1)
  }, [])

  // Statistics data with refetch callback — stable because refetchStatistics is stable
  const opportunityStatisticsData: OpportunityStatisticsData | undefined = useMemo(
    () => ({
      recentOpportunities: { current: 0, previous: 0, change: 0, changePercent: 0, isPositive: false },
      totalOpportunities: { current: 0, previous: 0, change: 0, changePercent: 0, isPositive: false },
      opportunitiesThisQuarter: { current: 0, previous: 0, change: 0, changePercent: 0, isPositive: false },
      opportunitiesThisYear: { current: 0, previous: 0, change: 0, changePercent: 0, isPositive: false },
      isLoading: false,
      error: null,
      refetch: refetchStatistics
    }),
    [refetchStatistics]
  )

  // Config — context and statisticsRefreshKey are intentionally excluded from deps.
  // They are accessed via refs so that statistics refreshes and context reference changes
  // do not recreate config, which would cascade into new listQueryVariables / loadListData
  // references and re-fire GetOpportunities.
  const config = useMemo(() => {
    const baseConfig = createOpportunityConfig<CustomerOpportunity, CustomerOpportunityQueryVariables>({
      contextType: 'customer',

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

      opportunityStatistics: opportunityStatisticsData,

      // Reads latest context/key from refs so config stays stable
      renderStatistics: (selectedCurrency?: string) => (
        <CustomerOpportunityStatistics
          key={statisticsRefreshKeyRef.current}
          context={contextRef.current}
          selectedCurrency={selectedCurrency}
        />
      ),

      rowActionsContextArray: [FlowContextName.customerOpportunityEntity],
      buildRowActionsExternalContextData: (row: { original: CustomerOpportunity }) => ({
        opportunityId: row.original.id
      })
    })

    // CRM-specific: Override createColumns to add customer-specific columns
    return {
      ...baseConfig,
      createColumns: () =>
        insertCustomerColumnsAfter(createOpportunityColumns() as ColumnDef<CustomerOpportunity>[], 'amount'),
      createSortableColumns: (availableColumnIds?: string[]) => {
        const baseSortable = baseConfig.createSortableColumns(availableColumnIds)
        const additionalSortable = CUSTOMER_OPPORTUNITY_SORTABLE_COLUMNS.filter(
          col => !availableColumnIds || availableColumnIds.includes(col.id)
        )
        return [...baseSortable, ...additionalSortable]
      }
    } as typeof baseConfig
  }, [fetchCustomerOpportunities, opportunityStatisticsData, t])

  const handleBulkScored = () => {
    setScoreRefreshKey(previous => previous + 1)
    refetchStatistics()
  }

  return (
    <>
      <OpportunityLayout
        key={scoreRefreshKey}
        context={context}
        config={config}
        dataTestId="customer-opportunities-view"
        extendVisibleColumns={CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS}
        enableExport
        exportFilenamePrefix="opportunities"
        initialFilters={initialFilters}
        onFilterChange={saveFilters}
        initialSorting={initialSorting ?? undefined}
        onSortingChange={saveSorting}
        initialVisibleColumns={initialVisibleColumns ?? undefined}
        onVisibleColumnsChange={saveVisibleColumns}
        customPrimaryAction={
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <AppAction
              contextsArray={[FlowContextName.customerOpportunityCreate]}
              accessToken={accessToken}
              data-testid="add-opportunity-action"
              emptyStateBehavior="hide"
            >
              <Button size="sm" variant="default" data-testid="add-opportunity-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('crm.opportunity.addOpportunity', 'Add Opportunity')}
              </Button>
            </AppAction>
            <AiButton
              size="sm"
              type="button"
              onClick={() => setIsBulkScoringOpen(true)}
              data-testid="customer-opportunity-view-open-bulk-scoring"
            >
              {t('icp-scoring-opportunity-title')}
            </AiButton>
          </div>
        }
      />

      <IcpScoringSelectionDialog
        entityType="opportunity"
        open={isBulkScoringOpen}
        onOpenChange={setIsBulkScoringOpen}
        accessToken={accessToken}
        onScored={handleBulkScored}
      />
    </>
  )
}

export default OpportunityView
