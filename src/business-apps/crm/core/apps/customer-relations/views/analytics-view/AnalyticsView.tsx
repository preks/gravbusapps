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
import { useCustomerAccounts } from '@/common/data/customer/hooks/useCustomerAccounts'
import { CUSTOMER_ACCOUNT_DESCRIPTORS } from '@/common/data/customer/types/customerAccountTypes'
import {
  commonAccountColumns,
  commonAccountFilterConfig,
  createProspectiveColumn
} from '@/common/components/common-relations/view-layouts/account-layout/config'
import type { CustomerAccountQueryVariables } from '@/common/data/customer/queries/customerAccountQueries'
import type { Account } from '@/common/data/relations/types/accountTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import type { CountrySelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useCountryAccountsState'
import { useActivityDrillDownState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useActivityDrillDownState'
import { ActivityDrillDownPanel } from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/ActivityDrillDownPanel'
import { ActivityLayout } from '@/common/components/common-relations/view-layouts/activity-layout'
import { buildCrmActivityConfig } from '../activity-view/config/activityConfig'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import type { DateSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useActivityDrillDownState'
import { useLeadDrillDownState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useLeadDrillDownState'
import { LeadDrillDownPanel } from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/LeadDrillDownPanel'
import { LeadLayout } from '@/common/components/common-relations/view-layouts/lead-layout'
import type { LeadViewConfig } from '@/common/components/common-relations/view-layouts/lead-layout'
import { useCustomerLeads } from '@/common/data/customer/hooks/useCustomerLeads'
import { CUSTOMER_LEAD_DESCRIPTORS } from '@/common/data/customer/types/customerLeadTypes'
import {
  commonLeadColumns,
  commonLeadFilterConfig
} from '@/common/components/common-relations/view-layouts/lead-layout/config'
import type { CustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import type { CustomerLeadQueryVariables } from '@/common/data/customer/queries/customerLeadQueries'
import type { LeadDrillDownSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useLeadDrillDownState'
import { useStageDrillDownState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useStageDrillDownState'
import type { StageSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useStageDrillDownState'
import { useStatusDrillDownState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useStatusDrillDownState'
import type { StatusBucket } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useStatusDrillDownState'
import { AnalyticsOpportunityDrillDown } from '@/common/components/common-relations/view-layouts/analytics-layout/shared/AnalyticsOpportunityDrillDown'
import type { OpportunityModuleConfig } from '@/common/components/common-relations/view-layouts/analytics-layout/shared/AnalyticsOpportunityDrillDown'
import { AnalyticsContactDrillDown } from '@/common/components/common-relations/view-layouts/analytics-layout/shared/AnalyticsContactDrillDown'
import { useCustomerOpportunities } from '@/common/data/customer/hooks/useCustomerOpportunities'
import { useCustomerOpportunityFilters } from '../opportunity-view/hooks/useCustomerOpportunityFilters'
import { CUSTOMER_OPPORTUNITY_DESCRIPTORS } from '@/common/data/customer/types/customerOpportunityTypes'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'
import { createOpportunityColumns } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import {
  insertCustomerColumnsAfter,
  CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS,
  CUSTOMER_OPPORTUNITY_SORTABLE_COLUMNS
} from '@/common/components/customer/view-layouts/opportunity-layout/config/opportunityColumns'
import type { ColumnDef } from '@tanstack/react-table'
import { useCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import { CUSTOMER_CONTACT_DESCRIPTORS } from '@/common/data/customer/types/customerContactTypes'
import type { CustomerContactQueryVariables } from '@/common/data/customer/queries/customerContactQueries'
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
import { useOpportunitiesOverTime } from './hooks/useOpportunitiesOverTime'
import { useOpportunitiesByStage } from './hooks/useOpportunitiesByStage'
import { useContactsOverTime } from './hooks/useContactsOverTime'
import { useContactsStaticData } from './hooks/useContactsStaticData'
import { useContactQualityData } from './hooks/useContactQualityData'
import { useContactsByContactType } from './hooks/useContactsByContactType'
import { useCrmAnalyticsData } from './hooks/useCrmAnalyticsData'
import { useOverviewData } from './hooks/useOverviewData'
import { useRevenueTrends } from './hooks/useRevenueTrends'
import { useActivityHeatmap } from './hooks/useActivityHeatmap'
import { usePipelines } from './hooks/usePipelines'
import { useOpportunityVelocityData } from './hooks/useOpportunityVelocityData'
import { useOpportunityStatusDistribution } from './hooks/useOpportunityStatusDistribution'
import { useLeadsTrendData } from './hooks/useLeadsTrendData'
import { useLeadsOverTime } from './hooks/useLeadsOverTime'
import { useLeadsStaticData } from './hooks/useLeadsStaticData'
import { useAccountsStaticData } from './hooks/useAccountsStaticData'
import { useAccountsOverTime } from './hooks/useAccountsOverTime'
import { useOpportunitiesStaticData } from './hooks/useOpportunitiesStaticData'
import { useTopOpportunities } from './hooks/useTopOpportunities'

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
    revenuePipelineId,
    setRevenuePipelineId,
    healthPipelineId: overviewStagePipelineId,
    setHealthPipelineId: setOverviewStagePipelineId,
    oppLifecyclePipelineId,
    setOppLifecyclePipelineId,
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
      entity: 'Opportunity'
    },
    returnFormat: 'codes'
  })

  const availableCurrencies = currencyOptions as string[]

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
      contacts: activeAnalyticsTab === 'contacts' ? tok : '',
      overviewOrOpportunities: activeAnalyticsTab === 'overview' || activeAnalyticsTab === 'opportunities' ? tok : ''
    }
  }, [activeAnalyticsTab, context.accessToken])

  // Fetch available pipelines for filtering (for Overview and Opportunities tabs)
  const { pipelines } = usePipelines(tabTokens.overviewOrOpportunities)
  const effectiveOverviewStagePipelineId = overviewStagePipelineId || pipelines?.[0]?.id

  // Overview tab - Use dedicated hook
  const {
    data: overviewData,
    geographicData,
    isLoading: geographicLoading
  } = useOverviewData(tabTokens.overview, kpiCurrency)

  // Legacy hook - kept for backward compatibility (can be removed once all tabs use dedicated hooks)
  const { isLoading, error, refetch } = useCrmAnalyticsData(
    context,
    activeAnalyticsTab, // Only fetch data for active tab (Overview only)
    kpiCurrency
  )

  // Overview tab data - get trend data from useOverviewData hook
  const kpiTrendData = tabTokens.overview ? overviewData?.overviewTrendData || null : null
  const { revenueTrends, isLoading: revenueLoading } = useRevenueTrends(
    tabTokens.overview,
    revenueTimeFilter,
    revenuePipelineId,
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
  // Use the function-only hooks so entering the Analytics tab does not trigger any
  // list queries. The imperative fetchers below only run when a chart drill-down is opened.
  const { fetchCustomerAccounts } = useCustomerAccounts(context)
  const { fetchCustomerOpportunities } = useCustomerOpportunities(context)
  const { fetchCustomerContacts } = useCustomerContacts(context)

  const opportunityModuleConfig: OpportunityModuleConfig = useMemo(
    () => ({
      contextType: 'customer',
      fetchOpportunities: async (variables: any) => fetchCustomerOpportunities(variables) as any,
      filterHook: useCustomerOpportunityFilters,
      viewDescriptors: CUSTOMER_OPPORTUNITY_DESCRIPTORS,
      columnMappings: { pipeline: 'salesPipeline', stage: 'salesPipelineStage' },
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
      extractBoardOpportunities: (result: any) => result.opportunities || [],
      extractBoardTotalCount: (result: any) => result.total || 0,
      rowActionsContextArray: [FlowContextName.customerOpportunityEntity],
      buildRowActionsExternalContextData: (row: { original: CustomerOpportunity }) => ({
        opportunityId: row.original.id ?? ''
      }),
      extendedColumnIds: CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS,
      createColumns: () =>
        insertCustomerColumnsAfter(createOpportunityColumns() as ColumnDef<CustomerOpportunity>[], 'amount'),
      additionalSortableColumns: CUSTOMER_OPPORTUNITY_SORTABLE_COLUMNS
    }),
    [fetchCustomerOpportunities]
  )

  const contactModuleConfig = useMemo(
    () => ({
      fetchContacts: fetchCustomerContacts,
      createColumns: () => commonContactColumns(),
      descriptors: CUSTOMER_CONTACT_DESCRIPTORS,
      entityName: 'Contact',
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
        const trimmedSearch = params.searchTerm.trim()
        const vars: CustomerContactQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: trimmedSearch || undefined
        }
        // Scope free-text search to the visible table columns to keep the generated _or small.
        if (trimmedSearch && params.visibleColumns && params.visibleColumns.length > 0) {
          vars.searchDescriptorKeys = params.visibleColumns
        }
        for (const key of Object.keys(params.selectedFilters)) {
          if (params.selectedFilters[key] !== undefined && params.selectedFilters[key] !== null) {
            vars[key as keyof CustomerContactQueryVariables] = params.selectedFilters[key]
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
        entityContext: FlowContextName.customerContactEntity,
        createContext: FlowContextName.customerContactCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/contact-record', { contactId: id }),
      rowActionsContextArray: [FlowContextName.customerContactEntity],
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
    [fetchCustomerContacts]
  )

  // Lead drill-down state (source / status pie chart)
  const { selectedLeadFilter, handleSourceClick, handleStatusClick, handleLeadFilterClose } = useLeadDrillDownState()
  const { fetchCustomerLeads } = useCustomerLeads(context)

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
      updateRevenuePipelineAndCurrency(revenuePipelineId, revenueCurrency)
    }
  }, [revenuePipelineId, revenueCurrency])

  const {
    selectedLifecyclePoint: selectedOppLifecyclePoint,
    handleLifecyclePointClick: handleOppLifecyclePointClick,
    handleLifecyclePointClose: handleOppLifecyclePointClose,
    updateLifecyclePipeline: updateOppLifecyclePipeline
  } = useLifecycleDrillDownState()

  useEffect(() => {
    if (selectedOppLifecyclePoint) {
      updateOppLifecyclePipeline(oppLifecyclePipelineId)
    }
  }, [oppLifecyclePipelineId])

  const {
    selectedLifecyclePoint: selectedFlowTrendPoint,
    handleLifecyclePointClick: handleFlowTrendPointClick,
    handleLifecyclePointClose: handleFlowTrendPointClose
  } = useLifecycleDrillDownState()

  const countryAccountsConfig: AccountViewConfig<Account, CustomerAccountQueryVariables> = useMemo(
    () => ({
      fetchAccounts: fetchCustomerAccounts,
      entityName: 'Account',
      createColumns: () =>
        commonAccountColumns.map(col => (col.id === 'prospective' ? createProspectiveColumn('crm') : col)),
      descriptors: CUSTOMER_ACCOUNT_DESCRIPTORS,
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
        visibleColumns?: string[]
      }) => {
        const trimmedSearch = params.searchTerm.trim()
        const vars: CustomerAccountQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: trimmedSearch || undefined,
          ...params.selectedFilters
        }
        // Scope free-text search to the visible table columns to keep the generated _or small.
        if (trimmedSearch && params.visibleColumns && params.visibleColumns.length > 0) {
          vars.searchDescriptorKeys = params.visibleColumns
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
        entityContext: FlowContextName.customerAccountEntity
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/account-record', { accountId: id }),
      variant: 'customer',
      rowActionsContextArray: [FlowContextName.customerAccountEntity],
      buildRowActionsExternalContextData: (row: { original: Account }) => ({ accountId: row.original.id || '' }),
      translations: {
        allAccounts: { key: 'common:allAccounts', default: 'All Accounts' },
        searchAccounts: { key: 'common:searchAccounts', default: 'Search accounts...' },
        filterAccounts: { key: 'common:filterAccounts', default: 'Filter Accounts' },
        filterAccountsDescription: {
          key: 'common:filterAccountsDescription',
          default: 'Apply filters to narrow down the account list'
        },
        addAccount: { key: 'crm:account.addAccount', default: 'Add Account' }
      }
    }),
    [fetchCustomerAccounts]
  )

  const renderCountryAccounts = useCallback(
    (selection: CountrySelection) => (
      <CountryAccountsPanel country={selection.country} onClose={handleCountryClose} moduleColor={moduleColor}>
        <AccountLayout
          key={selection.countryId}
          context={context}
          config={countryAccountsConfig}
          dataTestId="country-customer-account-view"
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
            dataTestId="growth-customer-account-view"
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
          dataTestId="lifecycle-customer-account-view"
          initialFilters={{ createdAtRange: [selection.date, selection.endDate] }}
        />
      </AccountGrowthDrillDownPanel>
    ),
    [countryAccountsConfig, context, handleLifecyclePointClose, moduleColor]
  )

  // Activity drill-down state
  const { selectedDate, handleDateClick, handleDateClose } = useActivityDrillDownState()
  const { fetchCustomerActivities } = useCustomerActivities(context)

  const activityDrillDownConfig = useMemo(
    () => ({
      ...buildCrmActivityConfig(fetchCustomerActivities),
      flowContexts: { entityContext: FlowContextName.customerActivityEntity }
    }),
    [fetchCustomerActivities]
  )

  const renderActivityPanel = useCallback(
    (selection: DateSelection) => (
      <ActivityDrillDownPanel date={selection.date} onClose={handleDateClose} moduleColor={moduleColor}>
        <ActivityLayout
          key={selection.fullDate}
          context={context}
          config={activityDrillDownConfig}
          dataTestId="analytics-crm-activity-drill-down"
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

      const drillDownConfig: LeadViewConfig<CustomerLead, CustomerLeadQueryVariables> = {
        fetchLeads: fetchCustomerLeads,
        createColumns: () => commonLeadColumns() as any,
        descriptors: CUSTOMER_LEAD_DESCRIPTORS,
        entityName: 'Lead',
        baseFilterConfig: preseededFilterConfig,
        buildQueryVariables: (params: {
          pagination: { pageIndex: number; pageSize: number }
          searchTerm: string
          selectedFilters: Record<string, any>
          sorting: Array<{ id: string; desc: boolean }>
          visibleColumns?: string[]
        }) => {
          const trimmedSearch = params.searchTerm.trim()
          const vars: CustomerLeadQueryVariables = {
            limit: params.pagination.pageSize,
            offset: params.pagination.pageIndex * params.pagination.pageSize,
            search: trimmedSearch || undefined
          }
          Object.assign(vars, params.selectedFilters)
          // Scope free-text search to the visible table columns to keep the generated _or small.
          if (trimmedSearch && params.visibleColumns && params.visibleColumns.length > 0) {
            vars.searchDescriptorKeys = params.visibleColumns
          }
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
        flowContexts: { entityContext: FlowContextName.customerLeadEntity },
        buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/lead-record', { leadId: id }),
        rowActionsContextArray: [FlowContextName.customerLeadEntity],
        buildRowActionsExternalContextData: (row: { original: CustomerLead }) => ({ leadId: row.original.id }),
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
            dataTestId="analytics-crm-lead-drill-down"
          />
        </LeadDrillDownPanel>
      )
    },
    [fetchCustomerLeads, context, handleLeadFilterClose, moduleColor]
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
            fetchLeads: fetchCustomerLeads,
            createColumns: () => commonLeadColumns() as any,
            descriptors: CUSTOMER_LEAD_DESCRIPTORS,
            entityName: 'Lead',
            baseFilterConfig: commonLeadFilterConfig,
            buildQueryVariables: (params: {
              pagination: { pageIndex: number; pageSize: number }
              searchTerm: string
              selectedFilters: Record<string, any>
              sorting: Array<{ id: string; desc: boolean }>
              visibleColumns?: string[]
            }) => {
              const trimmedSearch = params.searchTerm.trim()
              const vars: CustomerLeadQueryVariables = {
                limit: params.pagination.pageSize,
                offset: params.pagination.pageIndex * params.pagination.pageSize,
                search: trimmedSearch || undefined
              }
              Object.assign(vars, params.selectedFilters)
              // Scope free-text search to the visible table columns to keep the generated _or small.
              if (trimmedSearch && params.visibleColumns && params.visibleColumns.length > 0) {
                vars.searchDescriptorKeys = params.visibleColumns
              }
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
            flowContexts: { entityContext: FlowContextName.customerLeadEntity },
            buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/lead-record', { leadId: id }),
            rowActionsContextArray: [FlowContextName.customerLeadEntity],
            buildRowActionsExternalContextData: (row: { original: CustomerLead }) => ({ leadId: row.original.id }),
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
          }}
          initialFilters={{ createdAtRange: [selection.date, selection.endDate] }}
          dataTestId="lifecycle-crm-lead-view"
        />
      </LeadDrillDownPanel>
    ),
    [fetchCustomerLeads, context, handleLeadLifecyclePointClose, moduleColor]
  )

  const renderStageOpportunities = useCallback(
    (selection: StageSelection) => (
      <AnalyticsOpportunityDrillDown
        context={context}
        opportunityModuleConfig={opportunityModuleConfig}
        selection={selection}
        onClose={handleStageClose}
        moduleColor={moduleColor}
        openStatusId="SalesOpportunityStatus:v1:OPEN"
        dataTestId="analytics-crm-stage-opportunities"
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
        openStatusId="SalesOpportunityStatus:v1:OPEN"
        openPipelineOnly={false}
        pipelineId={selection.pipelineId}
        additionalInitialFilters={{
          createdAtRange: [selection.startDate, selection.endDate],
          ...(selection.currencyCode && { currencyCode: selection.currencyCode })
        }}
        defaultCurrency={selection.currencyCode}
        cacheKey={`${selection.startDate}-${selection.endDate}-${selection.pipelineId || 'all'}-${selection.currencyCode || ''}`}
        titleOverride={title}
        dataTestId="analytics-crm-stage-opportunities"
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
        openStatusId="SalesOpportunityStatus:v1:OPEN"
        openPipelineOnly={false}
        pipelineId={selectedOppLifecyclePoint.pipelineId}
        additionalInitialFilters={{
          createdAtRange: [selectedOppLifecyclePoint.startDate, selectedOppLifecyclePoint.endDate]
        }}
        statusBucket={selectedOppLifecyclePoint.metric === 'opportunitiesWon' ? 'won' : undefined}
        cacheKey={`lifecycle-${selectedOppLifecyclePoint.startDate}-${selectedOppLifecyclePoint.endDate}-${selectedOppLifecyclePoint.metric}-${selectedOppLifecyclePoint.pipelineId || 'all'}`}
        titleOverride={title}
        dataTestId="analytics-crm-stage-opportunities"
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
        openStatusId="SalesOpportunityStatus:v1:OPEN"
        openPipelineOnly={false}
        additionalInitialFilters={{
          createdAtRange: [selectedFlowTrendPoint.startDate, selectedFlowTrendPoint.endDate]
        }}
        statusBucket={selectedFlowTrendPoint.metric === 'opportunitiesWon' ? 'won' : undefined}
        cacheKey={`flow-${selectedFlowTrendPoint.startDate}-${selectedFlowTrendPoint.endDate}-${selectedFlowTrendPoint.metric}`}
        titleOverride={title}
        dataTestId="analytics-crm-stage-opportunities"
      />
    )
  }, [selectedFlowTrendPoint, handleFlowTrendPointClose, context, opportunityModuleConfig, moduleColor])

  // Leads tab data
  // KPI trend data uses fixed 'month' period (current month vs last month) - independent of chart filter
  const { trendData: leadsTrendData, isLoading: leadsTrendLoading } = useLeadsTrendData(tabTokens.leads, 'month')
  // Combined static leads data (source, rating, status, velocity) - single query
  const { data: leadsStaticData, isLoading: leadsStaticLoading } = useLeadsStaticData(tabTokens.leads)

  // Accounts static data (KPIs + trends) - single query
  const { data: accountsStaticData, isLoading: accountsStaticLoading } = useAccountsStaticData(tabTokens.accounts)

  // Accounts lifecycle chart data - dynamic time filter
  const { accountsOverTime: accountsLifecycleData, isLoading: accountsLifecycleLoading } = useAccountsOverTime(
    tabTokens.accounts,
    accountsTimeFilter
  )

  // Lifecycle chart data uses dynamic time filter selected by user
  // Pass statusCatalogCodes from leadsStaticData to avoid duplicate catalog fetch
  const { leadsOverTime: leadsLifecycleData, isLoading: leadsLifecycleLoading } = useLeadsOverTime(
    tabTokens.leads,
    leadsTimeFilter,
    leadsStaticData?.statusCatalogCodes
  )

  // Accounts tab data (no additional hooks needed - data comes from useCrmAnalyticsData)

  // Opportunities tab data
  // Static KPIs with 30-day trends
  const { data: opportunitiesStaticData, isLoading: opportunitiesStaticLoading } = useOpportunitiesStaticData(
    tabTokens.opportunities,
    opportunitiesKpiCurrency
  )
  const { data: oppFlowData, isLoading: oppFlowLoading } = useOpportunityVelocityData(tabTokens.opportunities)
  const { data: oppStatusDistributionData, isLoading: oppStatusDistributionLoading } = useOpportunityStatusDistribution(
    tabTokens.opportunities
  )
  const { data: oppLifecycleData, isLoading: oppLifecycleLoading } = useOpportunitiesOverTime(
    tabTokens.opportunities,
    oppTimeFilter,
    oppLifecyclePipelineId
  )
  const { data: oppStageData } = useOpportunitiesByStage(tabTokens.opportunities, selectedStagePipelineId)
  const { data: topOpportunitiesData, isLoading: topOpportunitiesLoading } = useTopOpportunities(
    tabTokens.opportunities,
    topOpportunitiesCurrency
  )

  // Contacts tab static data (KPIs)
  const { data: contactsStaticData, isLoading: contactsStaticLoading } = useContactsStaticData(tabTokens.contacts)

  // Contacts lifecycle chart data - dynamic time filter
  const { contactsOverTime: contactsLifecycleData, isLoading: contactsLifecycleLoading } = useContactsOverTime(
    tabTokens.contacts,
    contactsTimeFilter
  )

  const { data: contactQuality, isLoading: contactQualityLoading } = useContactQualityData(tabTokens.contacts)
  const { data: contactsByContactType, isLoading: contactsByContactTypeLoading } = useContactsByContactType(
    tabTokens.contacts
  )

  // Initialize pipeline selectors to the first pipeline when pipelines are loaded.
  useEffect(() => {
    if (pipelines && pipelines.length > 0 && !selectedStagePipelineId) {
      setSelectedStagePipelineId(pipelines[0].id)
    }
    if (pipelines && pipelines.length > 0 && !overviewStagePipelineId) {
      setOverviewStagePipelineId(pipelines[0].id)
    }
  }, [pipelines, selectedStagePipelineId, overviewStagePipelineId])

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
        dataTestId="analytics-crm-contact-type-drill-down"
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
        dataTestId="analytics-crm-contact-type-drill-down"
      />
    ),
    [context, contactModuleConfig, moduleColor]
  )

  if (isLoading) {
    return (
      <div
        data-testid="crm-analytics-loading"
        className="gba:flex gba:items-center gba:justify-center gba:min-h-screen"
      >
        <div className="gba:text-center">
          <Spinner size="lg" />
          <div className="gba:mt-4 gba:text-gray-600 gba:text-lg">Loading CRM Analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        data-testid="crm-analytics-error"
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

  // Prepare Overview Props - Uses shared builder
  const overviewPropsBase = buildOverviewProps(
    {
      overviewData,
      kpiTrendData,
      pipelines: pipelines || [],
      revenuePipelineId,
      onRevenuePipelineChange: setRevenuePipelineId,
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

  const leadsProps = {
    ...buildLeadsProps(
      {
        leadsStaticData,
        leadsTrendData,
        leadsTrendLoading,
        leadsStaticLoading,
        leadsOverTime: leadsLifecycleData || [],
        leadsOverTimeLoading: leadsLifecycleLoading,
        leadsTimeFilter,
        onLeadsTimeFilterChange: setLeadsTimeFilter
      },
      {
        title: 'Leads Analytics'
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

  // Prepare Accounts Props - Always show tab
  const accountsProps = {
    ...buildAccountsProps(
      {
        accountsStaticData,
        accountsStaticLoading,
        accountsOverTime: accountsLifecycleData || [],
        accountsOverTimeLoading: accountsLifecycleLoading,
        accountsTimeFilter,
        onAccountsTimeFilterChange: setAccountsTimeFilter,
        accountsCurrency,
        onAccountsCurrencyChange: setAccountsCurrency,
        availableCurrencies
      },
      {
        title: 'Accounts Analytics'
      }
    ),
    selectedGrowthBar,
    onGrowthBarClick: handleGrowthBarClick,
    renderAccountGrowthDrillDown,
    onLifecyclePointClick: handleLifecyclePointClick,
    selectedLifecyclePoint,
    renderLifecycleDrillDown
  }

  // Prepare Opportunities Props - Always show tab
  const opportunitiesProps = {
    ...buildOpportunitiesProps(
      {
        opportunitiesStaticData,
        opportunitiesStaticLoading,
        oppLifecycleData: oppLifecycleData || [],
        oppLifecycleLoading,
        oppTimeFilter,
        onOppTimeFilterChange: setOppTimeFilter,
        pipelines: pipelines || [],
        selectedPipelineId: oppLifecyclePipelineId,
        onPipelineChange: (id: string) => setOppLifecyclePipelineId(id === 'all' ? undefined : id),
        oppStageData: oppStageData || [],
        selectedStagePipelineId,
        onStagePipelineChange: (id: string | undefined) => setSelectedStagePipelineId(id),
        topOpportunities: topOpportunitiesData,
        topOpportunitiesLoading,
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
        showTopOpportunities: true,
        useTrendData: false // CRM calculates from static data
      }
    ),
    selectedOppTabStage,
    onTopOpportunityClick: (opportunityId: string) =>
      navigateTo(buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId })),
    onOpportunitiesStageClick: handleOppTabStageClick,
    renderOpportunitiesStageDrillDown: (sel: { stage: string; stageRef: string }) => (
      <AnalyticsOpportunityDrillDown
        key={`${sel.stageRef}-${selectedStagePipelineId || 'all'}`}
        context={context}
        opportunityModuleConfig={opportunityModuleConfig}
        selection={sel}
        onClose={handleOppTabStageClose}
        moduleColor={moduleColor}
        openStatusId="SalesOpportunityStatus:v1:OPEN"
        openPipelineOnly={false}
        pipelineId={selectedStagePipelineId}
        dataTestId="analytics-crm-stage-opportunities"
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
        openStatusId="SalesOpportunityStatus:v1:OPEN"
        openPipelineOnly={false}
        statusBucket={sel.status.toLowerCase() as 'open' | 'won' | 'lost'}
        dataTestId="analytics-crm-stage-opportunities"
      />
    ),
    onLifecyclePointClick: handleOppLifecyclePointClick,
    renderLifecycleDrillDown: renderOppLifecycleDrillDown,
    onFlowTrendPointClick: handleFlowTrendPointClick,
    renderFlowTrendDrillDown
  }

  // Prepare Contacts Props - Always show tab (matches Leads/Accounts pattern)
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
        module: 'crm'
      }
    ),
    selectedContactType,
    onContactTypeClick: handleContactTypeClick,
    renderContactTypeDrillDown
  }

  // Note: Customer Relations includes campaigns, but this would need to be extended in AnalyticsLayout
  // For now, we'll use the AnalyticsLayout as-is and can extend it later for campaigns

  return (
    <div data-testid="crm-analytics" className="gba:h-full gba:p-6">
      <AnalyticsLayout
        defaultTab={activeAnalyticsTab}
        onTabChange={handleAnalyticsTabChange}
        overviewProps={overviewProps}
        leadsProps={leadsProps}
        accountsProps={accountsProps}
        opportunitiesProps={opportunitiesProps}
        contactsProps={contactsProps}
        moduleColor={moduleColor}
      />
    </div>
  )
}

export default AnalyticsView
