import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useMyActivities } from '../../hooks/useMyActivities'
import { SharedActivitiesCalendar } from '@/business-apps/crm/performance/apps/sales-team-performance/components/shared/SharedActivitiesCalendar'
import { calculateActivityScore } from '@/business-apps/crm/performance/apps/sales-team-performance/components/sales-member-performance/hooks/useEmployeeActivitiesData'
import type { CalendarActivity } from '@/business-apps/crm/performance/apps/sales-team-performance/components/shared/types'
import dayjs from 'dayjs'

export interface MyActivitiesCalendarTabProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  employeeId: string
}

export const MyActivitiesCalendarTab: React.FC<MyActivitiesCalendarTabProps> = ({
  accessToken,
  userInfo,
  employeeId
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs())

  const dateFrom = currentDate.startOf('month').subtract(1, 'week').toISOString()
  const dateTo = currentDate.endOf('month').add(1, 'week').toISOString()

  const { activities, loading, error, refetch } = useMyActivities({
    employeeId,
    accessToken: accessToken || '',
    dateFrom,
    dateTo,
    limit: 500
  })

  // Transform activities to calendar format
  const calendarActivities: CalendarActivity[] = useMemo(() => {
    return activities.map(activity => {
      const score = calculateActivityScore(activity.createdAt, activity.occurredAt)
      return {
        id: activity.id,
        title: activity.title,
        activityType: activity.activityType,
        occurredAt: activity.occurredAt,
        createdAt: activity.createdAt,
        activityScore: score,
        ownerEmployee: userInfo,
        ownerEmployeeId: employeeId,
        account: activity.account,
        contact: activity.contact,
        lead: activity.lead,
        opportunity: activity.opportunity,
        description: activity.description
      }
    })
  }, [activities, userInfo, employeeId])

  return (
    <SharedActivitiesCalendar
      activities={calendarActivities}
      isLoading={loading}
      error={error}
      onRetry={refetch}
      currentDate={currentDate}
      onDateChange={setCurrentDate}
      showActivityScores={true}
      accessToken={accessToken}
      dataTestIdPrefix="MyActivitiesCalendar"
    />
  )
}

export default MyActivitiesCalendarTab
