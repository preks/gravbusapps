import React, { useEffect, useMemo, useRef, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  getTranslationFromI18nKeyAndLabel,
  formatDateToISO,
  getCurrentActiveUserLocale
} from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import {
  Alert,
  AlertDescription,
  FormField,
  FormItem,
  LocalizationProvider,
  useTranslation,
  FormLabel,
  FormControl,
  Combobox,
  Button
} from '@newwork/nw-design-system'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { ChangePersonalDataProvider, useChangePersonalData } from './ChangePersonalDataContext'
import { useForm } from 'react-hook-form'
import type { PersonalDataFormValues, CatalogEntry } from './types'
import NamesGroup from './components/NamesGroup'
import BirthAndGenderGroup from './components/BirthAndGenderGroup'
import NationalityLanguageStatusGroup from './components/NationalityLanguageStatusGroup'
import QualificationFields from './components/QualificationFields'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import translations from '../../apps/employee-record/_i18n'
import { useEmployeeDocumentSync } from '../document-sync/useEmployeeDocumentSync'
import { EmployeeDocumentUploadField } from '../document-sync/EmployeeDocumentUploadField'
import { EMPLOYEE_PROCESS_CONFIGS, usePendingProcessCheck } from '@/common/hooks/usePendingProcessCheck'
import { getFormContextErrorMessage } from '@/business-apps/hr/core/utils/getFormContextErrorMessage'
import { extractEmployeeId } from '@/business-apps/hr/core/utils/employeeIdUtils'

function toValidEmployeeDocumentId(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return ''
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidPattern.test(trimmed) ? trimmed : ''
}

function extractIdFromRef(ref: string): string {
  if (!ref) return ref
  const parts = ref.split(':')
  if (parts.length >= 3) return parts[parts.length - 1]
  return ref
}

function findCatalogMatchId(list: CatalogEntry[] | undefined, current: unknown): string | null {
  if (!list || current === null || current === undefined || current === '') return null
  const currentStr = String(current)
  const extractedId = extractIdFromRef(currentStr)

  const match = list.find(
    e =>
      String(e?.id) === currentStr ||
      String(e?.id) === extractedId ||
      String(e?.value) === currentStr ||
      String(e?.translations?.[0]?.value) === currentStr
  )

  if (match) return String(match.id)
  if (current) return String(current)
  return null
}

function normalizePersonalDataFormForCompare(v: PersonalDataFormValues) {
  const sortedAcademicTitles = Array.isArray(v.academicTitleRefs)
    ? [...v.academicTitleRefs].sort((a, b) => String(a).localeCompare(String(b)))
    : []

  return {
    salutationRef: v.salutationRef || null,
    title: v.title || '',
    firstName: v.firstName || '',
    lastName: v.lastName || '',
    displayName: v.displayName || '',
    preferredName: v.preferredName || '',
    birthName: v.birthName || '',
    birthDate: v.birthDate || '',
    birthPlace: v.birthPlace || '',
    genderRef: v.genderRef || null,
    nationalityRef: v.nationalityRef || null,
    languageRef: v.languageRef || null,
    maritalStatusRef: v.maritalStatusRef || null,
    severelyDisabilityDegree: v.severelyDisabilityDegree === '' ? '' : v.severelyDisabilityDegree,
    schoolQualificationRef: v.schoolQualificationRef || null,
    academicTitleRefs: sortedAcademicTitles,
    comment: v.comment || '',
    documentGroupId: v.documentGroupId || null,
    documentTypeId: v.documentTypeId || null
  }
}

