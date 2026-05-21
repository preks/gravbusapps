import React, { useState } from 'react'
import {
  Combobox,
  Alert,
  AlertDescription,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button
} from '@newwork/nw-design-system'
import { XIcon } from '@phosphor-icons/react'
import { Building2 } from 'lucide-react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { CatalogSelect } from '@/components/catalog-select'
import { INVESTMENT_ACCOUNT_TYPE } from '@/common/data/investment/constants/investmentCatalogs'
export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
  pictureThumbnail?: string
  extraInfo?: {
    businessKey?: string
    code?: string
    website?: string
    email?: string
    phone?: string
    ownerEmployee?: {
      firstName?: string
      lastName?: string
    }
  }
}

interface AccountValue {
  id: string
  name: string
  accountType?: string // Catalog reference ID
  pictureThumbnail?: string
}

interface AccountSelectProps {
  value: AccountValue | Array<string | AccountValue> | string | null
  onChange: (
    accountIds: string | Array<string | AccountValue> | AccountValue | { id: string; name: string } | null
  ) => void
  dataTestId?: string
  error?: string | null

  // Account data passed as props
  accounts: SelectOption[]
  accountsLoading: boolean
  accountsError: string | null
  searchAccounts: (search: string) => void
  hasMore?: boolean
  onLoadMore?: () => void

  // Full account contacts with full account data (for email/phone extraction)
  accountContacts?: any[]

  // Initial account to display (from entity data)
  initialAccount?: any

  // Component behavior
  disabled?: boolean

  /** When false, hides opportunity–account type catalog (e.g. CRM activity “related account” picker) */
  showAccountType?: boolean

  // Note: multiple mode is automatically detected from value type
  // - Array value = multiple mode
  // - Single value = single mode
}

