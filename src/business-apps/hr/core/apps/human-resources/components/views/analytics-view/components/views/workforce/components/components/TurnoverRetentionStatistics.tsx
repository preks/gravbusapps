import React from 'react'
import { SectionKpiCards, KpiCardData } from '@newwork/nw-design-system'
import type { TurnoverRetentionStatistics } from '../../../../../hooks/useTurnoverRetentionData'

interface TurnoverRetentionStatisticsProps {
  statistics: TurnoverRetentionStatistics
  isLoading: boolean
  dataTestId: string
}

const TurnoverRetentionStatistics: React.FC<TurnoverRetentionStatisticsProps> = ({
  statistics,
  isLoading,
  dataTestId
}) => {
  const kpiCards: KpiCardData[] = [
    {
      id: 'voluntary-turnover',
      title: 'Voluntary Turnover Rate',
      value: statistics.currentTurnoverRate ? `${statistics.currentTurnoverRate.toFixed(1)}%` : 'N/A',
      icon: 'calendar',
      iconColor:
        statistics.currentTurnoverRate > 10 ? '#ff4d4f' : statistics.currentTurnoverRate > 5 ? '#fa8c16' : '#52c41a',
      footer: 'Current month rate'
    },
    {
      id: 'average-tenure',
      title: 'Average Tenure',
      value: statistics.averageTenure || 'N/A',
      icon: 'users',
      iconColor: '#722ed1',
      footer: 'Company-wide average'
    },
    {
      id: 'at-risk-departments',
      title: 'At-Risk Departments',
      value: statistics.atRiskDepartments,
      icon: 'mail',
      iconColor:
        statistics.atRiskDepartments > 3 ? '#ff4d4f' : statistics.atRiskDepartments > 0 ? '#fa8c16' : '#52c41a',
      footer: `Below ${statistics.retentionTarget}% retention target`
    },
    {
      id: 'retention-target',
      title: 'Target Retention',
      value: `${statistics.retentionTarget}%`,
      icon: 'users',
      iconColor: '#1890ff',
      footer: 'Company target retention rate'
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

export default TurnoverRetentionStatistics
