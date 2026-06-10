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
import { stripRecordScopeFilterKeys } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/layoutHelpers'

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

export type OpportunityViewProps = BusinessAppContextProps & {
  /** When set (account/contact record tab), list is scoped to this account. */
  accountId?: string
  /** When set (account/contact record tab), list is scoped to this contact. */
  contactId?: string
}

export const OpportunityView: React.FC<OpportunityViewProps> = props => {
  const { accessToken, accountId, contactId } = props
  const isRecordScoped = Boolean(accountId || contactId)

  const preferencesStorageKey = useMemo(() => {
    if (accountId) {
      return `crm:customer-opportunity-preferences:account:${accountId}`
    }
    if (contactId) {
      return `crm:customer-opportunity-preferences:contact:${contactId}`
    }
    return 'crm:customer-opportunity-preferences:v1'
  }, [accountId, contactId])

  const recordScopeFilters = useMemo(() => {
    if (accountId) {
      return { accountIds: [accountId] }
    }
    if (contactId) {
      return { contactIds: [contactId] }
    }
    return {}
  }, [accountId, contactId])

  const { t } = useTranslation(icpScoringI18n)
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage(preferencesStorageKey)

  const recordListInitialFilters = useMemo(
    () => (isRecordScoped ? stripRecordScopeFilterKeys(initialFilters) : initialFilters),
    [initialFilters, isRecordScoped]
  )

  const handleFilterChange = useCallback(
    (filters: Record<string, unknown>) => {
      saveFilters(isRecordScoped ? stripRecordScopeFilterKeys(filters) : filters)
    },
    [saveFilters, isRecordScoped]
  )
  const { fetchCustomerOpportunities } = useCustomerOpportunities(props)
  const [isBulkScoringOpen, setIsBulkScoringOpen] = useState(false)
  const [scoreRefreshKey, setScoreRefreshKey] = useState(0)

  // State to trigger statistics refresh (re-mounts CustomerOpportunityStatistics via key prop)
  const [statisticsRefreshKey, setStatisticsRefreshKey] = useState(0)

  // Refs so that renderStatistics in config always reads the latest values without
  // causing config to rebuild (which would cascade to listQueryVariables → loadListData → query).
  const statisticsRefreshKeyRef = useRef(statisticsRefreshKey)
  statisticsRefreshKeyRef.current = statisticsRefreshKey
  const contextRef = useRef(props)
  contextRef.current = props

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
        create: FlowContextName.customerOpportunityCreate,
        ...(accountId || contactId
          ? {
              createContextData: {
                ...(accountId ? { accountId } : {}),
                ...(contactId ? { contactId } : {})
              }
            }
          : {})
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

      opportunityStatistics: isRecordScoped ? undefined : opportunityStatisticsData,

      // Reads latest context/key from refs so config stays stable
      renderStatistics: isRecordScoped
        ? undefined
        : (selectedCurrency?: string) => (
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
  }, [fetchCustomerOpportunities, opportunityStatisticsData, isRecordScoped, accountId, contactId])

  const handleBulkScored = () => {
    setScoreRefreshKey(previous => previous + 1)
    refetchStatistics()
  }

  return (
    <>
      <OpportunityLayout
        key={scoreRefreshKey}
        context={props}
        config={config}
        dataTestId={isRecordScoped ? 'customer-record-opportunities-view' : 'customer-opportunities-view'}
        extendVisibleColumns={CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS}
        enableExport
        exportFilenamePrefix="opportunities"
        initialFilters={recordListInitialFilters}
        scopedQueryFilters={isRecordScoped ? recordScopeFilters : undefined}
        hideFilters={isRecordScoped}
        onFilterChange={handleFilterChange}
        initialSorting={initialSorting ?? undefined}
        onSortingChange={saveSorting}
        initialVisibleColumns={initialVisibleColumns ?? undefined}
        onVisibleColumnsChange={saveVisibleColumns}
        hideBoard={isRecordScoped}
        customPrimaryAction={
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <AppAction
              contextsArray={[FlowContextName.customerOpportunityCreate]}
              accessToken={accessToken}
              externalContextData={{
                ...(accountId ? { accountId } : {}),
                ...(contactId ? { contactId } : {})
              }}
              data-testid="add-opportunity-action"
              emptyStateBehavior="hide"
            >
              <Button size="sm" variant="default" data-testid="add-opportunity-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('crm.opportunity.addOpportunity', 'Add Opportunity')}
              </Button>
            </AppAction>
            {!isRecordScoped ? (
              <AiButton
                size="sm"
                type="button"
                onClick={() => setIsBulkScoringOpen(true)}
                data-testid="customer-opportunity-view-open-bulk-scoring"
              >
                {t('icp-scoring-opportunity-title')}
              </AiButton>
            ) : null}
          </div>
        }
      />

      {!isRecordScoped ? (
        <IcpScoringSelectionDialog
          entityType="opportunity"
          open={isBulkScoringOpen}
          onOpenChange={setIsBulkScoringOpen}
          accessToken={accessToken}
          onScored={handleBulkScored}
        />
      ) : null}
    </>
  )
}

export default OpportunityView
