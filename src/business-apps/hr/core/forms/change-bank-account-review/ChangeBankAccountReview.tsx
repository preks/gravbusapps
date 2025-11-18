import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_NAME, GET_BANK_REVIEW_AUX } from './ChangeBankAccountReviewQueries'
import ReviewRows from '../components/ReviewRows'
import { buildBankAccountRows } from './buildRows'

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
        const oldId = String((oldAcc as any)?.employeeAddress || '').trim()
        const newId = String((newAcc as any)?.employeeAddress || '').trim()
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

  const normalizeId = (v?: any) => {
    const s = String(v || '').trim()
    return s || ''
  }
  void normalizeId // used previously; keep to avoid TS removal warnings if referenced in helpers

  const rows = buildBankAccountRows({ oldAcc, newAcc, catalogMap, addressTypeMap })

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
          <ReviewRows
            rows={rows}
            dataTestIdPrefix="change-bank-account-review-row"
            oldDataText={getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.old_data_text', 'Old Data')}
            currentDataText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:review_forms.current_data_text',
              'Current Data'
            )}
            mode="diff"
            hideNewLabels
          />
        </AppActionForm>
      </div>
    </div>
  )
}

export default ChangeBankAccountReview
