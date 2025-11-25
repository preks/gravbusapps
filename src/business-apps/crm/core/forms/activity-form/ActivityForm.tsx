import React, { useMemo, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ActivityLayout, activitySchema } from '@/common/components/common-relations/form-layouts/activity-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ActivitySchema } from '@/common/components/common-relations/form-layouts/activity-layout'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCustomerActivity } from '@/common/data/customer/hooks/useCustomerActivity'
import { useCustomerRelatedEntities } from '@/common/data/customer/hooks/useCustomerRelatedEntities'
import { useFileClient } from '@/common/network/files/useFileClient'
import { type CustomerActivity, buildCustomerActivityPayload } from '@/common/data/customer/types/customerActivityTypes'
import { FILE_CONTEXT, APP_NAME, getFileEntityFromType } from '@/common/data/customer/constants/customerConstants'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getReferenceEntityType } from '@/common/data/customer/utils'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'

export interface ActivityFormProps extends BusinessAppContextProps {
  onSuccess?: (activity: Partial<ActivitySchema>) => void
  onCancel?: () => void
}

export const ActivityForm: React.FC<ActivityFormProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onSuccess,
  onCancel
}) => {
  const initialParameters = useMemo(() => {
    return additionalData?.psi_taskPayload?.psi_initialParameters || null
  }, [additionalData])

  // Check if we're in update mode
  const activityId = additionalData?.activityId || initialParameters?.activityId || null
  const isUpdateMode = !!activityId

  // Sales activity hook - declarative single-by-PK
  const { activity, loading: activityLoading, error } = useCustomerActivity(accessToken || '', activityId)

  // Get entity IDs from additionalData or initialParameters
  const accountId = additionalData?.accountId || initialParameters?.accountId || null
  const contactId = additionalData?.contactId || initialParameters?.contactId || null
  const opportunityId = additionalData?.opportunityId || initialParameters?.opportunityId || null
  const leadId = additionalData?.leadId || initialParameters?.leadId || null

  // Determine if entity selection should be shown
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

  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: mapToFormValues(activity || {}, activitySchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const relatedEntityIds = useMemo(
    () => ({
      accountId: activity?.accountId || accountId,
      contactId: activity?.contactId || contactId,
      opportunityId: activity?.opportunityId || opportunityId,
      leadId: activity?.leadId || leadId
    }),
    [accountId, contactId, opportunityId, leadId, activity]
  )

  const activityRef = useRef(activity)

  const handleSubmit = useCallback(async (data: z.infer<typeof activitySchema>) => {
    try {
      delete data.files
      delete data._pendingFiles
      delete data.relatedEntityId

      // Build payload (buildPayload will include creator fields from activityData)
      const { salesActivity } = buildCustomerActivityPayload(data as Partial<CustomerActivity>)

      return {
        salesActivity
      }
    } catch (error) {
      console.error('Error submitting activity:', error)
      throw error
    }
  }, [])

  const handlePreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.ACTIVITY,
      appName: APP_NAME,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: true
    }),
    [userInfo, fileClient]
  )

  const handleSuccess = useCallback(() => {
    onSuccess?.(form.getValues())
  }, [onSuccess, form])

  const handleCancel = useCallback(() => {
    onCancel?.()
  }, [onCancel])

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
    if (activityRef.current?.id !== activity?.id) {
      form.reset(mapToFormValues(activity || {}, activitySchema) as any)
      activityRef.current = activity

      // Hydrate first found entity
      const entity = [
        { type: 'account' as const, id: activity?.accountId },
        { type: 'contact' as const, id: activity?.contactId },
        { type: 'opportunity' as const, id: activity?.opportunityId },
        { type: 'lead' as const, id: activity?.leadId }
      ].find(e => e.id)

      if (entity?.id) {
        hydrateEntityById(entity.type, entity.id)
      }
    }
  }, [activity?.id, activity, form, hydrateEntityById])

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

    // Set entity in form based on what's available
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
    errors.push({ error, context: 'Failed to load activity data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="customer-activity-form" />
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
        schema={activitySchema}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid={formatDataTestId('customer-activity-form', 'Form')}
        isSubmitDisabled={activityLoading}
      >
        <div className="gba:w-full" data-testid="sales-activity-form-container">
          <h2 className="gba:text-xl gba:font-bold! gba:mb-4 gba:text-center gba:text-[20px]!" data-testid="form-title">
            {isUpdateMode
              ? getTranslationFromI18nKeyAndLabel('crm:salesActivity.editActivity', 'Edit Activity')
              : getTranslationFromI18nKeyAndLabel('crm:salesActivity.newActivity', 'New Activity')}
          </h2>

          <ActivityLayout
            accessToken={accessToken}
            businessAppContext={{ accessToken, userInfo, additionalData }}
            ownerEmployee={activity?.ownerEmployee}
            entityId={activity?.id}
            typeCatalog="SalesActivityType:v1"
            showEntitySelection={shouldShowEntitySelection}
            entities={entities}
            entitiesLoading={entitiesLoading}
            entitiesHasMore={entitiesHasMore}
            onEntityLoadMore={loadMoreEntities}
            onEntitySearch={handleEntitySearch}
            initialEntityFromContext={{
              accountId: relatedEntityIds.accountId,
              contactId: relatedEntityIds.contactId,
              opportunityId: relatedEntityIds.opportunityId,
              leadId: relatedEntityIds.leadId
            }}
            titleLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.title', 'Title')}
            typeLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.type', 'Type')}
            dateLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.date', 'Date & Time')}
            descriptionLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.description', 'Description')}
            uploadFileLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.uploadFile', 'Attach Documents')}
            entityLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.relatedEntity', 'Related Entity')}
            onFilesChange={handleFilesChange}
            existingDocuments={form.watch('documents') || []}
            onDocumentRemove={handleDocumentRemove}
            loading={activityLoading && isUpdateMode}
            data-testid="sales-activity-layout"
          />
        </div>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default ActivityForm
