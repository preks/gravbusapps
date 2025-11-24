import React, { useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { NoteLayout, noteSchema } from '@/common/components/common-relations/form-layouts/note-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type InvestmentNote, buildInvestmentNotePayload } from '@/common/data/investment/types/investmentNoteTypes'
import { useInvestmentEntities } from '@/common/data/investment/hooks/useInvestmentEntities'
import { useInvestmentNote } from '@/common/data/investment/hooks/useInvestmentNote'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { useForm } from 'react-hook-form'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildFilePath } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/investment/constants/investmentConstants'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { ErrorAlert } from '@/components/error-alert/ErrorAlert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface NoteFormProps extends BusinessAppContextProps {
  initialData?: Partial<z.infer<typeof noteSchema>>
  onSubmit?: (note: Partial<z.infer<typeof noteSchema>>) => Promise<void>
  onCancel?: () => Promise<void>
}

const NoteForm: React.FC<NoteFormProps> = ({ accessToken, userInfo, additionalData, onCancel = async () => {} }) => {
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
  const { note, loading: noteLoading, error } = useInvestmentNote(accessToken || '', noteId)

  // Get entity IDs from platform params
  const accountId = platformParams.accountId
  const contactId = platformParams.contactId
  const opportunityId = platformParams.opportunityId
  const leadId = platformParams.leadId
  const investmentId = platformParams.investmentId

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
            dataTestId={formatDataTestId('investment-note-form', `error-alert-${index}`)}
          />
        ))}
      </>
    )
  }

  // For investment notes, we hide entity selection since investment + account context is sufficient
  const isInvestmentContext = Boolean(investmentId)
  const hasEntityFromContext = accountId || leadId || contactId || opportunityId
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
    async (
      files: File[],
      referenceEntityId: string,
      referenceEntityType: 'account' | 'contact' | 'lead' | 'opportunity' | 'investment' | 'unknown'
    ): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      // Determine FILE_ENTITY based on reference entity type
      let fileEntity: any
      switch (referenceEntityType) {
        case 'account':
          fileEntity = FILE_ENTITY.ACCOUNT
          break
        case 'contact':
          fileEntity = FILE_ENTITY.CONTACT
          break
        case 'lead':
          fileEntity = FILE_ENTITY.LEAD
          break
        case 'opportunity':
          fileEntity = FILE_ENTITY.OPPORTUNITY
          break
        case 'investment':
          fileEntity = FILE_ENTITY.INVESTMENT
          break
        default:
          fileEntity = FILE_ENTITY.UNKNOWN
          break
      }

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
      leadId: note?.leadId || leadId,
      investmentId: note?.investmentId || investmentId
    }),
    [accountId, contactId, opportunityId, leadId, investmentId, note]
  )

  // Load existing note if in update mode - using mapToFormValues (AccountForm pattern)
  const noteRef = useRef(note)
  useEffect(() => {
    if (noteRef.current?.id !== note?.id) {
      form.reset(mapToFormValues(note || {}, noteSchema) as any)
      noteRef.current = note

      // Hydrate first found entity
      const entity = [
        { type: 'investment' as const, id: note?.investmentId },
        { type: 'account' as const, id: note?.accountId },
        { type: 'contact' as const, id: note?.contactId },
        { type: 'opportunity' as const, id: note?.opportunityId },
        { type: 'lead' as const, id: note?.leadId }
      ].find(e => e.id)

      if (entity?.id) {
        hydrateEntityById(entity.type, entity.id)
      }
    }
  }, [note?.id, note, form, hydrateEntityById])
  const handleEntitySearch = useCallback(
    (searchTerm: string) => {
      // Allow empty string to fetch first page
      searchEntities(searchTerm || '')
    },
    [searchEntities]
  )

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

  // Prefetch entities on mount if selection is visible
  useEffect(() => {
    if (shouldShowEntitySelection) {
      searchEntities('')
    }
  }, [shouldShowEntitySelection, searchEntities])

  // Handle standard entity context (account, contact, opportunity, lead)
  useEffect(() => {
    if (!accountId && !contactId && !opportunityId && !leadId) return

    const hasEntity = Boolean(
      form.getValues('accountId') ||
        form.getValues('contactId') ||
        form.getValues('opportunityId') ||
        form.getValues('leadId')
    )
    if (hasEntity) return

    // Set entity ID fields in form (these get mapped to backend fields by buildPayload)
    if (accountId) {
      form.setValue('accountId', accountId)
      form.setValue('relatedEntityId', accountId)
      hydrateEntityById('account', accountId)
    } else if (contactId) {
      form.setValue('contactId', contactId)
      form.setValue('relatedEntityId', contactId)
      hydrateEntityById('contact', contactId)
    } else if (opportunityId) {
      form.setValue('opportunityId', opportunityId)
      form.setValue('relatedEntityId', opportunityId)
      hydrateEntityById('opportunity', opportunityId)
    } else if (leadId) {
      form.setValue('leadId', leadId)
      form.setValue('relatedEntityId', leadId)
      hydrateEntityById('lead', leadId)
    }
  }, [accountId, contactId, opportunityId, leadId, form, hydrateEntityById])

  // Handler for investment entity changes (injected into NoteSegment)
  // Also handles initial investmentId from context or loaded note
  const handleAdditionalEntityChange = useCallback(
    (type: string, entityId: string | null) => {
      if (type === 'investment') {
        if (entityId) {
          form.setValue('investmentId', entityId)
          form.setValue('relatedEntityId', entityId)
          hydrateEntityById('investment', entityId)
        } else {
          form.setValue('investmentId', undefined)
        }
      }
    },
    [form, hydrateEntityById]
  )

  // Handle investmentId from context or loaded note (IRM-specific, outside NoteSegment)
  useEffect(() => {
    const contextInvestmentId = relatedEntityIds.investmentId
    if (!contextInvestmentId) return

    const currentInvestmentId = form.getValues('investmentId')
    if (currentInvestmentId !== contextInvestmentId) {
      handleAdditionalEntityChange('investment', contextInvestmentId)
    }
  }, [relatedEntityIds.investmentId, form, handleAdditionalEntityChange])

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
      if (shouldShowEntitySelection && !data.accountId && !data.contactId && !data.opportunityId && !data.leadId) {
        errors.push('Please select a related entity')
      }

      return errors.length > 0 ? errors : null
    },
    [shouldShowEntitySelection]
  )

  const processType = isUpdateMode ? 'update' : 'create'

  // Form submission handler - business logic only
  const handleSubmit = useCallback(async (data: z.infer<typeof noteSchema>) => {
    try {
      delete data._pendingFiles
      delete data.relatedEntityId

      // Build payload (buildPayload will include creator fields from noteData)
      const { investmentNote } = buildInvestmentNotePayload(data as Partial<InvestmentNote>)

      return {
        investmentNote
      }
    } catch (error) {
      console.error('Error submitting note:', error)
      throw error
    }
  }, [])

  // PreSubmit handler - upload files before submission
  const handlePreSubmit = useCallback(
    async (data: any) => {
      // Set author fields if not present (Notes use authorEmployeeId, not creatorEmployeeId)
      if (!data.authorEmployeeId && userInfo?.employeeDetails?.employeeId) {
        data.authorEmployeeId = userInfo.employeeDetails.employeeId
      }

      // Upload pending files if any
      let uploadedDocuments: Array<{ name: string; fileInfo: any }> = []
      if (data._pendingFiles && data._pendingFiles.length > 0) {
        try {
          // Determine reference entity from form data (including investmentId)
          const referenceEntityId =
            data.investmentId ||
            data.accountId ||
            data.contactId ||
            data.leadId ||
            data.opportunityId ||
            'temp-' + Date.now()
          const referenceEntityType = data.investmentId
            ? 'investment'
            : data.accountId
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

  // Handle form cancellation
  const handleCancel = async () => {
    await onCancel()
  }

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        handlePreSubmit={handlePreSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={noteSchema}
        validateForm={validateForm}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid={formatDataTestId('investment-note-form', 'Form')}
        isSubmitDisabled={noteLoading}
      >
        <NoteLayout
          accessToken={accessToken}
          // Use controlled entity search from hook
          entities={entities.filter(e => e.type !== 'investment') as any}
          entitiesLoading={entitiesLoading}
          entitiesHasMore={entitiesHasMore}
          onEntityLoadMore={loadMoreEntities}
          onEntitySearch={handleEntitySearch}
          showEntitySelection={shouldShowEntitySelection}
          initialEntityFromContext={{
            // Only pass standard entities to NoteSegment (investmentId handled separately via onAdditionalEntityChange)
            accountId: relatedEntityIds.accountId,
            contactId: relatedEntityIds.contactId,
            opportunityId: relatedEntityIds.opportunityId,
            leadId: relatedEntityIds.leadId
          }}
          onAdditionalEntityChange={handleAdditionalEntityChange}
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
          data-testid="investment-note-layout"
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default NoteForm
