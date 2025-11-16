import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerCampaigns, type SalesCampaignOption } from '@/common/data/customer/hooks/useCustomerCampaigns'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'
import { useGetCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'

interface AccountFormContextValue {
  // Account data - directly CustomerAccount
  account: CustomerAccount | null
  accountId: string | undefined
  accountLoading: boolean
  accountError: string | null
  setAccount: (account: Partial<CustomerAccount> | null) => void
  onSubmit: (account: Partial<CustomerAccount>) => Promise<void>
  onCancel: () => Promise<void>
  hideActions: boolean

  // Business app context for hooks
  businessAppContext: BusinessAppContextProps

  // Sales Campaigns
  salesCampaigns: SalesCampaignOption[]
  salesCampaignsLoading: boolean
  salesCampaignsError: string | null
  salesCampaignsHasMore: boolean
  searchSalesCampaigns: (searchTerm: string) => void
  loadMoreSalesCampaigns: () => void

  // Contact selection - now CustomerContact[]
  contacts: CustomerContact[]
  contactsLoading: boolean
  contactsError: string | null
  searchContacts: (search: string) => void
}

const AccountFormContext = createContext<AccountFormContextValue | null>(null)

interface AccountFormProviderProps {
  children: React.ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<CustomerAccount>
  onSubmit?: (account: Partial<CustomerAccount>) => Promise<void>
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
  // Extract accountId from businessAppContext
  const accountId =
    businessAppContext.additionalData?.accountId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.accountId

  // Fetch account data using declarative hook with automatic state management
  const {
    account: fetchedAccount,
    loading: accountLoading,
    error: accountError
  } = useCustomerAccount(businessAppContext, accountId)

  // Local state for form updates (separate from fetched data)
  const [account, setAccountState] = useState<CustomerAccount | null>(null)

  // Sync fetched account with local state
  useEffect(() => {
    if (fetchedAccount) {
      setAccountState(fetchedAccount)
    } else if (!accountId && Object.keys(initialValues).length > 0) {
      // New account - initialize with default values
      setAccountState(initialValues as CustomerAccount)
    }
  }, [fetchedAccount, accountId, initialValues])

  // Set account function
  const setAccount = useCallback((updates: Partial<CustomerAccount> | null) => {
    if (updates === null) {
      setAccountState(null)
    } else {
      setAccountState(prev => (prev ? { ...prev, ...updates } : (updates as CustomerAccount)))
    }
  }, [])

  // Sales Campaigns hook (defer fetching until select opens)
  const {
    options: salesCampaignsOptions,
    loading: salesCampaignsLoading,
    error: salesCampaignsError,
    hasMore: salesCampaignsHasMore,
    search: searchSalesCampaigns,
    loadMore: loadMoreSalesCampaigns,
    initialize: initializeSalesCampaigns
  } = useCustomerCampaigns(businessAppContext.accessToken, 20, false) // autoFetch=false

  // Contact selection hook - return CustomerContact[] directly
  const {
    options: contactsList,
    loading: contactsLoading,
    error: contactsError,
    search: searchContactsWrapper
  } = useGetCustomerContacts(businessAppContext, {
    withState: true,
    autoFetch: true,
    pageSize: 20,
    mapToSelectOptions: false // Return CustomerContact[] not SelectOption[]
  })

  // Create search wrapper for campaigns - initialize on first search if not yet loaded
  const searchSalesCampaignsWrapper = useCallback(
    (searchTerm: string) => {
      // Initialize on first use (when select opens)
      if (salesCampaignsOptions.length === 0 && !salesCampaignsLoading && !salesCampaignsError) {
        initializeSalesCampaigns()
      }

      if (searchTerm.trim().length === 0 || searchTerm.trim().length > 2) {
        searchSalesCampaigns(searchTerm)
      }
    },
    [
      searchSalesCampaigns,
      salesCampaignsOptions.length,
      salesCampaignsLoading,
      salesCampaignsError,
      initializeSalesCampaigns
    ]
  )

  const loadMoreSalesCampaignsWrapper = useCallback((): void => {
    loadMoreSalesCampaigns()
  }, [loadMoreSalesCampaigns])

  const value: AccountFormContextValue = {
    account,
    accountId,
    accountLoading,
    accountError,
    setAccount,
    onSubmit,
    onCancel,
    hideActions,
    businessAppContext,
    salesCampaigns: salesCampaignsOptions,
    salesCampaignsLoading,
    salesCampaignsError,
    salesCampaignsHasMore,
    searchSalesCampaigns: searchSalesCampaignsWrapper,
    loadMoreSalesCampaigns: loadMoreSalesCampaignsWrapper,
    contacts: contactsList as CustomerContact[],
    contactsLoading,
    contactsError,
    searchContacts: searchContactsWrapper
  }

  return <AccountFormContext.Provider value={value}>{children}</AccountFormContext.Provider>
}

export const useAccountFormContext = () => {
  const context = useContext(AccountFormContext)
  if (!context) {
    throw new Error('useAccountFormContext must be used within AccountFormProvider')
  }
  return context
}
