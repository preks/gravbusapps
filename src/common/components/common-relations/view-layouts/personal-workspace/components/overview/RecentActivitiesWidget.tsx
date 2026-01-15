import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  TimelineLayout,
  Spinner,
  EmptyState
} from '@newwork/nw-design-system'
import { ActivityBadge } from '../activities/ActivityBadge'
import type { GenericActivity, PersonalWorkspaceConfig } from '../../types'
import dayjs from 'dayjs'
import { PhoneIcon, EnvelopeIcon, CalendarBlankIcon, UserIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export interface RecentActivitiesWidgetProps {
  activities: GenericActivity[]
  loading: boolean
  config: PersonalWorkspaceConfig
}

// Icon components extracted outside to prevent re-creation on each render
const CallIcon = (props: any) => <PhoneIcon weight="bold" {...props} />
const EmailIcon = (props: any) => <EnvelopeIcon weight="bold" {...props} />
const MeetingIcon = (props: any) => <CalendarBlankIcon weight="bold" {...props} />
const DefaultActivityIcon = (props: any) => <UserIcon weight="bold" {...props} />

const getActivityIcon = (activityType: string) => {
  switch (activityType?.toLowerCase()) {
    case 'call':
      return CallIcon
    case 'email':
      return EmailIcon
    case 'meeting':
      return MeetingIcon
    default:
      return DefaultActivityIcon
  }
}

/**
 * Generic Recent Activities Widget
 * Displays recent activities using timeline layout with reference badges and fixed height scrolling
 */
export const RecentActivitiesWidget: React.FC<RecentActivitiesWidgetProps> = ({ activities, loading, config }) => {
  const getOwnerName = (ownerEmployee: any) => {
    if (!ownerEmployee) return 'Unknown'
    const fullName = `${ownerEmployee.firstName || ''} ${ownerEmployee.lastName || ''}`.trim()
    if (fullName) return fullName
    return ownerEmployee.displayName || 'Unknown'
  }

  const handleEmployeeClick = (employeeId: string) => {
    navigateTo(buildPlatformUrl('/platform/hr/core/employees/employee-record', { employeeId }))
  }

  const timelineItems = useMemo(() => {
    return activities.map(activity => {
      const activityTypeLabel = activity.activityType?.value || 'Activity'
      const ownerName = getOwnerName(activity.ownerEmployee)

      return {
        id: activity.id,
        date: dayjs(activity.occurredAt).format('MMM D, YYYY h:mm A'),
        actor: activity.ownerEmployee ? (
          <a
            href={buildPlatformUrl('/platform/hr/core/employees/employee-record', {
              employeeId: activity.ownerEmployee.id
            })}
            onClick={e => {
              e.preventDefault()
              handleEmployeeClick(activity.ownerEmployee.id)
            }}
            className="gba:font-medium gba:text-primary hover:gba:underline gba:cursor-pointer"
          >
            {ownerName}
          </a>
        ) : undefined,
        title: (
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:gap-2">
            <span className="gba:flex-1 gba:truncate">{activity.title}</span>
            <ActivityBadge activity={activity} config={config} data-testid={`activity-badge-${activity.id}`} />
          </div>
        ),
        description: activity.description ? <span>{activity.description}</span> : undefined,
        icon: getActivityIcon(activityTypeLabel)
      } as any
    })
  }, [activities, config])

  // Render content based on loading/data state
  const renderContent = () => {
    if (loading) {
      return (
        <div className="gba:flex gba:justify-center gba:py-8">
          <Spinner size="lg" />
        </div>
      )
    }

    if (activities.length === 0) {
      return (
        <EmptyState
          type="no-data"
          title="No Activities"
          description="No recent activities yet."
          data-testid="recent-activities-empty-state"
        />
      )
    }

    return (
      <TimelineLayout
        items={timelineItems}
        variant="default"
        orientation="vertical"
        alignment="left"
        className="gba:w-full"
      />
    )
  }

  return (
    <Card data-testid="recent-activities-widget">
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>

      <CardContent className="gba:p-0">
        {/* Fixed height container with scroll */}
        <div className="gba:h-[400px] gba:overflow-y-auto gba:px-6 gba:py-4">{renderContent()}</div>
      </CardContent>
    </Card>
  )
}

export default RecentActivitiesWidget
