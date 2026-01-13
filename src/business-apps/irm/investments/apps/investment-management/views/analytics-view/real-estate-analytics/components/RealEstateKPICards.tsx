import React from 'react'
import { HouseIcon, ChartBarIcon, CurrencyDollarIcon, BuildingsIcon } from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatNumber, formatPercentage } from '@/common/data/investment/utils/formatters'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'

interface RealEstateKPICardsProps {
  kpis: {
    totalPropertyValue: number
    averageOccupancyRate: number
    totalUnits: number
    totalAnnualExpenses: number
  }
  prefixDataTestId: string
}

export const RealEstateKPICards: React.FC<RealEstateKPICardsProps> = ({ kpis, prefixDataTestId }) => {
  const widgets: WidgetItem[] = [
    {
      key: 'total-property-value',
      title: getTranslationFromI18nKeyAndLabel('kpi.totalPropertyValue', 'Total Property Value'),
      value: formatCurrencyCompact(kpis.totalPropertyValue, 'EUR', undefined, 1, true),
      prefix: <HouseIcon />,
      color: 'var(--nw-color-warning-500)',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'kpi.totalPropertyValue.description',
        'Total value of all properties'
      )
    },
    {
      key: 'average-occupancy-rate',
      title: getTranslationFromI18nKeyAndLabel('kpi.averageOccupancyRate', 'Average Occupancy Rate'),
      value: formatPercentage(kpis.averageOccupancyRate),
      prefix: <ChartBarIcon />,
      color: 'var(--nw-color-success-500)',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('kpi.averageOccupancyRate.description', 'Portfolio avg')
    },
    {
      key: 'total-units',
      title: getTranslationFromI18nKeyAndLabel('kpi.totalUnits', 'Total Units'),
      value: formatNumber(kpis.totalUnits),
      prefix: <BuildingsIcon />,
      color: 'var(--nw-color-primary-500)',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('kpi.totalUnits.description', 'All units')
    },
    {
      key: 'total-annual-expenses',
      title: getTranslationFromI18nKeyAndLabel('kpi.totalAnnualExpenses', 'Total Annual Expenses'),
      value: formatCurrencyCompact(kpis.totalAnnualExpenses, 'EUR', undefined, 1, true),
      prefix: <CurrencyDollarIcon />,
      color: 'var(--nw-color-purple-500)',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('kpi.totalAnnualExpenses.description', 'Annual total')
    }
  ]

  return (
    <div data-testid={`${prefixDataTestId}-container`}>
      <WidgetGroup
        widgets={widgets}
        skeletonCount={4}
        emptyText={getTranslationFromI18nKeyAndLabel('kpi.realEstate.empty', 'No real estate KPI data available.')}
        data-testid={prefixDataTestId}
      />
    </div>
  )
}
