import React, { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Alert, AlertDescription, Spinner, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import translations from '@/business-apps/hr/core/apps/employee-record/_i18n'
import { useSkillCategories } from '@/business-apps/hr/core/apps/employee-record/hooks/useSkillCategories'
import FormHeader from '../components/FormHeader'
import { AddSkillProvider, useAddSkill } from './AddSkillContext'
import {
  buildCreateEmployeeSkillPayload,
  buildDeleteEmployeeSkillPayload,
  buildUpdateEmployeeSkillPayload
} from './utils/addSkillUtils'
import { AddSkillFormSections } from './components/AddSkillFormSections'
import { useAddSkillFormController } from './hooks/useAddSkillFormController'
import { ACCEPTED_VERIFICATION_FILE_TYPES, AddSkillFormValues, DOCUMENT_GROUP_DEVELOPMENT } from './addSkill.types'
import { useEmployeeDocumentSync } from '../document-sync/useEmployeeDocumentSync'
import { getFormContextErrorMessage } from '@/business-apps/hr/core/utils/getFormContextErrorMessage'

const getFormTitle = (
  t: (key: string, args?: Record<string, unknown>) => string,
  flowFormParams: { mode?: string } | null | undefined,
  changeLevelParams: unknown
) => {
  if (flowFormParams?.mode === 'deactivate') return t('add-skill-form-deactivate-title')
  if (flowFormParams?.mode === 'activate') return t('add-skill-form-activate-title')
  if (flowFormParams?.mode === 'attachVerification') return t('add-skill-form-attach-verification-title')
  if (flowFormParams?.mode === 'remove') return t('add-skill-form-remove-title')
  if (changeLevelParams) return t('skills-action-update-level')
  return t('add-skill-form-title')
}

const getProcessType = (flowFormParams: { mode?: string } | null | undefined): 'create' | 'update' | 'delete' => {
  if (flowFormParams?.mode === 'remove') return 'delete'
  if (flowFormParams?.mode === undefined) return 'create'
  return 'update'
}

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

function toDateInputValue(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const isoDate = trimmed.split('T')[0]
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : ''
}

const AddSkillContent: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData }) => {
  const { t } = useTranslation(translations)
  const {
    data,
    searchSkills,
    employeeId: ctxEmployeeId,
    changeLevelParams,
    flowFormParams,
    error: contextError,
    isLoading: contextLoading
  } = useAddSkill()
  const contextErrorMessage = useMemo(
    () => getFormContextErrorMessage({ error: contextError, employeeId: ctxEmployeeId, accessToken }, t),
    [accessToken, contextError, ctxEmployeeId, t]
  )

  const form = useForm<AddSkillFormValues>({
    defaultValues: { targetEmployeeId: undefined, documentTypeId: null, validTo: '' },
    mode: 'onChange',
    shouldUnregister: true
  })

  const employee = data?.employee
  const skillCategoriesData = useSkillCategories(accessToken)
  const catalogs = data?.catalogs ?? { documentType: [] }
  const developmentDocumentTypes = useMemo(
    () =>
      (catalogs.documentType || []).filter(
        (entry: { parentEntryId?: string | null }) => entry.parentEntryId === DOCUMENT_GROUP_DEVELOPMENT
      ),
    [catalogs.documentType]
  )
  const getCatalogValue = useCallback((entry: { translations?: { value?: string }[]; value?: string }) => {
    return entry?.translations?.[0]?.value ?? entry?.value ?? ''
  }, [])

  const controller = useAddSkillFormController({
    employee,
    flowFormParams,
    changeLevelParams,
    searchSkills
  })

  const formTitle = getFormTitle(t, flowFormParams, changeLevelParams)
  const employeeIdForDocuments =
    ctxEmployeeId || additionalData?.employeeId || additionalData?.psi_taskPayload?.employeeId || data?.employee?.id
  const selectedSkillForVerification = useMemo(() => {
    if (flowFormParams?.mode !== 'attachVerification' || !flowFormParams?.skillId) {
      return null
    }
    return controller.existingSkillsList.find(skill => skill.skill?.id === flowFormParams.skillId) ?? null
  }, [flowFormParams?.mode, flowFormParams?.skillId, controller.existingSkillsList])
  const selectedVerificationDocumentId = toValidEmployeeDocumentId(
    (selectedSkillForVerification as any)?.verificationDocumentId
  )
  const selectedVerificationDocumentTypeId = useMemo(() => {
    const rawType = (selectedSkillForVerification as any)?.verificationDocument?.type
    return typeof rawType === 'string' && rawType.trim().length > 0 ? rawType : ''
  }, [selectedSkillForVerification])
  const selectedVerificationDocumentValidTo = useMemo(() => {
    const rawValidTo = (selectedSkillForVerification as any)?.verificationDocument?.validTo
    return toDateInputValue(rawValidTo)
  }, [selectedSkillForVerification])
  const verificationDocumentSync = useEmployeeDocumentSync({
    accessToken,
    employeeId: employeeIdForDocuments,
    existingDocumentIds: selectedVerificationDocumentId ? [selectedVerificationDocumentId] : [],
    enabled: Boolean(
      flowFormParams?.mode === 'attachVerification' &&
        employeeIdForDocuments &&
        selectedVerificationDocumentId &&
        accessToken
    ),
    appName: 'employee-profile',
    folderPath: employeeIdForDocuments ? `/documents/${employeeIdForDocuments}` : undefined
  })
  const watchedDocumentTypeId = form.watch('documentTypeId')
  const watchedValidTo = form.watch('validTo')

  const isAttachVerificationSubmitDisabled = useMemo(() => {
    if (flowFormParams?.mode === 'activate') {
      return toDateInputValue(watchedValidTo).length === 0
    }

    if (flowFormParams?.mode !== 'attachVerification') {
      return controller.isSubmitDisabled
    }

    const hasDocumentChange =
      verificationDocumentSync.hasPendingNewUpload || verificationDocumentSync.hasRemovedInitialFiles
    const selectedDocumentTypeId = (watchedDocumentTypeId || '').toString().trim()
    const selectedValidTo = toDateInputValue(watchedValidTo)
    const hasMetadataChange =
      Boolean(selectedVerificationDocumentId) &&
      (selectedDocumentTypeId !== selectedVerificationDocumentTypeId ||
        selectedValidTo !== selectedVerificationDocumentValidTo)

    if (!hasDocumentChange && !hasMetadataChange) {
      return true
    }

    const hasFile = verificationDocumentSync.managedFiles.length > 0
    if (!hasFile) {
      return false
    }

    return selectedDocumentTypeId.length === 0
  }, [
    flowFormParams?.mode,
    controller.isSubmitDisabled,
    verificationDocumentSync.hasPendingNewUpload,
    verificationDocumentSync.hasRemovedInitialFiles,
    verificationDocumentSync.managedFiles,
    watchedDocumentTypeId,
    watchedValidTo,
    selectedVerificationDocumentId,
    selectedVerificationDocumentTypeId,
    selectedVerificationDocumentValidTo
  ])

  useEffect(() => {
    if (flowFormParams?.mode !== 'attachVerification') {
      return
    }

    const currentDocumentType = (form.getValues('documentTypeId') || '').toString().trim()
    if (currentDocumentType) {
      return
    }

    if (selectedVerificationDocumentTypeId) {
      form.setValue('documentTypeId', selectedVerificationDocumentTypeId, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true
      })
    }

    const currentValidTo = (form.getValues('validTo') || '').toString().trim()
    if (!currentValidTo && selectedVerificationDocumentValidTo) {
      form.setValue('validTo', selectedVerificationDocumentValidTo, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true
      })
    }
  }, [flowFormParams?.mode, selectedVerificationDocumentTypeId, selectedVerificationDocumentValidTo, form])

  if (contextLoading) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:min-h-[320px] gba:items-center gba:justify-center"
        data-testid="add-skill-loading"
      >
        <Spinner />
      </div>
    )
  }

  if (!contextLoading && contextErrorMessage) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:p-4"
        data-testid="flw_addSkills_addSkillsContainer"
      >
        <Alert variant="destructive" data-testid="add-skill-context-error">
          <AlertDescription>{contextErrorMessage}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
      data-testid="flw_addSkills_addSkillsContainer"
    >
      <FormHeader
        title={formTitle}
        flowIconUrl={flowIconUrl}
        employee={
          employee
            ? {
                firstName: employee.firstName,
                lastName: employee.lastName,
                pictureThumbnail: employee.pictureThumbnail,
                jobTitle: Array.isArray(employee.employeePosition)
                  ? employee.employeePosition?.[0]?.jobPosition?.name
                  : (employee.employeePosition as any)?.jobPosition?.name
              }
            : undefined
        }
      />

      <div
        className="gba:flex gba:flex-col gba:[&>div[data-testid='add-skill-form']]:pt-0!"
        data-testid="add-skill-form-content"
      >
        <AppActionForm
          processType={getProcessType(flowFormParams)}
          form={form as any}
          formData={controller.normalizedDefaults}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          submitButtonTestId="flw_addSkills_submitButton"
          cancelButtonTestId="flw_addSkills_cancelButton"
          isSubmitDisabled={isAttachVerificationSubmitDisabled}
          submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
          cancelButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.initiate_cancel_button',
            'Cancel'
          )}
          handlePreSubmit={
            flowFormParams?.mode === 'attachVerification'
              ? async (values: AddSkillFormValues) => {
                  const shouldClearVerificationDocument =
                    verificationDocumentSync.hasRemovedInitialFiles && !verificationDocumentSync.hasPendingNewUpload

                  const syncResult = await verificationDocumentSync.syncDocuments({
                    documentGroup: DOCUMENT_GROUP_DEVELOPMENT,
                    documentType: values.documentTypeId || null,
                    validTo: values.validTo ? new Date(values.validTo).toISOString() : null,
                    deleteFirst: false,
                    deleteRemovedDocuments: false
                  })

                  const uploadedVerificationDocumentId = shouldClearVerificationDocument
                    ? null
                    : syncResult.primaryDocumentId

                  return { ...values, uploadedVerificationDocumentId }
                }
              : undefined
          }
          onSubmit={async (values: AddSkillFormValues) => {
            const employeeId = ctxEmployeeId || values.targetEmployeeId

            if (flowFormParams?.mode === 'attachVerification') {
              const normalizedVerificationDocumentId =
                typeof values.uploadedVerificationDocumentId === 'string' ? values.uploadedVerificationDocumentId : null

              return buildUpdateEmployeeSkillPayload({
                employeeSkillId: flowFormParams.employeeSkillId,
                skillId: flowFormParams.skillId,
                validTo: values.validTo || null,
                verificationDocument: normalizedVerificationDocumentId,
                previousVerificationDocument: selectedVerificationDocumentId || null,
                existingSkills: controller.existingSkillsList as any
              })
            }

            if (flowFormParams?.mode === 'remove') {
              return buildDeleteEmployeeSkillPayload(flowFormParams.employeeSkillId, flowFormParams.skillId)
            }

            if (flowFormParams?.mode === 'deactivate') {
              return buildUpdateEmployeeSkillPayload({
                employeeSkillId: flowFormParams.employeeSkillId,
                skillId: flowFormParams.skillId,
                validTo: new Date(Date.now() - 1000).toISOString().split('T')[0],
                existingSkills: controller.existingSkillsList as any
              })
            }

            if (flowFormParams?.mode === 'activate') {
              return buildUpdateEmployeeSkillPayload({
                employeeSkillId: flowFormParams.employeeSkillId,
                skillId: flowFormParams.skillId,
                validTo: values.validTo || null,
                existingSkills: controller.existingSkillsList as any
              })
            }

            if (changeLevelParams?.skillId) {
              return buildUpdateEmployeeSkillPayload({
                employeeSkillId: changeLevelParams.employeeSkillId,
                skillId: changeLevelParams.skillId,
                level: controller.selectedSkills.find(s => s.id === changeLevelParams.skillId)?.level ?? 1,
                existingSkills: controller.existingSkillsList as any
              })
            }

            return buildCreateEmployeeSkillPayload({
              employeeId,
              skillsToAssign: controller.skillsToAssign
            })
          }}
          data-testid="add-skill-form"
        >
          <AddSkillFormSections
            t={t}
            form={form}
            flowFormParams={flowFormParams}
            changeLevelParams={changeLevelParams}
            employee={employee}
            activeSelectedSkills={controller.activeSelectedSkills}
            skillsToAssign={controller.skillsToAssign}
            searchTerm={controller.searchTerm}
            setSearchTerm={controller.setSearchTerm}
            inputKey={controller.inputKey}
            isDropdownOpen={controller.isDropdownOpen}
            isSearching={controller.isSearching}
            filteredResults={controller.filteredResults}
            addError={controller.addError}
            verificationFileList={verificationDocumentSync.managedFiles}
            developmentDocumentTypes={developmentDocumentTypes}
            getCatalogValue={getCatalogValue}
            acceptedVerificationFileTypes={ACCEPTED_VERIFICATION_FILE_TYPES}
            dropdownRef={controller.dropdownRef}
            searchContainerRef={controller.searchContainerRef}
            handleDesignSystemFilesChange={verificationDocumentSync.onFilesChange}
            handleSearchBlur={controller.handleSearchBlur}
            handleSearchFocus={controller.handleSearchFocus}
            handleSelectSkill={controller.handleSelectSkill}
            handleAddNewSkill={controller.handleAddNewSkill}
            handleRemoveSkill={controller.handleRemoveSkill}
            handleRemoveSkillToAssign={controller.handleRemoveSkillToAssign}
            handleUpdateSkillToAssignLevel={controller.handleUpdateSkillToAssignLevel}
            handleUpdateSkillToAssignCategory={controller.handleUpdateSkillToAssignCategory}
            handleUpdateExistingSkillLevel={controller.handleUpdateExistingSkillLevel}
            skillCategories={skillCategoriesData.categories}
            isLoadingSkillCategories={skillCategoriesData.isLoading}
            verificationInitialFiles={verificationDocumentSync.initialUploadFiles}
            isLoadingVerificationInitialFiles={verificationDocumentSync.shouldShowInitialDocumentLoading}
            isResolvingVerificationInitialDocuments={verificationDocumentSync.isResolvingInitialDocuments}
            hasExistingVerificationDocumentHint={Boolean(selectedVerificationDocumentId)}
            hasInitialVerificationDocumentCandidates={verificationDocumentSync.hasInitialDocumentCandidates}
          />
        </AppActionForm>
      </div>
    </div>
  )
}

export const AddSkill: React.FC<BusinessAppContextProps> = context => {
  return (
    <AddSkillProvider {...context}>
      <AddSkillContent {...context} />
    </AddSkillProvider>
  )
}

export default AddSkill
