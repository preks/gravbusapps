import React, { useCallback } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { PersonalWorkspaceConfig, ActivitiesResult, TasksResult } from '../../types'
import { PersonalKpisCard } from './PersonalKpisCard'
import { RecentActivitiesWidget } from './RecentActivitiesWidget'
import { CompactTwoWeekCalendar } from './CompactTwoWeekCalendar'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

export interface OverviewViewProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  config: PersonalWorkspaceConfig
  employeeId: string
  docuSignEnabled?: boolean
}

/**
 * Generic Overview View
 * Main dashboard view showing KPIs, recent activities, and calendar
 * Fetches data only when this component is mounted (lazy loading per tab)
 */
export const OverviewView: React.FC<OverviewViewProps> = ({
  config,
  employeeId,
  accessToken,
  userInfo,
  docuSignEnabled = false
}) => {
  // Fetch Overview tab data (only when this component is mounted)
  const kpisResult = config.hooks.useKpis({ accessToken, userInfo }, employeeId)
  const recentActivitiesResult = config.hooks.useActivities({ accessToken, userInfo }, employeeId)

  // Calendar Activities & Tasks
  let calendarActivitiesResult: ActivitiesResult
  let calendarTasksResult: TasksResult

  if (config.hooks.useCombinedCalendarData) {
    // ✅ Parallel queries for both activities and tasks
    const combinedResult = config.hooks.useCombinedCalendarData({ accessToken, userInfo }, employeeId)
    calendarActivitiesResult = combinedResult.activitiesResult
    calendarTasksResult = combinedResult.tasksResult
  } else {
    // Fallback to separate hooks for backward compatibility
    calendarActivitiesResult = recentActivitiesResult
    calendarTasksResult = config.hooks.useTasks({ accessToken, userInfo }, employeeId)
  }

  // Process Completion Handler - refresh all data when processes complete
  const handleProcessComplete = useCallback(() => {
    // Refetch KPIs
    kpisResult.refetch?.()

    // Refetch recent activities
    recentActivitiesResult.refetch?.()

    // Refetch calendar data
    calendarActivitiesResult.refetch?.()
    calendarTasksResult.refetch?.()
  }, [kpisResult, recentActivitiesResult, calendarActivitiesResult, calendarTasksResult])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  const errors = [
    kpisResult.error,
    recentActivitiesResult.error,
    calendarActivitiesResult.error,
    calendarTasksResult.error
  ].filter(Boolean)

  return (
    <div className="gba:space-y-6" data-testid="overview-view">
      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive" data-testid="overview-errors">
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {errors.map((error, index) => (
              <div key={`error-${error?.message || 'unknown'}-${index}`}>{error?.message}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <PersonalKpisCard kpis={config.kpis} data={kpisResult.data} loading={kpisResult.loading} />

      {/* Main Content Grid - Two Columns */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-6">
        {/* Recent Activities Widget - Workspace-enhanced activity display */}
        <RecentActivitiesWidget
          activities={recentActivitiesResult.activities} // Show all 10 fetched activities
          loading={recentActivitiesResult.loading}
          config={config}
          accessToken={accessToken}
        />

        {/* Calendar */}
        <CompactTwoWeekCalendar
          activities={calendarActivitiesResult.activities}
          tasks={calendarTasksResult.tasks}
          activitiesLoading={calendarActivitiesResult.loading}
          tasksLoading={calendarTasksResult.loading}
          activitiesError={calendarActivitiesResult.error}
          tasksError={calendarTasksResult.error}
          config={config}
          accessToken={accessToken}
          userInfo={userInfo}
          refetchActivities={calendarActivitiesResult.refetch}
          refetchTasks={calendarTasksResult.refetch}
          docuSignEnabled={docuSignEnabled}
        />
      </div>
    </div>
  )
}

export default OverviewView
