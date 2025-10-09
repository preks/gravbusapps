import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { AccountFormValues, SelectOption, AccountContextState, Address } from '../types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeeById } from '@/business-apps/crm/common/forms/lead-form/hooks/useEmployeeById'
import { useEmployeePositions } from '@/business-apps/crm/common/forms/lead-form/hooks/useEmployeePositions'
import { useSearchableCatalog } from '../hooks/useSearchableCatalog'
import {
  LEGAL_FORM_CATALOG,
  INDUSTRY_CATALOG,
  EMPLOYEE_SIZE_CATALOG,
  REVENUE_SIZE_CATALOG
} from '../hooks/useLeadCatalogs'
import { useCurrenciesGraphQL } from '../hooks/useCurrenciesGraphQL'
import { useCountriesGraphQL } from '../hooks/useCountriesGraphQL'
import { useSalesCampaignsGraphQL } from '../../../hooks/useSalesCampaignsGraphQL'
import { useAccountData } from '../hooks/useAccountData'
import { useEmployeeByIdGraphQL } from '../hooks/useEmployeeByIdGraphQL'
import { useCountriesRegions } from '../../lead-form/hooks/useCountriesRegions'
import { useContactSelection } from '../hooks/useContactSelection'

interface AccountFormContextValue extends AccountContextState {
  formValues: AccountFormValues
  setFormValues: (updates: Partial<AccountFormValues>) => void
  onSubmit: (values: AccountFormValues) => Promise<void>
  onCancel: () => Promise<void>
  hideActions: boolean // Hide submit/cancel buttons when embedded
  isLoading: boolean
  error: string | null

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

  // Currencies with search and pagination
  currencies: SelectOption[]
  currenciesLoading: boolean
  currenciesError: string | null
  currenciesHasMore: boolean
  currenciesNeedsMoreData: boolean
  currenciesDisplayCount: number
  currenciesTotalFetched: number
  searchCurrencies: (search: string) => void
  loadMoreCurrencies: () => void
  showMoreCurrencies: () => void

  // Countries with search and pagination
  countries: SelectOption[]
  countriesLoading: boolean
  countriesError: string | null
  countriesHasMore: boolean
  searchCountries: (searchTerm: string) => void
  loadMoreCountries: () => void

  // Sales Campaigns
  salesCampaigns: SelectOption[]
  salesCampaignsLoading: boolean
  salesCampaignsError: string | null
  salesCampaignsHasMore: boolean
  searchSalesCampaigns: (searchTerm: string) => void
  loadMoreSalesCampaigns: () => void

  // Countries and Regions (for address section)
  countriesRegions: SelectOption[]
  countriesRegionsLoading: boolean
  countriesRegionsError: string | null
  countriesRegionsHasMore: boolean
  searchCountriesRegions: (searchTerm: string) => void
  loadMoreCountriesRegions: () => void
  regions: SelectOption[]
  regionsLoading: boolean
  regionsError: string | null
  searchRegions: (searchTerm: string) => void
  selectedCountryCode: string | null
  setSelectedCountry: (countryId: string) => void

  // Address management functions
  addAddress: () => void
  removeAddress: (addressId: string) => void
  updateAddress: (addressId: string, updates: Partial<Address>) => void

  // Contact selection
  contacts: SelectOption[]
  contactsLoading: boolean
  contactsError: string | null
  contactsHasMore: boolean
  searchContacts: (search: string) => void
  loadMoreContacts: () => void

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
  hideActions?: boolean // Hide submit/cancel buttons when embedded
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
    parentAccount: '',
    legalForm: '',
    industry: '',
    website: '',
    description: '',

    // ✅ REMOVED: Campaign Information - not relevant for InvestmentAccount
    // salesCampaignId: "", // Removed

    // Contact Information
    phone: '',
    email: '',
    // ✅ REMOVED: fax: "", // Not available in InvestmentAccount schema

    // Geographic Presence (simplified for InvestmentAccount)
    geographicPresence: '',

    // Address Information (updated to match API model)
    addresses: [
      {
        id: 'default-address',
        addressType: 'PRIMARY_ADDRESS', // Default to PRIMARY_ADDRESS
        addressLines: [''],
        postalCode: '',
        locality: '',
        regionRef: '',
        countryRef: ''
      }
    ],

    // Legacy fields kept for form compatibility but made optional
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
    // ✅ REMOVED: currency: "", // Not available in InvestmentAccount schema

