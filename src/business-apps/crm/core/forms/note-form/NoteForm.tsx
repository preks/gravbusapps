import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import NoteSegment, {
  NoteSegmentSchema,
  createNoteSegmentResolver
} from '@/common/components/common-relations/form-segments/note-segment/NoteSegment'
import { AppActionForm } from '@/components/app-action-form'
import { useForm } from 'react-hook-form'
import { Spinner, Alert, LocalizationProvider, type SupportedLocale } from '@newwork/nw-design-system'
import { useFileClient } from '@/common/network/files/useFileClient'
import { useCustomerNote } from '@/common/data/customer/hooks/useCustomerNote'

const initialFormData: NoteSegmentSchema = {
  title: '',
  text: '',
  reminderDate: undefined,
  documents: [],
  _pendingFiles: []
}

export interface NoteFormProps extends BusinessAppContextProps {
  onSuccess?: (note: NoteSegmentSchema) => void
  onCancel?: () => void
}

const NoteForm: React.FC<NoteFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<NoteSegmentSchema>(initialFormData)

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
  const {
    note,
    loading: noteLoading,
    error: noteError
  } = useCustomerNote({ accessToken, userInfo, additionalData }, noteId)

  // Get entity IDs from platform params
  const { accountId, leadId, contactId, opportunityId } = platformParams
  const hasEntityFromContext = accountId || leadId || contactId || opportunityId

  // For CRM notes from context (account/contact/opportunity/lead), we hide entity selection
  const shouldShowEntitySelection = !hasEntityFromContext

  // File upload client
  const fileClient = useFileClient({ accessToken } as any)

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
  const form = useForm<any>({
    resolver: createNoteSegmentResolver(),
    defaultValues: formData,
    mode: 'onChange'
  })

  // Load existing note if in update mode
  useEffect(() => {
    if (!isUpdateMode || !note || noteLoading) {
      return
    }

    // Set form data
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
      account: note.account,
      contact: note.contact,
      opportunity: note.opportunity,
      lead: note.lead,
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
    async (data: NoteSegmentSchema) => {
      // Upload pending files if any
      let uploadedDocuments: Array<{ name: string; fileInfo: any }> = []
      if (formData._pendingFiles && formData._pendingFiles.length > 0) {
        const tempId = formData.id || 'temp-' + Date.now()
        uploadedDocuments = await uploadFiles(formData._pendingFiles, tempId)
      }

      // Combine existing documents (as objects with ID) and newly uploaded documents
      const existingDocumentsAsObjects = (formData.documents || [])
        .filter(doc => doc.id)
        .map(doc => ({
          id: doc.id,
          version: doc.version
        }))

      const allDocuments = [...existingDocumentsAsObjects, ...uploadedDocuments]

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
          documents: allDocuments,
          ...(platformParams.leadId && { lead: platformParams.leadId }),
          ...(platformParams.opportunityId && { opportunity: platformParams.opportunityId }),
          ...(platformParams.contactId && { contact: platformParams.contactId }),
          ...(platformParams.accountId && { account: platformParams.accountId })
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
    [userInfo, additionalData, isUpdateMode, formData, uploadFiles, platformParams]
  )

  // Success handler
  const handleSuccess = useCallback(() => {
    if (onSuccess) {
      onSuccess(formData)
    }
  }, [formData, onSuccess])

  // Get locale for LocalizationProvider (needed for FileUpload component)
  const locale = getCurrentActiveUserLocale() as SupportedLocale

  return (
    <LocalizationProvider locale={locale}>
      <AppActionForm
        processType={isUpdateMode ? 'update' : 'create'}
        onSubmit={handleSubmit}
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
          <NoteSegment
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
            // File upload handlers
            onFilesChange={(files: File[]) => {
              setFormData(prev => ({
                ...prev,
                _pendingFiles: [...(prev._pendingFiles || []), ...files]
              }))
            }}
            existingDocuments={formData.documents || []}
            onDocumentRemove={(documentId: string) => {
              setFormData(prev => ({
                ...prev,
                documents: prev.documents?.filter(doc => doc.id !== documentId) || []
              }))
            }}
            data-testid="note-segment"
          />
        )}
      </AppActionForm>
    </LocalizationProvider>
  )
}

export default NoteForm
export { NoteForm }
