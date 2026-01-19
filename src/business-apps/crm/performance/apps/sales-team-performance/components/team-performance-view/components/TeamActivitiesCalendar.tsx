import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SalesTeamMember } from '../../sales-members-list/types'
import { useCalendarActivitiesData } from '../hooks/useCalendarActivitiesData'
import { SharedActivitiesCalendar, CalendarActivity, MemberFilter } from '../../shared/SharedActivitiesCalendar'
import { calculateActivityScore } from '../../../utils/activityScoreCalculator'
import dayjs from 'dayjs'

interface TeamActivitiesCalendarProps extends BusinessAppContextProps {
  teamId?: string
  teamMembers: SalesTeamMember[]
}

export const TeamActivitiesCalendar: React.FC<TeamActivitiesCalendarProps> = ({
  teamMembers,
  accessToken,
  userInfo
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs())
  const [selectedMember, setSelectedMember] = useState<string>('all')

  // Get unique manager info for dropdown
  const managerInfo = useMemo(() => {
    const managers = teamMembers
      .map(member => member.manager)
      .filter((manager): manager is NonNullable<typeof manager> => !!manager)

    return managers.length > 0 ? managers[0] : null
  }, [teamMembers])

  // Get all employee IDs (including manager/supervisor)
  const allEmployeeIds = useMemo(() => {
    const memberIds = teamMembers.map(member => member.employeeId || member.id).filter((id): id is string => !!id)
    const managerIds = teamMembers.map(member => member.manager?.id).filter((id): id is string => !!id)
    const allIds = Array.from(new Set([...memberIds, ...managerIds]))
    return allIds
  }, [teamMembers])

  // Get employee IDs for data fetching based on selected member filter
  const employeeIds = useMemo(() => {
    if (selectedMember === 'all') return allEmployeeIds
    if (selectedMember === 'manager' && managerInfo) {
      return [managerInfo.id]
    }
    return [selectedMember]
  }, [selectedMember, allEmployeeIds, managerInfo])

  // Calculate date range for the current MONTH
  const { dateFrom, dateTo } = useMemo(() => {
    const startOfMonth = currentDate.startOf('month')
    const endOfMonth = currentDate.endOf('month')

    return {
      dateFrom: startOfMonth.format('YYYY-MM-DD'),
      dateTo: endOfMonth.format('YYYY-MM-DD')
    }
  }, [currentDate])

  // Use calendar-specific hook that fetches ALL activities without limit enforcement
  const {
    activities,
    loading: isLoading,
    error,
    retry
  } = useCalendarActivitiesData({
    employeeIds,
    dateFrom,
    dateTo,
    accessToken,
    userInfo
  })

  // Transform activities to match shared calendar interface and calculate scores
  const calendarActivities: CalendarActivity[] = useMemo(() => {
    return activities.map(activity => {
      // Calculate activity score using the same formula as individual calendar
      const score = calculateActivityScore(activity.createdAt, activity.occurredAt)

      return {
        id: activity.id,
        title: activity.title,
        activityType: activity.activityType,
        occurredAt: activity.occurredAt,
        createdAt: activity.createdAt,
        activityScore: score,
        ownerEmployee: activity.ownerEmployee,
        ownerEmployeeId: activity.ownerEmployeeId,
        reference: activity.reference,
        account: activity.account,
        contact: activity.contact,
        lead: activity.lead,
        opportunity: activity.opportunity,
        description: activity.description
      }
    })
  }, [activities])

  // Create member filters for dropdown
  const memberFilters: MemberFilter[] = useMemo(() => {
    return teamMembers
      .filter(member => member.employeeId || member.id)
      .map(member => ({
        id: member.employeeId || member.id || '',
        label: member.fullName || member.name || 'Unknown'
      }))
  }, [teamMembers])

  return (
    <SharedActivitiesCalendar
      activities={calendarActivities}
      isLoading={isLoading}
      error={error}
      onRetry={retry}
      currentDate={currentDate}
      onDateChange={setCurrentDate}
      memberFilters={memberFilters}
      selectedMember={selectedMember}
      onMemberChange={setSelectedMember}
      managerInfo={managerInfo}
      showActivityScores={true}
      accessToken={accessToken}
      dataTestIdPrefix="TeamActivitiesCalendar"
    />
  )
}

export default TeamActivitiesCalendar