function sliceDateInput(value?: string | null): string {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function computeDisplayNameForEmployee(emp: any): string {
  const hasDisplay = emp?.displayName && String(emp.displayName).trim().length > 0
  if (hasDisplay) return String(emp.displayName).trim()
  const title = (emp?.title || '').toString().trim()
  const preferred = (emp?.preferredName || '').toString().trim()
  const first = (emp?.firstName || '').toString().trim()
  const last = (emp?.lastName || '').toString().trim()
  const parts = preferred ? [title, preferred, last] : [title, first, last]
  return parts.filter(Boolean).join(' ').trim()
}

function normalizeAcademicTitleRefsFromEmployee(employee: any): string[] {
  if (Array.isArray(employee?.academicTitleRef)) {
    return employee.academicTitleRef.map(String)
  }
  if (employee?.academicTitleRef) {
    return [String(employee.academicTitleRef)]
  }
  return []
}

function buildRawPersonalDataDefaults(employee: any): PersonalDataFormValues {
  return {
    salutationRef: employee?.salutation?.id ? String(employee.salutation.id) : (employee?.salutationRef ?? null),
    title: employee?.title ?? '',
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    displayName: computeDisplayNameForEmployee(employee) ?? '',
    preferredName: employee?.preferredName ?? '',
    birthName: employee?.birthName ?? '',
    birthDate: sliceDateInput(employee?.birthDate ?? ''),
    birthPlace: employee?.birthPlace ?? '',
    genderRef: employee?.gender?.id ? String(employee.gender.id) : (employee?.genderRef ?? null),
    nationalityRef: employee?.nationality?.id ? String(employee.nationality.id) : (employee?.nationalityRef ?? null),
    languageRef: employee?.language?.id ? String(employee.language.id) : (employee?.languageRef ?? null),
    maritalStatusRef: employee?.maritalStatus?.id
      ? String(employee.maritalStatus.id)
      : (employee?.maritalStatusRef ?? null),
    severelyDisabilityDegree: employee?.severelyDisabilityDegree ?? '',
    schoolQualificationRef: employee?.schoolQualification?.id
      ? String(employee.schoolQualification.id)
      : (employee?.schoolQualificationRef ?? null),
    academicTitleRefs: normalizeAcademicTitleRefsFromEmployee(employee),
    comment: employee?.notes ?? '',
    documentGroupId: employee?.personalDocument?.documentGroup ? String(employee.personalDocument.documentGroup) : null,
    documentTypeId: employee?.personalDocument?.type ? String(employee.personalDocument.type) : null
  }
}

function buildChangePersonalDataSubmitResult(
  values: PersonalDataFormValues,
  employee: any,
  t: (key: string) => string
) {
  const uploadedEmployeeDocumentId = values.employeeDocumentId || ''
  const firstName = values.firstName || ''
  const lastName = values.lastName || ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  const payload = {
    event: 'pse_submit',
    employeeDocument: null,
    personalInformation: {
      id: employee?.id || '',
      notes: values.comment || '',
      title: values.title || '',
      personalDocument: uploadedEmployeeDocumentId || null,
      version: employee?.version ?? 0,
      academicTitleRef: values.academicTitleRefs || [],
      salutationRef: values.salutationRef || '',
      firstName: firstName,
      lastName: lastName,
      preferredName: values.preferredName || '',
      fullName: fullName,
      birthName: values.birthName || '',
      birthDate: values.birthDate ? formatDateToISO(new Date(values.birthDate)) : '',
      genderRef: values.genderRef || '',
      nationalityRef: values.nationalityRef || '',
      languageRef: values.languageRef || '',
      maritalStatusRef: values.maritalStatusRef || '',
      severelyDisabilityDegree: values.severelyDisabilityDegree !== '' ? values.severelyDisabilityDegree : '',
      schoolQualificationRef: values.schoolQualificationRef || '',
      birthPlace: values.birthPlace || '',
      userId: employee?.userId || ''
    },
    oldPersonalInformation: {
      id: employee?.id || '',
      version: employee?.version ?? 0,
      academicTitleRef: employee?.academicTitleRef || [],
      salutationRef: employee?.salutationRef || '',
      firstName: employee?.firstName || '',
      lastName: employee?.lastName || '',
      fullName: employee?.fullName || '',
      preferredName: employee?.preferredName || '',
      birthName: employee?.birthName || '',
      birthDate: employee?.birthDate ? formatDateToISO(new Date(employee.birthDate)) : '',
      genderRef: employee?.genderRef || '',
      nationalityRef: employee?.nationalityRef || '',
      languageRef: employee?.languageRef || '',
      maritalStatusRef: employee?.maritalStatusRef || '',
      birthPlace: employee?.birthPlace || '',
      severelyDisabilityDegree: employee?.severelyDisabilityDegree ?? '',
      schoolQualificationRef: employee?.schoolQualificationRef || '',
      userId: employee?.userId || '',
      notes: employee?.notes || '',
      title: employee?.title || ''
    }
  }

  return {
    ...payload,
    completeNotification: {
      type: 'success',
      message: t('notification-personal-data-updated-success')
    }
  }
}

interface ChangePersonalDataPendingViewProps {
  title: string
  employee: {
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  }
  employeePosition: { jobPosition?: { name?: string } } | undefined
  t: (key: string) => string
  state?: 'active' | 'stale'
}

function ChangePersonalDataPendingView(props: Readonly<ChangePersonalDataPendingViewProps>) {
  const { title, employee, employeePosition, t, state = 'active' } = props
  const messageKey =
    state === 'stale' ? 'change-personal-data-stale-pending-message' : 'change-personal-data-pending-message'

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]"
      data-testid="flw_changePersonalData_screenContentLayout"
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
      <div className="gba:flex gba:flex-col gba:gap-4 gba:pt-4" data-testid="change-personal-data-pending-message">
        <p className="gba:text-muted-foreground gba:text-sm">{t(messageKey)}</p>
        <div className="gba:flex gba:justify-end gba:pt-4">
          <Button
            data-testid="change-personal-data-pending-ok"
            variant="default"
            onClick={() => {
              dispatchProcessContinueEvent('pse_abort', {})
            }}
          >
            {t('change-personal-data-pending-ok')}
          </Button>
        </div>
      </div>
    </div>
  )
}

