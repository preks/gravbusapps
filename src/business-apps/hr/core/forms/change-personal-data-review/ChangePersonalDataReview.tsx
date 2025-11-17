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
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_NAME, GET_PERSONAL_REVIEW_AUX } from './ChangePersonalDataReviewQueries'
import { CaretRightIcon } from '@phosphor-icons/react'

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

  const rows: {
    key: string
    label?: string
    oldLabel?: string
    newLabel?: string
    oldValue: string
    newValue: string
  }[] = []

  const dash = (v?: string) => (String(v || '').trim() === '' ? '' : String(v || ''))
  const formatCatalog = (ref?: string) => (ref ? getCatalogValue(catalogMap[String(ref)]) || '' : '')
  const formatTitles = (refs?: any) => {
    const list: string[] = Array.isArray(refs) ? refs.map((r: any) => String(r)) : refs ? [String(refs)] : []
    const names = list.map(id => getCatalogValue(catalogMap[id]) || '').filter(s => s && s.trim() !== '')
    return names.join(', ')
  }

  // Salutation
  rows.push({
    key: 'salutationRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.salutation',
      'Salutation'
    ),
    oldValue: formatCatalog(oldPI.salutationRef),
    newValue: formatCatalog(newPI.salutationRef)
  })

  // Title
  rows.push({
    key: 'title',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.title',
      'Title'
    ),
    oldValue: dash(oldPI.title),
    newValue: dash(newPI.title)
  })

  // First Name
  rows.push({
    key: 'firstName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.first_name',
      'First Name'
    ),
    oldValue: dash(oldPI.firstName),
    newValue: dash(newPI.firstName)
  })

  // Preferred Name
  rows.push({
    key: 'preferredName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.summary_layout.public_profile_container.display_name',
      'Preferred Name'
    ),
    oldValue: dash(oldPI.preferredName),
    newValue: dash(newPI.preferredName)
  })

  // Last Name
  rows.push({
    key: 'lastName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.last_name',
      'Last Name'
    ),
    oldValue: dash(oldPI.lastName),
    newValue: dash(newPI.lastName)
  })

  // Display Name
  rows.push({
    key: 'displayName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.preferred_name',
      'Display Name'
    ),
    oldValue: dash(oldPI.displayName),
    newValue: dash(newPI.displayName)
  })

  // Birth Name
  rows.push({
    key: 'birthName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.birth_mame',
      'Birth Name'
    ),
    oldValue: dash(oldPI.birthName),
    newValue: dash(newPI.birthName)
  })

  // Birth Date
  rows.push({
    key: 'birthDate',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.date_of_birth',
      'Date of Birth'
    ),
    oldValue: formatDate(dash(oldPI.birthDate), 'date.short') || '-',
    newValue: formatDate(dash(newPI.birthDate), 'date.short') || '-'
  })

  // Birth Place
  rows.push({
    key: 'birthPlace',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.place_of_birth',
      'Place of Birth'
    ),
    oldValue: dash(oldPI.birthPlace),
    newValue: dash(newPI.birthPlace)
  })

  // Gender
  rows.push({
    key: 'genderRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.gender',
      'Gender'
    ),
    oldValue: formatCatalog(oldPI.genderRef),
    newValue: formatCatalog(newPI.genderRef)
  })

  // Nationality
  rows.push({
    key: 'nationalityRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.nationality',
      'Nationality'
    ),
    oldValue: formatCatalog(oldPI.nationalityRef),
    newValue: formatCatalog(newPI.nationalityRef)
  })

  // Native Language
  rows.push({
    key: 'languageRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.language',
      'Native Language'
    ),
    oldValue: formatCatalog(oldPI.languageRef),
    newValue: formatCatalog(newPI.languageRef)
  })

  // Marital Status
  rows.push({
    key: 'maritalStatusRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.marital_status',
      'Marital Status'
    ),
    oldValue: formatCatalog(oldPI.maritalStatusRef),
    newValue: formatCatalog(newPI.maritalStatusRef)
  })

  // Degree of Disability
  rows.push({
    key: 'severelyDisabilityDegree',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.disability',
      'Degree of Disability'
    ),
    oldValue: dash(oldPI.severelyDisabilityDegree),
    newValue: dash(newPI.severelyDisabilityDegree)
  })

  // Highest School Qualification
  rows.push({
    key: 'schoolQualificationRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.qualification',
      'Highest School Qualification'
    ),
    oldValue: formatCatalog(oldPI.schoolQualificationRef),
    newValue: formatCatalog(newPI.schoolQualificationRef)
  })

  // Academic Titles (multi)
  {
    const oldTitles = formatTitles(oldPI.academicTitleRef)
    const newTitles = formatTitles(newPI.academicTitleRef)
    rows.push({
      key: 'academicTitleRefs',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.personal_information_container.academic_titles',
        'Academic Titles'
      ),
      oldValue: oldTitles,
      newValue: newTitles
    })
  }

  // Comment
  {
    const oldNotes = String(oldPI?.notes || '').trim()
    const newNotes = String(newPI?.notes || '').trim()
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
  }

  // Attachment (personalDocument)
  {
    const oldDoc = String((oldPI as any)?.personalDocument ?? '').trim()
    const newDoc = String((newPI as any)?.personalDocument ?? '').trim()
    if (oldDoc !== '' || newDoc !== '') {
      const oldDisplay =
        docNameMap[oldDoc] ||
        (oldDoc ? getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.old_attachment_text', 'Old Attachment') : '')
      const newDisplay =
        docNameMap[newDoc] ||
        (newDoc ? getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.new_attachment_text', 'New Attachment') : '')
      rows.push({
        key: 'personalDocument',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.details_layout.address_container.attachment',
          'Attachment'
        ),
        oldValue: oldDisplay,
        newValue: newDisplay
      })
    }
  }

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
          showCancelButton={false}
          formData={{}}
          submitEventType="pse_submit"
          submitButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:modify_expense_request.btn_items_submit',
            'Confirm'
          )}
          cancelButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.btn_cancel', 'Cancel')}
          submitButtonTestId="change-personal-data-review-confirm-button"
          cancelButtonTestId="change-personal-data-review-cancel-button"
          onSubmit={async () => {
            return { approval: 'approved' }
          }}
          onCancel={() => {}}
          data-testid="change-personal-data-review"
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

          <div className="gba:flex gba:flex-col gba:gap-4" data-testid="change-personal-data-review-rows">
            {rows.map(row => {
              const hasDiff = String((row.oldValue || '').trim()) !== String((row.newValue || '').trim())
              return (
                <div
                  key={row.key}
                  className="gba:grid gba:grid-cols-1 gba:md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gba:gap-4"
                  data-testid={`change-personal-data-review-row-${row.key}`}
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

export default ChangePersonalDataReview
