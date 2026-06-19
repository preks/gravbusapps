import React, { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCompany } from '@/common/data/orgchart/hooks/useCompany'
import { extractCurrencyCode } from '@/common/utils/numberFormatter'
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
  useTranslation
} from '@newwork/nw-design-system'
import type {
  CompensationBudgetPlanCompanyRow,
  CompensationBudgetPlanListItem,
  CreateBudgetPlanInput
} from '../../hooks/useBudgetSetupForCompany'
import { useCurrencyCatalogOptions, type CurrencyCatalogOption } from '../../hooks/useCurrencyCatalogOptions'
import { useCompanyCompensationSalaryBaseline } from '../../hooks/useCompanyCompensationSalaryBaseline'
import translations from '../../_i18n'
import {
  buildCreateBudgetPlanFormSchema,
  getDefaultCreatePlanFormValues,
  getEditCompanyBudgetFormValuesFromRow,
  pickDefaultCompensationBudgetPlanId,
  type CreatePlanFormValues
} from './budgetSetupCreatePlanSchema'
import { BudgetSetupCreatePlanCompanyBudgetFields } from './BudgetSetupCreatePlanCompanyBudgetFields'
import { formatDateOrDash } from '../../utils/displayFormatUtils'
import type { BudgetSetupCompanyOption } from './budgetSetupPlanTableRows'

export interface BudgetSetupCreatePlanDialogProps {
  accessToken: string
  open: boolean
  onOpenChange: (open: boolean) => void
  creating: boolean
  onCreate: (input: CreateBudgetPlanInput) => Promise<string | null>
  companyId: string
  companyName?: string
  companies?: BudgetSetupCompanyOption[]
  allowCompanySelection?: boolean
  plans: CompensationBudgetPlanListItem[]
  companyBudgetPlanRows: CompensationBudgetPlanCompanyRow[]
  loadingPlans: boolean
  /** Pre-select when it matches a listed plan (e.g. toolbar selection). */
  defaultCompensationBudgetPlanId: string | null
  /** Edit existing company budget row (REST UPDATE). */
  editRow?: CompensationBudgetPlanCompanyRow | null
  onUpdateRow?: (row: CompensationBudgetPlanCompanyRow, values: CreatePlanFormValues) => Promise<boolean | null>
}

function getCompanyCurrencyRef(company: ReturnType<typeof useCompany>['company']): string | null {
  const companyCurrency =
    company?.currency?.id || company?.currency?.code || company?.currency?.value || company?.currencyRef
  return typeof companyCurrency === 'string' && companyCurrency.trim() !== '' ? companyCurrency.trim() : null
}

function findCompanyCurrencyOption(
  company: ReturnType<typeof useCompany>['company'],
  currencyOptions: CurrencyCatalogOption[]
): CurrencyCatalogOption | null {
  const companyCurrency = getCompanyCurrencyRef(company)
  if (companyCurrency == null) {
    return null
  }
  const companyCurrencyCode = extractCurrencyCode(companyCurrency)
  return (
    currencyOptions.find(o => o.id === companyCurrency) ??
    currencyOptions.find(o => o.label === companyCurrencyCode) ??
    null
  )
}