const ChangePersonalDataContent: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData, userInfo }) => {
  const { data, isLoading, error, refetch } = useChangePersonalData()
  const { t } = useTranslation(translations)
  const employeeId = useMemo(() => extractEmployeeId(additionalData, userInfo), [additionalData, userInfo])
  const contextErrorMessage = useMemo(
    () => getFormContextErrorMessage({ error, employeeId, accessToken }, t),
    [accessToken, employeeId, error, t]
  )

  if (contextErrorMessage) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]"
        data-testid="change-personal-data-context-error"
      >
        <Alert variant="destructive">
          <AlertDescription>{contextErrorMessage}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading || !data?.employee?.EmployeeByPk || !data?.catalogs?.salutation) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-[400px]"
        data-testid="change-personal-data-loading"
      >
        <div className="gba:text-center">
          <div className="gba:text-muted-foreground">Loading personal data...</div>
        </div>
      </div>
    )
  }

  return (
    <ChangePersonalDataForm
      key={data.employee.EmployeeByPk.id}
      accessToken={accessToken}
      additionalData={additionalData}
      data={data}
      onDataChanged={refetch}
    />
  )
}

interface ChangePersonalDataFormProps extends BusinessAppContextProps {
  data: any
  onDataChanged: () => Promise<void>
}

