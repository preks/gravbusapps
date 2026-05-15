import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  Button,
  Textarea,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import { AbsenceDateRangePicker } from './components/AbsenceDateRangePicker'
import { AlertCircle } from 'lucide-react'
import { Upload } from 'antd'
import type { UploadFile } from 'antd'
import { UploadIcon } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'

import dayjs from 'dayjs'
import flowSmall from '@/assets/icons/flowSmall.svg'
import FormHeader from '../components/FormHeader'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getAllEmployees } from './queries/getAllEmployees'
import { GET_EMPLOYEE_DETAILS } from './queries/getEmployeeDetails'
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  getPrevalidateErrorPresentation,
  shouldDuplicatePrevalidateErrorBelowDatepicker
} from '@/business-apps/hr/core/utils/absencePrevalidateLabels'
import { useAbsenceValidation } from './hooks/useAbsenceValidation'
import { useAbsencePrevalidate } from './hooks/useAbsencePrevalidate'
import { useFileClient } from '@/common/network/files/useFileClient'
import { useAbsenceTypesByGroup } from './hooks/useAbsenceTypesByGroup'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import translations from '../_i18n'

const SICK_LEAVE_USER_TASK_AUTO_COMPLETE_DELAY_MS = 2000

type Employee = {
  id: string
  userId: string
  firstName: string
  lastName: string
}

type CreateNewAbsenceFormValues = {
  selectedType: string
  startDate: Date | undefined
  endDate: Date | undefined
  selectedSubstitute?: string
  comment: string
}

type LaunchContextValue = Record<string, unknown>

type LaunchContext = {
  employeeId?: string
  startDate?: string
  endDate?: string
  absenceType?: string
  flowType?: string
  processName?: string
}

const toLaunchContextValue = (value: unknown): LaunchContextValue => {
  return value && typeof value === 'object' ? (value as LaunchContextValue) : {}
}

const pickLaunchString = (sources: LaunchContextValue[], key: keyof LaunchContext): string | undefined => {
  for (const source of sources) {
    const value = source[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value
    }
  }

  return undefined
}

const toInitialDate = (value?: string): Date | undefined => {
  if (!value) {
    return undefined
  }

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate
}

