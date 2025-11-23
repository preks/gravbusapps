import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ActivityLayout, activitySchema } from '@/common/components/common-relations/form-layouts/activity-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ActivitySchema } from '@/common/components/common-relations/form-layouts/activity-layout'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { useCustomerActivity } from '@/common/data/customer/hooks/useCustomerActivity'
import { useCustomerRelatedEntities } from '@/common/data/customer/hooks/useCustomerRelatedEntities'
import { useFileClient } from '@/common/network/files/useFileClient'
import { type CustomerActivity, buildCustomerActivityPayload } from '@/common/data/customer/types/customerActivityTypes'
import { buildFilePath } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/customer/constants/customerConstants'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { ErrorAlert } from '@/components/error-alert/ErrorAlert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface ActivityFormProps extends BusinessAppContextProps {
  initialValues?: Partial<ActivitySchema>
  onSubmit?: (activity: Partial<ActivitySchema>) => Promise<void>
  onCancel?: () => Promise<void>
}

export const ActivityForm: React.FC<ActivityFormProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onCancel = async () => {}
}) => {
  // Get owner employee ID from additionalData or userInfo
  const defaultOwnerEmployeeId = (additionalData as any)?.ownerEmployeeId || userInfo?.employeeDetails?.employeeId

  // Resolve IDs from additionalData (platform may pass ids inside psi_taskPayload.psi_initialParameters)
  const platformParams = useMemo(() => {
    const additionalDataRecord = additionalData as Record<string, any>
    const nested =
      additionalDataRecord?.psi_taskPayload?.psi_initialParameters || additionalDataRecord?.psi_initialParameters || {}

    const params = {
      activityId: additionalDataRecord?.activityId || nested?.activityId,
      accountId: additionalDataRecord?.accountId || nested?.accountId,
      contactId: additionalDataRecord?.contactId || nested?.contactId,
      opportunityId: additionalDataRecord?.opportunityId || nested?.opportunityId,
      leadId: additionalDataRecord?.leadId || nested?.leadId
    }

    return params
  }, [additionalData])

  // Check if we're in update mode
  const activityId = platformParams.activityId
  const isUpdateMode = !!activityId

  // Sales activity hook - declarative single-by-PK
  const { activity, loading: activityLoading, error } = useCustomerActivity(accessToken || '', activityId)

  // Get entity IDs from platform params
  const accountId = platformParams.accountId
  const contactId = platformParams.contactId
  const opportunityId = platformParams.opportunityId
  const leadId = platformParams.leadId

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
            dataTestId={formatDataTestId('customer-activity-form', `error-alert-${index}`)}
          />
        ))}
      </>
    )
  }

  // Determine if entity selection should be shown
  const hasEntityFromContext = accountId || contactId || opportunityId || leadId
  const shouldShowEntitySelection = !hasEntityFromContext

  // Entity search hook for related entities (only if selection is shown)
  const {
    entities,
    loading: entitiesLoading,
    searchEntities,
    hasMore: entitiesHasMore,
    loadMore: loadMoreEntities,
    hydrateEntityById
  } = useCustomerRelatedEntities({ accessToken, additionalData })

  // Employee search hook for owner/assignee selection
  const {
    employees,
    search: searchEmployees,
    loading: employeesLoading,
    hasMore: employeesHasMore,
    loadMore: loadMoreEmployees,
    hydrateById
  } = useEmployeeSearch(accessToken)

  const [assigneePrefill, setAssigneePrefill] = useState<
    Array<{
      id: string
      displayName: string
      userId?: string
      pictureThumbnail?: string
      organizationalUnitName?: string
      jobPositionName?: string
    }>
  >([])

  // File upload client
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Upload files to file service and return file IDs with metadata
  const uploadFiles = useCallback(
    async (
      files: File[],
      referenceEntityId: string,
      referenceEntityType: 'account' | 'contact' | 'lead' | 'opportunity' | 'unknown'
    ): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      // Determine FILE_ENTITY based on reference entity type
      const fileEntity =
        referenceEntityType === 'account'
          ? FILE_ENTITY.ACCOUNT
          : referenceEntityType === 'contact'
            ? FILE_ENTITY.CONTACT
            : referenceEntityType === 'lead'
              ? FILE_ENTITY.LEAD
              : referenceEntityType === 'opportunity'
                ? FILE_ENTITY.OPPORTUNITY
                : FILE_ENTITY.UNKNOWN

      const folderPath = buildFilePath(fileEntity, referenceEntityId, FILE_CONTEXT.ACTIVITY)

      const uploadPromises = files.map(async file => {
        const result = await fileClient.uploadFile(
          file,
          { accessScope: 'tenant' },
          {
            appName: APP_NAME,
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

  // Prefill current user as default assignee in create mode
  useEffect(() => {
    if (isUpdateMode) return // Only for create mode
    if (!defaultOwnerEmployeeId) return

    const displayName =
      `${userInfo?.employeeDetails?.firstName || ''} ${userInfo?.employeeDetails?.lastName || ''}`.trim() ||
      userInfo?.userName ||
      'Current User'

    setAssigneePrefill([{ id: defaultOwnerEmployeeId, displayName }])
    // Hydrate employee details for better display
    hydrateById(defaultOwnerEmployeeId)
  }, [
    isUpdateMode,
    defaultOwnerEmployeeId,
    userInfo?.employeeDetails?.firstName,
    userInfo?.employeeDetails?.lastName,
    userInfo?.userName,
    hydrateById
  ])

  // Merge prefilled assignee with live search results
  const mergedAssignees = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string
        displayName: string
        userId?: string
        pictureThumbnail?: string
        organizationalUnitName?: string
        jobPositionName?: string
      }
    >()
    for (const o of assigneePrefill) {
      map.set(o.id, o)
    }
    for (const e of employees) {
      const employeeRecord = e as Record<string, any>
      map.set(e.id, {
        id: e.id,
        displayName: e.displayName,
        userId: e.userId,
        pictureThumbnail: employeeRecord.pictureThumbnail,
        organizationalUnitName: employeeRecord.organizationalUnitName,
        jobPositionName: employeeRecord.jobPositionName
      })
    }
    return Array.from(map.values())
  }, [assigneePrefill, employees])

  // Initialize form BEFORE useEffect that uses it
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
      leadId: activity?.leadId || leadId
    }),
    [accountId, contactId, opportunityId, leadId, activity]
  )

  // Load existing activity if in update mode - using mapToFormValues (AccountForm pattern)
  const activityRef = useRef(activity)
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

      // Hydrate owner employee for display
      if (activity?.ownerEmployee?.id) {
        const displayName =
          activity.ownerEmployee.displayName ||
          `${activity.ownerEmployee.firstName || ''} ${activity.ownerEmployee.lastName || ''}`.trim() ||
          'Unknown'
        setAssigneePrefill([{ id: activity.ownerEmployee.id, displayName }])
        hydrateById(activity.ownerEmployee.id)
      }
    }
  }, [activity?.id, activity, form, hydrateEntityById, hydrateById])

  // Form submission handler - business logic only
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
          // Determine reference entity from form data
          const referenceEntityId =
            data.accountId || data.contactId || data.leadId || data.opportunityId || 'temp-' + Date.now()
          const referenceEntityType = data.accountId
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

  // Handle entity context - hydrate entity if provided from context
  useEffect(() => {
    if (!accountId && !contactId && !opportunityId && !leadId) return
    const hasEntity = Boolean(
      form.getValues('account') || form.getValues('contact') || form.getValues('opportunity') || form.getValues('lead')
    )
    if (hasEntity) return

    // Set entity in form based on what's available
    if (accountId) {
      form.setValue('account', accountId)
      form.setValue('relatedEntityId', accountId)
      hydrateEntityById('account', accountId)
    } else if (contactId) {
      form.setValue('contact', contactId)
      form.setValue('relatedEntityId', contactId)
      hydrateEntityById('contact', contactId)
    } else if (opportunityId) {
      form.setValue('opportunity', opportunityId)
      form.setValue('relatedEntityId', opportunityId)
      hydrateEntityById('opportunity', opportunityId)
    } else if (leadId) {
      form.setValue('lead', leadId)
      form.setValue('relatedEntityId', leadId)
      hydrateEntityById('lead', leadId)
    }
  }, [accountId, contactId, opportunityId, leadId, form, hydrateEntityById])

  const processType = isUpdateMode ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        handlePreSubmit={handlePreSubmit}
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
            showOwnerSelection={true}
            assignees={mergedAssignees}
            assigneesLoading={employeesLoading}
            onAssigneeSearch={searchEmployees}
            assigneesHasMore={employeesHasMore}
            onAssigneeLoadMore={loadMoreEmployees}
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
