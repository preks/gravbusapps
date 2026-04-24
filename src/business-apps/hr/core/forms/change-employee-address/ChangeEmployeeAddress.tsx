import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { ChangeEmployeeAddressProvider, useChangeEmployeeAddress } from './ChangeEmployeeAddressContext'
import { useForm, useFormState } from 'react-hook-form'
import { Button, FormField, Spinner, useTranslation } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import AddressCommonFields from './components/AddressCommonFields'
import AddressSelector from './components/AddressSelector'
import {
  ensureFourLines,
  buildInsertPayload,
  buildUpdatePayload,
  validateAddressForm,
  shouldDisableSubmit
} from './utils'
import { populateFormFromRecord, buildDeletePayloadFromRecord, restoreSelectionFromId } from './helpers'
import translations from '../../apps/employee-record/_i18n'
import { useEmployeeDocumentSync } from '../document-sync/useEmployeeDocumentSync'

interface AddressFormValues {
  selectedAddressId?: string | null // null means Add Address
  countryId?: string | null
  addressLines: string[] // up to 4
  postalCode?: string
  city?: string
  regionId?: string | null
  regionLabel?: string // read-only display of region label
  comment?: string
  latitude?: number | null
  longitude?: number | null
  employeeDocument?: {
    id: string
    name: string
    file: string
    mimeType: string
    employeeId: string
  } | null
}

