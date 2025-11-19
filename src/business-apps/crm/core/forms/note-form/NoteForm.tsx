import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { NoteLayout, noteSchema } from '@/common/components/common-relations/form-layouts/note-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppActionForm } from '@/components/app-action-form'
import { useForm } from 'react-hook-form'
import { Spinner, Alert, Skeleton } from '@newwork/nw-design-system'
import { useFileClient } from '@/common/network/files/useFileClient'
import { useCustomerNote } from '@/common/data/customer/hooks/useCustomerNote'

const initialFormData: Partial<z.infer<typeof noteSchema>> = {
  title: '',
  text: '',
  reminderDate: undefined,
  documents: [],
  _pendingFiles: []
}

export interface NoteFormProps extends BusinessAppContextProps {
  onSuccess?: (note: Partial<z.infer<typeof noteSchema>>) => void
  onCancel?: () => void
}

const NoteForm: React.FC<NoteFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<Partial<z.infer<typeof noteSchema>>>(initialFormData)

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
  const { note, loading: noteLoading, error: noteError } = useCustomerNote(accessToken, noteId)

  // Get entity IDs from platform params
  const { accountId, leadId, contactId, opportunityId } = platformParams
  const hasEntityFromContext = accountId || leadId || contactId || opportunityId

  // For CRM notes from context (account/contact/opportunity/lead), we hide entity selection
  const shouldShowEntitySelection = !hasEntityFromContext

  // File upload client
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Upload files to file service and return file IDs with metadata
  const uploadFiles = useCallback(
    async (files: File[], entityId: string): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      const uploadPromises = files.map(async file => {
        const folderPath = `/customerRelations/notes/${entityId}/documents`

        const result = await fileClient.uploadFile(
          file,
          { accessScope: 'tenant' },
          {
            appName: 'customerRelations',
            folderPath: folderPath,
            mimeType: file.type
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
    defaultValues: formData,
    mode: 'onChange'
  })

  // Load existing note if in update mode
  useEffect(() => {
    if (!isUpdateMode || !note || noteLoading) {
      return
    }

    // Helper to extract entity ID from object or string
    const getEntityId = (entity: any): string | undefined => {
      if (!entity) return undefined
      if (typeof entity === 'string') return entity
      return entity.id
    }

    // Set form data - only store entity IDs (strings), not objects
    const newFormData = {
      id: note.id,
      title: note.title || '',
      text: note.text || '',
      reminderDate: note.reminderDate || undefined,
      documents: (note.documents || []).map((doc: any) => ({
        id: doc.id,
        name: doc.name || '',
        version: doc.version,
        fileInfo: doc.fileInfo
      })),
      _pendingFiles: [],
      // Only store entity IDs (strings), not objects
      account: getEntityId(note.account) || undefined,
      contact: getEntityId(note.contact) || undefined,
      opportunity: getEntityId(note.opportunity) || undefined,
      lead: getEntityId(note.lead) || undefined,
      authorEmployee: note.authorEmployee,
      version: note.version
    } as any

    setFormData(newFormData)

    // CRITICAL: Also update the React Hook Form values
    form.reset(newFormData)
  }, [isUpdateMode, note, noteLoading, form])

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
  const handleSubmit = useCallback(
    async (data: z.infer<typeof noteSchema>) => {
      // Helper to extract entity ID from object or string
      const getEntityId = (entity: any): string | undefined => {
        if (!entity) return undefined
        if (typeof entity === 'string') return entity
        return entity.id
      }

      // Extract entity IDs from form values (priority) or platformParams (fallback)
      const entityRefs: Record<string, string> = {}
      const accountId = getEntityId(data.account) || platformParams.accountId
      const contactId = getEntityId(data.contact) || platformParams.contactId
      const opportunityId = getEntityId(data.opportunity) || platformParams.opportunityId
      const leadId = getEntityId(data.lead) || platformParams.leadId

      if (accountId) entityRefs.account = accountId
      if (contactId) entityRefs.contact = contactId
      if (opportunityId) entityRefs.opportunity = opportunityId
      if (leadId) entityRefs.lead = leadId

      // Build CRM Note payload
      const payload: any = {
        employeeId: (userInfo as any)?.employeeDetails?.employeeId || (userInfo as any)?.employeeId,
        managerId: additionalData?.managerId,
        structureId: additionalData?.structureId,
        locationId: additionalData?.locationId,
        organizationalUnitId: additionalData?.organizationalUnitId,
        changeMode: isUpdateMode ? 'UPDATE' : 'INSERT',
        crmNote: {
          noteTitle: data.title,
          noteText: data.text,
          reminderDate: data.reminderDate,
          lastEditDate: new Date().toISOString(),
          authorEmployee: (userInfo as any)?.employeeDetails?.employeeId || (userInfo as any)?.employeeId,
          // documents already processed in handlePreSubmit
          ...entityRefs
        }
      }

      // Add ID and version for update mode
      if (isUpdateMode) {
        payload.crmNote.id = formData.id
        payload.crmNote.version = formData.version
        payload.noteId = formData.id
      }

      return payload
    },
    [userInfo, additionalData, isUpdateMode, formData, platformParams]
  )

  // PreSubmit handler - upload files before submission
  const handlePreSubmit = useCallback(
    async (data: any) => {
      // Upload pending files if any
      let uploadedDocuments: Array<{ name: string; fileInfo: any }> = []
      if (data._pendingFiles && data._pendingFiles.length > 0) {
        const tempId = formData.id || 'temp-' + Date.now()
        uploadedDocuments = await uploadFiles(data._pendingFiles, tempId)
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
    [formData.id, uploadFiles]
  )

  // Success handler
  const handleSuccess = useCallback(() => {
    if (onSuccess) {
      onSuccess(formData)
    }
  }, [formData, onSuccess])

  // Show skeleton while loading
  if (noteLoading && isUpdateMode) {
    return (
      <AppActionForm processType="update" form={form} data-testid="customer-note-process-dialog">
        <div className="gba:w-full gba:space-y-4">
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-32 gba:w-full" />
          <Skeleton className="gba:h-10 gba:w-full" />
        </div>
      </AppActionForm>
    )
  }

  return (
    <AppActionForm
      processType={isUpdateMode ? 'update' : 'create'}
      onSubmit={handleSubmit}
      handlePreSubmit={handlePreSubmit}
      onSuccess={handleSuccess}
      onCancel={onCancel}
      formData={formData}
      form={form}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
      data-testid="customer-note-process-dialog"
    >
      {noteLoading && (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-8" data-testid="note-loading-spinner">
          <Spinner size="lg" />
        </div>
      )}

      {noteError && (
        <Alert variant="destructive" className="gba:mb-4" data-testid="note-load-error-alert">
          {noteError}
        </Alert>
      )}

      {!noteLoading && (
        <NoteLayout
          // No entity search for CRM - context provides the entity
          entities={[]}
          entitiesLoading={false}
          entitiesHasMore={false}
          onEntityLoadMore={() => {}}
          onEntitySearch={() => {}}
          showEntitySelection={shouldShowEntitySelection}
          initialEntityFromContext={{ accountId, contactId, opportunityId, leadId }}
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
          // File upload handlers - use form.setValue instead of setFormData to avoid setState during render
          onFilesChange={useCallback(
            (files: File[]) => {
              form.setValue('_pendingFiles', files, { shouldDirty: true })
            },
            [form]
          )}
          existingDocuments={form.watch('documents') || []}
          onDocumentRemove={useCallback(
            (documentId: string) => {
              const currentDocs = form.getValues('documents') || []
              form.setValue(
                'documents',
                currentDocs.filter((doc: any) => doc.id !== documentId),
                { shouldDirty: true }
              )
            },
            [form]
          )}
          loading={noteLoading && isUpdateMode}
          data-testid="customer-note-layout"
        />
      )}
    </AppActionForm>
  )
}

export default NoteForm
export { NoteForm }
