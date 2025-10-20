import React, { useState, useEffect } from 'react'
import { Combobox, Label, Alert, AlertDescription } from '@newwork/nw-design-system'
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
  accounts,
  accountsLoading,
  accountsError,
  searchAccounts
}) => {
  const [mergedAccounts, setMergedAccounts] = useState<SelectOption[]>([])

  // Extract account ID helper
  const getAccountId = (accountValue: string | { id: string; name: string }): string => {
    return typeof accountValue === 'object' ? accountValue.id : accountValue
  }

  // Get current account ID (handles array or single value)
  const currentAccountId = Array.isArray(value)
    ? value.length > 0
      ? getAccountId(value[0])
      : ''
    : value
      ? getAccountId(value)
      : ''

  // Merge pre-selected account with loaded accounts
  useEffect(() => {
    const preSelectedAccounts: SelectOption[] = []

    // Handle both array and single value formats
    const accountValue = Array.isArray(value) ? (value.length > 0 ? value[0] : null) : value

    if (accountValue && typeof accountValue === 'object' && accountValue.id && accountValue.name) {
      const existsInLoadedAccounts = accounts.some(a => a.id === accountValue.id)
      if (!existsInLoadedAccounts) {
        preSelectedAccounts.push({
          id: accountValue.id,
          value: accountValue.id,
          label: accountValue.name,
          name: accountValue.name
        })
      }
    }

    // Merge: pre-selected account first, then loaded accounts
    setMergedAccounts([...preSelectedAccounts, ...accounts])
  }, [value, accounts])

  // Helper to get account label for display
  const getAccountLabel = (): string | undefined => {
    if (!currentAccountId) return undefined

    // Check if value has a name property
    const accountValue = Array.isArray(value) ? (value.length > 0 ? value[0] : null) : value
    if (accountValue && typeof accountValue === 'object' && accountValue.name) {
      return accountValue.name
    }

    // Try to find in the merged accounts list
    const account = mergedAccounts.find(a => a.id === currentAccountId)
    return account?.label
  }

  // Handle account selection
  const handleSelectAccount = (accountId: string) => {
    if (!accountId) return

    const selectedAccount = mergedAccounts.find(a => a.id === accountId)
    if (!selectedAccount) return

    // Return format based on input format
    if (Array.isArray(value)) {
      onChange([{ id: accountId, name: selectedAccount.label }])
    } else {
      onChange({ id: accountId, name: selectedAccount.label })
    }
  }

  // Prepare options for Combobox
  const comboboxOptions = mergedAccounts.map(account => ({
    value: account.id as string,
    label: account.label
  }))

  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-sm gba:font-medium gba:text-gray-900">{label}</Label>

      {/* Combobox for account selection */}
      <Combobox
        value={currentAccountId}
        onValueChange={handleSelectAccount}
        options={comboboxOptions}
        placeholder="Search and select account..."
        searchPlaceholder="Search accounts..."
        emptyText={accountsLoading ? 'Loading...' : 'No accounts found'}
        disabled={accountsLoading}
        loading={accountsLoading}
        onSearch={searchAccounts}
        data-testid={dataTestId || 'account-selector'}
      />

      {/* Display selected account label if available */}
      {currentAccountId && getAccountLabel() && (
        <div
          className="gba:text-sm gba:text-muted-foreground gba:mt-1"
          data-testid={formatDataTestId(dataTestId || 'account-selector', 'selected-label')}
        >
          Selected: {getAccountLabel()}
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
