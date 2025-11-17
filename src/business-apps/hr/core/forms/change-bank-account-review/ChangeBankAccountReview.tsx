import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale,
  getCatalogValue
} from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_NAME, GET_BANK_REVIEW_AUX } from './ChangeBankAccountReviewQueries'
import { CaretRightIcon } from '@phosphor-icons/react'

export const ChangeBankAccountReview: React.FC<BusinessAppContextProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  const form = useForm({
    defaultValues: {},
    mode: 'onChange'
  })

  const graphqlClient = useGraphQLClient(accessToken as any)
  const [employeeName, setEmployeeName] = useState<string>('')

  const employeeIdFromPayload: string | undefined =
    (additionalData as any)?.psi_taskPayload?.bankAccount?.employeeId || userInfo?.employeeDetails?.employeeId

  useEffect(() => {
    const fetchName = async () => {
      try {
        if (!accessToken || !employeeIdFromPayload) return
        const result = await graphqlClient.request<{ employee: { firstName: string; lastName: string } }>(
          GET_EMPLOYEE_NAME,
          { employeeId: employeeIdFromPayload }
        )
        const emp = result?.employee
        if (emp) {
          setEmployeeName(`${emp.firstName || ''} ${emp.lastName || ''}`.trim())
        }
      } catch {
        // ignore
      }
    }
    fetchName()
  }, [accessToken, employeeIdFromPayload, graphqlClient])

  const payload = (additionalData as any)?.psi_taskPayload || {}
  const newAcc = payload?.bankAccount || {}
  const oldAcc = payload?.oldBankAccount || {}
  console.log('additionalData', additionalData)
  console.log('oldAcc', oldAcc)
  console.log('newAcc', newAcc)

  const [catalogMap, setCatalogMap] = useState<Record<string, any>>({})
  const [addressTypeMap, setAddressTypeMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchAux = async () => {
      try {
        if (!accessToken) return
        const ids = Array.from(
          new Set(
            [
              newAcc?.countryRef,
              oldAcc?.countryRef,
              newAcc?.currencyRef,
              oldAcc?.currencyRef,
              newAcc?.routingNumberType,
              oldAcc?.routingNumberType
            ]
              .filter(Boolean)
              .map(String)
          )
        )
        const oldId = normalizeId((oldAcc as any)?.employeeAddress)
        const newId = normalizeId((newAcc as any)?.employeeAddress)
        if (!ids.length && !oldId && !newId) return
        const result = await graphqlClient.request<any>(GET_BANK_REVIEW_AUX, {
          ids,
          activeUserLocale: getCurrentActiveUserLocale(),
          oldAddressId: oldId || null,
          newAddressId: newId || null
        })
        const catalog: Record<string, any> = {}
        for (const e of result?.entries || []) {
          catalog[String(e.id)] = e
        }
        setCatalogMap(catalog)
        const addressTypes: Record<string, string> = {}
        const oldEntry = Array.isArray(result?.oldAddress) ? result.oldAddress[0] : result?.oldAddress
        const newEntry = Array.isArray(result?.newAddress) ? result.newAddress[0] : result?.newAddress
        if (oldEntry?.id) addressTypes[oldEntry.id] = String(oldEntry.type || '')
        if (newEntry?.id) addressTypes[newEntry.id] = String(newEntry.type || '')
        if (Object.keys(addressTypes).length) {
          setAddressTypeMap(prev => ({ ...prev, ...addressTypes }))
        }
      } catch {
        // ignore – fallbacks will show
      }
    }
    fetchAux()
  }, [
    accessToken,
    graphqlClient,
    newAcc?.countryRef,
    oldAcc?.countryRef,
    newAcc?.currencyRef,
    oldAcc?.currencyRef,
    newAcc?.routingNumberType,
    oldAcc?.routingNumberType,
    (oldAcc as any)?.employeeAddress,
    (newAcc as any)?.employeeAddress
  ])

  const countryCode = (ref?: string) => (typeof ref === 'string' ? ref.split(':').pop() || '' : '')
  const normalizeId = (v?: any) => {
    const s = String(v || '').trim()
    return s || ''
  }

  // Combined above

  const formatAddressType = (t?: string) => {
    const up = String(t || '').toUpperCase()
    if (up === 'PRIMARY') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.type_primary',
        'Primary'
      )
    }
    if (up === 'SECONDARY') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.type_secondary',
        'Secondary'
      )
    }
    return ''
  }

  const rows: {
    key: string
    label?: string
    oldLabel?: string
    newLabel?: string
    oldValue: string
    newValue: string
  }[] = []

  // Country
  rows.push({
    key: 'countryRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.bank_account_form.country_select_label',
      'Country'
    ),
    oldValue: getCatalogValue(catalogMap[String(oldAcc.countryRef)]) || countryCode(oldAcc.countryRef),
    newValue: getCatalogValue(catalogMap[String(newAcc.countryRef)]) || countryCode(newAcc.countryRef)
  })

  // Currency
  rows.push({
    key: 'currencyRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.bank_account_form.currency_select_label',
      'Currency'
    ),
    oldValue:
      (catalogMap[String(oldAcc.currencyRef)]?.code as string) ||
      getCatalogValue(catalogMap[String(oldAcc.currencyRef)]) ||
      '',
    newValue:
      (catalogMap[String(newAcc.currencyRef)]?.code as string) ||
      getCatalogValue(catalogMap[String(newAcc.currencyRef)]) ||
      ''
  })

  // Bank Name
  rows.push({
    key: 'bankName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.bank_account_form.bank_name_select_label',
      'Bank Name'
    ),
    oldValue: String(oldAcc.bankName || ''),
    newValue: String(newAcc.bankName || '')
  })

  // Account Type (translate CHECKINGS/SAVINGS)
  const typeToLabel = (v?: string) =>
    v === 'CHECKINGS'
      ? getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_checkings_value',
          'Checkings'
        )
      : v === 'SAVINGS'
        ? getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_savings_value',
            'Savings'
          )
        : String(v || '')
  rows.push({
    key: 'accountType',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_label',
      'Account Type'
    ),
    oldValue: typeToLabel(String(oldAcc.accountType || '')),
    newValue: typeToLabel(String(newAcc.accountType || ''))
  })

  // Account Holder
  rows.push({
    key: 'accountHolder',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.bank_account_form.account_holder_select_label',
      'Account Holder'
    ),
    oldValue: String(oldAcc.accountHolder || ''),
    newValue: String(newAcc.accountHolder || '')
  })

  // US vs Non-US fields
  const oldCC = countryCode(oldAcc?.countryRef)
  const newCC = countryCode(newAcc?.countryRef)
  const isUS = (cc?: string) => cc === 'US'

  // US‑only fields: routing type, account number, routing number, address
  if (isUS(oldCC) || isUS(newCC)) {
    rows.push({
      key: 'routingNumberType',
      oldLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_type_select_label',
        'Routing Number Type'
      ),
      newLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_type_select_label',
        'Routing Number Type'
      ),
      oldValue: getCatalogValue(catalogMap[String(oldAcc.routingNumberType)]) || '',
      newValue: getCatalogValue(catalogMap[String(newAcc.routingNumberType)]) || ''
    })

    rows.push({
      key: 'accountNumber',
      oldLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.account_number_select_label',
        'Account Number'
      ),
      newLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.account_number_select_label',
        'Account Number'
      ),
      oldValue: String(oldAcc.accountNumber || ''),
      newValue: String(newAcc.accountNumber || '')
    })

    rows.push({
      key: 'routingNumber',
      oldLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_select_label',
        'Routing Number'
      ),
      newLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_select_label',
        'Routing Number'
      ),
      oldValue: String(oldAcc.routingNumber || ''),
      newValue: String(newAcc.routingNumber || '')
    })

    rows.push({
      key: 'employeeAddress',
      oldLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.address_select_label',
        'Address'
      ),
      newLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.address_select_label',
        'Address'
      ),
      oldValue: formatAddressType(addressTypeMap[normalizeId((oldAcc as any)?.employeeAddress)]) || '', // will render '-' if empty
      newValue: formatAddressType(addressTypeMap[normalizeId((newAcc as any)?.employeeAddress)]) || ''
    })
  }

  // Non‑US fields: IBAN, Swift
  if (!isUS(oldCC) || !isUS(newCC)) {
    rows.push({
      key: 'iban',
      oldLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.iban_select_label',
        'IBAN'
      ),
      newLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.iban_select_label',
        'IBAN'
      ),
      oldValue: String(oldAcc.iban || ''),
      newValue: String(newAcc.iban || '')
    })

    rows.push({
      key: 'swift',
      oldLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.swift_select_label',
        'Swift'
      ),
      newLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.swift_select_label',
        'Swift'
      ),
      oldValue: String(oldAcc.swift || ''),
      newValue: String(newAcc.swift || '')
    })
  }

  // Comment – show only if present in either side
  const oldNotes = String(oldAcc.notes || '').trim()
  const newNotes = String(newAcc.notes || '').trim()
  if (oldNotes !== '' || newNotes !== '') {
    rows.push({
      key: 'notes',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area',
        'Comment'
      ),
      oldValue: oldNotes,
      newValue: newNotes
    })
  }

  const titleText = getTranslationFromI18nKeyAndLabel(
    'lowcoder:review_forms.employee_bank_account_change_title',
    `Employee Bank Account Change for ${employeeName ? employeeName : ''}`,
    { employeeName: employeeName ? employeeName : '', interpolation: { escapeValue: false } }
  )

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[1200px]"
      data-testid="change-bank-account-review-form-container"
    >
      <FormHeader title={titleText} flowIconUrl={flowIconUrl} className="gba:px-6" />

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-bank-account-review']]:!pt-0 gba:[&_[data-testid='change-bank-account-review-form']]:!max-w-none"
        data-testid="change-bank-account-review-form-content"
      >
        <AppActionForm
          processType="update"
          form={form as any}
          showCancelButton={false}
          formData={{}}
          submitEventType="pse_submit"
          submitButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:review_forms.acknowledge_button',
            'Acknowledge'
          )}
          cancelButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.btn_cancel', 'Cancel')}
          submitButtonTestId="change-bank-account-review-confirm-button"
          cancelButtonTestId="change-bank-account-review-cancel-button"
          onSubmit={async () => {
            return { acknowledge: 'acknowledged' }
          }}
          onCancel={() => {}}
          data-testid="change-bank-account-review"
        >
          <div className="gba:hidden gba:md:grid gba:md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gba:gap-4 gba:mb-4">
            <div className="gba:text-xl gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.old_data_text', 'Old Data')}{' '}
            </div>
            <div />
            <div className="gba:text-xl gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.current_data_text', 'Current Data')}
            </div>
          </div>

          <div className="gba:flex gba:flex-col gba:gap-4" data-testid="change-bank-account-review-rows">
            {rows.map(row => {
              const hasDiff = String((row.oldValue || '').trim()) !== String((row.newValue || '').trim())
              return (
                <div
                  key={row.key}
                  className="gba:grid gba:grid-cols-1 gba:md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gba:gap-4"
                  data-testid={`change-bank-account-review-row-${row.key}`}
                >
                  <div className="gba:grid gba:grid-rows-[auto_1fr] gba:gap-1 gba:self-stretch gba:min-w-0">
                    <div className="gba:text-sm">{row.oldLabel ?? row.label ?? ''}</div>
                    <div className="gba:h-full gba:min-h-12 gba:py-2 gba:bg-muted gba:text-muted-foreground gba:rounded-md gba:px-3 gba:flex gba:items-center gba:min-w-0 gba:w-full gba:whitespace-normal gba:break-all">
                      {(row.oldValue || '').trim() !== '' ? row.oldValue : '-'}
                    </div>
                  </div>
                  <div
                    className="gba:hidden gba:md:flex gba:items-center gba:justify-center gba:mt-6"
                    aria-hidden="true"
                  >
                    <CaretRightIcon size={20} weight="bold" className="gba:text-muted-foreground" />
                  </div>
                  <div className="gba:grid gba:grid-rows-[auto_1fr] gba:gap-1 gba:self-stretch gba:min-w-0">
                    <div className={`gba:text-sm ${row.newLabel ? '' : 'gba:md:opacity-0'}`}>{row.newLabel || '.'}</div>
                    <div
                      className={`gba:h-full gba:min-h-12 gba:py-2 gba:rounded-md gba:px-3 gba:flex gba:items-center gba:min-w-0 gba:w-full gba:whitespace-normal gba:break-all ${
                        hasDiff
                          ? 'gba:bg-success-secondary gba:text-success-secondary-foreground'
                          : 'gba:bg-muted gba:text-muted-foreground'
                      }`}
                    >
                      {(row.newValue || '').trim() !== '' ? row.newValue : '-'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export default ChangeBankAccountReview
