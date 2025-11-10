import React, { useCallback, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import TaskSegment, {
  TaskSegmentSchema,
  createTaskSegmentResolver
} from '@/common/components/common-relations/form-segments/task-segment/TaskSegment'
import { AppActionForm } from '@/components/app-action-form'
import { buildCustomerTaskPayload } from '@/common/data/customer/payloads'
import type { CustomerTaskFormData } from '@/common/data/customer/payloads/customerRelationPayloads'
import { useCustomerRelatedEntities, useCustomerTasks } from '@/common/data/customer/hooks'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { useForm } from 'react-hook-form'
import { useFileClient } from '@/common/network/files/useFileClient'
import { LocalizationProvider, type SupportedLocale } from '@newwork/nw-design-system'

type TaskFormData = TaskSegmentSchema & {
  id?: string
  version?: number
  documents?: Array<{
    id: string
    name?: string
    version?: number
  }>
  _pendingFiles?: File[] // Files pending upload (not sent to backend)
}

const initialFormData: TaskFormData = {
  title: '',
  description: '',
  taskTypeRef: '',
  taskPriorityRef: '',
  taskStatusRef: 'SalesTaskStatus:v1:PENDING',
  dueDate: '',
  timingType: 'DEADLINE',
  assignedEmployeeId: '',
  relatedEntityId: '',
  documents: [],
  _pendingFiles: []
}

const TASK_TYPE_CATALOG = 'SalesTaskType'
const TASK_PRIORITY_CATALOG = 'SalesTaskPriority'
const TASK_STATUS_CATALOG = 'SalesTaskStatus'

/**
 * Helper: Build entity reference from form data or values
 * Extracts which CRM entity (account, contact, opportunity, lead) is associated with this task
 */
const buildEntityRef = (formData: TaskFormData, allValues: any): any => {
  if (formData.id) {
    // UPDATE mode: use stored entity from formData
    if ((formData as any).account?.id) return { account: { id: (formData as any).account.id } }
    if ((formData as any).contact?.id) return { contact: { id: (formData as any).contact.id } }
    if ((formData as any).opportunity?.id) return { opportunity: { id: (formData as any).opportunity.id } }
    if ((formData as any).lead?.id) return { lead: { id: (formData as any).lead.id } }
    return {}
  }

  // CREATE mode: use entity from form selection
  if (allValues.account?.id) return { account: { id: allValues.account.id } }
  if (allValues.contact?.id) return { contact: { id: allValues.contact.id } }
  if (allValues.opportunity?.id) return { opportunity: { id: allValues.opportunity.id } }
  if (allValues.lead?.id) return { lead: { id: allValues.lead.id } }
  return {}
}

export interface CustomerTaskFormProps extends BusinessAppContextProps {
  onSuccess?: (task: TaskFormData) => void
  onCancel?: () => void
}

const CustomerTaskForm: React.FC<CustomerTaskFormProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onSuccess,
  onCancel
}: CustomerTaskFormProps) => {
  const [formData, setFormData] = useState<TaskFormData>({
    ...initialFormData,
    assignedEmployeeId: userInfo?.employeeDetails?.employeeId || ''
  })
  const {
    entities,
    loading: entitiesLoading,
    error: entitiesError,
    searchEntities,
    hasMore: entitiesHasMore,
    loadMore: loadMoreEntities,
    hydrateEntityById
  } = useCustomerRelatedEntities({ accessToken, additionalData })
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
  const { fetchCustomerTaskById } = useCustomerTasks({ accessToken, userInfo, additionalData })

  // File client for document uploads
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Resolve IDs from additionalData (platform may pass ids inside psi_taskPayload.psi_initialParameters)
  const nested =
    (additionalData as any)?.psi_taskPayload?.psi_initialParameters ||
    (additionalData as any)?.psi_initialParameters ||
    {}
  const platformParams = {
    taskId: (additionalData as any)?.taskId || nested?.taskId,
    employeeId: (additionalData as any)?.employeeId || nested?.employeeId,
    accountId: (additionalData as any)?.accountId || nested?.accountId,
    contactId: (additionalData as any)?.contactId || nested?.contactId,
    opportunityId: (additionalData as any)?.opportunityId || nested?.opportunityId,
    leadId: (additionalData as any)?.leadId || nested?.leadId
  } as {
    taskId?: string
    employeeId?: string
    accountId?: string
    contactId?: string
    opportunityId?: string
    leadId?: string
  }

  const accountId = platformParams.accountId
  const contactId = platformParams.contactId
  const opportunityId = platformParams.opportunityId
  const leadId = platformParams.leadId

  // Determine if entity selection should be shown
  const hasEntityFromContext = accountId || contactId || opportunityId || leadId
  const shouldShowEntitySelection = !hasEntityFromContext

  // Track if we've loaded this specific task to force reload on remount
  const loadedTaskRef = React.useRef<string | null>(null)

  // Load existing task when taskId is provided via additionalData
  React.useEffect(() => {
    const taskId = platformParams.taskId

    if (!taskId) {
      loadedTaskRef.current = null
      return
    }

    // Force reload if: 1) never loaded, OR 2) different task, OR 3) same task but form remounted
    // We check if loadedTaskRef is different to trigger reload even for the same taskId
    const shouldLoad = loadedTaskRef.current !== taskId

    if (!shouldLoad) {
      return
    }

    loadedTaskRef.current = taskId
    ;(async () => {
      try {
        const task = await fetchCustomerTaskById(taskId)

        if (!task) {
          console.warn('⚠️ No task found for ID:', taskId)
          return
        }

        // Map fetched task to form fields
        const newFormData = {
          id: task.id,
          version: (task as any).version,
          title: task.name || '',
          description: task.description || '',
          taskTypeRef: task.type?.id || '',
          taskPriorityRef: task.priority?.id || '',
          taskStatusRef: task.status?.id || 'SalesTaskStatus:v1:PENDING',
          dueDate: task.dueDate || '',
          timingType: (task as any).timingType || 'DEADLINE',
          assignedEmployeeId: task.assignedEmployee?.id || '',
          relatedEntityId: task.account?.id || task.contact?.id || task.opportunity?.id || task.lead?.id || '',
          // Store entity objects for UPDATE mode (even though we hide the field)
          account: task.account ? { id: task.account.id } : undefined,
          contact: task.contact ? { id: task.contact.id } : undefined,
          opportunity: task.opportunity ? { id: task.opportunity.id } : undefined,
          lead: task.lead ? { id: task.lead.id } : undefined,
          documents:
            (task as any).documents?.map((doc: any) => ({
              id: doc.id,
              name: doc.name || '',
              version: doc.version,
              file: doc.file || doc.fileInfo?.fileId,
              fileInfo: doc.fileInfo,
              mimeType: doc.fileInfo?.fileMetadata?.mimeType || doc.mimeType,
              fileSize: doc.fileInfo?.fileMetadata?.fileSize || doc.fileSize
            })) || []
        }

        setFormData((prev: TaskFormData) => ({ ...prev, ...newFormData }))

        form.reset({
          ...newFormData,
          // Clear entity objects to force TaskSegment to re-apply initialEntityFromContext
          account: undefined,
          contact: undefined,
          opportunity: undefined,
          lead: undefined,
          relatedEntityId: ''
        })

        // Ensure the related entity is hydrated and pinned so the combobox trigger keeps rich label
        const relId = task.account?.id || task.contact?.id || task.opportunity?.id || task.lead?.id
        if (relId) {
          if (task.account?.id) {
            hydrateEntityById('account', task.account.id)
          } else if (task.contact?.id) {
            hydrateEntityById('contact', task.contact.id)
          } else if (task.opportunity?.id) {
            hydrateEntityById('opportunity', task.opportunity.id)
          } else if (task.lead?.id) {
            hydrateEntityById('lead', task.lead.id)
          }
        } else {
          console.warn('⚠️ No related entity found in task data')
        }

        // Prefill assignee option so Combobox can display the name before search results
        if (task.assignedEmployee?.id) {
          const displayName =
            task.assignedEmployee.displayName ||
            `${task.assignedEmployee.firstName || ''} ${task.assignedEmployee.lastName || ''}`.trim() ||
            'Unknown'
          setAssigneePrefill([{ id: task.assignedEmployee.id, displayName }])
          // Hydrate details for the selected employee so avatar/job/unit appear immediately
          hydrateById(task.assignedEmployee.id)
        } else {
          console.warn('⚠️ No assignedEmployee found in task data')
        }

        // Note: form.reset was already called above with entity fields cleared
        // TaskSegment's useEffect will re-apply the entity from initialEntityFromContext
      } catch (e) {
        console.error('Error loading task:', e)
        loadedTaskRef.current = null // Reset on error so it can retry
      }
    })()
  }, [platformParams.taskId, accessToken])

  // Prefill current user as default assignee in create mode so Combobox shows a label
  React.useEffect(() => {
    if (platformParams.taskId) return // update mode handled above
    const id = platformParams.employeeId || userInfo?.employeeDetails?.employeeId
    if (!id) return
    const displayName =
      `${userInfo?.employeeDetails?.firstName || ''} ${userInfo?.employeeDetails?.lastName || ''}`.trim() ||
      userInfo?.userName ||
      'Current User'
    setAssigneePrefill([{ id, displayName }])
    // Hydrate minimal details for initial selection
    hydrateById(id)
  }, [platformParams.taskId, platformParams.employeeId, userInfo, hydrateById])

  // Merge prefilled assignee option with live search results, de-duplicated by id
  const assigneeMap = new Map<
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
    assigneeMap.set(o.id, o)
  }
  for (const e of employees) {
    const employeeRecord = e as Record<string, any>
    assigneeMap.set(e.id, {
      id: e.id,
      displayName: e.displayName,
      userId: e.userId,
      pictureThumbnail: employeeRecord.pictureThumbnail,
      organizationalUnitName: employeeRecord.organizationalUnitName,
      jobPositionName: employeeRecord.jobPositionName
    })
  }
  const mergedAssignees = Array.from(assigneeMap.values())

  // RHF + Zod resolver provided to AppActionForm
  const form = useForm<any>({
    resolver: createTaskSegmentResolver({
      requireAssignee: false,
      requireEntity: true,
      requireType: (additionalData as any)?.typeRef !== 'SalesTaskType:v1:APPROVAL'
    }),
    defaultValues: formData,
    mode: 'onChange'
  })

  // Upload files to storage and return document metadata
  const uploadFiles = useCallback(
    async (files: File[], entityId: string): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      const uploadPromises = files.map(async file => {
        const folderPath = `/customerRelations/tasks/${entityId}/documents`

        // Ensure we have a valid MIME type - fallback to octet-stream if empty
        const mimeType = file.type || 'application/octet-stream'

        const result = await fileClient.uploadFile(
          file,
          { accessScope: 'tenant' },
          {
            appName: 'customerRelations',
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

  const handleSubmit = useCallback(
    async (data: TaskSegmentSchema) => {
      try {
        // Pull full form values to include non-registered fields (account/contact/opportunity/lead)
        const allValues = (form as any).getValues?.() || {}

        // assignedUserId is maintained by TaskSegment effect; prefer the form value if present
        const assignedUserId = allValues.assignedUserId

        // Build entity ref from whichever field is set
        // In UPDATE mode, get entity from formData (since we hide the field and clear form values)
        // In CREATE mode, get entity from allValues (from form selection)
        const entityRef = buildEntityRef(formData, allValues)

        // Upload pending files if any
        let uploadedDocuments: Array<{ name: string; fileInfo: any }> = []
        if (formData._pendingFiles && formData._pendingFiles.length > 0) {
          // Use a temporary ID for folder structure during upload
          const tempId = formData.id || 'temp-' + Date.now()
          uploadedDocuments = await uploadFiles(formData._pendingFiles, tempId)
        }

        // Combine existing documents (as objects with ID) and newly uploaded documents
        // Backend expects all documents as objects, not mixed strings/objects
        const existingDocumentsAsObjects = (formData.documents || [])
          .filter((doc: any) => doc.id) // Only existing docs with IDs
          .map((doc: any) => ({
            id: doc.id,
            version: doc.version
          }))

        const allDocuments = [...existingDocumentsAsObjects, ...uploadedDocuments]

        const base: CustomerTaskFormData = {
          title: data.title,
          description: data.description || '',
          taskTypeRef: data.taskTypeRef,
          taskPriorityRef: data.taskPriorityRef,
          taskStatusRef: data.taskStatusRef,
          taskTiming: allValues.timingType || data.timingType,
          dueDate: data.dueDate || null,
          templateStartDate: allValues.templateStartDate || null,
          startDate: allValues.startDate || null,
          endDate: allValues.endDate || null,
          assignedEmployeeId: data.assignedEmployeeId,
          assignedUserId: assignedUserId,
          // Creator fields: in UPDATE mode use stored values, in CREATE mode use current user
          creatorEmployeeId:
            allValues.creatorEmployeeId || userInfo?.employeeDetails?.employeeId || (userInfo as any)?.employeeId,
          creatorUserId: allValues.creatorUserId || userInfo?.id,
          documents: allDocuments, // Always send array (empty array deletes all documents)
          ...entityRef
        }

        // Only pass id/version when updating
        const mapped: CustomerTaskFormData = formData.id
          ? { ...base, id: formData.id, version: formData.version }
          : base

        const payload = buildCustomerTaskPayload(
          mapped,
          { accessToken, userInfo, additionalData },
          { isUpdate: Boolean(formData.id) }
        )

        return payload
      } catch (error) {
        console.error('Error submitting task:', error)
        throw error
      }
    },
    [accessToken, userInfo, additionalData, formData, employees, form, uploadFiles]
  )

  const handleSuccess = useCallback(() => {
    onSuccess?.(formData)
  }, [formData, onSuccess])

  const handleFormSubmit = useCallback(
    async (data: any) => {
      try {
        const result = await handleSubmit(data)
        return result
      } catch (error) {
        console.error('Form submission failed:', error)
        throw error
      }
    },
    [handleSubmit, formData]
  )

  const handleEntitySearch = useCallback(
    (q: string) => {
      searchEntities(q)
    },
    [searchEntities]
  )

  // Trigger initial search to load some default entities
  React.useEffect(() => {
    if (accessToken && !platformParams.taskId) {
      // Only trigger initial search in create mode
      searchEntities('')
    }
  }, [accessToken, platformParams.taskId, searchEntities])

  // Handle customer-specific entity context (extends common TaskSegment behavior)
  React.useEffect(() => {
    if (!accountId && !contactId && !opportunityId && !leadId) return
    const hasEntity = Boolean(
      form.getValues('account') || form.getValues('contact') || form.getValues('opportunity') || form.getValues('lead')
    )
    if (hasEntity) return

    // Set entity in form based on what's available
    if (accountId) {
      form.setValue('account', { id: accountId })
      form.setValue('relatedEntityId', accountId)
      hydrateEntityById('account', accountId)
    } else if (contactId) {
      form.setValue('contact', { id: contactId })
      form.setValue('relatedEntityId', contactId)
      hydrateEntityById('contact', contactId)
    } else if (opportunityId) {
      form.setValue('opportunity', { id: opportunityId })
      form.setValue('relatedEntityId', opportunityId)
      hydrateEntityById('opportunity', opportunityId)
    } else if (leadId) {
      form.setValue('lead', { id: leadId })
      form.setValue('relatedEntityId', leadId)
      hydrateEntityById('lead', leadId)
    }
  }, [accountId, contactId, opportunityId, leadId, form, hydrateEntityById])

  // Detect approval mode from additionalData.typeRef
  const typeRef =
    (additionalData as any)?.typeRef || (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.typeRef
  const isApprovalMode =
    typeRef === 'SalesTaskType:v1:APPROVAL' || (typeof typeRef === 'string' && typeRef.toLowerCase() === 'approval')

  // Get locale for LocalizationProvider (needed for FileUpload component)
  const locale = getCurrentActiveUserLocale() as SupportedLocale

  return (
    <LocalizationProvider locale={locale}>
      <AppActionForm
        processType={formData.id ? 'update' : 'create'}
        onSubmit={handleFormSubmit}
        onSuccess={handleSuccess}
        onCancel={onCancel}
        formData={formData}
        form={form}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid="customer-task-process-dialog"
      >
        <TaskSegment
          // labels
          titleLabel={
            isApprovalMode
              ? getTranslationFromI18nKeyAndLabel('crm:salesTask.title', 'Approval Name')
              : getTranslationFromI18nKeyAndLabel('crm:salesTask.title', 'Task Name')
          }
          descriptionLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.description', 'Description')}
          deadlineLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.deadline', 'Deadline')}
          typeLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.type', 'Type')}
          priorityLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.priority', 'Priority')}
          statusLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.status', 'Status')}
          assigneeLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.assignedTo', 'Assigned To')}
          entityLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.relatedEntity', 'Related Entity')}
          uploadFileLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.uploadFile', 'Attach Documents')}
          onFilesChange={(files: File[]) => {
            // Store files pending upload (will be uploaded on submit)
            setFormData((prev: TaskFormData) => ({
              ...prev,
              _pendingFiles: [...(prev._pendingFiles || []), ...files]
            }))
          }}
          existingDocuments={formData.documents || []}
          onDocumentRemove={(documentId: string) => {
            // Remove document from list - backend will handle deletion
            setFormData((prev: TaskFormData) => ({
              ...prev,
              documents: prev.documents?.filter((doc: any) => doc.id !== documentId) || []
            }))
          }}
          timingTypeLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.timingType', 'Timing Type')}
          // catalogs
          accessToken={accessToken}
          typeCatalog={{ identifier: TASK_TYPE_CATALOG, version: 'v1' }}
          priorityCatalog={{ identifier: TASK_PRIORITY_CATALOG, version: 'v1' }}
          statusCatalog={{ identifier: TASK_STATUS_CATALOG, version: 'v1' }}
          // entity search
          // Hide entity selection if entity is provided from context OR if updating existing task
          showEntitySelection={shouldShowEntitySelection && !formData.id}
          requireEntity={!formData.id}
          showAssigneeSelection={true}
          entities={entities}
          entitiesLoading={entitiesLoading}
          entitiesError={Boolean(entitiesError)}
          entitiesHasMore={entitiesHasMore}
          onEntitySearch={handleEntitySearch}
          onEntityLoadMore={loadMoreEntities}
          // For UPDATE: pass task's entity IDs from form. For CREATE: pass context entity IDs
          initialEntityFromContext={
            formData.id
              ? {
                  accountId: (formData as any).account?.id,
                  contactId: (formData as any).contact?.id,
                  opportunityId: (formData as any).opportunity?.id,
                  leadId: (formData as any).lead?.id
                }
              : { accountId, contactId, opportunityId, leadId }
          }
          // assignee combobox
          assignees={mergedAssignees}
          assigneesLoading={employeesLoading}
          onAssigneeSearch={searchEmployees}
          assigneesHasMore={employeesHasMore}
          onAssigneeLoadMore={loadMoreEmployees}
          data-testid="customer-task-segment"
          // show/hide
          showType={!isApprovalMode}
          staticDefaults={{ taskTypeRef: isApprovalMode ? 'SalesTaskType:v1:APPROVAL' : undefined }}
        />
      </AppActionForm>
    </LocalizationProvider>
  )
}

export default CustomerTaskForm
