import React, { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import type { CompensationBudgetPlanListItem, CreateBudgetPlanInput } from '../../hooks/useBudgetSetupForCompany'
import { useCurrencyCatalogOptions } from '../../hooks/useCurrencyCatalogOptions'
import translations from '../../_i18n'
import {
  buildCreateBudgetPlanFormSchema,
  getDefaultCreatePlanFormValues,
  pickDefaultCompensationBudgetPlanId,
  type CreatePlanFormValues
} from './budgetSetupCreatePlanSchema'
import { BudgetSetupCreatePlanBudgetPreview } from './BudgetSetupCreatePlanBudgetPreview'
import { BudgetSetupCreatePlanCompanyBudgetFields } from './BudgetSetupCreatePlanCompanyBudgetFields'
import { formatDateOrDash } from '../../utils/displayFormatUtils'

export interface BudgetSetupCreatePlanDialogProps {
  accessToken: string
  open: boolean
  onOpenChange: (open: boolean) => void
  creating: boolean
  onCreate: (input: CreateBudgetPlanInput) => Promise<string | null>
  companyId: string
  /** Total current annual salary for the selected company (baseline for % pools). */
  annualSalaryCost: number
  currencyCode: string
  loadingSalaryCost: boolean
  /** Default headcount (e.g. team size); editable in the form. */
  defaultHeadcount: number
  companyName?: string
  plans: CompensationBudgetPlanListItem[]
  loadingPlans: boolean
  /** Pre-select when it matches a listed plan (e.g. toolbar selection). */
  defaultCompensationBudgetPlanId: string | null
}

export const BudgetSetupCreatePlanDialog: React.FC<BudgetSetupCreatePlanDialogProps> = ({
  accessToken,
  open,
  onOpenChange,
  creating,
  onCreate,
  companyId,
  annualSalaryCost,
  currencyCode,
  loadingSalaryCost,
  defaultHeadcount,
  companyName,
  plans,
  loadingPlans,
  defaultCompensationBudgetPlanId
}) => {
  const { t } = useTranslation(translations)
  const { options: currencyOptions, loading: loadingCurrencies } = useCurrencyCatalogOptions(accessToken)
  const plansSafe = plans ?? []
  const currencyOptionsSafe = currencyOptions ?? []

  const createPlanSchema = useMemo(() => buildCreateBudgetPlanFormSchema((key: string) => t(key)), [t])

  const defaultPlanId = useMemo(
    () => pickDefaultCompensationBudgetPlanId(plansSafe, defaultCompensationBudgetPlanId),
    [plansSafe, defaultCompensationBudgetPlanId]
  )

  const form = useForm<CreatePlanFormValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: getDefaultCreatePlanFormValues(defaultHeadcount, defaultPlanId, '')
  })
  const { setValue } = form

  const watchedBudget = useWatch({
    control: form.control,
    name: ['salaryBudgetAmount', 'salaryBudgetPercent', 'bonusBudgetAmount', 'bonusBudgetPercent']
  })

  const previewLabels = useMemo(
    () => ({
      title: t('budget-setup-create-plan-preview-title'),
      baseline: t('budget-setup-create-plan-preview-baseline'),
      resolvedSalary: t('budget-setup-create-plan-preview-salary-resolved'),
      resolvedBonus: t('budget-setup-create-plan-preview-bonus-resolved'),
      loadingHint: t('budget-setup-create-plan-loading-salary')
    }),
    [t]
  )

  useEffect(() => {
    if (!open) return
    const planId = pickDefaultCompensationBudgetPlanId(plansSafe, defaultCompensationBudgetPlanId)
    form.reset(getDefaultCreatePlanFormValues(defaultHeadcount, planId, ''))
  }, [form, open, defaultHeadcount, plansSafe, defaultCompensationBudgetPlanId])

  useEffect(() => {
    if (!open || currencyOptionsSafe.length === 0) return
    const current = form.getValues('currencyRef')
    if (current) return
    const match = currencyOptionsSafe.find(o => o.label === currencyCode) ?? currencyOptionsSafe[0]
    if (match) {
      form.setValue('currencyRef', match.id, { shouldValidate: true })
    }
  }, [open, currencyOptionsSafe, currencyCode, form])

  const onSubmit = form.handleSubmit(async values => {
    const id = await onCreate({
      companyBudget: {
        compensationBudgetPlanId: values.compensationBudgetPlanId,
        companyId,
        salaryBudgetAmount: values.salaryBudgetAmount,
        salaryBudgetPercent: values.salaryBudgetPercent,
        bonusBudgetAmount: values.bonusBudgetAmount,
        bonusBudgetPercent: values.bonusBudgetPercent,
        distributionMethod: values.distributionMethod,
        currentTotalSalaryCost: annualSalaryCost,
        headcount: values.headcount,
        currencyRef: values.currencyRef.trim() === '' ? null : values.currencyRef.trim()
      }
    })
    if (id) {
      onOpenChange(false)
    }
  })

  const [salaryAmount, salaryPercent, bonusAmount, bonusPercent] = watchedBudget ?? [0, 0, 0, 0]

  const watchedPlanId = useWatch({ control: form.control, name: 'compensationBudgetPlanId' })
  const selectedPlanMeta = useMemo(() => plansSafe.find(p => p.id === watchedPlanId), [plansSafe, watchedPlanId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-xl gba:max-h-[90vh] gba:overflow-y-auto"
        data-testid="budget-setup-create-plan-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('budget-setup-create-plan-title')}</DialogTitle>
          {companyName ? (
            <p className="gba:text-sm gba:text-muted-foreground">
              {t('budget-setup-company-context', { company: companyName })}
            </p>
          ) : null}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="gba:space-y-4">
            <FormField
              control={form.control}
              name="compensationBudgetPlanId"
              render={({ field }) => (
                <FormItem>
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                    <FormLabel className="gba:flex-1">{t('budget-setup-choose-budget-plan-label')}</FormLabel>
                    {loadingPlans ? <Spinner className="gba:h-4 gba:w-4" /> : null}
                  </div>
                  <Select
                    disabled={loadingPlans || plansSafe.length === 0}
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger className="gba:w-full" data-testid="budget-setup-create-plan-compensation-plan">
                        <SelectValue placeholder={t('budget-setup-create-plan-select-plan-placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {plansSafe.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} ({String(plan.fiscalYear)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPlanMeta ? (
                    <div
                      className="gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:p-3 gba:text-sm"
                      data-testid="budget-setup-create-plan-selected-plan-details"
                    >
                      <p className="gba:font-medium gba:text-foreground">{t('budget-setup-plan-details-title')}</p>
                      <dl className="gba:mt-2 gba:grid gba:grid-cols-1 gba:gap-1 sm:gba:grid-cols-2">
                        <div className="gba:flex gba:flex-wrap gba:gap-x-2">
                          <dt className="gba:text-muted-foreground">{t('budget-setup-field-fiscal-year')}</dt>
                          <dd className="gba:tabular-nums">{String(selectedPlanMeta.fiscalYear)}</dd>
                        </div>
                        <div className="gba:flex gba:flex-wrap gba:gap-x-2">
                          <dt className="gba:text-muted-foreground">{t('budget-setup-field-planning-start')}</dt>
                          <dd className="gba:tabular-nums">{formatDateOrDash(selectedPlanMeta.startDate)}</dd>
                        </div>
                        <div className="gba:flex gba:flex-wrap gba:gap-x-2">
                          <dt className="gba:text-muted-foreground">{t('budget-setup-field-planning-end')}</dt>
                          <dd className="gba:tabular-nums">{formatDateOrDash(selectedPlanMeta.endDate)}</dd>
                        </div>
                        <div className="gba:flex gba:flex-wrap gba:gap-x-2">
                          <dt className="gba:text-muted-foreground">{t('budget-setup-field-effective-date')}</dt>
                          <dd className="gba:tabular-nums">{formatDateOrDash(selectedPlanMeta.effectiveDate)}</dd>
                        </div>
                      </dl>
                    </div>
                  ) : null}
                  {plansSafe.length === 0 && !loadingPlans ? (
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {t('budget-setup-create-plan-no-plans-hint')}
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <BudgetSetupCreatePlanCompanyBudgetFields
              control={form.control}
              setValue={setValue}
              annualSalaryCost={annualSalaryCost}
              currencyCode={currencyCode}
              currencyOptions={currencyOptionsSafe}
              loadingCurrencies={loadingCurrencies}
              t={t}
            />

            <BudgetSetupCreatePlanBudgetPreview
              baselineAnnual={annualSalaryCost}
              salaryAmount={typeof salaryAmount === 'number' ? salaryAmount : 0}
              salaryPercent={typeof salaryPercent === 'number' ? salaryPercent : 0}
              bonusAmount={typeof bonusAmount === 'number' ? bonusAmount : 0}
              bonusPercent={typeof bonusPercent === 'number' ? bonusPercent : 0}
              currencyCode={currencyCode}
              loading={loadingSalaryCost}
              labels={previewLabels}
            />

            <DialogFooter className="gba:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="budget-setup-create-plan-cancel"
              >
                {t('budget-setup-cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  creating ||
                  loadingPlans ||
                  plansSafe.length === 0 ||
                  loadingCurrencies ||
                  currencyOptionsSafe.length === 0
                }
                data-testid="budget-setup-create-plan-submit"
              >
                {t('budget-setup-create-plan-submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