const ChangeEmployeeAddressContent: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo, additionalData }) => {
  const { t } = useTranslation(translations)
  const [addressLineCount, setAddressLineCount] = useState<number>(1)
  const [addressLinesError, setAddressLinesError] = useState<string | null>(null)
  const { data, isLoading, refetchAddresses } = useChangeEmployeeAddress()
  const [isInitialFormHydrated, setIsInitialFormHydrated] = useState(false)

  const employee = useMemo(() => (data?.address as any)?.Employee?.[0], [data])
  const employeePosition = useMemo(() => (data?.address as any)?.EmployeePosition?.[0], [data])
  const ADD_SENTINEL = '__ADD_ADDRESS__'
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [deletePayload, setDeletePayload] = useState<any | null>(null)
  const [isSwitchingSelection, setIsSwitchingSelection] = useState(false)
  const [selectedIdBeforeDelete, setSelectedIdBeforeDelete] = useState<string | null>(null)
  const selectionVersionRef = useRef(0)

  const emptyAddressLines: string[] = useMemo(() => [''], [])

  const form = useForm<AddressFormValues>({
    defaultValues: {
      selectedAddressId: ADD_SENTINEL,
      countryId: undefined,
      addressLines: emptyAddressLines,
      postalCode: '',
      city: '',
      regionId: null,
      regionLabel: '',
      comment: '',
      latitude: null,
      longitude: null
    },
    mode: 'onChange',
    shouldUnregister: true
  })

  const { isSubmitting } = useFormState({ control: form.control })

  const title = useMemo(
    () =>
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.employee_tabs.flows_button.change_address',
        'Change Address'
      ),
    []
  )
  const loadingAddressFormText = useMemo(() => {
    const translated = t('change-address-loading-form')
    return translated === 'change-address-loading-form' ? 'Loading address form...' : translated
  }, [t])

  const normalizedDefaults: AddressFormValues = useMemo(
    () => ({
      selectedAddressId: ADD_SENTINEL,
      countryId: undefined,
      addressLines: [''],
      postalCode: '',
      city: '',
      regionId: null,
      regionLabel: '',
      comment: '',
      latitude: null,
      longitude: null
    }),
    []
  )

  useEffect(() => {
    form.reset(normalizedDefaults)
    setAddressLineCount(1)
    setAddressLinesError(null)
    setIsInitialFormHydrated(false)
  }, [normalizedDefaults])

  useEffect(() => {
    if (isLoading) {
      setIsInitialFormHydrated(false)
    }
  }, [isLoading])
  // ensure submit disabled state recomputes on any value change
  const watchedValues = form.watch()
  const addresses = data?.address?.EmployeeAddress ?? []
  const selectedAddressId = watchedValues?.selectedAddressId
  const selectedAddress =
    selectedAddressId && selectedAddressId !== ADD_SENTINEL
      ? addresses.find((address: any) => String(address.id) === String(selectedAddressId))
      : null

  // compute disabled state from watched values and current data
  const isSubmitDisabled = useMemo(() => {
    return shouldDisableSubmit(watchedValues as any, addresses, { countries: data?.catalogs?.countries }, ADD_SENTINEL)
  }, [watchedValues, data?.address?.EmployeeAddress, data?.catalogs?.countries])

  const employeeId =
    (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.employeeId ||
    userInfo?.employeeDetails?.employeeId ||
    addresses?.[0]?.employeeId ||
    ''
  const selectedAddressDocumentId = selectedAddress?.employeeDocumentId
    ? String(selectedAddress.employeeDocumentId)
    : ''
  const addressDocumentSync = useEmployeeDocumentSync({
    accessToken,
    employeeId,
    existingDocumentIds: selectedAddressDocumentId ? [selectedAddressDocumentId] : [],
    enabled: !isDeleteMode && Boolean(employeeId && selectedAddressId && selectedAddressId !== ADD_SENTINEL),
    appName: 'employee-profile',
    folderPath: employeeId ? `/documents/${employeeId}` : undefined
  })

  // Disable submit if an existing address is selected and no changes were made
  const isUnchangedExisting = useMemo(() => {
    const isDocumentChanged = addressDocumentSync.hasPendingNewUpload || addressDocumentSync.hasRemovedInitialFiles
    if (isDocumentChanged) {
      return false
    }
    const selectedId = (watchedValues as any)?.selectedAddressId
    const addingNew = !selectedId || selectedId === ADD_SENTINEL
    if (addingNew) return false
    const selected = addresses.find((a: any) => String(a.id) === String(selectedId))
    if (!selected) return false

    const normalizeForm = (v: any) => {
      const lines = ensureFourLines(v?.addressLines || [])
      return {
        countryId: v?.countryId || null,
        addressLines: lines.map(s => String(s || '')),
        postalCode: String(v?.postalCode || ''),
        city: String(v?.city || ''),
        regionId: v?.regionId || null,
        comment: String(v?.comment || '')
      }
    }

    const normalizeAddress = (a: any) => {
      const lines = ensureFourLines(a?.addressLine || [])
      return {
        countryId: a?.country?.id || null,
        addressLines: lines.map(s => String(s || '')),
        postalCode: String(a?.postalCode || ''),
        city: String(a?.locality || ''),
        regionId: a?.region?.id || null,
        comment: String(a?.comment || '')
      }
    }

    try {
      return JSON.stringify(normalizeForm(watchedValues)) === JSON.stringify(normalizeAddress(selected))
    } catch {
      return false
    }
  }, [watchedValues, addresses, addressDocumentSync.hasPendingNewUpload, addressDocumentSync.hasRemovedInitialFiles])

  // Default selection: set selected and populate fields only after catalogs are loaded
  const defaultSelectAppliedFor = useRef<string | null>(null)
  useEffect(() => {
    const addresses = (data?.address?.EmployeeAddress || []) as any[]
    const countries = (data?.catalogs?.countries || []) as any[]
    if (!countries.length) return // wait until catalogs fetched
    const currentSelected = form.getValues('selectedAddressId')
    const key =
      (addresses.length > 0 ? addresses.map((a: any) => String(a.id)).join('|') : 'EMPTY') +
      `|countries:${countries.length}`
    if (addresses.length > 0) {
      if (
        (currentSelected === undefined ||
          currentSelected === null ||
          currentSelected === '' ||
          currentSelected === ADD_SENTINEL) &&
        defaultSelectAppliedFor.current !== key
      ) {
        const first = addresses[0]
        form.setValue('selectedAddressId', String(first.id), {
          shouldDirty: false,
          shouldValidate: false,
          shouldTouch: false
        } as any)
        form.setValue('countryId', first?.country?.id || null, { shouldDirty: false, shouldValidate: true } as any)
        const normalized = Array.from({ length: 4 }, (_, i) => String((first?.addressLine || [])[i] || ''))
        form.setValue('addressLines', normalized, { shouldDirty: false } as any)
        form.setValue('postalCode', first?.postalCode || '', { shouldDirty: false } as any)
        form.setValue('city', first?.locality || '', { shouldDirty: false } as any)
        form.setValue('regionId', first?.region?.id || null, { shouldDirty: false, shouldValidate: true } as any)
        form.setValue('latitude', typeof first?.latitude === 'number' ? first.latitude : null, {
          shouldDirty: false
        } as any)
        form.setValue('longitude', typeof first?.longitude === 'number' ? first.longitude : null, {
          shouldDirty: false
        } as any)
        try {
          if ((form as any).trigger) {
            ;(form as any).trigger('countryId')
          }
        } catch {
          // Ignore trigger errors
        }
        try {
          if ((form as any).trigger) {
            ;(form as any).trigger('regionId')
          }
        } catch {
          // Ignore trigger errors
        }
        let lastNonEmpty = -1
        for (let i = 0; i < 4; i++) {
          if ((normalized[i] || '').trim() !== '') lastNonEmpty = i
        }
        setAddressLineCount(Math.max(1, lastNonEmpty + 1))
        setAddressLinesError(null)
        setIsDeleteMode(false)
        setDeletePayload(null)
        setSelectedIdBeforeDelete(null)
        defaultSelectAppliedFor.current = key
      }
      setIsInitialFormHydrated(true)
    } else {
      if (currentSelected !== ADD_SENTINEL && defaultSelectAppliedFor.current !== key) {
        form.setValue('selectedAddressId', ADD_SENTINEL, {
          shouldDirty: false,
          shouldValidate: false,
          shouldTouch: false
        } as any)
        setDeletePayload(null)
        setSelectedIdBeforeDelete(null)
        defaultSelectAppliedFor.current = key
      }
      setIsInitialFormHydrated(true)
    }
  }, [data?.address?.EmployeeAddress, data?.catalogs?.countries])

  const initialRef = useRef<AddressFormValues>(normalizedDefaults)
  useEffect(() => {
    initialRef.current = normalizedDefaults
  }, [normalizedDefaults])

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[800px]"
      data-testid="change-employee-address-form-container"
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
        className="gba:flex gba:flex-col gba:[&>div[data-testid='change-employee-address']]:pt-0!"
        data-testid="change-employee-address-form-content"
      >
        {isLoading || !isInitialFormHydrated ? (
          <div
            className="gba:flex gba:items-center gba:justify-center gba:py-20"
            data-testid="change-employee-address-initial-loading"
          >
            <Spinner size="xl" srText={loadingAddressFormText} />
          </div>
        ) : (
          <AppActionForm
            processType="update"
            form={form as any}
            formData={normalizedDefaults}
            submitEventType="pse_submit"
            customFormLayout
            validateForm={values =>
              isDeleteMode ? null : validateAddressForm(values as any, { countries: data?.catalogs?.countries })
            }
            handlePreSubmit={async values => {
              if (isDeleteMode) {
                return values
              }
              const shouldClearAddressDocument =
                addressDocumentSync.hasRemovedInitialFiles && !addressDocumentSync.hasPendingNewUpload
              const syncResult = await addressDocumentSync.syncDocuments({
                documentGroup: 'DocumentGroup:v1:PERSONAL',
                documentType: 'DocumentType:v1:17',
                deleteFirst: true
              })
              const primaryDocument = shouldClearAddressDocument ? null : syncResult.primaryDocumentRecord
              return {
                ...values,
                employeeDocument: primaryDocument
                  ? {
                      id: primaryDocument.id,
                      name: primaryDocument.name,
                      file: primaryDocument.file,
                      mimeType: primaryDocument.mimeType,
                      employeeId: primaryDocument.employeeId
                    }
                  : null
              }
            }}
            onSubmit={async (values: AddressFormValues) => {
              // ensure 4 address lines
              const lines = ensureFourLines(values.addressLines)
              const hasPrimary = addresses.some((obj: any) => obj.type === 'PRIMARY')
              const hasSecondary = addresses.some((obj: any) => obj.type === 'SECONDARY')
              void hasPrimary
              void hasSecondary
              const addingNew = !values.selectedAddressId || values.selectedAddressId === ADD_SENTINEL
              const selected = addingNew
                ? null
                : addresses.find((a: any) => String(a.id) === String(values.selectedAddressId))
              // TEMP: backend doesn't persist latitude/longitude yet. Log so we can eyeball that
              // the map is capturing coords correctly in dev. Remove once the DB columns + mutation
              // inputs land and the values flow through buildInsertPayload/buildUpdatePayload.

              console.log('[ChangeEmployeeAddress] submit coords', {
                latitude: values.latitude ?? null,
                longitude: values.longitude ?? null
              })
              if (isDeleteMode) {
                if (deletePayload) return deletePayload
                return null as any
              }

              if (addingNew) {
                const payload = buildInsertPayload({
                  employeeId,
                  employeeDocument: values.employeeDocument || null,
                  lines,
                  postalCode: values.postalCode,
                  city: values.city,
                  regionId: values.regionId,
                  countryId: values.countryId,
                  comment: values.comment,
                  latitude: values.latitude ?? null,
                  longitude: values.longitude ?? null,
                  addresses
                })
                return {
                  ...payload,
                  completeNotification: {
                    type: 'success',
                    message: t('notification-address-updated-success')
                  }
                } as any
              }
              const updatePayload = buildUpdatePayload({
                employeeId,
                employeeDocument: values.employeeDocument || null,
                lines,
                postalCode: values.postalCode,
                city: values.city,
                regionId: values.regionId,
                countryId: values.countryId,
                comment: values.comment,
                latitude: values.latitude ?? null,
                longitude: values.longitude ?? null,
                selected
              })
              return {
                ...updatePayload,
                completeNotification: {
                  type: 'success',
                  message: t('notification-address-updated-success')
                }
              } as any
            }}
            data-testid="change-employee-address"
          >
            <div className="gba:flex-1 gba:space-y-4" data-testid="flw_changeEmployeeAddressList_addressDataContainer">
              {/* Address selector (Add Address + existing addresses) */}
              {!isDeleteMode && (
                <FormField
                  control={form.control as any}
                  name={'selectedAddressId' as any}
                  render={({ field }) => {
                    const addresses = (data?.address?.EmployeeAddress || []) as any[]
                    const selectedAddr = addresses.find((a: any) => String(a.id) === String(field.value))
                    const isSecondary = selectedAddr?.type === 'SECONDARY'
                    const linkedBank = (data?.address?.EmployeeBankAccount || []).some(
                      (b: any) => String(b.employeeAddressId) === String(selectedAddr?.id)
                    )
                    void linkedBank
                    return (
                      <AddressSelector
                        value={String(field.value)}
                        onChange={id => {
                          field.onChange(id)
                          selectionVersionRef.current += 1
                          const picked =
                            id === ADD_SENTINEL ? undefined : addresses.find((a: any) => String(a.id) === id)
                          if (picked) {
                            populateFormFromRecord(form, picked, {
                              setIsSwitchingSelection,
                              setAddressLineCount,
                              setAddressLinesError,
                              setIsDeleteMode,
                              selectionVersionRef,
                              expectedSelectedId: String(picked.id)
                            })
                            setDeletePayload(null)
                          } else {
                            // Switch to Add Address without resetting entire form
                            form.setValue(
                              'selectedAddressId',
                              ADD_SENTINEL as any,
                              { shouldDirty: false, shouldValidate: false } as any
                            )
                            form.setValue('countryId', null, { shouldDirty: false, shouldValidate: false } as any)
                            form.setValue('regionId', null, { shouldDirty: false, shouldValidate: false } as any)
                            form.setValue('addressLines', [''], { shouldDirty: false } as any)
                            form.setValue('postalCode', '', { shouldDirty: false } as any)
                            form.setValue('city', '', { shouldDirty: false } as any)
                            form.setValue('latitude', null, { shouldDirty: false } as any)
                            form.setValue('longitude', null, { shouldDirty: false } as any)
                            try {
                              if ((form as any).clearErrors) {
                                ;(form as any).clearErrors(['countryId', 'regionId'])
                              }
                            } catch {
                              // Ignore clearErrors errors
                            }
                            setAddressLineCount(1)
                            setAddressLinesError(null)
                            setIsDeleteMode(false)
                            setDeletePayload(null)
                            setIsSwitchingSelection(false)
                          }
                          refetchAddresses()
                        }}
                        addresses={addresses}
                        addSentinel={ADD_SENTINEL}
                        canShowDelete={Boolean(isSecondary && field.value !== ADD_SENTINEL)}
                        onRequestDelete={() => {
                          // Build delete payload first and cache it
                          const selId = String(field.value)
                          setSelectedIdBeforeDelete(selId)
                          const selected = addresses.find((a: any) => String(a.id) === selId)
                          const employeeId =
                            (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.employeeId ||
                            selected?.employeeId ||
                            userInfo?.employeeDetails?.employeeId ||
                            data?.address?.EmployeeAddress?.[0]?.employeeId ||
                            ''
                          const payload = buildDeletePayloadFromRecord(employeeId, selected)
                          setDeletePayload(payload)
                          setIsDeleteMode(true)
                        }}
                      />
                    )
                  }}
                />
              )}
              {isDeleteMode ? (
                <div className="gba:space-y-4">
                  {(() => {
                    const selectedIdForDelete = deletePayload?.address?.id || form.getValues('selectedAddressId')
                    const isLinked = (data?.address?.EmployeeBankAccount || []).some(
                      (b: any) => String(b.employeeAddressId) === String(selectedIdForDelete)
                    )
                    const text = isLinked
                      ? getTranslationFromI18nKeyAndLabel(
                          'lowcoder:employee_profile.details_layout.address_container.linked_address_error_message',
                          'The selected address is linked to a bank account.'
                        )
                      : getTranslationFromI18nKeyAndLabel(
                          'lowcoder:employee_profile.details_layout.address_container.delete_confirmation_text',
                          'Are you sure you want to DELETE this address?'
                        )
                    return <span className="gba:block gba:py-2 gba:pb-10">{text}</span>
                  })()}
                </div>
              ) : (
                <AddressCommonFields
                  form={form}
                  catalogs={{ countries: data?.catalogs?.countries || [], regions: data?.catalogs?.regions || [] }}
                  isDeleteMode={isDeleteMode}
                  isSwitchingSelection={isSwitchingSelection}
                  addressLineCount={addressLineCount}
                  setAddressLineCount={setAddressLineCount}
                  addressLinesError={addressLinesError}
                  setAddressLinesError={setAddressLinesError}
                  getValues={form.getValues}
                  documentInitialFiles={addressDocumentSync.initialUploadFiles}
                  isLoadingDocumentInitialFiles={addressDocumentSync.shouldShowInitialDocumentLoading}
                  isResolvingInitialDocuments={addressDocumentSync.isResolvingInitialDocuments}
                  hasExistingDocumentHint={Boolean(selectedAddressDocumentId)}
                  hasInitialDocumentCandidates={addressDocumentSync.hasInitialDocumentCandidates}
                  onDocumentFilesChange={addressDocumentSync.onFilesChange}
                />
              )}

              {!isDeleteMode && null}
            </div>

            <div className="gba:grow" data-testid="change-employee-address-spacer" />

            <div
              className="gba:flex gba:justify-end gba:items-center gba:gap-2 gba:mt-auto gba:pt-4"
              data-testid="change-employee-address-actions-wrapper"
            >
              <div className="gba:flex gba:gap-2" data-testid="change-employee-address-actions-left">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => {
                    if (isDeleteMode) {
                      setIsDeleteMode(false)
                      setDeletePayload(null)
                      const addresses = (data?.address?.EmployeeAddress || []) as any[]
                      selectionVersionRef.current += 1
                      restoreSelectionFromId(form, addresses, selectedIdBeforeDelete, {
                        setIsSwitchingSelection,
                        setAddressLineCount,
                        setAddressLinesError,
                        setIsDeleteMode,
                        setSelectedAddressId: true,
                        selectionVersionRef,
                        expectedSelectedId: String(selectedIdBeforeDelete || '')
                      })
                      setSelectedIdBeforeDelete(null)
                    } else {
                      dispatchProcessContinueEvent('pse_abort', {
                        event: 'pse_abort',
                        pso_exitStrategy: 'abort',
                        pso_completeNotification: {
                          type: 'error',
                          messageKey: getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_module.toast_notification_cancel_create_absence',
                            'The action has been canceled.'
                          )
                        }
                      })
                    }
                  }}
                  data-testid={
                    isDeleteMode
                      ? 'flw_changeEmployeeAddressList_cancelFromDelete'
                      : 'flw_changeEmployeeAddressList_cancelButton'
                  }
                >
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.initiate_cancel_button',
                    'Cancel'
                  )}
                </Button>
              </div>
              <div className="gba:flex gba:gap-2" data-testid="change-employee-address-actions-right">
                {isDeleteMode ? (
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={
                      isSubmitting ||
                      Boolean(
                        (data?.address?.EmployeeBankAccount || []).some(
                          (b: any) =>
                            String(b.employeeAddressId) ===
                            String(deletePayload?.address?.id || form.getValues('selectedAddressId'))
                        )
                      )
                    }
                    data-testid="flw_changeEmployeeAddressList_deleteButton"
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_calculation_rule.expense_table.delete',
                      'Delete'
                    )}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="default"
                    disabled={isSubmitDisabled || isUnchangedExisting || isSubmitting}
                    data-testid="flw_changeEmployeeAddressList_submitButton"
                  >
                    {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
                  </Button>
                )}
              </div>
            </div>
          </AppActionForm>
        )}
      </div>
    </div>
  )
}

export const ChangeEmployeeAddress: React.FC<BusinessAppContextProps> = context => {
  return (
    <ChangeEmployeeAddressProvider {...context}>
      <ChangeEmployeeAddressContent {...context} />
    </ChangeEmployeeAddressProvider>
  )
}

export default ChangeEmployeeAddress
