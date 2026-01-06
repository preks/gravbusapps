import React, { useMemo, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskLayout, taskSchema } from '@/common/components/common-relations/form-layouts/task-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { type InvestmentTask, buildInvestmentTaskPayload } from '@/common/data/investment/types/investmentTaskTypes'
import { useInvestmentEntities } from '@/common/data/investment/hooks/useInvestmentEntities'
import { useInvestmentTask } from '@/common/data/investment/hooks/useInvestmentTask'
import { useForm } from 'react-hook-form'
import { useFileClient } from '@/common/network/files/useFileClient'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getReferenceEntityType } from '@/common/data/investment/utils'
import { FILE_CONTEXT, APP_NAME, getFileEntityFromType } from '@/common/data/investment/constants/investmentConstants'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'

const investmentTaskSchema = taskSchema.extend({
  investmentId: z.string().nullable().optional(),
  // IRM-specific: Multi-assignee support
  assignedEmployeeIds: z.array(z.string()).optional(),
  assignedEmployees: z.array(z.any()).optional()
})

export interface TaskFormProps extends BusinessAppContextProps {
  onSuccess?: (task: z.infer<typeof investmentTaskSchema>) => void
  onCancel?: () => void
}

export const TaskForm: React.FC<TaskFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
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
  } = useInvestmentEntities({ accessToken, additionalData })

  // Investment task hook - declarative single-by-PK
  const taskId = additionalData?.taskId || initialParameters?.taskId || null
  const { task, loading, error } = useInvestmentTask(accessToken || '', taskId)

  // File client for document uploads
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Extract entity IDs from additionalData or initialParameters
  const accountId = additionalData?.accountId || initialParameters?.accountId || null
  const contactId = additionalData?.contactId || initialParameters?.contactId || null
  const opportunityId = additionalData?.opportunityId || initialParameters?.opportunityId || null
  const leadId = additionalData?.leadId || initialParameters?.leadId || null
  const investmentId = additionalData?.investmentId || initialParameters?.investmentId || null

  // Extract typeRef from additionalData or initialParameters
  const typeRef = additionalData?.typeRef || initialParameters?.typeRef || null

  // Determine if this is an Approval task (type selection should be hidden)
  const isApprovalTask = typeRef?.toUpperCase()?.includes('APPROVAL') ?? false
  const form = useForm<z.infer<typeof investmentTaskSchema>>({
    resolver: zodResolver(investmentTaskSchema) as any,
    defaultValues: mapToFormValues(task || {}, investmentTaskSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const relatedEntityIds = useMemo(
    () => ({
      accountId: task?.accountId || accountId,
      contactId: task?.contactId || contactId,
      opportunityId: task?.opportunityId || opportunityId,
      leadId: task?.leadId || leadId,
      investmentId: task?.investmentId || investmentId
    }),
    [accountId, contactId, opportunityId, leadId, investmentId, task]
  )

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
      if (!employee) {
        employee = assignedEmployees.find((emp: any) => emp.id === employeeId)
      }

      return {
        ...(existing?.id && { id: existing.id }),
        ...(existing?.version !== undefined && { version: existing.version }),
        assignedEmployeeId: employeeId,
        assignedUserId: employee?.userId || null,
        taskStatus: existing?.taskStatus || 'SCHEDULED_TASK_STATUS', // Set default to SCHEDULED for new instances
        completedAt: existing?.completedAt || null
      }
    })

    form.setValue('taskAssignees', newTaskAssignees)
  }, [assignedEmployeeIds, task?.taskAssignees, form])

  // Sync form when task changes (following AccountForm pattern)
  const taskRef = useRef(task)
  useEffect(() => {
    if (taskRef.current?.id !== task?.id) {
      form.reset(mapToFormValues(task || {}, investmentTaskSchema) as any)
      taskRef.current = task

      // Manually set assignee fields when task loads (prevents infinite loop in MultiEmployeeSelect)
      if (task?.taskAssignees && task.taskAssignees.length > 0) {
        const employeeIds = task.taskAssignees.map((ta: any) => ta.assignedEmployee?.id).filter(Boolean)

        const employees = task.taskAssignees.map((ta: any) => ta.assignedEmployee).filter((emp: any) => emp && emp.id)

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
        { type: 'investment' as const, id: task?.investmentId },
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

  // Upload files will be called directly with FILE_CONTEXT.TASK

  const handleSubmit = useCallback(async (data: z.infer<typeof investmentTaskSchema>) => {
    try {
      // Delete helper fields (not sent to backend)
      delete (data as any).files
      delete (data as any)._pendingFiles
      delete (data as any).relatedEntityId
      delete (data as any).assignedEmployeeIds
      delete (data as any).assignedEmployees

      // Build payload (returns { employeeDetails, investmentTask })
      return buildInvestmentTaskPayload(data as Partial<InvestmentTask>)
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
      useCreatorFields: true,
      additionalEntityIdFields: ['investmentId']
    }),
    [userInfo, fileClient]
  )

  const handleSuccess = useCallback(() => {
    onSuccess?.(form.getValues())
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

  const handleAdditionalEntityChange = useCallback(
    (type: string, entityId: string | null) => {
      if (type === 'investment') {
        if (entityId) {
          form.setValue('investmentId', entityId)
          form.setValue('relatedEntityId', entityId)
          hydrateEntityById('investment', entityId)
        } else {
          form.setValue('investmentId', undefined)
        }
      }
    },
    [form, hydrateEntityById]
  )

  useEffect(() => {
    const contextInvestmentId = relatedEntityIds.investmentId
    if (!contextInvestmentId) return

    const currentInvestmentId = form.getValues('investmentId')
    if (currentInvestmentId !== contextInvestmentId) {
      handleAdditionalEntityChange('investment', contextInvestmentId)
    }
  }, [relatedEntityIds.investmentId, form, handleAdditionalEntityChange])

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load task data' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="investment-task-form" />
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
        form={form as any}
        schema={investmentTaskSchema}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid={formatDataTestId('investment-task-form', 'Form')}
        isSubmitDisabled={loading}
      >
        <TaskLayout
          // Required props
          accessToken={accessToken}
          businessAppContext={{ accessToken, userInfo, additionalData }}
          // Multi-assignee mode for IRM
          multiAssigneeMode={true}
          assignedEmployees={
            task?.taskAssignees?.map((ta: any) => ta.assignedEmployee).filter((emp: any) => emp && emp.id) || []
          }
          entityId={task?.id}
          // Catalogs
          typeCatalog={'InvestmentTaskType:v1'}
          priorityCatalog={'InvestmentTaskPriority:v1'}
          statusCatalog={'InvestmentTaskStatus:v1'}
          // Type selection control
          initialTypeRef={typeRef}
          hideTypeSelection={isApprovalTask}
          // Entity search - hide if any entity is set
          showEntitySelection={
            !(
              relatedEntityIds.accountId ||
              relatedEntityIds.contactId ||
              relatedEntityIds.opportunityId ||
              relatedEntityIds.leadId ||
              relatedEntityIds.investmentId
            )
          }
          entities={entities}
          entitiesLoading={entitiesLoading}
          entitiesHasMore={entitiesHasMore}
          onEntitySearch={handleEntitySearch}
          onEntityLoadMore={loadMoreEntities}
          initialEntityFromContext={{
            // Only pass standard entities to TaskSegment (investmentId handled separately via onAdditionalEntityChange)
            accountId: relatedEntityIds.accountId,
            contactId: relatedEntityIds.contactId,
            opportunityId: relatedEntityIds.opportunityId,
            leadId: relatedEntityIds.leadId
          }}
          onAdditionalEntityChange={handleAdditionalEntityChange}
          // File handling
          onFilesChange={handleFilesChange}
          existingDocuments={form.watch('documents') || []}
          onDocumentRemove={handleDocumentRemove}
          // Loading state
          loading={loading && !!taskId}
          data-testid="investment-task-layout"
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default TaskForm
