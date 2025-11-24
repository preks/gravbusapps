import React, { useMemo, useEffect, useCallback, useRef } from 'react'
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
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { ErrorAlert } from '@/components/error-alert/ErrorAlert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getReferenceEntityType } from '@/common/data/investment/utils'
import { FILE_CONTEXT, APP_NAME, getFileEntityFromType } from '@/common/data/investment/constants/investmentConstants'
import { uploadFiles } from '@/common/utils/fileUtils'

export interface NoteFormProps extends BusinessAppContextProps {
  onSuccess?: (note: Partial<z.infer<typeof noteSchema>>) => void
  onCancel?: () => void
}

export const NoteForm: React.FC<NoteFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
  const platformParams = useMemo(() => {
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

  // For investment notes, we hide entity selection since investment + account context is sufficient
  const isInvestmentContext = Boolean(investmentId)
  const hasEntityFromContext = accountId || leadId || contactId || opportunityId
  const shouldShowEntitySelection = !isInvestmentContext && !hasEntityFromContext

  const {
    entities,
    loading: entitiesLoading,
    searchEntities,
    hasMore: entitiesHasMore,
    loadMore: loadMoreEntities,
    hydrateEntityById
  } = useInvestmentEntities({ accessToken, additionalData })

  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  const form = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: mapToFormValues(note || {}, noteSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const relatedEntityIds = useMemo(
    () => ({
      accountId: note?.accountId || accountId,
      contactId: note?.contactId || contactId,
      opportunityId: note?.opportunityId || opportunityId,
      leadId: note?.leadId || leadId,
      investmentId: note?.investmentId || investmentId
    }),
    [accountId, contactId, opportunityId, leadId, investmentId, note]
  )

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

  useEffect(() => {
    if (shouldShowEntitySelection) {
      searchEntities('')
    }
  }, [shouldShowEntitySelection, searchEntities])

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

  useEffect(() => {
    const contextInvestmentId = relatedEntityIds.investmentId
    if (!contextInvestmentId) return

    const currentInvestmentId = form.getValues('investmentId')
    if (currentInvestmentId !== contextInvestmentId) {
      handleAdditionalEntityChange('investment', contextInvestmentId)
    }
  }, [relatedEntityIds.investmentId, form, handleAdditionalEntityChange])

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
          const referenceEntityType = getReferenceEntityType(data)

          const fileEntity = getFileEntityFromType(referenceEntityType)
          uploadedDocuments = await uploadFiles(
            data._pendingFiles,
            referenceEntityId,
            fileEntity,
            FILE_CONTEXT.NOTE,
            APP_NAME,
            fileClient
          )
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

  const handleSuccess = useCallback(() => {
    onSuccess?.(form.getValues())
  }, [onSuccess, form])

  const handleCancel = useCallback(() => {
    onCancel?.()
  }, [onCancel])

  const errors: Array<{ error?: string | unknown; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load note data' })
  }

  if (errors.length > 0) {
    return (
      <>
        {errors.map((err, index) => (
          <ErrorAlert
            key={err.type || `error-${index}`}
            error={err.error}
            type={err.type}
            context={err.context}
            dataTestId={formatDataTestId('investment-note-form', `error-alert-${index}`)}
          />
        ))}
      </>
    )
  }

  const processType = isUpdateMode ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        handlePreSubmit={handlePreSubmit}
        onSuccess={handleSuccess}
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
