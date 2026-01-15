import React, { useMemo, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskLayout, taskSchema } from '@/common/components/common-relations/form-layouts/task-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { type CustomerTask, buildCustomerTaskPayload } from '@/common/data/customer/types/customerTaskTypes'
import { useCustomerRelatedEntities } from '@/common/data/customer/hooks/useCustomerRelatedEntities'
import { useCustomerTask } from '@/common/data/customer/hooks/useCustomerTask'
import { useForm } from 'react-hook-form'
import { useFileClient } from '@/common/network/files/useFileClient'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getReferenceEntityType } from '@/common/data/customer/utils'
import { FILE_CONTEXT, APP_NAME, getFileEntityFromType } from '@/common/data/customer/constants/customerConstants'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'

type TaskFormData = z.infer<typeof taskSchema> & {
  id?: string
  version?: number
  documents?: Array<{
    id: string
    name?: string
    version?: number
  }>
  _pendingFiles?: File[] // Files pending upload (not sent to backend)
}

const TASK_TYPE_CATALOG = 'SalesTaskType:v1'
const TASK_PRIORITY_CATALOG = 'SalesTaskPriority:v1'
const TASK_STATUS_CATALOG = 'SalesTaskStatus:v1'

export interface TaskFormProps extends BusinessAppContextProps {
  onSuccess?: (task: TaskFormData) => void
  onCancel?: () => void
}

