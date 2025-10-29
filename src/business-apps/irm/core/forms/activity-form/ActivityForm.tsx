import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import ActivitySegment, {
  Activity,
  createActivitySegmentResolver
} from '@/common/components/common-relations/form-segments/activity-segment/ActivitySegment'
import { validateActivityData } from '@/common/components/common-relations/form-segments/activity-segment/utils'
import { buildActivityPayload } from '@/common/data/investment/payloads'
import { useGetInvestmentActivityById, useInvestmentEntities } from '@/common/data/investment/hooks'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { AppActionForm } from '@/components/app-action-form'
import { useForm } from 'react-hook-form'
import { useFileClient } from '@/common/network/files/useFileClient'

const initialFormData: Activity = {
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
  initialData?: Partial<Activity>
  onSuccess?: (activity: Activity) => void
  onCancel?: () => void
}

const ActivityForm: React.FC<ActivityFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<Activity>({
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
  const { accountId, leadId, contactId, opportunityId } = platformParams

  // For investment activities, we hide entity selection since investment + account context is sufficient
  // In the investment record context, this specialized form must never ask for a related entity
  // Always hide the related entity selector
  const shouldShowEntitySelection = false

  // Investment activity hooks
  const { fetchInvestmentActivityById } = useGetInvestmentActivityById({ accessToken, additionalData })

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
    if (isUpdateMode && activityId) {
      fetchInvestmentActivityById(activityId).then((result: any) => {
        if (result.activity) {
          const activity = result.activity

          // Construct new form data
          const newFormData = {
            id: activity.id,
            title: activity.title || '',
            activityTypeRef: activity.activityType?.id || '',
            occurredAt: activity.occurredAt || '',
            description: activity.description || '',
            files: [],
            documents:
              (activity as Record<string, any>).investmentDocument?.map((doc: any) => ({
                id: doc.id,
                name: doc.name || '',
                version: doc.version
              })) || [],
            _pendingFiles: [],
            account: activity.account,
            contact: activity.contact,
            opportunity: activity.opportunity,
            lead: activity.lead,
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
        }
      })
    }
  }, [isUpdateMode, activityId, fetchInvestmentActivityById, hydrateEntityById, hydrateById])

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

  // Form submission handler - business logic only
  const handleSubmit = useCallback(
    async (data: Activity) => {
      // Upload pending files if any
      let uploadedDocuments: Array<{ name: string; fileInfo: any }> = []
      if (formData._pendingFiles && formData._pendingFiles.length > 0) {
        const tempId = formData.id || 'temp-' + Date.now()
        uploadedDocuments = await uploadFiles(formData._pendingFiles, tempId)
      }

      // Combine existing documents (as objects with ID) and newly uploaded documents
      // Backend expects all documents as objects, not mixed strings/objects
      const existingDocumentsAsObjects = (formData.documents || [])
        .filter(doc => doc.id)
        .map(doc => ({
          id: doc.id,
          version: doc.version
        }))

      const allDocuments = [...existingDocumentsAsObjects, ...uploadedDocuments]

      // Merge form data with state to include id, version, and documents
      const activityData = formData.id
        ? { ...data, id: formData.id, version: formData.version, documents: allDocuments }
        : { ...data, documents: allDocuments }

      const payload = buildActivityPayload(
        activityData,
        { accessToken, userInfo, additionalData },
        {
          isUpdate: isUpdateMode
        }
      )
      return payload
    },
    [accessToken, userInfo, additionalData, isUpdateMode, formData, uploadFiles]
  )

  // Success handler
  const handleSuccess = useCallback(() => {
    if (onSuccess) {
      onSuccess(formData)
    }
  }, [formData, onSuccess])

  // RHF + Zod resolver provided to AppActionForm
  const form = useForm<any>({
    resolver: createActivitySegmentResolver(),
    defaultValues: {
      ...formData,
      ownerEmployeeId: userInfo?.employeeDetails?.employeeId || ''
    },
    mode: 'onChange'
  })

  return (
    <AppActionForm
      processType={isUpdateMode ? 'update' : 'create'}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onCancel={onCancel}
      formData={formData}
      form={form}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
      data-testid="investment-activity-process-dialog"
    >
      {/* Investment context header intentionally removed as requested */}

      <ActivitySegment
        // Let segment load type options from catalog
        accessToken={accessToken}
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
        // File upload handlers
        onFilesChange={(files: File[]) => {
          setFormData(prev => ({
            ...prev,
            _pendingFiles: [...(prev._pendingFiles || []), ...files]
          }))
        }}
        existingDocuments={formData.documents || []}
        onDocumentRemove={(documentId: string) => {
          setFormData(prev => ({
            ...prev,
            documents: prev.documents?.filter(doc => doc.id !== documentId) || []
          }))
        }}
        data-testid="activity-segment"
      />
    </AppActionForm>
  )
}

export default ActivityForm