export const CreateNewAbsence: React.FC<BusinessAppContextProps> = props => {
  const { accessToken, userInfo, additionalData } = props
  const client = useGraphQLClient(accessToken)
  const { t } = useTranslation(translations)
  const structureId = getCurrentActiveStructureId()

  const absenceTypeToProcessMap: Record<string, string> = {
    'AbsenceType:v1:A001': 'createEmployeeVacation',
    'AbsenceType:v1:A021': 'createEmployeeSickLeave',
    'AbsenceType:v1:A050': 'createEmployeeSpecialLeave',
    'AbsenceType:v1:A170': 'createEmployeeWorkLeave'
  }
  const flowTypeToProcessMap: Record<string, string> = {
    vacation: 'createEmployeeVacation',
    sickLeave: 'createEmployeeSickLeave',
    specialLeave: 'createEmployeeSpecialLeave',
    workLeave: 'createEmployeeWorkLeave'
  }
  const launchContext = useMemo<LaunchContext>(() => {
    const taskPayload = toLaunchContextValue(additionalData?.psi_taskPayload)
    const taskInitialParameters = toLaunchContextValue(taskPayload.psi_initialParameters)
    const legacyTaskInitialParameters = toLaunchContextValue(taskPayload.initialParameters)
    const standaloneInitialParameters = toLaunchContextValue(additionalData?.psi_initialParameters)
    const externalContextData = toLaunchContextValue(additionalData?.externalContextData)
    const contextData = toLaunchContextValue(additionalData?.contextData)
    const flowContext = toLaunchContextValue(additionalData?.flowContext)
    const directContext = toLaunchContextValue(additionalData)

    const launchSources = [
      taskInitialParameters,
      legacyTaskInitialParameters,
      taskPayload,
      standaloneInitialParameters,
      externalContextData,
      contextData,
      flowContext,
      directContext
    ]

    return {
      employeeId: pickLaunchString(launchSources, 'employeeId'),
      startDate: pickLaunchString(launchSources, 'startDate'),
      endDate: pickLaunchString(launchSources, 'endDate'),
      absenceType: pickLaunchString(launchSources, 'absenceType'),
      flowType: pickLaunchString(launchSources, 'flowType'),
      processName: pickLaunchString(launchSources, 'processName')
    }
  }, [additionalData])

  const initialStartDate = toInitialDate(launchContext.startDate)
  const initialEndDate = toInitialDate(launchContext.endDate)

  const processName =
    additionalData?.psi_processMetadata?.processName ||
    additionalData?.psi_processMetadata?.processMetadata?.name ||
    launchContext.processName ||
    (launchContext.absenceType ? absenceTypeToProcessMap[launchContext.absenceType] : '') ||
    (launchContext.flowType ? flowTypeToProcessMap[launchContext.flowType] : '') ||
    ''
  const processToParentAbsenceTypeMap: Record<string, string> = {
    createEmployeeVacation: 'AbsenceType:v1:A001',
    createEmployeeSickLeave: 'AbsenceType:v1:A021',
    createEmployeeSpecialLeave: 'AbsenceType:v1:A050',
    createEmployeeWorkLeave: 'AbsenceType:v1:A170'
  }
  const mappedParentType = launchContext.absenceType || (processName ? processToParentAbsenceTypeMap[processName] : '')
  const absenceType = mappedParentType || ''
  const isSickLeaveProcess = processName === 'createEmployeeSickLeave'

  const [employees, setEmployees] = useState<Employee[]>([])
  const [employee, setEmployee] = useState<{
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    jobTitle?: string
  } | null>(null)
  const [employeeHireDate, setEmployeeHireDate] = useState<Date | undefined>(undefined)

  // Prefer flow-provided employee context, then fall back to the logged-in employee.
  const employeeId = useMemo(() => {
    return launchContext.employeeId || userInfo?.employeeDetails?.employeeId || ''
  }, [launchContext.employeeId, userInfo?.employeeDetails?.employeeId])

  const { absenceTypes: types } = useAbsenceTypesByGroup(props, absenceType)

  const toDateKey = useCallback((date?: Date): string | undefined => {
    if (!date || Number.isNaN(date.getTime())) return undefined
    return dayjs(date).format('YYYY-MM-DD')
  }, [])

  const isBeforeHireDate = useCallback(
    (date?: Date): boolean => {
      const dateKey = toDateKey(date)
      const hireDateKey = toDateKey(employeeHireDate)
      return Boolean(dateKey && hireDateKey && dateKey < hireDateKey)
    },
    [employeeHireDate, toDateKey]
  )

  const initialFormValues: CreateNewAbsenceFormValues = {
    selectedType: '',
    startDate: initialStartDate,
    endDate: initialEndDate,
    selectedSubstitute: undefined,
    comment: ''
  }

  const form = useForm<CreateNewAbsenceFormValues>({
    defaultValues: initialFormValues
  })

  const formValuesState = form.watch()

  const { existingSickLeave, hasExistingSickLeave } = useAbsenceValidation({
    accessToken,
    employeeId: employeeId || '',
    selectedType: formValuesState.selectedType || '',
    startDate: formValuesState.startDate,
    endDate: formValuesState.endDate,
    context: props,
    disableCalendarValidation: true
  })

  const prevalidateStartDateStr =
    formValuesState.startDate == null ? null : dayjs(formValuesState.startDate).format('YYYY-MM-DD')
  const prevalidateEndDateStr =
    formValuesState.endDate == null ? null : dayjs(formValuesState.endDate).format('YYYY-MM-DD')
  const prevalidate = useAbsencePrevalidate(
    accessToken,
    employeeId || undefined,
    formValuesState.selectedType || undefined,
    prevalidateStartDateStr,
    prevalidateEndDateStr
  )
  const hasPrevalidateError = !!prevalidate.errorCode
  const duplicatedPrevalidateError = useMemo(() => {
    if (!prevalidate.errorCode || !shouldDuplicatePrevalidateErrorBelowDatepicker(prevalidate.errorCode)) {
      return null
    }

    const presentation = getPrevalidateErrorPresentation(prevalidate.errorCode, prevalidate.errorDetail)
    return {
      title: getTranslationFromI18nKeyAndLabel(presentation.messageKey, presentation.messageFallback),
      detail: getTranslationFromI18nKeyAndLabel(presentation.detailKey, presentation.detailFallback)
    }
  }, [prevalidate.errorCode, prevalidate.errorDetail])

  useEffect(() => {
    const start = formValuesState.startDate
    const end = formValuesState.endDate
    if (!start) return
    if (!end || end < start) {
      form.setValue('endDate', start)
    }
  }, [formValuesState.startDate, formValuesState.endDate, form])

  const [isUpdateMode, setIsUpdateMode] = useState(false)
  const [showSickLeaveOptions, setShowSickLeaveOptions] = useState(false)

  const [fileList, setFileList] = useState<UploadFile[]>([])
  const fileClient = useFileClient({ accessToken })

  useEffect(() => {
    if (!accessToken || !userInfo?.id) return
    client
      .request(getAllEmployees, {
        excludeUserId: userInfo.id,
        activeStructure: structureId
      })
      .then((res: { Employee?: Employee[] }) => {
        setEmployees(res?.Employee || [])
      })
  }, [accessToken, userInfo?.id, structureId, client])

  useEffect(() => {
    if (!accessToken || !employeeId) return
    client
      .request(GET_EMPLOYEE_DETAILS, {
        idEmployee: employeeId
      })
      .then((res: any) => {
        setEmployee({
          firstName: res?.EmployeeByPk?.firstName,
          lastName: res?.EmployeeByPk?.lastName,
          pictureThumbnail: res?.EmployeeByPk?.pictureThumbnail,
          jobTitle: res?.EmployeePosition?.[0]?.jobPosition?.name
        })
        const hireDate = res?.EmployeeByPk?.workingCondition?.[0]?.hireDate
        setEmployeeHireDate(hireDate ? new Date(hireDate) : undefined)
      })
      .catch(() => {
        // Silently fail if employee details can't be fetched
      })
  }, [accessToken, employeeId, client])

  useEffect(() => {
    if (types.length === 1 && !formValuesState.selectedType) {
      form.setValue('selectedType', types[0].id)
    }
  }, [types, formValuesState.selectedType, form])

  useEffect(() => {
    if (hasExistingSickLeave && existingSickLeave && isSickLeaveProcess) {
      setShowSickLeaveOptions(true)
    } else {
      setShowSickLeaveOptions(false)
      setIsUpdateMode(false)
    }
  }, [hasExistingSickLeave, existingSickLeave, isSickLeaveProcess])

  const isMandatoryFieldsCompleted = useMemo(() => {
    return !!(formValuesState.selectedType && formValuesState.startDate && formValuesState.endDate)
  }, [formValuesState.selectedType, formValuesState.startDate, formValuesState.endDate])

  const isFormValid = useMemo(() => {
    if (isUpdateMode) {
      return !!(
        formValuesState.selectedType &&
        formValuesState.startDate &&
        formValuesState.endDate &&
        !isBeforeHireDate(formValuesState.startDate) &&
        !isBeforeHireDate(formValuesState.endDate)
      )
    }

    return (
      isMandatoryFieldsCompleted &&
      !isBeforeHireDate(formValuesState.startDate) &&
      !isBeforeHireDate(formValuesState.endDate)
    )
  }, [
    isUpdateMode,
    isMandatoryFieldsCompleted,
    formValuesState.selectedType,
    formValuesState.startDate,
    formValuesState.endDate,
    isBeforeHireDate
  ])

  const handleUpdateExisting = useCallback(() => {
    if (!existingSickLeave) return

    setIsUpdateMode(true)
    setShowSickLeaveOptions(false)

    form.reset({
      selectedType: existingSickLeave.typeRef,
      startDate: new Date(existingSickLeave.startDate),
      endDate: new Date(existingSickLeave.endDate),
      selectedSubstitute: existingSickLeave.substituteEmployee?.id || undefined,
      comment: existingSickLeave.description || ''
    })
  }, [existingSickLeave, form])

  const handleCreateNew = useCallback(() => {
    setIsUpdateMode(false)
    setShowSickLeaveOptions(false)
  }, [])

  const handleFileChange = useCallback(({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    const limitedFileList = newFileList.slice(-5)
    setFileList(limitedFileList)
  }, [])

  const beforeUpload = useCallback((file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    const isValidType = allowedTypes.includes(file.type)

    if (!isValidType) {
      return false
    }

    const isValidSize = file.size / 1024 / 1024 < 10

    if (!isValidSize) {
      return false
    }

    return false
  }, [])

  const handleFormSubmit = useCallback(
    async (formData: CreateNewAbsenceFormValues) => {
      const baseAbsenceData = {
        employeeId: employeeId,
        typeRef: formData.selectedType,
        startDate: formData.startDate ? dayjs(formData.startDate).format('YYYY-MM-DD') : null,
        endDate: formData.endDate ? dayjs(formData.endDate).format('YYYY-MM-DD') : null,
        substituteEmployee: formData.selectedSubstitute,
        description: formData.comment,
        status: 'PENDING'
      }

      const employeeDocuments = []

      for (const fileItem of fileList) {
        if (fileItem.originFileObj) {
          try {
            const pathParams = { accessScope: 'public' }
            const queryParams = {
              appName: 'employee-profile',
              folderPath: `/documents/${employeeId || ''}/absences`
            }

            const uploadResponse = await fileClient.uploadFile(fileItem.originFileObj, pathParams, queryParams)

            const employeeDocument = {
              employeeId: employeeId,
              documentGroup: 'DocumentGroup:v1:PERSONAL',
              type: 'DocumentType:v1:16',
              name: uploadResponse.fileInfo.fileMetadata?.originalFileName || fileItem.name,
              file: uploadResponse.fileInfo.fileId,
              mimeType: uploadResponse.fileInfo.fileMetadata?.mimeType || fileItem.originFileObj.type,
              description: formData.comment,
              fileSize: fileItem.originFileObj.size,
              validFrom: formData.startDate ? dayjs(formData.startDate).format('YYYY-MM-DD') : null,
              validTo: formData.endDate ? dayjs(formData.endDate).format('YYYY-MM-DD') + 'T23:59:00' : null
            }

            employeeDocuments.push(employeeDocument)
          } catch {}
        }
      }
      const payload =
        isUpdateMode && existingSickLeave
          ? {
              employeeId: employeeId,
              absenceType: formData.selectedType,
              event: 'pse_submit',
              shouldBECustomErrorMessage: true,
              employeeAbsence: {
                ...baseAbsenceData,
                id: existingSickLeave.id,
                version: existingSickLeave.version
              },
              ...(employeeDocuments.length > 0 && { employeeDocuments })
            }
          : {
              employeeId: employeeId,
              absenceType: formData.selectedType,
              event: 'pse_submit',
              shouldBECustomErrorMessage: true,
              employeeAbsence: baseAbsenceData,
              ...(employeeDocuments.length > 0 && { employeeDocuments })
            }

      if (isSickLeaveProcess && !isUpdateMode) {
        window.setTimeout(() => {
          dispatchProcessContinueEvent('pse_submit', payload)
        }, SICK_LEAVE_USER_TASK_AUTO_COMPLETE_DELAY_MS)
      }

      return payload
    },
    [employeeId, fileList, isUpdateMode, existingSickLeave, fileClient, isSickLeaveProcess]
  )

  const validateForm = useCallback(
    (formData: CreateNewAbsenceFormValues): string[] | null => {
      const errors: string[] = []

      if (!formData.selectedType) {
        errors.push('Type is required')
      }
      if (!formData.startDate) {
        errors.push('Start date is required')
      }
      if (!formData.endDate) {
        errors.push('End date is required')
      }
      if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
        errors.push('End date must be after start date')
      }
      if (isBeforeHireDate(formData.startDate) || isBeforeHireDate(formData.endDate)) {
        errors.push(t('create-absence-date-before-hire-error'))
      }

      return errors.length > 0 ? errors : null
    },
    [isBeforeHireDate, t]
  )

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-md"
      data-testid="create-new-absence-root"
    >
      <FormHeader
        title={getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.create_new_title', 'Create New Absence')}
        flowIconUrl={flowSmall}
        employee={
          employee
            ? {
                firstName: employee.firstName,
                lastName: employee.lastName,
                pictureThumbnail: employee.pictureThumbnail,
                jobTitle: employee.jobTitle
              }
            : undefined
        }
      />
      <AppActionForm
        processType={isUpdateMode ? 'update' : 'create'}
        onSubmit={handleFormSubmit}
        formData={formValuesState}
        validateForm={validateForm}
        form={form}
        businessAppContext={props}
        submitButtonText={
          isUpdateMode
            ? getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.btn_update',
                'Update'
              )
            : getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')
        }
        isSubmitDisabled={!isFormValid || hasPrevalidateError}
        submitEventType="pse_submit"
        cancelEventType="pse_abort"
        data-testid="create-new-absence-form"
      >
        <div className="gba:flex-1 gba:space-y-4" data-testid="create-new-absence-form-content">
          {showSickLeaveOptions && existingSickLeave && (
            <div
              className="gba:mb-4 gba:p-4 gba:border gba:border-warning gba:bg-warning-secondary gba:rounded"
              data-testid="sick-leave-options-container"
            >
              <div className="gba:mb-3">
                <h4 className="gba:text-sm gba:font-semibold gba:text-warning gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_form.existing_found',
                    'Existing Sick Leave Found'
                  )}
                </h4>
                <p className="gba:text-sm gba:text-warning">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_form.existing_message',
                    'You already have a sick leave for today. Would you like to update it or create a new absence?'
                  )}
                </p>
              </div>
              <div className="gba:flex gba:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="gba:border-warning gba:text-warning hover:gba:bg-warning-secondary"
                  onClick={handleUpdateExisting}
                  data-testid="update-existing-sick-leave-button"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.update_existing', 'Update Existing')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gba:border-warning gba:text-warning hover:gba:bg-warning-secondary"
                  onClick={handleCreateNew}
                  data-testid="create-new-absence-button"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.create_new', 'Create New')}
                </Button>
              </div>
            </div>
          )}

          {!showSickLeaveOptions && (
            <>
              <div className="gba:mb-4 gba:w-full">
                <Label className="gba:block gba:mb-2 gba:font-medium" data-testid="type-Label">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.type', 'Type')}
                  <span className="gba:text-destructive gba:ml-1">*</span>
                </Label>
                <div className="gba:w-full">
                  <Select
                    data-testid="type-dropdown"
                    value={formValuesState.selectedType || ''}
                    onValueChange={(value: string) => {
                      form.setValue('selectedType', value)
                    }}
                    disabled={types.length <= 1}
                  >
                    <SelectTrigger className="gba:w-full">
                      <SelectValue
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_form.select_type',
                          'Select a type'
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="gba:mb-4">
                <Label className="gba:block gba:mb-2 gba:font-medium" data-testid="date-range-label">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start Date')} /{' '}
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.end_date', 'End Date')}
                  <span className="gba:text-destructive gba:ml-1">*</span>
                </Label>
                <AbsenceDateRangePicker
                  startDate={formValuesState.startDate}
                  endDate={formValuesState.endDate}
                  onChange={(start, end) => {
                    form.setValue('startDate', start)
                    form.setValue('endDate', end)
                  }}
                  accessToken={accessToken}
                  employeeId={employeeId}
                  selectedTypeRef={formValuesState.selectedType}
                  prevalidate={prevalidate}
                  minDate={employeeHireDate}
                  data-testid="absence-date-range-input"
                />
              </div>
              {absenceType !== 'AbsenceGroup:v1:WORK' && (
                <div className="gba:mb-4 gba:w-full">
                  <Label className="gba:block gba:mb-2 gba:font-medium" data-testid="substitute-Label">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.substitute', 'Substitute')}
                  </Label>
                  <div className="gba:w-full">
                    <Select
                      data-testid="substitute-dropdown"
                      value={formValuesState.selectedSubstitute || ''}
                      onValueChange={(value: string) => form.setValue('selectedSubstitute', value)}
                    >
                      <SelectTrigger className="gba:w-full">
                        <SelectValue
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_form.select_substitute',
                            'Select substitute'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="gba:mb-4">
                <Label className="gba:block gba:mb-2 gba:font-medium" data-testid="comment-Label">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area',
                    'Comment'
                  )}
                </Label>
                <Textarea
                  data-testid="comment-textarea"
                  className="gba:w-full gba:min-h-[80px]"
                  value={formValuesState.comment || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => form.setValue('comment', e.target.value)}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_form.comment_text_area_placeholder',
                    'Add a comment (optional)'
                  )}
                />
              </div>

              {isUpdateMode && existingSickLeave && (
                <div
                  className="gba:mb-4 gba:p-3 gba:border gba:border-info gba:bg-info-secondary gba:rounded"
                  data-testid="update-mode-indicator"
                >
                  <p className="gba:text-sm gba:text-info gba:font-medium">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_form.update_mode_indicator',
                      'Updating existing absence'
                    )}
                  </p>
                </div>
              )}

              {/* File Upload Section - Only for Sick Leave */}
              {isSickLeaveProcess && (
                <div className="gba:mb-4">
                  <Label className="gba:block gba:mb-2 gba:font-medium" data-testid="attachments-label">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.attachments', 'Attachments')}
                  </Label>
                  <Upload
                    fileList={fileList}
                    onChange={handleFileChange}
                    beforeUpload={beforeUpload}
                    multiple
                    maxCount={5}
                    accept=".pdf,.jpg,.jpeg,.png"
                    data-testid="file-upload"
                    className="gba:w-full"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="gba:w-full gba:h-12 gba:border-dashed gba:border-2 gba:border-border hover:gba:border-info"
                      data-testid="upload-button"
                    >
                      <UploadIcon size={16} className="gba:mr-2" />
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_form.upload_button',
                        'Click or drag files to upload'
                      )}
                    </Button>
                  </Upload>
                  <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_form.upload_hint',
                      'Supported formats: PDF, JPG, PNG (max 10MB each, up to 5 files)'
                    )}
                  </div>
                </div>
              )}
              {duplicatedPrevalidateError && (
                <Alert className="gba:mb-4" data-testid="prevalidate-inline-error">
                  <AlertCircle className="gba:h-4 gba:w-4" />
                  <span className="gba:flex gba:flex-col gba:gap-0.5">
                    <strong>{duplicatedPrevalidateError.title}</strong>
                    <span>{duplicatedPrevalidateError.detail}</span>
                  </span>
                </Alert>
              )}
            </>
          )}
        </div>
      </AppActionForm>
    </div>
  )
}

export default CreateNewAbsence
