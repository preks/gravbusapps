import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { message } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeeById } from '@/business-apps/crm/core/forms/lead-form/hooks/useEmployeeById' // TODO: Extract to common urgent
import { useEmployeePositions } from '@/business-apps/crm/core/forms/lead-form/hooks/useEmployeePositions' // TODO: Extract to common urgent
import { useAccountsData } from '../hooks/useAccountsData'
import { opportunityClient, OpportunityPayload } from '@/common/network/opportunity/OpportunityClient'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import {
  OpportunityFormValues,
  SelectOption,
  ADDRESS_TYPES,
  COMMUNICATION_CHANNEL_TYPES,
  RECORD_STATES
} from '../types'
import { useOpportunityStatusCatalog, usePipelineCatalogs, useCurrencyCatalog, useOpportunityData } from '../hooks'
import { useSalesCampaignsGraphQL } from '../../../../common/hooks/useSalesCampaignsGraphQL' // TODO: Extract

interface OpportunityFormContextValue {
  formValues: OpportunityFormValues
  setFormValues: (updates: Partial<OpportunityFormValues>) => void
  onSubmit: (values: OpportunityFormValues) => Promise<void>
  onCancel: () => Promise<void>
  isLoading: boolean
  error: string | null
  hideActions?: boolean

  // Employee positions (for owner selection)
  employeePositions: SelectOption[]
  employeePositionsLoading: boolean
  employeePositionsError: string | null
  employeePositionsHasMore: boolean
  loadMoreEmployeePositions: () => void
  searchEmployeePositions: (search: string) => void

  // Static data
  opportunityStatuses: SelectOption[]
  pipelines: SelectOption[]
  salesPipelineStages: SelectOption[]
  addressTypes: SelectOption[]
  communicationChannelTypes: SelectOption[]
  recordStates: SelectOption[]

  // Currencies (using Currency catalog)
  currencies: SelectOption[]
  currenciesLoading: boolean
  currenciesError: string | null
  currenciesHasMore: boolean
  currenciesNeedsMoreData: boolean
  currenciesDisplayCount: number
  currenciesTotalFetched: number
  loadMoreCurrencies: () => void
  showMoreCurrencies: () => void
  searchCurrencies: (search: string) => void

  // Sales Campaigns
  salesCampaigns: SelectOption[]
  salesCampaignsLoading: boolean
  salesCampaignsError: string | null
  salesCampaignsHasMore: boolean
  searchSalesCampaigns: (searchTerm: string) => void
  loadMoreSalesCampaigns: () => void

  // Catalog refresh functions
  refetchStages: (selectedPipelineId?: string) => void

  // Company autocomplete
  accountSuggestions: SelectOption[]
  searchAccounts: (search: string) => void
  loadMoreAccounts: () => Promise<void>
  accountsHasMore: boolean
  accountsLoading: boolean

  // Business app context for child components
  businessAppContext: BusinessAppContextProps
}

const OpportunityFormContext = createContext<OpportunityFormContextValue | null>(null)

