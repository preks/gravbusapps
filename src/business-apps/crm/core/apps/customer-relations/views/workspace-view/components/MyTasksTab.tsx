import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MyTasksView } from '@/common/components/common-relations/view-layouts/personal-workspace/components/tasks'
import { buildCrmMyTasksConfig } from '../config/myTasksConfig'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useCustomerTaskStatistics } from '@/common/data/customer/hooks/useCustomerTaskStatistics'

/**
 * My Tasks Tab Wrapper
 * Builds task config when this tab is mounted (lazy loading)
 */
export const MyTasksTab: React.FC<BusinessAppContextProps> = context => {
  // Call hooks at component level (not inside config builder)
  const customerTasksHook = useCustomerTasks(context)
  const taskStatistics = useCustomerTaskStatistics(context)

  // Build config with hook results (memoize based on stable primitive values)
  // Only depend on primitives that actually change, not object references
  const tasksConfig = useMemo(
    () => buildCrmMyTasksConfig(context, customerTasksHook, taskStatistics),
    [context.accessToken, context.userInfo?.employeeDetails?.employeeId, context.userInfo?.id]
  )

  return (
    <MyTasksView
      config={tasksConfig}
      accessToken={context.accessToken}
      userInfo={context.userInfo}
      dataTestId="workspace-my-tasks"
    />
  )
}