export const BudgetSetupCreatePlanDialog: React.FC<BudgetSetupCreatePlanDialogProps> = ({
  accessToken,
  open,
  onOpenChange,
  creating,
  onCreate,
  companyId,
  companyName,
  companies = [],
  allowCompanySelection = false,
  plans,
  companyBudgetPlanRows,
  loadingPlans,
  defaultCompensationBudgetPlanId,
  editRow = null,
  onUpdateRow
}) => {
  const { t } = useTranslation(translations)
  const isEdit = editRow != null
  const { options: currencyOptions, loading: loadingCurrencies } = useCurrencyCatalogOptions(accessToken)
  const plansSafe = plans ?? []
  const currencyOptionsSafe = currencyOptions ?? []
  const defaultCompanyId = companyId || companies[0]?.id || ''

  const createPlanSchema = useMemo(() => buildCreateBudgetPlanFormSchema((key: string) => t(key)), [t])

  const defaultPlanId = useMemo(
    () => pickDefaultCompensationBudgetPlanId(plansSafe, defaultCompensationBudgetPlanId),
    [plansSafe, defaultCompensationBudgetPlanId]
  )

  const form = useForm<CreatePlanFormValues>({
    resolver: zodResolver(createPlanSchema) as Resolver<CreatePlanFormValues>,
    defaultValues: getDefaultCreatePlanFormValues(defaultPlanId, '', defaultCompanyId)
  })
  const { setValue } = form

  useEffect(() => {
    if (!open) return
    if (editRow != null) {
      form.reset(getEditCompanyBudgetFormValuesFromRow(editRow, ''))
      return
    }
    const planId = pickDefaultCompensationBudgetPlanId(plansSafe, defaultCompensationBudgetPlanId)
    form.reset(getDefaultCreatePlanFormValues(planId, '', defaultCompanyId))
  }, [form, open, plansSafe, defaultCompensationBudgetPlanId, editRow, defaultCompanyId])

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  const [pendingSubmitValues, setPendingSubmitValues] = useState<CreatePlanFormValues | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const watchedCompanyId = useWatch({ control: form.control, name: 'companyId' })
  const effectiveCompanyId = isEdit ? editRow?.companyId : watchedCompanyId
  const { company: selectedCompany, loading: loadingSelectedCompany } = useCompany(
    accessToken,
    effectiveCompanyId,
    'record'
  )
  const { totalSalaryAcrossOrgUnits, loading: loadingCompanySalaryCost } = useCompanyCompensationSalaryBaseline(
    accessToken,
    effectiveCompanyId,
    t('overview-org-unit-unassigned'),
    open && Boolean(effectiveCompanyId)
  )

  const selectedCompanySalaryCost = useMemo(() => {
    if (isEdit && editRow != null) {
      return editRow.currentTotalSalaryCost
    }
    return totalSalaryAcrossOrgUnits
  }, [editRow, isEdit, totalSalaryAcrossOrgUnits])

  const selectedCompanyCurrencyOption = useMemo(
    () => findCompanyCurrencyOption(selectedCompany, currencyOptionsSafe),
    [currencyOptionsSafe, selectedCompany]
  )
  const selectedCompanyCurrencyRef = useMemo(() => getCompanyCurrencyRef(selectedCompany), [selectedCompany])
  const selectedCompanyMissingCurrency =
    open && !loadingSelectedCompany && selectedCompany != null && selectedCompanyCurrencyRef == null
  const selectedCompanyCurrencyMessage = selectedCompanyMissingCurrency
    ? t('budget-setup-create-plan-company-currency-missing')
    : null

  useEffect(() => {
    if (open || confirmSaveOpen) {
      return
    }

    setIsSubmitting(false)
  }, [confirmSaveOpen, open])

  const selectedCompanyCurrencyCode = useMemo(() => {
    if (selectedCompanyCurrencyOption) {
      return selectedCompanyCurrencyOption.label
    }
    return selectedCompanyCurrencyRef ? extractCurrencyCode(selectedCompanyCurrencyRef) : 'EUR'
  }, [selectedCompanyCurrencyOption, selectedCompanyCurrencyRef])

  useEffect(() => {
    if (!open || loadingSelectedCompany || currencyOptionsSafe.length === 0) return
    if (selectedCompanyCurrencyOption) {
      form.setValue('currencyRef', selectedCompanyCurrencyOption.id, { shouldValidate: true })
      return
    }
    form.setValue('currencyRef', '', { shouldValidate: false })
    form.clearErrors('currencyRef')
  }, [currencyOptionsSafe.length, form, loadingSelectedCompany, open, selectedCompanyCurrencyOption])

  const runCreateCompanyBudget = async () => {
    if (!pendingSubmitValues) {
      return
    }
    const values = pendingSubmitValues
    const { salaryBudgetAmount, salaryBudgetPercent } = values
    if (typeof salaryBudgetAmount !== 'number' || typeof salaryBudgetPercent !== 'number') {
      return
    }
    setIsSubmitting(true)
    try {
      const id = await onCreate({
        companyBudget: {
          compensationBudgetPlanId: values.compensationBudgetPlanId,
          companyId: values.companyId,
          salaryBudgetAmount,
          salaryBudgetPercent,
          currentTotalSalaryCost: selectedCompanySalaryCost,
          currencyRef: values.currencyRef.trim() === '' ? null : values.currencyRef.trim()
        }
      })
      if (id) {
        setConfirmSaveOpen(false)
        setPendingSubmitValues(null)
        onOpenChange(false)
        return
      }

      setIsSubmitting(false)
    } catch {
      setIsSubmitting(false)
    }
  }

  const watchedPlanId = useWatch({ control: form.control, name: 'compensationBudgetPlanId' })
  const selectedPlanMeta = useMemo(() => {
    const id = editRow == null ? watchedPlanId : editRow.compensationBudgetPlanId
    return plansSafe.find(p => p.id === id) ?? null
  }, [plansSafe, watchedPlanId, editRow])
  const duplicateCompanyBudgetExists = useMemo(() => {
    if (isEdit || !effectiveCompanyId || !watchedPlanId) {
      return false
    }
    return companyBudgetPlanRows.some(
      row => row.companyId === effectiveCompanyId && row.compensationBudgetPlanId === watchedPlanId
    )
  }, [companyBudgetPlanRows, effectiveCompanyId, isEdit, watchedPlanId])
  const duplicateCompanyBudgetMessage = duplicateCompanyBudgetExists
    ? t('budget-setup-create-plan-duplicate-company-cycle')
    : null

  const isSubmitLocked = creating || isSubmitting
  const showDuplicateCompanyBudgetMessage =
    open && !confirmSaveOpen && !isSubmitLocked && duplicateCompanyBudgetMessage != null

  const onSubmit = form.handleSubmit(async values => {
    if (isSubmitLocked) {
      return
    }

    if (isEdit && editRow != null && onUpdateRow) {
      setIsSubmitting(true)
      try {
        const ok = await onUpdateRow(editRow, values)
        if (ok) {
          onOpenChange(false)
          return
        }
        setIsSubmitting(false)
      } catch {
        setIsSubmitting(false)
      }
      return
    }
    if (duplicateCompanyBudgetExists) {
      return
    }
    setPendingSubmitValues(values)
    setConfirmSaveOpen(true)
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="gba:max-w-xl gba:max-h-[90vh] gba:overflow-y-auto"
          data-testid="budget-setup-create-plan-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t('budget-setup-update-company-budget-title') : t('budget-setup-create-plan-title')}
            </DialogTitle>
            {companyName ? (
              <p className="gba:text-sm gba:text-muted-foreground">
                {t('budget-setup-company-context', { company: companyName })}
              </p>
            ) : null}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={onSubmit} className="gba:space-y-4">
              {allowCompanySelection ? (
                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('selector-company-label')} : </FormLabel>
                      <Select
                        disabled={isEdit || companies.length === 0}
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger className="gba:w-full" data-testid="budget-setup-create-plan-company">
                            <SelectValue placeholder={t('selector-company-placeholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map(company => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {selectedPlanMeta ? (
                <div
                  className="gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:p-3 gba:text-sm"
                  data-testid="budget-setup-create-plan-selected-plan-details"
                >
                  <p className="gba:font-medium gba:text-foreground">
                    {t('budget-setup-plan-details-title')} : {selectedPlanMeta.name}
                  </p>
                  <dl className="gba:mt-2 gba:grid gba:grid-cols-1 gba:gap-1 sm:gba:grid-cols-2">
                    <div className="gba:flex gba:flex-wrap gba:gap-x-2">
                      <dt className="gba:text-muted-foreground">{t('budget-setup-field-planning-start')} : </dt>
                      <dd className="gba:tabular-nums">{formatDateOrDash(selectedPlanMeta.startDate)}</dd>
                    </div>
                    <div className="gba:flex gba:flex-wrap gba:gap-x-2">
                      <dt className="gba:text-muted-foreground">{t('budget-setup-field-planning-end')} : </dt>
                      <dd className="gba:tabular-nums">{formatDateOrDash(selectedPlanMeta.endDate)}</dd>
                    </div>
                    <div className="gba:flex gba:flex-wrap gba:gap-x-2">
                      <dt className="gba:text-muted-foreground">{t('budget-setup-field-effective-date')} : </dt>
                      <dd className="gba:tabular-nums">{formatDateOrDash(selectedPlanMeta.effectiveDate)}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
              {showDuplicateCompanyBudgetMessage ? (
                <p className="gba:text-sm gba:text-destructive" data-testid="budget-setup-create-plan-duplicate">
                  {duplicateCompanyBudgetMessage}
                </p>
              ) : null}
              {plansSafe.length === 0 && !loadingPlans ? (
                <p className="gba:text-sm gba:text-muted-foreground">{t('budget-setup-create-plan-no-plans-hint')}</p>
              ) : null}

              <BudgetSetupCreatePlanCompanyBudgetFields
                control={form.control}
                setValue={setValue}
                annualSalaryCost={selectedCompanySalaryCost}
                currencyCode={selectedCompanyCurrencyCode}
                hasCurrency={selectedCompanyCurrencyOption != null}
                currencyOptions={currencyOptionsSafe}
                loadingCurrencies={loadingCurrencies || loadingCompanySalaryCost || loadingSelectedCompany}
                disableCurrency
                currencyMessage={selectedCompanyCurrencyMessage}
                t={t}
              />

              <DialogFooter className="gba:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitLocked}
                  data-testid="budget-setup-create-plan-cancel"
                >
                  {t('budget-setup-cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitLocked ||
                    loadingCurrencies ||
                    loadingCompanySalaryCost ||
                    loadingSelectedCompany ||
                    currencyOptionsSafe.length === 0 ||
                    selectedCompanyCurrencyOption == null ||
                    duplicateCompanyBudgetExists ||
                    (!isEdit && (loadingPlans || plansSafe.length === 0))
                  }
                  data-testid="budget-setup-create-plan-submit"
                >
                  {isEdit ? t('budget-setup-update-company-budget-submit') : t('budget-setup-create-plan-submit')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <DialogContent className="gba:max-w-md" data-testid="budget-setup-company-save-confirm-dialog">
          <DialogHeader>
            <DialogTitle>{t('budget-setup-company-save-confirm-title')}</DialogTitle>
          </DialogHeader>
          <p className="gba:text-sm gba:text-muted-foreground">{t('budget-setup-company-save-confirm-description')}</p>
          <DialogFooter className="gba:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitLocked}
              onClick={() => setConfirmSaveOpen(false)}
              data-testid="budget-setup-company-save-confirm-cancel"
            >
              {t('budget-setup-company-save-confirm-cancel')}
            </Button>
            <Button
              type="button"
              disabled={isSubmitLocked}
              onClick={() => {
                runCreateCompanyBudget()
              }}
              data-testid="budget-setup-company-save-confirm-confirm"
            >
              {isSubmitLocked ? t('budget-setup-create-plan-saving') : t('budget-setup-company-save-confirm-confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
