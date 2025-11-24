import React, { useEffect, useCallback, useRef } from 'react'
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
import { buildFilePath } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/investment/constants/investmentConstants'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { ErrorAlert } from '@/components/error-alert/ErrorAlert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface ActivityFormProps extends BusinessAppContextProps {
  onSuccess?: (activity: Partial<ActivitySchema>) => void
  onCancel?: () => void
}

const ActivityForm: React.FC<ActivityFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
  // Resolve IDs from additionalData (platform may pass ids inside psi_taskPayload.psi_initialParameters)
  const platformParams = React.useMemo(() => {
    const additionalDataRecord = additionalData as Record<string, any>
    const nested =
      additionalDataRecord?.psi_taskPayload?.psi_initialParameters || additionalDataRecord?.psi_initialParameters || {}
    return {
      activityId: additionalDataRecord?.activityId || nested?.activityId,
      investmentId: additionalDataRecord?.investmentId || nested?.investmentId,
      accountId: additionalDataRecord?.accountId || nested?.accountId,
      contactId: additionalDataRecord?.contactId || nested?.contactId,
      opportunityId: additionalDataRecord?.opportunityId || nested?.opportunityId,
      leadId: additionalDataRecord?.leadId || nested?.leadId
    }
  }, [additionalData])

  // Check if we're in update mode
  const activityId = platformParams.activityId
  const isUpdateMode = !!activityId

  // Investment activity hook - declarative single-by-PK
  const { activity, loading: activityLoading, error } = useInvestmentActivity(accessToken || '', activityId)

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
    errors.push({ error, context: 'Failed to load activity data' })
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
            dataTestId={formatDataTestId('investment-activity-form', `error-alert-${index}`)}
          />
        ))}
      </>
    )
  }

  // Determine if entity selection should be shown
  // For investment context, we hide entity selection since investment + account context is sufficient
  // Otherwise, show selection if no entity is provided from context
  const isInvestmentContext = Boolean(investmentId)
  const hasEntityFromContext = accountId || leadId || contactId || opportunityId
  const shouldShowEntitySelection = !isInvestmentContext && !hasEntityFromContext

  // Entity search hook (controlled search/path)
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

  // Initialize form early so it can be used in useEffect hooks
  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: mapToFormValues(activity || {}, activitySchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Combine context + activity IDs (activity has priority)
  const relatedEntityIds = React.useMemo(
    () => ({
      accountId: activity?.accountId || accountId,
      contactId: activity?.contactId || contactId,
      opportunityId: activity?.opportunityId || opportunityId,
      leadId: activity?.leadId || leadId,
      investmentId: activity?.investmentId || investmentId
    }),
    [accountId, contactId, opportunityId, leadId, investmentId, activity]
  )

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

      const folderPath = buildFilePath(fileEntity, referenceEntityId, FILE_CONTEXT.ACTIVITY)

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

  // Load existing activity if in update mode - using mapToFormValues (AccountForm pattern)
  const activityRef = useRef(activity)
  useEffect(() => {
    if (activityRef.current?.id !== activity?.id) {
      form.reset(mapToFormValues(activity || {}, activitySchema) as any)
      activityRef.current = activity

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
  }, [activity?.id, activity, form, hydrateEntityById])

  // Form submission handler - business logic only
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

  // PreSubmit handler - upload files before submission
  const handlePreSubmit = useCallback(
    async (data: any) => {
      // Set creator fields if not present
      if (!data.creatorEmployeeId && userInfo?.employeeDetails?.employeeId) {
        data.creatorEmployeeId = userInfo.employeeDetails.employeeId
      }
      if (!data.creatorUserId && userInfo?.id) {
        data.creatorUserId = userInfo.id
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

  // Success handler
  const handleSuccess = useCallback(() => {
    onSuccess?.(form.getValues())
  }, [onSuccess, form])

  // Handle form cancellation
  const handleCancel = useCallback(async () => {
    await onCancel?.()
  }, [onCancel])

  // Entity search handler
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

  // Handler for investment entity changes (injected into ActivitySegment)
  // Also handles initial investmentId from context or loaded activity
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

  // Handle investmentId from context or loaded activity (IRM-specific, outside ActivitySegment)
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
      return validateActivityData(data, { requireEntity: shouldShowEntitySelection })
    },
    [shouldShowEntitySelection]
  )

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
