import React from 'react'
import { SectionKpiCards, KpiCardData } from '@newwork/nw-design-system'

export interface EmploymentStatistics {
  totalFte: number
  employeeCount: number
  averageTenure: string
  gapRate: number
  vacantPositions: number
  totalPositions: number
  probationRate: number
  employeesInProbation: number
  totalEmployees: number
}

interface EmploymentStatisticsProps {
  statistics: EmploymentStatistics
  isLoading: boolean
  dataTestId: string
}

const EmploymentStatistics: React.FC<EmploymentStatisticsProps> = ({ statistics, isLoading, dataTestId }) => {
  const kpiCards: KpiCardData[] = [
    {
      id: 'fte-employee-count',
      title: 'FTE / Employee Count',
      value: isLoading ? 'Loading...' : `${statistics.totalFte.toFixed(1)} / ${statistics.employeeCount}`,
      icon: 'users',
      iconColor: '#1890ff',
      footer: 'Full-time equivalent ratio'
    },
    {
      id: 'average-tenure',
      title: 'Average Tenure',
      value: isLoading ? 'Loading...' : statistics.averageTenure,
      icon: 'calendar',
      iconColor: '#722ed1',
      footer: 'Company-wide average'
    },
    {
      id: 'gap-rate',
      title: 'Gap Rate',
      value: isLoading ? 'Loading...' : `${statistics.gapRate.toFixed(1)}%`,
      icon: 'mail',
      iconColor: statistics.gapRate > 15 ? '#ff4d4f' : statistics.gapRate > 10 ? '#fa8c16' : '#52c41a',
      footer: `${statistics.vacantPositions}/${statistics.totalPositions} positions`
    },
    {
      id: 'probation-rate',
      title: 'Probation Rate',
      value: isLoading ? 'Loading...' : `${statistics.probationRate.toFixed(1)}%`,
      icon: 'users',
      iconColor: statistics.probationRate > 20 ? '#ff4d4f' : statistics.probationRate > 10 ? '#fa8c16' : '#52c41a',
      footer: `${statistics.employeesInProbation}/${statistics.totalEmployees} employees`
    }
  ]

  if (isLoading) {
    // Create loading placeholder cards
    const loadingCards: KpiCardData[] = kpiCards.map(card => ({
      ...card,
      value: 'Loading...'
    }))

    return (
      <div data-testid={`${dataTestId}-statistics`}>
        <SectionKpiCards cards={loadingCards} />
      </div>
    )
  }

  return (
    <div data-testid={`${dataTestId}-statistics`}>
      <SectionKpiCards cards={kpiCards} />
    </div>
  )
}

export default EmploymentStatistics
