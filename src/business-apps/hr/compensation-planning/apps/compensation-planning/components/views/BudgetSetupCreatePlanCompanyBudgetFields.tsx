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
import { formatCurrency } from '../../../../utils/budgetCalculations'
import { amountFromPercent, percentFromAmount } from '../../../../utils/budgetAmountPercentSync'
import type { CreatePlanFormValues } from './budgetSetupCreatePlanSchema'

interface SyncedAmountPercentPairProps {
  control: Control<CreatePlanFormValues>
  setValue: UseFormSetValue<CreatePlanFormValues>
  baseline: number
  amountName: 'salaryBudgetAmount' | 'bonusBudgetAmount'
  percentName: 'salaryBudgetPercent' | 'bonusBudgetPercent'
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
}: SyncedAmountPercentPairProps) {
  return (
    <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:items-start">
      <FormField
        control={control}
        name={amountName}
        render={({ field }) => (
          <FormItem className="gba:min-w-0">
            <FormLabel>{amountLabel}</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="number"
                step="0.01"
                onChange={e => {
                  const raw = e.target.value
                  const amt = raw === '' || raw === '-' ? 0 : Number(raw)
                  const v = Number.isNaN(amt) ? 0 : amt
                  field.onChange(v)
                  setValue(percentName, percentFromAmount(v, baseline), { shouldValidate: true })
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
                onChange={e => {
                  const raw = e.target.value
                  const pct = raw === '' || raw === '-' ? 0 : Number(raw)
                  const v = Number.isNaN(pct) ? 0 : pct
                  field.onChange(v)
                  setValue(amountName, amountFromPercent(v, baseline), { shouldValidate: true })
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
  /** Defaults to [] when omitted (avoids runtime errors if parent forgets to pass). */
  currencyOptions?: CurrencyCatalogOption[]
  loadingCurrencies?: boolean
  t: (key: string) => string
}

export const BudgetSetupCreatePlanCompanyBudgetFields: React.FC<BudgetSetupCreatePlanCompanyBudgetFieldsProps> = ({
  control,
  setValue,
  annualSalaryCost,
  currencyCode,
  currencyOptions = [],
  loadingCurrencies = false,
  t
}) => {
  return (
    <div className="gba:space-y-4" data-testid="budget-setup-create-plan-company-budget-fields">
      <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:p-3 gba:text-sm">
        <span className="gba:text-muted-foreground">{t('budget-setup-create-plan-baseline-readonly')}</span>{' '}
        <span className="gba:font-medium gba:tabular-nums">{formatCurrency(annualSalaryCost, currencyCode)}</span>
      </div>

      <p className="gba:text-sm gba:font-semibold">{t('budget-setup-create-plan-section-salary-bonus')}</p>

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

      <SyncedAmountPercentPair
        control={control}
        setValue={setValue}
        baseline={annualSalaryCost}
        amountName="bonusBudgetAmount"
        percentName="bonusBudgetPercent"
        amountLabel={t('budget-setup-create-plan-bonus-amount')}
        percentLabel={t('budget-setup-create-plan-bonus-percent')}
        amountTestId="budget-setup-create-plan-bonus-amount"
        percentTestId="budget-setup-create-plan-bonus-percent"
      />

      <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:items-start">
        <FormField
          control={control}
          name="headcount"
          render={({ field }) => (
            <FormItem className="gba:min-w-0">
              <FormLabel>{t('budget-setup-create-plan-headcount')}</FormLabel>
              <FormControl>
                <Input {...field} type="number" min={0} data-testid="budget-setup-create-plan-headcount" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="currencyRef"
          render={({ field }) => (
            <FormItem className="gba:min-w-0">
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                <FormLabel>{t('budget-setup-create-plan-currency-label')}</FormLabel>
                {loadingCurrencies ? <Spinner className="gba:h-4 gba:w-4" /> : null}
              </div>
              <Select
                disabled={loadingCurrencies || currencyOptions.length === 0}
                onValueChange={field.onChange}
                value={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger className="gba:w-full" data-testid="budget-setup-create-plan-currency-ref">
                    <SelectValue placeholder={t('budget-setup-create-plan-currency-placeholder')} />
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
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
