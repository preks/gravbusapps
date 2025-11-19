import React, { useEffect, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDateToISO, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import { LocalizationProvider, useTranslation } from '@newwork/nw-design-system'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AdjustEmployeeSalaryProvider, useAdjustEmployeeSalary } from './AdjustEmployeeSalaryContext'
import { useForm } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues } from './types'
import SalaryAdjustmentGroup from './components/SalaryAdjustmentGroup'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { calculateAmountFromPercentage, calculateAdjustmentInAnnual } from './utils/salaryCalculator'
import translations from '../../apps/employee-record/_i18n'

const AdjustEmployeeSalaryContent: React.FC<BusinessAppContextProps> = ({ additionalData }) => {
  const { t } = useTranslation(translations)
  const { data } = useAdjustEmployeeSalary()

  const employee = useMemo(() => data?.employee?.EmployeeByPk, [data])
  const currentCompensation = useMemo(() => data?.compensation?.EmployeeWorkingCondition?.[0] || null, [data])

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
  }, [currentSalaryAnnual, currentSalaryMonthly, currentSalaryHourly])

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
              let newAnnualSalary: number | null = null
              let newMonthlySalary: number | null = null
              let newHourlySalary: number | null = null
              let adjustmentValue = 0
              let adjustmentType: 'amount' | 'percentage' = 'amount'

              if (values.adjustmentFrequency === 'hourly') {
                // Hourly: Only calculate hourly rate, no annual/monthly conversions
                if (currentSalaryHourly == null || currentSalaryHourly === 0) {
                  throw new Error('Hourly salary is required for hourly adjustments')
                }
                const currentHourly = currentSalaryHourly
                if (values.amountIncrease && values.amountIncrease > 0) {
                  adjustmentValue = values.amountIncrease
                  adjustmentType = 'amount'
                  newHourlySalary = currentHourly + values.amountIncrease
                } else if (values.percentageIncrease && values.percentageIncrease > 0) {
                  adjustmentValue = values.percentageIncrease
                  adjustmentType = 'percentage'
                  const increaseAmount = calculateAmountFromPercentage(currentHourly, values.percentageIncrease)
                  newHourlySalary = currentHourly + increaseAmount
                }
              } else {
                // Annually/Monthly: Convert to annual and calculate monthly
                const currentSalaryInFrequency =
                  values.adjustmentFrequency === 'monthly'
                    ? (currentSalaryMonthly ?? currentSalaryAnnual / 12)
                    : currentSalaryAnnual

                if (values.amountIncrease && values.amountIncrease > 0) {
                  adjustmentValue = values.amountIncrease
                  adjustmentType = 'amount'
                  const adjustmentAnnual = calculateAdjustmentInAnnual(
                    values.amountIncrease,
                    values.adjustmentFrequency
                  )
                  if (adjustmentAnnual != null) {
                    newAnnualSalary = currentSalaryAnnual + adjustmentAnnual
                    newMonthlySalary = newAnnualSalary / 12
                  }
                } else if (values.percentageIncrease && values.percentageIncrease > 0) {
                  adjustmentValue = values.percentageIncrease
                  adjustmentType = 'percentage'
                  const increaseAmount = calculateAmountFromPercentage(
                    currentSalaryInFrequency,
                    values.percentageIncrease
                  )
                  const adjustmentAnnual = calculateAdjustmentInAnnual(increaseAmount, values.adjustmentFrequency)
                  if (adjustmentAnnual != null) {
                    newAnnualSalary = currentSalaryAnnual + adjustmentAnnual
                    newMonthlySalary = newAnnualSalary / 12
                  }
                }
              }

              const payload = {
                event: 'pse_submit',
                employeeSalary: {
                  employee: employeeId,
                  adjustmentType: adjustmentType,
                  adjustmentValue: adjustmentValue,
                  amountIncrease: values.amountIncrease || null,
                  percentageIncrease: values.percentageIncrease || null,
                  adjustmentFrequency: values.adjustmentFrequency,
                  newAnnualSalary: newAnnualSalary,
                  newMonthlySalary: newMonthlySalary,
                  newHourlySalary: newHourlySalary,
                  effectiveDate: values.effectiveDate
                    ? (() => {
                        const date = new Date(values.effectiveDate)
                        if (isNaN(date.getTime())) {
                          return ''
                        }
                        return formatDateToISO(date)
                      })()
                    : '',
                  reason: values.reason || '',
                  notes: values.notes || ''
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
              catalogs={{} as Record<string, never>}
              currentSalaryAnnual={currentSalaryAnnual}
              currentSalaryMonthly={currentSalaryMonthly}
              currentSalaryHourly={currentSalaryHourly}
              currentCurrency={currentCurrency}
              locale={locale}
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
