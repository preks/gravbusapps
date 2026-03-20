import React from 'react'
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Combobox,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { XIcon } from '@phosphor-icons/react'
import { Building2 } from 'lucide-react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { ContactTypeLabels } from '@/common/data/relations/constants/contactConstants'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface AccountSegmentOption {
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
  }
}

interface AccountSegmentProps {
  // Field array name in form (e.g., "investment.investmentAccounts" or "opportunityAccounts")
  fieldArrayName: string

  // Account ID field name in junction table (e.g., "investmentAccountId" or "accountId")
  accountIdFieldName: string

  // Account type field name in junction table (e.g., "investmentAccountTypeRef" or "accountTypeRef" or "contactType")
  accountTypeFieldName: string

  // Type selector mode: 'accountType' (catalog) or 'contactType' (enum)
  typeMode?: 'accountType' | 'contactType'

  // Catalog identifier for account type (required when typeMode is 'accountType')
  // e.g., 'CustomerAccountType:v1' for CRM, 'InvestmentAccountType:v1' for IRM
  accountTypeCatalogIdentifier?: string

  // Account search results
  accounts: AccountSegmentOption[]
  accountsLoading: boolean
  accountsError: string | null
  searchAccounts: (search: string) => void

  // Account contacts from loaded entity (with nested account) for display - same pattern as account form
  accountContacts?: any[]

  // Test ID prefix
  dataTestId?: string

  // Disabled state
  disabled?: boolean

  // Error message
  error?: string | null
}

