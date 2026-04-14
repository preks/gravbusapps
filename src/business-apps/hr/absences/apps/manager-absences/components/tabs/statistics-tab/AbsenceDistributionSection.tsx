import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Card } from '@newwork/nw-design-system'
import { AbsenceDistributionChart } from '../../KPISection/AbsenceDistributionChart'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import { useTeamCoverageData } from '../../../hooks/useTeamCoverageData'
import { useTeamDailyFactsByType } from '../../../hooks/useTeamDailyFacts'
import { useAbsenceTypeCatalog } from '../../../../personal-absences/hooks/useAbsenceTypeCatalog'

const FALLBACK_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)',
  'var(--nw-chart-6)'
]
const VACATION_GROUP_ID = 'AbsenceGroup:v1:RECR'

export const AbsenceDistributionSection: React.FC<BusinessAppContextProps> = props => {
  const { accessToken } = props
  const { teamMemberIds, isLoading: coverageLoading, error: coverageError } = useTeamCoverageData(props)
  const { mapType } = useAbsenceTypeCatalog(accessToken)
  const from = dayjs().startOf('year').format('YYYY-MM-DD')
  const to = dayjs().endOf('year').format('YYYY-MM-DD')
  const {
    data: byType,
    loading: factsLoading,
    error: factsError
  } = useTeamDailyFactsByType(accessToken, teamMemberIds, from, to, mapType, ['APPROVED'])

  const loading = coverageLoading || factsLoading
  const error = coverageError || (factsError ? factsError.message : null)

  if (!props.userInfo?.employeeDetails?.employeeId) {
    return (
      <div
        className="gba:p-6 gba:text-center gba:text-destructive"
        data-testid="absence-distribution-error-no-employee"
      >
        Error: Employee ID not found. Please check your user profile.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="absence-distribution-loading">
        Loading absence distribution data...
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-destructive" data-testid="absence-distribution-error">
        Error: {error}
      </div>
    )
  }

  if (!byType || byType.length === 0) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="absence-distribution-no-data">
        No absence distribution data available.
      </div>
    )
  }

  // Map hook data to chart props
  const pieChartData = byType.map((datum, index) => ({
    code: datum.code,
    name: datum.label,
    value: datum.value,
    parentEntryId: datum.parentEntryId,
    color: datum.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  }))
  const groupColors = pieChartData.reduce<Record<string, string>>((acc, datum) => {
    acc[datum.code] = datum.color
    return acc
  }, {})
  const totalAbsenceDays = byType.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
  const vacationVal = pieChartData
    .filter(datum => datum.parentEntryId === VACATION_GROUP_ID)
    .reduce((sum, datum) => sum + datum.value, 0)
  const vacationShare = totalAbsenceDays > 0 ? ((vacationVal / totalAbsenceDays) * 100).toFixed(1) : '0.0'

  return (
    <section className="gba:mb-6" data-testid="absence-distribution-section">
      <h3 className="gba:text-lg gba:font-bold gba:mb-4" data-testid="absence-distribution-section-title">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.absence_distribution',
          'Absence Distribution'
        )}
      </h3>
      <Card className="gba:hover:shadow-md gba:transition-shadow gba:w-full gba:h-[510px]">
        <AbsenceDistributionChart
          pieChartData={pieChartData}
          totalAbsenceDays={totalAbsenceDays}
          vacationShare={vacationShare}
          groupColors={groupColors}
          vacationGroupId={VACATION_GROUP_ID}
        />
      </Card>
    </section>
  )
}
