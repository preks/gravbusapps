import React, { useEffect, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  getTranslationFromI18nKeyAndLabel,
  formatDateToISO,
  getCurrentActiveUserLocale
} from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import { LocalizationProvider } from '@newwork/nw-design-system'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { GrantEmployeeBonusProvider, useGrantEmployeeBonus } from './GrantEmployeeBonusContext'
import { useForm } from 'react-hook-form'
import type { GrantEmployeeBonusFormValues, CatalogEntry } from './types'
import BonusDetailsGroup from './components/BonusDetailsGroup'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { CompensationStatus } from '../../apps/employee-record/components/tabs/compensation/types/compensationEnums'

const GrantEmployeeBonusContent: React.FC<BusinessAppContextProps> = ({ additionalData }) => {
  const { data } = useGrantEmployeeBonus()

  const employee = useMemo(() => data?.employee?.EmployeeByPk, [data])
  const catalogs = useMemo(
    () => ({
      bonusType: data?.catalogs?.bonusType || [],
      currency: data?.catalogs?.currency || []
    }),
    [data]
  )

  const defaultValues: GrantEmployeeBonusFormValues = useMemo(
    () => ({
      employeeBonusTypeRef: '',
      amount: null,
      currencyRef: '',
      paymentDate: '',
      fiscalYear: new Date().getFullYear(),
      description: '',
      notes: ''
    }),
    []
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
      employeeBonusTypeRef: findId(catalogs.bonusType, defaultValues.employeeBonusTypeRef),
      currencyRef: findId(catalogs.currency, defaultValues.currencyRef)
    } as GrantEmployeeBonusFormValues
  }, [defaultValues, catalogs])

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
    paymentDate: v.paymentDate || '',
    fiscalYear: v.fiscalYear || new Date().getFullYear(),
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

  const title = useMemo(
    () =>
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.employee_tabs.flows_button.grant_employee_bonus',
        'Grant Employee Bonus'
      ),
    []
  )

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
      data-testid="flw_grantEmployeeBonus_screenContentLayout"
    >
      <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='grant-employee-bonus']]:pt-0!"
        data-testid="grant-employee-bonus-form-content"
      >
        <AppActionForm
          processType="create"
          form={form as any}
          formData={normalizedDefaults}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          cancelButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.initiate_cancel_button',
            'Cancel'
          )}
          submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
          isSubmitDisabled={!form.formState.isValid || isUnchangedNow}
          onSubmit={async (values: GrantEmployeeBonusFormValues) => {
            const payload = {
              event: 'pse_submit',
              employeeBonus: {
                employee: employeeId,
                employeeBonusTypeRef:
                  values.employeeBonusTypeRef && values.employeeBonusTypeRef !== '' ? values.employeeBonusTypeRef : '',
                amount: values.amount || 0,
                currencyRef: values.currencyRef && values.currencyRef !== '' ? values.currencyRef : '',
                paymentDate: values.paymentDate
                  ? (() => {
                      const date = new Date(values.paymentDate)
                      if (isNaN(date.getTime())) {
                        console.error('Invalid payment date:', values.paymentDate)
                        return ''
                      }
                      return formatDateToISO(date)
                    })()
                  : '',
                fiscalYear: values.fiscalYear || new Date().getFullYear(),
                status: CompensationStatus.APPROVED, // Set to APPROVED_COMPENSATION until approval process is implemented
                description: values.description || '',
                notes: values.notes || ''
              }
            }

            return payload
          }}
          data-testid="grant-employee-bonus"
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="grant-employee-bonus-groups">
            {/* Bonus Details Group */}
            <BonusDetailsGroup control={form.control} catalogs={catalogs} />
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export const GrantEmployeeBonus: React.FC<BusinessAppContextProps> = context => {
  const locale = useMemo(() => getCurrentActiveUserLocale(), [])
  return (
    <LocalizationProvider locale={locale as any}>
      <GrantEmployeeBonusProvider {...context}>
        <GrantEmployeeBonusContent {...context} />
      </GrantEmployeeBonusProvider>
    </LocalizationProvider>
  )
}

export default GrantEmployeeBonus
