import React, { useEffect, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDateToISO, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import { LocalizationProvider, useTranslation } from '@newwork/nw-design-system'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AdjustEmployeeSalaryProvider, useAdjustEmployeeSalary } from './AdjustEmployeeSalaryContext'
import { useForm } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues, CatalogEntry } from './types'
import SalaryAdjustmentGroup from './components/SalaryAdjustmentGroup'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { calculateAmountFromPercentage } from './utils/salaryCalculator'
import translations from '../../apps/employee-record/_i18n'

const AdjustEmployeeSalaryContent: React.FC<BusinessAppContextProps> = ({ additionalData }) => {
  const { t } = useTranslation(translations)
  const { data } = useAdjustEmployeeSalary()

  const employee = useMemo(() => data?.employee?.EmployeeByPk, [data])
  const currentCompensation = useMemo(() => data?.compensation?.EmployeeWorkingCondition?.[0] || null, [data])
  const currentSalary = useMemo(() => currentCompensation?.annualGrossSalary || 0, [currentCompensation])
  const currentCurrency = useMemo(() => currentCompensation?.currency || null, [currentCompensation])

  const catalogs = useMemo(
    () => ({
      currency: data?.catalogs?.currency || []
    }),
    [data]
  )

  const locale = useMemo(() => getCurrentActiveUserLocale(), [])

  const defaultValues: AdjustEmployeeSalaryFormValues = useMemo(
    () => ({
      amountIncrease: null,
      percentageIncrease: null,
      currencyRef: currentCurrency?.id || '',
      effectiveDate: '',
      reason: '',
      description: '',
      notes: ''
    }),
    [currentCurrency]
  )

  const form = useForm<AdjustEmployeeSalaryFormValues>({
    defaultValues,
    mode: 'onChange'
  })

  // Normalize default values to match Select option value types (string ids)
  const normalizedDefaults: AdjustEmployeeSalaryFormValues = useMemo(() => {
    const toIdString = (val: any) => (val === null || val === undefined || val === '' ? '' : String(val))
    const findId = (list: CatalogEntry[] | undefined, current: any) => {
      if (!list || current === null || current === undefined || current === '') return ''
      const currentStr = String(current)
      const match = list.find(
        e =>
          String(e?.id) === currentStr ||
          String(e?.value) === currentStr ||
          String(e?.translations?.[0]?.value) === currentStr
      )
      return match ? String(match.id) : toIdString(current)
    }

    return {
      ...defaultValues,
      currencyRef: findId(catalogs.currency, defaultValues.currencyRef || currentCurrency?.id)
    } as AdjustEmployeeSalaryFormValues
  }, [defaultValues, catalogs, currentCurrency])

  // Reset to normalized defaults whenever catalogs change
  useEffect(() => {
    // Only reset if form is pristine (not yet touched by user)
    if (!form.formState.isDirty) {
      form.reset(normalizedDefaults)
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
    currencyRef: v.currencyRef || '',
    effectiveDate: v.effectiveDate || '',
    reason: v.reason || '',
    description: v.description || '',
    notes: v.notes || ''
  })

  const watchedValues = form.watch()
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
            // Calculate new annual salary - use amount if available, otherwise calculate from percentage
            let newAnnualSalary = currentSalary
            let adjustmentValue = 0
            let adjustmentType: 'amount' | 'percentage' = 'amount'

            if (values.amountIncrease && values.amountIncrease > 0) {
              adjustmentValue = values.amountIncrease
              adjustmentType = 'amount'
              newAnnualSalary = currentSalary + values.amountIncrease
            } else if (values.percentageIncrease && values.percentageIncrease > 0) {
              adjustmentValue = values.percentageIncrease
              adjustmentType = 'percentage'
              const increaseAmount = calculateAmountFromPercentage(currentSalary, values.percentageIncrease)
              newAnnualSalary = currentSalary + increaseAmount
            }

            const payload = {
              event: 'pse_submit',
              employeeSalaryAdjustment: {
                employee: employeeId,
                adjustmentType: adjustmentType,
                adjustmentValue: adjustmentValue,
                amountIncrease: values.amountIncrease || null,
                percentageIncrease: values.percentageIncrease || null,
                newAnnualSalary: newAnnualSalary,
                currencyRef: values.currencyRef && values.currencyRef !== '' ? values.currencyRef : '',
                effectiveDate: values.effectiveDate
                  ? (() => {
                      const date = new Date(values.effectiveDate)
                      if (isNaN(date.getTime())) {
                        console.error('Invalid effective date:', values.effectiveDate)
                        return ''
                      }
                      return formatDateToISO(date)
                    })()
                  : '',
                reason: values.reason || '',
                description: values.description || '',
                notes: values.notes || ''
              }
            }

            return payload
          }}
          data-testid="adjust-employee-salary"
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="adjust-employee-salary-groups">
            {/* Salary Adjustment Group */}
            <SalaryAdjustmentGroup
              control={form.control}
              setValue={form.setValue}
              catalogs={catalogs}
              currentSalary={currentSalary}
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
