import React, { useState } from 'react'
import {
  Combobox,
  Alert,
  AlertDescription,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button
} from '@newwork/nw-design-system'
import { PiX } from 'react-icons/pi'
import { Building2 } from 'lucide-react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ContactType, getContactTypeLabel } from '@/common/data/relations/constants/contactConstants'

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
  contactType?: ContactType | string
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

  // Full account contacts with full account data (for email/phone extraction)
  accountContacts?: any[]

  // Initial account to display (from entity data)
  initialAccount?: any

  // Component behavior
  multiple?: boolean
  disabled?: boolean
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
  accountContacts = [],
  initialAccount,
  multiple = false,
  disabled = false
  // onNewAccount - can be added later if needed
}) => {
  // Helper function to extract ID from value (string or object)
  const getAccountId = (accountValue: string | AccountValue): string => {
    return typeof accountValue === 'object' ? accountValue.id : accountValue
  }

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
          typeof newAccount === 'object' ? newAccount : { id: newAccount, name: '', contactType: undefined }
        const existingAccount = internalValue.find(a => getAccountId(a) === newId)

        // If existing account has complete data, keep it
        if (existingAccount && typeof existingAccount === 'object' && existingAccount.name) {
          const hasCompleteData = Boolean(existingAccount.pictureThumbnail)

          if (hasCompleteData) {
            // Keep existing data, but update contactType if present in newAccount
            return {
              ...existingAccount,
              ...(newAccountObj.contactType && { contactType: newAccountObj.contactType })
            }
          }
        }

        // Otherwise use the new account (from accountContacts with full data from backend)
        return newAccountObj
      })
      setInternalValue(merged)
    } else {
      // IDs haven't changed, but data might have been updated
      // Merge: update contactType from value if it changed, but keep other data from internalValue if it exists
      const merged = normalizedValue.map(newAccount => {
        const newId = getAccountId(newAccount)
        const newAccountObj =
          typeof newAccount === 'object' ? newAccount : { id: newAccount, name: '', contactType: undefined }
        const existingAccount = internalValue.find(a => getAccountId(a) === newId)

        if (existingAccount && typeof existingAccount === 'object' && existingAccount.name) {
          // Keep existing data, but update contactType if it changed
          if (newAccountObj.contactType !== existingAccount.contactType) {
            return {
              ...existingAccount,
              contactType: newAccountObj.contactType
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
          contactType: undefined,
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
      contactType: undefined,
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

  // Handle contact type change
  const handleContactTypeChange = (accountId: string, contactType: ContactType | string) => {
    const newValue = internalValue.map(account => {
      const id = getAccountId(account)
      if (id === accountId) {
        return typeof account === 'object' ? { ...account, contactType } : { id: account, name: '', contactType }
      }
      return account
    })
    setInternalValue(newValue)
    onChange(multiple ? newValue : newValue[0] || '')
  }

  // Handle remove account (filters out)
  const handleRemoveAccount = (accountId: string) => {
    const newValue = internalValue.filter(a => getAccountId(a) !== accountId)
    setInternalValue(newValue)
    onChange(multiple ? newValue : newValue[0] || '')
  }

  // Filter out already selected accounts from available options
  // NOTE: For single-select mode, we DON'T filter out the selected account so the Combobox can display it
  const selectedAccountIds = new Set(internalValue.map(a => getAccountId(a)))
  const availableAccountOptions = React.useMemo(() => {
    return mergedAccounts
      .filter(a => {
        // For single-select: keep all accounts (including selected) so Combobox can display the value
        // For multiple-select: filter out already selected accounts
        return multiple ? !selectedAccountIds.has(a.id) : true
      })
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
    <div className="gba:space-y-2" data-testid={dataTestId || 'account-list'}>
      {/* For single-select mode: show combobox with selected value */}
      {!multiple && (
        <Combobox
          value={internalValue.length > 0 ? getAccountId(internalValue[0]) : ''}
          onValueChange={handleAddAccount}
          options={availableAccountOptions}
          placeholder="Search and select account..."
          searchPlaceholder="Search accounts..."
          emptyText={accountsLoading ? 'Loading...' : 'No accounts found'}
          disabled={disabled || accountsLoading}
          loading={accountsLoading}
          onSearch={searchAccounts}
          data-testid={formatDataTestId(dataTestId || 'account-list', 'combobox')}
        />
      )}

      {/* Selected Accounts List - only for multiple mode */}
      {multiple && internalValue.length > 0 && (
        <div className="gba:space-y-2" data-testid={formatDataTestId(dataTestId || 'account-list', 'selected-list')}>
          {internalValue.map((account, index) => {
            const accountId = getAccountId(account)
            const accountData = getAccountData(account)
            const accountValue =
              typeof account === 'object' ? account : { id: account, name: '', contactType: undefined }

            if (!accountData) return null

            return (
              <div
                key={accountId}
                className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:rounded-lg gba:bg-card"
                data-testid={formatDataTestId(dataTestId || 'account-list', `account-${index}`)}
              >
                {/* Avatar */}
                <Avatar size="sm" className="gba:flex-shrink-0">
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

                {/* Account Info */}
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:truncate gba:font-medium">{accountData.label}</div>
                  {accountData.extraInfo?.website && (
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                      {accountData.extraInfo.website}
                    </div>
                  )}
                </div>

                {/* Contact Type Select (only for multiple mode) */}
                <Select
                  value={accountValue.contactType || ''}
                  onValueChange={contactType => handleContactTypeChange(accountId, contactType)}
                  data-testid={formatDataTestId(dataTestId || 'account-list', `contact-type-${index}`)}
                >
                  <SelectTrigger className="gba:w-[180px]">
                    <SelectValue placeholder="Contact Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ContactType).map(type => (
                      <SelectItem key={type} value={type}>
                        {getContactTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveAccount(accountId)}
                  data-testid={formatDataTestId(dataTestId || 'account-list', `remove-${index}`)}
                  aria-label={`Remove ${accountData.label}`}
                >
                  <PiX className="gba:h-4 gba:w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Combobox for adding accounts - always visible in multiple mode */}
      {multiple && (
        <Combobox
          value=""
          onValueChange={handleAddAccount}
          options={availableAccountOptions}
          placeholder="Search and select account..."
          searchPlaceholder="Search accounts..."
          emptyText={accountsLoading ? 'Loading...' : 'No accounts found'}
          disabled={disabled || accountsLoading}
          loading={accountsLoading}
          onSearch={searchAccounts}
          data-testid={formatDataTestId(dataTestId || 'account-list', 'combobox')}
        />
      )}

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
