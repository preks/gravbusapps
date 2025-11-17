import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import ActivitySegment, {
  createActivitySegmentResolver,
  Activity
} from '@/common/components/common-relations/form-segments/activity-segment/ActivitySegment'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { useForm } from 'react-hook-form'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { useCustomerActivity } from '@/common/data/customer/hooks/useCustomerActivity'
import { useFileClient } from '@/common/network/files/useFileClient'
import { LocalizationProvider, type SupportedLocale } from '@newwork/nw-design-system'

export type ActivityFormProps = BusinessAppContextProps

const initialFormData: Activity = {
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

export const ActivityForm: React.FC<ActivityFormProps> = props => {
  const { accessToken, additionalData, userInfo } = props

  // Get owner employee ID from additionalData or userInfo
  const defaultOwnerEmployeeId = (additionalData as any)?.ownerEmployeeId || userInfo?.employeeDetails?.employeeId

  // Form state
  const [formData, setFormData] = useState<Activity>({
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
  const { activity, loading: activityLoading } = useCustomerActivity(
    { accessToken, userInfo, additionalData },
    activityId
  )

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
  const resolver = useMemo(() => createActivitySegmentResolver() as any, [])
  const form = useForm<any>({
    defaultValues: {
      ...initialFormData,
      ownerEmployeeId: defaultOwnerEmployeeId || ''
    },
    resolver,
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

    // Construct new form data
    const newFormData = {
      id: activity.id,
      title: activity.title || '',
      activityTypeRef: activity.activityType?.id || '',
      occurredAt: activity.occurredAt || '',
      description: activity.description || '',
      files: [],
      documents,
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
    setFormData(newFormData as unknown as Activity)

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
  }, [isUpdateMode, activity, activityLoading, hydrateById, form])

  // Form submission handler - supports both create and update
  const handleSubmit = useCallback(
    async (values: Activity) => {
      const changeMode = isUpdateMode ? 'UPDATE' : 'INSERT'

      // Upload pending files if any
      let uploadedDocuments: Array<{ name: string; fileInfo: any }> = []
      if (formData._pendingFiles && formData._pendingFiles.length > 0) {
        const tempId = formData.id || 'temp-' + Date.now()
        uploadedDocuments = await uploadFiles(formData._pendingFiles, tempId)
      }

      // Combine existing documents (as objects with ID) and newly uploaded documents
      const existingDocumentsAsObjects = (formData.documents || [])
        .filter(doc => doc.id)
        .map(doc => ({
          id: doc.id,
          version: doc.version
        }))

      const allDocuments = [...existingDocumentsAsObjects, ...uploadedDocuments]

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
          ...(platformParams.leadId && { lead: platformParams.leadId }),
          ...(platformParams.opportunityId && { opportunity: platformParams.opportunityId }),
          ...(platformParams.contactId && { contact: platformParams.contactId }),
          ...(platformParams.accountId && { account: platformParams.accountId }),
          description: values.description || '',
          ownerEmployee: values.ownerEmployeeId || additionalData?.employeeId,
          documents: allDocuments
        }
      }

      return payload
    },
    [additionalData, isUpdateMode, formData, platformParams, uploadFiles]
  )

  const accountId = additionalData?.accountId
  const contactId = additionalData?.contactId
  const opportunityId = additionalData?.opportunityId
  const leadId = additionalData?.leadId

  // Memoize to prevent infinite re-renders
  const typeCatalog = useMemo(
    () => ({ identifier: SALES_ACTIVITY_TYPE_CATALOG, version: SALES_ACTIVITY_TYPE_VERSION }),
    []
  )

  const initialEntityFromContext = useMemo(
    () => ({ accountId, contactId, opportunityId, leadId }),
    [accountId, contactId, opportunityId, leadId]
  )

  // Get locale for LocalizationProvider (needed for FileUpload component)
  const locale = getCurrentActiveUserLocale() as SupportedLocale

  return (
    <LocalizationProvider locale={locale}>
      <CatalogSelect.Provider accessToken={accessToken}>
        <AppActionForm
          processType={isUpdateMode ? 'update' : 'create'}
          onSubmit={handleSubmit}
          formData={formData}
          form={form}
          submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
          cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
          data-testid="sales-activity-process-dialog"
        >
          <div className="gba:w-full" data-testid="sales-activity-form-container">
            <h2
              className="gba:text-xl gba:font-bold! gba:mb-4 gba:text-center gba:text-[20px]!"
              data-testid="form-title"
            >
              {isUpdateMode
                ? getTranslationFromI18nKeyAndLabel('crm:salesActivity.editActivity', 'Edit Activity')
                : getTranslationFromI18nKeyAndLabel('crm:salesActivity.newActivity', 'New Activity')}
            </h2>

            <ActivitySegment
              typeCatalog={typeCatalog}
              showEntitySelection={false}
              initialEntityFromContext={initialEntityFromContext}
              titleLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.title', 'Title')}
              typeLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.type', 'Type')}
              dateLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.date', 'Date & Time')}
              descriptionLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.description', 'Description')}
              uploadFileLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.uploadFile', 'Attach Documents')}
              showOwnerSelection={true}
              assignees={mergedAssignees}
              assigneesLoading={employeesLoading}
              onAssigneeSearch={searchEmployees}
              assigneesHasMore={employeesHasMore}
              onAssigneeLoadMore={loadMoreEmployees}
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
              data-testid="sales-activity-segment"
            />
          </div>
        </AppActionForm>
      </CatalogSelect.Provider>
    </LocalizationProvider>
  )
}

export default ActivityForm
