import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_NAME, GET_PERSONAL_REVIEW_AUX } from './ChangePersonalDataReviewQueries'
import ReviewRows from '../components/ReviewRows'
import { buildPersonalDataRows } from './buildRows'

export const ChangePersonalDataReview: React.FC<BusinessAppContextProps> = ({
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
  const [catalogMap, setCatalogMap] = useState<Record<string, any>>({})
  const [docNameMap, setDocNameMap] = useState<Record<string, string>>({})

  const employeeIdFromPayload: string | undefined =
    (additionalData as any)?.psi_taskPayload?.personalInformation?.id || userInfo?.employeeDetails?.employeeId

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
  const newPI = payload?.personalInformation || {}
  const oldPI = payload?.oldPersonalInformation || {}

  // Combined fetch for required catalog entries and documents
  useEffect(() => {
    const fetchAux = async () => {
      try {
        if (!accessToken) return
        const collectIds = (...vals: Array<string | string[] | null | undefined>) => {
          const out: string[] = []
          for (const v of vals) {
            if (Array.isArray(v)) {
              for (const x of v) if (x) out.push(String(x))
            } else if (v) {
              out.push(String(v))
            }
          }
          return out
        }
        const typeIds = Array.from(
          new Set(
            collectIds(
              newPI?.salutationRef,
              oldPI?.salutationRef,
              newPI?.genderRef,
              oldPI?.genderRef,
              newPI?.nationalityRef,
              oldPI?.nationalityRef,
              newPI?.languageRef,
              oldPI?.languageRef,
              newPI?.maritalStatusRef,
              oldPI?.maritalStatusRef,
              newPI?.schoolQualificationRef,
              oldPI?.schoolQualificationRef,
              Array.isArray(newPI?.academicTitleRef)
                ? newPI?.academicTitleRef
                : newPI?.academicTitleRef
                  ? [newPI?.academicTitleRef]
                  : [],
              Array.isArray(oldPI?.academicTitleRef)
                ? oldPI?.academicTitleRef
                : oldPI?.academicTitleRef
                  ? [oldPI?.academicTitleRef]
                  : []
            ).map(String)
          )
        )
        const oldDocId = String((oldPI as any)?.personalDocument || '').trim()
        const newDocId = String((newPI as any)?.personalDocument || '').trim()
        if (!typeIds.length && !oldDocId && !newDocId) return
        const result = await graphqlClient.request<any>(GET_PERSONAL_REVIEW_AUX, {
          ids: typeIds,
          activeUserLocale: getCurrentActiveUserLocale(),
          oldDocId: oldDocId || null,
          newDocId: newDocId || null
        })
        const cmap: Record<string, any> = {}
        for (const e of result?.entries || []) {
          cmap[String(e.id)] = e
        }
        setCatalogMap(cmap)
        const dmap: Record<string, string> = {}
        const docOldEntry = Array.isArray(result?.docOld) ? result.docOld[0] : result?.docOld
        const docNewEntry = Array.isArray(result?.docNew) ? result.docNew[0] : result?.docNew
        if (docOldEntry?.id) dmap[docOldEntry.id] = docOldEntry.name || ''
        if (docNewEntry?.id) dmap[docNewEntry.id] = docNewEntry.name || ''
        if (Object.keys(dmap).length) setDocNameMap(prev => ({ ...prev, ...dmap }))
      } catch {
        // ignore
      }
    }
    fetchAux()
  }, [
    accessToken,
    graphqlClient,
    newPI?.salutationRef,
    oldPI?.salutationRef,
    newPI?.genderRef,
    oldPI?.genderRef,
    newPI?.nationalityRef,
    oldPI?.nationalityRef,
    newPI?.languageRef,
    oldPI?.languageRef,
    newPI?.maritalStatusRef,
    oldPI?.maritalStatusRef,
    newPI?.schoolQualificationRef,
    oldPI?.schoolQualificationRef,
    newPI?.academicTitleRef,
    oldPI?.academicTitleRef,
    oldPI?.personalDocument,
    newPI?.personalDocument
  ])

  const rows = buildPersonalDataRows({ oldPI, newPI, catalogMap, docNameMap })

  const titleText = getTranslationFromI18nKeyAndLabel(
    'lowcoder:review_forms.employee_personal_data_change_title',
    `Employee Personal Data Change for ${employeeName ? employeeName : ''}`,
    { employeeName: employeeName ? employeeName : '', interpolation: { escapeValue: false } }
  )

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[1200px]"
      data-testid="change-personal-data-review-form-container"
    >
      <FormHeader title={titleText} flowIconUrl={flowIconUrl} className="gba:px-6" />

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-personal-data-review']]:!pt-0 gba:[&_[data-testid='change-personal-data-review-form']]:!max-w-none"
        data-testid="change-personal-data-review-form-content"
      >
        <AppActionForm
          processType="update"
          form={form as any}
          formData={{}}
          submitEventType="pse_submit"
          submitButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_request.approve_button',
            'Approve'
          )}
          cancelButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_request.reject_button',
            'Reject'
          )}
          submitButtonTestId="change-personal-data-review-confirm-button"
          cancelButtonTestId="change-personal-data-review-cancel-button"
          onSubmit={async () => {
            return { approval: 'approved' }
          }}
          onCancel={() => {}}
          data-testid="change-personal-data-review"
        >
          <ReviewRows
            rows={rows}
            dataTestIdPrefix="change-personal-data-review-row"
            oldDataText={getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.old_data_text', 'Old Data')}
            currentDataText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:review_forms.current_data_text',
              'Current Data'
            )}
            mode="diff"
          />
        </AppActionForm>
      </div>
    </div>
  )
}

export default ChangePersonalDataReview
