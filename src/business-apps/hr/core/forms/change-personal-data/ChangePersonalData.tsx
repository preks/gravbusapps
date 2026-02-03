import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  getTranslationFromI18nKeyAndLabel,
  formatDateToISO,
  getCurrentActiveUserLocale
} from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import {
  FileUpload,
  FormField,
  FormItem,
  LocalizationProvider,
  useTranslation,
  FormLabel,
  FormControl,
  Combobox
} from '@newwork/nw-design-system'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { ChangePersonalDataProvider, useChangePersonalData } from './ChangePersonalDataContext'
import { useForm } from 'react-hook-form'
import type { PersonalDataFormValues, CatalogEntry } from './types'
import NamesGroup from './components/NamesGroup'
import BirthAndGenderGroup from './components/BirthAndGenderGroup'
import NationalityLanguageStatusGroup from './components/NationalityLanguageStatusGroup'
import QualificationFields from './components/QualificationFields'
import { useFileClient } from '@/common/network/files/useFileClient'
import { env } from '@/common/env/EnvUtils'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import translations from '../../apps/employee-record/_i18n'

const ChangePersonalDataContent: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData }) => {
  const { data, isLoading } = useChangePersonalData()

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
    />
  )
}

interface ChangePersonalDataFormProps extends BusinessAppContextProps {
  data: any
}

