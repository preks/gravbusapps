import React, { useEffect, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDateToISO, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import { LocalizationProvider, useTranslation, Spinner } from '@newwork/nw-design-system'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AdjustEmployeeSalaryProvider, useAdjustEmployeeSalary } from './AdjustEmployeeSalaryContext'
import { useForm } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues } from './types'
import SalaryAdjustmentGroup from './components/SalaryAdjustmentGroup'
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

  const currentSalaryAnnual = useMemo(() => currentCompensation?.annualGrossSalary || 0, [currentCompensation])
  const currentSalaryMonthly = useMemo(() => currentCompensation?.monthlyGrossSalary ?? null, [currentCompensation])
  const currentSalaryHourly = useMemo(() => currentCompensation?.hourlyGrossSalary ?? null, [currentCompensation])
  const currentCurrency = useMemo(() => currentCompensation?.currency || null, [currentCompensation])

  const locale = useMemo(() => getCurrentActiveUserLocale(), [])

  // Calculate default frequency based on available salary data
  const defaultFrequency = useMemo<'annually' | 'monthly' | 'hourly'>(() => {
    if (currentSalaryHourly != null && currentSalaryHourly > 0) {
      return 'hourly'
    } else if (currentSalaryMonthly != null && currentSalaryMonthly > 0) {
      return 'monthly'
    } else {
      return 'annually'
    }
  }, [currentSalaryMonthly, currentSalaryHourly])

  const defaultValues: AdjustEmployeeSalaryFormValues = useMemo(
    () => ({
      amountIncrease: null,
      percentageIncrease: null,
      adjustmentFrequency: defaultFrequency,
      effectiveDate: '',
      reason: '',
      notes: ''
    }),
    [defaultFrequency]
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
    amountIncrease: v.amountIncrease || null,
    percentageIncrease: v.percentageIncrease || null,
    adjustmentFrequency: v.adjustmentFrequency,
    effectiveDate: v.effectiveDate || '',
    reason: v.reason || '',
    notes: v.notes || ''
  })

  // Watch only needed fields instead of all fields
  const amountIncrease = form.watch('amountIncrease')
  const percentageIncrease = form.watch('percentageIncrease')
  const adjustmentFrequency = form.watch('adjustmentFrequency')
  const effectiveDate = form.watch('effectiveDate')
  const reason = form.watch('reason')
  const notes = form.watch('notes')

  const watchedValues = useMemo(
    () => ({
      amountIncrease,
      percentageIncrease,
      adjustmentFrequency,
      effectiveDate,
      reason,
      notes
    }),
    [amountIncrease, percentageIncrease, adjustmentFrequency, effectiveDate, reason, notes]
  )

  const isUnchangedNow = useMemo(() => {
    return (
      JSON.stringify(normalizeForCompare(watchedValues as any)) ===
      JSON.stringify(normalizeForCompare(initialRef.current))
    )
  }, [watchedValues])

  const title = useMemo(() => t('adjust-salary-title'), [t])

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
          onSubmit={async (values: AdjustEmployeeSalaryFormValues) => {
            // Mark as submitting to prevent form resets during submission
            isSubmittingRef.current = true
            try {
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
                  currencyRef: currentCompensation?.currencyRef || '',
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
                  currencyRef: currentCompensation?.currencyRef || '',
                  salaryAdjustReason: values.reason || '',
                  startDate: values.effectiveDate
                    ? (() => {
                        const date = new Date(values.effectiveDate)
                        if (Number.isNaN(date.getTime())) {
                          return null
                        }
                        return formatDateToISO(date)
                      })()
                    : null,
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
          data-testid="adjust-employee-salary"
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="adjust-employee-salary-groups">
            {/* Salary Adjustment Group */}
            <SalaryAdjustmentGroup
              control={form.control}
              currentSalaryAnnual={currentSalaryAnnual}
              currentSalaryMonthly={currentSalaryMonthly}
              currentSalaryHourly={currentSalaryHourly}
              currentCurrency={currentCurrency}
              locale={locale}
              salaryAdjustReasonEntries={salaryAdjustReasonEntries}
            />
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
