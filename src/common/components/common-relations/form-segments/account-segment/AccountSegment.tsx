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
  SelectValue,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  useTranslation
} from '@newwork/nw-design-system'
import { XIcon, PencilIcon, PlusIcon } from '@phosphor-icons/react'
import { Building2 } from 'lucide-react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { ContactTypeLabels } from '@/common/data/relations/constants/contactConstants'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import translations from './_i18n'

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
  hasMore?: boolean
  onLoadMore?: () => void

  // Account contacts from loaded entity (with nested account) for display - same pattern as account form
  accountContacts?: any[]

  // Controlled account-contact rows. Used by contact forms so draft accounts render from
  // the form field value, matching ContactSelect in the account form.
  accountContactsValue?: any[]
  onAccountContactsChange?: (accountContacts: any[]) => void

  // Test ID prefix
  dataTestId?: string

  // Disabled state
  disabled?: boolean

  // Error message
  error?: string | null

  // Inline-create affordance: when provided, renders a "+" button beside the combobox
  // that invokes this callback (the parent should open the inline-create dialog).
  onCreateNew?: () => void

  // Inline-edit affordance: when provided, draft rows render an Edit pencil that
  // invokes this callback with the field-array index of the draft entry.
  onEditDraft?: (index: number) => void
}

// Separate component for each account item
const AccountItem: React.FC<{
  fieldArrayName: string
  accountIdFieldName: string
  accountTypeFieldName: string
  typeMode: 'accountType' | 'contactType'
  accountTypeCatalogIdentifier?: string
  accountIndex: number
  accountContactEntry?: any
  accountContacts?: any[]
  accounts: AccountSegmentOption[]
  onRemove: () => void
  onTypeChange?: (value: string) => void
  onEdit?: () => void
  dataTestId?: string
  disabled?: boolean
}> = ({
  fieldArrayName,
  accountIdFieldName,
  accountTypeFieldName,
  typeMode,
  accountTypeCatalogIdentifier,
  accountIndex,
  accountContactEntry,
  accountContacts,
  accounts,
  onRemove,
  onTypeChange,
  onEdit,
  dataTestId,
  disabled
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Watch the account ID to get display data
  const accountId =
    accountContactEntry?.[accountIdFieldName] ??
    accountContactEntry?.accountId ??
    accountContactEntry?.investmentAccountId ??
    form.watch(`${fieldArrayName}.${accountIndex}.${accountIdFieldName}`)
  // Watch draft fields so we re-render when drafts are created/edited
  const isDraft: boolean =
    accountContactEntry?.__isDraft === true || form.watch(`${fieldArrayName}.${accountIndex}.__isDraft`) === true
  const draftAccount = accountContactEntry?.account ?? form.watch(`${fieldArrayName}.${accountIndex}.account`)
  const accountTypeValue = accountContactEntry?.[accountTypeFieldName] ?? ''

  // Get account display data from accountContacts (from loaded entity), drafts, or accounts (search results)
  const accountData = React.useMemo(() => {
    if (isDraft && draftAccount) {
      return {
        name: draftAccount.name || draftAccount.displayName || 'New Account',
        pictureThumbnail: draftAccount.pictureThumbnail,
        website: draftAccount.website
      }
    }

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
  }, [accountId, accountContacts, accounts, isDraft, draftAccount])

  // Draft differentiation: name renders in cyan, plus a "Draft" tooltip on hover.
  // Mirrors ContactSelect for parity.
  const nameNode = (
    <h4
      className={`gba:text-sm gba:font-semibold gba:truncate ${isDraft ? 'gba:text-cyan-600' : ''}`}
      data-testid={formatDataTestId(dataTestId || 'account-segment', `item-name-${accountIndex}`)}
    >
      {accountData.name}
    </h4>
  )

  const renderTypeSelector = (value: string, onValueChange: (value: string) => void) => {
    if (typeMode === 'contactType') {
      return (
        <Select value={value} onValueChange={v => onValueChange(v || '')} disabled={disabled}>
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
      )
    }

    if (accountTypeCatalogIdentifier) {
      return (
        <CatalogSelect
          catalogIdentifier={accountTypeCatalogIdentifier}
          value={value}
          onValueChange={v => onValueChange(Array.isArray(v) ? v[0] || '' : v || '')}
          data-testid={formatDataTestId(dataTestId || 'account-segment', `account-type-${accountIndex}`)}
          disabled={disabled}
        />
      )
    }

    return null
  }

  return (
    <div
      className="gba:flex gba:items-center gba:gap-3 gba:py-2 gba:w-full gba:min-w-0 gba:overflow-hidden"
      data-draft={isDraft || undefined}
      data-testid={formatDataTestId(dataTestId || 'account-segment', `item-${accountIndex}`)}
    >
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
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          {isDraft ? (
            <Tooltip>
              <TooltipTrigger asChild>{nameNode}</TooltipTrigger>
              <TooltipContent
                data-testid={formatDataTestId(dataTestId || 'account-segment', `draft-tooltip-${accountIndex}`)}
              >
                {t('draft-tooltip')}
              </TooltipContent>
            </Tooltip>
          ) : (
            nameNode
          )}
        </div>
        {accountData.website && (
          <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{accountData.website}</div>
        )}
      </div>

      {/* Type Select (Account Type or Contact Type) */}
      <div className="gba:w-48 gba:flex-shrink-0">
        {onTypeChange ? (
          <FormItem>
            <FormControl>{renderTypeSelector(accountTypeValue, onTypeChange)}</FormControl>
            <FormMessage />
          </FormItem>
        ) : (
          <FormField
            control={form.control}
            name={`${fieldArrayName}.${accountIndex}.${accountTypeFieldName}`}
            render={({ field }) => (
              <FormItem>
                <FormControl>{renderTypeSelector(field.value || '', field.onChange)}</FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Edit Draft Button - slot is reserved so type selects align across rows */}
      <div className="gba:w-10 gba:flex-shrink-0 gba:flex gba:justify-center">
        {isDraft && onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onEdit}
            data-testid={formatDataTestId(dataTestId || 'account-segment', `edit-draft-${accountIndex}`)}
            aria-label={`Edit ${accountData.name}`}
            disabled={disabled}
          >
            <PencilIcon className="gba:w-4 gba:h-4" />
          </Button>
        )}
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
  accountContactsValue,
  onAccountContactsChange,
  accounts,
  accountsLoading,
  accountsError,
  searchAccounts,
  hasMore,
  onLoadMore,
  dataTestId = 'account-segment',
  disabled = false,
  error,
  onCreateNew,
  onEditDraft
}) => {
  const form = useFormContext<any>()
  const isControlled = Boolean(onAccountContactsChange)

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

  const accountContactRows = isControlled ? (accountContactsValue ?? []) : fields

  // Get list of selected account IDs (drafts have no real id and are excluded)
  const selectedAccountIds = React.useMemo(() => {
    return new Set(
      accountContactRows
        .map((field: any) => (field?.__isDraft ? null : field[accountIdFieldName]))
        .filter((id): id is string => Boolean(id))
    )
  }, [accountContactRows, accountIdFieldName])

  // Filter out already selected accounts. Drafts should only render in the selected list,
  // never as selectable combobox options if a draft-like object leaks into the source array.
  const availableAccounts = React.useMemo(() => {
    return accounts
      .filter((acc: any) => acc.__isDraft !== true)
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

    if (isControlled) {
      onAccountContactsChange?.([...(accountContactsValue ?? []), newAccount])
      return
    }

    append(newAccount)
  }

  const handleRemoveAccount = (index: number) => {
    if (isControlled) {
      onAccountContactsChange?.((accountContactsValue ?? []).filter((_, currentIndex) => currentIndex !== index))
      return
    }

    remove(index)
  }

  const handleAccountTypeChange = (index: number, value: string) => {
    if (!isControlled) return

    onAccountContactsChange?.(
      (accountContactsValue ?? []).map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, [accountTypeFieldName]: value || null } : entry
      )
    )
  }

  // Get empty text for combobox
  const getEmptyText = () => {
    if (accountsLoading) return 'Loading...'
    if (accountsError) return 'Error loading accounts'
    return 'No accounts found'
  }

  return (
    <div className="gba:space-y-2 gba:w-full gba:max-w-full gba:min-w-0 gba:overflow-hidden" data-testid={dataTestId}>
      {/* Selected Accounts List */}
      {accountContactRows.length > 0 && (
        <div
          className="gba:space-y-0 gba:w-full gba:min-w-0"
          data-testid={formatDataTestId(dataTestId, 'selected-list')}
        >
          {accountContactRows.map((field, index) => (
            <AccountItem
              key={field.id || field.__draftId || field[accountIdFieldName] || `account-${index}`}
              fieldArrayName={fieldArrayName}
              accountIdFieldName={accountIdFieldName}
              accountTypeFieldName={accountTypeFieldName}
              typeMode={typeMode}
              accountTypeCatalogIdentifier={accountTypeCatalogIdentifier}
              accountIndex={index}
              accountContactEntry={field}
              accountContacts={accountContacts}
              accounts={accounts}
              onRemove={() => handleRemoveAccount(index)}
              onTypeChange={isControlled ? value => handleAccountTypeChange(index, value) : undefined}
              onEdit={onEditDraft ? () => onEditDraft(index) : undefined}
              dataTestId={dataTestId}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Combobox for adding accounts (with optional inline-create "+" button) */}
      <div className="gba:flex gba:items-stretch gba:gap-2 gba:w-full gba:min-w-0">
        <div className="gba:flex-1 gba:min-w-0">
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
            searchDebounce={300}
            hasMore={Boolean(hasMore)}
            onLoadMore={onLoadMore}
            data-testid={formatDataTestId(dataTestId, 'add-account-combobox')}
          />
        </div>
        {onCreateNew && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="gba:flex-shrink-0"
            onClick={onCreateNew}
            disabled={disabled}
            aria-label="Create new account"
            data-testid={formatDataTestId(dataTestId, 'create-new-account')}
          >
            <PlusIcon className="gba:w-4 gba:h-4" />
          </Button>
        )}
      </div>

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
