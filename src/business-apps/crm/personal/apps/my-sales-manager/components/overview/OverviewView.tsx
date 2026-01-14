import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Spinner, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { PersonalKpisCard } from './PersonalKpisCard'
import { RecentActivitiesWidget } from './RecentActivitiesWidget'
import { UpcomingTasksWidget } from './UpcomingTasksWidget'
import { useMyPerformanceKpis } from '../../hooks/useMyPerformanceKpis'
import { useRecentActivities } from '../../hooks/useMyActivities'
import { useUpcomingTasks } from '../../hooks/useMyTasks'

export type OverviewViewProps = BusinessAppContextProps

export const OverviewView: React.FC<OverviewViewProps> = ({ accessToken, userInfo }) => {
  const employeeId = userInfo?.employeeDetails?.employeeId || userInfo?.id || ''

  const {
    kpis,
    loading: kpisLoading,
    error: kpisError
  } = useMyPerformanceKpis({
    employeeId,
    accessToken: accessToken || ''
  })

  const {
    activities: recentActivities,
    loading: activitiesLoading,
    error: activitiesError
  } = useRecentActivities({
    employeeId,
    accessToken: accessToken || '',
    limit: 5
  })

  const {
    tasks: upcomingTasks,
    loading: tasksLoading,
    error: tasksError
  } = useUpcomingTasks({
    employeeId,
    accessToken: accessToken || '',
    limit: 5
  })

  const errors = [kpisError, activitiesError, tasksError].filter(Boolean) as Error[]

  if (!accessToken) {
    return (
      <Alert variant="destructive" data-testid="my-sales-manager-overview-error">
        <AlertTitle>Access Required</AlertTitle>
        <AlertDescription>Please log in to view your sales manager dashboard.</AlertDescription>
      </Alert>
    )
  }

  if (!employeeId) {
    return (
      <Alert variant="destructive" data-testid="my-sales-manager-overview-error">
        <AlertTitle>Employee ID Required</AlertTitle>
        <AlertDescription>Unable to identify your employee profile.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="my-sales-manager-overview">
      {/* Error Display */}
      {errors.length > 0 && (
        <Alert variant="destructive" data-testid="my-sales-manager-overview-error">
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{errors[0].message}</AlertDescription>
        </Alert>
      )}

      {/* Personal KPIs */}
      {kpisLoading && !kpis ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <PersonalKpisCard kpis={kpis} loading={kpisLoading} />
      )}

      {/* Recent Activities and Upcoming Tasks */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
        <RecentActivitiesWidget
          activities={recentActivities}
          loading={activitiesLoading}
          accessToken={accessToken}
          userInfo={userInfo}
        />
        <UpcomingTasksWidget
          tasks={upcomingTasks}
          loading={tasksLoading}
          accessToken={accessToken}
          userInfo={userInfo}
        />
      </div>
    </div>
  )
}

export default OverviewView
