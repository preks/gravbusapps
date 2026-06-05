import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AnalyticsLayout } from '@/common/components/common-relations/view-layouts/analytics-layout/AnalyticsLayout'
import {
  buildAccountsProps,
  buildLeadsProps,
  buildOpportunitiesProps,
  buildContactsProps,
  buildOverviewProps
} from '@/common/components/common-relations/view-layouts/analytics-layout/utils/propBuilders'
import { useAnalyticsState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useAnalyticsState'
import { useCountryAccountsState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useCountryAccountsState'
import { CountryAccountsPanel } from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/CountryAccountsPanel'
import { AccountLayout } from '@/common/components/common-relations/view-layouts/account-layout'
import type { AccountViewConfig } from '@/common/components/common-relations/view-layouts/account-layout'
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { INVESTMENT_ACCOUNT_DESCRIPTORS } from '@/common/data/investment/types/investmentAccountTypes'
import {
  commonAccountColumns,
  commonAccountFilterConfig,
  createProspectiveColumn
} from '@/common/components/common-relations/view-layouts/account-layout/config'
import type { InvestmentAccountQueryVariables } from '@/common/data/investment/queries/investmentAccountQueries'
import type { Account } from '@/common/data/relations/types/accountTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { CountrySelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useCountryAccountsState'
import { useActivityDrillDownState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useActivityDrillDownState'
import { ActivityDrillDownPanel } from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/ActivityDrillDownPanel'
import { ActivityLayout } from '@/common/components/common-relations/view-layouts/activity-layout'
import { buildIrmActivityConfig } from '../activity-view/config/activityConfig'
import { useGetInvestmentActivities } from '@/common/data/investment/hooks/useInvestmentActivities'
import type { DateSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useActivityDrillDownState'
import { useLeadDrillDownState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useLeadDrillDownState'
import { LeadDrillDownPanel } from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/LeadDrillDownPanel'
import { LeadLayout } from '@/common/components/common-relations/view-layouts/lead-layout'
import type { LeadViewConfig } from '@/common/components/common-relations/view-layouts/lead-layout'
import { useInvestmentLeadsList } from '@/common/data/investment/hooks/useInvestmentLeads'
import { INVESTMENT_LEAD_DESCRIPTORS, type InvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'
import {
  commonLeadColumns,
  commonLeadFilterConfig
} from '@/common/components/common-relations/view-layouts/lead-layout/config'
import type { InvestmentLeadQueryVariables } from '@/common/data/investment/queries/investmentLeadQueries'
import type { LeadDrillDownSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useLeadDrillDownState'
import { useStageDrillDownState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useStageDrillDownState'
import type { StageSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useStageDrillDownState'
import { useStatusDrillDownState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useStatusDrillDownState'
import type { StatusBucket } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useStatusDrillDownState'
import { AnalyticsOpportunityDrillDown } from '@/common/components/common-relations/view-layouts/analytics-layout/shared/AnalyticsOpportunityDrillDown'
import type { OpportunityModuleConfig } from '@/common/components/common-relations/view-layouts/analytics-layout/shared/AnalyticsOpportunityDrillDown'
import { AnalyticsContactDrillDown } from '@/common/components/common-relations/view-layouts/analytics-layout/shared/AnalyticsContactDrillDown'
import {
  useInvestmentOpportunitiesList,
  useGetInvestmentOpportunityAggregates
} from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { useInvestmentOpportunityFilters } from '../opportunity-view/hooks/useInvestmentOpportunityFilters'
import { INVESTMENT_OPPORTUNITY_DESCRIPTORS } from '@/common/data/investment/types/investmentOpportunityTypes'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { useInvestmentContactsList } from '@/common/data/investment/hooks/useInvestmentContacts'
import { INVESTMENT_CONTACT_DESCRIPTORS } from '@/common/data/investment/types/investmentContactTypes'
import type { InvestmentContactQueryVariables } from '@/common/data/investment/queries/investmentContactQueries'
import {
  commonContactColumns,
  commonContactFilterConfig
} from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { useAccountGrowthDrillDownState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useAccountGrowthDrillDownState'
import type { GrowthBarSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useAccountGrowthDrillDownState'
import { AccountGrowthDrillDownPanel } from '@/common/components/common-relations/view-layouts/analytics-layout/accounts/widgets/AccountGrowthDrillDownPanel'
import {
  useAccountLifecycleDrillDownState,
  LIFECYCLE_METRIC_LABELS
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useAccountLifecycleDrillDownState'
import type { LifecyclePointSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useAccountLifecycleDrillDownState'
import {
  useLeadLifecycleDrillDownState,
  LEAD_LIFECYCLE_METRIC_LABELS
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useLeadLifecycleDrillDownState'
import type { LeadLifecyclePointSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useLeadLifecycleDrillDownState'
import { useRevenueDrillDownState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useRevenueDrillDownState'
import type { RevenueTrendPointSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useRevenueDrillDownState'
import {
  useLifecycleDrillDownState,
  LIFECYCLE_METRIC_LABELS as OPP_LIFECYCLE_METRIC_LABELS
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useLifecycleDrillDownState'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useOpportunitiesStaticData } from './hooks/useOpportunitiesStaticData'
import { useOpportunitiesOverTime } from './hooks/useOpportunitiesOverTime'
import { useOpportunityTrendData } from './hooks/useOpportunityTrendData'
import { useOpportunitiesByStage } from './hooks/useOpportunitiesByStage'
import { useContactsStaticData } from './hooks/useContactsStaticData'
import { useContactsOverTime } from './hooks/useContactsOverTime'
import { useContactQualityData as useInvestmentContactQualityData } from './hooks/useContactQualityData'
import { useContactsByContactType } from './hooks/useContactsByContactType'
import { useIrmAnalyticsData } from './hooks/useIrmAnalyticsData'
import { useOverviewData } from './hooks/useOverviewData'
import { useLeadsTrendData } from './hooks/useLeadsTrendData'
import { useLeadsStaticData } from './hooks/useLeadsStaticData'
import { useLeadsOverTime } from './hooks/useLeadsOverTime'
import { useAccountsStaticData } from './hooks/useAccountsStaticData'
import { useAccountsOverTime } from './hooks/useAccountsOverTime'
import { useRevenueTrends } from './hooks/useRevenueTrends'
import { useActivityHeatmap } from './hooks/useActivityHeatmap'
import { usePipelines } from './hooks/usePipelines'
import {
  IRM_KPI_LABELS,
  IRM_KPI_VISIBILITY,
  IRM_LEADS_TAB_KPI_LABELS,
  IRM_ACCOUNTS_TAB_KPI_LABELS,
  IRM_OPPORTUNITIES_TAB_KPI_LABELS,
  IRM_CONTACTS_TAB_KPI_LABELS
} from './config/kpiConfig'

import { useOpportunityVelocityData } from './hooks/useOpportunityVelocityData'
import { useOpportunityStatusDistribution } from './hooks/useOpportunityStatusDistribution'

export interface AnalyticsViewProps extends BusinessAppContextProps {
  moduleColor?: string
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ moduleColor = 'default', ...context }) => {
  // Shared state management hook - handles all tab state, filters, and currencies
  const {
    activeTab: activeAnalyticsTab,
    handleTabChange: handleAnalyticsTabChange,
    leadsTimeFilter,
    setLeadsTimeFilter,
    accountsTimeFilter,
    setAccountsTimeFilter,
    oppTimeFilter,
    setOppTimeFilter,
    contactsTimeFilter,
    setContactsTimeFilter,
    revenueTimeFilter,
    setRevenueTimeFilter,
    revenuePipelineId: selectedPipelineId,
    setRevenuePipelineId: setSelectedPipelineId,
    healthPipelineId: overviewStagePipelineId,
    setHealthPipelineId: setOverviewStagePipelineId,
    selectedStagePipelineId,
    setSelectedStagePipelineId,
    kpiCurrency,
    setKpiCurrency,
    revenueCurrency,
    setRevenueCurrency,
    accountsCurrency,
    setAccountsCurrency,
    opportunitiesKpiCurrency,
    setOpportunitiesKpiCurrency,
    topOpportunitiesCurrency,
    setTopOpportunitiesCurrency
  } = useAnalyticsState({
    defaultCurrency: 'EUR',
    defaultTimeFilter: 'quarter'
  })

  // Fetch available currencies
  const { currencies: currencyOptions } = useAvailableCurrencies(context, {
    filters: {
      entity: 'InvestmentOpportunity'
    },
    returnFormat: 'codes'
  })

  const availableCurrencies = currencyOptions as string[]

  // Fetch pipelines from catalog
  const { pipelines } = usePipelines(context.accessToken)
  const effectiveSelectedPipelineId = selectedPipelineId || pipelines[0]?.id
  const effectiveOverviewStagePipelineId = overviewStagePipelineId || pipelines[0]?.id

  // Tab-scoped access tokens. Each entry is the access token only when the
  // corresponding tab is active, otherwise an empty string (disables fetching).
  // Consolidating these here keeps the component body simple and avoids
  // repeating `activeAnalyticsTab === 'X' ? context.accessToken : ''`.
  const tabTokens = useMemo(() => {
    const tok = context.accessToken
    return {
      overview: activeAnalyticsTab === 'overview' ? tok : '',
      leads: activeAnalyticsTab === 'leads' ? tok : '',
      accounts: activeAnalyticsTab === 'accounts' ? tok : '',
      opportunities: activeAnalyticsTab === 'opportunities' ? tok : '',
      contacts: activeAnalyticsTab === 'contacts' ? tok : ''
    }
  }, [activeAnalyticsTab, context.accessToken])

  // Overview tab - Use dedicated hook
  const {
    data: overviewData,
    geographicData,
    isLoading: geographicLoading
  } = useOverviewData(tabTokens.overview, kpiCurrency)

  // Legacy hook - kept for backward compatibility (can be removed once all tabs use dedicated hooks)
  const { isLoading, error, refetch } = useIrmAnalyticsData(
    context,
    activeAnalyticsTab, // NEW: Lazy loading based on active tab
    kpiCurrency
  )

  // )
  const { revenueTrends, isLoading: revenueLoading } = useRevenueTrends(
    tabTokens.overview,
    revenueTimeFilter,
    selectedPipelineId,
    revenueCurrency
  )
  const overviewStageToken = tabTokens.overview && effectiveOverviewStagePipelineId ? tabTokens.overview : ''
  const { data: overviewStageData, isLoading: overviewStageLoading } = useOpportunitiesByStage(
    overviewStageToken,
    effectiveOverviewStagePipelineId,
    true
  )
  const { activityData: activityHeatmap, isLoading: activityLoading } = useActivityHeatmap(tabTokens.overview)
  // Country accounts drill-down state
  const { selectedCountry, handleCountryClick: rawCountryClick, handleCountryClose } = useCountryAccountsState()
  const { fetchInvestmentAccounts } = useInvestmentAccountsList(context)
  const { fetchInvestmentOpportunities } = useInvestmentOpportunitiesList(context)
  const { fetchInvestmentOpportunityAggregates } = useGetInvestmentOpportunityAggregates(context)
  const { fetchInvestmentContacts } = useInvestmentContactsList(context)

  const fetchOpportunitiesForDrillDown = useCallback(
    async (variables: InvestmentOpportunityQueryVariables) => {
      const [result, aggregates] = await Promise.all([
        fetchInvestmentOpportunities(variables),
        fetchInvestmentOpportunityAggregates(variables)
      ])
      return {
        opportunities: result.opportunities,
        total: result.total,
        aggregates
      }
    },
    [fetchInvestmentOpportunities, fetchInvestmentOpportunityAggregates]
  )

  const opportunityModuleConfig: OpportunityModuleConfig = useMemo(
    () => ({
      contextType: 'investment',
      fetchOpportunities: fetchOpportunitiesForDrillDown as any,
      filterHook: useInvestmentOpportunityFilters,
      viewDescriptors: INVESTMENT_OPPORTUNITY_DESCRIPTORS,
      columnMappings: { pipeline: 'opportunityPipeline', stage: 'opportunityPipelineStage' },
      flowContexts: {
        entity: FlowContextName.investmentOpportunityEntity,
        create: FlowContextName.investmentOpportunityCreate,
        createContextData: { dealType: 'INVESTMENT_DEAL' }
      },
      urlPaths: {
        opportunityRecord: '/platform/irm/opportunity-record',
        accountRecord: '/platform/irm/account-record',
        source: 'investment-relations'
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
      extractBoardOpportunities: (result: any) => result.opportunities || [],
      extractBoardTotalCount: (result: any) => result.total || 0,
      rowActionsContextArray: [FlowContextName.investmentOpportunityEntity],
      buildRowActionsExternalContextData: (row: { original: InvestmentOpportunity }) => ({
        opportunityId: row.original.id ?? ''
      })
    }),
    [fetchOpportunitiesForDrillDown, fetchInvestmentOpportunities]
  )

  const contactModuleConfig = useMemo(
    () => ({
      fetchContacts: fetchInvestmentContacts,
      createColumns: () => commonContactColumns(),
      descriptors: INVESTMENT_CONTACT_DESCRIPTORS,
      entityName: 'InvestmentContact',
      columnLabels: {
        contact: 'Contact',
        firstName: 'First Name',
        lastName: 'Last Name',
        fullName: 'Full Name',
        department: 'Department',
        jobPosition: 'Job Position',
        ownerEmployee: 'Owner',
        createdAt: 'Created Date',
        updatedAt: 'Updated Date'
      },
      baseFilterConfig: commonContactFilterConfig,
      buildQueryVariables: (params: any) => {
        const vars: InvestmentContactQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }
        for (const key of Object.keys(params.selectedFilters)) {
          if (params.selectedFilters[key] !== undefined && params.selectedFilters[key] !== null) {
            vars[key as keyof InvestmentContactQueryVariables] = params.selectedFilters[key]
          }
        }
        if (params.sorting.length > 0) {
          const { id, desc } = params.sorting[0]
          const dir = desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
          vars.orderBy =
            id === 'contact'
              ? [
                  { field: 'firstName', direction: dir },
                  { field: 'lastName', direction: dir }
                ]
              : [{ field: id, direction: dir }]
        } else {
          vars.orderBy = [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
        }
        return vars
      },
      flowContexts: {
        entityContext: FlowContextName.investmentContactEntity,
        createContext: FlowContextName.investmentContactCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/irm/contact-record', { contactId: id }),
      rowActionsContextArray: [FlowContextName.investmentContactEntity],
      buildRowActionsExternalContextData: (row: { original: any }) => ({ contactId: row.original.id ?? '' }),
      translations: {
        allContacts: { key: 'common:allContacts', default: 'All Contacts' },
        searchContacts: { key: 'common:searchContacts', default: 'Search contacts...' },
        filterContacts: { key: 'common:filterContacts', default: 'Filter Contacts' },
        filterContactsDescription: {
          key: 'common:filterContactsDescription',
          default: 'Apply filters to narrow down the contact list'
        },
        addContact: { key: 'common:addContact', default: 'Add Contact' }
      }
    }),
    [fetchInvestmentContacts]
  )

  // Stage opportunities drill-down state
  const { selectedStage, handleStageClick: rawStageClick, handleStageClose } = useStageDrillDownState()

  // Opportunities tab — stage drill-down state (separate from overview tab)
  const {
    selectedStage: selectedOppTabStage,
    handleStageClick: handleOppTabStageClick,
    handleStageClose: handleOppTabStageClose
  } = useStageDrillDownState()

  // Account growth chart drill-down state
  const { selectedGrowthBar, handleGrowthBarClick, handleGrowthBarClose } = useAccountGrowthDrillDownState()

  // Account lifecycle chart drill-down state
  const { selectedLifecyclePoint, handleLifecyclePointClick, handleLifecyclePointClose } =
    useAccountLifecycleDrillDownState()

  // Opportunity status distribution drill-down state
  const {
    selectedStatus,
    handleStatusClick: handleOppStatusClick,
    handleStatusClose: handleOppStatusClose
  } = useStatusDrillDownState()

  // Mutual exclusion: clicking a country closes the stage panel, and vice versa
  const handleCountryClick = useCallback(
    (country: string, countryId: string) => {
      handleStageClose()
      rawCountryClick(country, countryId)
    },
    [handleStageClose, rawCountryClick]
  )

  const handleStageClick = useCallback(
    (stage: string, stageRef: string, pipelineId?: string) => {
      handleCountryClose()
      rawStageClick(stage, stageRef, pipelineId)
    },
    [handleCountryClose, rawStageClick]
  )

  // Lead drill-down state (source / status pie chart)
  const { selectedLeadFilter, handleSourceClick, handleStatusClick, handleLeadFilterClose } = useLeadDrillDownState()
  const { fetchInvestmentLeads } = useInvestmentLeadsList(context)

  // Lead lifecycle chart drill-down state
  const { selectedLeadLifecyclePoint, handleLeadLifecyclePointClick, handleLeadLifecyclePointClose } =
    useLeadLifecycleDrillDownState()

  // Revenue trend chart drill-down state
  const {
    selectedRevenueTrendPoint,
    handleRevenueTrendPointClick,
    handleRevenueTrendPointClose,
    updateRevenuePipelineAndCurrency
  } = useRevenueDrillDownState()

  useEffect(() => {
    if (selectedRevenueTrendPoint) {
      updateRevenuePipelineAndCurrency(effectiveSelectedPipelineId, revenueCurrency)
    }
  }, [effectiveSelectedPipelineId, revenueCurrency])

  const {
    selectedLifecyclePoint: selectedOppLifecyclePoint,
    handleLifecyclePointClick: handleOppLifecyclePointClick,
    handleLifecyclePointClose: handleOppLifecyclePointClose,
    updateLifecyclePipeline: updateOppLifecyclePipeline
  } = useLifecycleDrillDownState()

  useEffect(() => {
    if (selectedOppLifecyclePoint) {
      updateOppLifecyclePipeline(selectedPipelineId)
    }
  }, [selectedPipelineId])

  const {
    selectedLifecyclePoint: selectedFlowTrendPoint,
    handleLifecyclePointClick: handleFlowTrendPointClick,
    handleLifecyclePointClose: handleFlowTrendPointClose
  } = useLifecycleDrillDownState()

  const countryAccountsConfig: AccountViewConfig<Account, InvestmentAccountQueryVariables> = useMemo(
    () => ({
      fetchAccounts: async (variables: InvestmentAccountQueryVariables) => {
        const result = await fetchInvestmentAccounts(variables)
        return {
          accounts: result.InvestmentAccount || [],
          total: result.InvestmentAccountAggregate?.aggregate?.count || 0
        }
      },
      entityName: 'InvestmentAccount',
      createColumns: () =>
        commonAccountColumns.map(col => (col.id === 'prospective' ? createProspectiveColumn('irm') : col)),
      descriptors: INVESTMENT_ACCOUNT_DESCRIPTORS,
      columnLabels: {
        name: 'Account Name',
        accountPriority: 'Priority',
        addresses: 'Location',
        industryClass: 'Industry',
        legalForm: 'Legal Form',
        companySize: 'Size',
        accountAnnualRevenueBand: 'Revenue Band',
        ownerEmployee: 'Owner',
        createdAt: 'Created Date',
        updatedAt: 'Updated Date'
      },
      baseFilterConfig: commonAccountFilterConfig,
      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
      }) => {
        const vars: InvestmentAccountQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined,
          ...params.selectedFilters
        }
        if (params.sorting.length > 0) {
          vars.orderBy = [
            {
              field: params.sorting[0].id as any,
              direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
            }
          ]
        } else {
          vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
        }
        return vars
      },
      flowContexts: {
        entityContext: FlowContextName.investmentAccountEntity
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/irm/account-record', { accountId: id }),
      variant: 'investment',
      rowActionsContextArray: [FlowContextName.investmentAccountEntity],
      buildRowActionsExternalContextData: (row: { original: Account }) => ({ accountId: row.original.id || '' }),
      translations: {
        allAccounts: { key: 'common:allAccounts', default: 'All Accounts' },
        searchAccounts: { key: 'common:searchAccounts', default: 'Search accounts...' },
        filterAccounts: { key: 'common:filterAccounts', default: 'Filter Accounts' },
        filterAccountsDescription: {
          key: 'common:filterAccountsDescription',
          default: 'Apply filters to narrow down the account list'
        },
        addAccount: { key: 'irm:account.addAccount', default: 'Add Account' }
      }
    }),
    [fetchInvestmentAccounts]
  )

  const renderCountryAccounts = useCallback(
    (selection: CountrySelection) => (
      <CountryAccountsPanel country={selection.country} onClose={handleCountryClose} moduleColor={moduleColor}>
        <AccountLayout
          key={selection.countryId}
          context={context}
          config={countryAccountsConfig}
          dataTestId="country-investment-account-view"
          initialFilters={{ countryIds: [selection.countryId] }}
        />
      </CountryAccountsPanel>
    ),
    [countryAccountsConfig, context, handleCountryClose, moduleColor]
  )

  const renderAccountGrowthDrillDown = useCallback(
    (selection: GrowthBarSelection) => {
      const monthStart = selection.date
      const startDate = new Date(monthStart)
      const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

      return (
        <AccountGrowthDrillDownPanel selection={selection} onClose={handleGrowthBarClose} moduleColor={moduleColor}>
          <AccountLayout
            key={`${selection.date}-${selection.metric}`}
            context={context}
            config={countryAccountsConfig}
            dataTestId="growth-investment-account-view"
            initialFilters={{ createdAtRange: [monthStart, monthEnd] }}
          />
        </AccountGrowthDrillDownPanel>
      )
    },
    [countryAccountsConfig, context, handleGrowthBarClose, moduleColor]
  )

  const renderLifecycleDrillDown = useCallback(
    (selection: LifecyclePointSelection) => (
      <AccountGrowthDrillDownPanel
        selection={{ month: selection.label, date: selection.date, metric: selection.metric as any }}
        onClose={handleLifecyclePointClose}
        moduleColor={moduleColor}
        titleOverride={`${LIFECYCLE_METRIC_LABELS[selection.metric]} — ${selection.label}`}
      >
        <AccountLayout
          key={`${selection.date}-${selection.metric}`}
          context={context}
          config={countryAccountsConfig}
          dataTestId="lifecycle-investment-account-view"
          initialFilters={{ createdAtRange: [selection.date, selection.endDate] }}
        />
      </AccountGrowthDrillDownPanel>
    ),
    [countryAccountsConfig, context, handleLifecyclePointClose, moduleColor]
  )

  // Activity drill-down state
  const { selectedDate, handleDateClick, handleDateClose } = useActivityDrillDownState()
  const { fetchInvestmentActivities } = useGetInvestmentActivities(context)

  const activityDrillDownConfig = useMemo(
    () => ({
      ...buildIrmActivityConfig(fetchInvestmentActivities),
      flowContexts: { entityContext: FlowContextName.investmentActivityEntity }
    }),
    [fetchInvestmentActivities]
  )

  const renderActivityPanel = useCallback(
    (selection: DateSelection) => (
      <ActivityDrillDownPanel date={selection.date} onClose={handleDateClose} moduleColor={moduleColor}>
        <ActivityLayout
          key={selection.fullDate}
          context={context}
          config={activityDrillDownConfig}
          dataTestId="analytics-irm-activity-drill-down"
          initialFilters={{
            createdAtRange: [`${selection.fullDate}T00:00:00.000Z`, `${selection.fullDate}T23:59:59.999Z`]
          }}
        />
      </ActivityDrillDownPanel>
    ),
    [activityDrillDownConfig, context, handleDateClose, moduleColor]
  )

  const renderLeadPanel = useCallback(
    (selection: LeadDrillDownSelection) => {
      const filterKey = selection.filterType === 'source' ? 'leadSourceIds' : 'leadStatusIds'
      const initialFilters: Record<string, any> = { [filterKey]: [selection.ref] }

      // Pre-seed the selected option directly into the base filter config so
      // the filter chip resolves the label immediately — before the async
      // useFilterGroups options finish loading. buildFilterConfigFromDescriptors
      // keeps the base config's options unchanged until filterData loads,
      // then replaces them with the full loaded set.
      const preseededFilterConfig = {
        ...commonLeadFilterConfig,
        groups: commonLeadFilterConfig.groups.map(group => ({
          ...group,
          filters: group.filters.map(filter => {
            if (filter.field === filterKey && filter.config && 'options' in filter.config) {
              return {
                ...filter,
                config: { ...filter.config, options: [{ id: selection.ref, label: selection.label }] }
              }
            }
            return filter
          })
        }))
      }

      const drillDownConfig: LeadViewConfig<InvestmentLead, InvestmentLeadQueryVariables> = {
        fetchLeads: async (variables: InvestmentLeadQueryVariables) => {
          const result = await fetchInvestmentLeads(variables)
          return { leads: result.leads, total: result.total }
        },
        createColumns: () => commonLeadColumns() as any,
        descriptors: INVESTMENT_LEAD_DESCRIPTORS,
        entityName: 'InvestmentLead',
        baseFilterConfig: preseededFilterConfig,
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
          Object.assign(vars, params.selectedFilters)
          if (params.sorting.length > 0) {
            vars.orderBy = [
              {
                field: params.sorting[0].id as any,
                direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
              }
            ]
          }
          return vars
        },
        flowContexts: { entityContext: FlowContextName.investmentLeadEntity },
        buildRecordUrl: (id: string) => buildPlatformUrl('/platform/irm/lead-record', { leadId: id }),
        rowActionsContextArray: [FlowContextName.investmentLeadEntity],
        buildRowActionsExternalContextData: (row: { original: InvestmentLead }) => ({ leadId: row.original.id }),
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
      }

      return (
        <LeadDrillDownPanel
          label={selection.label}
          filterType={selection.filterType}
          onClose={handleLeadFilterClose}
          moduleColor={moduleColor}
        >
          <LeadLayout
            key={`${selection.filterType}-${selection.ref}`}
            context={context}
            config={drillDownConfig}
            initialFilters={initialFilters}
            dataTestId="analytics-irm-lead-drill-down"
          />
        </LeadDrillDownPanel>
      )
    },
    [fetchInvestmentLeads, context, handleLeadFilterClose, moduleColor]
  )

  const renderLeadLifecycleDrillDown = useCallback(
    (selection: LeadLifecyclePointSelection) => (
      <LeadDrillDownPanel
        label={`${LEAD_LIFECYCLE_METRIC_LABELS[selection.metric]} — ${selection.label}`}
        filterType="status"
        onClose={handleLeadLifecyclePointClose}
        moduleColor={moduleColor}
      >
        <LeadLayout
          key={`${selection.date}-${selection.metric}`}
          context={context}
          config={{
            fetchLeads: async (variables: InvestmentLeadQueryVariables) => {
              const result = await fetchInvestmentLeads(variables)
              return { leads: result.leads, total: result.total }
            },
            createColumns: () => commonLeadColumns() as any,
            descriptors: INVESTMENT_LEAD_DESCRIPTORS,
            entityName: 'InvestmentLead',
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
              Object.assign(vars, params.selectedFilters)
              if (params.sorting.length > 0) {
                vars.orderBy = [
                  {
                    field: params.sorting[0].id as any,
                    direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
                  }
                ]
              }
              return vars
            },
            flowContexts: { entityContext: FlowContextName.investmentLeadEntity },
            buildRecordUrl: (id: string) => buildPlatformUrl('/platform/irm/lead-record', { leadId: id }),
            rowActionsContextArray: [FlowContextName.investmentLeadEntity],
            buildRowActionsExternalContextData: (row: { original: InvestmentLead }) => ({ leadId: row.original.id }),
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
          }}
          initialFilters={{ createdAtRange: [selection.date, selection.endDate] }}
          dataTestId="lifecycle-irm-lead-view"
        />
      </LeadDrillDownPanel>
    ),
    [fetchInvestmentLeads, context, handleLeadLifecyclePointClose, moduleColor]
  )

  const renderStageOpportunities = useCallback(
    (selection: StageSelection) => (
      <AnalyticsOpportunityDrillDown
        context={context}
        opportunityModuleConfig={opportunityModuleConfig}
        selection={selection}
        onClose={handleStageClose}
        moduleColor={moduleColor}
        openStatusId="InvestmentOpportunityStatus:v1:OPEN"
        dataTestId="analytics-irm-stage-opportunities"
      />
    ),
    [context, opportunityModuleConfig, handleStageClose, moduleColor]
  )

  const renderRevenueDrillDown = useMemo(() => {
    if (!selectedRevenueTrendPoint) return null
    const selection: RevenueTrendPointSelection = selectedRevenueTrendPoint
    const title = `Opportunities — ${selection.label}`
    return (
      <AnalyticsOpportunityDrillDown
        context={context}
        opportunityModuleConfig={opportunityModuleConfig}
        selection={{ stage: '', stageRef: '' }}
        onClose={handleRevenueTrendPointClose}
        moduleColor={moduleColor}
        openStatusId="InvestmentOpportunityStatus:v1:OPEN"
        openPipelineOnly={false}
        pipelineId={selection.pipelineId}
        additionalInitialFilters={{
          createdAtRange: [selection.startDate, selection.endDate],
          ...(selection.currencyCode && { currencyCode: selection.currencyCode })
        }}
        defaultCurrency={selection.currencyCode}
        cacheKey={`${selection.startDate}-${selection.endDate}-${selection.pipelineId || 'all'}-${selection.currencyCode || ''}`}
        titleOverride={title}
        dataTestId="analytics-irm-stage-opportunities"
      />
    )
  }, [selectedRevenueTrendPoint, handleRevenueTrendPointClose, context, opportunityModuleConfig, moduleColor])

  const renderOppLifecycleDrillDown = useMemo(() => {
    if (!selectedOppLifecyclePoint) return null
    const metricLabel = OPP_LIFECYCLE_METRIC_LABELS[selectedOppLifecyclePoint.metric]
    const title = `${metricLabel} — ${selectedOppLifecyclePoint.label}`
    return (
      <AnalyticsOpportunityDrillDown
        context={context}
        opportunityModuleConfig={opportunityModuleConfig}
        selection={{ stage: '', stageRef: '' }}
        onClose={handleOppLifecyclePointClose}
        moduleColor={moduleColor}
        openStatusId="InvestmentOpportunityStatus:v1:OPEN"
        openPipelineOnly={false}
        pipelineId={selectedOppLifecyclePoint.pipelineId}
        additionalInitialFilters={{
          createdAtRange: [selectedOppLifecyclePoint.startDate, selectedOppLifecyclePoint.endDate]
        }}
        statusBucket={selectedOppLifecyclePoint.metric === 'opportunitiesWon' ? 'won' : undefined}
        cacheKey={`lifecycle-${selectedOppLifecyclePoint.startDate}-${selectedOppLifecyclePoint.endDate}-${selectedOppLifecyclePoint.metric}-${selectedOppLifecyclePoint.pipelineId || 'all'}`}
        titleOverride={title}
        dataTestId="analytics-irm-stage-opportunities"
      />
    )
  }, [selectedOppLifecyclePoint, handleOppLifecyclePointClose, context, opportunityModuleConfig, moduleColor])

  const renderFlowTrendDrillDown = useMemo(() => {
    if (!selectedFlowTrendPoint) return null
    const metricLabel = OPP_LIFECYCLE_METRIC_LABELS[selectedFlowTrendPoint.metric]
    const title = `${metricLabel} — ${selectedFlowTrendPoint.label}`
    return (
      <AnalyticsOpportunityDrillDown
        context={context}
        opportunityModuleConfig={opportunityModuleConfig}
        selection={{ stage: '', stageRef: '' }}
        onClose={handleFlowTrendPointClose}
        moduleColor={moduleColor}
        openStatusId="InvestmentOpportunityStatus:v1:OPEN"
        openPipelineOnly={false}
        additionalInitialFilters={{
          createdAtRange: [selectedFlowTrendPoint.startDate, selectedFlowTrendPoint.endDate]
        }}
        statusBucket={selectedFlowTrendPoint.metric === 'opportunitiesWon' ? 'won' : undefined}
        cacheKey={`flow-${selectedFlowTrendPoint.startDate}-${selectedFlowTrendPoint.endDate}-${selectedFlowTrendPoint.metric}`}
        titleOverride={title}
        dataTestId="analytics-irm-stage-opportunities"
      />
    )
  }, [selectedFlowTrendPoint, handleFlowTrendPointClose, context, opportunityModuleConfig, moduleColor])

  // Leads tab hooks - Use aggregate-based hooks instead of full-record query
  const { data: leadsStaticData, isLoading: leadsStaticLoading } = useLeadsStaticData(tabTokens.leads)
  const { trendData: leadsTrendData, isLoading: leadsTrendLoading } = useLeadsTrendData(tabTokens.leads, 'month')
  const { leadsOverTime, isLoading: leadsOverTimeLoading } = useLeadsOverTime(
    tabTokens.leads,
    leadsTimeFilter,
    leadsStaticData?.statusCatalogCodes // Pass status codes to avoid duplicate catalog fetch
  )

  // Accounts tab hooks - Use aggregate-based hooks (lazy loaded like CRM)
  const { data: accountsStaticData, isLoading: accountsStaticLoading } = useAccountsStaticData(tabTokens.accounts)
  const { accountsOverTime, isLoading: accountsLifecycleLoading } = useAccountsOverTime(
    tabTokens.accounts,
    accountsTimeFilter
  )

  // Opportunities tab hooks - Use aggregate-based hooks like CRM
  const { data: opportunitiesStaticData, isLoading: opportunitiesStaticLoading } = useOpportunitiesStaticData(
    tabTokens.opportunities,
    opportunitiesKpiCurrency
  )
  const { data: oppLifecycleData, isLoading: oppLifecycleLoading } = useOpportunitiesOverTime(
    tabTokens.opportunities,
    oppTimeFilter,
    selectedPipelineId
  )
  const { trendData: oppTrendData } = useOpportunityTrendData(
    tabTokens.opportunities,
    'quarter',
    undefined,
    opportunitiesKpiCurrency
  )
  const { data: oppFlowData, isLoading: oppFlowLoading } = useOpportunityVelocityData(tabTokens.opportunities)
  const { data: oppStatusDistributionData, isLoading: oppStatusDistributionLoading } = useOpportunityStatusDistribution(
    tabTokens.opportunities
  )
  const { data: oppStageData, isLoading: oppStageLoading } = useOpportunitiesByStage(
    tabTokens.opportunities,
    selectedStagePipelineId
  )

  // Contacts tab hooks - using new generic hooks
  const { data: contactsStaticData, isLoading: contactsStaticLoading } = useContactsStaticData(tabTokens.contacts)

  const { contactsOverTime: contactsLifecycleData, isLoading: contactsLifecycleLoading } = useContactsOverTime({
    accessToken: tabTokens.contacts,
    timeFilter: contactsTimeFilter
  })

  const { data: contactQuality, isLoading: contactQualityLoading } = useInvestmentContactQualityData(tabTokens.contacts)
  const { data: contactsByContactType, isLoading: contactsByContactTypeLoading } = useContactsByContactType(
    tabTokens.contacts
  )

  // Initialize pipeline selectors to the first pipeline if not set
  useEffect(() => {
    if (pipelines.length > 0 && !selectedStagePipelineId) {
      setSelectedStagePipelineId(pipelines[0].id)
    }
    if (pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id)
    }
    if (pipelines.length > 0 && !overviewStagePipelineId) {
      setOverviewStagePipelineId(pipelines[0].id)
    }
  }, [pipelines, selectedStagePipelineId, selectedPipelineId, overviewStagePipelineId])

  const [selectedContactType, setSelectedContactType] = useState<string | null>(null)

  const {
    selectedLifecyclePoint: selectedContactLifecyclePoint,
    handleLifecyclePointClick: handleContactLifecyclePointClick,
    handleLifecyclePointClose: handleContactLifecyclePointClose
  } = useLifecycleDrillDownState()

  const renderContactLifecycleDrillDown = useMemo(() => {
    if (!selectedContactLifecyclePoint) return null
    const title = `Contacts Created — ${selectedContactLifecyclePoint.label}`
    return (
      <AnalyticsContactDrillDown
        context={context}
        config={contactModuleConfig}
        onClose={handleContactLifecyclePointClose}
        moduleColor={moduleColor}
        additionalInitialFilters={{
          createdAtRange: [selectedContactLifecyclePoint.startDate, selectedContactLifecyclePoint.endDate]
        }}
        cacheKey={`contact-lifecycle-${selectedContactLifecyclePoint.startDate}-${selectedContactLifecyclePoint.endDate}`}
        titleOverride={title}
        dataTestId="analytics-irm-contact-type-drill-down"
      />
    )
  }, [selectedContactLifecyclePoint, handleContactLifecyclePointClose, context, contactModuleConfig, moduleColor])

  const handleContactTypeClick = useCallback((type: string) => {
    setSelectedContactType(prev => (prev === type ? null : type))
  }, [])

  const renderContactTypeDrillDown = useCallback(
    (type: string) => (
      <AnalyticsContactDrillDown
        context={context}
        config={contactModuleConfig}
        contactType={type}
        onClose={() => setSelectedContactType(null)}
        moduleColor={moduleColor}
        dataTestId="analytics-irm-contact-type-drill-down"
      />
    ),
    [context, contactModuleConfig, moduleColor]
  )

  if (isLoading) {
    return (
      <div
        data-testid="irm-analytics-loading"
        className="gba:flex gba:items-center gba:justify-center gba:min-h-screen"
      >
        <div className="gba:text-center">
          <Spinner size="lg" />
          <div className="gba:mt-4 gba:text-gray-600 gba:text-lg">Loading IRM Analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        data-testid="irm-analytics-error"
        className="gba:min-h-screen gba:p-6 gba:flex gba:items-center gba:justify-center"
      >
        <div className="gba:max-w-lg gba:w-full">
          <Alert variant="destructive" className="gba:shadow-lg">
            <AlertTitle>Error Loading Analytics</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button size="sm" onClick={refetch} variant="default">
              Retry
            </Button>
          </Alert>
        </div>
      </div>
    )
  }

  // Prepare Overview Props - Uses shared builder with IRM-specific config
  const transformedTrendData = overviewData?.overviewTrendData || null

  const overviewPropsBase = buildOverviewProps(
    {
      overviewData,
      kpiTrendData: transformedTrendData,
      pipelines,
      revenuePipelineId: effectiveSelectedPipelineId,
      onRevenuePipelineChange: setSelectedPipelineId,
      revenueTimeFilter,
      onRevenueTimeFilterChange: setRevenueTimeFilter,
      revenueTrends: revenueTrends || [],
      revenueLoading,
      openPipelineByStage: overviewStageData || [],
      openPipelineByStageLoading: overviewStageLoading,
      stagePipelineId: effectiveOverviewStagePipelineId,
      onStagePipelineChange: setOverviewStagePipelineId,
      geographicData: geographicData || [],
      geographicLoading,
      activityHeatmap: activityHeatmap || [],
      activityLoading
    },
    {
      moduleColor,
      kpiLabels: IRM_KPI_LABELS,
      kpiVisibility: IRM_KPI_VISIBILITY,
      kpiCurrency,
      onKpiCurrencyChange: setKpiCurrency,
      revenueCurrency,
      onRevenueCurrencyChange: setRevenueCurrency,
      availableCurrencies
    }
  )

  const overviewProps = {
    ...overviewPropsBase,
    selectedCountry,
    onCountryClick: handleCountryClick,
    renderCountryAccounts,
    selectedStage,
    onStageClick: handleStageClick,
    renderStageOpportunities,
    selectedDate,
    onDateClick: handleDateClick,
    renderActivityPanel,
    onRevenuePointClick: handleRevenueTrendPointClick,
    renderRevenueDrillDown
  }

  // Prepare leads props - Use shared builder with IRM-specific config
  const leadsProps = {
    ...buildLeadsProps(
      {
        leadsStaticData,
        leadsTrendData,
        leadsTrendLoading,
        leadsStaticLoading,
        leadsOverTime: leadsOverTime || [],
        leadsOverTimeLoading,
        leadsTimeFilter,
        onLeadsTimeFilterChange: setLeadsTimeFilter
      },
      {
        title: 'Investment Leads Analytics',
        moduleColor,
        kpiLabels: IRM_LEADS_TAB_KPI_LABELS
      }
    ),
    selectedLeadFilter,
    onSourceClick: handleSourceClick,
    onStatusClick: handleStatusClick,
    renderLeadPanel,
    onLifecyclePointClick: handleLeadLifecyclePointClick,
    selectedLeadLifecyclePoint,
    renderLeadLifecycleDrillDown
  }

  // Prepare accounts props - Always define to show tab
  const accountsProps = {
    ...buildAccountsProps(
      {
        accountsStaticData,
        accountsStaticLoading,
        accountsOverTime: accountsOverTime || [],
        accountsOverTimeLoading: accountsLifecycleLoading,
        accountsTimeFilter,
        onAccountsTimeFilterChange: setAccountsTimeFilter,
        accountsCurrency,
        onAccountsCurrencyChange: setAccountsCurrency,
        availableCurrencies
      },
      {
        title: 'Accounts Analytics',
        kpiLabels: IRM_ACCOUNTS_TAB_KPI_LABELS
      }
    ),
    selectedGrowthBar,
    onGrowthBarClick: handleGrowthBarClick,
    renderAccountGrowthDrillDown,
    onLifecyclePointClick: handleLifecyclePointClick,
    selectedLifecyclePoint,
    renderLifecycleDrillDown
  }

  // Prepare opportunities props - Use aggregate-based data like CRM
  const opportunitiesProps = {
    ...buildOpportunitiesProps(
      {
        opportunitiesStaticData,
        opportunitiesStaticLoading,
        oppTrendData, // IRM uses dedicated trend hook
        oppLifecycleData: oppLifecycleData || [],
        oppLifecycleLoading,
        oppTimeFilter,
        onOppTimeFilterChange: setOppTimeFilter,
        pipelines,
        selectedPipelineId,
        onPipelineChange: (id: string) => setSelectedPipelineId(id === 'all' ? undefined : id),
        oppStageData: oppStageData || [],
        oppStageLoading,
        selectedStagePipelineId,
        onStagePipelineChange: (id: string | undefined) => setSelectedStagePipelineId(id),
        topOpportunities: [],
        flowData: oppFlowData || null,
        flowLoading: oppFlowLoading,
        statusDistributionData: oppStatusDistributionData || [],
        statusDistributionLoading: oppStatusDistributionLoading,
        kpiCurrency: opportunitiesKpiCurrency,
        onKpiCurrencyChange: setOpportunitiesKpiCurrency,
        topOpportunitiesCurrency,
        onTopOpportunitiesCurrencyChange: setTopOpportunitiesCurrency,
        availableCurrencies
      },
      {
        title: 'Opportunities Analytics',
        showTopOpportunities: false,
        useTrendData: true, // IRM uses dedicated trend hook
        kpiLabels: IRM_OPPORTUNITIES_TAB_KPI_LABELS
      }
    ),
    selectedOppTabStage,
    onOpportunitiesStageClick: handleOppTabStageClick,
    renderOpportunitiesStageDrillDown: (sel: { stage: string; stageRef: string }) => (
      <AnalyticsOpportunityDrillDown
        key={`${sel.stageRef}-${selectedStagePipelineId || 'all'}`}
        context={context}
        opportunityModuleConfig={opportunityModuleConfig}
        selection={sel}
        onClose={handleOppTabStageClose}
        moduleColor={moduleColor}
        openStatusId="InvestmentOpportunityStatus:v1:OPEN"
        openPipelineOnly={false}
        pipelineId={selectedStagePipelineId}
        dataTestId="analytics-irm-stage-opportunities"
      />
    ),
    selectedStatus,
    onStatusClick: (status: StatusBucket) => {
      handleOppTabStageClose()
      handleOppStatusClick(status)
    },
    renderStatusDrillDown: (sel: { status: StatusBucket }) => (
      <AnalyticsOpportunityDrillDown
        key={sel.status}
        context={context}
        opportunityModuleConfig={opportunityModuleConfig}
        selection={{ stage: sel.status, stageRef: '' }}
        onClose={handleOppStatusClose}
        moduleColor={moduleColor}
        openStatusId="InvestmentOpportunityStatus:v1:OPEN"
        openPipelineOnly={false}
        statusBucket={sel.status.toLowerCase() as 'open' | 'won' | 'lost'}
        dataTestId="analytics-irm-stage-opportunities"
      />
    ),
    onLifecyclePointClick: handleOppLifecyclePointClick,
    renderLifecycleDrillDown: renderOppLifecycleDrillDown,
    onFlowTrendPointClick: handleFlowTrendPointClick,
    renderFlowTrendDrillDown
  }

  // Prepare contacts props - Always define to show tab
  const contactsProps = {
    ...buildContactsProps(
      {
        contactsStaticData,
        contactsStaticLoading,
        contactsOverTime: contactsLifecycleData || [],
        contactsOverTimeLoading: contactsLifecycleLoading,
        contactsTimeFilter,
        onContactsTimeFilterChange: setContactsTimeFilter,
        contactQuality,
        contactQualityLoading,
        contactsByContactType,
        contactsByContactTypeLoading,
        onContactLifecyclePointClick: (label: string, startDate: string, endDate: string) =>
          handleContactLifecyclePointClick(label, startDate, endDate, 'opportunitiesCreated'),
        renderContactLifecycleDrillDown
      },
      {
        title: 'Contacts Analytics',
        module: 'irm',
        kpiLabels: IRM_CONTACTS_TAB_KPI_LABELS
      }
    ),
    selectedContactType,
    onContactTypeClick: handleContactTypeClick,
    renderContactTypeDrillDown
  }

  return (
    <div data-testid="irm-analytics" className="gba:h-full gba:p-6">
      <AnalyticsLayout
        defaultTab={activeAnalyticsTab}
        onTabChange={handleAnalyticsTabChange}
        moduleColor={moduleColor}
        overviewProps={overviewProps}
        leadsProps={leadsProps}
        accountsProps={accountsProps}
        opportunitiesProps={opportunitiesProps}
        contactsProps={contactsProps}
      />
    </div>
  )
}

export default AnalyticsView
