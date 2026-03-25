import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { ClockIcon, UsersIcon, CalendarIcon, FirstAidIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAbsenceStatisticsSimple } from '../../../hooks/useAbsenceStatisticsSimple'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface AbsenceStatisticsSimpleProps extends BusinessAppContextProps {
  onNavigateToAbsenceListPage?: (preFilter?: any) => void
}

export const AbsenceStatisticsSimple: React.FC<AbsenceStatisticsSimpleProps> = props => {
  const { statistics, isLoading, error, refetch } = useAbsenceStatisticsSimple(props)

  const widgets: WidgetItem[] = [
    {
      key: 'team-members-away',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.team_members_away_btn',
        'Team Members Away'
      ),
      value: statistics.teamMembersAway,
      prefix: <UsersIcon />,
      color: 'var(--nw-info)',
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.employees_away_today',
        'Employees away today'
      ),
      onClick: () => {
        const today = new Date()
        const todayStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 00:00:00+00`
        const todayEnd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 23:59:59+00`

        props.onNavigateToAbsenceListPage?.({
          type: 'team-away',
          status: ['APPROVED'],
          dateRange: {
            startDate: todayStart,
            endDate: todayEnd
          }
        })
      }
    },
    {
      key: 'pending-requests',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.pending_requests_btn',
        'Pending Requests'
      ),
      value: statistics.pendingRequests,
      prefix: <ClockIcon />,
      color: 'var(--nw-warning)',
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.requests_awaiting_approval',
        'Requests awaiting approval'
      ),
      onClick: () => {
        const currentYear = new Date().getFullYear()
        const startOfYear = `${currentYear}-01-01`
        const endOfYear = `${currentYear}-12-31`

        props.onNavigateToAbsenceListPage?.({
          type: 'pending',
          status: ['PENDING'],
          dateRange: {
            startDate: startOfYear,
            endDate: endOfYear
          }
        })
      }
    },
    {
      key: 'sick-absences-by-month',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.sick_leaves_btn',
        'Sick Leaves'
      ),
      value: statistics.sickAbsencesByMonth.count,
      prefix: <FirstAidIcon />,
      color: 'var(--nw-destructive)',
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.most_requests_month',
        `Most Requests - ${statistics.sickAbsencesByMonth.month}`,
        { month: statistics.sickAbsencesByMonth.month }
      ),
      onClick: () => {
        const currentYear = new Date().getFullYear()
        const monthNumber = statistics.sickAbsencesByMonth.monthNumber

        const targetMonth = monthNumber !== null ? monthNumber : dayjs().month()
        const startOfMonth = dayjs(`${currentYear}-${String(targetMonth + 1).padStart(2, '0')}-01`)
        const endOfMonth = startOfMonth.endOf('month')
        const startDate = startOfMonth.format('YYYY-MM-DD')
        const endDate = endOfMonth.format('YYYY-MM-DD')

        props.onNavigateToAbsenceListPage?.({
          type: 'sick',
          status: ['APPROVED'],
          groups: ['AbsenceGroup:v1:HEALTH'],
          dateRange: {
            startDate,
            endDate
          }
        })
      }
    },
    {
      key: 'upcoming-absences',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.upcoming_absences_btn',
        'Upcoming Absences'
      ),
      value: statistics.upcomingAbsences,
      prefix: <CalendarIcon />,
      color: 'var(--nw-info)',
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.future_scheduled_absences',
        'Future scheduled absences'
      ),
      onClick: () => {
        const today = new Date().toISOString().split('T')[0]

        props.onNavigateToAbsenceListPage?.({
          type: 'upcoming',
          status: ['APPROVED'],
          dateRange: {
            startDate: today
          }
        })
      }
    }
  ]

  return (
    <div data-testid="absence-statistics-simple-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonCount={4}
        emptyText={getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.no_statistics_available',
          'No statistics available.'
        )}
        data-testid="absence-statistics-simple"
      />
    </div>
  )
}
