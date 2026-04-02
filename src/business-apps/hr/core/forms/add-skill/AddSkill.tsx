import React, { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Spinner, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFileClient } from '@/common/network/files/useFileClient'
import { env } from '@/common/env/EnvUtils'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import translations from '@/business-apps/hr/core/apps/employee-record/_i18n'
import FormHeader from '../components/FormHeader'
import { AddSkillProvider, useAddSkill } from './AddSkillContext'
import { buildEmployeeSkillsPayload } from './utils/addSkillUtils'
import { AddSkillFormSections } from './components/AddSkillFormSections'
import { useAddSkillFormController } from './hooks/useAddSkillFormController'
import { ACCEPTED_VERIFICATION_FILE_TYPES, AddSkillFormValues, DOCUMENT_GROUP_DEVELOPMENT } from './addSkill.types'

const clampLevel = (level: string | number | null | undefined) => {
  if (level === null || level === undefined) return 1
  const parsed = typeof level === 'string' ? Number.parseInt(level, 10) : level
  return Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(10, parsed))
}

const getFormTitle = (
  t: (key: string, args?: Record<string, unknown>) => string,
  flowFormParams: { mode?: string } | null | undefined,
  changeLevelParams: unknown
) => {
  if (flowFormParams?.mode === 'deactivate') return t('add-skill-form-deactivate-title')
  if (flowFormParams?.mode === 'activate') return t('add-skill-form-activate-title')
  if (flowFormParams?.mode === 'attachVerification') return t('add-skill-form-attach-verification-title')
  if (changeLevelParams) return t('skills-action-update-level')
  return t('add-skill-form-title')
}

