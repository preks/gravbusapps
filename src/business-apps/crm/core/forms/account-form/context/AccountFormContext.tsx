import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { AccountFormValues, SelectOption, AccountContextState, Address } from '../types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeeById } from '@/business-apps/crm/core/forms/lead-form/hooks/useEmployeeById' // TODO: Extract to common urgent
import { useEmployeePositions } from '@/business-apps/crm/core/forms/lead-form/hooks/useEmployeePositions' // TODO: Extract to common urgent
import { useSearchableCatalog } from '../../lead-form/hooks/useSearchableCatalog'
import {
  LEGAL_FORM_CATALOG,
  INDUSTRY_CATALOG,
  EMPLOYEE_SIZE_CATALOG,
  REVENUE_SIZE_CATALOG
} from '@/business-apps/crm/core/forms/lead-form/hooks/useLeadCatalogs'
import { useCountriesGraphQL } from '../hooks/useCountriesGraphQL'
import { useSalesCampaignsGraphQL } from '../../../../common/hooks/useSalesCampaignsGraphQL'
import { useAccountData, mapAccountToFormValues } from '../hooks/useAccountData'
import { useGetCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'

interface AccountFormContextValue extends AccountContextState {
  formValues: AccountFormValues
  setFormValues: (updates: Partial<AccountFormValues>) => void
  onSubmit: (values: AccountFormValues) => Promise<void>
  onCancel: () => Promise<void>
  hideActions: boolean

  // Business app context for hooks
  businessAppContext: BusinessAppContextProps

  // Employee positions (for owner selection)
  employeePositions: SelectOption[]
  employeePositionsLoading: boolean
  employeePositionsError: string | null
  employeePositionsHasMore: boolean
  loadMoreEmployeePositions: () => void
  searchEmployeePositions: (search: string) => void

  // Legal Forms with search and pagination
  legalForms: SelectOption[]
  legalFormsLoading: boolean
  legalFormsError: string | null
  legalFormsHasMore: boolean
  legalFormsNeedsMoreData: boolean
  legalFormsDisplayCount: number
  legalFormsTotalFetched: number
  searchLegalForms: (search: string) => void
  loadMoreLegalForms: () => void
  showMoreLegalForms: () => void

  // Industries with search and pagination
  industries: SelectOption[]
  industriesLoading: boolean
  industriesError: string | null
  industriesHasMore: boolean
  industriesNeedsMoreData: boolean
  industriesDisplayCount: number
  industriesTotalFetched: number
  searchIndustries: (search: string) => void
  loadMoreIndustries: () => void
  showMoreIndustries: () => void

  // Employee Sizes with search and pagination
  employeeSizes: SelectOption[]
  employeeSizesLoading: boolean
  employeeSizesError: string | null
  employeeSizesHasMore: boolean
  employeeSizesNeedsMoreData: boolean
  employeeSizesDisplayCount: number
  employeeSizesTotalFetched: number
  searchEmployeeSizes: (search: string) => void
  loadMoreEmployeeSizes: () => void
  showMoreEmployeeSizes: () => void

  // Revenue Sizes with search and pagination
  revenueSizes: SelectOption[]
  revenueSizesLoading: boolean
  revenueSizesError: string | null
  revenueSizesHasMore: boolean
  revenueSizesNeedsMoreData: boolean
  revenueSizesDisplayCount: number
  revenueSizesTotalFetched: number
  searchRevenueSizes: (search: string) => void
  loadMoreRevenueSizes: () => void
  showMoreRevenueSizes: () => void

  // Countries with search and pagination
  countries: SelectOption[]
  countriesLoading: boolean
  countriesError: string | null
  countriesHasMore: boolean
  searchCountries: (searchTerm: string) => void
  loadMoreCountries: () => void

  // Parent account autocomplete
  parentAccountSuggestions: SelectOption[]
  searchParentAccounts: (search: string) => Promise<SelectOption[]>
  isSearchingParentAccounts: boolean
  setIsSearchingParentAccounts: (loading: boolean) => void
  setParentAccountSuggestions: (suggestions: SelectOption[]) => void

  // Sales Campaigns
  salesCampaigns: SelectOption[]
  salesCampaignsLoading: boolean
  salesCampaignsError: string | null
  salesCampaignsHasMore: boolean
  searchSalesCampaigns: (searchTerm: string) => void
  loadMoreSalesCampaigns: () => void

  // Contact selection (matching IRM pattern)
  contacts: SelectOption[]
  contactsLoading: boolean
  contactsError: string | null
  searchContacts: (search: string) => void

  // Address lines management (legacy)
  addressLineCount: number
  addAddressLine: () => void
  removeAddressLine: () => void

  // Dynamic addresses management
  addAddress: () => void
  removeAddress: (addressId: string) => void
  updateAddress: (addressId: string, updates: Partial<Address>) => void
  addAddressLineToAddress: (addressId: string) => void
  removeAddressLineFromAddress: (addressId: string, lineIndex: number) => void

  // Legacy compatibility (using employeeSizes data)
  numberOfEmployeesOptions: SelectOption[]
}

const AccountFormContext = createContext<AccountFormContextValue | null>(null)

interface AccountFormProviderProps {
  children: React.ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<AccountFormValues>
  onSubmit?: (values: AccountFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  hideActions?: boolean
}

export const AccountFormProvider: React.FC<AccountFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
  hideActions = false
}) => {
  // Form state
  const [formValues, setFormValuesState] = useState<AccountFormValues>({
    // Account Information
    owner: '',

    // Company Information
    accountName: '',
    legalForm: '',
    industry: '',
    website: '',

    // Campaign Information
    salesCampaignId: '',

    // Contact Information
    phone: '',
    email: '',
    contactIds: [], // ✅ ADDED - Related contacts (matching IRM pattern)

    // Dynamic Addresses
    addresses: [
      {
        id: 'default-address',
        addressType: 'UNKNOWN_ADDRESS',
        addressLines: [''],
        postalCode: '',
        city: '',
        region: '',
        country: ''
      }
    ],

    // Legacy Address Information (for backward compatibility)
    country: '',
    region: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    addressLine4: '',
    postalCode: '',
    city: '',

    // Financial Information
    annualRevenue: '',
    numberOfEmployees: '',
    foundationDate: '',

    // System fields
    id: undefined,
    version: undefined,

    // Legacy fields
    address: '',
    state: '',

    ...initialValues
  })

  // Global state
  const [isLoading] = useState(false)
  const [error] = useState<string | null>(null)
  const [addressLineCount, setAddressLineCount] = useState(1)

  // Parent account autocomplete state
  const [parentAccountSuggestions, setParentAccountSuggestions] = useState<SelectOption[]>([])
  const [isSearchingParentAccounts, setIsSearchingParentAccounts] = useState(false)

  // Auto-selection tracking
  const autoSelectionDone = useRef(false)

  // Account data hook for fetching existing account data
  const { accountData } = useAccountData(businessAppContext)

  // Current user employee hook for auto-selection
  const { employee: currentUserEmployee } = useEmployeeById({
    accessToken: businessAppContext.accessToken,
    employeeId: businessAppContext.userInfo?.employeeDetails?.employeeId
  })

  // Employee positions hook
  const {
    employeePositions: employeePositionData,
    loading: employeePositionsLoading,
    error: employeePositionsError,
    hasMore: employeePositionsHasMore,
    searchEmployees,
    loadMore: loadMoreEmployeePositions
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

  // Contact selection hook (matching IRM pattern)
  const {
    options: contactsList,
    loading: contactsLoading,
    error: contactsError,
    search: searchContactsWrapper
  } = useGetCustomerContacts(businessAppContext, {
    withState: true,
    autoFetch: true,
    pageSize: 20,
    mapToSelectOptions: true
  })

  // Map contacts to SelectOption format (already mapped by hook)
  const contactsOptions: SelectOption[] = useMemo(() => (contactsList as SelectOption[]) || [], [contactsList])

  // Countries hook
  const {
    options: countries,
    loading: countriesLoading,
    error: countriesError,
    hasMore: countriesHasMore,
    search: searchCountries,
    loadMore: loadMoreCountries
  } = useCountriesGraphQL({
    accessToken: businessAppContext.accessToken
  })

  // Legal form catalog hook - using searchable catalog like lead form
  const legalFormsConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: LEGAL_FORM_CATALOG
    }),
    [businessAppContext.accessToken]
  )

  const legalFormsHook = useSearchableCatalog(legalFormsConfig)

  // Industries catalog hook - using searchable catalog like lead form
  const industriesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: INDUSTRY_CATALOG
    }),
    [businessAppContext.accessToken]
  )

  const industriesHook = useSearchableCatalog(industriesConfig)

  // Employee sizes catalog hook - using searchable catalog like lead form
  const employeeSizesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: EMPLOYEE_SIZE_CATALOG
    }),
    [businessAppContext.accessToken]
  )

  const employeeSizesHook = useSearchableCatalog(employeeSizesConfig)

  // Revenue sizes catalog hook - using searchable catalog like lead form
  const revenueSizesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: REVENUE_SIZE_CATALOG
    }),
    [businessAppContext.accessToken]
  )

  const revenueSizesHook = useSearchableCatalog(revenueSizesConfig)

  // Initialize all catalog hooks on mount
  useEffect(() => {
    legalFormsHook.initialize()
    industriesHook.initialize()
    employeeSizesHook.initialize()
    revenueSizesHook.initialize()
  }, [legalFormsHook.initialize, industriesHook.initialize, employeeSizesHook.initialize, revenueSizesHook.initialize])

  // Convert employee position data to SelectOption format
  const employeePositions: SelectOption[] = useMemo(() => {
    const regularEmployees = employeePositionData.map(emp => {
      const displayName = emp.employee.displayName || `${emp.firstName} ${emp.lastName}`.trim()
      const jobTitle = emp.jobPosition?.name || 'No Position'
      const orgUnit = emp.organizationalUnit?.name || 'No Unit'

      return {
        id: emp.employeeId,
        value: emp.employeeId,
        label: `${displayName} - ${jobTitle}`,
        name: displayName,
        extraInfo: {
          picture: emp.employee.picture,
          pictureThumbnail: emp.employee.pictureThumbnail,
          jobPosition: jobTitle,
          organizationalUnit: orgUnit,
          userId: emp.employee.userId
        }
      }
    })

    const finalEmployees: SelectOption[] = [...regularEmployees]

    // Add current user to the beginning if they're not already in the list
    if (currentUserEmployee) {
      const currentUserDisplayName =
        currentUserEmployee.employee.displayName ||
        `${currentUserEmployee.firstName} ${currentUserEmployee.lastName}`.trim()
      const currentUserJobTitle = currentUserEmployee.jobPosition?.name || 'No Position'
      const currentUserOrgUnit = currentUserEmployee.organizationalUnit?.name || 'No Unit'

      const currentUserOption: SelectOption = {
        id: currentUserEmployee.employeeId,
        value: currentUserEmployee.employeeId,
        label: `${currentUserDisplayName} - ${currentUserJobTitle}`,
        name: currentUserDisplayName,
        extraInfo: {
          picture: currentUserEmployee.employee.picture,
          pictureThumbnail: currentUserEmployee.employee.pictureThumbnail,
          jobPosition: currentUserJobTitle,
          organizationalUnit: currentUserOrgUnit,
          userId: currentUserEmployee.employee.userId
        }
      }

      const isCurrentUserInList = finalEmployees.some(emp => emp.value === currentUserEmployee.employeeId)

      if (!isCurrentUserInList) {
        finalEmployees.unshift(currentUserOption)
      }
    }

    // Add account's owner employee if we have account data and owner is not in the list
    if (accountData && accountData.Account?.[0]?.ownerEmployee) {
      const accountOwner = accountData.Account[0]
      const ownerEmployeeId = accountOwner?.ownerEmployee?.id
      const isAccountOwnerInList = finalEmployees.some(emp => emp.value === ownerEmployeeId)

      if (!isAccountOwnerInList) {
        const accountOwnerDisplayName =
          `${accountOwner?.ownerEmployee?.firstName} ${accountOwner?.ownerEmployee?.lastName}`.trim()

        const accountOwnerOption: SelectOption = {
          id: String(ownerEmployeeId || ''),
          value: String(ownerEmployeeId || ''),
          label: `${accountOwnerDisplayName} - Account Owner`,
          name: accountOwnerDisplayName,
          extraInfo: {
            picture: undefined, // We don't have this from account query
            pictureThumbnail: accountOwner?.ownerEmployee?.pictureThumbnail,
            jobPosition: 'Account Owner', // Default since we don't have job position from account query
            organizationalUnit: 'Unknown', // Default since we don't have org unit from account query
            userId: undefined
          }
        }

        finalEmployees.unshift(accountOwnerOption)
      }
    }

    return finalEmployees
  }, [employeePositionData, currentUserEmployee, accountData])

  // Form value setter
  const setFormValues = useCallback((updates: Partial<AccountFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...updates }))
  }, [])

  // Parent account search function
  const searchParentAccounts = useCallback(async (search: string): Promise<SelectOption[]> => {
    // TODO: Implement actual search API call
    setIsSearchingParentAccounts(true)
    try {
      // Mock implementation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300))
      const mockResults: SelectOption[] = [
        {
          id: '1',
          value: '1',
          label: `${search} Corp`,
          name: `${search} Corp`
        },
        {
          id: '2',
          value: '2',
          label: `${search} Industries`,
          name: `${search} Industries`
        }
      ]
      setParentAccountSuggestions(mockResults)
      return mockResults
    } finally {
      setIsSearchingParentAccounts(false)
    }
  }, [])

  // Address line management (legacy)
  const addAddressLine = useCallback(() => {
    if (addressLineCount < 4) {
      setAddressLineCount(prev => prev + 1)
    }
  }, [addressLineCount])

  const removeAddressLine = useCallback(() => {
    if (addressLineCount > 1) {
      setAddressLineCount(prev => prev - 1)
      // Clear the last address line value
      const lineKey = `addressLine${addressLineCount}` as keyof AccountFormValues
      setFormValues({ [lineKey]: '' })
    }
  }, [addressLineCount, setFormValues])

  // Dynamic addresses management
  const addAddress = useCallback(() => {
    const newAddress: Address = {
      id: `address-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addressType: 'UNKNOWN_ADDRESS',
      addressLines: [''],
      postalCode: '',
      city: '',
      region: '',
      country: ''
    }

    setFormValuesState(prev => ({
      ...prev,
      addresses: [...prev.addresses, newAddress]
    }))
  }, [])

  const removeAddress = useCallback((addressId: string) => {
    setFormValuesState(prev => ({
      ...prev,
      addresses: prev.addresses.filter(addr => addr.id !== addressId)
    }))
  }, [])

  const updateAddress = useCallback((addressId: string, updates: Partial<Address>) => {
    setFormValuesState(prev => ({
      ...prev,
      addresses: prev.addresses.map(addr => (addr.id === addressId ? { ...addr, ...updates } : addr))
    }))
  }, [])

  const addAddressLineToAddress = useCallback((addressId: string) => {
    setFormValuesState(prev => ({
      ...prev,
      addresses: prev.addresses.map(addr =>
        addr.id === addressId ? { ...addr, addressLines: [...addr.addressLines, ''] } : addr
      )
    }))
  }, [])

  const removeAddressLineFromAddress = useCallback((addressId: string, lineIndex: number) => {
    setFormValuesState(prev => ({
      ...prev,
      addresses: prev.addresses.map(addr =>
        addr.id === addressId
          ? {
              ...addr,
              addressLines: addr.addressLines.filter((_, index) => index !== lineIndex)
            }
          : addr
      )
    }))
  }, [])

  // Populate form values when account data is loaded (for editing existing accounts)
  useEffect(() => {
    // Only populate if we have account data and the form doesn't already have this account's data
    if (
      accountData &&
      accountData.Account?.[0]?.id &&
      (!formValues.id || formValues.id !== accountData.Account[0].id)
    ) {
      const mappedValues = mapAccountToFormValues(accountData)
      setFormValuesState(prev => ({
        ...prev,
        ...mappedValues
      }))

      // Don't auto-select current user if we're editing an existing account
      autoSelectionDone.current = true
    }
  }, [
    accountData,
    businessAppContext.additionalData?.accountId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.accountId
  ])

  // Auto-select current user once their employee data has loaded (only for new accounts, not editing)
  useEffect(() => {
    const currentAccountId =
      businessAppContext.additionalData?.accountId ||
      businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.accountId

    // Only auto-select if:
    // 1. We have current user employee data
    // 2. No owner is set yet
    // 3. We haven't already done auto-selection
    // 4. We're NOT editing an existing account (no accountId)
    // 5. We don't have account data (meaning it's a new account)
    if (
      currentUserEmployee &&
      !formValues.owner &&
      !autoSelectionDone.current &&
      !currentAccountId && // Don't auto-select when editing existing account
      !accountData // Don't auto-select when we have account data
    ) {
      setFormValuesState(prev => ({
        ...prev,
        owner: currentUserEmployee.employeeId
      }))
      autoSelectionDone.current = true
    }
  }, [
    currentUserEmployee,
    formValues.owner,
    businessAppContext.additionalData?.accountId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.accountId,
    accountData
  ])

  // Context value - memoized to prevent unnecessary re-renders
  const value: AccountFormContextValue = useMemo(
    () => ({
      // Form state
      formValues,
      setFormValues,
      onSubmit,
      onCancel,
      hideActions,
      isLoading,
      error,

      // Business app context
      businessAppContext,

      // Employee positions
      employeePositions,
      employeePositionsLoading,
      employeePositionsError,
      employeePositionsHasMore,
      loadMoreEmployeePositions,
      searchEmployeePositions: searchEmployees,

      // Legal Forms with search and pagination
      legalForms: legalFormsHook.allOptions,
      legalFormsLoading: legalFormsHook.loading,
      legalFormsError: legalFormsHook.error,
      legalFormsHasMore: legalFormsHook.hasMore,
      legalFormsNeedsMoreData: legalFormsHook.needsMoreData,
      legalFormsDisplayCount: legalFormsHook.displayCount,
      legalFormsTotalFetched: legalFormsHook.totalFetched,
      searchLegalForms: legalFormsHook.search,
      loadMoreLegalForms: legalFormsHook.loadMore,
      showMoreLegalForms: legalFormsHook.showMore,

      // Industries with search and pagination
      industries: industriesHook.allOptions,
      industriesLoading: industriesHook.loading,
      industriesError: industriesHook.error,
      industriesHasMore: industriesHook.hasMore,
      industriesNeedsMoreData: industriesHook.needsMoreData,
      industriesDisplayCount: industriesHook.displayCount,
      industriesTotalFetched: industriesHook.totalFetched,
      searchIndustries: industriesHook.search,
      loadMoreIndustries: industriesHook.loadMore,
      showMoreIndustries: industriesHook.showMore,

      // Employee Sizes with search and pagination
      employeeSizes: employeeSizesHook.allOptions,
      employeeSizesLoading: employeeSizesHook.loading,
      employeeSizesError: employeeSizesHook.error,
      employeeSizesHasMore: employeeSizesHook.hasMore,
      employeeSizesNeedsMoreData: employeeSizesHook.needsMoreData,
      employeeSizesDisplayCount: employeeSizesHook.displayCount,
      employeeSizesTotalFetched: employeeSizesHook.totalFetched,
      searchEmployeeSizes: employeeSizesHook.search,
      loadMoreEmployeeSizes: employeeSizesHook.loadMore,
      showMoreEmployeeSizes: employeeSizesHook.showMore,

      // Revenue Sizes with search and pagination
      revenueSizes: revenueSizesHook.allOptions,
      revenueSizesLoading: revenueSizesHook.loading,
      revenueSizesError: revenueSizesHook.error,
      revenueSizesHasMore: revenueSizesHook.hasMore,
      revenueSizesNeedsMoreData: revenueSizesHook.needsMoreData,
      revenueSizesDisplayCount: revenueSizesHook.displayCount,
      revenueSizesTotalFetched: revenueSizesHook.totalFetched,
      searchRevenueSizes: revenueSizesHook.search,
      loadMoreRevenueSizes: revenueSizesHook.loadMore,
      showMoreRevenueSizes: revenueSizesHook.showMore,

      // Countries with search and pagination
      countries,
      countriesLoading,
      countriesError,
      countriesHasMore,
      searchCountries,
      loadMoreCountries,

      // Parent account autocomplete
      parentAccountSuggestions,
      searchParentAccounts,
      isSearchingParentAccounts,
      setIsSearchingParentAccounts,
      setParentAccountSuggestions,

      // Sales Campaigns
      salesCampaigns: salesCampaignsOptions,
      salesCampaignsLoading: salesCampaignsLoading,
      salesCampaignsError: salesCampaignsError,
      salesCampaignsHasMore: salesCampaignsHasMore,
      searchSalesCampaigns: searchSalesCampaignsWrapper,
      loadMoreSalesCampaigns: loadMoreSalesCampaignsWrapper,

      // Contact selection (matching IRM pattern)
      contacts: contactsOptions,
      contactsLoading: contactsLoading,
      contactsError: contactsError ? String(contactsError) : null,
      searchContacts: searchContactsWrapper,

      // Address lines management (legacy)
      addressLineCount,
      addAddressLine,
      removeAddressLine,

      // Dynamic addresses management
      addAddress,
      removeAddress,
      updateAddress,
      addAddressLineToAddress,
      removeAddressLineFromAddress,

      // Legacy compatibility (using employeeSizes data)
      numberOfEmployeesOptions: employeeSizesHook.allOptions
    }),
    [
      formValues,
      setFormValues,
      onSubmit,
      onCancel,
      hideActions,
      isLoading,
      error,
      businessAppContext,
      employeePositions,
      employeePositionsLoading,
      employeePositionsError,
      employeePositionsHasMore,
      loadMoreEmployeePositions,
      searchEmployees,
      legalFormsHook.allOptions,
      legalFormsHook.loading,
      legalFormsHook.error,
      legalFormsHook.hasMore,
      legalFormsHook.needsMoreData,
      legalFormsHook.displayCount,
      legalFormsHook.totalFetched,
      legalFormsHook.search,
      legalFormsHook.loadMore,
      legalFormsHook.showMore,
      industriesHook.allOptions,
      industriesHook.loading,
      industriesHook.error,
      industriesHook.hasMore,
      industriesHook.needsMoreData,
      industriesHook.displayCount,
      industriesHook.totalFetched,
      industriesHook.search,
      industriesHook.loadMore,
      industriesHook.showMore,
      employeeSizesHook.allOptions,
      employeeSizesHook.loading,
      employeeSizesHook.error,
      employeeSizesHook.hasMore,
      employeeSizesHook.needsMoreData,
      employeeSizesHook.displayCount,
      employeeSizesHook.totalFetched,
      employeeSizesHook.search,
      employeeSizesHook.loadMore,
      employeeSizesHook.showMore,
      revenueSizesHook.allOptions,
      revenueSizesHook.loading,
      revenueSizesHook.error,
      revenueSizesHook.hasMore,
      revenueSizesHook.needsMoreData,
      revenueSizesHook.displayCount,
      revenueSizesHook.totalFetched,
      revenueSizesHook.search,
      revenueSizesHook.loadMore,
      revenueSizesHook.showMore,
      countries,
      countriesLoading,
      countriesError,
      countriesHasMore,
      searchCountries,
      loadMoreCountries,
      parentAccountSuggestions,
      searchParentAccounts,
      isSearchingParentAccounts,
      setIsSearchingParentAccounts,
      setParentAccountSuggestions,
      salesCampaignsOptions,
      salesCampaignsLoading,
      salesCampaignsError,
      salesCampaignsHasMore,
      searchSalesCampaignsWrapper,
      loadMoreSalesCampaignsWrapper,
      contactsOptions,
      contactsLoading,
      contactsError,
      searchContactsWrapper,
      addressLineCount,
      addAddressLine,
      removeAddressLine,
      addAddress,
      removeAddress,
      updateAddress,
      addAddressLineToAddress,
      removeAddressLineFromAddress
    ]
  )

  return <AccountFormContext.Provider value={value}>{children}</AccountFormContext.Provider>
}

export const useAccountFormContext = (): AccountFormContextValue => {
  const context = useContext(AccountFormContext)
  if (!context) {
    throw new Error('useAccountFormContext must be used within AccountFormProvider')
  }
  return context
}
