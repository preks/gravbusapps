import React, { useMemo, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { NoteLayout, noteSchema } from '@/common/components/common-relations/form-layouts/note-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { useForm } from 'react-hook-form'
import { useFileClient } from '@/common/network/files/useFileClient'
import { FILE_CONTEXT, APP_NAME, getFileEntityFromType } from '@/common/data/customer/constants/customerConstants'
import { useCustomerNote } from '@/common/data/customer/hooks/useCustomerNote'
import { useCustomerRelatedEntities } from '@/common/data/customer/hooks/useCustomerRelatedEntities'
import { type CustomerNote, buildCustomerNotePayload } from '@/common/data/customer/types/customerNoteTypes'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getReferenceEntityType } from '@/common/data/customer/utils'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'

export interface NoteFormProps extends BusinessAppContextProps {
  onSuccess?: (note: Partial<z.infer<typeof noteSchema>>) => void
  onCancel?: () => void
}

export const NoteForm: React.FC<NoteFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
  const initialParameters = useMemo(() => {
    return additionalData?.psi_taskPayload?.psi_initialParameters || null
  }, [additionalData])

  const noteId = additionalData?.noteId || initialParameters?.noteId || null
  const isUpdateMode = !!noteId

  const { note, loading: noteLoading, error } = useCustomerNote(accessToken || '', noteId)

  const accountId = additionalData?.accountId || initialParameters?.accountId || null
  const contactId = additionalData?.contactId || initialParameters?.contactId || null
  const opportunityId = additionalData?.opportunityId || initialParameters?.opportunityId || null
  const leadId = additionalData?.leadId || initialParameters?.leadId || null

  const hasEntityFromContext = accountId || contactId || opportunityId || leadId
  const shouldShowEntitySelection = !hasEntityFromContext

  const {
    entities,
    loading: entitiesLoading,
    searchEntities,
    hasMore: entitiesHasMore,
    loadMore: loadMoreEntities,
    hydrateEntityById
  } = useCustomerRelatedEntities({ accessToken, additionalData })

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
      leadId: note?.leadId || leadId
    }),
    [accountId, contactId, opportunityId, leadId, note]
  )

  const noteRef = useRef(note)

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

  const handlePreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.NOTE,
      appName: APP_NAME,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: false // Notes use authorEmployeeId
    }),
    [userInfo, fileClient]
  )

  const handleSuccess = useCallback(() => {
    onSuccess?.(form.getValues())
  }, [onSuccess, form])

  const handleEntitySearch = useCallback(
    (searchTerm: string) => {
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
    if (noteRef.current?.id !== note?.id) {
      form.reset(mapToFormValues(note || {}, noteSchema) as any)
      noteRef.current = note

      const entity = [
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

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load note data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="customer-note-form" />
  }

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
          entities={entities}
          entitiesLoading={entitiesLoading}
          entitiesHasMore={entitiesHasMore}
          onEntityLoadMore={loadMoreEntities}
          onEntitySearch={handleEntitySearch}
          showEntitySelection={shouldShowEntitySelection}
          initialEntityFromContext={{
            accountId: relatedEntityIds.accountId,
            contactId: relatedEntityIds.contactId,
            opportunityId: relatedEntityIds.opportunityId,
            leadId: relatedEntityIds.leadId
          }}
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
