import React, { useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { NoteLayout, noteSchema } from '@/common/components/common-relations/form-layouts/note-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { useForm } from 'react-hook-form'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildFilePath } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/customer/constants/customerConstants'
import { useCustomerNote } from '@/common/data/customer/hooks/useCustomerNote'
import { type CustomerNote, buildCustomerNotePayload } from '@/common/data/customer/types/customerNoteTypes'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { ErrorAlert } from '@/components/error-alert/ErrorAlert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface NoteFormProps extends BusinessAppContextProps {
  onSuccess?: (note: Partial<z.infer<typeof noteSchema>>) => void
  onCancel?: () => void
}

const NoteForm: React.FC<NoteFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
  // Resolve IDs from additionalData (platform may pass ids inside psi_taskPayload.psi_initialParameters)
  const platformParams = React.useMemo(() => {
    const nested =
      (additionalData as any)?.psi_taskPayload?.psi_initialParameters ||
      (additionalData as any)?.psi_initialParameters ||
      {}
    return {
      noteId: (additionalData as any)?.noteId || nested?.noteId,
      accountId: (additionalData as any)?.accountId || nested?.accountId,
      contactId: (additionalData as any)?.contactId || nested?.contactId,
      opportunityId: (additionalData as any)?.opportunityId || nested?.opportunityId,
      leadId: (additionalData as any)?.leadId || nested?.leadId
    }
  }, [additionalData])

  // Check if we're in update mode
  const noteId = platformParams.noteId
  const isUpdateMode = !!noteId

  // Customer note hook - declarative single-by-PK
  const { note, loading: noteLoading, error } = useCustomerNote(accessToken || '', noteId)

  // Get entity IDs from platform params
  const accountId = platformParams.accountId
  const contactId = platformParams.contactId
  const opportunityId = platformParams.opportunityId
  const leadId = platformParams.leadId

  // Collect all errors for centralized early return
  const errors: Array<{ error?: string | unknown; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load note data' })
  }

  // Early return if any errors exist
  if (errors.length > 0) {
    return (
      <>
        {errors.map((err, index) => (
          <ErrorAlert
            key={index}
            error={err.error}
            type={err.type}
            context={err.context}
            dataTestId={formatDataTestId('customer-note-form', `error-alert-${index}`)}
          />
        ))}
      </>
    )
  }

  // For CRM notes from context (account/contact/opportunity/lead), we hide entity selection
  const hasEntityFromContext = accountId || leadId || contactId || opportunityId
  const shouldShowEntitySelection = !hasEntityFromContext

  // File upload client
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Upload files to file service and return file IDs with metadata
  const uploadFiles = useCallback(
    async (
      files: File[],
      referenceEntityId: string,
      referenceEntityType: 'account' | 'contact' | 'lead' | 'opportunity' | 'unknown'
    ): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      // Determine FILE_ENTITY based on reference entity type
      const fileEntity =
        referenceEntityType === 'account'
          ? FILE_ENTITY.ACCOUNT
          : referenceEntityType === 'contact'
            ? FILE_ENTITY.CONTACT
            : referenceEntityType === 'lead'
              ? FILE_ENTITY.LEAD
              : referenceEntityType === 'opportunity'
                ? FILE_ENTITY.OPPORTUNITY
                : FILE_ENTITY.UNKNOWN

      const folderPath = buildFilePath(fileEntity, referenceEntityId, FILE_CONTEXT.NOTE)

      const uploadPromises = files.map(async file => {
        // Ensure we have a valid MIME type - fallback to octet-stream if empty
        const mimeType = file.type

        const result = await fileClient.uploadFile(
          file,
          { accessScope: 'tenant' },
          {
            appName: APP_NAME,
            folderPath: folderPath,
            mimeType: mimeType
          }
        )

        return {
          name: file.name,
          fileInfo: result.fileInfo // Pass entire fileInfo JSON
        }
      })

      return await Promise.all(uploadPromises)
    },
    [fileClient]
  )

  // RHF + Zod resolver provided to AppActionForm
  const form = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: mapToFormValues(note || {}, noteSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Combine context + note IDs (note has priority)
  const relatedEntityIds = React.useMemo(
    () => ({
      accountId: note?.accountId || accountId,
      contactId: note?.contactId || contactId,
      opportunityId: note?.opportunityId || opportunityId,
      leadId: note?.leadId || leadId
    }),
    [accountId, contactId, opportunityId, leadId, note]
  )

  // Load existing note if in update mode - using mapToFormValues (AccountForm pattern)
  const noteRef = useRef(note)
  useEffect(() => {
    if (noteRef.current?.id !== note?.id) {
      form.reset(mapToFormValues(note || {}, noteSchema) as any)
      noteRef.current = note
    }
  }, [note?.id, note, form])

  // Compose validation
  const validateForm = useCallback((data: any): string[] | null => {
    const errors: string[] = []

    if (!data.title || data.title.trim() === '') {
      errors.push('Title is required')
    }

    if (!data.text || data.text.trim() === '') {
      errors.push('Note text is required')
    }

    return errors.length > 0 ? errors : null
  }, [])

  // Form submission handler - business logic only
  const handleSubmit = useCallback(async (data: z.infer<typeof noteSchema>) => {
    try {
      delete data._pendingFiles
      delete data.relatedEntityId

      // Build payload (buildPayload will include creator fields from noteData)
      const { crmNote } = buildCustomerNotePayload(data as Partial<CustomerNote>)

      return {
        crmNote
      }
    } catch (error) {
      console.error('Error submitting note:', error)
      throw error
    }
  }, [])

  // PreSubmit handler - upload files before submission
  const handlePreSubmit = useCallback(
    async (data: any) => {
      // Set creator fields if not present
      if (!data.creatorEmployeeId && userInfo?.employeeDetails?.employeeId) {
        data.creatorEmployeeId = userInfo.employeeDetails.employeeId
      }
      if (!data.creatorUserId && userInfo?.id) {
        data.creatorUserId = userInfo.id
      }

      // Upload pending files if any
      let uploadedDocuments: Array<{ name: string; fileInfo: any }> = []
      if (data._pendingFiles && data._pendingFiles.length > 0) {
        try {
          // Determine reference entity from form data
          const referenceEntityId =
            data.accountId || data.contactId || data.leadId || data.opportunityId || 'temp-' + Date.now()
          const referenceEntityType = data.accountId
            ? 'account'
            : data.contactId
              ? 'contact'
              : data.leadId
                ? 'lead'
                : data.opportunityId
                  ? 'opportunity'
                  : 'unknown'

          uploadedDocuments = await uploadFiles(data._pendingFiles, referenceEntityId, referenceEntityType)
        } catch (error) {
          console.error('Failed to upload files:', error)
          throw error
        }
      }

      // Combine existing documents (as objects with ID) and newly uploaded documents
      const existingDocumentsAsObjects = (data.documents || [])
        .filter((doc: any) => doc.id)
        .map((doc: any) => ({
          id: doc.id,
          version: doc.version
        }))

      const allDocuments = [...existingDocumentsAsObjects, ...uploadedDocuments]

      // Return enhanced data with documents
      return {
        ...data,
        documents: allDocuments
      }
    },
    [uploadFiles, userInfo]
  )

  // Success handler
  const handleSuccess = useCallback(() => {
    if (onSuccess) {
      onSuccess(form.getValues())
    }
  }, [onSuccess, form])

  const handleFilesChange = useCallback(
    (files: File[]) => {
      form.setValue('_pendingFiles', files, { shouldDirty: true })
    },
    [form]
  )

  const handleDocumentRemove = useCallback(
    (documentId: string) => {
      const currentDocs = form.getValues('documents') || []
      form.setValue(
        'documents',
        currentDocs.filter((doc: any) => doc.id !== documentId),
        { shouldDirty: true }
      )
    },
    [form]
  )

  const processType = isUpdateMode ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        handlePreSubmit={handlePreSubmit}
        onSuccess={handleSuccess}
        onCancel={onCancel}
        formData={form.getValues()}
        form={form}
        schema={noteSchema}
        validateForm={validateForm}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid={formatDataTestId('customer-note-form', 'Form')}
        isSubmitDisabled={noteLoading}
      >
        <NoteLayout
          // No entity search for CRM - context provides the entity
          entities={[]}
          entitiesLoading={false}
          entitiesHasMore={false}
          onEntityLoadMore={() => {}}
          onEntitySearch={() => {}}
          showEntitySelection={shouldShowEntitySelection}
          initialEntityFromContext={{
            accountId: relatedEntityIds.accountId,
            contactId: relatedEntityIds.contactId,
            opportunityId: relatedEntityIds.opportunityId,
            leadId: relatedEntityIds.leadId
          }}
          titleLabel={getTranslationFromI18nKeyAndLabel('crm:notes.title', 'Note Title')}
          textLabel={getTranslationFromI18nKeyAndLabel('crm:notes.text', 'Note Content')}
          reminderLabel={getTranslationFromI18nKeyAndLabel('crm:notes.reminderDate', 'Reminder Date (Optional)')}
          entityLabel={getTranslationFromI18nKeyAndLabel('crm:notes.relatedEntity', 'Related Entity')}
          titlePlaceholder={getTranslationFromI18nKeyAndLabel('crm:notes.titlePlaceholder', 'Enter note title...')}
          textPlaceholder={getTranslationFromI18nKeyAndLabel('crm:notes.textPlaceholder', 'Write your note here...')}
          reminderPlaceholder={getTranslationFromI18nKeyAndLabel(
            'crm:notes.reminderDatePlaceholder',
            'Select reminder date...'
          )}
          uploadFileLabel={getTranslationFromI18nKeyAndLabel('crm:notes.uploadFile', 'Attach Documents')}
          onFilesChange={handleFilesChange}
          existingDocuments={form.watch('documents') || []}
          onDocumentRemove={handleDocumentRemove}
          loading={noteLoading && isUpdateMode}
          data-testid="customer-note-layout"
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default NoteForm
export { NoteForm }
