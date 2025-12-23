import React, { useEffect, useMemo, useRef, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useForm } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Textarea } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { ChangeBankAccountProvider, useChangeBankAccount } from './ChangeBankAccountContext'
import DefaultFields from './components/DefaultFields'
import UsFields from './components/UsFields'
import NonUsFields from './components/NonUsFields'
import { buildBankAccountPayload, isUnchangedExistingBankAccount } from './utils'
import { usePendingProcessCheck, EMPLOYEE_PROCESS_CONFIGS } from '@/common/hooks/usePendingProcessCheck'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { PendingSubmissionMessage } from '@/components/pending-submission-message'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'

interface BankAccountFormValues {
  countryId?: string | null
  currencyId?: string | null
  bankName?: string
  accountType?: 'CHECKINGS' | 'SAVINGS' | ''
  accountHolder?: string
  iban?: string
  swift?: string
  routingNumberTypeId?: string | null
  accountNumber?: string
  routingNumber?: string
  employeeAddressId?: string | null
  comment?: string
}

const ChangeBankAccountContent: React.FC<BusinessAppContextProps> = ({ userInfo, additionalData, accessToken }) => {
  const { data } = useChangeBankAccount()
  const { t } = useTranslation(translations)

  const employee = useMemo(() => (data?.employee as any)?.Employee?.[0], [data])
  const employeePosition = useMemo(() => (data?.employee as any)?.EmployeePosition?.[0], [data])
  const employeeId = useMemo(
    () =>
      (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.employeeId ||
      userInfo?.employeeDetails?.employeeId ||
      (data?.employee as any)?.Employee?.[0]?.id ||
      '',
    [additionalData, userInfo, data]
  )

  // Check for pending bank account change process
  const {
    hasPendingProcess,
    pendingProcessMetadata,
    isLoading: checkingPendingProcess
  } = usePendingProcessCheck({
    ...EMPLOYEE_PROCESS_CONFIGS.CHANGE_BANK_ACCOUNT,
    employeeId,
    accessToken,
    enabled: !!employeeId && !!accessToken,
    displayConfig: {
      processType: t('change-bank-account-process-title'),
      statusMessage: t('change-bank-account-pending-status')
    }
  })

  // Handler for closing pending message - dispatches pause event to cancel orphan task
  const handleClosePendingMessage = useCallback(() => {
    // Dispatch pause event to abort the task (modal doesn't unmount, so we dispatch directly)
    dispatchProcessContinueEvent('pse_pause', {})
  }, [])

  const form = useForm<BankAccountFormValues>({
    defaultValues: {
      countryId: null,
      currencyId: null,
      bankName: '',
      accountType: '' as any,
      accountHolder: '',
      iban: '',
      swift: '',
      routingNumberTypeId: null,
      accountNumber: '',
      routingNumber: '',
      employeeAddressId: null,
      comment: ''
    },
    mode: 'onChange',
    shouldUnregister: true
  })

  const title = useMemo(
    () =>
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.employee_tabs.flows_button.change_bank_account',
        'Change Bank Account'
      ),
    []
  )

  const normalizedDefaults: BankAccountFormValues = useMemo(
    () => ({
      countryId: null,
      currencyId: null,
      bankName: '',
      accountType: '' as any,
      accountHolder: '',
      iban: '',
      swift: '',
      routingNumberTypeId: null,
      accountNumber: '',
      routingNumber: '',
      employeeAddressId: null,
      comment: ''
    }),
    []
  )

  const catalogCountries = (data?.catalogs?.countries || []) as any[]
  const catalogCurrencies = (data?.catalogs?.currency || []) as any[]
  const catalogRoutingTypes = (data?.catalogs?.routingNumber || []) as any[]
  const employeeAddresses = (data?.employee?.EmployeeAddress || []) as any[]

  const selectedCountryId = form.watch('countryId')
  const isUSAndNoAddress = selectedCountryId === 'Country:v1:US' && employeeAddresses.length === 0
  const isUS = selectedCountryId === 'Country:v1:US'
  const selectedEmployeeAddressId = form.watch('employeeAddressId')
  const selectedEmployeeAddress = employeeAddresses.find((a: any) => String(a.id) === String(selectedEmployeeAddressId))

  const existingAccount = useMemo(() => {
    const list = (data?.employee?.EmployeeBankAccount || []) as any[]
    return list[0] || null
  }, [data?.employee?.EmployeeBankAccount])

  const primaryAddress = useMemo(() => {
    if (!employeeAddresses?.length) return null as any
    return employeeAddresses.find((a: any) => a?.type === 'PRIMARY') || employeeAddresses[0] || null
  }, [employeeAddresses])

  const defaultsAppliedRef = useRef(false)
  useEffect(() => {
    if (defaultsAppliedRef.current) return
    if (!catalogCountries?.length) return

    const employee = (data?.employee as any)?.Employee?.[0] || {}
    const countryIdPreset: string | null = existingAccount?.country?.id || primaryAddress?.country?.id || null
    let currencyIdPreset: string | null = existingAccount?.currency?.id || null
    if (!currencyIdPreset && countryIdPreset) {
      const country = catalogCountries.find((c: any) => String(c.id) === String(countryIdPreset))
      const obj = country?.objectValue
      try {
        const parsed = typeof obj === 'string' ? JSON.parse(obj) : obj
        const cur = parsed?.currency as string | undefined
        if (cur) currencyIdPreset = cur
      } catch {}
    }

    const presetValues = {
      countryId: countryIdPreset,
      currencyId: currencyIdPreset ?? null,
      bankName: existingAccount?.bankName || '',
      accountType: (existingAccount?.accountType || 'CHECKINGS') as any,
      accountHolder:
        existingAccount?.accountHolder || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim(),
      iban: existingAccount?.iban || '',
      swift: existingAccount?.swift || '',
      routingNumberTypeId: existingAccount?.routingNumberType || null,
      accountNumber: existingAccount?.accountNumber || '',
      routingNumber: existingAccount?.routingNumber || '',
      employeeAddressId: existingAccount?.employeeAddressId || primaryAddress?.id || null,
      comment: existingAccount?.notes || ''
    } as any

    form.reset(presetValues)
    defaultsAppliedRef.current = true
  }, [catalogCountries, existingAccount, primaryAddress, data?.employee, form])

  useEffect(() => {
    if (!selectedCountryId) return
    const dirtyCurrency = Boolean((form.formState as any)?.dirtyFields?.currencyId)
    if (dirtyCurrency) return
    const country = catalogCountries.find((c: any) => String(c.id) === String(selectedCountryId))
    const obj = country?.objectValue
    try {
      const parsed = typeof obj === 'string' ? JSON.parse(obj) : obj
      const cur = parsed?.currency as string | undefined
      if (cur) {
        form.setValue('currencyId', cur as any, { shouldDirty: false, shouldValidate: true } as any)
      }
    } catch {}
  }, [selectedCountryId, catalogCountries, form])

  const watchedValues = form.watch()
  const isUnchangedExisting = useMemo(
    () => isUnchangedExistingBankAccount(form, existingAccount),
    [existingAccount, watchedValues, form]
  )

  const hasValidationErrors = Object.keys((form.formState as any)?.errors ?? {}).length > 0
  const isSubmitDisabledFinal = useMemo(() => {
    const disabled = isUSAndNoAddress || hasValidationErrors || isUnchangedExisting
    return disabled
  }, [isUSAndNoAddress, hasValidationErrors, isUnchangedExisting])

  // Wait for data and pending check before rendering
  // Platform's spinner stays visible until we render content
  if (!data || checkingPendingProcess) {
    return null
  }

  // Show pending submission message if there's a pending process
  if (hasPendingProcess && pendingProcessMetadata) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[800px]"
        data-testid="change-bank-account-form-container"
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
        <PendingSubmissionMessage
          processType={pendingProcessMetadata.processType || 'Request'}
          processId={pendingProcessMetadata.processId}
          statusMessage={pendingProcessMetadata.statusMessage || 'Pending'}
          onClose={handleClosePendingMessage}
          data-testid="pending-bank-account-message"
        />
      </div>
    )
  }

  // Show normal form
  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[800px]"
      data-testid="change-bank-account-form-container"
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
        className="gba:flex gba:flex-col gba:[&>div[data-testid='change-bank-account']]:pt-0!"
        data-testid="change-bank-account-form-content"
      >
        <AppActionForm
          processType="update"
          form={form as any}
          formData={normalizedDefaults}
          submitEventType="pse_submit"
          submitButtonTestId="flw_changeBankAccount_submitButton"
          cancelButtonTestId="flw_changeBankAccount_cancelButton"
          isSubmitDisabled={isSubmitDisabledFinal}
          cancelEventType="pse_abort"
          submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
          cancelButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.initiate_cancel_button',
            'Cancel'
          )}
          onSubmit={async (values: BankAccountFormValues) => {
            const employeeId =
              (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.employeeId ||
              userInfo?.employeeDetails?.employeeId ||
              (data?.employee as any)?.Employee?.[0]?.id ||
              ''
            const existing = (data?.employee?.EmployeeBankAccount || [])?.[0] || null
            const payload = buildBankAccountPayload({ values, existingAccount: existing, employeeId })
            return payload as any
          }}
          data-testid="change-bank-account"
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="flw_changeBankAccount_bankName_bankAccountContainer">
            <DefaultFields
              form={form}
              catalogCountries={catalogCountries}
              catalogCurrencies={catalogCurrencies}
              isUSAndNoAddress={isUSAndNoAddress}
            />

            <div data-testid="flw_changeBankAccount_ibanSwiftLayout">
              {isUS ? (
                <UsFields
                  form={form}
                  catalogRoutingTypes={catalogRoutingTypes}
                  employeeAddresses={employeeAddresses}
                  selectedEmployeeAddress={selectedEmployeeAddress}
                />
              ) : (
                <NonUsFields form={form} />
              )}
            </div>

            <FormField
              control={form.control as any}
              name={'comment' as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="change-bank-account-comment-label">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area',
                      'Comment'
                    )}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder',
                        'Please Enter'
                      )}
                      data-testid="flw_changeBankAccount_comment"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export const ChangeBankAccount: React.FC<BusinessAppContextProps> = context => {
  return (
    <ChangeBankAccountProvider {...context}>
      <ChangeBankAccountContent {...context} />
    </ChangeBankAccountProvider>
  )
}

export default ChangeBankAccount