export const TaskForm: React.FC<TaskFormProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onSuccess,
  onCancel
}: TaskFormProps) => {
  const initialParameters = useMemo(() => {
    return additionalData?.psi_taskPayload?.psi_initialParameters || null
  }, [additionalData])

  const {
    entities,
    loading: entitiesLoading,
    searchEntities,
    hasMore: entitiesHasMore,
    loadMore: loadMoreEntities,
    hydrateEntityById
  } = useCustomerRelatedEntities({ accessToken, additionalData })

  // Customer task hook - declarative single-by-PK
  const taskId = additionalData?.taskId || initialParameters?.taskId || null
  const { task, loading: taskLoading, error } = useCustomerTask(accessToken || '', taskId)

  // File client for document uploads
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  const accountId = additionalData?.accountId || initialParameters?.accountId || null
  const contactId = additionalData?.contactId || initialParameters?.contactId || null
  const opportunityId = additionalData?.opportunityId || initialParameters?.opportunityId || null
  const leadId = additionalData?.leadId || initialParameters?.leadId || null

  // Get dueDate from additionalData or initialParameters (for calendar quick actions)
  const dueDate = additionalData?.dueDate || initialParameters?.dueDate || null

  // Extract typeRef from additionalData or initialParameters
  const typeRef = additionalData?.typeRef || initialParameters?.typeRef || null

  // Determine if this is an Approval task (for assignee mode control only)
  const isApprovalTask = typeRef?.toUpperCase()?.includes('APPROVAL') ?? false

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema) as any,
    defaultValues: {
      ...mapToFormValues(task || {}, taskSchema),
      // Include dueDate from context if provided (e.g., from calendar quick action)
      ...(dueDate && !taskId ? { dueDate } : {})
    } as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const relatedEntityIds = useMemo(
    () => ({
      accountId: task?.accountId || accountId,
      contactId: task?.contactId || contactId,
      opportunityId: task?.opportunityId || opportunityId,
      leadId: task?.leadId || leadId
    }),
    [accountId, contactId, opportunityId, leadId, task]
  )

  // Calculate if entity selection should be shown (no entity context exists)
  const shouldShowEntitySelection = useMemo(
    () =>
      !(
        relatedEntityIds.accountId ||
        relatedEntityIds.contactId ||
        relatedEntityIds.opportunityId ||
        relatedEntityIds.leadId
      ),
    [relatedEntityIds]
  )

  const taskRef = useRef(task)

  // Watch assignedEmployeeIds and sync taskAssignees array
  const assignedEmployeeIds = form.watch('assignedEmployeeIds')
  useEffect(() => {
    if (!assignedEmployeeIds) return

    const currentTaskAssignees = form.getValues('taskAssignees') || []
    const existingAssigneesMap = new Map(currentTaskAssignees.map((ta: any) => [ta.assignedEmployeeId, ta]))

    // Get employee objects from form state (set by MultiEmployeeSelect)
    const assignedEmployees = form.getValues('assignedEmployees') || []

    // Build new taskAssignees array, preserving existing IDs and versions
    const newTaskAssignees = assignedEmployeeIds.map((employeeId: string) => {
      const existing = existingAssigneesMap.get(employeeId)

      // Get employee data (for userId) - try multiple sources
      // 1. From task object (for existing assignees loaded from backend)
      let employee = task?.taskAssignees?.find((ta: any) => ta.assignedEmployee?.id === employeeId)?.assignedEmployee
      // 2. From form state (for newly added assignees from MultiEmployeeSelect)
      employee ??= assignedEmployees.find((emp: any) => emp.id === employeeId)

      return {
        ...(existing?.id && { id: existing.id }),
        ...(existing?.version !== undefined && { version: existing.version }),
        assignedEmployeeId: employeeId,
        assignedUserId: employee?.userId || null,
        ...(existing?.taskStatus && { taskStatus: existing.taskStatus }), // Preserve existing status (backend sets default)
        ...(existing?.completedAt && { completedAt: existing.completedAt })
      }
    })

    form.setValue('taskAssignees', newTaskAssignees)
  }, [assignedEmployeeIds, task?.taskAssignees, form])

  const handleSubmit = useCallback(async (data: z.infer<typeof taskSchema>) => {
    try {
      delete data.files
      delete data._pendingFiles
      delete data.relatedEntityId
      // Delete helper fields (not sent to backend)
      delete data.assignedEmployeeIds
      delete data.assignedEmployees

      // Build payload (returns { employeeDetails, salesTask })
      return buildCustomerTaskPayload(data as Partial<CustomerTask>)
    } catch (error) {
      console.error('Error submitting task:', error)
      throw error
    }
  }, [])

  const handlePreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.TASK,
      appName: APP_NAME,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: true
    }),
    [userInfo, fileClient]
  )

  const handleSuccess = useCallback(() => {
    onSuccess?.(form.getValues() as any)
  }, [onSuccess, form])

  const handleCancel = useCallback(() => {
    onCancel?.()
  }, [onCancel])

  const handleEntitySearch = useCallback(
    (q: string) => {
      searchEntities(q)
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

  useEffect(() => {
    if (taskRef.current?.id !== task?.id) {
      form.reset(mapToFormValues(task || {}, taskSchema) as any)
      taskRef.current = task

      // Manually set assignee fields when task loads (prevents infinite loop in MultiEmployeeSelect)
      if (task?.taskAssignees && task.taskAssignees.length > 0) {
        const employeeIds = task.taskAssignees.map((ta: any) => ta.assignedEmployee?.id).filter(Boolean)

        const employees = task.taskAssignees.map((ta: any) => ta.assignedEmployee).filter((emp: any) => emp?.id)

        // Store full taskAssignees array (with junction table IDs for updates)
        const taskAssigneesArray = task.taskAssignees.map((ta: any) => ({
          id: ta.id,
          version: ta.version,
          assignedEmployeeId: ta.assignedEmployee?.id,
          assignedUserId: ta.assignedUserId,
          taskStatus: ta.taskStatus,
          completedAt: ta.completedAt
        }))

        form.setValue('taskAssignees', taskAssigneesArray)
        form.setValue('assignedEmployeeIds', employeeIds)
        form.setValue('assignedEmployees', employees)
      }

      // Set relatedEntityId and hydrate entity (relatedEntityId is required for form validation)
      const entity = [
        { type: 'account' as const, id: task?.accountId },
        { type: 'contact' as const, id: task?.contactId },
        { type: 'opportunity' as const, id: task?.opportunityId },
        { type: 'lead' as const, id: task?.leadId }
      ].find(e => e.id)

      if (entity?.id) {
        form.setValue('relatedEntityId', entity.id)
        hydrateEntityById(entity.type, entity.id)
      }
    }
  }, [task?.id, task, form, hydrateEntityById])

  useEffect(() => {
    if (accessToken && !taskId) {
      // Only trigger initial search in create mode
      searchEntities('')
    }
  }, [accessToken, taskId, searchEntities])

  // Pre-set the type from context when provided
  useEffect(() => {
    if (typeRef && !task) {
      // Only set for new tasks, not when editing existing ones
      form.setValue('taskTypeRef', typeRef)
    }
  }, [typeRef, task, form])

  // Set default task status to IN_PROGRESS for new tasks
  useEffect(() => {
    if (!task && !form.getValues('taskStatusRef')) {
      // Only set for new tasks, not when editing existing ones
      form.setValue('taskStatusRef', 'SalesTaskStatus:v1:IN_PROGRESS')
    }
  }, [task, form])

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

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load task data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="customer-task-form" />
  }

  const processType = taskId ? 'update' : 'create'

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
        schema={taskSchema}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid={formatDataTestId('customer-task-form', 'Form')}
        isSubmitDisabled={taskLoading}
      >
        <TaskLayout
          // Required props
          accessToken={accessToken}
          businessAppContext={{ accessToken, userInfo, additionalData }}
          assignedEmployees={
            task?.taskAssignees?.map((ta: any) => ta.assignedEmployee).filter((emp: any) => emp?.id) || []
          }
          entityId={task?.id}
          // Catalogs
          typeCatalog={TASK_TYPE_CATALOG}
          priorityCatalog={TASK_PRIORITY_CATALOG}
          statusCatalog={TASK_STATUS_CATALOG}
          // Type selection control
          initialTypeRef={typeRef}
          catalogSelectConfig={{
            code: { mode: 'omit', values: ['APPROVAL'] }
          }}
          // Assignee mode - multi-select for approvals, single-select for regular tasks
          multiAssigneeMode={isApprovalTask}
          // Entity search - hide if any entity is set
          showEntitySelection={shouldShowEntitySelection}
          entities={entities}
          entitiesLoading={entitiesLoading}
          entitiesHasMore={entitiesHasMore}
          onEntitySearch={handleEntitySearch}
          onEntityLoadMore={loadMoreEntities}
          initialEntityFromContext={{
            accountId: relatedEntityIds.accountId,
            contactId: relatedEntityIds.contactId,
            opportunityId: relatedEntityIds.opportunityId,
            leadId: relatedEntityIds.leadId
          }}
          // File handling
          onFilesChange={handleFilesChange}
          existingDocuments={form.watch('documents') || []}
          onDocumentRemove={handleDocumentRemove}
          // Loading state
          loading={taskLoading && !!taskId}
          data-testid="customer-task-layout"
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default TaskForm
