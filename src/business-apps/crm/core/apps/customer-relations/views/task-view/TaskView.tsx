import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useCustomerTaskFilters } from '@/common/data/customer/hooks/useCustomerTaskFilters'
import { useCustomerTaskStatistics } from '@/common/data/customer/hooks/useCustomerTaskStatistics'
import { TaskLayout, type TaskViewConfig } from '@/common/components/common-relations/view-layouts/task-layout'
import type { CustomerTask } from '@/common/data/customer/types/customerTaskTypes'
import type { CustomerTaskQueryVariables } from '@/common/data/customer/queries/customerTaskQueries'
import type { TaskReference } from '@/common/data/relations/types/commonTaskTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  createTaskColumns,
  createTaskSortableColumns,
  createTaskColumnToGraphQLMapping
} from '@/common/components/common-relations/view-layouts/task-layout/config'
import { taskFilterConfig } from '@/common/components/common-relations/view-layouts/task-layout/config'
import { applyTaskFilters } from '@/common/components/common-relations/view-layouts/task-layout/utils/queryHelpers'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

export type TaskViewProps = BusinessAppContextProps

export const TaskView: React.FC<TaskViewProps> = context => {
  const { fetchCustomerTasks } = useCustomerTasks(context)
  const taskStatistics = useCustomerTaskStatistics(context)
  const taskFilters = useCustomerTaskFilters(context)

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

      filterDataHook: () => taskFilters,

      createColumns: () => createTaskColumns() as any,
      createSortableColumns: createTaskSortableColumns,

      // CRM uses 'type', 'priority', 'status' instead of 'taskType', 'taskPriority', 'taskStatus'
      mapColumnToGraphQLField: createTaskColumnToGraphQLMapping({
        type: 'type.value',
        priority: 'priority.value',
        status: 'status.value'
      }),

      baseFilterConfig: taskFilterConfig,

      buildQueryVariables: params => {
        const vars: CustomerTaskQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        applyTaskFilters(vars, params.selectedFilters)

        if (params.sorting.length > 0) {
          vars.orderBy = [
            {
              field: params.mapColumnToGraphQLField(params.sorting[0].id) as any,
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

      processCompletionEvents: ['taskCompletion', 'com.newwork.process.taskCompletion'],

      buildReferenceUrl
    }),
    [context, fetchCustomerTasks, taskStatistics, taskFilters, buildReferenceUrl]
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
