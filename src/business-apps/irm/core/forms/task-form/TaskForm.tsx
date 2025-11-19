import React, { useCallback, useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskLayout, buildTaskSchema } from '@/common/components/common-relations/form-layouts/task-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { buildInvestmentTaskPayload } from '@/common/data/investment/payloads/investmentRelationPayloads'
import type { InvestmentTaskFormData } from '@/common/data/investment/payloads/investmentRelationPayloads'
import { useInvestmentEntities } from '@/common/data/investment/hooks/useInvestmentEntities'
import { useInvestmentTask } from '@/common/data/investment/hooks/useInvestmentTask'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { useForm } from 'react-hook-form'
import { useFileClient } from '@/common/network/files/useFileClient'

type TaskFormData = z.infer<ReturnType<typeof buildTaskSchema>> & {
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
  initialValues?: TaskFormData
  onSubmit?: (task: TaskFormData) => Promise<void>
  onCancel?: () => Promise<void>
}

const InvestmentTaskForm: React.FC<InvestmentTaskFormProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onCancel = async () => {}
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
  const { task, isLoading: taskLoading } = useInvestmentTask(accessToken, taskId)

  const investmentId = platformParams.investmentId
  const accountId = platformParams.accountId
  const contactId = platformParams.contactId
  const opportunityId = platformParams.opportunityId
  const leadId = platformParams.leadId

  // Determine if entity selection should be shown
  const hasEntityFromContext = investmentId || accountId || contactId || opportunityId || leadId
  const shouldShowEntitySelection = !hasEntityFromContext

  // Build task schema with options
  const taskSchema = useMemo(
    () =>
      buildTaskSchema({
        requireAssignee: false,
        requireEntity: true,
        requireType: !((additionalData as any)?.typeRef === 'InvestmentTaskType:v1:APPROVAL')
      }),
    [additionalData]
  )

  // RHF + Zod resolver provided to AppActionForm
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
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
    // Helper to extract entity ID from object or string
    const getEntityId = (entity: any): string | undefined => {
      if (!entity) return undefined
      if (typeof entity === 'string') return entity
      return entity.id
    }

    // Also hydrate RHF defaults - only store entity IDs (strings), not objects
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
      // Only store entity IDs (strings), not objects
      investment: getEntityId(task.investment) || undefined,
      account: getEntityId(task.account) || undefined,
      contact: getEntityId(task.contact) || undefined,
      opportunity: getEntityId(task.opportunity) || undefined,
      lead: getEntityId(task.lead) || undefined,
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
    async (data: z.infer<typeof taskSchema>) => {
      try {
        // Pull full form values to include non-registered fields (account/contact/opportunity/lead)
        const allValues = (form as any).getValues?.() || {}

        // assignedUserId is maintained by TaskSegment effect; prefer the form value if present
        const assignedUserId = allValues.assignedUserId

        // Helper to extract entity ID from object or string
        const getEntityId = (entity: any): string | undefined => {
          if (!entity) return undefined
          if (typeof entity === 'string') return entity
          return entity.id
        }

        // Build entity ref from whichever field is set - return IDs as strings (not objects)
        const entityRef: Record<string, string> = {}
        const investmentId = getEntityId(allValues.investment)
        const accountId = getEntityId(allValues.account)
        const contactId = getEntityId(allValues.contact)
        const opportunityId = getEntityId(allValues.opportunity)
        const leadId = getEntityId(allValues.lead)

        if (investmentId) entityRef.investment = investmentId
        if (accountId) entityRef.account = accountId
        if (contactId) entityRef.contact = contactId
        if (opportunityId) entityRef.opportunity = opportunityId
        if (leadId) entityRef.lead = leadId

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
          // documents already processed in handlePreSubmit
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

  const handleCancel = async () => {
    await onCancel()
  }

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
    form.setValue('investment', investmentId)
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

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={formData.id ? 'update' : 'create'}
        onSubmit={handleSubmit}
        handlePreSubmit={handlePreSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={taskSchema}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid="investment-task-process-dialog"
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
          staticDefaults={{ taskTypeRef: isApprovalMode ? 'InvestmentTaskType:v1:APPROVAL' : undefined }}
          data-testid="investment-task-layout"
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default InvestmentTaskForm
