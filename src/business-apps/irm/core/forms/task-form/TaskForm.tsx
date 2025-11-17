import React, { useCallback, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import TaskSegment, {
  TaskSegmentSchema
} from '@/common/components/common-relations/form-segments/task-segment/TaskSegment'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { buildInvestmentTaskPayload } from '@/common/data/investment/payloads/investmentRelationPayloads'
import type { InvestmentTaskFormData } from '@/common/data/investment/payloads/investmentRelationPayloads'
import { useInvestmentEntities } from '@/common/data/investment/hooks/useInvestmentEntities'
import { useInvestmentTask } from '@/common/data/investment/hooks/useInvestmentTask'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { useForm } from 'react-hook-form'
import { createTaskSegmentResolver } from '@/common/components/common-relations/form-segments/task-segment/TaskSegment'
import { useFileClient } from '@/common/network/files/useFileClient'
import { LocalizationProvider, type SupportedLocale } from '@newwork/nw-design-system'

type TaskFormData = TaskSegmentSchema & {
  id?: string
  version?: number
  code?: string
  documents?: Array<{
    id: string
    name?: string
    version?: number
  }>
  _pendingFiles?: File[] // Files pending upload (not sent to backend)
}

const initialFormData: TaskFormData = {
  title: '',
  code: '',
  description: '',
  taskTypeRef: '',
  taskPriorityRef: '',
  taskStatusRef: 'InvestmentTaskStatus:v1:PENDING',
  dueDate: '',
  timingType: 'DEADLINE',
  assignedEmployeeId: '',
  relatedEntityId: '',
  documents: [],
  _pendingFiles: []
}

const TASK_TYPE_CATALOG = 'InvestmentTaskType'
const TASK_PRIORITY_CATALOG = 'InvestmentTaskPriority'
const TASK_STATUS_CATALOG = 'InvestmentTaskStatus'

export interface InvestmentTaskFormProps extends BusinessAppContextProps {
  onSuccess?: (task: TaskFormData) => void
  onCancel?: () => void
}

const InvestmentTaskForm: React.FC<InvestmentTaskFormProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onSuccess,
  onCancel
}: InvestmentTaskFormProps) => {
  const [formData, _setFormData] = useState<TaskFormData>({
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
  } = useInvestmentEntities({ accessToken, additionalData })
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
    investmentId: (additionalData as any)?.investmentId || nested?.investmentId,
    accountId: (additionalData as any)?.accountId || nested?.accountId,
    contactId: (additionalData as any)?.contactId || nested?.contactId,
    opportunityId: (additionalData as any)?.opportunityId || nested?.opportunityId,
    leadId: (additionalData as any)?.leadId || nested?.leadId
  } as {
    taskId?: string
    employeeId?: string
    investmentId?: string
    accountId?: string
    contactId?: string
    opportunityId?: string
    leadId?: string
  }

  // Investment task hook - declarative single-by-PK
  const taskId = platformParams.taskId
  const { task, isLoading: taskLoading } = useInvestmentTask({ accessToken, userInfo, additionalData }, taskId)

  const investmentId = platformParams.investmentId
  const accountId = platformParams.accountId
  const contactId = platformParams.contactId
  const opportunityId = platformParams.opportunityId
  const leadId = platformParams.leadId

  // Determine if entity selection should be shown
  const hasEntityFromContext = investmentId || accountId || contactId || opportunityId || leadId
  const shouldShowEntitySelection = !hasEntityFromContext

  // RHF + Zod resolver provided to AppActionForm
  const form = useForm<any>({
    resolver: createTaskSegmentResolver({
      requireAssignee: false,
      requireEntity: true,
      requireType: !((additionalData as any)?.typeRef === 'InvestmentTaskType:v1:APPROVAL')
    }),
    defaultValues: formData as any,
    mode: 'onChange'
  })

  // Load existing task when taskId is provided via additionalData
  React.useEffect(() => {
    if (!taskId || !task || taskLoading) {
      return
    }

    // Map fetched task to form fields
    const newFormData = {
      id: task.id,
      version: (task as any).version,
      title: task.name || '',
      code: task.code || '',
      description: task.description || '',
      taskTypeRef: task.taskType?.id || '',
      taskPriorityRef: task.taskPriority?.id || '',
      taskStatusRef: task.taskStatus?.id || 'InvestmentTaskStatus:v1:PENDING',
      dueDate: task.dueDate || '',
      timingType: (task.taskTiming as any) || 'DEADLINE',
      assignedEmployeeId: task.assignedEmployee?.id || '',
      relatedEntityId:
        task.investment?.id || task.account?.id || task.contact?.id || task.opportunity?.id || task.lead?.id || '',
      documents:
        (task as any).documents?.map((doc: any) => ({
          id: doc.id,
          name: doc.name || '',
          version: doc.version
        })) || []
    }

    _setFormData((prev: TaskFormData) => ({ ...prev, ...newFormData }))

    // CRITICAL: Also update the React Hook Form values
    form.reset(newFormData)
    // Ensure the related entity is hydrated and pinned so the combobox trigger keeps rich label
    const relId = task.investment?.id || task.account?.id || task.contact?.id || task.opportunity?.id || task.lead?.id
    if (relId) {
      if (task.investment?.id) hydrateEntityById('investment', task.investment.id)
      else if (task.account?.id) hydrateEntityById('account', task.account.id)
      else if (task.contact?.id) hydrateEntityById('contact', task.contact.id)
      else if (task.opportunity?.id) hydrateEntityById('opportunity', task.opportunity.id)
      else if (task.lead?.id) hydrateEntityById('lead', task.lead.id)
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
    // Also hydrate RHF defaults
    form.reset({
      title: task.name || '',
      description: task.description || '',
      taskTypeRef: task.taskType?.id || '',
      taskPriorityRef: task.taskPriority?.id || '',
      taskStatusRef: task.taskStatus?.id || '',
      dueDate: task.dueDate || '',
      timingType: (task.taskTiming as any) || 'DEADLINE',
      assignedEmployeeId: task.assignedEmployee?.id || '',
      assignedUserId: (task as any).assignedUserId || undefined,
      creatorEmployeeId: task.creatorEmployee?.id || undefined,
      creatorUserId: (task as any).creatorUserId || undefined,
      relatedEntityId:
        task.investment?.id || task.account?.id || task.contact?.id || task.opportunity?.id || task.lead?.id || '',
      investment: task.investment ? { id: task.investment.id } : undefined,
      account: task.account ? { id: task.account.id } : undefined,
      contact: task.contact ? { id: task.contact.id } : undefined,
      opportunity: task.opportunity ? { id: task.opportunity.id } : undefined,
      lead: task.lead ? { id: task.lead.id } : undefined,
      documents:
        (task as any).documents?.map((doc: any) => ({
          id: doc.id,
          name: doc.name || '',
          version: doc.version
        })) || []
    })
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

  // Upload files to storage and return document metadata
  const uploadFiles = useCallback(
    async (files: File[], entityId: string): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      const uploadPromises = files.map(async file => {
        const folderPath = `/investmentRelations/tasks/${entityId}/documents`

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

  const handleSubmit = useCallback(
    async (data: TaskSegmentSchema) => {
      try {
        // Pull full form values to include non-registered fields (account/contact/opportunity/lead)
        const allValues = (form as any).getValues?.() || {}

        // assignedUserId is maintained by TaskSegment effect; prefer the form value if present
        const assignedUserId = allValues.assignedUserId

        // Build entity ref from whichever field is set
        const entityRef = (() => {
          if (allValues.investment?.id) return { investment: { id: allValues.investment.id } }
          if (allValues.account?.id) return { account: { id: allValues.account.id } }
          if (allValues.contact?.id) return { contact: { id: allValues.contact.id } }
          if (allValues.opportunity?.id) return { opportunity: { id: allValues.opportunity.id } }
          if (allValues.lead?.id) return { lead: { id: allValues.lead.id } }
          return {} as any
        })()

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

        const base: InvestmentTaskFormData = {
          title: data.title,
          code: formData.code,
          description: data.description || '',
          taskTypeRef: data.taskTypeRef,
          taskPriorityRef: data.taskPriorityRef,
          taskStatusRef: data.taskStatusRef,
          taskTiming: (allValues.timingType || data.timingType) as any,
          dueDate: data.dueDate || null,
          templateStartDate: allValues.templateStartDate || null,
          startDate: allValues.startDate || null,
          endDate: allValues.endDate || null,
          assignedEmployeeId: data.assignedEmployeeId,
          assignedUserId: assignedUserId,
          creatorEmployeeId: allValues.creatorEmployeeId,
          creatorUserId: allValues.creatorUserId,
          documents: allDocuments, // Always send array (empty array deletes all documents)
          ...(entityRef as any)
        }

        // Only pass id/version when updating
        const mapped: InvestmentTaskFormData = formData.id
          ? { ...base, id: formData.id, version: formData.version }
          : base

        const payload = buildInvestmentTaskPayload(
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

  // Handle investment-specific entity context (extends common TaskSegment behavior)
  React.useEffect(() => {
    if (!investmentId) return
    const hasEntity = Boolean(
      form.getValues('investment') ||
        form.getValues('account') ||
        form.getValues('contact') ||
        form.getValues('opportunity') ||
        form.getValues('lead')
    )
    if (hasEntity) return

    // Set investment entity in form
    form.setValue('investment', { id: investmentId })
    form.setValue('relatedEntityId', investmentId)

    // Hydrate investment details for display
    hydrateEntityById('investment', investmentId)
  }, [investmentId, form, hydrateEntityById])

  // Detect approval mode from additionalData.typeRef
  const typeRef =
    (additionalData as any)?.typeRef || (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.typeRef
  const isApprovalMode =
    typeRef === 'InvestmentTaskType:v1:APPROVAL' ||
    (typeof typeRef === 'string' && typeRef.toLowerCase() === 'approval')

  // Get locale for LocalizationProvider (needed for FileUpload component)
  const locale = getCurrentActiveUserLocale() as SupportedLocale

  return (
    <LocalizationProvider locale={locale}>
      <CatalogSelect.Provider accessToken={accessToken}>
        <AppActionForm
          processType={formData.id ? 'update' : 'create'}
          onSubmit={handleFormSubmit}
          onSuccess={handleSuccess}
          onCancel={onCancel}
          formData={formData}
          form={form}
          submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
          cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
          data-testid="investment-task-process-dialog"
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
              _setFormData((prev: TaskFormData) => ({
                ...prev,
                _pendingFiles: [...(prev._pendingFiles || []), ...files]
              }))
            }}
            existingDocuments={formData.documents || []}
            onDocumentRemove={(documentId: string) => {
              // Remove document from list - backend will handle deletion
              _setFormData((prev: TaskFormData) => ({
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
            // Hide entity selection if entity is provided from context
            showEntitySelection={shouldShowEntitySelection}
            requireEntity={true}
            showAssigneeSelection={true}
            entities={entities}
            entitiesLoading={entitiesLoading}
            entitiesError={Boolean(entitiesError)}
            entitiesHasMore={entitiesHasMore}
            onEntitySearch={handleEntitySearch}
            onEntityLoadMore={loadMoreEntities}
            initialEntityFromContext={{ accountId, contactId, opportunityId, leadId }}
            // assignee combobox
            assignees={mergedAssignees}
            assigneesLoading={employeesLoading}
            onAssigneeSearch={searchEmployees}
            assigneesHasMore={employeesHasMore}
            onAssigneeLoadMore={loadMoreEmployees}
            data-testid="investment-task-segment"
            // show/hide
            showType={!isApprovalMode}
            staticDefaults={{ taskTypeRef: isApprovalMode ? 'InvestmentTaskType:v1:APPROVAL' : undefined }}
          />
        </AppActionForm>
      </CatalogSelect.Provider>
    </LocalizationProvider>
  )
}

export default InvestmentTaskForm
