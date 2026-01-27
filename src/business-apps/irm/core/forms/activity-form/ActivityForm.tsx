import React, { useMemo, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ActivityLayout, activitySchema } from '@/common/components/common-relations/form-layouts/activity-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ActivitySchema } from '@/common/components/common-relations/form-layouts/activity-layout'
import { validateActivityData } from '@/common/components/common-relations/form-segments/activity-segment/utils'
import {
  type InvestmentActivity,
  buildInvestmentActivityPayload
} from '@/common/data/investment/types/investmentActivityTypes'
import { useInvestmentActivity } from '@/common/data/investment/hooks/useInvestmentActivity'
import { useInvestmentEntities } from '@/common/data/investment/hooks/useInvestmentEntities'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useFileClient } from '@/common/network/files/useFileClient'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getReferenceEntityType } from '@/common/data/investment/utils'
import { FILE_CONTEXT, APP_NAME, getFileEntityFromType } from '@/common/data/investment/constants/investmentConstants'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'

export interface ActivityFormProps extends BusinessAppContextProps {
  onSuccess?: (activity: Partial<ActivitySchema>) => void
  onCancel?: () => void
}

export const ActivityForm: React.FC<ActivityFormProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onSuccess,
  onCancel
}) => {
  const initialParameters = useMemo(() => {
    return additionalData?.psi_taskPayload?.psi_initialParameters || null
  }, [additionalData])

  // Check if we're in update mode
  const activityId = additionalData?.activityId || initialParameters?.activityId || null
  const isUpdateMode = !!activityId

  // Investment activity hook - declarative single-by-PK
  const { activity, loading: activityLoading, error } = useInvestmentActivity(accessToken || '', activityId)

  // Get entity IDs from additionalData or initialParameters
  const accountId = additionalData?.accountId || initialParameters?.accountId || null
  const contactId = additionalData?.contactId || initialParameters?.contactId || null
  const opportunityId = additionalData?.opportunityId || initialParameters?.opportunityId || null
  const leadId = additionalData?.leadId || initialParameters?.leadId || null
  const investmentId = additionalData?.investmentId || initialParameters?.investmentId || null

  // Get occurredAt from additionalData or initialParameters (for calendar quick actions)
  const occurredAt = additionalData?.occurredAt || initialParameters?.occurredAt || null

  const {
    entities,
    loading: entitiesLoading,
    searchEntities,
    hasMore: entitiesHasMore,
    loadMore: loadMoreEntities,
    hydrateEntityById
  } = useInvestmentEntities({ accessToken, additionalData })

  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      ...mapToFormValues(activity || {}, activitySchema),
      // Include occurredAt from context if provided (e.g., from calendar quick action or drag & drop)
      ...(occurredAt ? { occurredAt } : {})
    } as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const relatedEntityIds = useMemo(
    () => ({
      accountId: activity?.accountId || accountId,
      contactId: activity?.contactId || contactId,
      opportunityId: activity?.opportunityId || opportunityId,
      leadId: activity?.leadId || leadId,
      investmentId: activity?.investmentId || investmentId
    }),
    [accountId, contactId, opportunityId, leadId, investmentId, activity]
  )

  // Calculate if entity selection should be shown (no entity context exists)
  const shouldShowEntitySelection = useMemo(
    () =>
      !(
        relatedEntityIds.accountId ||
        relatedEntityIds.contactId ||
        relatedEntityIds.opportunityId ||
        relatedEntityIds.leadId ||
        relatedEntityIds.investmentId
      ),
    [relatedEntityIds]
  )

  const activityRef = useRef(activity)
  useEffect(() => {
    if (activityRef.current?.id !== activity?.id) {
      form.reset(mapToFormValues(activity || {}, activitySchema) as any)
      activityRef.current = activity

      // Re-apply override occurredAt from drag & drop or context (after DB data loads)
      if (occurredAt && activity) {
        form.setValue('occurredAt', occurredAt)
      }

      // Hydrate first found entity
      const entity = [
        { type: 'investment' as const, id: activity?.investmentId },
        { type: 'account' as const, id: activity?.accountId },
        { type: 'contact' as const, id: activity?.contactId },
        { type: 'opportunity' as const, id: activity?.opportunityId },
        { type: 'lead' as const, id: activity?.leadId }
      ].find(e => e.id)

      if (entity?.id) {
        hydrateEntityById(entity.type, entity.id)
      }
    }
  }, [activity?.id, activity, form, hydrateEntityById, occurredAt])

  useEffect(() => {
    if (accessToken && !activityId) {
      // Only trigger initial search in create mode
      searchEntities('')
    }
  }, [accessToken, activityId, searchEntities])

  const handleSubmit = useCallback(async (data: z.infer<typeof activitySchema>) => {
    try {
      delete data.files
      delete data._pendingFiles
      delete data.relatedEntityId

      // Build payload (buildPayload will include creator fields from activityData)
      const { investmentActivity } = buildInvestmentActivityPayload(data as Partial<InvestmentActivity>)

      return {
        investmentActivity
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
      useCreatorFields: true,
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
      return validateActivityData(data, { requireEntity: shouldShowEntitySelection })
    },
    [shouldShowEntitySelection]
  )

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load activity data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="investment-activity-form" />
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
        validateForm={validateForm}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid={formatDataTestId('investment-activity-form', 'Form')}
        isSubmitDisabled={activityLoading}
      >
        <ActivityLayout
          accessToken={accessToken}
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={activity?.ownerEmployee}
          entityId={activity?.id}
          // Let segment load type options from catalog
          typeCatalog={'InvestmentActivityType:v1'}
          // Use controlled entity search from hook
          entities={entities}
          entitiesLoading={entitiesLoading}
          entitiesHasMore={entitiesHasMore}
          onEntityLoadMore={loadMoreEntities}
          onEntitySearch={handleEntitySearch}
          showEntitySelection={shouldShowEntitySelection}
          initialEntityFromContext={{
            // Only pass standard entities to ActivitySegment (investmentId handled separately via onAdditionalEntityChange)
            accountId: relatedEntityIds.accountId,
            contactId: relatedEntityIds.contactId,
            opportunityId: relatedEntityIds.opportunityId,
            leadId: relatedEntityIds.leadId
          }}
          onAdditionalEntityChange={handleAdditionalEntityChange}
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
          data-testid="investment-activity-layout"
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default ActivityForm
