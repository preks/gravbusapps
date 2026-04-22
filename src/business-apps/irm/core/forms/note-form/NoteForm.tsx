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
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getReferenceEntityType } from '@/common/data/investment/utils'
import { FILE_CONTEXT, APP_NAME, getFileEntityFromType } from '@/common/data/investment/constants/investmentConstants'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'

export interface NoteFormProps extends BusinessAppContextProps {
  onSuccess?: (note: Partial<z.infer<typeof noteSchema>>) => void
  onCancel?: () => void
}

export const NoteForm: React.FC<NoteFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
  const initialParameters = useMemo(() => {
    return additionalData?.psi_taskPayload?.psi_initialParameters || null
  }, [additionalData])

  // Check if we're in update mode
  const noteId = additionalData?.noteId || initialParameters?.noteId || null
  const isUpdateMode = !!noteId

  // Investment note hook - declarative single-by-PK
  const { note, loading: noteLoading, error } = useInvestmentNote(accessToken || '', noteId)

  // Get entity IDs from additionalData or initialParameters
  const accountId = additionalData?.accountId || initialParameters?.accountId || null
  const contactId = additionalData?.contactId || initialParameters?.contactId || null
  const opportunityId = additionalData?.opportunityId || initialParameters?.opportunityId || null
  const leadId = additionalData?.leadId || initialParameters?.leadId || null
  const investmentId = additionalData?.investmentId || initialParameters?.investmentId || null

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
    createFormPreSubmitHandler({
      userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.NOTE,
      appName: APP_NAME,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: false, // Notes use authorEmployeeId
      additionalEntityIdFields: ['investmentId']
    }),
    [userInfo, fileClient]
  )

  const handleSuccess = useCallback(() => {
    onSuccess?.(form.getValues())
  }, [onSuccess, form])

  const handleCancel = useCallback(() => {
    onCancel?.()
  }, [onCancel])

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load note data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="investment-note-form" />
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
