import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  getTranslationFromI18nKeyAndLabel,
  getCatalogValue,
  getCurrentActiveUserLocale,
  formatDate
} from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import ReviewRows from '../components/ReviewRows'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_NAME, GET_RELATIONSHIP_REVIEW_AUX } from './ChangeRelationshipReviewQueries'

export const ChangeRelationshipReview: React.FC<BusinessAppContextProps> = ({
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
    (additionalData as any)?.psi_taskPayload?.employeeRelationship?.employeeId || userInfo?.employeeDetails?.employeeId

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
  const newRel = payload?.employeeRelationship || {}
  const oldRel = payload?.oldEmployeeRelationship || {}

  // Combined fetch for relationship type (catalog) and documents
  useEffect(() => {
    const fetchAux = async () => {
      try {
        if (!accessToken) return
        const typeIds = Array.from(
          new Set([newRel?.typeRef, oldRel?.typeRef].filter(Boolean).map((s: any) => String(s)))
        )
        const oldDocId = String((oldRel as any)?.relationshipDocument || '').trim()
        const newDocId = String((newRel as any)?.relationshipDocument || '').trim()
        if (!typeIds.length && !oldDocId && !newDocId) return
        const result = await graphqlClient.request<any>(GET_RELATIONSHIP_REVIEW_AUX, {
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
    newRel?.typeRef,
    oldRel?.typeRef,
    oldRel?.relationshipDocument,
    newRel?.relationshipDocument
  ])

  const rows: {
    key: string
    label?: string
    oldLabel?: string
    newLabel?: string
    oldValue: string
    newValue: string
  }[] = []

  const dash = (v?: string) => (String(v || '').trim() === '' ? '' : String(v || ''))
  const refCode = (ref?: string) => (typeof ref === 'string' ? ref.split(':').pop() || '' : '')

  // Relationship Type
  {
    const oldTypeDisplay =
      getCatalogValue(catalogMap[String(oldRel.typeRef)]) || dash(oldRel.typeLabel) || refCode(oldRel.typeRef)
    const newTypeDisplay =
      getCatalogValue(catalogMap[String(newRel.typeRef)]) || dash(newRel.typeLabel) || refCode(newRel.typeRef)
    rows.push({
      key: 'typeRef',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.type', 'Relationship Type'),
      oldValue: dash(oldTypeDisplay),
      newValue: dash(newTypeDisplay)
    })
  }

  // First Name
  rows.push({
    key: 'firstName',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.first_name', 'First Name'),
    oldValue: dash(oldRel.firstName),
    newValue: dash(newRel.firstName)
  })

  // Last Name
  rows.push({
    key: 'lastName',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.last_name', 'Last Name'),
    oldValue: dash(oldRel.lastName),
    newValue: dash(newRel.lastName)
  })

  // Birth Date (display as raw ISO or preformatted if provided by payload)
  rows.push({
    key: 'birthDate',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.birth_date', 'Birth Date'),
    oldValue: formatDate(dash(oldRel.birthDate), 'date.short') || '-',
    newValue: formatDate(dash(newRel.birthDate), 'date.short') || '-'
  })

  // Phone Number
  rows.push({
    key: 'phoneNumber',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.phone_number', 'Phone Number'),
    oldValue: dash(oldRel.phoneNumber),
    newValue: dash(newRel.phoneNumber)
  })

  // Emergency Contact (boolean)
  {
    const computeBoolDisplay = (obj: any): string => {
      if (Object.prototype.hasOwnProperty.call(obj, 'emergencyContact')) {
        return String(Boolean(obj.emergencyContact))
      }
      if (Object.prototype.hasOwnProperty.call(obj, 'isEmergencyContact')) {
        return String(Boolean(obj.isEmergencyContact))
      }
      return '' // will render as '-'
    }
    rows.push({
      key: 'emergencyContact',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.emergency_contact', 'Emergency Contact'),
      oldValue: computeBoolDisplay(oldRel),
      newValue: computeBoolDisplay(newRel)
    })
  }

  // Comment / Notes if present
  const oldNotes = String(oldRel?.notes || '').trim()
  const newNotes = String(newRel?.notes || '').trim()
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

  // Attachment – show raw relationshipDocument string when present on either side
  const oldDoc = String((oldRel as any)?.relationshipDocument ?? '').trim()
  const newDoc = String((newRel as any)?.relationshipDocument ?? '').trim()
  if (oldDoc !== '' || newDoc !== '') {
    const oldDisplay =
      docNameMap[oldDoc] ||
      (oldDoc ? getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.old_attachment_text', 'Old Attachment') : '')
    const newDisplay =
      docNameMap[newDoc] ||
      (newDoc ? getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.new_attachment_text', 'New Attachment') : '')
    rows.push({
      key: 'relationshipDocument',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.attachment_text', 'Attachment'),
      oldValue: oldDisplay,
      newValue: newDisplay
    })
  }

  const titleText = getTranslationFromI18nKeyAndLabel(
    'lowcoder:review_forms.employee_relationship_change_title',
    `Employee Relationship Change for ${employeeName ? employeeName : ''}`,
    { employeeName: employeeName ? employeeName : '', interpolation: { escapeValue: false } }
  )

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[1200px]"
      data-testid="change-relationship-review-form-container"
    >
      <FormHeader title={titleText} flowIconUrl={flowIconUrl} className="gba:px-6" />

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-relationship-review']]:!pt-0 gba:[&_[data-testid='change-relationship-review-form']]:!max-w-none"
        data-testid="change-relationship-review-form-content"
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
          submitButtonTestId="change-relationship-review-confirm-button"
          cancelButtonTestId="change-relationship-review-cancel-button"
          onSubmit={async () => {
            return { acknowledge: 'acknowledged' }
          }}
          onCancel={() => {}}
          data-testid="change-relationship-review"
        >
          <ReviewRows
            rows={rows}
            dataTestIdPrefix="change-relationship-review-row"
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

export default ChangeRelationshipReview