const ChangePersonalDataForm: React.FC<ChangePersonalDataFormProps> = ({
  accessToken,
  additionalData,
  data,
  onDataChanged
}) => {
  const { t } = useTranslation(translations)

  const getCatalogValue = useCallback((entry: CatalogEntry): string => {
    return entry?.translations?.[0]?.value || entry?.value || ''
  }, [])

  const employee = data?.employee?.EmployeeByPk
  const employeePosition = data?.employee?.EmployeePosition?.[0]
  const catalogSalutation: CatalogEntry[] = data?.catalogs?.salutation || []
  const catalogs = {
    gender: data?.catalogs?.gender || [],
    nationality: data?.catalogs?.nationality || [],
    language: data?.catalogs?.language || [],
    maritalStatus: data?.catalogs?.maritalStatus || [],
    schoolQualification: data?.catalogs?.schoolQualification || [],
    academicTitle: data?.catalogs?.academicTitle || [],
    documentGroup: data?.catalogs?.documentGroup || [],
    documentType: data?.catalogs?.documentType || []
  }

  const defaultValues: PersonalDataFormValues = buildRawPersonalDataDefaults(employee)

  const acceptedFileTypes = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG'
  const employeeIdForDocuments =
    additionalData?.employeeId ||
    additionalData?.psi_taskPayload?.employeeId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
    data?.employee?.EmployeeByPk?.id ||
    data?.employee?.EmployeeByPk?.employeeId
  const existingPersonalDocumentIdRaw =
    data?.employee?.EmployeeByPk?.personalDocument?.id ||
    data?.employee?.EmployeeByPk?.personalDocumentId ||
    additionalData?.personalInformation?.personalDocument ||
    additionalData?.oldPersonalInformation?.personalDocument ||
    ''
  const existingPersonalDocumentId = toValidEmployeeDocumentId(existingPersonalDocumentIdRaw)
  const documentSync = useEmployeeDocumentSync({
    accessToken,
    employeeId: employeeIdForDocuments,
    existingDocumentIds: existingPersonalDocumentId ? [existingPersonalDocumentId] : [],
    enabled: true,
    appName: 'employee-profile',
    folderPath: employeeIdForDocuments ? `/documents/${employeeIdForDocuments}` : undefined
  })

  const normalizedDefaults: PersonalDataFormValues = {
    ...defaultValues,
    salutationRef: findCatalogMatchId(catalogSalutation, defaultValues.salutationRef),
    genderRef: findCatalogMatchId(catalogs.gender, defaultValues.genderRef),
    nationalityRef: findCatalogMatchId(catalogs.nationality, defaultValues.nationalityRef),
    languageRef: findCatalogMatchId(catalogs.language, defaultValues.languageRef),
    maritalStatusRef: findCatalogMatchId(catalogs.maritalStatus, defaultValues.maritalStatusRef),
    schoolQualificationRef: findCatalogMatchId(catalogs.schoolQualification, defaultValues.schoolQualificationRef),
    documentGroupId: findCatalogMatchId(catalogs.documentGroup, defaultValues.documentGroupId),
    documentTypeId: findCatalogMatchId(catalogs.documentType, defaultValues.documentTypeId),
    academicTitleRefs: Array.isArray(defaultValues.academicTitleRefs)
      ? (defaultValues.academicTitleRefs
          .map(v => findCatalogMatchId(catalogs.academicTitle, v))
          .filter(Boolean) as string[])
      : []
  }

  const form = useForm<PersonalDataFormValues>({
    defaultValues: normalizedDefaults,
    mode: 'onChange'
  })

  const initialRef = useRef<PersonalDataFormValues>(normalizedDefaults)
  const hasUserInteractedRef = useRef(false)

  const watchedValues = form.watch()
  const selectedDocumentGroupId = form.watch('documentGroupId')
  const selectedDocumentTypeId = form.watch('documentTypeId')

  // Filter document types based on selected document group
  const filteredDocumentTypes = useMemo(
    () =>
      (catalogs.documentType || []).filter(
        (docType: CatalogEntry) => !selectedDocumentGroupId || docType.parentEntryId === selectedDocumentGroupId
      ),
    [catalogs.documentType, selectedDocumentGroupId]
  )

  useEffect(() => {
    const subscription = form.watch((_value, { name }) => {
      if (name) {
        hasUserInteractedRef.current = true
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const isUnchangedNow = useMemo(() => {
    const isDocumentChanged = documentSync.hasPendingNewUpload || documentSync.hasRemovedInitialFiles
    if (isDocumentChanged) {
      return false
    }
    if (!initialRef.current) return true
    return (
      JSON.stringify(normalizePersonalDataFormForCompare(watchedValues)) ===
      JSON.stringify(normalizePersonalDataFormForCompare(initialRef.current))
    )
  }, [watchedValues, documentSync.hasPendingNewUpload, documentSync.hasRemovedInitialFiles])

  const isDocumentInfoMissing = useMemo(() => {
    const hasFile = documentSync.hasAnyFiles
    if (!hasFile) return false
    return !selectedDocumentGroupId || !selectedDocumentTypeId
  }, [documentSync.hasAnyFiles, selectedDocumentGroupId, selectedDocumentTypeId])

  const title = useMemo(
    () =>
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.employee_tabs.flows_button.change_personal_data',
        'Change Personal Data'
      ),
    []
  )

  const isEmployeePending = useMemo(() => {
    const state = (employee?.status ?? '').toString().toUpperCase()
    return state === 'PENDING'
  }, [employee?.status])

  const pendingPersonalDataProcess = usePendingProcessCheck({
    ...EMPLOYEE_PROCESS_CONFIGS.CHANGE_PERSONAL_DATA,
    employeeId: employee?.id || '',
    accessToken: accessToken || '',
    enabled: Boolean(isEmployeePending && employee?.id && accessToken),
    displayConfig: {
      processType: t('change-personal-data-process-title'),
      statusMessage: t('change-personal-data-pending-status')
    }
  })

  if (isEmployeePending) {
    const pendingState =
      !pendingPersonalDataProcess.isLoading && !pendingPersonalDataProcess.hasPendingProcess ? 'stale' : 'active'

    return (
      <ChangePersonalDataPendingView
        title={title}
        employee={employee}
        employeePosition={employeePosition}
        t={t}
        state={pendingState}
      />
    )
  }

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]"
      data-testid="flw_changePersonalData_screenContentLayout"
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
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-personal-data']]:!pt-0"
        data-testid="change-personal-data-form-content"
      >
        <AppActionForm
          processType="update"
          form={form as any}
          formData={normalizedDefaults}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          cancelButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.initiate_cancel_button',
            'Cancel'
          )}
          submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
          isSubmitDisabled={!form.formState.isValid || isUnchangedNow || isDocumentInfoMissing}
          onSuccess={() => {
            hasUserInteractedRef.current = false
            void onDataChanged()
          }}
          processTimeoutBehavior="error"
          handlePreSubmit={async values => {
            const syncResult = await documentSync.syncDocuments({
              documentGroup: values.documentGroupId || null,
              documentType: values.documentTypeId || null,
              description: '',
              deleteFirst: true
            })

            return {
              ...values,
              employeeDocumentId: syncResult.primaryDocumentId ?? ''
            }
          }}
          onSubmit={async (values: PersonalDataFormValues) => buildChangePersonalDataSubmitResult(values, employee, t)}
          data-testid="change-personal-data"
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="change-personal-data-groups">
            <NamesGroup control={form.control} catalogs={{ salutation: catalogSalutation }} setValue={form.setValue} />

            <BirthAndGenderGroup control={form.control} catalogs={{ gender: catalogs.gender }} />

            <NationalityLanguageStatusGroup
              control={form.control}
              catalogs={{
                nationality: catalogs.nationality,
                language: catalogs.language,
                maritalStatus: catalogs.maritalStatus
              }}
            />

            <QualificationFields
              control={form.control}
              catalogs={{ schoolQualification: catalogs.schoolQualification, academicTitle: catalogs.academicTitle }}
            />

            {/* Document Upload Section */}
            <div className="gba:space-y-4 gba:pt-4 gba:border-t">
              <div className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:change_personal_data.supporting_documents',
                  'Supporting Documents'
                )}
              </div>

              <EmployeeDocumentUploadField
                name="fileUpload"
                label={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:change_personal_data.upload_document',
                  'Upload Document'
                )}
                isLoading={documentSync.shouldShowInitialDocumentLoading}
                isResolvingInitialDocuments={documentSync.isResolvingInitialDocuments}
                hasExistingDocumentHint={Boolean(existingPersonalDocumentId)}
                hasInitialDocumentCandidates={documentSync.hasInitialDocumentCandidates}
                loadingMessage={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:change_personal_data.loading_document',
                  'Loading document...'
                )}
                initialFiles={documentSync.initialUploadFiles}
                onFilesChange={documentSync.onFilesChange}
                accept={acceptedFileTypes}
                maxFiles={1}
                multiple={false}
                dataTestId="flw_changePersonalData_uploadFile"
              />

              {documentSync.hasAnyFiles && (
                <>
                  <FormField
                    control={form.control as any}
                    name="documentGroupId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:change_personal_data.document_group',
                            'Document Category'
                          )}
                          <span className="gba:text-destructive"> *</span>
                        </FormLabel>
                        <FormControl>
                          <Combobox
                            className="gba:w-full"
                            options={(catalogs.documentGroup || []).map((g: CatalogEntry) => ({
                              value: String(g.id),
                              label: getCatalogValue(g)
                            }))}
                            value={field.value || ''}
                            onValueChange={v => {
                              field.onChange(v)
                              form.setValue('documentTypeId', null as any, { shouldValidate: true } as any)
                            }}
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'lowcoder:change_personal_data.select_document_group',
                              'Select Document Category'
                            )}
                            data-testid="flw_changePersonalData_fld_documentGroup"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="documentTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:change_personal_data.document_type',
                            'Document Type'
                          )}
                          <span className="gba:text-destructive"> *</span>
                        </FormLabel>
                        <FormControl>
                          <Combobox
                            className="gba:w-full"
                            options={(filteredDocumentTypes || []).map((docType: CatalogEntry) => ({
                              value: String(docType.id),
                              label: getCatalogValue(docType)
                            }))}
                            value={field.value || ''}
                            onValueChange={v => field.onChange(v)}
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'lowcoder:change_personal_data.select_document_type',
                              'Select Document Type'
                            )}
                            data-testid="flw_changePersonalData_fld_documentType"
                            disabled={!selectedDocumentGroupId}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export const ChangePersonalData: React.FC<BusinessAppContextProps> = context => {
  const locale = useMemo(() => getCurrentActiveUserLocale(), [])
  return (
    <LocalizationProvider locale={locale as any}>
      <ChangePersonalDataProvider {...context}>
        <ChangePersonalDataContent {...context} />
      </ChangePersonalDataProvider>
    </LocalizationProvider>
  )
}

export default ChangePersonalData
