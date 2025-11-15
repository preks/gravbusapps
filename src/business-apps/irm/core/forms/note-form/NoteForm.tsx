import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import NoteSegment, {
  NoteSegmentSchema,
  createNoteSegmentResolver
} from '@/common/components/common-relations/form-segments/note-segment/NoteSegment'
import { buildInvestmentNotePayload } from '@/common/data/investment/payloads'
import { useInvestmentEntities } from '@/common/data/investment/hooks/useInvestmentEntities'
import { useGetInvestmentNoteById } from '@/common/data/investment/hooks/useInvestmentNotes'
import { AppActionForm } from '@/components/app-action-form'
import { useForm } from 'react-hook-form'
import { Spinner, Alert } from '@newwork/nw-design-system'
import { useFileClient } from '@/common/network/files/useFileClient'

const initialFormData: NoteSegmentSchema = {
  title: '',
  text: '',
  reminderDate: undefined,
  documents: [],
  _pendingFiles: []
}

export interface NoteFormProps extends BusinessAppContextProps {
  initialData?: Partial<NoteSegmentSchema>
  onSuccess?: (note: NoteSegmentSchema) => void
  onCancel?: () => void
}

const NoteForm: React.FC<NoteFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<NoteSegmentSchema>(initialFormData)
  const [isLoadingNote, setIsLoadingNote] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Resolve IDs from additionalData (platform may pass ids inside psi_taskPayload.psi_initialParameters)
  const platformParams = React.useMemo(() => {
    const nested =
      (additionalData as any)?.psi_taskPayload?.psi_initialParameters ||
      (additionalData as any)?.psi_initialParameters ||
      {}
    return {
      noteId: (additionalData as any)?.noteId || nested?.noteId,
      investmentId: (additionalData as any)?.investmentId || nested?.investmentId,
      accountId: (additionalData as any)?.accountId || nested?.accountId,
      contactId: (additionalData as any)?.contactId || nested?.contactId,
      opportunityId: (additionalData as any)?.opportunityId || nested?.opportunityId,
      leadId: (additionalData as any)?.leadId || nested?.leadId
    }
  }, [additionalData])

  // Check if we're in update mode
  const noteId = platformParams.noteId
  const isUpdateMode = !!noteId

  // Investment note hooks
  const { fetchInvestmentNoteById } = useGetInvestmentNoteById({
    accessToken,
    additionalData
  } as BusinessAppContextProps)

  // Get entity IDs from platform params
  const { accountId, leadId, contactId, opportunityId, investmentId } = platformParams
  const hasEntityFromContext = accountId || leadId || contactId || opportunityId

  // For investment notes, we hide entity selection since investment + account context is sufficient
  const isInvestmentContext = Boolean(investmentId)
  const shouldShowEntitySelection = !isInvestmentContext && !hasEntityFromContext

  // Entity search hook (controlled search/path) - same as activity form
  const {
    entities,
    loading: entitiesLoading,
    searchEntities,
    hasMore: entitiesHasMore,
    loadMore: loadMoreEntities,
    hydrateEntityById
  } = useInvestmentEntities({ accessToken, additionalData })

  // File upload client
  const fileClient = useFileClient({ accessToken } as any)

  // Upload files to file service and return file IDs with metadata
  const uploadFiles = useCallback(
    async (files: File[], entityId: string): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      const uploadPromises = files.map(async file => {
        const folderPath = `/investmentRelations/notes/${entityId}/documents`

        const result = await fileClient.uploadFile(
          file,
          { accessScope: 'tenant' },
          {
            appName: 'investmentRelations',
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

  // Load existing note if in update mode
  useEffect(() => {
    if (!isUpdateMode || !noteId) {
      return
    }

    let isMounted = true
    const loadExistingNote = async () => {
      setIsLoadingNote(true)
      setLoadError(null)

      try {
        const result = await fetchInvestmentNoteById(noteId)
        if (!isMounted || !result?.note) {
          return
        }

        const note = result.note

        // Set form data
        const newFormData = {
          id: note.id,
          title: note.title || '',
          text: note.text || '',
          reminderDate: note.reminderDate || undefined,
          documents:
            (note as any).documents?.map((doc: any) => ({
              id: doc.id,
              name: doc.name || '',
              version: doc.version
            })) || [],
          _pendingFiles: [],
          account: note.account,
          contact: note.contact,
          opportunity: note.opportunity,
          lead: note.lead,
          authorEmployee: note.authorEmployee,
          version: note.version,
          // keep relatedEntityId for validation convenience
          ...(note.account?.id ? { relatedEntityId: note.account.id } : {}),
          ...(note.contact?.id ? { relatedEntityId: note.contact.id } : {}),
          ...(note.opportunity?.id ? { relatedEntityId: note.opportunity.id } : {}),
          ...(note.lead?.id ? { relatedEntityId: note.lead.id } : {})
        } as any

        setFormData(newFormData)

        // CRITICAL: Also update the React Hook Form values
        form.reset(newFormData)

        // Hydrate and pin related entity if present so combobox trigger keeps rich label
        const relId = note.account?.id || note.contact?.id || note.opportunity?.id || note.lead?.id
        if (relId) {
          if (note.account?.id) hydrateEntityById('account', note.account.id)
          else if (note.contact?.id) hydrateEntityById('contact', note.contact.id)
          else if (note.opportunity?.id) hydrateEntityById('opportunity', note.opportunity.id)
          else if (note.lead?.id) hydrateEntityById('lead', note.lead.id)
        }

        if (isMounted) {
          setIsLoadingNote(false)
        }
      } catch (error) {
        console.error('Failed to load investment note', error)
        if (isMounted) {
          setLoadError(
            getTranslationFromI18nKeyAndLabel('crm:notes.loadError', 'Failed to load note. Please try again.')
          )
          setIsLoadingNote(false)
        }
      }
    }

    loadExistingNote()
    return () => {
      isMounted = false
    }
  }, [isUpdateMode, noteId, fetchInvestmentNoteById, hydrateEntityById])
  const handleEntitySearch = useCallback(
    (searchTerm: string) => {
      // Allow empty string to fetch first page
      searchEntities(searchTerm || '')
    },
    [searchEntities]
  )

  // Prefetch entities on mount if selection is visible
  useEffect(() => {
    if (shouldShowEntitySelection) {
      searchEntities('')
    }
  }, [shouldShowEntitySelection, searchEntities])

  // Compose validation using the shared util, with domain toggle on entity requirement
  const validateForm = useCallback(
    (data: any): string[] | null => {
      // For investment context, we don't require entity selection since investment context is sufficient
      // Basic validation for note fields
      const errors: string[] = []

      if (!data.title || data.title.trim() === '') {
        errors.push('Title is required')
      }

      if (!data.text || data.text.trim() === '') {
        errors.push('Note text is required')
      }

      // Only require entity selection if not in investment context
      if (shouldShowEntitySelection && !data.account && !data.contact && !data.opportunity && !data.lead) {
        errors.push('Please select a related entity')
      }

      return errors.length > 0 ? errors : null
    },
    [shouldShowEntitySelection]
  )

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

      // Merge form data with state to include id, version, and documents
      const noteData = formData.id
        ? { ...data, id: formData.id, version: formData.version, documents: allDocuments }
        : { ...data, documents: allDocuments }

      const payload = buildInvestmentNotePayload(noteData, { accessToken, userInfo, additionalData } as any, {
        isUpdate: isUpdateMode
      })
      return payload
    },
    [accessToken, userInfo, additionalData, isUpdateMode, formData, uploadFiles]
  )

  // Success handler
  const handleSuccess = useCallback(() => {
    if (onSuccess) {
      onSuccess(formData)
    }
  }, [formData, onSuccess])

  // RHF + Zod resolver provided to AppActionForm
  const form = useForm<any>({
    resolver: createNoteSegmentResolver(),
    defaultValues: formData,
    mode: 'onChange'
  })

  // Check if form should be disabled
  const isFormDisabled =
    isLoadingNote || !!loadError || (isUpdateMode && (!formData.id || formData.version === undefined))

  return (
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
      disabled={isFormDisabled}
      data-testid="investment-note-process-dialog"
    >
      {isLoadingNote && (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-8" data-testid="note-loading-spinner">
          <Spinner size="lg" />
        </div>
      )}

      {loadError && (
        <Alert variant="destructive" className="gba:mb-4" data-testid="note-load-error-alert">
          {loadError}
        </Alert>
      )}

      {!isLoadingNote && (
        <NoteSegment
          // Use controlled entity search from hook
          entities={entities.filter(e => e.type !== 'investment') as any}
          entitiesLoading={entitiesLoading}
          entitiesHasMore={entitiesHasMore}
          onEntityLoadMore={loadMoreEntities}
          onEntitySearch={handleEntitySearch}
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
  )
}

export default NoteForm
