import type { InvestmentTask } from '@/common/data/investment/types/investmentTaskTypes'
import { INVESTMENT_TASK_DESCRIPTORS } from '@/common/data/investment/types/investmentTaskTypes'
import type { InvestmentTaskQueryVariables } from '@/common/data/investment/queries/investmentTaskQueries'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildIrmTaskExportFields } from '@/common/components/common-relations/apps/data-export/registries/task/irmTaskExportFields'
import { irmTaskExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/task/taskExportFilterConfig'
import { buildTaskExportQueryVariables } from '@/common/components/common-relations/apps/data-export/registries/task/buildTaskExportQueryVariables'

export function createIrmTaskExportDefinition(
  fetchInvestmentTasks: (vars: InvestmentTaskQueryVariables) => Promise<{ tasks?: InvestmentTask[]; total?: number }>
): EntityExportDefinition<InvestmentTask, InvestmentTaskQueryVariables> {
  return {
    entityType: 'task',
    entityLabel: 'tasks',
    sheetName: 'Tasks',
    filenamePrefix: 'irm-tasks-export',
    graphqlEntityName: 'InvestmentTask',
    descriptors: INVESTMENT_TASK_DESCRIPTORS,
    baseFilterConfig: irmTaskExportFilterConfig,
    exportFields: buildIrmTaskExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) =>
      buildTaskExportQueryVariables<InvestmentTaskQueryVariables>({ selectedFilters, limit, offset }),
    fetchPage: async vars => {
      const result = await fetchInvestmentTasks(vars)
      return {
        items: result.tasks ?? [],
        total: result.total ?? 0
      }
    }
  }
}
