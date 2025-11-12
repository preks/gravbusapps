import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useCustomerTaskStatistics } from '@/common/data/customer/hooks/useCustomerTaskStatistics'
import { TaskLayout, type TaskViewConfig } from '@/common/components/common-relations/view-layouts/task-layout'
import { type CustomerTask, CUSTOMER_TASK_DESCRIPTORS } from '@/common/data/customer/types/customerTaskTypes'
import type { CustomerTaskQueryVariables } from '@/common/data/customer/queries/customerTaskQueries'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { TaskReference } from '@/common/data/relations/types/taskTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  createTaskColumns,
  taskFilterConfig
} from '@/common/components/common-relations/view-layouts/task-layout/config'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

export type TaskViewProps = BusinessAppContextProps

export const TaskView: React.FC<TaskViewProps> = context => {
  const { fetchCustomerTasks } = useCustomerTasks(context)
  const taskStatistics = useCustomerTaskStatistics(context)

  // Build reference URLs for CRM context
  const buildReferenceUrl = (reference: TaskReference): string => {
    switch (reference.type) {
      case 'lead':
        return buildPlatformUrl('/platform/crm/lead-record', { leadId: reference.id })
      case 'account':
        return buildPlatformUrl('/platform/crm/account-record', { accountId: reference.id })
      case 'contact':
        return buildPlatformUrl('/platform/crm/contact-record', { contactId: reference.id })
      case 'opportunity':
        return buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: reference.id })
      default:
        return ''
    }
  }

  const config: TaskViewConfig<CustomerTask, CustomerTaskQueryVariables> = useMemo(
    () => ({
      fetchMyTasks: async (variables: CustomerTaskQueryVariables) => {
        const employeeId = context.userInfo?.employeeDetails?.employeeId || context.userInfo?.id
        const result = await fetchCustomerTasks({
          ...variables,
          assignedEmployeeIds: employeeId ? [employeeId] : []
        })
        return {
          tasks: result.tasks as any,
          total: result.total
        }
      },

      fetchTeamTasks: async (variables: CustomerTaskQueryVariables) => {
        const result = await fetchCustomerTasks(variables)
        return {
          tasks: result.tasks as any,
          total: result.total
        }
      },

      createColumns: () => createTaskColumns() as any,
      descriptors: CUSTOMER_TASK_DESCRIPTORS,
      entityName: 'SalesTask',
      columnLabels: {
        name: 'Task',
        taskType: 'Type',
        taskPriority: 'Priority',
        taskStatus: 'Status',
        assignedTo: 'Assigned To',
        reference: 'Reference',
        dueDate: 'Due Date',
        createdAt: 'Created',
        createdBy: 'Created By'
      },

      baseFilterConfig: taskFilterConfig,

      buildQueryVariables: params => {
        // Debug: Log schedule and createdAt filters
        console.log('[TaskView] DEBUG - schedule filter:', {
          raw: params.selectedFilters.schedule,
          type: typeof params.selectedFilters.schedule,
          isArray: Array.isArray(params.selectedFilters.schedule),
          value: params.selectedFilters.schedule
        })
        console.log('[TaskView] DEBUG - createdAt filter:', {
          raw: params.selectedFilters.createdAtRange,
          type: typeof params.selectedFilters.createdAtRange,
          isArray: Array.isArray(params.selectedFilters.createdAtRange),
          value: params.selectedFilters.createdAtRange
        })

        const vars: CustomerTaskQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        // Handle referenceType filter (no Descriptor - special case)
        if (
          params.selectedFilters.referenceType &&
          Array.isArray(params.selectedFilters.referenceType) &&
          params.selectedFilters.referenceType.length > 0
        ) {
          vars.referenceTypes = params.selectedFilters.referenceType
        }

        // Normalize date range filters
        const dateRangeKeys = ['createdAtRange', 'updatedAtRange', 'dueDateRange', 'startDateRange', 'endDateRange']
        for (const rangeKey of dateRangeKeys) {
          const rawValue = params.selectedFilters[rangeKey]
          console.log(`[TaskView] DEBUG - Processing ${rangeKey}:`, {
            raw: rawValue,
            type: typeof rawValue,
            isArray: Array.isArray(rawValue)
          })
          const normalized = normalizeDateRange(rawValue)
          if (normalized) {
            const baseKey = rangeKey.replace('Range', '')
            if (normalized.from) (vars as any)[`${baseKey}From`] = normalized.from
            if (normalized.to) (vars as any)[`${baseKey}To`] = normalized.to
            console.log(`[TaskView] DEBUG - Normalized ${rangeKey}:`, normalized)
          }
        }

        // Copy all other filters directly (they now match Descriptor-Keys)
        for (const key of Object.keys(params.selectedFilters)) {
          if (
            key !== 'referenceType' &&
            !dateRangeKeys.includes(key) &&
            params.selectedFilters[key] !== undefined &&
            params.selectedFilters[key] !== null
          ) {
            vars[key as keyof CustomerTaskQueryVariables] = params.selectedFilters[key]
            if (key === 'schedule') {
              console.log(`[TaskView] DEBUG - Copied schedule filter to vars:`, {
                key,
                value: params.selectedFilters[key],
                type: typeof params.selectedFilters[key],
                isArray: Array.isArray(params.selectedFilters[key])
              })
            }
          }
        }

        // Debug: Log final vars before returning
        console.log('[TaskView] DEBUG - Final vars:', {
          schedule: (vars as any).schedule,
          createdAtFrom: (vars as any).createdAtFrom,
          createdAtTo: (vars as any).createdAtTo,
          createdAtRange: params.selectedFilters.createdAtRange
        })

        // Use column ID directly - buildOrderBy will use descriptors (CUSTOMER_TASK_DESCRIPTORS)
        // to resolve correct GraphQL paths (e.g., type.value, priority.value, status.value)
        if (params.sorting.length > 0) {
          vars.orderBy = [
            {
              field: params.sorting[0].id as any,
              direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
            }
          ]
        } else {
          vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
        }

        return vars
      },

      flowContexts: {
        entityContext: FlowContextName.customerTaskEntity,
        createContext: FlowContextName.customerTaskCreate
      },

      taskStatistics,

      processCompletionEvents: [
        'com.newwork.process.taskCompletion',
        'com.newwork.process.completion',
        'com.newwork.process.continue',
        'com.newwork.process.processCompletion',
        'processCompletion',
        'taskCompletion',
        'taskCompleted',
        'processCompleted',
        'task-completion',
        'process-completion'
      ],

      rowActionsContextArray: [FlowContextName.customerTaskEntity],
      buildRowActionsExternalContextData: (row: { original: CustomerTask }) => {
        const externalContextData: Record<string, string> = { taskId: row.original.id }

        // Add parent reference ID based on task reference type
        if (row.original.reference) {
          const refType = row.original.reference.type
          const refId = row.original.reference.id

          switch (refType) {
            case 'lead':
              externalContextData.leadId = refId
              break
            case 'account':
              externalContextData.accountId = refId
              break
            case 'contact':
              externalContextData.contactId = refId
              break
            case 'opportunity':
              externalContextData.opportunityId = refId
              break
          }
        }

        return externalContextData
      },

      buildReferenceUrl
    }),
    [context, fetchCustomerTasks, taskStatistics, buildReferenceUrl]
  )

  return (
    <TaskLayout<CustomerTask, CustomerTaskQueryVariables>
      context={context}
      config={config}
      dataTestId="customer-task-view"
    />
  )
}

export default TaskView
