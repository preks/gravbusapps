import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Card } from '@newwork/nw-design-system'
import { AbsenceDistributionChart } from '../../KPISection/AbsenceDistributionChart'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import { useTeamCoverageData } from '../../../hooks/useTeamCoverageData'
import { useTeamDailyFactsByType } from '../../../hooks/useTeamDailyFacts'
import { useAbsenceTypeCatalog } from '../../../../personal-absences/hooks/useAbsenceTypeCatalog'

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
  const pieChartData = byType.map(d => ({ name: d.label, value: d.value }))
  const groupColors = byType.reduce<Record<string, string>>((acc, d) => {
    if (d.color) acc[d.label] = d.color
    return acc
  }, {})
  const totalAbsenceDays = byType.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
  const vacationName = getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.vacation', 'Vacation')
  const vacationVal = pieChartData.find(p => p.name === vacationName)?.value || 0
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
        />
      </Card>
    </section>
  )
}
