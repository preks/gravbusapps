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
import {
  GET_EMPLOYEE_NAME,
  GET_CATALOG_ENTRIES_BY_IDS,
  GET_EMPLOYEE_DOCUMENT_BY_ID
} from './ChangeEmployeeAddressReviewQueries'

import { CaretRightIcon } from '@phosphor-icons/react'
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
            [String((oldAddr as any)?.employeeDocument || ''), String((newAddr as any)?.employeeDocument || '')]
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

  const countryCode = (ref?: string) => (typeof ref === 'string' ? ref.split(':').pop() || '' : '')
  const regionCode = (ref?: string) => (typeof ref === 'string' ? ref.split(':').pop() || '' : '')
  const getPostalLabel = (countryRef?: string) =>
    countryCode(countryRef) === 'US'
      ? getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.details_layout.address_container.zip_code',
          'ZIP Code'
        )
      : getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.details_layout.address_container.postal_code',
          'Postal Code'
        )

  const getRegionLabel = (countryRef?: string) => {
    const cc = countryCode(countryRef)
    if (cc === 'DE') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.region',
        'Region'
      )
    }
    if (cc === 'US') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.state',
        'State'
      )
    }
    if (cc === 'RO') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.county',
        'County'
      )
    }
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.address_container.region',
      'Region'
    )
  }

  const rows: {
    key: string
    label?: string
    oldLabel?: string
    newLabel?: string
    oldValue: string
    newValue: string
  }[] = []

  // Address lines (show only if present in either old or new)
  const lineLabelBase = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.address_container.address_line',
    'Address Line'
  )
  for (let i = 0; i < 4; i++) {
    const oldVal = String((oldAddr.addressLine || [])[i] || '').trim()
    const newVal = String((newAddr.addressLine || [])[i] || '').trim()
    if (i === 0 || oldVal !== '' || newVal !== '') {
      rows.push({
        key: `addressLine${i + 1}`,
        label: `${lineLabelBase} ${i + 1}`,
        oldValue: oldVal,
        newValue: newVal
      })
    }
  }

  // Postal code – always show, with side-specific labels (US => ZIP Code)
  rows.push({
    key: 'postalCode',
    oldLabel: getPostalLabel(oldAddr?.countryRef),
    newLabel: getPostalLabel(newAddr?.countryRef),
    oldValue: String(oldAddr.postalCode || ''),
    newValue: String(newAddr.postalCode || '')
  })

  // City – always
  rows.push({
    key: 'locality',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.city', 'City'),
    oldValue: String(oldAddr.locality || ''),
    newValue: String(newAddr.locality || '')
  })

  // Region – show if either side requires it (DE / US / RO), with side-specific labels
  const oldCC = countryCode(oldAddr?.countryRef)
  const newCC = countryCode(newAddr?.countryRef)
  const sideNeedsRegion = (cc?: string) => cc === 'DE' || cc === 'US' || cc === 'RO'
  if (sideNeedsRegion(oldCC) || sideNeedsRegion(newCC)) {
    const oldRegionDisplay = getCatalogValue(catalogMap[String(oldAddr.regionRef)]) || regionCode(oldAddr.regionRef)
    const newRegionDisplay = getCatalogValue(catalogMap[String(newAddr.regionRef)]) || regionCode(newAddr.regionRef)
    rows.push({
      key: 'regionRef',
      oldLabel: getRegionLabel(oldAddr?.countryRef),
      newLabel: getRegionLabel(newAddr?.countryRef),
      oldValue: String(oldRegionDisplay || ''),
      newValue: String(newRegionDisplay || '')
    })
  }

  // Country – always (use translated value if available)
  rows.push({
    key: 'countryRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.address_container.country',
      'Country'
    ),
    oldValue: getCatalogValue(catalogMap[String(oldAddr.countryRef)]) || countryCode(oldAddr.countryRef),
    newValue: getCatalogValue(catalogMap[String(newAddr.countryRef)]) || countryCode(newAddr.countryRef)
  })

  // PO Box – show only if present/true in either side
  const oldPo = Boolean(oldAddr.poBox || false)
  const newPo = Boolean(newAddr.poBox || false)
  if (oldPo || newPo) {
    rows.push({
      key: 'poBox',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.po_box',
        'PO Box'
      ),
      oldValue: String(oldPo),
      newValue: String(newPo)
    })
  }

  // Comment – show only if present in either side
  const oldNotes = String(oldAddr.notes || '').trim()
  const newNotes = String(newAddr.notes || '').trim()
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

  // Attachment – show raw employeeDocument string when present on either side
  const oldDoc = String((oldAddr as any)?.employeeDocument ?? '').trim()
  const newDoc = String((newAddr as any)?.employeeDocument ?? '').trim()
  if (oldDoc !== '' || newDoc !== '') {
    const oldDisplay =
      docNameMap[oldDoc] ||
      (oldDoc ? getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.old_attachment_text', 'Old Attachment') : '')
    const newDisplay =
      docNameMap[newDoc] ||
      (newDoc ? getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.new_attachment_text', 'New Attachment') : '')
    rows.push({
      key: 'employeeDocument',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.attachment',
        'Attachment'
      ),
      oldValue: oldDisplay,
      newValue: newDisplay
    })
  }
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
          <div className="gba:hidden gba:md:grid gba:md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gba:gap-4 gba:mb-4">
            <div className="gba:text-xl gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.old_data_text', 'Old Data')}{' '}
            </div>
            <div />
            <div className="gba:text-xl gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.current_data_text', 'Current Data')}
            </div>
          </div>

          <div className="gba:flex gba:flex-col gba:gap-4" data-testid="change-employee-address-review-rows">
            {(isDeleteMode ? rows.map(r => ({ ...r, newValue: '' })) : rows).map(row => {
              const hasDiff = String((row.oldValue || '').trim()) !== String((row.newValue || '').trim())
              return (
                <div
                  key={row.key}
                  className="gba:grid gba:grid-cols-1 gba:md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gba:gap-4"
                  data-testid={`change-employee-address-review-row-${row.key}`}
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
                        isDeleteMode
                          ? 'gba:bg-destructive gba:text-destructive-foreground'
                          : hasDiff
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
