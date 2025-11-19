import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ActivityLayout, activitySchema } from '@/common/components/common-relations/form-layouts/activity-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ActivitySchema } from '@/common/components/common-relations/form-layouts/activity-layout'
import { validateActivityData } from '@/common/components/common-relations/form-segments/activity-segment/utils'
import { buildActivityPayload } from '@/common/data/investment/payloads/investmentRelationPayloads'
import { useInvestmentActivity } from '@/common/data/investment/hooks/useInvestmentActivity'
import { useInvestmentEntities } from '@/common/data/investment/hooks/useInvestmentEntities'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useFileClient } from '@/common/network/files/useFileClient'

const initialFormData: Partial<ActivitySchema> = {
  title: '',
  activityTypeRef: '',
  occurredAt: '',
  description: '',
  files: [],
  documents: [],
  _pendingFiles: []
}

const INVESTMENT_ACTIVITY_TYPE_CATALOG = 'InvestmentActivityType'
const INVESTMENT_ACTIVITY_TYPE_VERSION = 'v1'

export interface ActivityFormProps extends BusinessAppContextProps {
  initialValues?: Partial<ActivitySchema>
  onSubmit?: (activity: Partial<ActivitySchema>) => Promise<void>
  onCancel?: () => Promise<void>
}

const ActivityForm: React.FC<ActivityFormProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onCancel = async () => {}
}) => {
  const [formData, setFormData] = useState<Partial<z.infer<typeof activitySchema>>>({
    ...initialFormData,
    ownerEmployee: userInfo?.employeeDetails?.employeeId ? { id: userInfo.employeeDetails.employeeId } : undefined
  })

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

  // Get entity IDs from platform params
  const { accountId, leadId, contactId, opportunityId, investmentId } = platformParams

  // Determine if entity selection should be shown
  // For investment context, we hide entity selection since investment + account context is sufficient
  // Otherwise, show selection if no entity is provided from context
  const isInvestmentContext = Boolean(investmentId)
  const hasEntityFromContext = accountId || leadId || contactId || opportunityId
  const shouldShowEntitySelection = !isInvestmentContext && !hasEntityFromContext

  // Investment activity hook - declarative single-by-PK
  const { activity, loading: activityLoading } = useInvestmentActivity(accessToken, activityId)

  // Entity search hook (controlled search/path)
  const {
    entities,
    loading: entitiesLoading,
    searchEntities,
    hasMore: entitiesHasMore,
    loadMore: loadMoreEntities,
    hydrateEntityById
  } = useInvestmentEntities({ accessToken, additionalData })

  // Employee search hook for assignee selection
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

  // Initialize form early so it can be used in useEffect hooks
  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      ...formData,
      ownerEmployeeId: formData.ownerEmployee?.id || userInfo?.employeeDetails?.employeeId || ''
    },
    mode: 'onChange'
  })

  // Upload files to file service and return file IDs with metadata
  const uploadFiles = useCallback(
    async (files: File[], entityId: string): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      const uploadPromises = files.map(async file => {
        const folderPath = `/investmentRelations/activities/${entityId}/documents`

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

  // Prefill current user as default assignee in create mode
  useEffect(() => {
    if (isUpdateMode) return // Only for create mode
    const employeeId = userInfo?.employeeDetails?.employeeId
    if (!employeeId) return

    const displayName =
      `${userInfo?.employeeDetails?.firstName || ''} ${userInfo?.employeeDetails?.lastName || ''}`.trim() ||
      userInfo?.userName ||
      'Current User'

    setAssigneePrefill([{ id: employeeId, displayName }])
    // Hydrate employee details for better display
    hydrateById(employeeId)
  }, [
    isUpdateMode,
    userInfo?.employeeDetails?.employeeId,
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

  // Load existing activity if in update mode
  useEffect(() => {
    if (!isUpdateMode || !activity || activityLoading) {
      return
    }

    // Helper to extract entity ID from object or string
    const getEntityId = (entity: any): string | undefined => {
      if (!entity) return undefined
      if (typeof entity === 'string') return entity
      return entity.id
    }

    // Construct new form data - only store entity IDs (strings), not objects
    const newFormData = {
      id: activity.id,
      title: activity.title || '',
      activityTypeRef: activity.activityType?.id || '',
      occurredAt: activity.occurredAt || '',
      description: activity.description || '',
      files: [],
      documents:
        (activity as Record<string, any>).documents?.map((doc: any) => ({
          id: doc.id,
          name: doc.name || '',
          version: doc.version
        })) || [],
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
    setFormData(newFormData as Partial<ActivitySchema>)

    // Explicitly reset form with new data
    form.reset({
      ...newFormData,
      ownerEmployeeId: activity.ownerEmployee?.id || ''
    })

    // Hydrate and pin related entity if present so combobox trigger keeps rich label
    const relId = activity.account?.id || activity.contact?.id || activity.opportunity?.id || activity.lead?.id
    if (relId) {
      if (activity.account?.id) hydrateEntityById('account', activity.account.id)
      else if (activity.contact?.id) hydrateEntityById('contact', activity.contact.id)
      else if (activity.opportunity?.id) hydrateEntityById('opportunity', activity.opportunity.id)
      else if (activity.lead?.id) hydrateEntityById('lead', activity.lead.id)
    }

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
  }, [isUpdateMode, activity, activityLoading, hydrateEntityById, hydrateById, form])

  // Form submission handler - business logic only
  const handleSubmit = useCallback(
    async (data: z.infer<typeof activitySchema>) => {
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
      const activityData = formData.id
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

      const payload = buildActivityPayload(
        activityData as any,
        { accessToken, userInfo, additionalData },
        {
          isUpdate: isUpdateMode
        }
      )
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

  // Compose validation using the shared util, with domain toggle on entity requirement
  const validateForm = useCallback(
    (data: any): string[] | null => {
      // For investment context, we don't require entity selection since investment context is sufficient
      return validateActivityData(data, { requireEntity: shouldShowEntitySelection })
    },
    [shouldShowEntitySelection]
  )

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
        validateForm={validateForm}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid="investment-activity-process-dialog"
      >
        <ActivityLayout
          // Let segment load type options from catalog
          typeCatalog={{ identifier: INVESTMENT_ACTIVITY_TYPE_CATALOG, version: INVESTMENT_ACTIVITY_TYPE_VERSION }}
          // Use controlled entity search from hook
          entities={entities}
          entitiesLoading={entitiesLoading}
          entitiesHasMore={entitiesHasMore}
          onEntityLoadMore={loadMoreEntities}
          onEntitySearch={handleEntitySearch}
          showEntitySelection={shouldShowEntitySelection}
          showOwnerSelection={true}
          assignees={mergedAssignees}
          assigneesLoading={employeesLoading}
          onAssigneeSearch={searchEmployees}
          assigneesHasMore={employeesHasMore}
          onAssigneeLoadMore={loadMoreEmployees}
          initialEntityFromContext={{ accountId, contactId, opportunityId, leadId }}
          titleLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.title', 'Title')}
          typeLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.type', 'Type')}
          dateLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.date', 'Date & Time')}
          descriptionLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.description', 'Description')}
          uploadFileLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.uploadFile', 'Attach Documents')}
          entityLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.relatedEntity', 'Related Entity')}
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
          data-testid="investment-activity-layout"
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default ActivityForm
