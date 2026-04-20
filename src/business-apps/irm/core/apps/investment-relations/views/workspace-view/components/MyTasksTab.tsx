import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MyTasksView } from '@/common/components/common-relations/view-layouts/personal-workspace/components/tasks'
import { buildIrmMyTasksConfig } from '../config/myTasksConfig'
import { useInvestmentTasks } from '@/common/data/investment/hooks/useInvestmentTasks'
import { useInvestmentTaskStatistics } from '@/common/data/investment/hooks/useInvestmentTaskStatistics'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'

/**
 * My Tasks Tab Wrapper
 * Builds task config when this tab is mounted (lazy loading)
 */
export const MyTasksTab: React.FC<BusinessAppContextProps> = context => {
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('irm:my-task-preferences:v1')

  const investmentTasksHook = useInvestmentTasks(context)
  const taskStatistics = useInvestmentTaskStatistics(context)

  const tasksConfig = useMemo(
    () => buildIrmMyTasksConfig(context, investmentTasksHook, taskStatistics),
    [context.accessToken, context.userInfo?.employeeDetails?.employeeId, context.userInfo?.id, taskStatistics]
  )

  return (
    <MyTasksView
      config={tasksConfig}
      accessToken={context.accessToken}
      userInfo={context.userInfo}
      dataTestId="workspace-my-tasks"
      enableExport
      exportFilenamePrefix="irm-my-tasks"
      initialFilters={initialFilters}
      onFilterChange={saveFilters}
      initialSorting={initialSorting ?? undefined}
      onSortingChange={saveSorting}
      initialVisibleColumns={initialVisibleColumns ?? undefined}
      onVisibleColumnsChange={saveVisibleColumns}
    />
  )
}
