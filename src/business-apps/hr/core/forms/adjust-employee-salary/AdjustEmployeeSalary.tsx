import React, { useEffect, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDateToISO, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import { LocalizationProvider, useTranslation, Spinner } from '@newwork/nw-design-system'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AdjustEmployeeSalaryProvider, useAdjustEmployeeSalary } from './AdjustEmployeeSalaryContext'
import { useForm } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues, FormMode } from './types'
import SalaryAdjustmentGroup from './components/SalaryAdjustmentGroup'
import AssignSalaryGroup from './components/AssignSalaryGroup'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { calculateSalaryAdjustment } from './utils/calculateSalaryAdjustment'
import { findActiveSalary } from './utils/findActiveSalary'
import translations from '../_i18n'

const AdjustEmployeeSalaryContent: React.FC<BusinessAppContextProps> = ({ additionalData, userInfo }) => {
  const { t } = useTranslation(translations)
  const { data, isLoading } = useAdjustEmployeeSalary()

  const employee = useMemo(() => data?.employee?.EmployeeByPk, [data])
  const currentCompensation = useMemo(() => findActiveSalary(data?.compensation?.AllEmployeeSalaries || []), [data])
  const salaryAdjustReasonEntries = useMemo(
    () => data?.catalogs?.salaryAdjustReason?.CatalogEntry || [],
    [data?.catalogs?.salaryAdjustReason]
  )

  // Form mode, currencies, and hire date from context
  const formMode: FormMode = useMemo(() => data?.formMode || 'adjust', [data?.formMode])
  const currencies = useMemo(() => data?.currencies || [], [data?.currencies])
  // Hire date for assign mode - format from timestamp to YYYY-MM-DD for date input
  const hireDate = useMemo(() => {
    if (!data?.hireDate) return ''
    try {
      const date = new Date(data.hireDate)
      if (Number.isNaN(date.getTime())) return ''
      // Format as YYYY-MM-DD for date input
      return date.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }, [data?.hireDate])

  const currentSalaryAnnual = useMemo(() => currentCompensation?.annualGrossSalary || 0, [currentCompensation])
  const currentSalaryMonthly = useMemo(() => currentCompensation?.monthlyGrossSalary ?? null, [currentCompensation])
  const currentSalaryHourly = useMemo(() => currentCompensation?.hourlyGrossSalary ?? null, [currentCompensation])
  const currentCurrency = useMemo(() => currentCompensation?.currency || null, [currentCompensation])
  const currentCurrencyRef = useMemo(() => currentCompensation?.currencyRef || '', [currentCompensation])

  const locale = useMemo(() => getCurrentActiveUserLocale(), [])

  // Calculate default frequency based on available salary data (for adjust mode)
  // Default to 'annually' if employee has annual/monthly salary, only use 'hourly' if employee has hourly salary only
  const defaultFrequency = useMemo<'annually' | 'monthly' | 'hourly'>(() => {
    const hasAnnualOrMonthlySalary =
      (currentSalaryAnnual != null && currentSalaryAnnual > 0) ||
      (currentSalaryMonthly != null && currentSalaryMonthly > 0)
    const hasHourlySalary = currentSalaryHourly != null && currentSalaryHourly > 0

    // If employee has hourly salary but no annual/monthly, default to hourly
    if (hasHourlySalary && !hasAnnualOrMonthlySalary) {
      return 'hourly'
    }
    // Otherwise default to annually
    return 'annually'
  }, [currentSalaryAnnual, currentSalaryMonthly, currentSalaryHourly])

  // Default currency (EUR if available, otherwise first in list)
  const defaultCurrency = useMemo(() => {
    const eurCurrency = currencies.find(c => c.code === 'EUR')
    return eurCurrency?.id || currencies[0]?.id || ''
  }, [currencies])

  const defaultValues: AdjustEmployeeSalaryFormValues = useMemo(
    () => ({
      // Adjust mode fields
      amountIncrease: null,
      percentageIncrease: null,
      adjustmentFrequency: defaultFrequency,
      reason: '',
      // Assign mode fields
      salaryType: 'yearlyMonthly',
      annualSalary: null,
      hourlySalary: null,
      currency: defaultCurrency,
      // Shared fields - use hire date as default for assign mode
      effectiveDate: formMode === 'assign' ? hireDate : '',
      notes: ''
    }),
    [defaultFrequency, defaultCurrency, formMode, hireDate]
  )

  const form = useForm<AdjustEmployeeSalaryFormValues>({
    defaultValues,
    mode: 'onSubmit' // Only validate on submit, not during typing
  })

  const normalizedDefaults: AdjustEmployeeSalaryFormValues = useMemo(() => {
    return {
      ...defaultValues
    } as AdjustEmployeeSalaryFormValues
  }, [defaultValues])

  // Track submission state reliably with a ref
  const isSubmittingRef = useRef(false)

  // Reset to normalized defaults whenever catalogs change
  useEffect(() => {
    // Only reset if form is pristine (not yet touched by user) and not submitting
    if (!form.formState.isDirty && !isSubmittingRef.current) {
      form.reset(normalizedDefaults, { keepDirty: false })
    }
  }, [normalizedDefaults, form])

  // Track initial values for change detection
  const initialRef = useRef<AdjustEmployeeSalaryFormValues>(normalizedDefaults)
  useEffect(() => {
    initialRef.current = normalizedDefaults
  }, [normalizedDefaults])

  const normalizeForCompare = (v: AdjustEmployeeSalaryFormValues) => ({
    // Adjust mode fields - use ?? for numbers to preserve 0 as a value
    amountIncrease: v.amountIncrease ?? null,
    percentageIncrease: v.percentageIncrease ?? null,
    adjustmentFrequency: v.adjustmentFrequency,
    reason: v.reason || '',
    // Assign mode fields - use ?? for numbers to preserve 0 as a value
    salaryType: v.salaryType,
    annualSalary: v.annualSalary ?? null,
    hourlySalary: v.hourlySalary ?? null,
    currency: v.currency || '',
    // Shared fields
    effectiveDate: v.effectiveDate || '',
    notes: v.notes || ''
  })

  // Watch only needed fields instead of all fields
  const amountIncrease = form.watch('amountIncrease')
  const percentageIncrease = form.watch('percentageIncrease')
  const adjustmentFrequency = form.watch('adjustmentFrequency')
  const effectiveDate = form.watch('effectiveDate')
  const reason = form.watch('reason')
  const notes = form.watch('notes')
  // Assign mode watched fields
  const salaryType = form.watch('salaryType')
  const annualSalary = form.watch('annualSalary')
  const hourlySalary = form.watch('hourlySalary')
  const currency = form.watch('currency')

  const watchedValues = useMemo(
    () => ({
      amountIncrease,
      percentageIncrease,
      adjustmentFrequency,
      effectiveDate,
      reason,
      notes,
      salaryType,
      annualSalary,
      hourlySalary,
      currency
    }),
    [
      amountIncrease,
      percentageIncrease,
      adjustmentFrequency,
      effectiveDate,
      reason,
      notes,
      salaryType,
      annualSalary,
      hourlySalary,
      currency
    ]
  )

  const isUnchangedNow = useMemo(() => {
    return (
      JSON.stringify(normalizeForCompare(watchedValues as any)) ===
      JSON.stringify(normalizeForCompare(initialRef.current))
    )
  }, [watchedValues])

  // Dynamic title based on mode
  const title = useMemo(
    () => (formMode === 'assign' ? t('assign-salary-title') : t('adjust-salary-title')),
    [t, formMode]
  )

  // Get currency code for formatting (from selected currency in assign mode, or current salary in adjust mode)
  const selectedCurrencyCode = useMemo(() => {
    if (formMode === 'assign' && currency) {
      const selectedCurrency = currencies.find(c => c.id === currency)
      return selectedCurrency?.code || 'EUR'
    }
    return (currentCurrency as any)?.code || 'EUR'
  }, [formMode, currency, currencies, currentCurrency])

  // Extract employeeId with priority: externalContextData (from AppAction) > process payload > direct > employee data
  const externalContext = (additionalData as any)?.externalContextData || {}
  const employeeId =
    externalContext?.employeeId || // From AppAction externalContextData (highest priority)
    additionalData?.psi_taskPayload?.employeeId ||
    additionalData?.psi_taskPayload?.initialParameters?.employeeId ||
    additionalData?.employeeId ||
    employee?.code ||
    employee?.id ||
    ''

  // Show loading state while fetching data to prevent displaying zero values
  if (isLoading) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[800px]"
        data-testid="flw_adjustEmployeeSalary_screenContentLayout"
      >
        <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
        <div className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[800px]"
      data-testid="flw_adjustEmployeeSalary_screenContentLayout"
    >
      <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='adjust-employee-salary']]:pt-0!"
        data-testid="adjust-employee-salary-form-content"
      >
        <AppActionForm
          processType="create"
          form={form as any}
          formData={normalizedDefaults}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          cancelButtonText={t('action-cancel')}
          submitButtonText={t('action-submit')}
          isSubmitDisabled={!form.formState.isValid || isUnchangedNow}
          // Shows cancel button - default cancelEventType="pse_abort" handles process abort
          onCancel={() => undefined}
          onSubmit={async (values: AdjustEmployeeSalaryFormValues) => {
            // Mark as submitting to prevent form resets during submission
            isSubmittingRef.current = true
            try {
              // Format effective date
              const formattedStartDate = values.effectiveDate
                ? (() => {
                    const date = new Date(values.effectiveDate)
                    if (Number.isNaN(date.getTime())) {
                      return null
                    }
                    return formatDateToISO(date)
                  })()
                : null

              // === ASSIGN MODE ===
              if (formMode === 'assign') {
                const isHourly = values.salaryType === 'hourly'
                // Calculate monthly salary for yearly/monthly type
                const monthlyGrossSalary = isHourly
                  ? null
                  : values.annualSalary !== null
                    ? values.annualSalary / 12
                    : null
                const payload = {
                  event: 'pse_submit',
                  employeeId: employeeId,
                  initiatorEmployeeId: userInfo?.employeeDetails?.employeeId || '',
                  oldEmployeeSalary: null, // No old salary in assign mode
                  employeeSalary: {
                    employee: employeeId,
                    annualGrossSalary: isHourly ? null : values.annualSalary,
                    monthlyGrossSalary: monthlyGrossSalary,
                    hourlyGrossSalary: isHourly ? values.hourlySalary : null,
                    currencyRef: values.currency || '',
                    salaryAdjustReason: null, // No reason for assign mode
                    startDate: formattedStartDate,
                    notes: values.notes || '',
                    stockOptions: false,
                    endDate: null,
                    requestStatus: null,
                    requestDate: null,
                    decisionDate: null,
                    requestedPercent: null,
                    requestedAmount: null,
                    decisionEmployee: null
                  }
                }
                return payload
              }

              // === ADJUST MODE ===
              // Calculate adjustment based on frequency
              const { newAnnualSalary, newMonthlySalary, newHourlySalary } = calculateSalaryAdjustment(
                values,
                currentSalaryAnnual,
                currentSalaryMonthly,
                currentSalaryHourly
              )

              // Ensure annualGrossSalary is always a number (not null)
              // For hourly adjustments, use current annual salary as fallback
              const finalAnnualGrossSalary = newAnnualSalary ?? (currentSalaryAnnual || 0)
              // For monthly, calculate from annual if null
              const finalMonthlyGrossSalary =
                newMonthlySalary ?? (finalAnnualGrossSalary > 0 ? finalAnnualGrossSalary / 12 : null)

              const payload = {
                event: 'pse_submit',
                employeeId: employeeId,
                initiatorEmployeeId: userInfo?.employeeDetails?.employeeId || '',
                oldEmployeeSalary: {
                  employee: employeeId,
                  annualGrossSalary: currentSalaryAnnual,
                  monthlyGrossSalary: currentSalaryMonthly,
                  hourlyGrossSalary: currentSalaryHourly,
                  currencyRef: currentCurrencyRef,
                  startDate: null,
                  endDate: null,
                  stockOptions: false,
                  notes: null,
                  requestStatus: null,
                  requestDate: null,
                  decisionDate: null,
                  requestedPercent: null,
                  requestedAmount: null,
                  salaryAdjustReason: null,
                  decisionEmployee: null
                },
                employeeSalary: {
                  employee: employeeId,
                  annualGrossSalary: finalAnnualGrossSalary,
                  monthlyGrossSalary: finalMonthlyGrossSalary,
                  hourlyGrossSalary: newHourlySalary,
                  currencyRef: currentCurrencyRef,
                  salaryAdjustReason: values.reason || '',
                  startDate: formattedStartDate,
                  notes: values.notes || '',
                  stockOptions: false,
                  endDate: null,
                  requestStatus: null,
                  requestDate: null,
                  decisionDate: null,
                  requestedPercent: values.percentageIncrease || null,
                  requestedAmount: values.amountIncrease || null,
                  decisionEmployee: null
                }
              }

              return payload
            } finally {
              // Reset submission flag after submission completes (success or error)
              isSubmittingRef.current = false
            }
          }}
          data-testid={formMode === 'assign' ? 'assign-employee-salary' : 'adjust-employee-salary'}
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid={`${formMode}-employee-salary-groups`}>
            {formMode === 'assign' ? (
              /* Assign Salary Group - for new employees without salary */
              <AssignSalaryGroup
                control={form.control}
                currencies={currencies}
                currencyCode={selectedCurrencyCode}
                locale={locale}
              />
            ) : (
              /* Salary Adjustment Group - for existing employees */
              <SalaryAdjustmentGroup
                control={form.control}
                currentSalaryAnnual={currentSalaryAnnual}
                currentSalaryMonthly={currentSalaryMonthly}
                currentSalaryHourly={currentSalaryHourly}
                currentCurrency={currentCurrency}
                locale={locale}
                salaryAdjustReasonEntries={salaryAdjustReasonEntries}
              />
            )}
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export const AdjustEmployeeSalary: React.FC<BusinessAppContextProps> = context => {
  const locale = useMemo(() => getCurrentActiveUserLocale(), [])
  return (
    <LocalizationProvider locale={locale as any}>
      <AdjustEmployeeSalaryProvider {...context}>
        <AdjustEmployeeSalaryContent {...context} />
      </AdjustEmployeeSalaryProvider>
    </LocalizationProvider>
  )
}

export default AdjustEmployeeSalary
