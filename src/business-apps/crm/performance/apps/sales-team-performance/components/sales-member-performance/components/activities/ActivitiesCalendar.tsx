import React, { useState, useMemo } from 'react'
import { ActivitiesTableProps } from '../../types/activitiesTypes'
import { useEmployeeActivitiesData } from '../../hooks/useEmployeeActivitiesData'
import { SharedActivitiesCalendar, CalendarActivity } from '../../../shared/SharedActivitiesCalendar'
import dayjs from 'dayjs'

export const ActivitiesCalendar: React.FC<ActivitiesTableProps> = ({ employeeId, accessToken, onTotalChange }) => {
  const [currentDate, setCurrentDate] = useState(dayjs())

  // Calculate date range for current month
  const startOfMonth = currentDate.startOf('month').format('YYYY-MM-DD')
  const endOfMonth = currentDate.endOf('month').format('YYYY-MM-DD')

  // Build query variables for the current month - filter by occurredAt
  const queryVariables = useMemo(
    () => ({
      limit: 500,
      offset: 0,
      orderBy: [{ field: 'occurredAt', direction: 'DESC' }],
      occurredAtFrom: startOfMonth,
      occurredAtTo: endOfMonth
    }),
    [startOfMonth, endOfMonth]
  )

  // Use the data hook
  const {
    activities = [],
    totalCount = 0,
    loading = false,
    error = null,
    refetch
  } = useEmployeeActivitiesData({
    employeeId,
    accessToken,
    queryVariables
  })

  // Update total count when it changes
  React.useEffect(() => {
    if (onTotalChange) {
      onTotalChange(totalCount)
    }
  }, [totalCount, onTotalChange])

  // Transform activities to match shared calendar interface
  const calendarActivities: CalendarActivity[] = useMemo(() => {
    return activities.map(activity => ({
      id: activity.id,
      title: activity.title,
      activityType: activity.activityType,
      occurredAt: activity.occurredAt,
      createdAt: activity.createdAt,
      activityScore: activity.activityScore,
      ownerEmployee: activity.ownerEmployee,
      ownerEmployeeId: activity.ownerEmployeeId,
      reference: activity.reference,
      account: activity.account,
      contact: activity.contact,
      lead: activity.lead,
      opportunity: activity.opportunity,
      description: activity.description
    }))
  }, [activities])

  return (
    <SharedActivitiesCalendar
      activities={calendarActivities}
      isLoading={loading}
      error={error || null}
      onRetry={refetch}
      currentDate={currentDate}
      onDateChange={setCurrentDate}
      showActivityScores={true}
      accessToken={accessToken}
      dataTestIdPrefix="EmployeeActivitiesCalendar"
    />
  )
}

export default ActivitiesCalendar