// Separate component for each account item
const AccountItem: React.FC<{
  fieldArrayName: string
  accountIdFieldName: string
  accountTypeFieldName: string
  typeMode: 'accountType' | 'contactType'
  accountTypeCatalogIdentifier?: string
  accountIndex: number
  accountContacts?: any[]
  accounts: AccountSegmentOption[]
  onRemove: () => void
  dataTestId?: string
  disabled?: boolean
}> = ({
  fieldArrayName,
  accountIdFieldName,
  accountTypeFieldName,
  typeMode,
  accountTypeCatalogIdentifier,
  accountIndex,
  accountContacts,
  accounts,
  onRemove,
  dataTestId,
  disabled
}) => {
  const form = useFormContext<any>()

  // Watch the account ID to get display data
  const accountId = form.watch(`${fieldArrayName}.${accountIndex}.${accountIdFieldName}`)

  // Get account display data from accountContacts (from loaded entity) or accounts (search results)
  const accountData = React.useMemo(() => {
    const accountContact = accountContacts?.find((ac: any) => {
      const id = ac.account?.id || ac.investmentAccount?.id || ac.accountId || ac.investmentAccountId
      return id === accountId
    })
    const account = accountContact?.account || accountContact?.investmentAccount

    if (account) {
      return {
        name: account.name || account.displayName || 'Unknown Account',
        pictureThumbnail: account.pictureThumbnail,
        website: account.website
      }
    }

    // Fallback: search in accounts array (from search results)
    const searchAccount = accounts.find(a => a.id === accountId)
    if (searchAccount) {
      return {
        name: searchAccount.name || searchAccount.label,
        pictureThumbnail: searchAccount.pictureThumbnail,
        website: searchAccount.extraInfo?.website
      }
    }

    return {
      name: 'Unknown Account',
      pictureThumbnail: undefined,
      website: undefined
    }
  }, [accountId, accountContacts, accounts])

  return (
    <div className="gba:flex gba:items-center gba:gap-3 gba:py-2">
      {/* Avatar */}
      <Avatar className="gba:flex-shrink-0" size="sm">
        {accountData.pictureThumbnail ? (
          <AvatarImage src={`data:image/gif;base64,${accountData.pictureThumbnail}`} alt={accountData.name} />
        ) : (
          <AvatarFallback>
            <Building2 className="gba:h-4 gba:w-4" />
          </AvatarFallback>
        )}
      </Avatar>

      {/* Account Info */}
      <div className="gba:flex-1 gba:min-w-0">
        <h4 className="gba:text-sm gba:font-semibold gba:truncate">{accountData.name}</h4>
        {accountData.website && (
          <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{accountData.website}</div>
        )}
      </div>

      {/* Type Select (Account Type or Contact Type) */}
      <div className="gba:w-48">
        <FormField
          control={form.control}
          name={`${fieldArrayName}.${accountIndex}.${accountTypeFieldName}`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                {typeMode === 'contactType' ? (
                  <Select value={field.value || ''} onValueChange={v => field.onChange(v || '')} disabled={disabled}>
                    <SelectTrigger
                      data-testid={formatDataTestId(dataTestId || 'account-segment', `contact-type-${accountIndex}`)}
                    >
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ContactTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : accountTypeCatalogIdentifier ? (
                  <CatalogSelect
                    catalogIdentifier={accountTypeCatalogIdentifier}
                    value={field.value || ''}
                    onValueChange={v => field.onChange(v || '')}
                    data-testid={formatDataTestId(dataTestId || 'account-segment', `account-type-${accountIndex}`)}
                    placeholder="Select type..."
                    disabled={disabled}
                  />
                ) : null}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="gba:flex-shrink-0 gba:text-destructive hover:gba:text-destructive/80"
        data-testid={formatDataTestId(dataTestId || 'account-segment', `remove-account-${accountIndex}`)}
        aria-label={`Remove ${accountData.name}`}
        disabled={disabled}
      >
        <XIcon className="gba:w-4 gba:h-4" />
      </Button>
    </div>
  )
}

const AccountSegment: React.FC<AccountSegmentProps> = ({
  fieldArrayName,
  accountIdFieldName,
  accountTypeFieldName,
  typeMode = 'accountType',
  accountTypeCatalogIdentifier,
  accountContacts,
  accounts,
  accountsLoading,
  accountsError,
  searchAccounts,
  dataTestId = 'account-segment',
  disabled = false,
  error
}) => {
  const form = useFormContext<any>()

  // Validation: accountTypeCatalogIdentifier is required when typeMode is 'accountType'
  if (typeMode === 'accountType' && !accountTypeCatalogIdentifier) {
    console.error(
      '[AccountSegment] accountTypeCatalogIdentifier is required when typeMode is "accountType". ' +
        'Please provide the module-specific catalog identifier (e.g., CustomerAccountType:v1 or InvestmentAccountType:v1)'
    )
  }

  // Use field array for multiple accounts
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: fieldArrayName
  })

  // Get list of selected account IDs
  const selectedAccountIds = React.useMemo(() => {
    return new Set(fields.map((field: any) => field[accountIdFieldName]))
  }, [fields, accountIdFieldName])

  // Filter out already selected accounts
  const availableAccounts = React.useMemo(() => {
    return accounts
      .filter(acc => !selectedAccountIds.has(acc.id))
      .map(acc => ({
        value: acc.id,
        label: acc.extraInfo?.website ? `${acc.label} - ${acc.extraInfo.website}` : acc.label
      }))
  }, [accounts, selectedAccountIds])

  // Handle add account
  const handleAddAccount = (accountId: string) => {
    if (!accountId) return

    const selectedAccount = accounts.find(a => a.id === accountId)
    if (!selectedAccount) return

    // Create new account association - only store IDs, not nested objects
    // Display data comes from accountContacts prop (from GraphQL) or accounts search results
    const newAccount: any = {
      [accountIdFieldName]: accountId,
      [accountTypeFieldName]: null
    }

    append(newAccount)
  }

  // Get empty text for combobox
  const getEmptyText = () => {
    if (accountsLoading) return 'Loading...'
    if (accountsError) return 'Error loading accounts'
    return 'No accounts found'
  }

  return (
    <div className="gba:space-y-2" data-testid={dataTestId}>
      {/* Selected Accounts List */}
      {fields.length > 0 && (
        <div className="gba:space-y-0" data-testid={formatDataTestId(dataTestId, 'selected-list')}>
          {fields.map((field, index) => (
            <AccountItem
              key={field.id}
              fieldArrayName={fieldArrayName}
              accountIdFieldName={accountIdFieldName}
              accountTypeFieldName={accountTypeFieldName}
              typeMode={typeMode}
              accountTypeCatalogIdentifier={accountTypeCatalogIdentifier}
              accountIndex={index}
              accountContacts={accountContacts}
              accounts={accounts}
              onRemove={() => remove(index)}
              dataTestId={dataTestId}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Combobox for adding accounts */}
      <Combobox
        value=""
        onValueChange={handleAddAccount}
        options={availableAccounts}
        placeholder="Search and select account..."
        searchPlaceholder="Type to search..."
        emptyText={getEmptyText()}
        disabled={disabled || accountsLoading}
        loading={accountsLoading}
        onSearch={searchAccounts}
        data-testid={formatDataTestId(dataTestId, 'add-account-combobox')}
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

export default AccountSegment
