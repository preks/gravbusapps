import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityBadge } from '../my-activities/ActivityBadge'
import type { MySalesActivity } from '../../types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export interface RecentActivitiesWidgetProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  activities: MySalesActivity[]
  loading: boolean
}

export const RecentActivitiesWidget: React.FC<RecentActivitiesWidgetProps> = ({ activities, loading }) => {
  return (
    <Card data-testid="recent-activities-widget">
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <Spinner size="md" />
          </div>
        ) : activities.length === 0 ? (
          <p className="gba:text-muted-foreground gba:text-sm">No recent activities</p>
        ) : (
          <div className="gba:space-y-4">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="gba:flex gba:items-start gba:justify-between gba:pb-4 gba:border-b gba:border-border last:gba:border-0 last:gba:pb-0"
                data-testid={`recent-activity-${activity.id}`}
              >
                <div className="gba:flex-1">
                  <p className="gba:font-medium gba:text-sm">{activity.title}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">
                    {activity.activityType?.value} • {dayjs(activity.occurredAt).fromNow()}
                  </p>
                </div>
                <ActivityBadge activity={activity} data-testid={`activity-badge-${activity.id}`} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RecentActivitiesWidget
