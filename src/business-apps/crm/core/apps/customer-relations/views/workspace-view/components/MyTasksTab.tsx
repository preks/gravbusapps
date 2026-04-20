import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MyTasksView } from '@/common/components/common-relations/view-layouts/personal-workspace/components/tasks'
import { buildCrmMyTasksConfig } from '../config/myTasksConfig'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useCustomerTaskStatistics } from '@/common/data/customer/hooks/useCustomerTaskStatistics'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'

/**
 * My Tasks Tab Wrapper
 * Builds task config when this tab is mounted (lazy loading)
 */
export const MyTasksTab: React.FC<BusinessAppContextProps> = context => {
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('crm:my-task-preferences:v1')

  const customerTasksHook = useCustomerTasks(context)
  const taskStatistics = useCustomerTaskStatistics(context)

  const tasksConfig = useMemo(
    () => buildCrmMyTasksConfig(context, customerTasksHook, taskStatistics),
    [context.accessToken, context.userInfo?.employeeDetails?.employeeId, context.userInfo?.id, taskStatistics]
  )

  return (
    <MyTasksView
      config={tasksConfig}
      accessToken={context.accessToken}
      userInfo={context.userInfo}
      dataTestId="workspace-my-tasks"
      enableExport
      exportFilenamePrefix="crm-my-tasks"
      initialFilters={initialFilters}
      onFilterChange={saveFilters}
      initialSorting={initialSorting ?? undefined}
      onSortingChange={saveSorting}
      initialVisibleColumns={initialVisibleColumns ?? undefined}
      onVisibleColumnsChange={saveVisibleColumns}
    />
  )
}