const AddSkillContent: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData }) => {
  const { t } = useTranslation(translations)
  const {
    data,
    searchSkills,
    createSkillAndFetchByNames,
    employeeId: ctxEmployeeId,
    changeLevelParams,
    flowFormParams,
    error: contextError,
    isLoading: contextLoading
  } = useAddSkill()

  const form = useForm<AddSkillFormValues>({
    defaultValues: { targetEmployeeId: undefined, documentTypeId: null, validTo: '' },
    mode: 'onChange',
    shouldUnregister: true
  })

  const employee = data?.employee
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

  const fileClient = useFileClient({ accessToken: accessToken ?? '' })
  const controller = useAddSkillFormController({
    employee,
    flowFormParams,
    changeLevelParams,
    searchSkills,
    createSkillAndFetchByNames,
    t,
    form
  })

  const formTitle = getFormTitle(t, flowFormParams, changeLevelParams)

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

  if (!contextLoading && contextError) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:p-4"
        data-testid="flw_addSkills_addSkillsContainer"
      >
        <div className="gba:text-destructive gba:text-sm" data-testid="add-skill-context-error">
          {contextError}
        </div>
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
        className="gba:flex gba:flex-col gba:[&>div[data-testid='add-skill-form']]:!pt-0"
        data-testid="add-skill-form-content"
      >
        <AppActionForm
          processType="update"
          form={form as any}
          formData={controller.normalizedDefaults}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          submitButtonTestId="flw_addSkills_submitButton"
          cancelButtonTestId="flw_addSkills_cancelButton"
          isSubmitDisabled={controller.isSubmitDisabled}
          submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
          cancelButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.initiate_cancel_button',
            'Cancel'
          )}
          handlePreSubmit={
            flowFormParams?.mode === 'attachVerification' &&
            controller.verificationFileList.length > 0 &&
            controller.verificationFileList[0]?.originFileObj
              ? async (values: AddSkillFormValues) => {
                  let uploadedEmployeeDocumentId: string | undefined
                  try {
                    const file = controller.verificationFileList[0].originFileObj as File
                    const employeeId =
                      ctxEmployeeId ||
                      additionalData?.employeeId ||
                      additionalData?.psi_taskPayload?.employeeId ||
                      data?.employee?.id
                    if (!file || !employeeId || !accessToken) {
                      return { ...values, uploadedVerificationDocumentId: undefined }
                    }

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

                    const processesBase = env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') || ''
                    const createDocUrl = `${processesBase}/employee/employeeDocuments`
                    const body = {
                      employeeDocument: {
                        employeeId,
                        documentGroup: DOCUMENT_GROUP_DEVELOPMENT,
                        type: values.documentTypeId || null,
                        description: '',
                        name: uploadResp?.fileInfo?.fileMetadata?.originalFileName,
                        file: uploadResp?.fileInfo?.fileId,
                        mimeType: uploadResp?.fileInfo?.fileMetadata?.mimeType,
                        fileSize: 0,
                        validFrom: new Date().toISOString(),
                        validTo: values.validTo ? new Date(values.validTo).toISOString() : null
                      }
                    }

                    const response = await fetch(createDocUrl, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: accessToken ? `Bearer ${accessToken}` : ''
                      },
                      body: JSON.stringify(body)
                    })
                    const json = await response.json()
                    uploadedEmployeeDocumentId = json?.employeeDocument?.id
                  } catch {
                    uploadedEmployeeDocumentId = undefined
                  }
                  return { ...values, uploadedVerificationDocumentId: uploadedEmployeeDocumentId }
                }
              : undefined
          }
          onSubmit={async (values: AddSkillFormValues) => {
            const employeeId = ctxEmployeeId || values.targetEmployeeId
            let selectedIds: string[]
            const selectedLevels = new Map<string, number>()
            let skillValidTo: Record<string, string | null> | undefined
            let skillVerificationDocumentId: Record<string, string | null> | undefined

            if (flowFormParams?.mode === 'attachVerification') {
              selectedIds = controller.existingSkillsList.map(s => s.skill?.id).filter(Boolean) as string[]
              controller.existingSkillsList.forEach(s => {
                if (s.skill?.id) selectedLevels.set(s.skill.id, clampLevel(s.level))
              })
              skillVerificationDocumentId = { [flowFormParams.skillId]: values.uploadedVerificationDocumentId ?? null }
            } else if (flowFormParams?.mode === 'deactivate' || flowFormParams?.mode === 'activate') {
              selectedIds = controller.existingSkillsList.map(s => s.skill?.id).filter(Boolean) as string[]
              controller.existingSkillsList.forEach(s => {
                if (s.skill?.id) selectedLevels.set(s.skill.id, clampLevel(s.level))
              })
              skillValidTo = {
                [flowFormParams.skillId]:
                  flowFormParams.mode === 'deactivate' ? new Date(Date.now() - 1000).toISOString() : null
              }
            } else if (changeLevelParams?.skillId) {
              selectedIds = controller.existingSkillsList.map(s => s.skill?.id).filter(Boolean) as string[]
              controller.existingSkillsList.forEach(s => {
                if (s.skill?.id) selectedLevels.set(s.skill.id, clampLevel(s.level))
              })
              selectedLevels.set(
                changeLevelParams.skillId,
                controller.selectedSkills.find(s => s.id === changeLevelParams.skillId)?.level ?? 1
              )
            } else {
              selectedIds = controller.selectedSkills.map(s => s.id)
              controller.selectedSkills.forEach(s => selectedLevels.set(s.id, s.level || 1))
            }

            return buildEmployeeSkillsPayload({
              employeeId,
              selectedSkillIds: selectedIds,
              selectedSkillLevels: selectedLevels,
              existingSkills: controller.existingSkillsList as any,
              skillValidTo,
              skillVerificationDocumentId,
              event: 'pse_submit'
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
            pendingSkills={controller.pendingSkills}
            searchTerm={controller.searchTerm}
            setSearchTerm={controller.setSearchTerm}
            inputKey={controller.inputKey}
            isDropdownOpen={controller.isDropdownOpen}
            isSearching={controller.isSearching}
            filteredResults={controller.filteredResults}
            addError={controller.addError}
            verificationFileList={controller.verificationFileList}
            developmentDocumentTypes={developmentDocumentTypes}
            getCatalogValue={getCatalogValue}
            acceptedVerificationFileTypes={ACCEPTED_VERIFICATION_FILE_TYPES}
            dropdownRef={controller.dropdownRef}
            searchContainerRef={controller.searchContainerRef}
            handleDesignSystemFilesChange={controller.handleDesignSystemFilesChange}
            handleSearchBlur={controller.handleSearchBlur}
            handleSearchFocus={controller.handleSearchFocus}
            handleSelectSkill={controller.handleSelectSkill}
            handleAddNewSkill={controller.handleAddNewSkill}
            handleRemoveSkill={controller.handleRemoveSkill}
            handleRemovePendingSkill={controller.handleRemovePendingSkill}
            handleUpdatePendingSkillLevel={controller.handleUpdatePendingSkillLevel}
            handleUpdateExistingSkillLevel={controller.handleUpdateExistingSkillLevel}
            handleAddPendingSkillToEmployee={controller.handleAddPendingSkillToEmployee}
            setDocumentTypeIdLocal={controller.setDocumentTypeIdLocal}
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
