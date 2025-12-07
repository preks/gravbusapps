import React, { useMemo, useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { Textarea, Label, FormItem, FormField, Button, Form } from '@newwork/nw-design-system'
import { useEmployeeNoteApi } from '@/business-apps/hr/core/apps/employee-record/hooks/useEmployeeNoteApi'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_DETAILS } from './queries/getEmployeeDetails'

interface CreateEmployeeNoteFormValues {
  notes: string
  employeeId: string
}

const CreateEmployeeNoteContent: React.FC<BusinessAppContextProps> = (context: BusinessAppContextProps) => {
  const { additionalData, accessToken } = context
  const graphqlClient = useGraphQLClient(accessToken)
  const [employee, setEmployee] = useState<{
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    jobTitle?: string
  } | null>(null)

  const employeeId =
    additionalData?.employeeId ||
    additionalData?.psi_taskPayload?.employeeId ||
    additionalData?.psi_taskPayload?.initialParameters?.employeeId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
    ''
  const noteId =
    additionalData?.noteId ||
    additionalData?.psi_taskPayload?.noteId ||
    additionalData?.psi_taskPayload?.initialParameters?.noteId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.noteId ||
    null

  const existingNotes =
    additionalData?.notes ||
    additionalData?.psi_taskPayload?.notes ||
    additionalData?.psi_taskPayload?.initialParameters?.notes ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.notes ||
    ''

  const noteVersion = useMemo(() => {
    if (additionalData?.version !== undefined) {
      return additionalData.version
    }
    if (additionalData?.psi_taskPayload?.version !== undefined) {
      return additionalData.psi_taskPayload.version
    }
    if (additionalData?.psi_taskPayload?.initialParameters?.version !== undefined) {
      return additionalData.psi_taskPayload.initialParameters.version
    }
    if (additionalData?.psi_taskPayload?.psi_initialParameters?.version !== undefined) {
      return additionalData.psi_taskPayload.psi_initialParameters.version
    }
    return 0
  }, [additionalData])

  const isEditMode = !!noteId

  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const { updateEmployeeNote } = useEmployeeNoteApi(context)

  const form = useForm<CreateEmployeeNoteFormValues>({
    defaultValues: {
      notes: '',
      employeeId: ''
    },
    mode: 'onChange'
  })

  React.useEffect(() => {
    if (isEditMode && existingNotes) {
      form.reset({
        notes: existingNotes,
        employeeId: employeeId
      })
    } else if (employeeId) {
      form.reset({
        notes: '',
        employeeId: employeeId
      })
    }
  }, [isEditMode, existingNotes, employeeId, form])

  useEffect(() => {
    if (!accessToken || !employeeId) return
    graphqlClient
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
      })
      .catch(() => {
        // Silently fail if employee details can't be fetched
      })
  }, [accessToken, employeeId, graphqlClient])

  const defaultValues: CreateEmployeeNoteFormValues = useMemo(
    () => ({
      notes: existingNotes || '',
      employeeId: employeeId || ''
    }),
    [employeeId, existingNotes]
  )

  const title = useMemo(
    () =>
      isEditMode
        ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.edit_note_form', 'Edit Employee Note')
        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.create_note_form', 'Create Employee Note'),
    [isEditMode]
  )

  const isSubmitDisabled = useMemo(() => {
    const notes = form.watch('notes')
    return !notes?.trim() || isSubmitting
  }, [form.watch('notes'), isSubmitting])

  const handleCreateSubmit = async (values: CreateEmployeeNoteFormValues) => {
    const employeeIdToUse = values.employeeId || employeeId
    if (!employeeIdToUse) {
      throw new Error('Employee ID is required')
    }

    if (!values.notes?.trim()) {
      throw new Error('Note content is required')
    }

    return {
      employeeNote: {
        notes: values.notes.trim(),
        employee: employeeIdToUse
      }
    }
  }

  const handleEditSubmit = async (values: CreateEmployeeNoteFormValues) => {
    const employeeIdToUse = values.employeeId || employeeId
    if (!employeeIdToUse) {
      throw new Error('Employee ID is required')
    }

    if (!values.notes?.trim()) {
      throw new Error('Note content is required')
    }

    if (!noteId) {
      throw new Error('Note ID is required for editing')
    }

    try {
      const response = await updateEmployeeNote({
        employeeNote: {
          id: noteId,
          version: noteVersion,
          notes: values.notes.trim(),
          employee: employeeIdToUse
        }
      })

      const completionPayload = {
        resolution: 'success',
        response: {
          employeeNote: response.employeeNote || {
            id: noteId,
            notes: values.notes.trim()
          }
        }
      }

      window.dispatchEvent(
        new CustomEvent('com.newwork.process.processCompletion', {
          detail: completionPayload
        })
      )

      window.dispatchEvent(
        new CustomEvent('com.newwork.process.taskCompletion', {
          detail: completionPayload
        })
      )

      const abortPayloadWithUpdateFlag = {
        noteId: noteId,
        _alreadyUpdated: true,
        _updateCompleted: true,
        _skipCreate: true,
        ...completionPayload
      }

      dispatchProcessContinueEvent('pse_abort', abortPayloadWithUpdateFlag)
      return null
    } catch (error) {
      console.error('Error updating employee note:', error)
      throw error
    }
  }

  const formFields = (
    <div className="gba:flex-1 gba:space-y-4">
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="notes" data-testid="notes-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.notes_content', 'Note Content')}
            </Label>
            <Textarea
              id="notes"
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_notes.notes_placeholder',
                'Enter your note...'
              )}
              value={field.value || ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              data-testid="notes-textarea"
              className="gba:w-full"
              rows={6}
            />
          </FormItem>
        )}
      />
    </div>
  )

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
      data-testid="create-employee-note-container"
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
                jobTitle: employee.jobTitle
              }
            : undefined
        }
      />

      <div
        className="gba:flex gba:flex-col gba:[&>div[data-testid='create-employee-note-form']]:!py-0"
        data-testid="create-employee-note-form-content"
      >
        {isEditMode ? (
          <AppActionForm
            processType="update"
            form={form as any}
            formData={defaultValues}
            submitEventType="pse_submit"
            cancelEventType="pse_abort"
            submitButtonTestId="edit-employee-note-submit-button"
            cancelButtonTestId="edit-employee-note-cancel-button"
            isSubmitDisabled={isSubmitDisabled}
            submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.update_note', 'Update Note')}
            cancelButtonText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.initiate_cancel_button',
              'Cancel'
            )}
            onSubmit={handleEditSubmit}
            disableFormSubmission={true}
            customActions={
              <div className="gba:flex gba:justify-end gba:gap-2 gba:items-center gba:mt-auto gba:pt-4">
                <Button
                  variant="outline"
                  data-testid="edit-employee-note-cancel-button"
                  type="button"
                  onClick={() => {
                    dispatchProcessContinueEvent('pse_abort', {})
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.initiate_cancel_button',
                    'Cancel'
                  )}
                </Button>
                <Button
                  data-testid="edit-employee-note-submit-button"
                  type="button"
                  variant="default"
                  disabled={isSubmitDisabled}
                  onClick={async () => {
                    if (isSubmitting) return
                    const isValid = await form.trigger()
                    if (!isValid) {
                      return
                    }
                    setIsSubmitting(true)
                    try {
                      const values = form.getValues()
                      await handleEditSubmit(values)
                    } catch (error) {
                      setIsSubmitting(false)
                      throw error
                    }
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.update_note', 'Update Note')}
                </Button>
              </div>
            }
            onProcessCompletion={() => {}}
            data-testid="edit-employee-note-form"
          >
            <Form {...(form as any)}>{formFields}</Form>
          </AppActionForm>
        ) : (
          <AppActionForm
            processType="create"
            form={form as any}
            formData={defaultValues}
            submitEventType="pse_submit"
            cancelEventType="pse_abort"
            submitButtonTestId="create-employee-note-submit-button"
            cancelButtonTestId="create-employee-note-cancel-button"
            isSubmitDisabled={isSubmitDisabled}
            submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.add_note', 'Add Note')}
            cancelButtonText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.initiate_cancel_button',
              'Cancel'
            )}
            onSubmit={handleCreateSubmit}
            disableFormSubmission={true}
            customActions={
              <div className="gba:flex gba:justify-end gba:gap-2 gba:items-center gba:mt-auto gba:pt-4">
                <Button
                  variant="outline"
                  data-testid="create-employee-note-cancel-button"
                  type="button"
                  onClick={() => {
                    dispatchProcessContinueEvent('pse_abort', {})
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.initiate_cancel_button',
                    'Cancel'
                  )}
                </Button>
                <Button
                  data-testid="create-employee-note-submit-button"
                  type="button"
                  variant="default"
                  disabled={isSubmitDisabled}
                  onClick={async () => {
                    if (isSubmitting) return
                    const isValid = await form.trigger()
                    if (!isValid) {
                      return
                    }
                    setIsSubmitting(true)
                    try {
                      const values = form.getValues()
                      const result = await handleCreateSubmit(values)
                      dispatchProcessContinueEvent('pse_submit', result)
                    } catch (error) {
                      setIsSubmitting(false)
                      throw error
                    }
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.add_note', 'Add Note')}
                </Button>
              </div>
            }
            data-testid="create-employee-note-form"
          >
            <Form {...(form as any)}>{formFields}</Form>
          </AppActionForm>
        )}
      </div>
    </div>
  )
}

export const CreateEmployeeNote: React.FC<BusinessAppContextProps> = context => {
  return <CreateEmployeeNoteContent {...context} />
}

export default CreateEmployeeNote