const AccountSelect: React.FC<AccountSelectProps> = ({
  value,
  onChange,
  dataTestId,
  error,
  accounts,
  accountsLoading,
  accountsError,
  searchAccounts,
  hasMore,
  onLoadMore,
  accountContacts = [],
  initialAccount,
  disabled = false,
  showAccountType = true
  // onNewAccount - can be added later if needed
}) => {
  // Helper function to extract ID from value (string or object)
  const getAccountId = (accountValue: string | AccountValue): string => {
    return typeof accountValue === 'object' ? accountValue.id : accountValue
  }

  // Derive multiple mode from value type (array = multiple, single value = single)
  const multiple = React.useMemo(() => {
    return Array.isArray(value)
  }, [value])

  // Normalize value to always work with arrays internally
  // If value is string and initialAccount exists, create object with name (like EmployeeSelect does with initialEmployee)
  const normalizedValue: Array<string | AccountValue> = React.useMemo(() => {
    if (Array.isArray(value)) return value
    if (value === null || value === '') return []
    // If value is string and initialAccount matches, create object with name from initialAccount
    if (typeof value === 'string' && initialAccount?.id === value) {
      return [
        {
          id: value,
          name: initialAccount.name || '',
          pictureThumbnail: initialAccount.pictureThumbnail
        }
      ]
    }
    return [value]
  }, [value, initialAccount])

  // Internal state to preserve account names when adding new accounts
  const [internalValue, setInternalValue] = useState<Array<string | AccountValue>>(normalizedValue)
  const [mergedAccounts, setMergedAccounts] = useState<SelectOption[]>([])

  // Sync internal value with prop value
  React.useEffect(() => {
    const currentIds = new Set(internalValue.map(v => getAccountId(v)))
    const newIds = new Set(normalizedValue.map(v => getAccountId(v)))

    // Only update if IDs actually changed (account added/removed)
    const idsChanged =
      currentIds.size !== newIds.size ||
      [...currentIds].some(id => !newIds.has(id)) ||
      [...newIds].some(id => !currentIds.has(id))

    if (idsChanged) {
      const merged = normalizedValue.map(newAccount => {
        const newId = getAccountId(newAccount)
        const newAccountObj =
          typeof newAccount === 'object' ? newAccount : { id: newAccount, name: '', accountType: undefined }
        const existingAccount = internalValue.find(a => getAccountId(a) === newId)

        // If existing account has complete data, keep it
        if (existingAccount && typeof existingAccount === 'object' && existingAccount.name) {
          const hasCompleteData = Boolean(existingAccount.pictureThumbnail)

          if (hasCompleteData) {
            // Keep existing data, but update accountType if present in newAccount
            return {
              ...existingAccount,
              ...(newAccountObj.accountType && { accountType: newAccountObj.accountType })
            }
          }
        }

        // Otherwise use the new account (from accountContacts with full data from backend)
        return newAccountObj
      })
      setInternalValue(merged)
    } else {
      // IDs haven't changed, but data might have been updated
      // Merge: update accountType from value if it changed, but keep other data from internalValue if it exists
      const merged = normalizedValue.map(newAccount => {
        const newId = getAccountId(newAccount)
        const newAccountObj =
          typeof newAccount === 'object' ? newAccount : { id: newAccount, name: '', accountType: undefined }
        const existingAccount = internalValue.find(a => getAccountId(a) === newId)

        if (existingAccount && typeof existingAccount === 'object' && existingAccount.name) {
          // Keep existing data, but update accountType if it changed
          if (newAccountObj.accountType !== existingAccount.accountType) {
            return {
              ...existingAccount,
              accountType: newAccountObj.accountType
            }
          }
          return existingAccount
        }

        return newAccountObj
      })
      setInternalValue(merged)
    }
  }, [normalizedValue])

  // Ensure initialAccount is included in options if it exists and matches value
  const accountsWithInitial = React.useMemo(() => {
    const currentAccountId = normalizedValue.length > 0 ? getAccountId(normalizedValue[0]) : null

    if (!initialAccount) {
      return accounts
    }
    // Check if initialAccount is already in accounts
    const isInAccounts = accounts.some(a => a.id === initialAccount.id)
    if (isInAccounts) {
      return accounts
    }
    // Add initialAccount to accounts if it matches the current value
    if (currentAccountId === initialAccount.id) {
      return [
        {
          id: initialAccount.id,
          value: initialAccount.id,
          label: initialAccount.name || 'Unknown Account',
          name: initialAccount.name || 'Unknown Account',
          pictureThumbnail: initialAccount.pictureThumbnail
        },
        ...accounts
      ]
    }
    return accounts
  }, [accounts, initialAccount, normalizedValue])

  // Merge pre-selected accounts with loaded accounts
  React.useEffect(() => {
    const preSelectedAccounts: SelectOption[] = []

    // Add pre-selected accounts that aren't already in the loaded list
    if (internalValue.length > 0) {
      internalValue.forEach(val => {
        if (typeof val === 'object' && val.id && val.name) {
          const existsInLoadedAccounts = accountsWithInitial.some(a => a.id === val.id)
          if (!existsInLoadedAccounts) {
            preSelectedAccounts.push({
              id: val.id,
              value: val.id,
              label: val.name,
              name: val.name
            })
          }
        }
      })
    }

    // Merge: pre-selected accounts first, then loaded accounts
    setMergedAccounts([...preSelectedAccounts, ...accountsWithInitial])
  }, [internalValue, accountsWithInitial])

  // Helper to get account data for display
  const getAccountData = (accountValue: string | AccountValue): SelectOption | null => {
    const accountId = getAccountId(accountValue)

    // Extract data from accountValue
    const nameFromValue = typeof accountValue === 'object' && accountValue.name ? accountValue.name : null
    const pictureThumbnailFromValue = typeof accountValue === 'object' ? accountValue.pictureThumbnail : undefined

    // Priority 1: If accountValue has complete data, use it
    if (typeof accountValue === 'object' && accountValue.name && pictureThumbnailFromValue) {
      // Try to get email/phone from accountContacts if available
      const accountContact = accountContacts.find(
        (ac: any) => (ac.account?.id || ac.accountId || ac.account) === accountId
      )

      const emailChannel = accountContact?.account?.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'EMAIL' || ch.communicationChannelRef?.includes(':EMAIL')
      )
      const phoneChannel = accountContact?.account?.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'PHONE' || ch.communicationChannelRef?.includes(':PHONE')
      )

      return {
        id: accountId,
        value: accountId,
        label: accountValue.name,
        name: accountValue.name,
        pictureThumbnail: pictureThumbnailFromValue,
        extraInfo: {
          email: emailChannel?.value || undefined,
          phone: phoneChannel?.value || undefined
        }
      }
    }

    // Priority 2: Try to find full account data in accountContacts
    const accountContact = accountContacts.find(
      (ac: any) => (ac.account?.id || ac.accountId || ac.account) === accountId
    )

    if (accountContact?.account) {
      const account = accountContact.account
      const displayName = nameFromValue || account.name || 'Unknown Account'

      // Extract email and phone from communicationChannels
      const emailChannel = account.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'EMAIL' || ch.communicationChannelRef?.includes(':EMAIL')
      )
      const phoneChannel = account.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'PHONE' || ch.communicationChannelRef?.includes(':PHONE')
      )

      return {
        id: accountId,
        value: accountId,
        label: displayName,
        name: displayName,
        pictureThumbnail: account.pictureThumbnail || undefined,
        extraInfo: {
          email: emailChannel?.value || undefined,
          phone: phoneChannel?.value || undefined,
          website: account.website || undefined
        }
      }
    }

    // Priority 3: Try initialAccount (from entity data, like initialEmployee in EmployeeSelect)
    if (initialAccount?.id === accountId) {
      return {
        id: accountId,
        value: accountId,
        label: initialAccount.name || 'Unknown Account',
        name: initialAccount.name || 'Unknown Account',
        pictureThumbnail: initialAccount.pictureThumbnail,
        extraInfo: {
          website: initialAccount.website || undefined
        }
      }
    }

    // Priority 4: Try mergedAccounts for additional data (from search results)
    const accountFromMerged = mergedAccounts.find(a => a.id === accountId)
    if (accountFromMerged) {
      return {
        ...accountFromMerged,
        label: nameFromValue || accountFromMerged.label || accountFromMerged.name,
        name: nameFromValue || accountFromMerged.name,
        pictureThumbnail: accountFromMerged.pictureThumbnail,
        extraInfo: accountFromMerged.extraInfo
      }
    }

    // Priority 5: Fallback - use name from value if available
    if (nameFromValue) {
      return {
        id: accountId,
        value: accountId,
        label: nameFromValue,
        name: nameFromValue
      }
    }

    return null
  }

  // Handle add account (appends to array or replaces for single-select)
  const handleAddAccount = (accountId: string) => {
    if (!accountId) return

    const selectedAccount = mergedAccounts.find(a => a.id === accountId)
    if (!selectedAccount) {
      // Fallback: try to find in accounts list
      const accountFromList = accountsWithInitial.find(a => a.id === accountId)
      if (accountFromList) {
        const newAccount: AccountValue = {
          id: accountId,
          name: accountFromList.label || accountFromList.name,
          accountType: undefined,
          pictureThumbnail: accountFromList.pictureThumbnail
        }
        const newValue = multiple ? [...internalValue, newAccount] : [newAccount]
        setInternalValue(newValue)

        // Emit correct format based on multiple flag
        if (multiple) {
          onChange(newValue)
        } else {
          onChange(newAccount)
        }
      }
      return
    }

    // Add to existing accounts array with FULL account data
    const newAccount: AccountValue = {
      id: accountId,
      name: selectedAccount.label || selectedAccount.name,
      accountType: undefined,
      pictureThumbnail: selectedAccount.pictureThumbnail
    }
    const newValue = multiple ? [...internalValue, newAccount] : [newAccount]
    setInternalValue(newValue)

    // Emit correct format based on multiple flag
    if (multiple) {
      onChange(newValue)
    } else {
      onChange(newAccount)
    }
  }

  // Handle account type change - uses index instead of ID to avoid closure issues
  const handleAccountTypeChange = (index: number, accountType: string | null) => {
    const newValue = internalValue.map((account, idx) => {
      if (idx === index) {
        return typeof account === 'object'
          ? { ...account, accountType: accountType || undefined }
          : { id: account, name: '', accountType: accountType || undefined }
      }
      return account
    })
    setInternalValue(newValue)
    onChange(multiple ? newValue : newValue[0] || '')
  }

  // Handle remove account (filters out or clears in single mode)
  const handleRemoveAccount = (accountId: string) => {
    const newValue = internalValue.filter(a => getAccountId(a) !== accountId)
    setInternalValue(newValue)
    // For single mode, emit null when cleared; for multiple mode, emit the array
    onChange(multiple ? newValue : newValue[0] || null)
  }

  // Get empty text for combobox (like ContactSelect)
  const getEmptyText = () => {
    if (accountsLoading) return 'Loading...'
    if (accountsError) return 'Error loading accounts'
    return 'No accounts found'
  }

  // Filter out already selected accounts from available options
  const selectedAccountIds = new Set(internalValue.map(a => getAccountId(a)))
  const availableAccountOptions = React.useMemo(() => {
    return mergedAccounts
      .filter(a => !selectedAccountIds.has(a.id))
      .map(a => {
        const accountData = getAccountData({ id: a.id, name: a.label || a.name })
        // Combobox only supports string labels, so we provide name + website
        const label = accountData?.extraInfo?.website
          ? `${accountData.label} - ${accountData.extraInfo.website}`
          : accountData?.label || a.label
        return {
          value: a.id,
          label
        }
      })
  }, [mergedAccounts, selectedAccountIds])

  return (
    <div className="gba:space-y-2 gba:w-full gba:min-w-0" data-testid={dataTestId || 'account-list'}>
      {/* Selected Accounts List - shown for both single and multiple modes */}
      {internalValue.length > 0 && (
        <div
          className="gba:space-y-0 gba:w-full gba:min-w-0"
          data-testid={formatDataTestId(dataTestId || 'account-list', 'selected-list')}
        >
          {internalValue.map((account, index) => {
            const accountId = getAccountId(account)
            const accountData = getAccountData(account)
            const accountValue =
              typeof account === 'object' ? account : { id: account, name: '', accountType: undefined }

            if (!accountData) return null

            return (
              <div
                key={accountId}
                className="gba:flex gba:items-center gba:gap-3 gba:py-2 gba:w-full gba:min-w-0 gba:overflow-hidden"
                data-testid={formatDataTestId(dataTestId || 'account-list', `account-card-${index}`)}
              >
                {/* Avatar */}
                <Avatar className="gba:flex-shrink-0" size="sm">
                  {accountData.pictureThumbnail ? (
                    <AvatarImage
                      src={`data:image/gif;base64,${accountData.pictureThumbnail}`}
                      alt={accountData.label}
                    />
                  ) : (
                    <AvatarFallback>
                      <Building2 className="gba:h-4 gba:w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* Account Info - flex-1 min-w-0 so name truncates within available width */}
                <div className="gba:flex-1 gba:min-w-0 gba:overflow-hidden">
                  <h4 className="gba:text-sm gba:font-semibold gba:truncate" title={accountData.label}>
                    {accountData.label}
                  </h4>
                  {accountData.extraInfo?.website && (
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                      {accountData.extraInfo.website}
                    </div>
                  )}
                </div>

                {/* Account type (IRM opportunity roles) — hidden for simple CRM pickers */}
                {showAccountType ? (
                  <div className="gba:w-36 gba:flex-shrink-0 gba:min-w-0">
                    <CatalogSelect
                      catalogIdentifier={INVESTMENT_ACCOUNT_TYPE}
                      value={accountValue.accountType || ''}
                      onValueChange={accountType => handleAccountTypeChange(index, accountType)}
                      className="gba:w-full gba:min-w-0 gba:text-sm"
                      data-testid={formatDataTestId(dataTestId || 'account-list', `account-type-${index}`)}
                      placeholder="Select type..."
                    />
                  </div>
                ) : null}

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveAccount(accountId)}
                  className="gba:flex-shrink-0 !gba:text-destructive hover:!gba:text-destructive/80"
                  data-testid={formatDataTestId(dataTestId || 'account-list', `remove-account-${index}`)}
                  aria-label={`Remove ${accountData.label}`}
                >
                  <XIcon className="gba:w-4 gba:h-4 !gba:text-destructive" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Combobox for selecting/adding accounts - always visible */}
      <Combobox
        value=""
        onValueChange={handleAddAccount}
        options={availableAccountOptions}
        placeholder="Search and select account..."
        searchPlaceholder="Type to search..."
        emptyText={getEmptyText()}
        disabled={disabled || accountsLoading}
        loading={accountsLoading}
        onSearch={searchAccounts}
        searchDebounce={300}
        hasMore={Boolean(hasMore)}
        onLoadMore={onLoadMore}
        data-testid={formatDataTestId(dataTestId || 'account-list', 'add-account-combobox')}
      />

      {/* Error Display */}
      {(error || accountsError) && (
        <Alert variant="destructive">
          <AlertDescription>{error || accountsError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default AccountSelect
