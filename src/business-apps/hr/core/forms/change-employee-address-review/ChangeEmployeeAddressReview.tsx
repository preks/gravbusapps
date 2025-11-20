import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEE_NAME,
  GET_CATALOG_ENTRIES_BY_IDS,
  GET_EMPLOYEE_DOCUMENT_BY_ID
} from './ChangeEmployeeAddressReviewQueries'

import ReviewRows from '../components/ReviewRows'
import { buildAddressReviewRows } from './buildRows'
import { Alert } from '@newwork/nw-design-system'

export const ChangeEmployeeAddressReview: React.FC<BusinessAppContextProps> = ({
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
    (additionalData as any)?.psi_taskPayload?.address?.employeeId || userInfo?.employeeDetails?.employeeId

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
  const newAddr = payload?.address || {}
  const oldAddr = payload?.oldAddressData || {}
  const isDeleteMode = String(payload?.changeMode || '').toUpperCase() === 'DELETE'

  const [catalogMap, setCatalogMap] = useState<Record<string, any>>({})
  const [docNameMap, setDocNameMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        if (!accessToken) return
        const ids = Array.from(
          new Set(
            [newAddr?.countryRef, oldAddr?.countryRef, newAddr?.regionRef, oldAddr?.regionRef]
              .filter(Boolean)
              .map(String)
          )
        )
        if (!ids.length) return
        const result = await graphqlClient.request<{ entries: any[] }>(GET_CATALOG_ENTRIES_BY_IDS, {
          ids,
          activeUserLocale: getCurrentActiveUserLocale()
        })
        const map: Record<string, any> = {}
        for (const e of result?.entries || []) {
          map[String(e.id)] = e
        }
        setCatalogMap(map)
      } catch {
        // ignore failures – we will fall back to codes
      }
    }
    fetchCatalogs()
  }, [accessToken, graphqlClient, newAddr?.countryRef, oldAddr?.countryRef, newAddr?.regionRef, oldAddr?.regionRef])

  // Fetch employee document names if IDs provided
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        if (!accessToken) return
        const ids = Array.from(
          new Set(
            [String((oldAddr as any)?.employeeDocument ?? ''), String((newAddr as any)?.employeeDocument ?? '')]
              .map(s => s?.trim())
              .filter(Boolean)
          )
        )
        if (!ids.length) return
        const results = await Promise.all(
          ids.map(id =>
            graphqlClient
              .request<{ doc: { id: string; name?: string | null } | null }>(GET_EMPLOYEE_DOCUMENT_BY_ID, { id })
              .then(res => ({ id, name: res?.doc?.name || '' }))
              .catch(() => ({ id, name: '' }))
          )
        )
        const map: Record<string, string> = {}
        for (const r of results) {
          map[r.id] = r.name
        }
        setDocNameMap(prev => ({ ...prev, ...map }))
      } catch {
        // ignore
      }
    }
    fetchDocs()
  }, [accessToken, graphqlClient, oldAddr?.employeeDocument, newAddr?.employeeDocument])

  const rows = buildAddressReviewRows({ oldAddr, newAddr, catalogMap, docNameMap })
  const titleText = getTranslationFromI18nKeyAndLabel(
    'lowcoder:review_forms.employee_address_change_title',
    `Employee Address Change for ${employeeName ? employeeName : ''}`,
    { employeeName: employeeName ? employeeName : '', interpolation: { escapeValue: false } }
  )

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[1200px]"
      data-testid="change-employee-address-review-form-container"
    >
      <FormHeader title={titleText} flowIconUrl={flowIconUrl} className="gba:px-6" />

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-employee-address-review']]:!pt-0 gba:[&_[data-testid='change-employee-address-review-form']]:!max-w-none"
        data-testid="change-employee-address-review-form-content"
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
          submitButtonTestId="change-employee-address-review-confirm-button"
          cancelButtonTestId="change-employee-address-review-cancel-button"
          onSubmit={async () => {
            return { acknowledge: 'acknowledged' }
          }}
          onCancel={() => {
            console.log('Cancel clicked')
          }}
          data-testid="change-employee-address-review"
        >
          <ReviewRows
            rows={isDeleteMode ? rows.map(r => ({ ...r, newValue: '' })) : rows}
            dataTestIdPrefix="change-employee-address-review-row"
            oldDataText={getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.old_data_text', 'Old Data')}
            currentDataText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:review_forms.current_data_text',
              'Current Data'
            )}
            mode={isDeleteMode ? 'delete' : 'diff'}
          />
          {isDeleteMode ? (
            <Alert
              variant="destructive"
              className="gba:mt-2 gba:w-full gba:whitespace-nowrap gba:border-destructive gba:text-destructive gba:border gba:border-error-ring gba:rounded-md"
              data-testid="change-employee-address-review-delete-alert"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:review_forms.delete_address_text',
                'The selected address was deleted by the employee.'
              )}
            </Alert>
          ) : null}
        </AppActionForm>
      </div>
    </div>
  )
}

export default ChangeEmployeeAddressReview
