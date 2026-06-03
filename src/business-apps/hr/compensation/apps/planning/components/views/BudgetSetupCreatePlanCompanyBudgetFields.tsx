import React from 'react'
import type { Control, UseFormSetValue } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import type { CurrencyCatalogOption } from '../../hooks/useCurrencyCatalogOptions'
import { formatCurrency, formatNumber } from '@/common/utils/numberFormatter'
import { amountFromPercent, percentFromAmount } from '../../../../utils/budgetAmountPercentSync'
import type { CreatePlanFormValues } from './budgetSetupCreatePlanSchema'

interface SyncedAmountPercentPairProps {
  control: Control<CreatePlanFormValues>
  setValue: UseFormSetValue<CreatePlanFormValues>
  baseline: number
  amountName: 'salaryBudgetAmount'
  percentName: 'salaryBudgetPercent'
  amountLabel: string
  percentLabel: string
  amountTestId: string
  percentTestId: string
}

function SyncedAmountPercentPair({
  control,
  setValue,
  baseline,
  amountName,
  percentName,
  amountLabel,
  percentLabel,
  amountTestId,
  percentTestId
}: Readonly<SyncedAmountPercentPairProps>) {
  return (
    <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:items-start">
      <FormField
        control={control}
        name={amountName}
        render={({ field }) => (
          <FormItem className="gba:min-w-0">
            <FormLabel>{amountLabel} : </FormLabel>
            <FormControl>
              <Input
                {...field}
                type="number"
                step="0.01"
                value={field.value === '' ? '' : field.value}
                onChange={e => {
                  const raw = e.target.value
                  if (raw === '') {
                    field.onChange('')
                    setValue(percentName, '', { shouldValidate: true })
                    return
                  }
                  const amt = Number(raw)
                  if (Number.isNaN(amt)) {
                    return
                  }
                  field.onChange(amt)
                  setValue(percentName, percentFromAmount(amt, baseline), { shouldValidate: true })
                }}
                data-testid={amountTestId}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={percentName}
        render={({ field }) => (
          <FormItem className="gba:min-w-0">
            <FormLabel>{percentLabel}</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="number"
                step="0.01"
                value={field.value === '' ? '' : field.value}
                onChange={e => {
                  const raw = e.target.value
                  if (raw === '') {
                    field.onChange('')
                    setValue(amountName, '', { shouldValidate: true })
                    return
                  }
                  const pct = Number(raw)
                  if (Number.isNaN(pct)) {
                    return
                  }
                  field.onChange(pct)
                  setValue(amountName, amountFromPercent(pct, baseline), { shouldValidate: true })
                }}
                data-testid={percentTestId}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

export interface BudgetSetupCreatePlanCompanyBudgetFieldsProps {
  control: Control<CreatePlanFormValues>
  setValue: UseFormSetValue<CreatePlanFormValues>
  annualSalaryCost: number
  currencyCode: string
  hasCurrency: boolean
  /** Defaults to [] when omitted (avoids runtime errors if parent forgets to pass). */
  currencyOptions?: CurrencyCatalogOption[]
  loadingCurrencies?: boolean
  disableCurrency?: boolean
  currencyMessage?: string | null
  t: (key: string) => string
}

export const BudgetSetupCreatePlanCompanyBudgetFields = ({
  control,
  setValue,
  annualSalaryCost,
  currencyCode,
  hasCurrency,
  currencyOptions = [],
  loadingCurrencies = false,
  disableCurrency = false,
  currencyMessage = null,
  t
}: Readonly<BudgetSetupCreatePlanCompanyBudgetFieldsProps>) => {
  return (
    <div className="gba:space-y-4" data-testid="budget-setup-create-plan-company-budget-fields">
      <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:p-3 gba:text-sm">
        <span className="gba:text-muted-foreground">{t('budget-setup-create-plan-baseline-readonly')}</span>{' '}
        <span className="gba:font-medium gba:tabular-nums">
          {hasCurrency ? formatCurrency(annualSalaryCost, currencyCode) : formatNumber(annualSalaryCost)}
        </span>
      </div>

      <SyncedAmountPercentPair
        control={control}
        setValue={setValue}
        baseline={annualSalaryCost}
        amountName="salaryBudgetAmount"
        percentName="salaryBudgetPercent"
        amountLabel={t('budget-setup-create-plan-salary-amount')}
        percentLabel={t('budget-setup-create-plan-salary-percent')}
        amountTestId="budget-setup-create-plan-salary-amount"
        percentTestId="budget-setup-create-plan-salary-percent"
      />

      <FormField
        control={control}
        name="currencyRef"
        render={({ field }) => (
          <FormItem className="gba:min-w-0">
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
              <FormLabel>{t('budget-setup-create-plan-currency-label')} : </FormLabel>
              {loadingCurrencies ? <Spinner className="gba:h-4 gba:w-4" /> : null}
            </div>
            <Select
              disabled={disableCurrency || loadingCurrencies || currencyOptions.length === 0}
              onValueChange={field.onChange}
              value={field.value || undefined}
            >
              <FormControl>
                <SelectTrigger className="gba:w-full" data-testid="budget-setup-create-plan-currency-ref">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {currencyOptions.map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currencyMessage ? (
              <p className="gba:text-sm gba:text-destructive" data-testid="budget-setup-create-plan-currency-message">
                {currencyMessage}
              </p>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
