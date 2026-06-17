import {
  Combobox,
  type ComboboxOption,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@newwork/nw-design-system'
import { balanceOptionLabel } from '../utils/ledgerNames'
import type { LedgerBalance } from '../network/ledgerAdminClient'
import {
  balanceSelectionValue,
  indicatorSelectionValue,
  inputSelectionValue,
  isInputSelectionValue
} from './transactionDialogUtils'

type TranslateFn = (key: string) => string
const FIELD_LABEL_CLASS = 'gba:text-sm gba:font-medium'
type PartyFieldMode = 'selection' | 'input'

function inferredIndicator(balance: LedgerBalance): string | null {
  if (balance.indicator?.startsWith('@')) return balance.indicator
  if (balance.name?.startsWith('@')) return balance.name
  return null
}

function partyOptionValue(balance: LedgerBalance): string {
  const indicator = inferredIndicator(balance)
  return indicator ? indicatorSelectionValue(indicator) : balanceSelectionValue(balance.balanceId)
}

interface LedgerPartySelectProps {
  label: string
  value: string
  placeholder: string
  testId: string
  balances: LedgerBalance[]
  onChange: (value: string) => void
  t: TranslateFn
}

export function LedgerPartySelect({
  label,
  value,
  placeholder,
  testId,
  balances,
  onChange,
  t
}: Readonly<LedgerPartySelectProps>) {
  const fieldMode: PartyFieldMode = isInputSelectionValue(value) ? 'input' : 'selection'
  const inputValue = fieldMode === 'input' ? value.slice('input:'.length) : ''

  const changeFieldMode = (mode: PartyFieldMode) => {
    if (mode === fieldMode) return
    onChange(mode === 'input' ? inputSelectionValue('') : '')
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <Label className={FIELD_LABEL_CLASS}>{label}</Label>
      <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-mode-toggle`}>
        <Switch
          id={`${testId}-mode-switch`}
          checked={fieldMode === 'input'}
          onCheckedChange={checked => changeFieldMode(checked ? 'input' : 'selection')}
          data-testid={`${testId}-mode-switch`}
        />
        <Label className="gba:text-sm gba:text-muted-foreground" htmlFor={`${testId}-mode-switch`}>
          {fieldMode === 'input' ? t('ledger-admin-party-mode-input') : t('ledger-admin-party-mode-selection')}
        </Label>
      </div>
      {fieldMode === 'input' ? (
        <Input
          value={inputValue}
          onChange={event => onChange(inputSelectionValue(event.target.value))}
          placeholder={t('ledger-admin-party-free-text-placeholder')}
          data-testid={`${testId}-free-text`}
        />
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger data-testid={testId}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {balances.map(balance => (
              <SelectItem key={balance.id} value={partyOptionValue(balance)}>
                {balanceOptionLabel(balance, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

interface TransactionAccountFieldsProps {
  balances: LedgerBalance[]
  source: string
  destination: string
  onSourceChange: (value: string) => void
  onDestinationChange: (value: string) => void
  t: TranslateFn
}

interface InvoiceSelectProps {
  invoiceId: string
  invoiceOptions: ComboboxOption[]
  onInvoiceChange: (value: string) => void
  onInvoiceSearch: (value: string) => void
  t: TranslateFn
}

export function TransactionAccountFields({
  balances,
  source,
  destination,
  onSourceChange,
  onDestinationChange,
  t
}: Readonly<TransactionAccountFieldsProps>) {
  return (
    <>
      <LedgerPartySelect
        label={t('ledger-admin-field-source')}
        value={source}
        placeholder={t('ledger-admin-field-source-placeholder')}
        testId="ledger-field-source"
        balances={balances}
        onChange={onSourceChange}
        t={t}
      />
      <LedgerPartySelect
        label={t('ledger-admin-field-destination')}
        value={destination}
        placeholder={t('ledger-admin-field-destination-placeholder')}
        testId="ledger-field-destination"
        balances={balances}
        onChange={onDestinationChange}
        t={t}
      />
    </>
  )
}

export function InvoiceSelect({
  invoiceId,
  invoiceOptions,
  onInvoiceChange,
  onInvoiceSearch,
  t
}: Readonly<InvoiceSelectProps>) {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <Label className={FIELD_LABEL_CLASS}>{t('ledger-admin-field-invoice')}</Label>
      <Combobox
        options={invoiceOptions}
        value={invoiceId}
        onValueChange={onInvoiceChange}
        onSearch={onInvoiceSearch}
        placeholder={t('ledger-admin-field-invoice-placeholder')}
        searchPlaceholder={t('billing-search-invoices')}
        emptyText={t('billing-invoices-empty')}
        data-testid="ledger-field-invoice"
      />
    </div>
  )
}
