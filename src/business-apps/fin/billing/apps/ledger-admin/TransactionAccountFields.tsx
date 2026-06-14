import React from 'react'
import {
  Combobox,
  type ComboboxOption,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { accountOptionLabel } from '../../common/utils/ledgerNames'
import type { LedgerAccount } from '../../common/network/ledgerAdminClient'
import { EXTERNAL_REF } from './transactionDialogUtils'

type TranslateFn = (key: string) => string
const FIELD_LABEL_CLASS = 'gba:text-sm gba:font-medium'

interface AccountSelectProps {
  label: string
  value: string
  placeholder: string
  testId: string
  accounts: LedgerAccount[]
  onChange: (value: string) => void
  t: TranslateFn
}

function AccountSelect({ label, value, placeholder, testId, accounts, onChange, t }: Readonly<AccountSelectProps>) {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <Label className={FIELD_LABEL_CLASS}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid={testId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EXTERNAL_REF}>{t('ledger-admin-external')}</SelectItem>
          {accounts.map(account => (
            <SelectItem key={account.id} value={account.balanceId}>
              {accountOptionLabel(account, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface TransactionAccountFieldsProps {
  accounts: LedgerAccount[]
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
  accounts,
  source,
  destination,
  onSourceChange,
  onDestinationChange,
  t
}: Readonly<TransactionAccountFieldsProps>) {
  return (
    <>
      <AccountSelect
        label={t('ledger-admin-field-source')}
        value={source}
        placeholder={t('ledger-admin-field-source-placeholder')}
        testId="ledger-field-source"
        accounts={accounts}
        onChange={onSourceChange}
        t={t}
      />
      <AccountSelect
        label={t('ledger-admin-field-destination')}
        value={destination}
        placeholder={t('ledger-admin-field-destination-placeholder')}
        testId="ledger-field-destination"
        accounts={accounts}
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
