import React from 'react'
import {
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { CURRENCY_OPTIONS } from './transactionDialogUtils'

type TranslateFn = (key: string) => string
const CHECKBOX_LABEL_CLASS = 'gba:text-sm gba:font-normal'
const FIELD_LABEL_CLASS = 'gba:text-sm gba:font-medium'

interface BoolOption {
  id: string
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}

interface TransactionAdvancedFieldsProps {
  amount: string
  atomic: boolean
  currency: string
  inflight: boolean
  overdraftLimit: string
  preciseAmount: string
  precision: string
  rate: string
  showAtomic: boolean
  skipQueue: boolean
  setAmount: (value: string) => void
  setAtomic: (value: boolean) => void
  setCurrency: (value: string) => void
  setInflight: (value: boolean) => void
  setOverdraftLimit: (value: string) => void
  setPreciseAmount: (value: string) => void
  setPrecision: (value: string) => void
  setRate: (value: string) => void
  setSkipQueue: (value: boolean) => void
  t: TranslateFn
}

export function TransactionAdvancedFields({
  amount,
  atomic,
  currency,
  inflight,
  overdraftLimit,
  preciseAmount,
  precision,
  rate,
  showAtomic,
  skipQueue,
  setAmount,
  setAtomic,
  setCurrency,
  setInflight,
  setOverdraftLimit,
  setPreciseAmount,
  setPrecision,
  setRate,
  setSkipQueue,
  t
}: Readonly<TransactionAdvancedFieldsProps>) {
  const boolOptions: BoolOption[] = [
    { id: 'inflight', checked: inflight, onChange: setInflight, label: t('ledger-admin-field-inflight') },
    { id: 'skip-queue', checked: skipQueue, onChange: setSkipQueue, label: t('ledger-admin-field-skip-queue') }
  ]
  if (showAtomic)
    boolOptions.push({ id: 'atomic', checked: atomic, onChange: setAtomic, label: t('ledger-admin-field-atomic') })

  return (
    <>
      <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2">
        <NumberField
          id="txn-amount"
          label={t('ledger-admin-field-amount')}
          value={amount}
          onChange={setAmount}
          testId="ledger-field-amount"
        />
        <div className="gba:flex gba:flex-col gba:gap-2">
          <Label className={FIELD_LABEL_CLASS}>{t('ledger-admin-field-currency')}</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger data-testid="ledger-field-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map(code => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <NumberField
          id="txn-precise-amount"
          label={t('ledger-admin-field-precise-amount')}
          value={preciseAmount}
          onChange={setPreciseAmount}
          testId="ledger-field-precise-amount"
        />
        <NumberField
          id="txn-precision"
          label={t('ledger-admin-field-precision')}
          value={precision}
          onChange={setPrecision}
          testId="ledger-field-precision"
        />
        <NumberField
          id="txn-rate"
          label={t('ledger-admin-field-rate')}
          value={rate}
          onChange={setRate}
          testId="ledger-field-rate"
        />
        <NumberField
          id="txn-overdraft-limit"
          label={t('ledger-admin-field-overdraft-limit')}
          value={overdraftLimit}
          onChange={setOverdraftLimit}
          testId="ledger-field-overdraft-limit"
        />
      </div>
      <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2">
        {boolOptions.map(option => (
          <div key={option.id} className="gba:flex gba:items-center gba:gap-2">
            <Checkbox
              checked={option.checked}
              onCheckedChange={checked => option.onChange(checked === true)}
              data-testid={`ledger-field-${option.id}`}
            />
            <Label className={CHECKBOX_LABEL_CLASS}>{option.label}</Label>
          </div>
        ))}
      </div>
    </>
  )
}

interface NumberFieldProps {
  id: string
  label: string
  onChange: (value: string) => void
  testId: string
  value: string
}

function NumberField({ id, label, onChange, testId, value }: Readonly<NumberFieldProps>) {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <Label className={FIELD_LABEL_CLASS} htmlFor={id}>
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={event => onChange(event.target.value)}
        data-testid={testId}
      />
    </div>
  )
}
