import React, { useEffect, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import { LocalizationProvider, useTranslation, type SupportedLocale } from '@newwork/nw-design-system'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { GrantEmployeeBonusProvider, useGrantEmployeeBonus } from './GrantEmployeeBonusContext'
import { useForm } from 'react-hook-form'
import type { GrantEmployeeBonusFormValues, CatalogEntry } from './types'
import BonusDetailsGroup from './components/BonusDetailsGroup'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { extractEmployeeId } from './utils/employeeIdUtils'
import { useTaskCancellation } from '../../hooks/useTaskCancellation'
import translations from '../_i18n'

const GrantEmployeeBonusContent: React.FC<BusinessAppContextProps> = ({ additionalData, userInfo }) => {
  const { data } = useGrantEmployeeBonus()
  const { t } = useTranslation(translations)

  const employee = useMemo(() => data?.employee?.EmployeeByPk, [data])
  const employeePosition = useMemo(() => data?.employee?.EmployeePosition?.[0], [data])
  const catalogs = useMemo(
    () => ({
      bonusType: data?.catalogs?.bonusType || []
    }),
    [data]
  )

  // Get currency from employee bank account - memoize to prevent form resets
  const employeeCurrency = useMemo(() => data?.employeeCurrency, [data])
  const currencyRef = useMemo(() => employeeCurrency?.currencyRef || '', [employeeCurrency?.currencyRef])
  const currencyDisplay = useMemo(() => {
    if (!currencyRef) return ''
    // Extract currency code from ref (e.g., "Currency:v1:USD" -> "USD")
    const parts = currencyRef.split(':')
    return parts[parts.length - 1] || ''
  }, [currencyRef])

  const defaultValues: GrantEmployeeBonusFormValues = useMemo(
    () => ({
      employeeBonusTypeRef: '',
      amount: null,
      currencyRef: currencyRef,
      paymentMonth: new Date().getMonth() + 1, // 1-12 for Jan-Dec
      fiscalYear: new Date().getFullYear(),
      notes: ''
    }),
    [currencyRef]
  )

  const form = useForm<GrantEmployeeBonusFormValues>({
    defaultValues,
    mode: 'onChange'
  })

  // Normalize default values to match Select option value types (string ids)
  const normalizedDefaults: GrantEmployeeBonusFormValues = useMemo(() => {
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
      employeeBonusTypeRef: findId(catalogs.bonusType, defaultValues.employeeBonusTypeRef)
    } as GrantEmployeeBonusFormValues
  }, [defaultValues, catalogs])

  // Handle task cancellation when form closes without submission
  const { markAsSubmitted, markAsCancelled } = useTaskCancellation('pse_abort')

  // Reset to normalized defaults whenever catalogs change
  useEffect(() => {
    // Only reset if form is pristine (not yet touched by user)
    if (!form.formState.isDirty) {
      form.reset(normalizedDefaults)
    }
  }, [normalizedDefaults, form])

  // Track initial values for change detection
  const initialRef = useRef<GrantEmployeeBonusFormValues>(normalizedDefaults)
  useEffect(() => {
    initialRef.current = normalizedDefaults
  }, [normalizedDefaults])

  const normalizeForCompare = (v: GrantEmployeeBonusFormValues) => ({
    employeeBonusTypeRef: v.employeeBonusTypeRef || '',
    amount: v.amount || null,
    currencyRef: v.currencyRef || '',
    paymentMonth: v.paymentMonth || new Date().getMonth() + 1,
    fiscalYear: v.fiscalYear || new Date().getFullYear(),
    notes: v.notes || ''
  })

  const watchedValues = form.watch()
  const isUnchangedNow = useMemo(() => {
    return (
      JSON.stringify(normalizeForCompare(watchedValues as any)) ===
      JSON.stringify(normalizeForCompare(initialRef.current))
    )
  }, [watchedValues])

  const title = useMemo(() => t('form-title'), [t])

  // Extract employeeId using shared utility function
  const employeeId = useMemo(
    () => extractEmployeeId(additionalData, userInfo, employee),
    [additionalData, userInfo, employee]
  )

  // Extract manager employee ID (logged-in user who initiates the flow)
  const managerEmployeeId = userInfo?.employeeDetails?.employeeId || ''

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[800px]"
      data-testid="flw_grantEmployeeBonus_screenContentLayout"
    >
      <FormHeader
        title={title}
        flowIconUrl={flowIconUrl}
        employee={
          employee
            ? {
                firstName: employee.firstName,
                lastName: employee.lastName,
                pictureThumbnail: employee.pictureThumbnail,
                jobTitle: employeePosition?.jobPosition?.name
              }
            : undefined
        }
      />

      <div
        className="gba:flex gba:flex-col gba:[&>div[data-testid='grant-employee-bonus']]:pt-0!"
        data-testid="grant-employee-bonus-form-content"
      >
        <AppActionForm
          processType="create"
          form={form}
          formData={normalizedDefaults}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          cancelButtonText={t('action-cancel')}
          submitButtonText={t('action-submit')}
          isSubmitDisabled={!form.formState.isValid || isUnchangedNow}
          // Shows cancel button - default cancelEventType="pse_abort" handles process abort
          onCancel={() => {
            markAsCancelled()
          }}
          onSubmit={async (values: GrantEmployeeBonusFormValues) => {
            // Mark as submitted to prevent abort on cleanup
            markAsSubmitted()

            const payload = {
              // Manager context for Kogito flow
              employeeIdManager: managerEmployeeId,
              requireManagerApproval: false,
              // Employee bonus details
              employeeBonus: {
                employee: employeeId,
                employeeBonusTypeRef:
                  values.employeeBonusTypeRef && values.employeeBonusTypeRef !== '' ? values.employeeBonusTypeRef : '',
                amount: values.amount || 0,
                currencyRef: currencyRef || null,
                paymentDate: `${values.fiscalYear || new Date().getFullYear()}-${String(values.paymentMonth || 1).padStart(2, '0')}-01`,
                fiscalYear: values.fiscalYear || new Date().getFullYear(),
                notes: values.notes || ''
              }
            }

            return payload
          }}
          data-testid="grant-employee-bonus"
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="grant-employee-bonus-groups">
            {/* Bonus Details Group */}
            <BonusDetailsGroup control={form.control} catalogs={catalogs} currencyDisplay={currencyDisplay} t={t} />
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export const GrantEmployeeBonus: React.FC<BusinessAppContextProps> = context => {
  const locale = useMemo(() => getCurrentActiveUserLocale() as SupportedLocale, [])
  return (
    <LocalizationProvider locale={locale}>
      <GrantEmployeeBonusProvider {...context}>
        <GrantEmployeeBonusContent {...context} />
      </GrantEmployeeBonusProvider>
    </LocalizationProvider>
  )
}

export default GrantEmployeeBonus
