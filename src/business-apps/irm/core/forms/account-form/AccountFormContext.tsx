import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentAccount } from '@/common/data/investment/hooks/useInvestmentAccount'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'

interface AccountFormContextValue {
  // Account data - directly InvestmentAccount
  account: InvestmentAccount | null
  accountLoading: boolean
  accountError: string | null
  setAccount: (account: Partial<InvestmentAccount> | null) => void
  onSubmit: (account: Partial<InvestmentAccount>) => Promise<void>
  onCancel: () => Promise<void>
  hideActions: boolean

  // Business app context for hooks
  businessAppContext: BusinessAppContextProps

  // Contact selection - now InvestmentContact[]
  contacts: InvestmentContact[]
  contactsLoading: boolean
  contactsError: string | null
  searchContacts: (search: string) => void
}

const AccountFormContext = createContext<AccountFormContextValue | null>(null)

interface AccountFormProviderProps {
  children: React.ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<InvestmentAccount>
  onSubmit?: (account: Partial<InvestmentAccount>) => Promise<void>
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
  } = useInvestmentAccount(businessAppContext, accountId)

  // Local state for form updates (separate from fetched data)
  const [account, setAccountState] = useState<InvestmentAccount | null>(null)

  // Sync fetched account with local state
  useEffect(() => {
    if (fetchedAccount) {
      setAccountState(fetchedAccount)
    } else if (!accountId && Object.keys(initialValues).length > 0) {
      // New account - initialize with default values
      setAccountState(initialValues as InvestmentAccount)
    }
  }, [fetchedAccount, accountId, initialValues])

  // Set account function
  const setAccount = useCallback((updates: Partial<InvestmentAccount> | null) => {
    if (updates === null) {
      setAccountState(null)
    } else {
      setAccountState(prev => (prev ? { ...prev, ...updates } : (updates as InvestmentAccount)))
    }
  }, [])

  // Contact selection hook - return InvestmentContact[] directly
  const {
    options: contactsList,
    loading: contactsLoading,
    error: contactsError,
    search: searchContactsWrapper
  } = useGetInvestmentContacts(businessAppContext, {
    withState: true,
    autoFetch: true,
    pageSize: 20,
    mapToSelectOptions: false // Return InvestmentContact[] not SelectOption[]
  })

  const value: AccountFormContextValue = {
    account,
    accountLoading,
    accountError,
    setAccount,
    onSubmit,
    onCancel,
    hideActions,
    businessAppContext,
    contacts: contactsList as InvestmentContact[],
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
