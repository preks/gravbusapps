import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAbsenceKPIData } from '../../../hooks/useAbsenceKPIData'
import { AbsenceTrendsChart } from '../../KPISection/AbsenceTrendsChart'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const AbsenceTrendsSection: React.FC<BusinessAppContextProps> = props => {
  const { data, loading: dataLoading, error: dataError } = useAbsenceKPIData(props)

  const loading = dataLoading
  const error = dataError

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

  if (!data) {
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
