import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import dayjs from 'dayjs'
import { AbsenceTrendsChart } from '../../KPISection/AbsenceTrendsChart'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTeamMemberIds } from '../../../hooks/useTeamMemberIds'
import { TeamDailyFactsSource, useTeamDailyFactsByTypeMonthly } from '../../../hooks/useTeamDailyFacts'
import { useAbsenceTypeCatalog } from '../../../../personal-absences/hooks/useAbsenceTypeCatalog'

interface AbsenceTrendsSectionProps extends BusinessAppContextProps {
  factsSource?: TeamDailyFactsSource
}

export const AbsenceTrendsSection: React.FC<AbsenceTrendsSectionProps> = ({ factsSource = 'net', ...props }) => {
  const { accessToken } = props
  const { teamMemberIds, isLoading: teamMembersLoading, error: teamMembersError } = useTeamMemberIds(props)
  const { mapType } = useAbsenceTypeCatalog(accessToken)
  const from = dayjs().startOf('year').format('YYYY-MM-DD')
  const to = dayjs().endOf('year').format('YYYY-MM-DD')
  const {
    data,
    loading: factsLoading,
    error: factsError
  } = useTeamDailyFactsByTypeMonthly(
    accessToken,
    teamMemberIds,
    from,
    to,
    mapType,
    factsSource === 'net' ? undefined : ['APPROVED'],
    factsSource
  )

  const loading = teamMembersLoading || factsLoading
  const error = teamMembersError || (factsError ? factsError.message : null)

  if (!props.userInfo?.employeeDetails?.employeeId) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-destructive" data-testid="absence-trends-error-no-employee">
        Error: Employee ID not found. Please check your user profile.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="absence-trends-loading">
        Loading absence trends data...
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-destructive" data-testid="absence-trends-error">
        Error: {error}
      </div>
    )
  }

  if (!data || data.barChartData.length === 0) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="absence-trends-no-data">
        No absence trends data available.
      </div>
    )
  }

  const allUniqueGroups = new Set<string>()
  data.barChartData.forEach((monthData: { [key: string]: string | number }) => {
    Object.keys(monthData).forEach(key => {
      if (key !== 'month') {
        allUniqueGroups.add(key)
      }
    })
  })

  const uniqueGroups = Array.from(allUniqueGroups).sort((a, b) => a.localeCompare(b))

  return (
    <section className="gba:mb-6" data-testid="absence-trends-section">
      <h3 className="gba:text-lg gba:font-bold gba:mb-4" data-testid="absence-trends-section-title">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_trends',
          'Absence Trends'
        )}
      </h3>
      <div className="gba:grid gba:grid-cols-1">
        <AbsenceTrendsChart
          barChartData={data.barChartData}
          totalAbsenceDays={data.totalAbsenceDays}
          uniqueGroups={uniqueGroups}
          groupColors={data.groupColors}
        />
      </div>
    </section>
  )
}
