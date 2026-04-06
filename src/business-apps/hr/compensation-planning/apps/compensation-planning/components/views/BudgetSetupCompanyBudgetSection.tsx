import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
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
  useTranslation
} from '@newwork/nw-design-system'
import type { CompensationBudgetPlanCompanyRow } from '../../hooks/useBudgetSetupForCompany'
import type { UseFormReturn } from 'react-hook-form'
import type { BudgetType } from '../../../../types/compensationPlanningTypes'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { computeCompanyBudgetSummary, resolveAbsoluteBudget } from '../../../../utils/budgetCalculations'
import translations from '../../_i18n'

const companyBudgetSchema = z.object({
  salaryBudgetType: z.enum(['absolute', 'percentage']),
  salaryBudgetValue: z.coerce.number().min(0),
  bonusBudgetType: z.enum(['absolute', 'percentage']),
  bonusBudgetValue: z.coerce.number().min(0)
})

export type CompanyBudgetFormValues = z.infer<typeof companyBudgetSchema>

export interface BudgetSetupCompanyBudgetSectionProps {
  companyRow: CompensationBudgetPlanCompanyRow | null
  loadingRow: boolean
  saving: boolean
  currencyCode: string
  currentSalaryCost: number
  onSave: (values: CompanyBudgetFormValues) => Promise<boolean>
}

function deriveTypeValue(amount: number, percent: number): { type: BudgetType; value: number } {
  if (percent > 0) return { type: 'percentage', value: percent }
  return { type: 'absolute', value: amount }
}

function toFormDefaults(row: CompensationBudgetPlanCompanyRow | null): CompanyBudgetFormValues {
  if (!row) {
    return {
      salaryBudgetType: 'absolute',
      salaryBudgetValue: 0,
      bonusBudgetType: 'absolute',
      bonusBudgetValue: 0
    }
  }
  const salary = deriveTypeValue(row.salaryBudgetAmount, row.salaryBudgetPercent)
  const bonus = deriveTypeValue(row.bonusBudgetAmount, row.bonusBudgetPercent)
  return {
    salaryBudgetType: salary.type,
    salaryBudgetValue: salary.value,
    bonusBudgetType: bonus.type,
    bonusBudgetValue: bonus.value
  }
}

export const BudgetSetupCompanyBudgetSection: React.FC<BudgetSetupCompanyBudgetSectionProps> = ({
  companyRow,
  loadingRow,
  saving,
  currencyCode,
  currentSalaryCost,
  onSave
}) => {
  const { t } = useTranslation(translations)

  const form = useForm<CompanyBudgetFormValues>({
    resolver: zodResolver(companyBudgetSchema),
    defaultValues: toFormDefaults(companyRow)
  })

  const salaryType = form.watch('salaryBudgetType')
  const salaryValue = form.watch('salaryBudgetValue')
  const bonusType = form.watch('bonusBudgetType')
  const bonusValue = form.watch('bonusBudgetValue')

  useEffect(() => {
    if (loadingRow) return
    form.reset(toFormDefaults(companyRow))
  }, [companyRow, form, loadingRow])

  const onSubmit = form.handleSubmit(async values => {
    await onSave(values)
  })

  const summary = computeCompanyBudgetSummary({
    id: '',
    cycleId: '',
    companyId: '',
    companyName: '',
    salaryBudgetType: salaryType,
    salaryBudgetValue: salaryValue,
    bonusBudgetType: bonusType,
    bonusBudgetValue: bonusValue,
    benefitsBudgetType: 'absolute',
    benefitsBudgetValue: 0,
    currency: currencyCode,
    currentTotalSalaryCost: currentSalaryCost,
    currentTotalBenefitsCost: 0,
    headcount: 0,
    averageSalary: 0
  })

  return (
    <Card data-testid="budget-setup-company-budget-card">
      <CardHeader>
        <CardTitle className="gba:text-base">{t('budget-setup-company-budget-title')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-6">
        <Form {...form}>
          <form onSubmit={onSubmit} className="gba:space-y-6">
            <BudgetCategoryBlock
              t={t}
              title={t('budget-setup-category-salary')}
              helper={t('budget-setup-category-salary-helper')}
              baselineLabel={t('budget-setup-baseline-salary-cost')}
              baselineAmount={currentSalaryCost}
              currencyCode={currencyCode}
              typeName="salaryBudgetType"
              valueName="salaryBudgetValue"
              form={form}
            />
            <BudgetCategoryBlock
              t={t}
              title={t('budget-setup-category-bonus')}
              helper={t('budget-setup-category-bonus-helper')}
              baselineLabel={t('budget-setup-baseline-salary-cost')}
              baselineAmount={currentSalaryCost}
              currencyCode={currencyCode}
              typeName="bonusBudgetType"
              valueName="bonusBudgetValue"
              form={form}
            />

            <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
              <div className="gba:text-sm gba:text-muted-foreground">
                <span className="gba:font-medium gba:text-foreground">{t('budget-setup-resolved-total-label')}</span>{' '}
                <span className="gba:tabular-nums">{formatCurrency(summary.total, currencyCode)}</span>
              </div>
              <Button type="submit" disabled={saving || loadingRow} data-testid="budget-setup-save-company-budget">
                {t('budget-setup-save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

type TranslateFn = (id: string, args?: Record<string, string | number>) => string

interface BudgetCategoryBlockProps {
  t: TranslateFn
  title: string
  helper: string
  baselineLabel: string
  baselineAmount: number
  currencyCode: string
  typeName: keyof CompanyBudgetFormValues
  valueName: keyof CompanyBudgetFormValues
  form: UseFormReturn<CompanyBudgetFormValues>
}

function BudgetCategoryBlock({
  t,
  title,
  helper,
  baselineLabel,
  baselineAmount,
  currencyCode,
  typeName,
  valueName,
  form
}: Readonly<BudgetCategoryBlockProps>) {
  const bType = form.watch(typeName) as BudgetType
  const bValue = form.watch(valueName) as number
  const resolved = resolveAbsoluteBudget(bType, bValue, baselineAmount)

  return (
    <div className="gba:space-y-3 gba:rounded-md gba:border gba:border-border gba:p-4">
      <div>
        <div className="gba:text-sm gba:font-semibold">{title}</div>
        <p className="gba:text-xs gba:text-muted-foreground">{helper}</p>
      </div>
      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name={typeName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('budget-setup-field-budget-type')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid={`budget-setup-select-${String(typeName)}`}>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="absolute">{t('budget-setup-type-absolute')}</SelectItem>
                  <SelectItem value="percentage">{t('budget-setup-type-percentage')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={valueName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {bType === 'percentage'
                  ? t('budget-setup-field-budget-percent')
                  : t('budget-setup-field-budget-amount')}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min={0}
                  data-testid={`budget-setup-input-${String(valueName)}`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="gba:flex gba:flex-wrap gba:gap-x-4 gba:gap-y-1 gba:text-xs gba:text-muted-foreground">
        <span>
          {baselineLabel}:{' '}
          <span className="gba:font-medium gba:text-foreground gba:tabular-nums">
            {formatCurrency(baselineAmount, currencyCode)}
          </span>
        </span>
        <span>
          {t('budget-setup-resolved-label')}:{' '}
          <span className="gba:font-medium gba:text-foreground gba:tabular-nums">
            {formatCurrency(resolved, currencyCode)}
          </span>
        </span>
      </div>
    </div>
  )
}
