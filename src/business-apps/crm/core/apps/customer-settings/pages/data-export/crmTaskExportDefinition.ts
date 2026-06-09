import type { CustomerTask } from '@/common/data/customer/types/customerTaskTypes'
import { CUSTOMER_TASK_DESCRIPTORS } from '@/common/data/customer/types/customerTaskTypes'
import type { CustomerTaskQueryVariables } from '@/common/data/customer/queries/customerTaskQueries'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildCrmTaskExportFields } from '@/common/components/common-relations/apps/data-export/registries/task/crmTaskExportFields'
import { crmTaskExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/task/taskExportFilterConfig'
import { buildTaskExportQueryVariables } from '@/common/components/common-relations/apps/data-export/registries/task/buildTaskExportQueryVariables'

export function createCrmTaskExportDefinition(
  fetchCustomerTasks: (vars: CustomerTaskQueryVariables) => Promise<{ tasks?: CustomerTask[]; total?: number }>
): EntityExportDefinition<CustomerTask, CustomerTaskQueryVariables> {
  return {
    entityType: 'task',
    entityLabel: 'tasks',
    sheetName: 'Tasks',
    filenamePrefix: 'crm-tasks-export',
    graphqlEntityName: 'SalesTask',
    descriptors: CUSTOMER_TASK_DESCRIPTORS,
    baseFilterConfig: crmTaskExportFilterConfig,
    exportFields: buildCrmTaskExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) =>
      buildTaskExportQueryVariables<CustomerTaskQueryVariables>({ selectedFilters, limit, offset }),
    fetchPage: async vars => {
      const result = await fetchCustomerTasks(vars)
      return {
        items: result.tasks ?? [],
        total: result.total ?? 0
      }
    }
  }
}
