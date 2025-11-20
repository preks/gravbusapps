import React, { useState, useEffect } from 'react'
import { Combobox, Label, Alert, AlertDescription, Badge } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
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

interface AccountSelectProps {
  value: string | { id: string; name: string } | Array<string | { id: string; name: string }>
  onChange: (accountId: string | { id: string; name: string } | Array<string | { id: string; name: string }>) => void
  dataTestId?: string
  error?: string | null
  label?: string
  multiple?: boolean // ✅ NEW: Control single vs multi-select mode

  // Account data passed as props
  accounts: SelectOption[]
  accountsLoading: boolean
  accountsError: string | null
  searchAccounts: (search: string) => void
}

const AccountSelect: React.FC<AccountSelectProps> = ({
  value,
  onChange,
  dataTestId,
  error,
  label = 'Related Account',
  multiple = true, // ✅ Default to multi-select for backward compatibility with contact form
  accounts,
  accountsLoading,
  accountsError,
  searchAccounts
}) => {
  const [mergedAccounts, setMergedAccounts] = useState<SelectOption[]>([])

  // Normalize value to always work with arrays internally
  const normalizedValue = Array.isArray(value) ? value : value ? [value] : []

  // Merge pre-selected accounts with loaded accounts
  useEffect(() => {
    const preSelectedAccounts: SelectOption[] = []

    // Add pre-selected accounts that aren't already in the loaded list
    if (normalizedValue.length > 0) {
      normalizedValue.forEach(val => {
        if (typeof val === 'object' && val.id && val.name) {
          const existsInLoadedAccounts = accounts.some(a => a.id === val.id)
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
    setMergedAccounts([...preSelectedAccounts, ...accounts])
  }, [value, accounts]) // ✅ FIXED: Removed normalizedValue to prevent infinite loop

  // Helper function to extract ID from value (string or object)
  const getAccountId = (accountValue: string | { id: string; name: string }): string => {
    return typeof accountValue === 'object' ? accountValue.id : accountValue
  }

  // Helper to get account name for display
  const getAccountName = (accountValue: string | { id: string; name: string }): string => {
    if (typeof accountValue === 'object' && accountValue.name) {
      return accountValue.name
    }

    // Try to find in the merged accounts list
    const account = mergedAccounts.find(a => a.id === accountValue)
    return account?.label || 'Unknown Account'
  }

  // Handle add/select account
  const handleSelectAccount = (accountId: string) => {
    if (!accountId) return

    const selectedAccount = mergedAccounts.find(a => a.id === accountId)
    if (!selectedAccount) return

    const accountObject = { id: accountId, name: selectedAccount.label }

    if (multiple) {
      // Multi-select: Add to existing accounts array
      if (Array.isArray(value)) {
        onChange([...value, accountObject])
      } else {
        onChange([accountObject])
      }
    } else {
      // Single-select: Replace with new selection
      if (Array.isArray(value)) {
        onChange([accountObject])
      } else {
        onChange(accountObject)
      }
    }
  }

  // Handle remove account (only for multi-select)
  const handleRemoveAccount = (accountId: string) => {
    const filtered = normalizedValue.filter(a => getAccountId(a) !== accountId)
    if (Array.isArray(value)) {
      onChange(filtered)
    } else {
      onChange(filtered[0] || '')
    }
  }

  // Filter out already selected accounts from available options
  const selectedAccountIds = new Set(normalizedValue.map(a => getAccountId(a)))
  const availableAccountOptions = mergedAccounts
    .filter(a => !selectedAccountIds.has(a.id as string))
    .map(a => ({ value: a.id as string, label: a.label }))

  // For single-select, get the current selection
  const currentAccountId = normalizedValue.length > 0 ? getAccountId(normalizedValue[0]) : ''

  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-sm gba:font-medium gba:text-gray-900">{label}</Label>

      {/* Combobox for adding/selecting accounts */}
      <Combobox
        value={multiple ? '' : currentAccountId}
        onValueChange={handleSelectAccount}
        options={
          multiple ? availableAccountOptions : mergedAccounts.map(a => ({ value: a.id as string, label: a.label }))
        }
        placeholder={multiple ? 'Add account...' : 'Search and select account...'}
        searchPlaceholder="Search accounts..."
        emptyText={accountsLoading ? 'Loading...' : 'No accounts found'}
        disabled={accountsLoading}
        loading={accountsLoading}
        onSearch={searchAccounts}
        data-testid={dataTestId || 'account-selector'}
      />

      {/* Multi-select: Selected accounts displayed as badges */}
      {multiple && normalizedValue.length > 0 && (
        <div
          className="gba:space-y-2 gba:mt-3"
          data-testid={formatDataTestId(dataTestId || 'account-selector', 'selected-list')}
        >
          {normalizedValue.map((account, index) => {
            const accountId = getAccountId(account)
            const accountName = getAccountName(account)
            return (
              <div
                key={accountId}
                className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:border gba:rounded gba:bg-card"
                data-testid={formatDataTestId(dataTestId || 'account-selector', `selected-account-${index}`)}
              >
                <Badge variant="secondary" className="gba:flex-1">
                  {accountName}
                </Badge>
                <button
                  type="button"
                  onClick={() => handleRemoveAccount(accountId)}
                  className="gba:flex-shrink-0 gba:text-destructive hover:gba:text-destructive/80"
                  data-testid={formatDataTestId(dataTestId || 'account-selector', `remove-account-${index}`)}
                  aria-label={`Remove ${accountName}`}
                >
                  <X className="gba:h-4 gba:w-4" />
                </button>
              </div>
            )
          })}
        </div>
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
