import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { PersonalWorkspaceConfig, KpiResult, ActivitiesResult, TasksResult } from '../../types'
import { PersonalKpisCard } from './PersonalKpisCard'
import { RecentActivitiesWidget } from './RecentActivitiesWidget'
import { CompactTwoWeekCalendar } from './CompactTwoWeekCalendar'

export interface OverviewViewProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  config: PersonalWorkspaceConfig
  kpisResult: KpiResult
  activitiesResult: ActivitiesResult
  tasksResult: TasksResult
}

/**
 * Generic Overview View
 * Main dashboard view showing KPIs, recent activities, and calendar
 */
export const OverviewView: React.FC<OverviewViewProps> = ({
  config,
  kpisResult,
  activitiesResult,
  tasksResult,
  accessToken,
  userInfo
}) => {
  const errors = [kpisResult.error, activitiesResult.error, tasksResult.error].filter(Boolean)

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
          activities={activitiesResult.activities.slice(0, 5)} // Show top 5
          loading={activitiesResult.loading}
          config={config}
        />

        {/* Calendar */}
        <CompactTwoWeekCalendar
          activities={activitiesResult.activities}
          tasks={tasksResult.tasks}
          activitiesLoading={activitiesResult.loading}
          tasksLoading={tasksResult.loading}
          activitiesError={activitiesResult.error}
          tasksError={tasksResult.error}
          config={config}
          accessToken={accessToken}
          userInfo={userInfo}
        />
      </div>
    </div>
  )
}

export default OverviewView