interface OpportunityFormProviderProps {
  children: React.ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<OpportunityFormValues>
  onSubmit?: (values: OpportunityFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  hideActions?: boolean
}

export const OpportunityFormProvider: React.FC<OpportunityFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit: customOnSubmit,
  onCancel = async () => {},
  hideActions = false
}) => {
  // Form state
  const [formValues, setFormValuesState] = useState<OpportunityFormValues>({
    // Opportunity Information
    owner: '',
    name: '',
    opportunityStatus: '',
    pipeline: '',
    salesPipelineStage: '',
    stage: '',
    status: '',

    // Sales Information
    estimatedAmount: '',
    currency: '',
    winningChance: '',
    closeDate: '',

    // Relationship Information
    account: '',
    lead: '',

    // Business Information
    businessKey: '',
    code: '',
    sourceApp: 'CRM',
    personal: false,
    companyName: '',

    // Additional Information
    notesSummary: '',
    lastInteraction: '',

    // Address Information
    addresses: [],

    // Communication Channels
    communicationChannels: [],

    // Tags
    tags: [],

    // Additional Properties for custom fields
    additionalProperties: {},

    // Express fields for dynamic configuration
    express1: {},
    express2: {},

    // Process and system fields
    processInstanceId: '',
    recordState: 'DRAFT',

    // Audit information (readonly, for display)
    activeFrom: '',
    activeTo: '',
    createdAt: '',
    createdBy: '',
    updatedAt: '',
    updatedBy: '',
    synchronizedAt: '',

    // System fields
    id: undefined,
    version: undefined,

    // Legacy fields (for backward compatibility)
    accountId: '',
    leadId: '',
    ownerEmployeeId: '',
    ownerOrganizationId: '',

    // Sales Campaign
    salesCampaignId: '',

    // Contact Information (CRM-specific)
    contactIds: [],

    ...initialValues
  })

  // Global state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs for auto-selection control
  const autoSelectionDone = useRef(false)

  // Employee positions hook
  const {
    employeePositions: employeePositionData,
    loading: employeePositionsLoading,
    error: employeePositionsError,
    hasMore: employeePositionsHasMore,
    loadMore: loadMoreEmployeePositions,
    searchEmployees
  } = useEmployeePositions({ accessToken: businessAppContext.accessToken })

  // Sales Campaigns hook
  const {
    options: salesCampaignsOptions,
    loading: salesCampaignsLoading,
    error: salesCampaignsError,
    hasMore: salesCampaignsHasMore,
    search: searchSalesCampaigns,
    loadMore: loadMoreSalesCampaigns
  } = useSalesCampaignsGraphQL(businessAppContext.accessToken)

  // Create search wrapper for campaign autocomplete
  const searchSalesCampaignsWrapper = useCallback(
    (searchTerm: string) => {
      // Allow empty search to load all campaigns, or search with 3+ characters
      if (searchTerm.trim().length === 0 || searchTerm.trim().length > 2) {
        searchSalesCampaigns(searchTerm)
      }
    },
    [searchSalesCampaigns]
  )

  // Create wrapper function for campaigns to match interface
  const loadMoreSalesCampaignsWrapper = useCallback((): void => {
    loadMoreSalesCampaigns()
  }, [loadMoreSalesCampaigns])

  // Current user employee hook
  const { employee: currentUserEmployee } = useEmployeeById({
    accessToken: businessAppContext.accessToken,
    employeeId: businessAppContext.userInfo?.employeeDetails?.employeeId
  })

  // Opportunity data fetching hook for pre-filling form when updating existing opportunity
  const { opportunityData, mapOpportunityToFormValues } = useOpportunityData({ businessAppContext })

  // Extract opportunityId for tracking changes - NOT memoized (matching Contact/Account pattern)
  // Simple extraction works better with dynamic additionalData updates from AppActionButton
  const opportunityId =
    businessAppContext.additionalData?.opportunityId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId ||
    initialValues?.id

  // Reset auto-selection flag when opportunity changes or when creating new opportunity
  useEffect(() => {
    autoSelectionDone.current = false
  }, [opportunityId])

  // Default submit function - saves opportunity via API
  const defaultOnSubmit = useCallback(
    async (values: OpportunityFormValues) => {
      setIsLoading(true)
      setError(null)

      try {
        // Convert form values to API payload
        const opportunityPayload: OpportunityPayload = {
          // Basic fields
          id: values.id,
          version: values.version || 0,
          name: values.name,
          businessKey: values.businessKey,
          code: values.code,

          // Core opportunity fields
          estimatedAmount: values.estimatedAmount ? parseFloat(values.estimatedAmount) : undefined,
          winningChance: values.winningChance ? parseFloat(values.winningChance) : undefined,
          closeDate: values.closeDate ? new Date(values.closeDate).toISOString() : undefined,
          lastInteraction: values.lastInteraction ? new Date(values.lastInteraction).toISOString() : undefined,
          notesSummary: values.notesSummary,

          // Status and pipeline fields
          opportunityStatusRef: values.opportunityStatus,
          status: values.status,
          stage: values.stage,
          salesPipelineRef: values.pipeline, // Use salesPipelineRef instead of deprecated pipelineRef
          salesPipelineStageRef: values.salesPipelineStage,

          // Relationship fields
          accountId: values.account || values.accountId,
          leadId: values.lead || values.leadId,
          ownerEmployeeId: values.owner || values.ownerEmployeeId,
          ownerOrganizationId: values.ownerOrganizationId,

          // Campaign Information
          salesCampaignId: values.salesCampaignId,

          // Currency and system fields
          currencyRef: values.currency,
          sourceApp: values.sourceApp,
          personal: values.personal,

          // Additional properties
          additionalProperties: values.additionalProperties,
          express1: values.express1,
          express2: values.express2,

          // Process fields
          processInstanceId: values.processInstanceId,
          recordState: values.recordState,

          // Addresses
          addresses: values.addresses?.map(addr => ({
            id: addr.id,
            version: addr.version || 0,
            addressType: addr.addressType || 'BUSINESS',
            addressLine: addr.addressLine,
            postalCode: addr.postalCode,
            city: addr.city,
            regionRef: addr.region,
            countryRef: addr.country
          })),

          // Communication channels
          communicationChannels: values.communicationChannels?.map(channel => ({
            id: channel.id,
            version: channel.version || 0,
            channelType: channel.channelType,
            channelValue: channel.channelValue,
            isPrimary: channel.isPrimary
          })),

          // Tags
          tags: values.tags?.map(tag => ({
            id: tag.id,
            version: tag.version || 0,
            tagName: tag.tagName,
            tagValue: tag.tagValue
          }))
        }

        // Determine change mode based on whether we have an ID
        const changeMode = values.id ? 'UPDATE' : 'INSERT'

        // Save via API
        const result = await opportunityClient.saveOpportunity(
          opportunityPayload,
          businessAppContext.accessToken,
          changeMode
        )

        message.success('Opportunity saved successfully')

        // Prepare payload in the same format as other forms (lead, contact, account)
        const payload = {
          opportunity: {
            ...opportunityPayload,
            id: result?.opportunity?.id || values.id
          },
          changeMode: changeMode
        }

        // Dispatch process continue event on successful submission
        dispatchProcessContinueEvent('pse_submit', payload)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        setError(`Failed to save opportunity: ${errorMessage}`)
        message.error(`Failed to save opportunity: ${errorMessage}`)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [businessAppContext.accessToken]
  )

  // Use custom submit function if provided, otherwise use default
  const onSubmit = customOnSubmit || defaultOnSubmit

  // Computed employee positions with current user prioritized
  const employeePositions = useMemo(() => {
    // Convert employee position data to SelectOption format
    const regularEmployees: SelectOption[] = (employeePositionData || []).map(emp => {
      const displayName = `${emp.firstName} ${emp.lastName}`
      const jobTitle = emp.jobPosition?.name || 'No Position'
      const orgUnit = emp.organizationalUnit?.name || 'No Unit'

      return {
        id: emp.employeeId,
        value: emp.employeeId,
        label: `${displayName} - ${jobTitle}`,
        name: displayName,
        extraInfo: {
          picture: emp.employee.picture || undefined,
          pictureThumbnail: emp.employee.pictureThumbnail || undefined,
          jobPosition: jobTitle,
          organizationalUnit: orgUnit,
          userId: emp.employee.userId || undefined
        }
      }
    })

    if (currentUserEmployee) {
      const currentUserDisplayName = `${currentUserEmployee.firstName} ${currentUserEmployee.lastName}`
      const currentUserJobTitle = currentUserEmployee.jobPosition?.name || 'No Position'
      const currentUserOrgUnit = currentUserEmployee.organizationalUnit?.name || 'No Unit'

      const currentUserOption: SelectOption = {
        id: currentUserEmployee.employeeId,
        value: currentUserEmployee.employeeId,
        label: `${currentUserDisplayName} - ${currentUserJobTitle}`,
        name: currentUserDisplayName,
        extraInfo: {
          picture: currentUserEmployee.employee.picture || undefined,
          pictureThumbnail: currentUserEmployee.employee.pictureThumbnail || undefined,
          jobPosition: currentUserJobTitle,
          organizationalUnit: currentUserOrgUnit,
          userId: currentUserEmployee.employee.userId || undefined
        }
      }

      const isCurrentUserAlreadyInList = regularEmployees.some(emp => emp.id === currentUserEmployee.employeeId)
      if (!isCurrentUserAlreadyInList) {
        regularEmployees.unshift(currentUserOption)
      }
    }

    // Add opportunity owner employee if they exist and are not already in the list
    if (opportunityData?.ownerEmployee) {
      const ownerEmployee = opportunityData.ownerEmployee
      const ownerDisplayName = ownerEmployee.displayName || `${ownerEmployee.firstName} ${ownerEmployee.lastName}`

      const isOwnerAlreadyInList = regularEmployees.some(emp => emp.id === ownerEmployee.id)

      if (!isOwnerAlreadyInList) {
        const ownerOption: SelectOption = {
          id: ownerEmployee.id,
          value: ownerEmployee.id,
          label: `${ownerDisplayName} - Owner`,
          name: ownerDisplayName,
          extraInfo: {
            picture: undefined,
            pictureThumbnail: ownerEmployee.pictureThumbnail || undefined,
            jobPosition: 'Owner',
            organizationalUnit: 'N/A',
            userId: undefined
          }
        }

        // Add owner at the beginning (but after current user if present)
        const currentUserIndex = regularEmployees.findIndex(
          emp => currentUserEmployee && emp.id === currentUserEmployee.employeeId
        )

        if (currentUserIndex >= 0) {
          regularEmployees.splice(currentUserIndex + 1, 0, ownerOption)
        } else {
          regularEmployees.unshift(ownerOption)
        }
      }
    }

    return regularEmployees
  }, [employeePositionData, currentUserEmployee, opportunityData])

  // Catalog hooks for dynamic data
  const { opportunityStatusOptions } = useOpportunityStatusCatalog(businessAppContext)
  const {
    pipelineOptions,
    pipelineStageOptions,
    refetchStages: refetchPipelineStages
  } = usePipelineCatalogs(businessAppContext, formValues.pipeline)

  // Currency catalog hook with all pagination properties
  const {
    currencyOptions,
    isLoading: currenciesLoading,
    error: currenciesError,
    hasMore: currenciesHasMore,
    needsMoreData: currenciesNeedsMoreData,
    displayCount: currenciesDisplayCount,
    totalFetched: currenciesTotalFetched,
    loadMore: loadMoreCurrencies,
    showMore: showMoreCurrencies,
    search: searchCurrencies,
    initialize: initializeCurrencies
  } = useCurrencyCatalog(businessAppContext)

  // Initialize currencies catalog on mount
  useEffect(() => {
    initializeCurrencies()
  }, [initializeCurrencies])

  // Static data arrays - Memoized to prevent unnecessary re-renders
  const opportunityStatuses: SelectOption[] = useMemo(() => opportunityStatusOptions, [opportunityStatusOptions])

  const pipelines: SelectOption[] = useMemo(() => pipelineOptions as SelectOption[], [pipelineOptions])

  const salesPipelineStages: SelectOption[] = useMemo(
    () => pipelineStageOptions as SelectOption[],
    [pipelineStageOptions]
  )

  const currencies: SelectOption[] = useMemo(() => currencyOptions, [currencyOptions])

  // Populate form values when opportunity data is loaded (for editing existing opportunities)
  useEffect(() => {
    // Only populate if we have opportunity data
    if (opportunityData?.id) {
      console.log('🔄 CRM Opportunity Form: Populating form with opportunity data', {
        opportunityId: opportunityData.id,
        opportunityName: opportunityData.name,
        estimatedAmount: opportunityData.estimatedAmount
      })

      const mappedValues = mapOpportunityToFormValues(opportunityData)
      console.log('📋 CRM Opportunity Form: Mapped values', mappedValues)

      // Merge mapped values with existing form state to preserve all fields
      setFormValuesState(prev => ({
        ...prev,
        ...mappedValues
      }))

      // Don't auto-select current user if we're editing an existing opportunity
      autoSelectionDone.current = true
    } else {
      console.log('⚠️ CRM Opportunity Form: No opportunity data to populate')
    }
  }, [opportunityData, mapOpportunityToFormValues, opportunityId])

  // Auto-select current user as owner (only if not editing existing opportunity)
  useEffect(() => {
    if (
      currentUserEmployee &&
      !autoSelectionDone.current &&
      !formValues.owner &&
      !formValues.id // Only auto-select for new opportunities
    ) {
      setFormValuesState(prev => ({
        ...prev,
        owner: currentUserEmployee.employeeId,
        ownerEmployeeId: currentUserEmployee.employeeId // Update legacy field too
      }))
      autoSelectionDone.current = true
    }
  }, [
    currentUserEmployee,
    formValues.owner,
    businessAppContext.additionalData?.opportunityId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId
  ])

  // Accounts data hook for company autocomplete with pagination
  const {
    searchAccounts: searchAccountsHook,
    loadMoreAccounts,
    accountState
  } = useAccountsData({ accessToken: businessAppContext.accessToken })

  // Create search wrapper for company autocomplete
  const searchAccountsWrapper = useCallback(
    (searchTerm: string) => {
      // Allow empty search to load all companies, or search with 3+ characters
      if (searchTerm.trim().length === 0 || searchTerm.trim().length > 2) {
        searchAccountsHook(searchTerm)
      }
    },
    [searchAccountsHook]
  )

  // Create wrapper function to match interface
  const loadMoreAccountsWrapper = useCallback(async (): Promise<void> => {
    await loadMoreAccounts()
  }, [loadMoreAccounts])

  // Form value setter
  const setFormValues = useCallback((updates: Partial<OpportunityFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...updates }))
  }, [])

  // Search functions
  const searchEmployeePositions = useCallback(
    (search: string) => {
      searchEmployees(search)
    },
    [searchEmployees]
  )

  const contextValue: OpportunityFormContextValue = useMemo(
    () => ({
      // Form state
      formValues,
      setFormValues,
      onSubmit,
      onCancel,

      // Loading states
      isLoading,
      error,
      hideActions,

      // Employee positions
      employeePositions,
      employeePositionsLoading,
      employeePositionsError,
      employeePositionsHasMore,
      loadMoreEmployeePositions,
      searchEmployeePositions,

      // Static data
      opportunityStatuses,
      pipelines,
      salesPipelineStages,
      currencies,
      addressTypes: ADDRESS_TYPES,
      communicationChannelTypes: COMMUNICATION_CHANNEL_TYPES,
      recordStates: RECORD_STATES,

      // Currencies (using Currency catalog)
      currenciesLoading,
      currenciesError,
      currenciesHasMore,
      currenciesNeedsMoreData,
      currenciesDisplayCount,
      currenciesTotalFetched,
      loadMoreCurrencies,
      showMoreCurrencies,
      searchCurrencies,

      // Sales Campaigns
      salesCampaigns: salesCampaignsOptions, // Use salesCampaignsOptions directly
      salesCampaignsLoading: salesCampaignsLoading,
      salesCampaignsError: salesCampaignsError,
      salesCampaignsHasMore: salesCampaignsHasMore,
      searchSalesCampaigns: searchSalesCampaignsWrapper,
      loadMoreSalesCampaigns: loadMoreSalesCampaignsWrapper,

      // Catalog refresh functions
      refetchStages: refetchPipelineStages,

      // Company autocomplete
      accountSuggestions: accountState.accounts,
      searchAccounts: searchAccountsWrapper,
      loadMoreAccounts: loadMoreAccountsWrapper,
      accountsHasMore: accountState.hasMore,
      accountsLoading: accountState.isLoading,

      // Business app context for child components
      businessAppContext
    }),
    [
      // Form state
      formValues,
      setFormValues,
      onSubmit,
      onCancel,

      // Loading states
      isLoading,
      error,

      // Employee positions
      employeePositions,
      employeePositionsLoading,
      employeePositionsError,
      employeePositionsHasMore,
      loadMoreEmployeePositions,
      searchEmployeePositions,

      // Static data
      opportunityStatuses,
      pipelines,
      salesPipelineStages,
      currencies,

      // Currencies (using Currency catalog)
      currenciesLoading,
      currenciesError,
      currenciesHasMore,
      currenciesNeedsMoreData,
      currenciesDisplayCount,
      currenciesTotalFetched,
      loadMoreCurrencies,
      showMoreCurrencies,
      searchCurrencies,

      // Sales Campaigns
      salesCampaignsOptions, // Use salesCampaignsOptions directly
      salesCampaignsLoading,
      salesCampaignsError,
      salesCampaignsHasMore,
      searchSalesCampaignsWrapper,
      loadMoreSalesCampaignsWrapper,

      // Catalog refresh functions
      refetchPipelineStages,

      // Company autocomplete
      accountState.accounts,
      searchAccountsWrapper,
      loadMoreAccountsWrapper,
      accountState.hasMore,
      accountState.isLoading,

      // Business app context
      businessAppContext
    ]
  )

  return <OpportunityFormContext.Provider value={contextValue}>{children}</OpportunityFormContext.Provider>
}

export const useOpportunityFormContext = (): OpportunityFormContextValue => {
  const context = useContext(OpportunityFormContext)
  if (!context) {
    throw new Error('useOpportunityFormContext must be used within an OpportunityFormProvider')
  }
  return context
}
