import React, { useCallback, useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskLayout, buildTaskSchema } from '@/common/components/common-relations/form-layouts/task-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { buildCustomerTaskPayload } from '@/common/data/customer/payloads/customerRelationPayloads'
import type { CustomerTaskFormData } from '@/common/data/customer/payloads/customerRelationPayloads'
import { useCustomerRelatedEntities } from '@/common/data/customer/hooks/useCustomerRelatedEntities'
import { useCustomerTask } from '@/common/data/customer/hooks/useCustomerTask'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { useForm } from 'react-hook-form'
import { useFileClient } from '@/common/network/files/useFileClient'
import { Skeleton } from '@newwork/nw-design-system'

type TaskFormData = z.infer<ReturnType<typeof buildTaskSchema>> & {
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
 * Helper: Extract entity ID from object or string
 */
const getEntityId = (entity: any): string | undefined => {
  if (!entity) return undefined
  if (typeof entity === 'string') return entity
  return entity.id
}

/**
 * Helper: Build entity reference from form data or values
 * Extracts which CRM entity (account, contact, opportunity, lead) is associated with this task
 * Returns entity IDs as strings (not objects)
 */
const buildEntityRef = (formData: TaskFormData, allValues: any): any => {
  const refs: Record<string, string> = {}

  if (formData.id) {
    // UPDATE mode: use stored entity from formData
    const accountId = getEntityId((formData as any).account)
    const contactId = getEntityId((formData as any).contact)
    const opportunityId = getEntityId((formData as any).opportunity)
    const leadId = getEntityId((formData as any).lead)

    if (accountId) refs.account = accountId
    if (contactId) refs.contact = contactId
    if (opportunityId) refs.opportunity = opportunityId
    if (leadId) refs.lead = leadId
  } else {
    // CREATE mode: use entity from form selection
    const accountId = getEntityId(allValues.account)
    const contactId = getEntityId(allValues.contact)
    const opportunityId = getEntityId(allValues.opportunity)
    const leadId = getEntityId(allValues.lead)

    if (accountId) refs.account = accountId
    if (contactId) refs.contact = contactId
    if (opportunityId) refs.opportunity = opportunityId
    if (leadId) refs.lead = leadId
  }

  return refs
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
  // Customer task hook - declarative single-by-PK
  const taskId = platformParams.taskId
  const { task, isLoading: taskLoading } = useCustomerTask(accessToken, taskId || '')

  // File client for document uploads
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  const accountId = platformParams.accountId
  const contactId = platformParams.contactId
  const opportunityId = platformParams.opportunityId
  const leadId = platformParams.leadId

  // Determine if entity selection should be shown
  const hasEntityFromContext = accountId || contactId || opportunityId || leadId
  const shouldShowEntitySelection = !hasEntityFromContext

  // Load existing task when taskId is provided via additionalData
  React.useEffect(() => {
    if (!taskId || !task || taskLoading) {
      return
    }

    // Helper to extract entity ID from object or string
    const getEntityId = (entity: any): string | undefined => {
      if (!entity) return undefined
      if (typeof entity === 'string') return entity
      return entity.id
    }

    // Map fetched task to form fields - only store entity IDs (strings), not objects
    const newFormData = {
      id: task.id,
      version: (task as any).version,
      title: task.name || '',
      description: task.description || '',
      taskTypeRef: task.taskType?.id || '',
      taskPriorityRef: task.taskPriority?.id || '',
      taskStatusRef: task.taskStatus?.id || 'SalesTaskStatus:v1:PENDING',
      dueDate: task.dueDate || '',
      timingType: (task as any).taskTiming || 'DEADLINE',
      assignedEmployeeId: task.assignedEmployee?.id || '',
      relatedEntityId: task.account?.id || task.contact?.id || task.opportunity?.id || task.lead?.id || '',
      // Only store entity IDs (strings), not objects
      account: getEntityId(task.account) || undefined,
      contact: getEntityId(task.contact) || undefined,
      opportunity: getEntityId(task.opportunity) || undefined,
      lead: getEntityId(task.lead) || undefined,
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
    }

    // Note: form.reset was already called above with entity fields cleared
    // TaskSegment's useEffect will re-apply the entity from initialEntityFromContext
  }, [taskId, task, taskLoading, hydrateEntityById, hydrateById, form])

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

  // Build task schema with options
  const taskSchema = useMemo(
    () =>
      buildTaskSchema({
        requireAssignee: false,
        requireEntity: true,
        requireType: (additionalData as any)?.typeRef !== 'SalesTaskType:v1:APPROVAL'
      }),
    [additionalData]
  )

  // RHF + Zod resolver provided to AppActionForm
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: formData as any,
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
          // documents already processed in handlePreSubmit
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
    [accessToken, userInfo, additionalData, formData, employees, form]
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

  // Detect approval mode from additionalData.typeRef
  const typeRef =
    (additionalData as any)?.typeRef || (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.typeRef
  const isApprovalMode =
    typeRef === 'SalesTaskType:v1:APPROVAL' || (typeof typeRef === 'string' && typeRef.toLowerCase() === 'approval')

  // Show skeleton while loading
  if (taskLoading && taskId) {
    return (
      <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData}>
        <AppActionForm processType="update" form={form} data-testid="sales-task-process-dialog">
          <div className="gba:w-full gba:space-y-4">
            <Skeleton className="gba:h-10 gba:w-full" />
            <Skeleton className="gba:h-10 gba:w-full" />
            <Skeleton className="gba:h-32 gba:w-full" />
            <Skeleton className="gba:h-10 gba:w-full" />
          </div>
        </AppActionForm>
      </CatalogSelect.Provider>
    )
  }

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={formData.id ? 'update' : 'create'}
        onSubmit={handleFormSubmit}
        handlePreSubmit={handlePreSubmit}
        onSuccess={handleSuccess}
        onCancel={onCancel}
        formData={formData}
        form={form}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid="customer-task-process-dialog"
      >
        <TaskLayout
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
          loading={taskLoading && !!taskId}
          // show/hide
          showType={!isApprovalMode}
          staticDefaults={{ taskTypeRef: isApprovalMode ? 'SalesTaskType:v1:APPROVAL' : undefined }}
          data-testid="customer-task-layout"
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default CustomerTaskForm