const ChangePersonalDataForm: React.FC<ChangePersonalDataFormProps> = ({ accessToken, additionalData, data }) => {
  const [fileList, setFileList] = useState<any[]>([])
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

  const normalizeDate = (value?: string | null): string => {
    if (!value) return ''
    return String(value).slice(0, 10)
  }

  const computeDisplayName = (emp: any): string => {
    const hasDisplay = emp?.displayName && String(emp.displayName).trim().length > 0
    if (hasDisplay) return String(emp.displayName).trim()
    const title = (emp?.title || '').toString().trim()
    const preferred = (emp?.preferredName || '').toString().trim()
    const first = (emp?.firstName || '').toString().trim()
    const last = (emp?.lastName || '').toString().trim()
    const parts = preferred ? [title, preferred, last] : [title, first, last]
    return parts.filter(Boolean).join(' ').trim()
  }

  const defaultValues: PersonalDataFormValues = {
    salutationRef: employee?.salutation?.id ? String(employee.salutation.id) : (employee?.salutationRef ?? null),
    title: employee?.title ?? '',
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    displayName: computeDisplayName(employee) ?? '',
    preferredName: employee?.preferredName ?? '',
    birthName: employee?.birthName ?? '',
    birthDate: normalizeDate(employee?.birthDate ?? ''),
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
    academicTitleRefs: Array.isArray(employee?.academicTitleRef)
      ? employee.academicTitleRef.map(String)
      : employee?.academicTitleRef
        ? [String(employee.academicTitleRef)]
        : [],
    comment: employee?.notes ?? '',
    documentGroupId: null,
    documentTypeId: null
  }

  const fileClient = useFileClient({ accessToken } as any)

  const acceptedFileTypes = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG'

  const handleDesignSystemFilesChange = useCallback((files: Array<{ file: File | { name: string }; id: string }>) => {
    const mapped = files
      .filter(f => f.file instanceof File)
      .map(f => ({
        uid: f.id,
        name: (f.file as File).name,
        status: 'done',
        originFileObj: f.file as File
      }))
    setTimeout(() => setFileList(mapped), 0)
  }, [])

  const extractIdFromRef = (ref: string): string => {
    if (!ref) return ref
    const parts = ref.split(':')
    if (parts.length >= 3) return parts[parts.length - 1]
    return ref
  }

  const findId = (list: CatalogEntry[] | undefined, current: any) => {
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

  const normalizedDefaults: PersonalDataFormValues = {
    ...defaultValues,
    salutationRef: findId(catalogSalutation, defaultValues.salutationRef),
    genderRef: findId(catalogs.gender, defaultValues.genderRef),
    nationalityRef: findId(catalogs.nationality, defaultValues.nationalityRef),
    languageRef: findId(catalogs.language, defaultValues.languageRef),
    maritalStatusRef: findId(catalogs.maritalStatus, defaultValues.maritalStatusRef),
    schoolQualificationRef: findId(catalogs.schoolQualification, defaultValues.schoolQualificationRef),
    academicTitleRefs: Array.isArray(defaultValues.academicTitleRefs)
      ? (defaultValues.academicTitleRefs.map(v => findId(catalogs.academicTitle, v)).filter(Boolean) as string[])
      : []
  }

  const form = useForm<PersonalDataFormValues>({
    defaultValues: normalizedDefaults,
    mode: 'onChange'
  })

  const initialRef = useRef<PersonalDataFormValues>(normalizedDefaults)
  const hasUserInteractedRef = useRef(false)

  const normalizeForCompare = (v: PersonalDataFormValues) => {
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

  const watchedValues = form.watch()
  const selectedDocumentGroupId = form.watch('documentGroupId')

  // Filter document types based on selected document group
  const filteredDocumentTypes = useMemo(
    () =>
      (catalogs.documentType || []).filter(
        t => !selectedDocumentGroupId || t.parentEntryId === selectedDocumentGroupId
      ),
    [catalogs.documentType, selectedDocumentGroupId]
  )

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name) {
        hasUserInteractedRef.current = true
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const isUnchangedNow = useMemo(() => {
    if (!initialRef.current) return true
    return (
      JSON.stringify(normalizeForCompare(watchedValues as any)) ===
      JSON.stringify(normalizeForCompare(initialRef.current))
    )
  }, [watchedValues])

  const isDocumentInfoMissing = useMemo(() => {
    const hasFile = fileList && fileList.length > 0
    if (!hasFile) return false
    const values = form.getValues()
    return !values.documentGroupId || !values.documentTypeId
  }, [fileList, form])

  const title = useMemo(
    () =>
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.employee_tabs.flows_button.change_personal_data',
        'Change Personal Data'
      ),
    []
  )

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
          }}
          handlePreSubmit={async values => {
            let uploadedEmployeeDocumentId: string | undefined
            try {
              if (fileList && fileList.length > 0 && fileList[0]?.originFileObj) {
                const file: File = fileList[0].originFileObj as File
                const employeeId =
                  additionalData?.employeeId ||
                  additionalData?.psi_taskPayload?.employeeId ||
                  additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
                  data?.employee?.EmployeeByPk?.id ||
                  data?.employee?.EmployeeByPk?.employeeId

                const uploadResp = await fileClient.uploadFile(
                  file,
                  { accessScope: 'tenant' },
                  {
                    appName: 'employee-profile',
                    folderPath: `/documents/${employeeId}`,
                    mimeType: (file as any)?.type || 'application/octet-stream'
                  },
                  'fileContent'
                )

                const processesBase =
                  env('NEXT_PUBLIC_PROCESSES_ENDPOINT') || 'https://newwork-dev.newwork.com/processes'
                const createDocUrl = `${processesBase}/employee/employeeDocuments`
                const body = {
                  employeeDocument: {
                    employeeId: employeeId,
                    documentGroup: values.documentGroupId || null,
                    type: values.documentTypeId || null,
                    description: '',
                    name: uploadResp?.fileInfo?.fileMetadata?.originalFileName,
                    file: uploadResp?.fileInfo?.fileId,
                    mimeType: uploadResp?.fileInfo?.fileMetadata?.mimeType,
                    fileSize: 0,
                    validFrom: new Date().toISOString()
                  }
                }

                await fetch(createDocUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: accessToken ? `Bearer ${accessToken}` : ''
                  },
                  body: JSON.stringify(body)
                })
                  .then(async r => {
                    const json = await r.json()
                    uploadedEmployeeDocumentId = json?.employeeDocument?.id
                  })
                  .catch(() => {
                    uploadedEmployeeDocumentId = undefined
                  })
              }
            } catch {}

            return { ...(values as any), employeeDocumentId: uploadedEmployeeDocumentId } as PersonalDataFormValues
          }}
          onSubmit={async (values: PersonalDataFormValues) => {
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
                displayName: values.displayName || '',
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

            const result = {
              ...payload,
              completeNotification: {
                type: 'success',
                message: t('notification-personal-data-updated-success')
              }
            }

            return result
          }}
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

              <FormField
                name={'fileUpload'}
                render={() => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:change_personal_data.upload_document',
                        'Upload Document'
                      )}
                    </FormLabel>
                    <div data-testid="flw_changePersonalData_uploadFile">
                      <FileUpload
                        multiple={false}
                        maxFiles={1}
                        accept={acceptedFileTypes}
                        layout="list"
                        preview="icon"
                        onFilesChange={handleDesignSystemFilesChange as any}
                      />
                    </div>
                  </FormItem>
                )}
              ></FormField>

              {fileList && fileList.length > 0 && (
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
                        </FormLabel>
                        <FormControl>
                          <Combobox
                            className="gba:w-full"
                            options={(catalogs.documentGroup || []).map(g => ({
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
                        </FormLabel>
                        <FormControl>
                          <Combobox
                            className="gba:w-full"
                            options={(filteredDocumentTypes || []).map(t => ({
                              value: String(t.id),
                              label: getCatalogValue(t)
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
