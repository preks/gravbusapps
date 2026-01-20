import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MyTasksView } from '@/common/components/common-relations/view-layouts/personal-workspace/components/tasks'
import { buildIrmMyTasksConfig } from '../config/myTasksConfig'
import { useInvestmentTasks } from '@/common/data/investment/hooks/useInvestmentTasks'
import { useInvestmentTaskStatistics } from '@/common/data/investment/hooks/useInvestmentTaskStatistics'

/**
 * My Tasks Tab Wrapper
 * Builds task config when this tab is mounted (lazy loading)
 */
export const MyTasksTab: React.FC<BusinessAppContextProps> = context => {
  // Call hooks at component level (not inside config builder)
  const investmentTasksHook = useInvestmentTasks(context)
  const taskStatistics = useInvestmentTaskStatistics(context)

  // Build config with hook results (memoize based on stable primitive values)
  // Only depend on primitives that actually change, not object references
  const tasksConfig = useMemo(
    () => buildIrmMyTasksConfig(context, investmentTasksHook, taskStatistics),
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