    // Additional Information
    foundationDate: '',
    tickerSymbol: '',
    // ✅ REMOVED: sicCode: "", // Not available in InvestmentAccount schema

    // Contact Information
    contactIds: [], // ✅ NEW: Array of contact IDs for contact selection

    // System fields
    id: undefined,
    version: undefined,

    // Legacy fields
    address: '',
    state: '',

    ...initialValues
  })

  // Global state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-selection tracking
  const autoSelectionDone = useRef(false)

  // Catalog initialization tracking
  const hasInitialized = useRef(false)

  // Account data hook for fetching existing account data
  const {
    accountData,
    loading: accountDataLoading,
    error: accountDataError,
    mapAccountToFormValues
  } = useAccountData(businessAppContext)

  // Current user employee hook for auto-selection
  const {
    employee: currentUserEmployee,
    loading: currentUserLoading,
    error: currentUserError
  } = useEmployeeById({
    accessToken: businessAppContext.accessToken,
    employeeId: businessAppContext.userInfo?.employeeDetails?.employeeId
  })

  // 🎯 Lead owner employee hook - for lead conversion scenarios
  const isLeadConversion = businessAppContext.additionalData?.isLeadConversion === true
  const leadOwnerId = businessAppContext.additionalData?.leadOwnerId
  const {
    employeeData: leadOwnerEmployee,
    isLoading: leadOwnerLoading,
    error: leadOwnerError
  } = useEmployeeByIdGraphQL(businessAppContext.accessToken, isLeadConversion && leadOwnerId ? leadOwnerId : undefined)

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

  // Countries and Regions hook for address section
  const {
    countries: countriesRegions,
    countriesLoading: countriesRegionsLoading,
    countriesError: countriesRegionsError,
    countriesHasMore: countriesRegionsHasMore,
    searchCountries: searchCountriesRegions,
    loadMoreCountries: loadMoreCountriesRegions,
    regions,
    regionsLoading,
    regionsError,
    searchRegions,
    selectedCountryCode,
    setSelectedCountry
  } = useCountriesRegions(businessAppContext)

  // Contact selection hook
  const {
    contacts,
    isLoading: contactsLoading,
    hasMore: contactsHasMore,
    error: contactsError,
    searchContacts,
    loadMoreContacts
  } = useContactSelection(businessAppContext)

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

  // Currencies hook (simple like countries)
  const {
    options: currencies,
    loading: currenciesLoading,
    error: currenciesError,
    hasMore: currenciesHasMore,
    search: searchCurrencies,
    loadMore: loadMoreCurrencies
  } = useCurrenciesGraphQL({
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

    let finalEmployees: SelectOption[] = [...regularEmployees]

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
    if (accountData && accountData.InvestmentAccount?.[0]?.ownerEmployee) {
      const accountOwner = accountData.InvestmentAccount[0]
      const ownerEmployeeId = accountOwner?.ownerEmployee?.id
      const isAccountOwnerInList = finalEmployees.some(emp => emp.value === ownerEmployeeId)

      if (!isAccountOwnerInList) {
        const accountOwnerDisplayName =
          `${accountOwner?.ownerEmployee?.firstName} ${accountOwner?.ownerEmployee?.lastName}`.trim()

        const accountOwnerOption: SelectOption = {
          id: ownerEmployeeId || '',
          value: ownerEmployeeId || '',
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

    // 🎯 Add lead owner employee for lead conversion scenarios
    if (isLeadConversion && leadOwnerEmployee && leadOwnerId) {
      const isLeadOwnerInList = finalEmployees.some(emp => emp.value === leadOwnerId)

      if (!isLeadOwnerInList) {
        const leadOwnerDisplayName =
          leadOwnerEmployee.employee.displayName ||
          `${leadOwnerEmployee.employee.firstName} ${leadOwnerEmployee.employee.lastName}`.trim()
        const leadOwnerJobTitle = leadOwnerEmployee.jobPosition?.name || 'Lead Owner'
        const leadOwnerOrgUnit = leadOwnerEmployee.organizationalUnit?.name || 'Unknown'

        const leadOwnerOption: SelectOption = {
          id: leadOwnerId,
          value: leadOwnerId,
          label: `${leadOwnerDisplayName} - ${leadOwnerJobTitle}`,
          name: leadOwnerDisplayName,
          extraInfo: {
            picture: leadOwnerEmployee.employee.picture,
            pictureThumbnail: leadOwnerEmployee.employee.pictureThumbnail,
            jobPosition: leadOwnerJobTitle,
            organizationalUnit: leadOwnerOrgUnit,
            userId: leadOwnerEmployee.employee.userId
          }
        }

        // Add lead owner at the beginning for easy access
        finalEmployees.unshift(leadOwnerOption)
      }
    }

    return finalEmployees
  }, [employeePositionData, currentUserEmployee, accountData, isLeadConversion, leadOwnerEmployee, leadOwnerId])

  // Use dynamic forms from catalog (same as lead form)
  const legalForms: SelectOption[] = useMemo(() => {
    return legalFormsHook.allOptions
  }, [legalFormsHook.allOptions])

  const industries: SelectOption[] = useMemo(() => {
    return industriesHook.allOptions
  }, [industriesHook.allOptions])

  // Form value setter
  const setFormValues = useCallback((updates: Partial<AccountFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...updates }))
  }, [])

  // Address management functions
  const addAddress = useCallback(() => {
    const newAddress: Address = {
      id: `address-${Date.now()}`,
      addressType: 'PRIMARY_ADDRESS', // Default to PRIMARY_ADDRESS
      addressLines: [''],
      postalCode: '',
      locality: '',
      regionRef: '',
      countryRef: ''
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

  useEffect(() => {
    // Only populate if we have investment account data and the form doesn't already have this account's data
    if (
      accountData &&
      accountData.InvestmentAccount?.[0]?.id &&
      (!formValues.id || formValues.id !== accountData.InvestmentAccount[0].id)
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
    mapAccountToFormValues,
    businessAppContext.additionalData?.accountId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.accountId
  ])

  // Update global loading and error state to include account data loading
  useEffect(() => {
    setIsLoading(accountDataLoading)
  }, [accountDataLoading])

  useEffect(() => {
    setError(accountDataError)
  }, [accountDataError])

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
    // 6. We're NOT in a lead conversion context (preserve lead's owner)
    if (
      currentUserEmployee &&
      !formValues.owner &&
      !autoSelectionDone.current &&
      !currentAccountId && // Don't auto-select when editing existing account
      !accountData && // Don't auto-select when we have account data
      !businessAppContext.additionalData?.isLeadConversion // Don't auto-select during lead conversion
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

  // Context value

  const value: AccountFormContextValue = {
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

    // Currencies with search and pagination
    currencies,
    currenciesLoading,
    currenciesError,
    currenciesHasMore,
    currenciesNeedsMoreData: false, // Currencies are not paginated in this hook
    currenciesDisplayCount: currencies.length,
    currenciesTotalFetched: currencies.length,
    searchCurrencies: searchCurrencies,
    loadMoreCurrencies: loadMoreCurrencies,
    showMoreCurrencies: () => {}, // No show more for simple list

    // Countries with search and pagination
    countries,
    countriesLoading,
    countriesError,
    countriesHasMore,
    searchCountries,
    loadMoreCountries,

    // Sales Campaigns
    salesCampaigns: salesCampaignsOptions,
    salesCampaignsLoading: salesCampaignsLoading,
    salesCampaignsError: salesCampaignsError,
    salesCampaignsHasMore: salesCampaignsHasMore,
    searchSalesCampaigns: searchSalesCampaignsWrapper,
    loadMoreSalesCampaigns: loadMoreSalesCampaignsWrapper,

    // Countries and Regions (for address section)
    countriesRegions,
    countriesRegionsLoading,
    countriesRegionsError,
    countriesRegionsHasMore,
    searchCountriesRegions,
    loadMoreCountriesRegions,
    regions,
    regionsLoading,
    regionsError,
    searchRegions,
    selectedCountryCode,
    setSelectedCountry,

    // Address management functions
    addAddress,
    removeAddress,
    updateAddress,

    // Contact selection
    contacts,
    contactsLoading,
    contactsError,
    contactsHasMore,
    searchContacts,
    loadMoreContacts,

    // Legacy compatibility (using employeeSizes data)
    numberOfEmployeesOptions: employeeSizesHook.allOptions
  }

  return <AccountFormContext.Provider value={value}>{children}</AccountFormContext.Provider>
}

export const useAccountFormContext = (): AccountFormContextValue => {
  const context = useContext(AccountFormContext)
  if (!context) {
    throw new Error('useAccountFormContext must be used within AccountFormProvider')
  }
  return context
}
