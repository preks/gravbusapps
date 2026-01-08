import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  getTranslationFromI18nKeyAndLabel,
  formatDateToISO,
  getCurrentActiveUserLocale
} from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import { FileUpload, FormField, FormItem, LocalizationProvider } from '@newwork/nw-design-system'
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
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../apps/employee-record/_i18n'

// form values type moved to types.ts

const ChangePersonalDataContent: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData }) => {
  const [fileList, setFileList] = useState<any[]>([])
  const { t } = useTranslation(translations)
  const { data } = useChangePersonalData()

  const employee = useMemo(() => data?.employee?.EmployeeByPk, [data])
  const employeePosition = useMemo(() => data?.employee?.EmployeePosition?.[0], [data])
  const catalogSalutation: CatalogEntry[] = useMemo(() => data?.catalogs?.salutation || [], [data])
  const catalogs = useMemo(
    () => ({
      gender: data?.catalogs?.gender || [],
      nationality: data?.catalogs?.nationality || [],
      language: data?.catalogs?.language || [],
      maritalStatus: data?.catalogs?.maritalStatus || [],
      schoolQualification: data?.catalogs?.schoolQualification || [],
      academicTitle: data?.catalogs?.academicTitle || []
    }),
    [data]
  )

  const normalizeDate = (value?: string | null): string => {
    if (!value) return ''
    // Expect incoming values like 'YYYY-MM-DD' or ISO strings
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

  const defaultValues: PersonalDataFormValues = useMemo(
    () => ({
      salutationRef: employee?.salutationRef ?? null,
      title: employee?.title ?? '',
      firstName: employee?.firstName ?? '',
      lastName: employee?.lastName ?? '',
      // Note: Labels requested are intentionally swapped by specification
      displayName: computeDisplayName(employee) ?? '',
      preferredName: employee?.preferredName ?? '',
      birthName: employee?.birthName ?? '',
      birthDate: normalizeDate(employee?.birthDate ?? ''),
      birthPlace: employee?.birthPlace ?? '',
      genderRef: employee?.genderRef ?? null,
      nationalityRef: employee?.nationalityRef ?? null,
      languageRef: employee?.languageRef ?? null,
      maritalStatusRef: employee?.maritalStatusRef ?? null,
      severelyDisabilityDegree: employee?.severelyDisabilityDegree ?? '',
      schoolQualificationRef: employee?.schoolQualificationRef ?? null,
      academicTitleRefs: Array.isArray(employee?.academicTitleRef)
        ? employee.academicTitleRef
        : employee?.academicTitleRef
          ? [employee.academicTitleRef]
          : [],
      comment: employee?.notes ?? ''
    }),
    [employee]
  )

  const form = useForm<PersonalDataFormValues>({
    defaultValues,
    mode: 'onChange'
  })

  const fileClient = useFileClient({ accessToken } as any)

  // Accepted file types aligned with previous UploadComponent
  const acceptedFileTypes = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG'

  // Map FileUpload files to the legacy fileList shape used by submit logic
  const handleDesignSystemFilesChange = useCallback((files: Array<{ file: File | { name: string }; id: string }>) => {
    const mapped = files
      .filter(f => f.file instanceof File)
      .map(f => ({
        uid: f.id,
        name: (f.file as File).name,
        status: 'done',
        originFileObj: f.file as File
      }))
    // Defer to avoid setState during child render
    setTimeout(() => setFileList(mapped), 0)
  }, [])

  // Normalize default values to match Select option value types (string ids)
  const normalizedDefaults: PersonalDataFormValues = useMemo(() => {
    const toIdString = (val: any) => (val === null || val === undefined || val === '' ? null : String(val))
    const findId = (list: CatalogEntry[] | undefined, current: any) => {
      if (!list || current === null || current === undefined || current === '') return null
      const currentStr = String(current)
      const match = list.find(
        e =>
          String(e?.id) === currentStr ||
          String(e?.value) === currentStr ||
          String(e?.translations?.[0]?.value) === currentStr
      )
      return match ? String(match.id) : toIdString(current)
    }

    return {
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
    } as PersonalDataFormValues
  }, [defaultValues, catalogSalutation, catalogs])

  // Reset to normalized defaults whenever employee/catalogs change
  useEffect(() => {
    form.reset(normalizedDefaults)
  }, [normalizedDefaults])

  // Track initial values for change detection
  const initialRef = useRef<PersonalDataFormValues>(normalizedDefaults)
  useEffect(() => {
    initialRef.current = normalizedDefaults
  }, [normalizedDefaults])

  const normalizeForCompare = (v: PersonalDataFormValues) => ({
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
    academicTitleRefs: Array.isArray(v.academicTitleRefs) ? v.academicTitleRefs : [],
    comment: v.comment || ''
  })

  const watchedValues = form.watch()
  const isUnchangedNow = useMemo(() => {
    return (
      JSON.stringify(normalizeForCompare(watchedValues as any)) ===
      JSON.stringify(normalizeForCompare(initialRef.current))
    )
  }, [watchedValues])

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
        {/* moved upload below comment - removed from here */}

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
          isSubmitDisabled={!form.formState.isValid || isUnchangedNow}
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
                    documentGroup: 'DocumentGroup:v1:PERSONAL',
                    type: 'DocumentType:v1:17',
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
            } catch {
              uploadedEmployeeDocumentId = undefined
            }

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
                personalDocument: uploadedEmployeeDocumentId || null, //uploadedEmployeeDocumentId ||
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
            return {
              ...payload,
              completeNotification: {
                type: 'success',
                message: t('notification-personal-data-updated-success')
              }
            }
          }}
          data-testid="change-personal-data"
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="change-personal-data-groups">
            {/* Group 1: Names */}
            <NamesGroup control={form.control} catalogs={{ salutation: catalogSalutation }} setValue={form.setValue} />

            {/* Group 2: Birth and Gender (includes DOB & Place) */}
            <BirthAndGenderGroup control={form.control} catalogs={{ gender: catalogs.gender }} />

            {/* Group 3: Nationality, Language, Marital Status, Disability */}
            <NationalityLanguageStatusGroup
              control={form.control}
              catalogs={{
                nationality: catalogs.nationality,
                language: catalogs.language,
                maritalStatus: catalogs.maritalStatus
              }}
            />

            {/* Qualification fields (school + academic titles) */}
            <QualificationFields
              control={form.control}
              catalogs={{ schoolQualification: catalogs.schoolQualification, academicTitle: catalogs.academicTitle }}
            />

            {/* Upload (nw-design-system)  */}
            <FormField
              name={'fileUpload'}
              render={() => (
                <FormItem>
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
