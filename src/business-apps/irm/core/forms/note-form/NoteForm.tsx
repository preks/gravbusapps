import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { NoteLayout, noteSchema } from '@/common/components/common-relations/form-layouts/note-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { buildInvestmentNotePayload } from '@/common/data/investment/payloads/investmentRelationPayloads'
import { useInvestmentEntities } from '@/common/data/investment/hooks/useInvestmentEntities'
import { useInvestmentNote } from '@/common/data/investment/hooks/useInvestmentNote'
import { AppActionForm } from '@/components/app-action-form'
import { useForm } from 'react-hook-form'
import { Alert } from '@newwork/nw-design-system'
import { useFileClient } from '@/common/network/files/useFileClient'

const initialFormData: Partial<z.infer<typeof noteSchema>> = {
  title: '',
  text: '',
  reminderDate: undefined,
  documents: [],
  _pendingFiles: []
}

export interface NoteFormProps extends BusinessAppContextProps {
  initialData?: Partial<z.infer<typeof noteSchema>>
  onSubmit?: (note: Partial<z.infer<typeof noteSchema>>) => Promise<void>
  onCancel?: () => Promise<void>
}

const NoteForm: React.FC<NoteFormProps> = ({ accessToken, userInfo, additionalData, onCancel = async () => {} }) => {
  const [formData, setFormData] = useState<Partial<z.infer<typeof noteSchema>>>(initialFormData)

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

  // Investment note hook - declarative single-by-PK
  const { note, loading: noteLoading, error: noteError } = useInvestmentNote(accessToken, noteId)

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
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

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
      documents:
        (note as any).documents?.map((doc: any) => ({
          id: doc.id,
          name: doc.name || '',
          version: doc.version
        })) || [],
      _pendingFiles: [],
      // Only store entity IDs (strings), not objects
      account: getEntityId(note.account) || undefined,
      contact: getEntityId(note.contact) || undefined,
      opportunity: getEntityId(note.opportunity) || undefined,
      lead: getEntityId(note.lead) || undefined,
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
  }, [isUpdateMode, note, noteLoading, hydrateEntityById, form])
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
    async (data: z.infer<typeof noteSchema>) => {
      // Helper to extract entity ID from object or string
      const getEntityId = (entity: any): string | undefined => {
        if (!entity) return undefined
        if (typeof entity === 'string') return entity
        return entity.id
      }

      // Extract entity IDs - must be strings, not objects
      const accountId = getEntityId(data.account) || getEntityId(formData.account) || undefined
      const contactId = getEntityId(data.contact) || getEntityId(formData.contact) || undefined
      const opportunityId = getEntityId(data.opportunity) || getEntityId(formData.opportunity) || undefined
      const leadId = getEntityId(data.lead) || getEntityId(formData.lead) || undefined

      // Merge form data with state to include id, version, documents (already uploaded in preSubmit), and entity IDs
      // Remove entity objects from data and only include IDs (strings)
      const dataWithoutEntities = { ...data }
      const noteData = formData.id
        ? {
            ...dataWithoutEntities,
            id: formData.id,
            version: formData.version,
            // documents already processed in handlePreSubmit
            // Only include entity IDs as strings (not objects)
            ...(accountId && { account: accountId }),
            ...(contactId && { contact: contactId }),
            ...(opportunityId && { opportunity: opportunityId }),
            ...(leadId && { lead: leadId })
          }
        : {
            ...dataWithoutEntities,
            // documents already processed in handlePreSubmit
            // Only include entity IDs as strings (not objects)
            ...(accountId && { account: accountId }),
            ...(contactId && { contact: contactId }),
            ...(opportunityId && { opportunity: opportunityId }),
            ...(leadId && { lead: leadId })
          }

      const payload = buildInvestmentNotePayload(noteData, { accessToken, userInfo, additionalData } as any, {
        isUpdate: isUpdateMode
      })
      return payload
    },
    [accessToken, userInfo, additionalData, isUpdateMode, formData]
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

  // Handle form cancellation
  const handleCancel = async () => {
    await onCancel()
  }

  return (
    <AppActionForm
      processType={isUpdateMode ? 'update' : 'create'}
      onSubmit={handleSubmit}
      handlePreSubmit={handlePreSubmit}
      onCancel={handleCancel}
      formData={form.getValues()}
      form={form}
      schema={noteSchema}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
      data-testid="investment-note-process-dialog"
    >
      {noteError && (
        <Alert variant="destructive" className="gba:mb-4" data-testid="note-load-error-alert">
          {noteError}
        </Alert>
      )}

      <NoteLayout
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
        data-testid="investment-note-layout"
      />
    </AppActionForm>
  )
}

export default NoteForm
