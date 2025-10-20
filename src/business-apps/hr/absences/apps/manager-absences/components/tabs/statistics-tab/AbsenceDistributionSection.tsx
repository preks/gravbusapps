import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Card } from '@newwork/nw-design-system'
import { useAbsenceKPIData } from '../../../hooks/useAbsenceKPIData'
import { AbsenceDistributionChart } from '../../KPISection/AbsenceDistributionChart'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const AbsenceDistributionSection: React.FC<BusinessAppContextProps> = props => {
  const { data, loading: dataLoading, error: dataError } = useAbsenceKPIData(props)

  const loading = dataLoading
  const error = dataError

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

  if (!data) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="absence-distribution-no-data">
        No absence distribution data available.
      </div>
    )
  }

  // Colors are now included in the data from useAbsenceKPIData

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
          pieChartData={data.pieChartData}
          totalAbsenceDays={data.totalAbsenceDays}
          vacationShare={data.vacationShare.toFixed(1)}
          groupColors={data.groupColors}
        />
      </Card>
    </section>
  )
}
