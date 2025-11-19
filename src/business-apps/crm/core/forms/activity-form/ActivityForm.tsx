import React, { useMemo, useCallback, useState, useEffect } from 'react'
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

export interface ActivityFormProps extends BusinessAppContextProps {
  initialValues?: Partial<ActivitySchema>
  onSubmit?: (activity: Partial<ActivitySchema>) => Promise<void>
  onCancel?: () => Promise<void>
}

const initialFormData: Partial<ActivitySchema> = {
  title: '',
  activityTypeRef: '',
  occurredAt: '',
  description: '',
  files: [],
  documents: [],
  _pendingFiles: [],
  ownerEmployeeId: ''
}

const SALES_ACTIVITY_TYPE_CATALOG = 'SalesActivityType'
const SALES_ACTIVITY_TYPE_VERSION = 'v1'

export const ActivityForm: React.FC<ActivityFormProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onCancel = async () => {}
}) => {
  // Get owner employee ID from additionalData or userInfo
  const defaultOwnerEmployeeId = (additionalData as any)?.ownerEmployeeId || userInfo?.employeeDetails?.employeeId

  // Form state
  const [formData, setFormData] = useState<Partial<ActivitySchema>>({
    ...initialFormData,
    ownerEmployee: defaultOwnerEmployeeId ? { id: defaultOwnerEmployeeId } : undefined,
    ownerEmployeeId: defaultOwnerEmployeeId || ''
  })

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
  const { activity, loading: activityLoading } = useCustomerActivity(accessToken, activityId)

  // Get entity IDs from platform params
  const { accountId, contactId, opportunityId, leadId } = platformParams

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
    async (files: File[], entityId: string): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      const uploadPromises = files.map(async file => {
        const folderPath = `/customerRelations/activities/${entityId}/documents`

        const result = await fileClient.uploadFile(
          file,
          { accessScope: 'tenant' },
          {
            appName: 'customerRelations',
            folderPath: folderPath,
            mimeType: file.type || 'application/octet-stream'
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
    defaultValues: {
      ...initialFormData,
      ownerEmployeeId: defaultOwnerEmployeeId || ''
    },
    mode: 'onChange'
  })

  // Load existing activity if in update mode
  useEffect(() => {
    if (!isUpdateMode || !activity || activityLoading) {
      return
    }

    // Map documents with file metadata
    const documents = (activity.documents || []).map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      version: doc.version,
      file: doc.file,
      fileInfo: doc.fileInfo,
      mimeType: doc.mimeType || doc.fileInfo?.fileMetadata?.mimeType || '',
      fileSize: doc.fileSize || doc.fileInfo?.fileMetadata?.fileSize || 0
    }))

    // Helper to extract entity ID from object or string
    const getEntityId = (entity: any): string | undefined => {
      if (!entity) return undefined
      if (typeof entity === 'string') return entity
      return entity.id
    }

    // Construct new form data - only store entity IDs (strings), not objects
    const newFormData: Partial<ActivitySchema> = {
      id: activity.id,
      title: activity.title || '',
      activityTypeRef: activity.activityType?.id || '',
      occurredAt: activity.occurredAt || '',
      description: activity.description || '',
      files: [],
      documents,
      _pendingFiles: [],
      // Only store entity IDs (strings), not objects
      account: getEntityId(activity.account) || undefined,
      contact: getEntityId(activity.contact) || undefined,
      opportunity: getEntityId(activity.opportunity) || undefined,
      lead: getEntityId(activity.lead) || undefined,
      ownerEmployee: activity.ownerEmployee,
      version: activity.version,
      // keep relatedEntityId for validation convenience
      ...(activity.account?.id ? { relatedEntityId: activity.account.id } : {}),
      ...(activity.contact?.id ? { relatedEntityId: activity.contact.id } : {}),
      ...(activity.opportunity?.id ? { relatedEntityId: activity.opportunity.id } : {}),
      ...(activity.lead?.id ? { relatedEntityId: activity.lead.id } : {})
    }

    // Update state
    setFormData(newFormData)

    // Small delay to ensure form is mounted
    setTimeout(() => {
      // Explicitly reset form with ownerEmployeeId
      form.reset({
        ...newFormData,
        ownerEmployeeId: activity.ownerEmployee?.id || ''
      })
    }, 100)

    // Prefill owner employee for the combobox
    if (activity.ownerEmployee?.id) {
      const displayName =
        activity.ownerEmployee.displayName ||
        `${activity.ownerEmployee.firstName || ''} ${activity.ownerEmployee.lastName || ''}`.trim() ||
        'Unknown'
      setAssigneePrefill([{ id: activity.ownerEmployee.id, displayName }])
      // Hydrate details for the selected employee so avatar/job/unit appear immediately
      hydrateById(activity.ownerEmployee.id)
    }

    // Hydrate and pin related entity if present so combobox trigger keeps rich label
    const relId = activity.account?.id || activity.contact?.id || activity.opportunity?.id || activity.lead?.id
    if (relId) {
      if (activity.account?.id) hydrateEntityById('account', activity.account.id)
      else if (activity.contact?.id) hydrateEntityById('contact', activity.contact.id)
      else if (activity.opportunity?.id) hydrateEntityById('opportunity', activity.opportunity.id)
      else if (activity.lead?.id) hydrateEntityById('lead', activity.lead.id)
    }
  }, [isUpdateMode, activity, activityLoading, hydrateEntityById, hydrateById, form])

  // Form submission handler - supports both create and update
  const handleSubmit = useCallback(
    async (values: z.infer<typeof activitySchema>) => {
      const changeMode = isUpdateMode ? 'UPDATE' : 'INSERT'

      // Helper to extract entity ID from object or string
      const getEntityId = (entity: any): string | undefined => {
        if (!entity) return undefined
        if (typeof entity === 'string') return entity
        return entity.id
      }

      // Extract entity IDs from form values (priority) or platformParams (fallback)
      const entityRefs: Record<string, string> = {}
      const accountId = getEntityId(values.account) || platformParams.accountId
      const contactId = getEntityId(values.contact) || platformParams.contactId
      const opportunityId = getEntityId(values.opportunity) || platformParams.opportunityId
      const leadId = getEntityId(values.lead) || platformParams.leadId

      if (accountId) entityRefs.account = accountId
      if (contactId) entityRefs.contact = contactId
      if (opportunityId) entityRefs.opportunity = opportunityId
      if (leadId) entityRefs.lead = leadId

      const payload = {
        employeeId: additionalData?.employeeId,
        managerId: additionalData?.managerId,
        structureId: additionalData?.structureId,
        locationId: additionalData?.locationId,
        organizationalUnitId: additionalData?.organizationalUnitId,
        ...(additionalData?.contactId && { contactId: additionalData.contactId }),
        changeMode,
        salesActivity: {
          // Include id and version for updates
          ...(isUpdateMode && formData.id && { id: formData.id }),
          ...(isUpdateMode && { version: formData.version || 0 }),
          activityTypeRef: values.activityTypeRef,
          title: values.title,
          occurredAt: values.occurredAt ? new Date(values.occurredAt).toISOString() : null,
          ...entityRefs,
          description: values.description || '',
          ownerEmployee: values.ownerEmployeeId || additionalData?.employeeId
          // documents already processed in handlePreSubmit
        }
      }

      return payload
    },
    [additionalData, isUpdateMode, formData, platformParams]
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

  // Entity search handler
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

  // Memoize to prevent infinite re-renders
  const typeCatalog = useMemo(
    () => ({ identifier: SALES_ACTIVITY_TYPE_CATALOG, version: SALES_ACTIVITY_TYPE_VERSION }),
    []
  )

  const initialEntityFromContext = useMemo(
    () => ({ accountId, contactId, opportunityId, leadId }),
    [accountId, contactId, opportunityId, leadId]
  )

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

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData}>
      <AppActionForm
        processType={isUpdateMode ? 'update' : 'create'}
        onSubmit={handleSubmit}
        handlePreSubmit={handlePreSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={activitySchema}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid="sales-activity-process-dialog"
      >
        <div className="gba:w-full" data-testid="sales-activity-form-container">
          <h2 className="gba:text-xl gba:font-bold! gba:mb-4 gba:text-center gba:text-[20px]!" data-testid="form-title">
            {isUpdateMode
              ? getTranslationFromI18nKeyAndLabel('crm:salesActivity.editActivity', 'Edit Activity')
              : getTranslationFromI18nKeyAndLabel('crm:salesActivity.newActivity', 'New Activity')}
          </h2>

          <ActivityLayout
            typeCatalog={typeCatalog}
            showEntitySelection={shouldShowEntitySelection}
            entities={entities}
            entitiesLoading={entitiesLoading}
            entitiesHasMore={entitiesHasMore}
            onEntityLoadMore={loadMoreEntities}
            onEntitySearch={handleEntitySearch}
            initialEntityFromContext={initialEntityFromContext}
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
            loading={activityLoading && isUpdateMode}
            data-testid="sales-activity-layout"
          />
        </div>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default ActivityForm
